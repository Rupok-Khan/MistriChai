const bcrypt = require("bcrypt");
const Partner = require("../models/partner.model");
const User = require("../models/user.model");
const Booking = require("../models/booking.model");
const Wallet = require("../models/wallet.model");
function toBool(x) {
  if (x === undefined || x === null) {
    return undefined;
  }
  const value = String(x).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(value)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(value)) {
    return false;
  }
  return undefined;
}

function partnerCanAccessBooking(booking, userId) {
  return booking && Number(booking.assigned_partner_user_id) === Number(userId);
}

exports.me = async (req, res) => {
  try {
    const data = await Partner.getPartnerMe(req.user.id);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    await Partner.updateProfile(req.user.id, req.body);
    const data = await Partner.getPartnerMe(req.user.id);
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

exports.updateWorkingHours = async (req, res) => {
  try {
    const { working_start_time, working_end_time } = req.body;
    if (working_start_time >= working_end_time) {
      return res.status(400).json({ message: "Working start time must be before end time" });
    }
    await Partner.updateWorkingHours(req.user.id, working_start_time, working_end_time);
    const data = await Partner.getPartnerMe(req.user.id);
    return res.json({ message: "Working hours updated", data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    await Partner.updateAvailability(req.user.id, req.body.availability_status);
    const data = await Partner.getPartnerMe(req.user.id);
    return res.json({ message: "Availability updated", data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.listCurrentOrders = async (req, res) => {
  try {
    const data = await Booking.listCurrentOrdersForPartner(req.user.id);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.listOrderHistory = async (req, res) => {
  try {
    const data = await Booking.listOrderHistoryForPartner(req.user.id);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.completeOrder = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!partnerCanAccessBooking(booking, req.user.id)) {
      return res.status(404).json({ message: "Order not found" });
    }

    await Booking.markBookingInProgress(booking.id);
    await Booking.completeBooking({
      bookingId: booking.id,
      partnerNote: req.body.partner_note
    });
    await Partner.setAvailableAfterCompletion(req.user.id);
    await Wallet.creditWallet({
      partnerUserId: req.user.id,
      bookingId: booking.id,
      amount: booking.booking_fee,
      note: "Platform share added after booking completion"
    });

    return res.json({ message: "Order completed. Customer can now see a rating notification and submit a star rating." });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.walletSummary = async (req, res) => {
  try {
    const data = await Wallet.getWalletSummary(req.user.id);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.requestWithdrawal = async (req, res) => {
  try {
    const summary = await Wallet.getWalletSummary(req.user.id);
    const amount = Number(req.body.amount || 0);
    if (amount <= 0) {
      return res.status(400).json({ message: "Withdrawal amount must be greater than zero" });
    }
    if (amount > Number(summary.balance)) {
      return res.status(400).json({ message: "Withdrawal amount exceeds wallet balance" });
    }

    await Wallet.requestWithdrawal({
      partnerUserId: req.user.id,
      amount,
      note: req.body.note
    });

    return res.json({ message: "Withdrawal request submitted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.chatMessages = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!partnerCanAccessBooking(booking, req.user.id)) {
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
    if (!partnerCanAccessBooking(booking, req.user.id)) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const attachment = req.file;
    if (!req.body.message_text?.trim() && !attachment) {
      return res.status(400).json({ message: "Write a message or attach a file" });
    }

    await Booking.addChatMessage({
      bookingId: Number(req.params.id),
      senderUserId: req.user.id,
      receiverUserId: booking.customer_user_id,
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

exports.listForCustomer = async (req, res) => {
  try {
    const { category, district, thana, ward_no } = req.query;
    const availableNow = toBool(req.query.availableNow);

    if (!category) {
      return res.status(400).json({ message: "category is required" });
    }

    const partners = await Partner.listPartnersForCustomer({
      category,
      district,
      thana,
      ward_no
    });

    let filtered = partners;
    if (availableNow === true) {
      filtered = filtered.filter(
        (p) => String(p.availability_status || "").trim().toUpperCase() === "AVAILABLE"
      );
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const mapped = filtered.map((p) => ({
      id: p.user_id,
      partner_code: p.partner_code,
      name: `${p.first_name} ${p.last_name}`,
      technician_category: p.technician_category,
      district: p.district,
      thana: p.thana,
      ward_no: p.ward_no,
      city_corp_or_union: p.city_corp_or_union,
      working_start_time: p.working_start_time,
      working_end_time: p.working_end_time,
      experience_years: p.experience_years,
      availability_status: p.availability_status,
      verification_status: p.verification_status,
      rating_avg: Number(p.rating_avg || 0),
      rating_count: Number(p.rating_count || 0),
      profile_photo_url: p.profile_photo ? `${baseUrl}${p.profile_photo}` : null
    }));

    return res.json({ data: mapped });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.topForHome = async (req, res) => {
  try {
    const limitRaw = parseInt(req.query.limit || "3", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 12) : 3;
    const partners = await Partner.getTopPartnersForHome(limit);
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const mapped = partners.map((p) => ({
      id: p.user_id,
      partner_code: p.partner_code,
      name: `${p.first_name} ${p.last_name}`,
      technician_category: p.technician_category,
      district: p.district,
      thana: p.thana,
      experience_years: p.experience_years,
      profile_photo_url: p.profile_photo ? `${baseUrl}${p.profile_photo}` : null,
      availability_status: p.availability_status,
      rating_avg: Number(p.rating_avg || 0),
      rating_count: Number(p.rating_count || 0)
    }));

    return res.json({ data: mapped });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
