require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const { securityHeaders, createRateLimiter } = require("./middleware/security.middleware");

const authRoutes = require("./routes/auth.routes");
const customerRoutes = require("./routes/customer.routes");
const partnerRoutes = require("./routes/partner.routes");
const partnersRoutes = require("./routes/partners.routes");
const adminRoutes = require("./routes/admin.routes");
const contactRoutes = require("./routes/contact.routes");
const siteRoutes = require("./routes/site.routes");

const app = express();

app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
app.use(securityHeaders);
app.use((req, res, next) => {
  const sendJson = res.json.bind(res);
  res.json = (body) => {
    if (process.env.NODE_ENV === "production" && res.statusCode >= 500 && body && typeof body === "object") {
      const { error, stack, ...safeBody } = body;
      return sendJson(safeBody);
    }
    return sendJson(body);
  };
  next();
});
const configuredOrigins = String(process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173").split(",").map((item) => item.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
  maxAge: 86400
}));
app.use(express.json({ limit: "512kb" }));
app.use(express.urlencoded({ extended: false, limit: "512kb" }));
const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many login attempts. Please wait 15 minutes." });
const submissionLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 30, message: "Too many submissions. Please try again later." });
app.use(["/api/admin/login", "/api/auth/customer/login", "/api/auth/partner/login"], loginLimiter);
app.use(["/api/auth/customer/signup", "/api/auth/partner/signup", "/api/contact"], submissionLimiter);
app.use("/api/admin", adminRoutes);


// Serve uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  dotfiles: "deny",
  fallthrough: false,
  immutable: true,
  maxAge: "7d",
  setHeaders(res) { res.setHeader("X-Content-Type-Options", "nosniff"); }
}));

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
  if (err?.message === "Origin is not allowed by CORS") {
    return res.status(403).json({ message: "Origin is not allowed" });
  }
  if (err?.status === 404) {
    return res.status(404).json({ message: "File not found" });
  }
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

  console.error(`[${req.requestId || "no-request-id"}] GLOBAL ERROR:`, err);
  const response = { message: "Server error", request_id: req.requestId };
  if (process.env.NODE_ENV !== "production") response.error = err.message;
  res.status(500).json(response);
});

module.exports = app;
