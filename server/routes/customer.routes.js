const express = require("express");
const auth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const Customer = require("../controllers/customer.controller");
const upload = require("../utils/multer");

const router = express.Router();

router.get("/me", auth, requireRole("CUSTOMER"), Customer.me);
router.put("/profile", auth, requireRole("CUSTOMER"), Customer.updateProfile);
router.patch("/password", auth, requireRole("CUSTOMER"), Customer.changePassword);

router.post("/bookings", auth, requireRole("CUSTOMER"), Customer.createBooking);
router.get("/bookings", auth, requireRole("CUSTOMER"), Customer.myBookings);
router.get("/bookings/:id", auth, requireRole("CUSTOMER"), Customer.bookingDetails);
router.get("/bookings/:id/messages", auth, requireRole("CUSTOMER"), Customer.chatMessages);
router.post("/bookings/:id/messages", auth, requireRole("CUSTOMER"), upload.single("attachment"), Customer.sendMessage);
router.patch("/bookings/:id/cash-payment", auth, requireRole("CUSTOMER"), Customer.confirmCashPayment);
router.post("/bookings/:id/rating", auth, requireRole("CUSTOMER"), Customer.submitRating);

router.get("/payments", auth, requireRole("CUSTOMER"), Customer.paymentHistory);

module.exports = router;
