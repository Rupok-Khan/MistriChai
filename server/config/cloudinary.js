const { v2: cloudinary } = require("cloudinary");

const configured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
} else if (process.env.CLOUDINARY_REQUIRED === "true") {
  throw new Error("Cloudinary credentials are required for this deployment.");
}

module.exports = { cloudinary, cloudinaryConfigured: configured };
