const db = require("./db");

async function columnExists(tableName, columnName) {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName]);
  return rows.length > 0;
}

async function getColumnType(tableName, columnName) {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName]);
  return rows[0]?.Type || "";
}

async function ensureChatAttachmentColumns() {
  const changes = [
    {
      column: "attachment_url",
      sql: "ALTER TABLE booking_messages ADD COLUMN attachment_url VARCHAR(255) NULL AFTER message_text"
    },
    {
      column: "attachment_name",
      sql: "ALTER TABLE booking_messages ADD COLUMN attachment_name VARCHAR(255) NULL AFTER attachment_url"
    },
    {
      column: "attachment_type",
      sql: "ALTER TABLE booking_messages ADD COLUMN attachment_type VARCHAR(120) NULL AFTER attachment_name"
    }
  ];

  for (const item of changes) {
    const exists = await columnExists("booking_messages", item.column);
    if (!exists) {
      await db.query(item.sql);
    }
  }
}

async function ensureContactMessageColumns() {
  const changes = [
    {
      column: "user_id",
      sql: "ALTER TABLE contact_messages ADD COLUMN user_id INT NULL AFTER id"
    },
    {
      column: "user_role",
      sql: "ALTER TABLE contact_messages ADD COLUMN user_role ENUM('CUSTOMER','PARTNER') NULL AFTER user_id"
    }
  ];

  for (const item of changes) {
    const exists = await columnExists("contact_messages", item.column);
    if (!exists) {
      await db.query(item.sql);
    }
  }
}

async function ensureContactReplyTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS contact_message_replies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      contact_message_id INT NOT NULL,
      reply_text TEXT NOT NULL,
      replied_by ENUM('ADMIN') NOT NULL DEFAULT 'ADMIN',
      replied_by_email VARCHAR(150) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_contact_reply_message
        FOREIGN KEY (contact_message_id) REFERENCES contact_messages(id) ON DELETE CASCADE
    )
  `);
}

async function ensureBookingRatingColumns() {
  const changes = [
    {
      column: "customer_rating",
      sql: "ALTER TABLE service_bookings ADD COLUMN customer_rating TINYINT UNSIGNED NULL AFTER partner_note"
    },
    {
      column: "customer_review",
      sql: "ALTER TABLE service_bookings ADD COLUMN customer_review TEXT NULL AFTER customer_rating"
    },
    {
      column: "customer_rated_at",
      sql: "ALTER TABLE service_bookings ADD COLUMN customer_rated_at DATETIME NULL AFTER customer_review"
    }
  ];

  for (const item of changes) {
    const exists = await columnExists("service_bookings", item.column);
    if (!exists) {
      await db.query(item.sql);
    }
  }
}

async function ensureDynamicServiceCategoryColumns() {
  const partnerType = await getColumnType("partner_profiles", "technician_category");
  if (String(partnerType).toLowerCase().startsWith("enum(")) {
    await db.query("ALTER TABLE partner_profiles MODIFY COLUMN technician_category VARCHAR(80) NOT NULL");
  }

  const bookingType = await getColumnType("service_bookings", "category");
  if (String(bookingType).toLowerCase().startsWith("enum(")) {
    await db.query("ALTER TABLE service_bookings MODIFY COLUMN category VARCHAR(80) NOT NULL");
  }
}

async function syncSchema() {
  await ensureChatAttachmentColumns();
  await ensureContactMessageColumns();
  await ensureContactReplyTable();
  await ensureBookingRatingColumns();
  await ensureDynamicServiceCategoryColumns();
}

module.exports = { syncSchema };
