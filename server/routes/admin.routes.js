const express = require("express");
const adminAuth = require("../middleware/adminAuth.middleware");
const Admin = require("../controllers/admin.controller");
const upload = require("../utils/multer");

const router = express.Router();

router.post("/login", Admin.login);

router.get("/dashboard", adminAuth, Admin.dashboard);
router.get("/partners/pending", adminAuth, Admin.pendingPartners);
router.get("/partners/:userId", adminAuth, Admin.partnerDetails);
router.patch("/partners/:userId/approve", adminAuth, Admin.approvePartner);
router.patch("/partners/:userId/reject", adminAuth, Admin.rejectPartner);

router.get("/bookings", adminAuth, Admin.listBookings);
router.patch("/bookings/:id/approve-payment", adminAuth, Admin.approveBookingPayment);
router.patch("/work-payments/:id/approve", adminAuth, Admin.approveWorkPayment);
router.patch("/bookings/:id/assign", adminAuth, Admin.assignBooking);
router.patch("/bookings/:id/refund", adminAuth, Admin.refundBooking);
router.patch("/booking-change-requests/:id/review", adminAuth, Admin.reviewBookingChangeRequest);

router.get("/withdrawals", adminAuth, Admin.listWithdrawals);
router.patch("/withdrawals/:id/pay", adminAuth, Admin.payWithdrawal);
router.get("/customers", adminAuth, Admin.listCustomers);
router.get("/partners", adminAuth, Admin.listPartners);
router.put("/customers/:id", adminAuth, Admin.updateCustomer);
router.delete("/customers/:id", adminAuth, Admin.deleteCustomer);
router.put("/accounts/partners/:id", adminAuth, Admin.updatePartnerAccount);
router.delete("/accounts/partners/:id", adminAuth, Admin.deletePartner);

router.get("/contacts", adminAuth, Admin.getContactMessages);
router.post("/contacts/:id/reply", adminAuth, Admin.replyContactMessage);
router.delete("/contacts/:id", adminAuth, Admin.deleteContactMessage);
router.get("/site-content", adminAuth, Admin.getSiteSettings);
router.put("/site-content", adminAuth, upload.fields([
  { name: "hero_image", maxCount: 1 },
  { name: "promo_left_image", maxCount: 1 },
  { name: "promo_right_image", maxCount: 1 }
]), Admin.updateSiteSettings);
router.get("/services", adminAuth, Admin.listServices);
router.post("/services", adminAuth, upload.single("service_card_image"), Admin.createService);
router.put("/services/:key", adminAuth, upload.single("service_card_image"), Admin.updateService);
router.delete("/services/:key", adminAuth, Admin.deleteService);

module.exports = router;
