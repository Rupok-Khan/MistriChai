const express = require("express");
const { body } = require("express-validator");
const upload = require("../utils/multer");
const Auth = require("../controllers/auth.controller");

const router = express.Router();

router.post("/refresh", Auth.refreshSession);
router.post("/logout", Auth.logout);

// Customer
router.post(
  "/customer/signup",
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("mobile").notEmpty(),
    body("address").notEmpty(),
    body("password").isLength({ min: 8, max: 128 })
  ],
  Auth.customerSignup
);

router.post("/customer/login", Auth.customerLogin);

// Partner (multipart)
router.post(
  "/partner/signup",
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "nid_front_photo", maxCount: 1 },
    { name: "nid_back_photo", maxCount: 1 }
  ]),
  Auth.partnerSignup
);

router.post("/partner/login", Auth.partnerLogin);

module.exports = router;
