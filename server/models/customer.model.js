const pool = require("../config/db");

async function createCustomerProfile({ user_id, address }) {
  await pool.query(
    "INSERT INTO customer_profiles (user_id, address) VALUES (?, ?)",
    [user_id, address]
  );
}

async function getCustomerMe(user_id) {
  const [rows] = await pool.query(
    `SELECT u.id, u.role, u.name, u.email, u.mobile, cp.address, u.created_at
     FROM users u
     JOIN customer_profiles cp ON cp.user_id = u.id
     WHERE u.id = ? LIMIT 1`,
    [user_id]
  );
  return rows[0] || null;
}

async function updateCustomerProfile(userId, { name, email, mobile, address }) {
  await pool.query(
    "UPDATE users SET name = ?, email = ?, mobile = ? WHERE id = ?",
    [name, email || null, mobile, userId]
  );

  await pool.query(
    "UPDATE customer_profiles SET address = ? WHERE user_id = ?",
    [address, userId]
  );
}

async function adminUpdateCustomerProfile(userId, { name, email, mobile, address, is_active }) {
  await pool.query(
    "UPDATE users SET name = ?, email = ?, mobile = ?, is_active = ? WHERE id = ? AND role = 'CUSTOMER'",
    [name, email || null, mobile, Number(is_active ? 1 : 0), userId]
  );

  await pool.query(
    "UPDATE customer_profiles SET address = ? WHERE user_id = ?",
    [address, userId]
  );
}

module.exports = {
  createCustomerProfile,
  getCustomerMe,
  updateCustomerProfile,
  adminUpdateCustomerProfile
};
