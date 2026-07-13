function getDatabaseSsl() {
  if (process.env.DB_SSL !== "true") return undefined;

  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";

  let ca;
  if (process.env.DB_SSL_CA_BASE64) {
    ca = Buffer.from(process.env.DB_SSL_CA_BASE64, "base64").toString("utf8");
  } else if (process.env.DB_SSL_CA) {
    ca = process.env.DB_SSL_CA.replace(/\\n/g, "\n");
  }

  return ca ? { ca, rejectUnauthorized } : { rejectUnauthorized };
}

module.exports = { getDatabaseSsl };
