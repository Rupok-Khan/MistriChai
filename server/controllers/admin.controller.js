const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const Partner = require("../models/partner.model");
const Contact = require("../models/contact.model");
const Booking = require("../models/booking.model");
const Wallet = require("../models/wallet.model");
const User = require("../models/user.model");
const Customer = require("../models/customer.model");
const SiteSettings = require("../models/siteSettings.model");

function toServiceImageUrl(file) {
  if (!file?.filename) return "";
  return `/uploads/service/${file.filename}`;
}

function deleteUploadedServiceImage(imageUrl) {
  const raw = String(imageUrl || "").trim();
  if (!raw || !raw.startsWith("/uploads/service/")) {
    return;
  }

  const safeRelative = raw.replace(/^\/+/, "");
  const absolutePath = path.join(__dirname, "..", safeRelative);
  if (!absolutePath.includes(`${path.sep}uploads${path.sep}service${path.sep}`)) {
    return;
  }

  if (fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (err) {
      // Non-blocking cleanup: service data changes should not fail due to file deletion issues.
    }
  }
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
      expiresIn: "7d"
    });

    return res.json({ token, user: { role: "ADMIN", email } });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.dashboard = async (req, res) => {
  try {
    const [pendingPartners, approvedPartners, bookings, withdrawals, contacts, customers, allPartners, siteSettings] = await Promise.all([
      Partner.adminListPartnersByStatus("PENDING"),
      Partner.adminListPartnersByStatus("APPROVED"),
      Booking.listBookingsForAdmin(),
      Wallet.listWithdrawalRequests(),
      Contact.getAllContacts(),
      User.listCustomers(),
      User.listPartners(),
      SiteSettings.getAllSettings()
    ]);

    const summary = {
      pending_partners: pendingPartners.length,
      total_bookings: bookings.length,
      active_bookings: bookings.filter((x) =>
        ["PENDING_ASSIGNMENT", "WAITING_FOR_PARTNER", "ASSIGNED", "IN_PROGRESS"].includes(x.status)
      ).length,
      refund_cases: bookings.filter((x) => ["REFUND_PENDING", "REFUNDED"].includes(x.status)).length,
      withdrawal_requests: withdrawals.filter((x) => x.status === "PENDING").length,
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
        siteSettings
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

    await Booking.assignBooking({
      bookingId: booking.id,
      partnerUserId: req.body.partner_user_id,
      adminNote: req.body.admin_note
    });
    await Partner.setBusyOnAssignment(req.body.partner_user_id);

    return res.json({ message: "Partner assigned to booking" });
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
  try {
    const data = await SiteSettings.updateAllSettings(req.body || {});
    res.json({ message: "Site content updated", data });
  } catch (err) {
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
