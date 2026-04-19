const pool = require("../config/db");

async function createPartnerProfile(data) {
  const {
    user_id,
    first_name,
    last_name,
    nid_address,
    father_name,
    mother_name,
    nid_number,
    profile_photo,
    nid_front_photo,
    nid_back_photo,
    district,
    thana,
    ward_no,
    city_corp_or_union,
    technician_category,
    working_start_time,
    working_end_time,
    experience_years
  } = data;

  await pool.query(
    `INSERT INTO partner_profiles
     (user_id, first_name, last_name, nid_address, father_name, mother_name, nid_number,
      profile_photo, nid_front_photo, nid_back_photo,
      district, thana, ward_no, city_corp_or_union,
      technician_category, working_start_time, working_end_time, experience_years)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      user_id,
      first_name,
      last_name,
      nid_address,
      father_name,
      mother_name,
      nid_number,
      profile_photo,
      nid_front_photo,
      nid_back_photo,
      district,
      thana,
      ward_no,
      city_corp_or_union,
      technician_category,
      working_start_time,
      working_end_time,
      Number(experience_years || 0)
    ]
  );

  await pool.query(
    "INSERT INTO partner_wallets (partner_user_id, balance) VALUES (?, 0.00)",
    [user_id]
  );
}

async function getPartnerMe(user_id) {
  const [rows] = await pool.query(
    `SELECT u.id, u.role, u.name, u.email, u.mobile,
            pp.partner_code, pp.first_name, pp.last_name, pp.nid_address, pp.nid_number,
            pp.father_name, pp.mother_name, pp.verification_status, pp.availability_status,
            pp.district, pp.thana, pp.ward_no, pp.city_corp_or_union,
            pp.technician_category, pp.working_start_time, pp.working_end_time, pp.experience_years,
            pp.profile_photo, pp.nid_front_photo, pp.nid_back_photo, pp.rejection_reason,
            COALESCE(w.balance, 0) AS wallet_balance
     FROM users u
     JOIN partner_profiles pp ON pp.user_id = u.id
     LEFT JOIN partner_wallets w ON w.partner_user_id = u.id
     WHERE u.id = ? LIMIT 1`,
    [user_id]
  );
  return rows[0] || null;
}

async function listPartnersForCustomer({ category, district, thana, ward_no }) {
  let sql = `
    SELECT
      pp.user_id,
      pp.partner_code,
      pp.first_name,
      pp.last_name,
      pp.technician_category,
      pp.district,
      pp.thana,
      pp.ward_no,
      pp.city_corp_or_union,
      pp.working_start_time,
      pp.working_end_time,
      pp.experience_years,
      pp.availability_status,
      pp.verification_status,
      pp.profile_photo,
      COALESCE(r.rating_avg, 0) AS rating_avg,
      COALESCE(r.rating_count, 0) AS rating_count
    FROM partner_profiles pp
    LEFT JOIN (
      SELECT
        assigned_partner_user_id AS partner_user_id,
        ROUND(AVG(customer_rating), 1) AS rating_avg,
        COUNT(*) AS rating_count
      FROM service_bookings
      WHERE status = 'COMPLETED'
        AND customer_rating IS NOT NULL
      GROUP BY assigned_partner_user_id
    ) r ON r.partner_user_id = pp.user_id
    WHERE pp.technician_category = ?
      AND pp.verification_status = 'APPROVED'
  `;

  const params = [category];

  if (district) {
    sql += " AND district = ?";
    params.push(district);
  }
  if (thana) {
    sql += " AND thana = ?";
    params.push(thana);
  }
  if (ward_no) {
    sql += " AND ward_no = ?";
    params.push(ward_no);
  }

  sql += `
    ORDER BY
      CASE pp.availability_status
        WHEN 'AVAILABLE' THEN 1
        WHEN 'BUSY' THEN 2
        ELSE 3
      END,
      COALESCE(r.rating_avg, 0) DESC,
      COALESCE(r.rating_count, 0) DESC,
      pp.experience_years DESC,
      pp.user_id DESC
  `;

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getTopPartnersForHome(limit = 3) {
  const [rows] = await pool.query(
    `SELECT
      pp.user_id,
      pp.partner_code,
      pp.first_name,
      pp.last_name,
      pp.technician_category,
      pp.district,
      pp.thana,
      pp.ward_no,
      pp.city_corp_or_union,
      pp.working_start_time,
      pp.working_end_time,
      pp.experience_years,
      pp.availability_status,
      pp.verification_status,
      pp.profile_photo,
      COALESCE(r.rating_avg, 0) AS rating_avg,
      COALESCE(r.rating_count, 0) AS rating_count
    FROM partner_profiles pp
    LEFT JOIN (
      SELECT
        assigned_partner_user_id AS partner_user_id,
        ROUND(AVG(customer_rating), 1) AS rating_avg,
        COUNT(*) AS rating_count
      FROM service_bookings
      WHERE status = 'COMPLETED'
        AND customer_rating IS NOT NULL
      GROUP BY assigned_partner_user_id
    ) r ON r.partner_user_id = pp.user_id
    WHERE pp.verification_status = 'APPROVED'
    ORDER BY COALESCE(r.rating_avg, 0) DESC, COALESCE(r.rating_count, 0) DESC, pp.experience_years DESC, pp.user_id DESC
    LIMIT ?`,
    [limit]
  );
  return rows;
}

async function adminListPartnersByStatus(status = "PENDING") {
  const [rows] = await pool.query(
    `SELECT
      pp.user_id,
      pp.partner_code,
      pp.first_name,
      pp.last_name,
      pp.nid_number,
      pp.district,
      pp.thana,
      pp.ward_no,
      pp.technician_category,
      pp.experience_years,
      pp.availability_status,
      pp.verification_status,
      pp.profile_photo,
      pp.created_at,
      u.mobile,
      u.email
    FROM partner_profiles pp
    JOIN users u ON u.id = pp.user_id
    WHERE pp.verification_status = ?
    ORDER BY pp.user_id DESC`,
    [status]
  );
  return rows;
}

async function adminGetPartnerSubmission(userId) {
  const [rows] = await pool.query(
    `SELECT
      pp.user_id,
      pp.partner_code,
      pp.first_name,
      pp.last_name,
      pp.nid_address,
      pp.father_name,
      pp.mother_name,
      pp.nid_number,
      pp.district,
      pp.thana,
      pp.ward_no,
      pp.city_corp_or_union,
      pp.technician_category,
      pp.working_start_time,
      pp.working_end_time,
      pp.experience_years,
      pp.availability_status,
      pp.verification_status,
      pp.profile_photo,
      pp.nid_front_photo,
      pp.nid_back_photo,
      pp.rejection_reason,
      u.mobile,
      u.email
    FROM partner_profiles pp
    JOIN users u ON u.id = pp.user_id
    WHERE pp.user_id = ?
    LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

function buildPartnerCode(firstName, lastName, userId) {
  const a = String(firstName || "P").trim().charAt(0).toUpperCase() || "P";
  const b = String(lastName || "T").trim().charAt(0).toUpperCase() || "T";
  const numeric = String(1000 + (Number(userId) % 9000)).padStart(4, "0");
  return `${a}${b}${numeric}`;
}

async function adminUpdateVerificationStatus({ userId, status, reason = null }) {
  const [rows] = await pool.query(
    "SELECT first_name, last_name, partner_code FROM partner_profiles WHERE user_id = ? LIMIT 1",
    [userId]
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Partner not found");
  }

  const partnerCode =
    status === "APPROVED"
      ? row.partner_code || buildPartnerCode(row.first_name, row.last_name, userId)
      : row.partner_code;

  await pool.query(
    `UPDATE partner_profiles
     SET verification_status = ?,
         rejection_reason = ?,
         partner_code = ?,
         availability_status = CASE
           WHEN ? = 'APPROVED' THEN 'AVAILABLE'
           ELSE availability_status
         END
     WHERE user_id = ?`,
    [status, status === "REJECTED" ? reason : null, partnerCode, status, userId]
  );

  return partnerCode;
}

async function updateProfile(userId, data) {
  const {
    email,
    mobile,
    first_name,
    last_name,
    nid_address,
    nid_number,
    father_name,
    mother_name,
    district,
    thana,
    ward_no,
    city_corp_or_union,
    technician_category,
    experience_years
  } = data;

  await pool.query(
    `UPDATE users
     SET name = ?, email = ?, mobile = ?
     WHERE id = ?`,
    [`${first_name} ${last_name}`.trim(), email || null, mobile, userId]
  );

  await pool.query(
    `UPDATE partner_profiles
     SET first_name = ?, last_name = ?, nid_address = ?, father_name = ?, mother_name = ?,
         nid_number = ?,
         district = ?, thana = ?, ward_no = ?, city_corp_or_union = ?,
         technician_category = ?, experience_years = ?
     WHERE user_id = ?`,
    [
      first_name,
      last_name,
      nid_address,
      father_name,
      mother_name,
      nid_number,
      district,
      thana,
      ward_no,
      city_corp_or_union,
      technician_category,
      Number(experience_years || 0),
      userId
    ]
  );
}

async function updateWorkingHours(userId, start, end) {
  await pool.query(
    `UPDATE partner_profiles
     SET working_start_time = ?, working_end_time = ?
     WHERE user_id = ?`,
    [start, end, userId]
  );
}

async function updateAvailability(userId, status) {
  await pool.query(
    `UPDATE partner_profiles
     SET availability_status = ?
     WHERE user_id = ?`,
    [status, userId]
  );
}

async function setBusyOnAssignment(userId) {
  await updateAvailability(userId, "BUSY");
}

async function setAvailableAfterCompletion(userId) {
  await updateAvailability(userId, "AVAILABLE");
}

async function adminUpdatePartnerAccount(userId, data) {
  const {
    email,
    mobile,
    first_name,
    last_name,
    nid_address,
    nid_number,
    father_name,
    mother_name,
    district,
    thana,
    ward_no,
    city_corp_or_union,
    technician_category,
    experience_years,
    verification_status,
    availability_status,
    working_start_time,
    working_end_time,
    is_active
  } = data;

  await pool.query(
    `UPDATE users
     SET name = ?, email = ?, mobile = ?, is_active = ?
     WHERE id = ? AND role = 'PARTNER'`,
    [`${first_name} ${last_name}`.trim(), email || null, mobile, Number(is_active ? 1 : 0), userId]
  );

  await pool.query(
    `UPDATE partner_profiles
     SET first_name = ?, last_name = ?, nid_address = ?, father_name = ?, mother_name = ?,
         nid_number = ?, district = ?, thana = ?, ward_no = ?, city_corp_or_union = ?,
         technician_category = ?, experience_years = ?, verification_status = ?, availability_status = ?,
         working_start_time = ?, working_end_time = ?
     WHERE user_id = ?`,
    [
      first_name,
      last_name,
      nid_address,
      father_name,
      mother_name,
      nid_number,
      district,
      thana,
      ward_no,
      city_corp_or_union,
      technician_category,
      Number(experience_years || 0),
      verification_status,
      availability_status,
      working_start_time,
      working_end_time,
      userId
    ]
  );
}

module.exports = {
  createPartnerProfile,
  getPartnerMe,
  listPartnersForCustomer,
  getTopPartnersForHome,
  adminListPartnersByStatus,
  adminGetPartnerSubmission,
  adminUpdateVerificationStatus,
  updateProfile,
  updateWorkingHours,
  updateAvailability,
  setBusyOnAssignment,
  setAvailableAfterCompletion,
  adminUpdatePartnerAccount
};
