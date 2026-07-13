const bcrypt = require("bcrypt");
const Customer = require("../models/customer.model");
const User = require("../models/user.model");
const Booking = require("../models/booking.model");
const BookingChangeRequest = require("../models/bookingChangeRequest.model");
const Partner = require("../models/partner.model");
const { mediaUrl } = require("../utils/mediaFile");

const SERVICE_CHARGE = 99;
const BKASH_NUMBER = "01984646174";

function canAccessBooking(booking, userId) {
  return booking && Number(booking.customer_user_id) === Number(userId);
}

exports.me = async (req, res) => {
  try {
    const data = await Customer.getCustomerMe(req.user.id);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, mobile, address } = req.body;
    await Customer.updateCustomerProfile(req.user.id, { name, email, mobile, address });
    const data = await Customer.getCustomerMe(req.user.id);
    return res.json({ message: "Profile updated", data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findById(req.user.id);

    const ok = await bcrypt.compare(current_password, user.password_hash);
    if (!ok) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await User.updatePassword(req.user.id, password_hash);
    return res.json({ message: "Password updated" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const {
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
      estimated_cash_amount,
      customer_note,
      bkash_trx_id
    } = req.body;

    const transactionReference = String(bkash_trx_id || "").trim().toUpperCase();
    if (!/^[A-Za-z0-9]{6,50}$/.test(transactionReference)) {
      return res.status(400).json({ message: "Enter a valid bKash transaction ID (6-50 letters or numbers)" });
    }
    if (await Booking.bookingFeeReferenceExists(transactionReference)) {
      return res.status(409).json({ message: "This bKash transaction ID has already been submitted" });
    }

    const bookingId = await Booking.createBooking({
      customer_user_id: req.user.id,
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
      booking_fee: SERVICE_CHARGE,
      estimated_cash_amount,
      customer_note,
      initial_status: "PAYMENT_PENDING"
    });

    await Booking.createPayment({
      booking_id: bookingId,
      payer_user_id: req.user.id,
      receiver_user_id: null,
      transaction_type: "BOOKING_FEE",
      payment_method: "MOBILE_BANKING",
      transaction_reference: transactionReference,
      amount: SERVICE_CHARGE,
      status: "PENDING",
      note: `Customer submitted manual bKash payment to ${BKASH_NUMBER}; awaiting admin approval`
    });

    const data = await Booking.getBookingById(bookingId);
    return res.status(201).json({ message: "Payment submitted. Your job is waiting for admin approval.", data });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "This bKash transaction ID has already been submitted" });
    }
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.myBookings = async (req, res) => {
  try {
    const data = await Booking.listBookingsForCustomer(req.user.id);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.bookingDetails = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!canAccessBooking(booking, req.user.id)) {
      return res.status(404).json({ message: "Booking not found" });
    }
    return res.json({ data: booking });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.paymentHistory = async (req, res) => {
  try {
    const data = await Booking.listPaymentHistoryForUser(req.user.id);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.workPayments = async (req, res) => {
  try { return res.json({ data: await Booking.listWorkPaymentsForCustomer(req.user.id), bkash_number: BKASH_NUMBER }); }
  catch (err) { return res.status(500).json({ message: "Server error", error: err.message }); }
};

exports.submitWorkPayment = async (req, res) => {
  try {
    const trxId = String(req.body.bkash_trx_id || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{6,50}$/.test(trxId)) return res.status(400).json({ message: "Enter a valid bKash transaction ID" });
    const updated = await Booking.submitWorkPayment({ id: req.params.id, customerUserId: req.user.id, trxId });
    if (!updated) return res.status(409).json({ message: "Payment is unavailable or was already submitted" });
    return res.json({ message: "Work payment submitted and waiting for admin approval" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "This bKash transaction ID has already been used" });
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.approveWorkAmount = async (req, res) => {
  try {
    const updated = await Booking.approveWorkAmountByCustomer({ id: req.params.id, customerUserId: req.user.id });
    if (!updated) return res.status(409).json({ message: "This amount is unavailable or was already approved" });
    return res.json({ message: "Final amount verified. You can now submit the payment." });
  } catch (err) { return res.status(500).json({ message: "Server error", error: err.message }); }
};

exports.requestPartnerChange = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!canAccessBooking(booking, req.user.id)) return res.status(404).json({ message: "Booking not found" });
    if (!booking.assigned_partner_user_id || !["ASSIGNED", "IN_PROGRESS"].includes(booking.status)) return res.status(400).json({ message: "Partner change is available only for an active assigned booking" });
    const workPayment = await Booking.getWorkPaymentForBooking(booking.id);
    if (workPayment && workPayment.status !== "PROPOSED") return res.status(409).json({ message: "You already verified the final amount. A partner change now requires a new paid booking." });
    const reason = String(req.body.reason || "").trim();
    if (reason.length < 10) return res.status(400).json({ message: "Please provide a reason of at least 10 characters" });
    if (await BookingChangeRequest.hasPendingRequest(booking.id)) return res.status(409).json({ message: "A change request is already pending for this booking" });
    if (await BookingChangeRequest.countPartnerChanges(booking.id) >= 2) return res.status(409).json({ message: "You have already used both free partner changes for this booking" });
    await BookingChangeRequest.createRequest({ bookingId: booking.id, requesterUserId: req.user.id, requestType: "CUSTOMER_PARTNER_CHANGE", reason, proof: req.file });
    return res.status(201).json({ message: "Partner change request sent to admin. No extra booking fee is required.", data: await BookingChangeRequest.listForUser(req.user.id) });
  } catch (err) { return res.status(500).json({ message: "Server error", error: err.message }); }
};

exports.selectReplacementPartner = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!canAccessBooking(booking, req.user.id)) return res.status(404).json({ message: "Booking not found" });
    const partnerUserId = Number(req.body.partner_user_id);
    const partner = await Partner.getPartnerMe(partnerUserId);
    if (!partner || partner.verification_status !== "APPROVED") return res.status(400).json({ message: "Select an approved partner" });
    if (String(partner.technician_category) !== String(booking.category)) return res.status(400).json({ message: "The selected partner does not provide this booking's service category" });
    const updated = await Booking.requestReplacementPartner({ bookingId: booking.id, customerUserId: req.user.id, partnerUserId });
    if (!updated) return res.status(409).json({ message: "Replacement selection is unavailable or already completed" });
    return res.json({ message: "Replacement partner requested. Waiting for admin assignment." });
  } catch (err) { return res.status(500).json({ message: "Server error", error: err.message }); }
};

exports.cancellationRequests = async (req, res) => {
  try {
    const data = await BookingChangeRequest.listForUser(req.user.id);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.requestCancellation = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!canAccessBooking(booking, req.user.id)) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (!booking.assigned_partner_user_id || !["ASSIGNED", "IN_PROGRESS"].includes(booking.status)) {
      return res.status(400).json({ message: "Cancellation can be requested only after a partner is assigned and before completion" });
    }
    const reason = String(req.body.reason || "").trim();
    if (reason.length < 10) {
      return res.status(400).json({ message: "Please provide a cancellation reason of at least 10 characters" });
    }
    if (await BookingChangeRequest.hasPendingRequest(booking.id)) {
      return res.status(409).json({ message: "A cancellation or rejection request is already pending for this booking" });
    }

    await BookingChangeRequest.createRequest({
      bookingId: booking.id,
      requesterUserId: req.user.id,
      requestType: "CUSTOMER_CANCELLATION",
      reason,
      proof: req.file
    });
    const data = await BookingChangeRequest.listForUser(req.user.id);
    return res.status(201).json({ message: "Cancellation request sent to admin for review", data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.chatMessages = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!canAccessBooking(booking, req.user.id)) {
      return res.status(404).json({ message: "Booking not found" });
    }
    const data = await Booking.getChatMessages(req.params.id);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!canAccessBooking(booking, req.user.id)) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (!booking.assigned_partner_user_id) {
      return res.status(400).json({ message: "Chat starts after admin assigns a partner" });
    }

    const attachment = req.file;
    if (!req.body.message_text?.trim() && !attachment) {
      return res.status(400).json({ message: "Write a message or attach a file" });
    }

    await Booking.addChatMessage({
      bookingId: Number(req.params.id),
      senderUserId: req.user.id,
      receiverUserId: booking.assigned_partner_user_id,
      messageText: req.body.message_text?.trim() || null,
      attachmentUrl: mediaUrl(attachment, "chat"),
      attachmentName: attachment ? attachment.originalname : null,
      attachmentType: attachment ? attachment.mimetype : null
    });

    const data = await Booking.getChatMessages(req.params.id);
    return res.json({ message: "Message sent", data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.confirmCashPayment = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!canAccessBooking(booking, req.user.id)) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.status !== "COMPLETED") {
      return res.status(400).json({ message: "Cash payment can be recorded after completion" });
    }

    await Booking.createPayment({
      booking_id: booking.id,
      payer_user_id: req.user.id,
      receiver_user_id: booking.assigned_partner_user_id,
      transaction_type: "SERVICE_CASH",
      payment_method: "CASH",
      amount: req.body.amount || booking.estimated_cash_amount,
      status: "COMPLETED",
      note: "Customer confirmed cash payment to partner"
    });

    return res.json({ message: "Cash payment recorded" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.submitRating = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!canAccessBooking(booking, req.user.id)) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.status !== "COMPLETED") {
      return res.status(400).json({ message: "Rating is allowed only after the job is completed" });
    }
    if (!booking.assigned_partner_user_id) {
      return res.status(400).json({ message: "Cannot rate this booking because no partner was assigned" });
    }
    if (booking.customer_rating) {
      return res.status(400).json({ message: "You already rated this booking" });
    }

    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
    }

    const updated = await Booking.addCustomerRating({
      bookingId: booking.id,
      rating,
      review: req.body.review?.trim()
    });

    if (!updated) {
      return res.status(400).json({ message: "Rating already submitted" });
    }

    const data = await Booking.getBookingById(booking.id);
    return res.json({ message: "Thank you for your rating", data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
