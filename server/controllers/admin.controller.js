const jwt = require("jsonwebtoken");
const Partner = require("../models/partner.model");
const Contact = require("../models/contact.model");
const Booking = require("../models/booking.model");
const Wallet = require("../models/wallet.model");
const User = require("../models/user.model");
const Customer = require("../models/customer.model");
const SiteSettings = require("../models/siteSettings.model");
const BookingChangeRequest = require("../models/bookingChangeRequest.model");
const { mediaUrl, deleteMediaUrl } = require("../utils/mediaFile");

function toServiceImageUrl(file) {
  return mediaUrl(file, "service") || "";
}

function deleteUploadedServiceImage(imageUrl) {
  deleteMediaUrl(imageUrl, "service").catch(() => {});
}

function toSiteImageUrl(file) {
  return mediaUrl(file, "site") || "";
}

function deleteUploadedSiteImage(imageUrl) {
  deleteMediaUrl(imageUrl, "site").catch(() => {});
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const token = jwt.sign({ role: "ADMIN", email }, process.env.JWT_SECRET, {
      algorithm: "HS256",
      issuer: "ondemand-api",
      audience: "ondemand-web",
      expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || "12h"
    });

    return res.json({ token, user: { role: "ADMIN", email } });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.dashboard = async (req, res) => {
  try {
    const [pendingPartners, approvedPartners, bookings, withdrawals, contacts, customers, allPartners, siteSettings, changeRequests, bookingFeeSummary, bookingFees, workPayments] = await Promise.all([
      Partner.adminListPartnersByStatus("PENDING"),
      Partner.adminListPartnersByStatus("APPROVED"),
      Booking.listBookingsForAdmin(),
      Wallet.listWithdrawalRequests(),
      Contact.getAllContacts(),
      User.listCustomers(),
      User.listPartners(),
      SiteSettings.getAllSettings(),
      BookingChangeRequest.listForAdmin(),
      Booking.getBookingFeeSummary(),
      Booking.listBookingFeesForAdmin(),
      Booking.listWorkPaymentsForAdmin()
    ]);

    const summary = {
      pending_partners: pendingPartners.length,
      total_bookings: bookings.length,
      booking_fee_revenue: bookingFeeSummary.net,
      active_bookings: bookings.filter((x) =>
        ["PAYMENT_PENDING", "PENDING_ASSIGNMENT", "WAITING_FOR_PARTNER", "ASSIGNED", "IN_PROGRESS"].includes(x.status)
      ).length,
      refund_cases: bookings.filter((x) => ["REFUND_PENDING", "REFUNDED"].includes(x.status)).length,
      withdrawal_requests: withdrawals.filter((x) => x.status === "PENDING").length,
      pending_change_requests: changeRequests.filter((x) => x.status === "PENDING").length,
      unread_contacts: contacts.length,
      total_customers: customers.length,
      total_partners: allPartners.length
    };

    return res.json({
      data: {
        summary,
        pendingPartners,
        approvedPartners,
        customers,
        partners: allPartners,
        bookings,
        withdrawals,
        siteSettings,
        changeRequests,
        bookingFeeSummary,
        bookingFees,
        workPayments
      }
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.pendingPartners = async (req, res) => {
  try {
    const rows = await Partner.adminListPartnersByStatus("PENDING");
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.partnerDetails = async (req, res) => {
  try {
    const row = await Partner.adminGetPartnerSubmission(req.params.userId);
    if (!row) {
      return res.status(404).json({ message: "Partner not found" });
    }
    return res.json({ data: row });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.approvePartner = async (req, res) => {
  try {
    const partnerCode = await Partner.adminUpdateVerificationStatus({
      userId: req.params.userId,
      status: "APPROVED"
    });

    return res.json({
      message: "Partner approved",
      partner_code: partnerCode,
      note: "SMS sending is not configured locally, so the generated partner code is returned in the response."
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.rejectPartner = async (req, res) => {
  try {
    await Partner.adminUpdateVerificationStatus({
      userId: req.params.userId,
      status: "REJECTED",
      reason: req.body?.reason || null
    });

    return res.json({ message: "Partner rejected" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.listBookings = async (req, res) => {
  try {
    const data = await Booking.listBookingsForAdmin();
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.assignBooking = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.payment_status !== "PAID") {
      return res.status(400).json({ message: "Approve the customer's bKash payment before assigning a partner" });
    }
    if (!["PENDING_ASSIGNMENT", "WAITING_FOR_PARTNER"].includes(booking.status)) {
      return res.status(400).json({ message: `This booking cannot be assigned while its status is ${booking.status}` });
    }
    const partnerUserId = Number(req.body.partner_user_id);
    if (!Number.isInteger(partnerUserId) || partnerUserId <= 0) {
      return res.status(400).json({ message: "Select a valid partner" });
    }

    await Booking.assignBooking({
      bookingId: booking.id,
      partnerUserId,
      adminNote: req.body.admin_note
    });
    await Partner.setBusyOnAssignment(partnerUserId);

    return res.json({ message: "Partner assigned to booking" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.approveBookingPayment = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.status !== "PAYMENT_PENDING" || booking.payment_status !== "PENDING") {
      return res.status(400).json({ message: "This payment is not waiting for approval" });
    }

    const approved = await Booking.approveBookingPayment(booking.id);
    if (!approved) {
      return res.status(409).json({ message: "Payment was already processed" });
    }
    return res.json({ message: "bKash payment approved. The job can now be assigned." });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.approveWorkPayment = async (req, res) => {
  try {
    const approved = await Booking.approveWorkPayment(req.params.id, req.admin?.email || req.user?.email || process.env.ADMIN_EMAIL);
    if (!approved) return res.status(409).json({ message: "Work payment is not pending or was already processed" });
    return res.json({ message: "Final payment approved and marked paid" });
  } catch (err) { return res.status(500).json({ message: "Server error", error: err.message }); }
};

exports.reviewBookingChangeRequest = async (req, res) => {
  try {
    const request = await BookingChangeRequest.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Cancellation or rejection request not found" });
    }
    if (request.status !== "PENDING") {
      return res.status(400).json({ message: "This request has already been reviewed" });
    }

    const action = String(req.body.action || "").trim().toUpperCase();
    if (!["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ message: "Action must be APPROVE or REJECT" });
    }
    const adminNote = String(req.body.admin_note || "").trim();

    if (action === "REJECT") {
      await BookingChangeRequest.reviewRequest({
        id: request.id,
        status: "REJECTED",
        adminNote,
        adminEmail: req.admin.email
      });
      return res.json({ message: "Request rejected. The booking remains unchanged." });
    }

    if (!["ASSIGNED", "IN_PROGRESS"].includes(request.booking_status)) {
      return res.status(400).json({ message: "The booking is no longer active with an assigned partner" });
    }

    if (request.request_type === "CUSTOMER_CANCELLATION") {
      const booking = await Booking.getBookingById(request.booking_id);
      const assignedPartnerId = booking.assigned_partner_user_id;
      await Booking.cancelBooking({
        bookingId: booking.id,
        adminNote: adminNote || "Customer cancellation approved by admin"
      });
      if (assignedPartnerId) {
        await Partner.setAvailableAfterCompletion(assignedPartnerId);
      }
      if (booking.payment_status === "PAID" && !(await Booking.hasRefundForBooking(booking.id))) {
        await Booking.createPayment({
          booking_id: booking.id,
          payer_user_id: null,
          receiver_user_id: booking.customer_user_id,
          transaction_type: "REFUND",
          payment_method: "MOBILE_BANKING",
          amount: booking.booking_fee,
          status: "REFUNDED",
          note: adminNote || "Booking fee refunded after approved customer cancellation"
        });
      }
    } else if (["PARTNER_REJECTION", "CUSTOMER_PARTNER_CHANGE"].includes(request.request_type)) {
      const partnerId = request.assigned_partner_user_id;
      if (request.request_type === "CUSTOMER_PARTNER_CHANGE") {
        await Booking.deleteProposedWorkPayment(request.booking_id);
      }
      await Booking.releaseBookingForReassignment({
        bookingId: request.booking_id,
        adminNote: adminNote || (request.request_type === "CUSTOMER_PARTNER_CHANGE" ? "Customer partner change approved; waiting for reassignment" : "Partner rejection approved; waiting for reassignment")
      });
      if (partnerId) {
        await Partner.setAvailableAfterCompletion(partnerId);
      }
    } else {
      return res.status(400).json({ message: "Unsupported request type" });
    }

    await BookingChangeRequest.reviewRequest({
      id: request.id,
      status: "APPROVED",
      adminNote,
      adminEmail: req.admin.email
    });
    return res.json({
      message: request.request_type === "CUSTOMER_CANCELLATION"
        ? "Cancellation approved and booking fee refunded"
        : request.request_type === "CUSTOMER_PARTNER_CHANGE"
          ? "Partner change approved. Reassign this paid booking without another booking fee."
          : "Partner rejection approved. The booking is ready for reassignment."
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.refundBooking = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    await Booking.markRefundPending({
      bookingId: booking.id,
      adminNote: req.body.admin_note
    });

    await Booking.createPayment({
      booking_id: booking.id,
      payer_user_id: null,
      receiver_user_id: booking.customer_user_id,
      transaction_type: "REFUND",
      payment_method: "ONLINE",
      amount: booking.booking_fee,
      status: "REFUNDED",
      note: req.body.admin_note || "Booking fee refunded by admin"
    });

    await Booking.markRefunded({
      bookingId: booking.id,
      adminNote: req.body.admin_note
    });

    return res.json({ message: "Booking marked refunded" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.listWithdrawals = async (req, res) => {
  try {
    const data = await Wallet.listWithdrawalRequests();
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.listCustomers = async (req, res) => {
  try {
    const data = await User.listCustomers();
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.listPartners = async (req, res) => {
  try {
    const data = await User.listPartners();
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    await Customer.adminUpdateCustomerProfile(req.params.id, req.body);
    const data = await User.listCustomers();
    const item = data.find((x) => Number(x.id) === Number(req.params.id)) || null;
    return res.json({ message: "Customer updated", data: item });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const affected = await User.deleteUser(req.params.id);
    if (!affected) {
      return res.status(404).json({ message: "Customer not found" });
    }
    return res.json({ message: "Customer account removed" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updatePartnerAccount = async (req, res) => {
  try {
    await Partner.adminUpdatePartnerAccount(req.params.id, req.body);
    const data = await User.listPartners();
    const item = data.find((x) => Number(x.id) === Number(req.params.id)) || null;
    return res.json({ message: "Partner updated", data: item });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.deletePartner = async (req, res) => {
  try {
    const affected = await User.deleteUser(req.params.id);
    if (!affected) {
      return res.status(404).json({ message: "Partner not found" });
    }
    return res.json({ message: "Partner account removed" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.payWithdrawal = async (req, res) => {
  try {
    await Wallet.payWithdrawal({
      withdrawalId: req.params.id,
      adminNote: req.body.admin_note
    });
    return res.json({ message: "Withdrawal marked paid" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getContactMessages = async (req, res, next) => {
  try {
    const items = await Contact.getAllContacts();
    const replies = await Contact.getRepliesByContactIds(items.map((item) => item.id));

    const replyMap = replies.reduce((acc, row) => {
      if (!acc[row.contact_message_id]) {
        acc[row.contact_message_id] = [];
      }
      acc[row.contact_message_id].push(row);
      return acc;
    }, {});

    res.json({
      items: items.map((item) => ({
        ...item,
        replies: replyMap[item.id] || []
      }))
    });
  } catch (err) {
    next(err);
  }
};

exports.replyContactMessage = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const replyText = req.body?.reply_text?.trim();

    if (!id) {
      return res.status(400).json({ message: "Invalid id" });
    }
    if (!replyText) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    const items = await Contact.getAllContacts();
    const exists = items.find((item) => Number(item.id) === id);
    if (!exists) {
      return res.status(404).json({ message: "Message not found" });
    }

    await Contact.addReply({
      contactMessageId: id,
      replyText,
      repliedByEmail: req.admin?.email || null
    });

    res.json({ message: "Reply sent" });
  } catch (err) {
    next(err);
  }
};

exports.deleteContactMessage = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const affected = await Contact.deleteContact(id);
    if (!affected) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};

exports.getSiteSettings = async (req, res, next) => {
  try {
    const data = await SiteSettings.getAllSettings();
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.updateSiteSettings = async (req, res, next) => {
  const uploadedFiles = Object.values(req.files || {}).flat();
  try {
    let payload = req.body || {};
    if (typeof req.body?.settings === "string") {
      try { payload = JSON.parse(req.body.settings); }
      catch (err) { return res.status(400).json({ message: "Invalid site content data" }); }
    }
    const heroImage = req.files?.hero_image?.[0];
    const promoLeftImage = req.files?.promo_left_image?.[0];
    const promoRightImage = req.files?.promo_right_image?.[0];
    const previous = uploadedFiles.length ? await SiteSettings.getAllSettings() : null;
    if (heroImage) {
      payload = {
        ...payload,
        home: { ...(payload.home || {}), heroImageUrl: toSiteImageUrl(heroImage) }
      };
    }
    if (promoLeftImage || promoRightImage) {
      payload = {
        ...payload,
        promo: {
          ...(payload.promo || {}),
          ...(promoLeftImage ? { leftImageUrl: toSiteImageUrl(promoLeftImage) } : {}),
          ...(promoRightImage ? { rightImageUrl: toSiteImageUrl(promoRightImage) } : {})
        }
      };
    }
    const data = await SiteSettings.updateAllSettings(payload);
    if (heroImage) deleteUploadedSiteImage(previous?.home?.heroImageUrl);
    if (promoLeftImage) deleteUploadedSiteImage(previous?.promo?.leftImageUrl);
    if (promoRightImage) deleteUploadedSiteImage(previous?.promo?.rightImageUrl);
    res.json({ message: "Site content updated", data });
  } catch (err) {
    uploadedFiles.forEach((file) => deleteUploadedSiteImage(toSiteImageUrl(file)));
    next(err);
  }
};

exports.listServices = async (req, res, next) => {
  try {
    const data = await SiteSettings.getServices();
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.createService = async (req, res, next) => {
  try {
    const title = String(req.body?.title || "").trim();
    if (!title) {
      return res.status(400).json({ message: "Service title is required" });
    }
    const payload = {
      ...(req.body || {}),
      imageUrl: toServiceImageUrl(req.file)
    };
    const data = await SiteSettings.addService(payload);
    res.status(201).json({ message: "Service added", data });
  } catch (err) {
    if (req.file) {
      deleteUploadedServiceImage(toServiceImageUrl(req.file));
    }
    if (err.message === "Service key already exists") {
      return res.status(409).json({ message: err.message });
    }
    next(err);
  }
};

exports.updateService = async (req, res, next) => {
  try {
    const services = await SiteSettings.getServices();
    const target = services.find((item) => item.key === String(req.params.key || "").trim().toUpperCase());
    if (!target) {
      if (req.file) {
        deleteUploadedServiceImage(toServiceImageUrl(req.file));
      }
      return res.status(404).json({ message: "Service not found" });
    }

    const payload = {
      ...(req.body || {})
    };
    const removeCurrentImage = ["1", "true", "yes", "on"].includes(
      String(req.body?.remove_image || "").trim().toLowerCase()
    );
    if (removeCurrentImage) {
      payload.imageUrl = "";
    }
    if (req.file) {
      payload.imageUrl = toServiceImageUrl(req.file);
    }

    const data = await SiteSettings.updateService(req.params.key, payload);
    if (!data) {
      return res.status(404).json({ message: "Service not found" });
    }

    if (target.imageUrl && target.imageUrl !== data.imageUrl) {
      deleteUploadedServiceImage(target.imageUrl);
    }
    res.json({ message: "Service updated", data });
  } catch (err) {
    if (req.file) {
      deleteUploadedServiceImage(toServiceImageUrl(req.file));
    }
    next(err);
  }
};

exports.deleteService = async (req, res, next) => {
  try {
    const services = await SiteSettings.getServices();
    const target = services.find((item) => item.key === String(req.params.key || "").trim().toUpperCase());
    const ok = await SiteSettings.deleteService(req.params.key);
    if (!ok) {
      return res.status(404).json({ message: "Service not found" });
    }
    if (target?.imageUrl) {
      deleteUploadedServiceImage(target.imageUrl);
    }
    res.json({ message: "Service deleted" });
  } catch (err) {
    next(err);
  }
};
