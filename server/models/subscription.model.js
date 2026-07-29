const pool = require("../config/db");

const PLANS = { ONE_MONTH: { months: 1, amount: 30 }, SIX_MONTHS: { months: 6, amount: 149 }, ONE_YEAR: { months: 12, amount: 250 } };

async function getActiveForCustomer(customerUserId) {
  await pool.query("UPDATE customer_subscriptions SET status='EXPIRED' WHERE customer_user_id=? AND status='ACTIVE' AND expires_at <= NOW()", [customerUserId]);
  const [rows] = await pool.query(`SELECT * FROM customer_subscriptions WHERE customer_user_id=? AND status='ACTIVE' AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1`, [customerUserId]);
  return rows[0] || null;
}
async function create({ customerUserId, planCode, transactionReference }) {
  const plan = PLANS[planCode];
  const [result] = await pool.query(`INSERT INTO customer_subscriptions (customer_user_id, plan_code, amount, starts_at, expires_at, transaction_reference) VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MONTH), ?)`, [customerUserId, planCode, plan.amount, plan.months, transactionReference]);
  const [rows] = await pool.query("SELECT * FROM customer_subscriptions WHERE id=?", [result.insertId]);
  return rows[0];
}
async function referenceExists(reference) { const [rows] = await pool.query("SELECT id FROM customer_subscriptions WHERE transaction_reference=? LIMIT 1", [reference]); return rows.length > 0; }
async function listForAdmin() {
  const [rows] = await pool.query(`SELECT s.*, u.name AS customer_name, u.mobile AS customer_mobile, u.email AS customer_email FROM customer_subscriptions s JOIN users u ON u.id=s.customer_user_id ORDER BY s.created_at DESC`);
  return rows;
}
async function revenueForAdmin() {
  const [rows] = await pool.query("SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count, SUM(status='ACTIVE' AND expires_at > NOW()) AS active_count FROM customer_subscriptions");
  return rows[0];
}
async function commissionRevenueForAdmin() {
  const [rows] = await pool.query("SELECT COALESCE(SUM(commission_amount),0) AS total, COUNT(*) AS count FROM platform_commissions WHERE status='EARNED'");
  return rows[0] || { total: 0, count: 0 };
}
module.exports = { PLANS, getActiveForCustomer, create, referenceExists, listForAdmin, revenueForAdmin, commissionRevenueForAdmin };
