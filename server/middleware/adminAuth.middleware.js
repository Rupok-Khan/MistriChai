// server/middleware/adminAuth.middleware.js
const jwt = require("jsonwebtoken");

module.exports = function adminAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "ondemand-api",
      audience: "ondemand-web"
    });

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden (Admin only)" });
    }

    req.admin = decoded; // { role: 'ADMIN', email: ... }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
