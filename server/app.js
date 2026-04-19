require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");

const authRoutes = require("./routes/auth.routes");
const customerRoutes = require("./routes/customer.routes");
const partnerRoutes = require("./routes/partner.routes");
const partnersRoutes = require("./routes/partners.routes");
const adminRoutes = require("./routes/admin.routes");
const contactRoutes = require("./routes/contact.routes");
const siteRoutes = require("./routes/site.routes");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/admin", adminRoutes);


// Serve uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/partners", partnersRoutes);
app.use("/api", contactRoutes);
app.use("/api", siteRoutes);


// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Error handler (basic)

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file is too large. Maximum size is 5MB."
        : err.message || "Upload failed.";
    return res.status(400).json({ message });
  }

  if (err?.message === "Unsupported file type." || String(err?.message || "").startsWith("Unsupported file type:")) {
    return res.status(400).json({ message: err.message });
  }

  console.error("GLOBAL ERROR:", err);
  res.status(500).json({ message: "Server error", error: err.message });
});

module.exports = app;
