const bcrypt = require("bcrypt");
const Customer = require("../models/customer.model");
const User = require("../models/user.model");
const Booking = require("../models/booking.model");

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
      booking_fee,
      estimated_cash_amount,
      customer_note
    } = req.body;

    const initial_status = requested_partner_user_id
      ? "WAITING_FOR_PARTNER"
      : "PENDING_ASSIGNMENT";

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
      booking_fee,
      estimated_cash_amount,
      customer_note,
      initial_status
    });

    await Booking.createPayment({
      booking_id: bookingId,
      payer_user_id: req.user.id,
      receiver_user_id: null,
      transaction_type: "BOOKING_FEE",
      payment_method: "ONLINE",
      amount: booking_fee,
      status: "PAID",
      note: "Platform booking fee paid by customer"
    });

    const data = await Booking.getBookingById(bookingId);
    return res.status(201).json({ message: "Booking created", data });
  } catch (err) {
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
      attachmentUrl: attachment ? `/uploads/chat/${attachment.filename}` : null,
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
