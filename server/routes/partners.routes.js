// server/routes/partners.routes.js
const express = require("express");
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const partnerController = require("../controllers/partner.controller");

const router = express.Router();
// PUBLIC: top partners for home page
router.get("/top", partnerController.topForHome);
/**
 * CUSTOMER: list/search partners for a service category
 * GET /api/partners?category=AC_REPAIR&district=Dhaka&thana=Mirpur&ward_no=12&availableNow=true
 */
router.get("/", auth, role("CUSTOMER"), partnerController.listForCustomer);

module.exports = router;