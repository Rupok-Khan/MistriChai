const pool = require("../config/db");

function createBookingCode(id) {
  return `OD-${String(100000 + Number(id)).slice(-6)}`;
}

async function createBooking(data) {
  const {
    customer_user_id,
    requested_partner_user_id,
    category,
    problem_summary,
    service_address,
    district,
    thana,
    ward_no,
    city_corp_or_union,
    preferred_date,
    preferred_time,
    booking_fee,
    estimated_cash_amount,
    customer_note,
    initial_status
  } = data;

  const [result] = await pool.query(
    `INSERT INTO service_bookings
     (booking_code, customer_user_id, requested_partner_user_id, category, problem_summary,
      service_address, district, thana, ward_no, city_corp_or_union, preferred_date,
      preferred_time, booking_fee, estimated_cash_amount, customer_note, status)
     VALUES ('PENDING',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      customer_user_id,
      requested_partner_user_id || null,
      category,
      problem_summary,
      service_address,
      district,
      thana,
      ward_no || null,
      city_corp_or_union || null,
      preferred_date || null,
      preferred_time || null,
      Number(booking_fee || 0),
      Number(estimated_cash_amount || 0),
      customer_note || null,
      initial_status || "PENDING_ASSIGNMENT"
    ]
  );

  const bookingCode = createBookingCode(result.insertId);
  await pool.query(
    "UPDATE service_bookings SET booking_code = ? WHERE id = ?",
    [bookingCode, result.insertId]
  );

  return result.insertId;
}

async function createPayment({
  booking_id,
  payer_user_id,
  receiver_user_id,
  transaction_type,
  payment_method,
  amount,
  status = "PAID",
  note = null
}) {
  await pool.query(
    `INSERT INTO payment_transactions
     (booking_id, payer_user_id, receiver_user_id, transaction_type, payment_method, amount, status, note)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      booking_id || null,
      payer_user_id || null,
      receiver_user_id || null,
      transaction_type,
      payment_method || "ONLINE",
      Number(amount || 0),
      status,
      note
    ]
  );
}

async function listBookingsForCustomer(customerUserId) {
  const [rows] = await pool.query(
    `SELECT b.*,
            rp.first_name AS requested_partner_first_name,
            rp.last_name AS requested_partner_last_name,
            ap.first_name AS assigned_partner_first_name,
            ap.last_name AS assigned_partner_last_name,
            ap.partner_code AS assigned_partner_code
     FROM service_bookings b
     LEFT JOIN partner_profiles rp ON rp.user_id = b.requested_partner_user_id
     LEFT JOIN partner_profiles ap ON ap.user_id = b.assigned_partner_user_id
     WHERE b.customer_user_id = ?
     ORDER BY b.booked_at DESC, b.id DESC`,
    [customerUserId]
  );
  return rows;
}

async function listCurrentOrdersForPartner(partnerUserId) {
  const [rows] = await pool.query(
    `SELECT b.*, u.name AS customer_name, u.mobile AS customer_mobile, cp.address AS customer_address
     FROM service_bookings b
     JOIN users u ON u.id = b.customer_user_id
     LEFT JOIN customer_profiles cp ON cp.user_id = u.id
     WHERE b.assigned_partner_user_id = ?
       AND b.status IN ('ASSIGNED','IN_PROGRESS')
     ORDER BY b.assigned_at DESC, b.id DESC`,
    [partnerUserId]
  );
  return rows;
}

async function listOrderHistoryForPartner(partnerUserId) {
  const [rows] = await pool.query(
    `SELECT b.*, u.name AS customer_name, u.mobile AS customer_mobile
     FROM service_bookings b
     JOIN users u ON u.id = b.customer_user_id
     WHERE b.assigned_partner_user_id = ?
       AND b.status IN ('COMPLETED','REFUND_PENDING','REFUNDED','CANCELLED')
     ORDER BY COALESCE(b.completed_at, b.updated_at) DESC, b.id DESC`,
    [partnerUserId]
  );
  return rows;
}

async function listBookingsForAdmin() {
  const [rows] = await pool.query(
    `SELECT b.*,
            cu.name AS customer_name,
            cu.mobile AS customer_mobile,
            rp.first_name AS requested_partner_first_name,
            rp.last_name AS requested_partner_last_name,
            ap.first_name AS assigned_partner_first_name,
            ap.last_name AS assigned_partner_last_name
     FROM service_bookings b
     JOIN users cu ON cu.id = b.customer_user_id
     LEFT JOIN partner_profiles rp ON rp.user_id = b.requested_partner_user_id
     LEFT JOIN partner_profiles ap ON ap.user_id = b.assigned_partner_user_id
     ORDER BY b.booked_at DESC, b.id DESC`
  );
  return rows;
}

