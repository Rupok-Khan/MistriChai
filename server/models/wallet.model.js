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

  return {
    balance: walletRows[0]?.balance || 0,
    transactions: txRows
  };
}

async function creditWallet({ partnerUserId, bookingId, amount, note }) {
  await pool.query(
    "UPDATE partner_wallets SET balance = balance + ? WHERE partner_user_id = ?",
    [Number(amount || 0), partnerUserId]
  );

  await pool.query(
    `INSERT INTO wallet_transactions
     (partner_user_id, booking_id, amount, transaction_type, status, note)
     VALUES (?, ?, ?, 'CREDIT', 'COMPLETED', ?)`,
    [partnerUserId, bookingId || null, Number(amount || 0), note || null]
  );
}

async function requestWithdrawal({ partnerUserId, amount, note }) {
  await pool.query(
    `INSERT INTO wallet_transactions
     (partner_user_id, booking_id, amount, transaction_type, status, note)
     VALUES (?, NULL, ?, 'WITHDRAW_REQUEST', 'PENDING', ?)`,
    [partnerUserId, Number(amount || 0), note || null]
  );
}

async function listWithdrawalRequests() {
  const [rows] = await pool.query(
    `SELECT wt.id, wt.partner_user_id, wt.amount, wt.status, wt.note, wt.created_at,
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
  creditWallet,
  requestWithdrawal,
  listWithdrawalRequests,
  payWithdrawal
};
