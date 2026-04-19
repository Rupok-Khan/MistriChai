const pool = require("../config/db");

async function findByEmail(email) {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  return rows[0] || null;
}

async function findByMobile(mobile) {
  const [rows] = await pool.query("SELECT * FROM users WHERE mobile = ? LIMIT 1", [mobile]);
  return rows[0] || null;
}

async function findPartnerByCode(code) {
  const [rows] = await pool.query(
    `SELECT u.*
     FROM users u
     JOIN partner_profiles pp ON pp.user_id = u.id
     WHERE pp.partner_code = ?
     LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function createUser({ role, name, email, mobile, password_hash }) {
  const [result] = await pool.query(
    "INSERT INTO users (role, name, email, mobile, password_hash) VALUES (?,?,?,?,?)",
    [role, name, email || null, mobile, password_hash]
  );
  return result.insertId;
}

async function updatePassword(id, password_hash) {
  await pool.query(
    "UPDATE users SET password_hash = ? WHERE id = ?",
    [password_hash, id]
  );
}

async function listCustomers() {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.mobile, u.is_active, u.created_at, cp.address
     FROM users u
     LEFT JOIN customer_profiles cp ON cp.user_id = u.id
     WHERE u.role = 'CUSTOMER'
     ORDER BY u.id DESC`
  );
  return rows;
}

async function listPartners() {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.mobile, u.is_active, u.created_at,
            pp.partner_code, pp.first_name, pp.last_name, pp.technician_category,
            pp.district, pp.thana, pp.ward_no, pp.verification_status, pp.availability_status,
            pp.nid_address, pp.nid_number, pp.father_name, pp.mother_name, pp.city_corp_or_union,
            pp.experience_years, pp.working_start_time, pp.working_end_time
     FROM users u
     LEFT JOIN partner_profiles pp ON pp.user_id = u.id
     WHERE u.role = 'PARTNER'
     ORDER BY u.id DESC`
  );
  return rows;
}

async function deleteUser(id) {
  const [result] = await pool.query("DELETE FROM users WHERE id = ? AND role IN ('CUSTOMER','PARTNER')", [id]);
  return result.affectedRows;
}

module.exports = {
  findByEmail,
  findByMobile,
  findPartnerByCode,
  findById,
  createUser,
  updatePassword,
  listCustomers,
  listPartners,
  deleteUser
};
