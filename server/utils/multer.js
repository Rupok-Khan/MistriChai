const multer = require("multer");
const path = require("path");
const fs = require("fs");

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "image/heic",
  "image/heif",
  "image/avif"
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

const profileDir = path.join(__dirname, "..", "uploads", "profile");
const nidDir = path.join(__dirname, "..", "uploads", "nid");
const chatDir = path.join(__dirname, "..", "uploads", "chat");
const serviceDir = path.join(__dirname, "..", "uploads", "service");
ensureDir(profileDir);
ensureDir(nidDir);
ensureDir(chatDir);
ensureDir(serviceDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "profile_photo") return cb(null, profileDir);
    if (file.fieldname === "nid_front_photo") return cb(null, nidDir);
    if (file.fieldname === "nid_back_photo") return cb(null, nidDir);
    if (file.fieldname === "attachment") return cb(null, chatDir);
    if (file.fieldname === "service_card_image") return cb(null, serviceDir);
    cb(null, nidDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});

function fileFilter(req, file, cb) {
  const chatAllowed = [
    ...IMAGE_MIME_TYPES,
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
  ];

  const allowed = file.fieldname === "attachment" ? chatAllowed : IMAGE_MIME_TYPES;
  if (!allowed.includes(file.mimetype)) {
    return cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. Please upload JPG, PNG, WEBP, HEIC, HEIF, or AVIF files.`
      ),
      false
    );
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = upload;
