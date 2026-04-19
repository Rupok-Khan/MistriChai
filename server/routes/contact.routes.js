const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const { submitContact, myContacts } = require("../controllers/contact.controller");

router.post("/contact", auth, requireRole("CUSTOMER", "PARTNER"), submitContact);
router.get("/contact/my", auth, requireRole("CUSTOMER", "PARTNER"), myContacts);

module.exports = router;
