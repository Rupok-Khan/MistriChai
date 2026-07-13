const bcrypt = require("bcrypt");
const Partner = require("../models/partner.model");
const User = require("../models/user.model");
const Booking = require("../models/booking.model");
const Wallet = require("../models/wallet.model");
const BookingChangeRequest = require("../models/bookingChangeRequest.model");
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

function normalizeSocialUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (!/^https:\/\//i.test(url)) throw new Error("Social media links must start with https://");
  return url.slice(0, 255);
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
    await Partner.updateProfile(req.user.id, {
      ...req.body,
      facebook_url: normalizeSocialUrl(req.body.facebook_url),
      instagram_url: normalizeSocialUrl(req.body.instagram_url),
      linkedin_url: normalizeSocialUrl(req.body.linkedin_url),
      whatsapp_url: normalizeSocialUrl(req.body.whatsapp_url)
    });
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
    if (await BookingChangeRequest.hasPendingRequest(booking.id)) {
      return res.status(400).json({ message: "This order has a pending cancellation or rejection request" });
    }

    if (!['ASSIGNED', 'IN_PROGRESS'].includes(booking.status)) {
      return res.status(400).json({ message: "Only an active job can be completed" });
    }
    const workPayment = await Booking.getWorkPaymentForBooking(booking.id);
    if (!workPayment) {
      return res.status(400).json({ message: "Set the final work amount before completing this job" });
    }
    if (workPayment.status !== "PAID") {
      return res.status(400).json({ message: "Customer final payment must be approved by admin before completion" });
    }

    await Booking.markBookingInProgress(booking.id);
    await Booking.completeBooking({
      bookingId: booking.id,
      partnerNote: req.body.partner_note
    });
    await Wallet.creditCompletedWork({
      partnerUserId: req.user.id,
      bookingId: booking.id,
      amount: workPayment.amount
    });
    await Partner.setAvailableAfterCompletion(req.user.id);

    return res.json({ message: "Order completed and the final work amount was credited to your wallet." });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Choose a JPG, PNG, WebP, HEIC, or AVIF image" });
    await Partner.updateProfilePhoto(req.user.id, `/uploads/profile/${req.file.filename}`);
    const data = await Partner.getPartnerMe(req.user.id);
    return res.json({ message: "Profile photo updated", data });
  } catch (err) {
    if (String(err.message).includes("must start with https://")) return res.status(400).json({ message: err.message });
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.setWorkPayment = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!partnerCanAccessBooking(booking, req.user.id)) return res.status(404).json({ message: "Order not found" });
    if (!["ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(booking.status)) return res.status(400).json({ message: "Work amount is not available for this order" });
    if (await BookingChangeRequest.hasPendingRequest(booking.id)) return res.status(409).json({ message: "Final amount cannot be set while a partner-change request is awaiting admin review" });
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return res.status(400).json({ message: "Enter a valid work amount" });
    const existing = await Booking.getWorkPaymentForBooking(booking.id);
    if (existing && existing.status !== "PROPOSED") return res.status(409).json({ message: "Amount cannot be changed after customer approval" });
    await Booking.setWorkPayment({ bookingId: booking.id, customerUserId: booking.customer_user_id, partnerUserId: req.user.id, amount });
    return res.json({ message: "Work payment amount sent to the customer" });
  } catch (err) { return res.status(500).json({ message: "Server error", error: err.message }); }
};

exports.workPayments = async (req, res) => {
  try { return res.json({ data: await Booking.listWorkPaymentsForPartner(req.user.id) }); }
  catch (err) { return res.status(500).json({ message: "Server error", error: err.message }); }
};

exports.rejectionRequests = async (req, res) => {
  try {
    const data = await BookingChangeRequest.listForUser(req.user.id);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.requestOrderRejection = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!partnerCanAccessBooking(booking, req.user.id)) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!["ASSIGNED", "IN_PROGRESS"].includes(booking.status)) {
      return res.status(400).json({ message: "This order can no longer be rejected" });
    }
    const reason = String(req.body.reason || "").trim();
    if (reason.length < 10) {
      return res.status(400).json({ message: "Please provide a rejection reason of at least 10 characters" });
    }
    if (await BookingChangeRequest.hasPendingRequest(booking.id)) {
      return res.status(409).json({ message: "A cancellation or rejection request is already pending for this booking" });
    }

    await BookingChangeRequest.createRequest({
      bookingId: booking.id,
      requesterUserId: req.user.id,
      requestType: "PARTNER_REJECTION",
      reason,
      proof: req.file
    });
    const data = await BookingChangeRequest.listForUser(req.user.id);
    return res.status(201).json({ message: "Job rejection request sent to admin for review", data });
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

exports.savePayoutMethod = async (req, res) => {
  try {
    const method = String(req.body.method || "").toUpperCase();
    const accountName = String(req.body.account_name || "").trim();
    const accountNumber = String(req.body.account_number || "").trim();
    const bankName = String(req.body.bank_name || "").trim();
    const branchName = String(req.body.branch_name || "").trim();
    const routingNumber = String(req.body.routing_number || "").trim();
    if (!["BKASH", "NAGAD", "ROCKET", "BANK"].includes(method)) return res.status(400).json({ message: "Choose a valid payment method" });
    if (!accountName || !accountNumber) return res.status(400).json({ message: "Account name and account number are required" });
    if (method !== "BANK" && !/^01\d{9}$/.test(accountNumber)) return res.status(400).json({ message: "Enter a valid 11-digit mobile account number" });
    if (method === "BANK" && (!bankName || !branchName)) return res.status(400).json({ message: "Bank name and branch name are required" });
    await Wallet.savePayoutMethod({ partnerUserId: req.user.id, method, accountName, accountNumber, bankName, branchName, routingNumber });
    return res.json({ message: "Withdrawal wallet saved successfully", data: await Wallet.getWalletSummary(req.user.id) });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.requestWithdrawal = async (req, res) => {
  try {
    const summary = await Wallet.getWalletSummary(req.user.id);
    if (!summary.payout_method) return res.status(400).json({ message: "Add a withdrawal wallet before requesting a withdrawal" });
    const amount = Number(req.body.amount || 0);
    if (!Number.isFinite(amount) || amount < 300) {
      return res.status(400).json({ message: "Minimum withdrawal amount is 300 taka" });
    }
    const pendingTotal = await Wallet.getPendingWithdrawalTotal(req.user.id);
    const withdrawable = Math.max(0, Number(summary.balance) - pendingTotal - 100);
    if (amount > withdrawable) {
      return res.status(400).json({ message: `You can withdraw up to ${withdrawable.toFixed(2)} taka after pending requests while keeping 100 taka in your wallet` });
    }

    await Wallet.requestWithdrawal({
      partnerUserId: req.user.id,
      amount,
      note: req.body.note,
      payoutMethod: summary.payout_method
    });

    return res.json({ message: "Withdrawal request submitted. A minimum 100 taka reserve remains protected." });
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
      ,facebook_url: p.facebook_url, instagram_url: p.instagram_url, linkedin_url: p.linkedin_url, whatsapp_url: p.whatsapp_url
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
      ,facebook_url: p.facebook_url, instagram_url: p.instagram_url, linkedin_url: p.linkedin_url, whatsapp_url: p.whatsapp_url
    }));

    return res.json({ data: mapped });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
