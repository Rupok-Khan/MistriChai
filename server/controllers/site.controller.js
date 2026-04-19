const SiteSettings = require("../models/siteSettings.model");

exports.getPublicSettings = async (req, res, next) => {
  try {
    const data = await SiteSettings.getAllSettings();
    res.json({ data });
  } catch (err) {
    next(err);
  }
};
