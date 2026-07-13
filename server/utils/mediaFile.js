const fs = require("fs");
const { cloudinary, cloudinaryConfigured } = require("../config/cloudinary");
const { uploadedFilePath } = require("../config/uploadPaths");

function mediaUrl(file, localDirectory) {
  if (!file) return null;
  if (/^https:\/\//i.test(String(file.path || ""))) return file.path;
  if (!file.filename) return null;
  return `/uploads/${localDirectory}/${file.filename}`;
}

function cloudinaryAsset(url, expectedDirectory) {
  try {
    const parsed = new URL(String(url || ""));
    if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") return null;
    const match = parsed.pathname.match(/^\/[^/]+\/(image|raw|video)\/upload\/(.+)$/);
    if (!match) return null;
    const parts = match[2].split("/");
    if (/^v\d+$/.test(parts[0])) parts.shift();
    const withExtension = decodeURIComponent(parts.join("/"));
    const publicId = withExtension.replace(/\.[^/.]+$/, "");
    if (!publicId.startsWith(`mistrichai/${expectedDirectory}/`)) return null;
    return { publicId, resourceType: match[1] };
  } catch {
    return null;
  }
}

async function deleteMediaUrl(url, expectedDirectory) {
  const asset = cloudinaryAsset(url, expectedDirectory);
  if (asset && cloudinaryConfigured) {
    await cloudinary.uploader.destroy(asset.publicId, {
      resource_type: asset.resourceType,
      invalidate: true
    });
    return;
  }

  const localPath = uploadedFilePath(url, expectedDirectory);
  if (localPath && fs.existsSync(localPath)) await fs.promises.unlink(localPath);
}

module.exports = { mediaUrl, deleteMediaUrl };
