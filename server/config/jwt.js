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

function signRefreshToken(payload) {
  const jwt = require("jsonwebtoken");
  return jwt.sign({ ...payload, token_type: "refresh" }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    issuer: "ondemand-api",
    audience: "ondemand-refresh",
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d"
  });
}

function verifyRefreshToken(token) {
  const jwt = require("jsonwebtoken");
  const decoded = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: "ondemand-api",
    audience: "ondemand-refresh"
  });
  if (decoded.token_type !== "refresh") throw new Error("Invalid refresh token");
  return decoded;
}

module.exports = { signToken, verifyToken, signRefreshToken, verifyRefreshToken };
