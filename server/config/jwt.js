function signToken(payload) {
  const jwt = require("jsonwebtoken");
  return jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: "HS256",
    issuer: "ondemand-api",
    audience: "ondemand-web",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

function verifyToken(token) {
  const jwt = require("jsonwebtoken");
  return jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: "ondemand-api",
    audience: "ondemand-web"
  });
}

module.exports = { signToken, verifyToken };
