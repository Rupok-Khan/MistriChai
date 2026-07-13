const path = require("path");

const uploadRoot = path.resolve(
  process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads")
);

function uploadDirectory(name) {
  return path.join(uploadRoot, name);
}

function uploadedFilePath(publicUrl, expectedDirectory) {
  const prefix = `/uploads/${expectedDirectory}/`;
  const raw = String(publicUrl || "").trim();
  if (!raw.startsWith(prefix)) return null;

  const filename = path.basename(raw);
  if (!filename || filename !== raw.slice(prefix.length)) return null;
  return path.join(uploadDirectory(expectedDirectory), filename);
}

module.exports = { uploadRoot, uploadDirectory, uploadedFilePath };
