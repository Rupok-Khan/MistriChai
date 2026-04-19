const router = require("express").Router();
const Site = require("../controllers/site.controller");

router.get("/site-content", Site.getPublicSettings);

module.exports = router;
