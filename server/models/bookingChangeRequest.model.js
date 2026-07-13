const pool = require("../config/db");
const { mediaUrl } = require("../utils/mediaFile");

async function hasPendingRequest(bookingId) {
  const [rows] = await pool.query(
    "SELECT id FROM booking_change_requests WHERE booking_id = ? AND status = 'PENDING' LIMIT 1",
    [bookingId]
  );
  return rows.length > 0;
}

async function countPartnerChanges(bookingId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM booking_change_requests
     WHERE booking_id=? AND request_type='CUSTOMER_PARTNER_CHANGE' AND status IN ('PENDING','APPROVED')`,
    [bookingId]
  );
  return Number(rows[0]?.total || 0);
}

async function createRequest({ bookingId, requesterUserId, requestType, reason, proof }) {
  const [result] = await pool.query(
    `INSERT INTO booking_change_requests
     (booking_id, requester_user_id, request_type, reason, proof_url, proof_name, proof_type)
     VALUES (?,?,?,?,?,?,?)`,
    [
      bookingId,
      requesterUserId,
      requestType,
      reason,
      mediaUrl(proof, "cancellation"),
      proof?.originalname || null,
      proof?.mimetype || null
    ]
  );
  return result.insertId;
}

async function listForUser(userId) {
  const [rows] = await pool.query(
    `SELECT r.*, b.booking_code, b.category, b.status AS booking_status
     FROM booking_change_requests r
     JOIN service_bookings b ON b.id = r.booking_id
     WHERE r.requester_user_id = ?
     ORDER BY r.created_at DESC, r.id DESC`,
    [userId]
  );
  return rows;
}

async function listForAdmin() {
  const [rows] = await pool.query(
    `SELECT r.*, b.booking_code, b.category, b.status AS booking_status,
            u.name AS requester_name, u.mobile AS requester_mobile,
            pp.first_name AS current_partner_first_name, pp.last_name AS current_partner_last_name,
            pp.partner_code AS current_partner_code
     FROM booking_change_requests r
     JOIN service_bookings b ON b.id = r.booking_id
     JOIN users u ON u.id = r.requester_user_id
     LEFT JOIN partner_profiles pp ON pp.user_id = b.assigned_partner_user_id
     ORDER BY CASE r.status WHEN 'PENDING' THEN 1 ELSE 2 END, r.created_at DESC, r.id DESC`
  );
  return rows;
}

async function getById(id) {
  const [rows] = await pool.query(
    `SELECT r.*, b.customer_user_id, b.assigned_partner_user_id,
            b.requested_partner_user_id, b.status AS booking_status,
            b.payment_status
     FROM booking_change_requests r
     JOIN (
       SELECT sb.*,
              pay.status AS payment_status
       FROM service_bookings sb
       LEFT JOIN payment_transactions pay
         ON pay.booking_id = sb.id AND pay.transaction_type = 'BOOKING_FEE'
     ) b ON b.id = r.booking_id
     WHERE r.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function reviewRequest({ id, status, adminNote, adminEmail }) {
  const [result] = await pool.query(
    `UPDATE booking_change_requests
     SET status = ?, admin_note = ?, reviewed_by_email = ?, reviewed_at = NOW()
     WHERE id = ? AND status = 'PENDING'`,
    [status, adminNote || null, adminEmail || null, id]
  );
  return result.affectedRows > 0;
}

module.exports = {
  hasPendingRequest,
  countPartnerChanges,
  createRequest,
  listForUser,
  listForAdmin,
  getById,
  reviewRequest
};
