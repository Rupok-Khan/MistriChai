const crypto = require("crypto");

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 10, message = "Too many requests. Please try again later." } = {}) {
  const attempts = new Map();
  let requestsSinceCleanup = 0;

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const record = attempts.get(key);
    const current = !record || record.resetAt <= now ? { count: 0, resetAt: now + windowMs } : record;
    current.count += 1;
    attempts.set(key, current);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - current.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

    requestsSinceCleanup += 1;
    if (requestsSinceCleanup >= 250) {
      requestsSinceCleanup = 0;
      for (const [storedKey, stored] of attempts) if (stored.resetAt <= now) attempts.delete(storedKey);
    }
    if (current.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ message });
    }
    next();
  };
}

module.exports = { securityHeaders, createRateLimiter };
