const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const { signToken } = require("../config/jwt");
const User = require("../models/user.model");
const Customer = require("../models/customer.model");
const Partner = require("../models/partner.model");

function isEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

exports.customerSignup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, mobile, address, password } = req.body;

    const existingMobile = await User.findByMobile(mobile);
    if (existingMobile) {
      return res.status(409).json({ message: "Mobile already exists" });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userId = await User.createUser({
      role: "CUSTOMER",
      name,
      email,
      mobile,
      password_hash
    });

    await Customer.createCustomerProfile({ user_id: userId, address });

    const token = signToken({ id: userId, role: "CUSTOMER" });
    return res.status(201).json({
      token,
      user: { id: userId, role: "CUSTOMER", name, email, mobile }
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.customerLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = isEmail(identifier)
      ? await User.findByEmail(identifier)
      : await User.findByMobile(identifier);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.role !== "CUSTOMER") {
      return res.status(403).json({ message: "Not a customer account" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, role: user.role });
    return res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        mobile: user.mobile
      }
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.partnerSignup = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      mobile,
      email,
      nid_address,
      father_name,
      mother_name,
      nid_number,
      district,
      thana,
      ward_no,
      city_corp_or_union,
      technician_category,
      working_start_time,
      working_end_time,
      experience_years,
      password
    } = req.body;

    const profile = req.files?.profile_photo?.[0];
    const nidFront = req.files?.nid_front_photo?.[0];
    const nidBack = req.files?.nid_back_photo?.[0];

    if (!profile || !nidFront || !nidBack) {
      return res.status(400).json({
        message: "profile_photo, nid_front_photo, nid_back_photo are required"
      });
    }

    const existingMobile = await User.findByMobile(mobile);
    if (existingMobile) {
      return res.status(409).json({ message: "Mobile already exists" });
    }

    if (email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ message: "Email already exists" });
      }
    }

    if (working_start_time >= working_end_time) {
      return res.status(400).json({
        message: "working_start_time must be before working_end_time"
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const fullName = `${first_name} ${last_name}`.trim();
    const userId = await User.createUser({
      role: "PARTNER",
      name: fullName,
      email: email || null,
      mobile,
      password_hash
    });

    await Partner.createPartnerProfile({
      user_id: userId,
      first_name,
      last_name,
      nid_address,
      father_name,
      mother_name,
      nid_number,
      profile_photo: `/uploads/profile/${profile.filename}`,
      nid_front_photo: `/uploads/nid/${nidFront.filename}`,
      nid_back_photo: `/uploads/nid/${nidBack.filename}`,
      district,
      thana,
      ward_no,
      city_corp_or_union,
      technician_category,
      working_start_time,
      working_end_time,
      experience_years
    });

    const token = signToken({ id: userId, role: "PARTNER" });
    return res.status(201).json({
      token,
      user: { id: userId, role: "PARTNER", name: fullName, email: email || null, mobile }
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.partnerLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Identifier and password are required" });
    }

    const value = String(identifier).trim();
    const user = isEmail(value)
      ? await User.findByEmail(value)
      : await User.findByMobile(value) || await User.findPartnerByCode(value.toUpperCase());

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.role !== "PARTNER") {
      return res.status(403).json({ message: "Not a partner account" });
    }

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, role: user.role });
    return res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        mobile: user.mobile
      }
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
