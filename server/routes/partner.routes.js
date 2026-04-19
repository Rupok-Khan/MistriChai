const express = require("express");
const auth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const Partner = require("../controllers/partner.controller");
const upload = require("../utils/multer");

const router = express.Router();

router.get("/me", auth, requireRole("PARTNER"), Partner.me);
router.put("/profile", auth, requireRole("PARTNER"), Partner.updateProfile);
router.patch("/password", auth, requireRole("PARTNER"), Partner.changePassword);
router.patch("/working-hours", auth, requireRole("PARTNER"), Partner.updateWorkingHours);
router.patch("/availability", auth, requireRole("PARTNER"), Partner.updateAvailability);

router.get("/orders/current", auth, requireRole("PARTNER"), Partner.listCurrentOrders);
router.get("/orders/history", auth, requireRole("PARTNER"), Partner.listOrderHistory);
router.patch("/orders/:id/complete", auth, requireRole("PARTNER"), Partner.completeOrder);

router.get("/wallet", auth, requireRole("PARTNER"), Partner.walletSummary);
router.post("/wallet/withdrawals", auth, requireRole("PARTNER"), Partner.requestWithdrawal);

router.get("/bookings/:id/messages", auth, requireRole("PARTNER"), Partner.chatMessages);
router.post("/bookings/:id/messages", auth, requireRole("PARTNER"), upload.single("attachment"), Partner.sendMessage);

module.exports = router;
