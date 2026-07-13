const pool = require("../config/db");

async function getWalletSummary(partnerUserId) {
  const [walletRows] = await pool.query(
    "SELECT balance FROM partner_wallets WHERE partner_user_id = ? LIMIT 1",
    [partnerUserId]
  );

  const [txRows] = await pool.query(
    `SELECT id, booking_id, amount, transaction_type, status, note, created_at
     FROM wallet_transactions
     WHERE partner_user_id = ?
     ORDER BY created_at DESC, id DESC`,
    [partnerUserId]
  );

  const [pendingRows] = await pool.query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM wallet_transactions
     WHERE partner_user_id=? AND transaction_type='WITHDRAW_REQUEST' AND status='PENDING'`,
    [partnerUserId]
  );

  const balance = Number(walletRows[0]?.balance || 0);
  const pendingWithdrawal = Number(pendingRows[0]?.total || 0);
  const payoutMethod = await getPayoutMethod(partnerUserId);

  return {
    balance,
    pending_withdrawal: pendingWithdrawal,
    withdrawable_balance: Math.max(0, balance - pendingWithdrawal - 100),
    minimum_withdrawal: 300,
    wallet_reserve: 100,
    payout_method: payoutMethod,
    transactions: txRows
  };
}

async function getPayoutMethod(partnerUserId) {
  const [rows] = await pool.query(
    `SELECT method, account_name, account_number, bank_name, branch_name, routing_number, updated_at
     FROM partner_payout_methods WHERE partner_user_id=? LIMIT 1`,
    [partnerUserId]
  );
  return rows[0] || null;
}

async function savePayoutMethod({ partnerUserId, method, accountName, accountNumber, bankName, branchName, routingNumber }) {
  await pool.query(
    `INSERT INTO partner_payout_methods
     (partner_user_id, method, account_name, account_number, bank_name, branch_name, routing_number)
     VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE method=VALUES(method), account_name=VALUES(account_name),
     account_number=VALUES(account_number), bank_name=VALUES(bank_name), branch_name=VALUES(branch_name),
     routing_number=VALUES(routing_number)`,
    [partnerUserId, method, accountName, accountNumber, bankName || null, branchName || null, routingNumber || null]
  );
}

async function requestWithdrawal({ partnerUserId, amount, note, payoutMethod }) {
  await pool.query(
    `INSERT INTO wallet_transactions
     (partner_user_id, booking_id, amount, transaction_type, status, note, payout_method,
      payout_account_name, payout_account_number, payout_bank_name, payout_branch_name, payout_routing_number)
     VALUES (?, NULL, ?, 'WITHDRAW_REQUEST', 'PENDING', ?, ?, ?, ?, ?, ?, ?)`,
    [partnerUserId, Number(amount || 0), note || null, payoutMethod.method, payoutMethod.account_name,
      payoutMethod.account_number, payoutMethod.bank_name, payoutMethod.branch_name, payoutMethod.routing_number]
  );
}

async function getPendingWithdrawalTotal(partnerUserId) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM wallet_transactions
     WHERE partner_user_id=? AND transaction_type='WITHDRAW_REQUEST' AND status='PENDING'`,
    [partnerUserId]
  );
  return Number(rows[0]?.total || 0);
}

async function creditCompletedWork({ partnerUserId, bookingId, amount }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.query(
      `SELECT id FROM wallet_transactions WHERE partner_user_id=? AND booking_id=?
       AND transaction_type='CREDIT' LIMIT 1 FOR UPDATE`, [partnerUserId, bookingId]
    );
    if (existing.length) { await connection.rollback(); return false; }
    await connection.query(
      `INSERT INTO partner_wallets (partner_user_id, balance) VALUES (?,?)
       ON DUPLICATE KEY UPDATE balance=balance+VALUES(balance)`, [partnerUserId, Number(amount)]
    );
    await connection.query(
      `INSERT INTO wallet_transactions (partner_user_id, booking_id, amount, transaction_type, status, note)
       VALUES (?,?,?,'CREDIT','COMPLETED','Final work payment credited after job completion')`,
      [partnerUserId, bookingId, Number(amount)]
    );
    await connection.commit();
    return true;
  } catch (err) { await connection.rollback(); throw err; }
  finally { connection.release(); }
}

async function listWithdrawalRequests() {
  const [rows] = await pool.query(
    `SELECT wt.id, wt.partner_user_id, wt.amount, wt.status, wt.note, wt.created_at,
            wt.payout_method, wt.payout_account_name, wt.payout_account_number,
            wt.payout_bank_name, wt.payout_branch_name, wt.payout_routing_number,
            pp.first_name, pp.last_name, pp.partner_code,
            COALESCE(w.balance, 0) AS current_balance
     FROM wallet_transactions wt
     JOIN partner_profiles pp ON pp.user_id = wt.partner_user_id
     LEFT JOIN partner_wallets w ON w.partner_user_id = wt.partner_user_id
     WHERE wt.transaction_type = 'WITHDRAW_REQUEST'
     ORDER BY
       CASE wt.status
         WHEN 'PENDING' THEN 1
         ELSE 2
       END,
       wt.created_at DESC`,
    []
  );
  return rows;
}

async function payWithdrawal({ withdrawalId, adminNote }) {
  const [rows] = await pool.query(
    `SELECT id, partner_user_id, amount, status
     FROM wallet_transactions
     WHERE id = ? AND transaction_type = 'WITHDRAW_REQUEST'
     LIMIT 1`,
    [withdrawalId]
  );

  const item = rows[0];
  if (!item) {
    throw new Error("Withdrawal request not found");
  }
  if (item.status !== "PENDING") {
    throw new Error("Withdrawal request already processed");
  }

  const [walletRows] = await pool.query("SELECT balance FROM partner_wallets WHERE partner_user_id=? LIMIT 1", [item.partner_user_id]);
  const balance = Number(walletRows[0]?.balance || 0);
  if (balance - Number(item.amount) < 100) {
    throw new Error("Withdrawal cannot be paid because the wallet must retain at least 100 taka");
  }

  await pool.query(
    "UPDATE partner_wallets SET balance = balance - ? WHERE partner_user_id = ?",
    [Number(item.amount), item.partner_user_id]
  );

  await pool.query(
    `UPDATE wallet_transactions
     SET status = 'COMPLETED', note = CONCAT(COALESCE(note, ''), ?)
     WHERE id = ?`,
    [adminNote ? ` | Admin: ${adminNote}` : "", withdrawalId]
  );

  await pool.query(
    `INSERT INTO wallet_transactions
     (partner_user_id, booking_id, amount, transaction_type, status, note)
     VALUES (?, NULL, ?, 'WITHDRAW_PAID', 'COMPLETED', ?)`,
    [item.partner_user_id, Number(item.amount), adminNote || "Withdrawal paid by admin"]
  );

  return item;
}

module.exports = {
  getWalletSummary,
  getPayoutMethod,
  savePayoutMethod,
  creditCompletedWork,
  requestWithdrawal,
  getPendingWithdrawalTotal,
  listWithdrawalRequests,
  payWithdrawal
};
