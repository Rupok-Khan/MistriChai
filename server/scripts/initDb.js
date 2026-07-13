require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const requiredVariables = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];

async function initializeDatabase() {
  const missing = requiredVariables.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing database variables: ${missing.join(", ")}`);
  }

  const schemaPath = path.join(__dirname, "..", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8")
    .replace(/^\s*CREATE DATABASE[^;]*;\s*/im, "")
    .replace(/^\s*USE\s+[^;]+;\s*/im, "");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined
  });

  try {
    await connection.query(schema);
    console.log("Database schema initialized successfully.");
  } finally {
    await connection.end();
  }
}

initializeDatabase().catch((error) => {
  console.error("Database initialization failed:", error.message);
  process.exit(1);
});