async function getBookingById(bookingId) {
  const [rows] = await pool.query(
    `SELECT b.*,
            cu.name AS customer_name,
            cu.mobile AS customer_mobile,
            rp.first_name AS requested_partner_first_name,
            rp.last_name AS requested_partner_last_name,
            ap.first_name AS assigned_partner_first_name,
            ap.last_name AS assigned_partner_last_name,
            ap.partner_code AS assigned_partner_code
     FROM service_bookings b
     JOIN users cu ON cu.id = b.customer_user_id
     LEFT JOIN partner_profiles rp ON rp.user_id = b.requested_partner_user_id
     LEFT JOIN partner_profiles ap ON ap.user_id = b.assigned_partner_user_id
     WHERE b.id = ?
     LIMIT 1`,
    [bookingId]
  );
  return rows[0] || null;
}

async function assignBooking({ bookingId, partnerUserId, adminNote }) {
  await pool.query(
    `UPDATE service_bookings
     SET assigned_partner_user_id = ?,
         status = 'ASSIGNED',
         assigned_at = NOW(),
         admin_note = ?
     WHERE id = ?`,
    [partnerUserId, adminNote || null, bookingId]
  );
}

async function markBookingInProgress(bookingId) {
  await pool.query(
    "UPDATE service_bookings SET status = 'IN_PROGRESS' WHERE id = ? AND status = 'ASSIGNED'",
    [bookingId]
  );
}

async function completeBooking({ bookingId, partnerNote }) {
  await pool.query(
    `UPDATE service_bookings
     SET status = 'COMPLETED',
         partner_note = ?,
         completed_at = NOW()
     WHERE id = ?`,
    [partnerNote || null, bookingId]
  );
}

async function addCustomerRating({ bookingId, rating, review }) {
  const [result] = await pool.query(
    `UPDATE service_bookings
     SET customer_rating = ?,
         customer_review = ?,
         customer_rated_at = NOW()
     WHERE id = ?
       AND customer_rating IS NULL`,
    [Number(rating), review || null, bookingId]
  );
  return result.affectedRows > 0;
}

async function markRefundPending({ bookingId, adminNote }) {
  await pool.query(
    `UPDATE service_bookings
     SET status = 'REFUND_PENDING',
         admin_note = ?
     WHERE id = ?`,
    [adminNote || null, bookingId]
  );
}

async function markRefunded({ bookingId, adminNote }) {
  await pool.query(
    `UPDATE service_bookings
     SET status = 'REFUNDED',
         admin_note = ?
     WHERE id = ?`,
    [adminNote || null, bookingId]
  );
}

async function addChatMessage({
  bookingId,
  senderUserId,
  receiverUserId,
  messageText,
  attachmentUrl = null,
  attachmentName = null,
  attachmentType = null
}) {
  await pool.query(
    `INSERT INTO booking_messages
     (booking_id, sender_user_id, receiver_user_id, message_text, attachment_url, attachment_name, attachment_type)
     VALUES (?,?,?,?,?,?,?)`,
    [bookingId, senderUserId, receiverUserId, messageText || null, attachmentUrl, attachmentName, attachmentType]
  );
}

async function getChatMessages(bookingId) {
  const [rows] = await pool.query(
    `SELECT bm.id, bm.booking_id, bm.sender_user_id, bm.receiver_user_id, bm.message_text,
            bm.attachment_url, bm.attachment_name, bm.attachment_type, bm.created_at,
            su.name AS sender_name, ru.name AS receiver_name
     FROM booking_messages bm
     JOIN users su ON su.id = bm.sender_user_id
     JOIN users ru ON ru.id = bm.receiver_user_id
     WHERE bm.booking_id = ?
     ORDER BY bm.created_at ASC, bm.id ASC`,
    [bookingId]
  );
  return rows;
}

async function listPaymentHistoryForUser(userId) {
  const [rows] = await pool.query(
    `SELECT pt.*, b.booking_code
     FROM payment_transactions pt
     LEFT JOIN service_bookings b ON b.id = pt.booking_id
     WHERE pt.payer_user_id = ? OR pt.receiver_user_id = ?
     ORDER BY pt.created_at DESC, pt.id DESC`,
    [userId, userId]
  );
  return rows;
}

module.exports = {
  createBooking,
  createPayment,
  listBookingsForCustomer,
  listCurrentOrdersForPartner,
  listOrderHistoryForPartner,
  listBookingsForAdmin,
  getBookingById,
  assignBooking,
  markBookingInProgress,
  completeBooking,
  addCustomerRating,
  markRefundPending,
  markRefunded,
  addChatMessage,
  getChatMessages,
  listPaymentHistoryForUser
};
