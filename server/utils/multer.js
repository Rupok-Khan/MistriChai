const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");
const { uploadDirectory } = require("../config/uploadPaths");
const { cloudinary, cloudinaryConfigured } = require("../config/cloudinary");

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "image/heic",
  "image/heif",
  "image/avif"
];
const SAFE_EXTENSIONS = {
  "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp",
  "image/heic": ".heic", "image/heif": ".heif", "image/avif": ".avif",
  "application/pdf": ".pdf", "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx", "text/plain": ".txt"
};

const FIELD_DIRECTORIES = {
  profile_photo: "profile",
  nid_front_photo: "nid",
  nid_back_photo: "nid",
  attachment: "chat",
  proof: "cancellation",
  service_card_image: "service",
  hero_image: "site",
  promo_left_image: "site",
  promo_right_image: "site"
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

const profileDir = uploadDirectory("profile");
const nidDir = uploadDirectory("nid");
const chatDir = uploadDirectory("chat");
const serviceDir = uploadDirectory("service");
const siteDir = uploadDirectory("site");
const cancellationDir = uploadDirectory("cancellation");
ensureDir(profileDir);
ensureDir(nidDir);
ensureDir(chatDir);
ensureDir(serviceDir);
ensureDir(siteDir);
ensureDir(cancellationDir);

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "profile_photo") return cb(null, profileDir);
    if (file.fieldname === "nid_front_photo") return cb(null, nidDir);
    if (file.fieldname === "nid_back_photo") return cb(null, nidDir);
    if (file.fieldname === "attachment") return cb(null, chatDir);
    if (file.fieldname === "proof") return cb(null, cancellationDir);
    if (file.fieldname === "service_card_image") return cb(null, serviceDir);
    if (["hero_image", "promo_left_image", "promo_right_image"].includes(file.fieldname)) return cb(null, siteDir);
    cb(null, nidDir);
  },
  filename: (req, file, cb) => {
    const ext = SAFE_EXTENSIONS[file.mimetype];
    if (!ext) return cb(new Error("Unsupported file type."));
    const safeName = `${Date.now()}-${crypto.randomBytes(16).toString("hex")}${ext}`;
    cb(null, safeName);
  }
});

const cloudinaryStorage = {
  _handleFile(req, file, cb) {
    const directory = FIELD_DIRECTORIES[file.fieldname] || "other";
    const publicId = `${Date.now()}-${crypto.randomBytes(16).toString("hex")}`;
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `mistrichai/${directory}`,
        public_id: publicId,
        resource_type: "auto",
        use_filename: false,
        unique_filename: false
      },
      (error, result) => {
        if (error) return cb(error);
        cb(null, {
          path: result.secure_url,
          filename: result.public_id,
          size: result.bytes,
          resourceType: result.resource_type
        });
      }
    );
    file.stream.pipe(stream);
  },
  _removeFile(req, file, cb) {
    if (!file.filename) return cb(null);
    cloudinary.uploader.destroy(
      file.filename,
      { resource_type: file.resourceType || "image", invalidate: true },
      (error) => cb(error || null)
    );
  }
};

function fileFilter(req, file, cb) {
  const chatAllowed = [
    ...IMAGE_MIME_TYPES,
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
  ];

  const allowed = ["attachment", "proof"].includes(file.fieldname) ? chatAllowed : IMAGE_MIME_TYPES;
  if (!allowed.includes(file.mimetype)) {
    return cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. Please upload an image, PDF, Word document, or text file.`
      ),
      false
    );
  }
  cb(null, true);
}

const upload = multer({
  storage: cloudinaryConfigured ? cloudinaryStorage : localStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 60, parts: 65 }
});

module.exports = upload;
