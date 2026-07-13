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
  transaction_reference,
  amount,
  status = "PAID",
  note = null
}) {
  await pool.query(
    `INSERT INTO payment_transactions
     (booking_id, payer_user_id, receiver_user_id, transaction_type, payment_method, transaction_reference, amount, status, note)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      booking_id || null,
      payer_user_id || null,
      receiver_user_id || null,
      transaction_type,
      payment_method || "ONLINE",
      transaction_reference || null,
      Number(amount || 0),
      status,
      note
    ]
  );
}

async function bookingFeeReferenceExists(transactionReference) {
  const [rows] = await pool.query(
    `SELECT id FROM payment_transactions
     WHERE transaction_type = 'BOOKING_FEE' AND transaction_reference = ?
     LIMIT 1`,
    [transactionReference]
  );
  return rows.length > 0;
}

async function approveBookingPayment(bookingId) {
  const [result] = await pool.query(
    `UPDATE payment_transactions
     SET status = 'PAID', note = 'Manual bKash service charge approved by admin'
     WHERE booking_id = ? AND transaction_type = 'BOOKING_FEE' AND status = 'PENDING'`,
    [bookingId]
  );
  if (!result.affectedRows) return false;

  await pool.query(
    `UPDATE service_bookings
     SET status = CASE
       WHEN requested_partner_user_id IS NULL THEN 'PENDING_ASSIGNMENT'
       ELSE 'WAITING_FOR_PARTNER'
     END
     WHERE id = ? AND status = 'PAYMENT_PENDING'`,
    [bookingId]
  );
  return true;
}

async function listBookingsForCustomer(customerUserId) {
  const [rows] = await pool.query(
    `SELECT b.*,
            pay.status AS payment_status,
            pay.payment_method AS booking_payment_method,
            pay.transaction_reference AS bkash_trx_id,
            rp.first_name AS requested_partner_first_name,
            rp.last_name AS requested_partner_last_name,
            ap.first_name AS assigned_partner_first_name,
            ap.last_name AS assigned_partner_last_name,
            ap.partner_code AS assigned_partner_code
     FROM service_bookings b
     LEFT JOIN payment_transactions pay
       ON pay.booking_id = b.id AND pay.transaction_type = 'BOOKING_FEE'
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
            pay.status AS payment_status,
            pay.payment_method AS booking_payment_method,
            pay.transaction_reference AS bkash_trx_id,
            cu.name AS customer_name,
            cu.mobile AS customer_mobile,
            rp.first_name AS requested_partner_first_name,
            rp.last_name AS requested_partner_last_name,
            ap.first_name AS assigned_partner_first_name,
            ap.last_name AS assigned_partner_last_name
     FROM service_bookings b
     LEFT JOIN payment_transactions pay
       ON pay.booking_id = b.id AND pay.transaction_type = 'BOOKING_FEE'
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
            pay.status AS payment_status,
            pay.payment_method AS booking_payment_method,
            pay.transaction_reference AS bkash_trx_id,
            cu.name AS customer_name,
            cu.mobile AS customer_mobile,
            rp.first_name AS requested_partner_first_name,
            rp.last_name AS requested_partner_last_name,
            ap.first_name AS assigned_partner_first_name,
            ap.last_name AS assigned_partner_last_name,
            ap.partner_code AS assigned_partner_code
     FROM service_bookings b
     LEFT JOIN payment_transactions pay
       ON pay.booking_id = b.id AND pay.transaction_type = 'BOOKING_FEE'
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

async function requestReplacementPartner({ bookingId, customerUserId, partnerUserId }) {
  const [result] = await pool.query(
    `UPDATE service_bookings b
     JOIN payment_transactions pay ON pay.booking_id=b.id AND pay.transaction_type='BOOKING_FEE' AND pay.status='PAID'
     SET b.requested_partner_user_id=?, b.status='WAITING_FOR_PARTNER', b.admin_note='Customer selected a replacement partner after approved change request'
     WHERE b.id=? AND b.customer_user_id=? AND b.status='PENDING_ASSIGNMENT' AND b.assigned_partner_user_id IS NULL
       AND EXISTS (SELECT 1 FROM booking_change_requests r WHERE r.booking_id=b.id AND r.request_type='CUSTOMER_PARTNER_CHANGE' AND r.status='APPROVED')`,
    [partnerUserId, bookingId, customerUserId]
  );
  return result.affectedRows > 0;
}

async function cancelBooking({ bookingId, adminNote }) {
  await pool.query(
    `UPDATE service_bookings
     SET status = 'CANCELLED', admin_note = ?
     WHERE id = ? AND status IN ('ASSIGNED','IN_PROGRESS')`,
    [adminNote || null, bookingId]
  );
}

async function releaseBookingForReassignment({ bookingId, adminNote }) {
  await pool.query(
    `UPDATE service_bookings
     SET assigned_partner_user_id = NULL,
         requested_partner_user_id = NULL,
         status = 'PENDING_ASSIGNMENT',
         assigned_at = NULL,
         admin_note = ?
     WHERE id = ? AND status IN ('ASSIGNED','IN_PROGRESS')`,
    [adminNote || null, bookingId]
  );
}

async function hasRefundForBooking(bookingId) {
  const [rows] = await pool.query(
    `SELECT id FROM payment_transactions
     WHERE booking_id = ? AND transaction_type = 'REFUND' AND status = 'REFUNDED'
     LIMIT 1`,
    [bookingId]
  );
  return rows.length > 0;
}

async function getBookingFeeSummary() {
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN transaction_type = 'BOOKING_FEE' AND status = 'PAID' THEN amount ELSE 0 END), 0) AS collected,
       COALESCE(SUM(CASE WHEN transaction_type = 'BOOKING_FEE' AND status = 'PENDING' THEN amount ELSE 0 END), 0) AS pending,
       COALESCE(SUM(CASE WHEN transaction_type = 'REFUND' AND status = 'REFUNDED' THEN amount ELSE 0 END), 0) AS refunded
     FROM payment_transactions`
  );
  const summary = rows[0] || {};
  return {
    collected: Number(summary.collected || 0),
    pending: Number(summary.pending || 0),
    refunded: Number(summary.refunded || 0),
    net: Number(summary.collected || 0) - Number(summary.refunded || 0)
  };
}

async function listBookingFeesForAdmin() {
  const [rows] = await pool.query(
    `SELECT fee.id, fee.booking_id, fee.amount, fee.status, fee.payment_method,
            fee.transaction_reference, fee.created_at, b.booking_code, b.status AS booking_status,
            u.name AS customer_name, u.mobile AS customer_mobile,
            refund.amount AS refund_amount, refund.status AS refund_status
     FROM payment_transactions fee
     JOIN service_bookings b ON b.id = fee.booking_id
     JOIN users u ON u.id = b.customer_user_id
     LEFT JOIN payment_transactions refund
       ON refund.booking_id = b.id AND refund.transaction_type = 'REFUND' AND refund.status = 'REFUNDED'
     WHERE fee.transaction_type = 'BOOKING_FEE'
     ORDER BY fee.created_at DESC, fee.id DESC`
  );
  return rows;
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

async function setWorkPayment({ bookingId, customerUserId, partnerUserId, amount }) {
  await pool.query(
    `INSERT INTO work_payments (booking_id, customer_user_id, partner_user_id, amount)
     VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE amount = IF(status = 'PROPOSED', VALUES(amount), amount), partner_user_id=IF(status='PROPOSED',VALUES(partner_user_id),partner_user_id)`,
    [bookingId, customerUserId, partnerUserId, amount]
  );
}

async function getWorkPaymentForBooking(bookingId) {
  const [rows] = await pool.query("SELECT * FROM work_payments WHERE booking_id = ? LIMIT 1", [bookingId]);
  return rows[0] || null;
}

async function deleteProposedWorkPayment(bookingId) {
  const [result] = await pool.query("DELETE FROM work_payments WHERE booking_id=? AND status='PROPOSED'", [bookingId]);
  return result.affectedRows > 0;
}

async function listWorkPaymentsForCustomer(userId) {
  const [rows] = await pool.query(
    `SELECT wp.*, b.booking_code, b.category, pu.name AS partner_name
     FROM work_payments wp JOIN service_bookings b ON b.id = wp.booking_id
     JOIN users pu ON pu.id = wp.partner_user_id WHERE wp.customer_user_id = ?
     ORDER BY wp.created_at DESC`, [userId]
  );
  return rows;
}

async function listWorkPaymentsForPartner(userId) {
  const [rows] = await pool.query(
    `SELECT wp.*, b.booking_code, b.category, cu.name AS customer_name
     FROM work_payments wp JOIN service_bookings b ON b.id = wp.booking_id
     JOIN users cu ON cu.id = wp.customer_user_id WHERE wp.partner_user_id = ?
     ORDER BY wp.created_at DESC`, [userId]
  );
  return rows;
}

async function submitWorkPayment({ id, customerUserId, trxId }) {
  const [result] = await pool.query(
    `UPDATE work_payments SET bkash_trx_id=?, status='PENDING', submitted_at=NOW()
     WHERE id=? AND customer_user_id=? AND status='ADMIN_APPROVED'`, [trxId, id, customerUserId]
  );
  return result.affectedRows > 0;
}

async function approveWorkAmountByCustomer({ id, customerUserId }) {
  const [result] = await pool.query(`UPDATE work_payments wp SET status='ADMIN_APPROVED'
    WHERE wp.id=? AND wp.customer_user_id=? AND wp.status='PROPOSED'
    AND NOT EXISTS (SELECT 1 FROM booking_change_requests r WHERE r.booking_id=wp.booking_id AND r.status='PENDING')`, [id, customerUserId]);
  return result.affectedRows > 0;
}

async function listWorkPaymentsForAdmin() {
  const [rows] = await pool.query(
    `SELECT wp.*, b.booking_code, b.category, cu.name AS customer_name, cu.mobile AS customer_mobile,
            pu.name AS partner_name FROM work_payments wp
     JOIN service_bookings b ON b.id=wp.booking_id JOIN users cu ON cu.id=wp.customer_user_id
     JOIN users pu ON pu.id=wp.partner_user_id
     WHERE wp.status IN ('PENDING','PAID')
     ORDER BY COALESCE(wp.submitted_at, wp.created_at) DESC`
  );
  return rows;
}

async function approveWorkPayment(id, adminEmail) {
  const [result] = await pool.query(`UPDATE work_payments SET
    status='PAID', approved_at=NOW(), approved_by_email=? WHERE id=? AND status='PENDING'`, [adminEmail, id]);
  return result.affectedRows > 0;
}

module.exports = {
  createBooking,
  createPayment,
  bookingFeeReferenceExists,
  approveBookingPayment,
  listBookingsForCustomer,
  listCurrentOrdersForPartner,
  listOrderHistoryForPartner,
  listBookingsForAdmin,
  getBookingById,
  assignBooking,
  requestReplacementPartner,
  markBookingInProgress,
  completeBooking,
  addCustomerRating,
  markRefundPending,
  markRefunded,
  cancelBooking,
  releaseBookingForReassignment,
  hasRefundForBooking,
  getBookingFeeSummary,
  listBookingFeesForAdmin,
  addChatMessage,
  getChatMessages,
  listPaymentHistoryForUser
  ,setWorkPayment, getWorkPaymentForBooking, deleteProposedWorkPayment, listWorkPaymentsForCustomer, approveWorkAmountByCustomer,
  listWorkPaymentsForPartner, submitWorkPayment, listWorkPaymentsForAdmin, approveWorkPayment
};
