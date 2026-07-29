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

async function indexExists(tableName, indexName) {
  const [rows] = await db.query(`SHOW INDEX FROM ${tableName} WHERE Key_name = ?`, [indexName]);
  return rows.length > 0;
}

async function ensureManualBkashPaymentSchema() {
  const bookingStatusType = await getColumnType("service_bookings", "status");
  if (!String(bookingStatusType).includes("PAYMENT_PENDING")) {
    await db.query(`
      ALTER TABLE service_bookings MODIFY COLUMN status ENUM(
        'PAYMENT_PENDING','PENDING_ASSIGNMENT','WAITING_FOR_PARTNER','ASSIGNED',
        'IN_PROGRESS','COMPLETED','REFUND_PENDING','REFUNDED','CANCELLED'
      ) NOT NULL DEFAULT 'PAYMENT_PENDING'
    `);
  }

  if (!(await columnExists("payment_transactions", "transaction_reference"))) {
    await db.query(
      "ALTER TABLE payment_transactions ADD COLUMN transaction_reference VARCHAR(100) NULL AFTER payment_method"
    );
  }
  if (!(await indexExists("payment_transactions", "uq_payment_transaction_reference"))) {
    await db.query(
      "CREATE UNIQUE INDEX uq_payment_transaction_reference ON payment_transactions (transaction_reference)"
    );
  }
}

async function ensureBookingChangeRequestTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS booking_change_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      requester_user_id INT NOT NULL,
      request_type ENUM('CUSTOMER_CANCELLATION','PARTNER_REJECTION') NOT NULL,
      reason TEXT NOT NULL,
      proof_url VARCHAR(255) NULL,
      proof_name VARCHAR(255) NULL,
      proof_type VARCHAR(120) NULL,
      status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
      admin_note TEXT NULL,
      reviewed_by_email VARCHAR(150) NULL,
      reviewed_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_change_request_booking
        FOREIGN KEY (booking_id) REFERENCES service_bookings(id) ON DELETE CASCADE,
      CONSTRAINT fk_change_request_user
        FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
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

async function ensureWorkPaymentTable() {
  await db.query(`CREATE TABLE IF NOT EXISTS work_payments (
    id INT AUTO_INCREMENT PRIMARY KEY, booking_id INT NOT NULL UNIQUE,
    customer_user_id INT NOT NULL, partner_user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL, bkash_trx_id VARCHAR(100) NULL UNIQUE,
    status ENUM('AWAITING_CUSTOMER','PENDING','PAID') NOT NULL DEFAULT 'AWAITING_CUSTOMER',
    submitted_at DATETIME NULL, approved_at DATETIME NULL, approved_by_email VARCHAR(150) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES service_bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (partner_user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
}

async function ensurePartnerSocialColumns() {
  for (const column of ["facebook_url", "instagram_url", "linkedin_url", "whatsapp_url"]) {
    if (!(await columnExists("partner_profiles", column))) {
      await db.query(`ALTER TABLE partner_profiles ADD COLUMN ${column} VARCHAR(255) NULL AFTER experience_years`);
    }
  }
}

async function ensurePartnerPayoutSchema() {
  await db.query(`CREATE TABLE IF NOT EXISTS partner_payout_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partner_user_id INT NOT NULL UNIQUE,
    method ENUM('BKASH','NAGAD','ROCKET','BANK') NOT NULL,
    account_name VARCHAR(120) NOT NULL,
    account_number VARCHAR(80) NOT NULL,
    bank_name VARCHAR(120) NULL,
    branch_name VARCHAR(120) NULL,
    routing_number VARCHAR(50) NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  const columns = [
    ["payout_method", "ENUM('BKASH','NAGAD','ROCKET','BANK') NULL"],
    ["payout_account_name", "VARCHAR(120) NULL"],
    ["payout_account_number", "VARCHAR(80) NULL"],
    ["payout_bank_name", "VARCHAR(120) NULL"],
    ["payout_branch_name", "VARCHAR(120) NULL"],
    ["payout_routing_number", "VARCHAR(50) NULL"]
  ];
  for (const [column, definition] of columns) {
    if (!(await columnExists("wallet_transactions", column))) {
      await db.query(`ALTER TABLE wallet_transactions ADD COLUMN ${column} ${definition}`);
    }
  }
}

async function ensurePartnerChangeAndQuoteApprovalSchema() {
  const requestType = await getColumnType("booking_change_requests", "request_type");
  if (!String(requestType).includes("CUSTOMER_PARTNER_CHANGE")) {
    await db.query("ALTER TABLE booking_change_requests MODIFY COLUMN request_type ENUM('CUSTOMER_CANCELLATION','CUSTOMER_PARTNER_CHANGE','PARTNER_REJECTION') NOT NULL");
  }
  const paymentStatus = await getColumnType("work_payments", "status");
  if (!String(paymentStatus).includes("CUSTOMER_APPROVED")) {
    await db.query("ALTER TABLE work_payments MODIFY COLUMN status ENUM('PROPOSED','CUSTOMER_APPROVED','ADMIN_APPROVED','AWAITING_CUSTOMER','PENDING','PAID') NOT NULL DEFAULT 'PROPOSED'");
    await db.query("UPDATE work_payments SET status='PROPOSED' WHERE status='AWAITING_CUSTOMER'");
  }
  await db.query("UPDATE work_payments SET status='ADMIN_APPROVED' WHERE status='CUSTOMER_APPROVED'");
}

async function ensureReliabilitySchema() {
  await db.query(`CREATE TABLE IF NOT EXISTS idempotency_keys (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, idempotency_key VARCHAR(120) NOT NULL,
    scope VARCHAR(120) NOT NULL, entity_id VARCHAR(80) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_idempotency_scope (idempotency_key, scope)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, actor_user_id INT NULL, actor_role VARCHAR(20) NULL,
    action VARCHAR(80) NOT NULL, entity_type VARCHAR(50) NOT NULL, entity_id VARCHAR(80) NULL,
    before_json LONGTEXT NULL, after_json LONGTEXT NULL, request_id VARCHAR(100) NULL,
    ip_address VARCHAR(64) NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_entity (entity_type, entity_id), INDEX idx_audit_actor (actor_user_id, created_at), INDEX idx_audit_created (created_at)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS platform_commissions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, booking_id INT NOT NULL UNIQUE,
    gross_amount DECIMAL(10,2) NOT NULL, commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0400,
    commission_amount DECIMAL(10,2) NOT NULL, partner_amount DECIMAL(10,2) NOT NULL,
    status ENUM('EARNED','REFUNDED') NOT NULL DEFAULT 'EARNED', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES service_bookings(id) ON DELETE CASCADE,
    INDEX idx_commission_status (status, created_at)
  )`);
  const indexes = [
    ["service_bookings", "idx_bookings_customer_status", "(customer_user_id, status, booked_at)"],
    ["service_bookings", "idx_bookings_partner_status", "(assigned_partner_user_id, status, assigned_at)"],
    ["service_bookings", "idx_bookings_status_created", "(status, booked_at)"],
    ["payment_transactions", "idx_payments_booking_type", "(booking_id, transaction_type, status)"],
    ["booking_messages", "idx_messages_booking_created", "(booking_id, created_at, id)"],
    ["wallet_transactions", "idx_wallet_partner_status", "(partner_user_id, transaction_type, status, created_at)"],
    ["booking_change_requests", "idx_change_requests_status", "(status, created_at)"]
  ];
  for (const [table, name, columns] of indexes) {
    if (!(await indexExists(table, name))) await db.query(`CREATE INDEX ${name} ON ${table} ${columns}`);
  }
}

async function syncSchema() {
  await db.query(`CREATE TABLE IF NOT EXISTS customer_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY, customer_user_id INT NOT NULL,
    plan_code ENUM('ONE_MONTH','SIX_MONTHS','ONE_YEAR') NOT NULL, amount DECIMAL(10,2) NOT NULL,
    starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME NOT NULL,
    status ENUM('ACTIVE','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    transaction_reference VARCHAR(100) NOT NULL UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  const subscriptionType = await getColumnType("customer_subscriptions", "plan_code");
  if (!String(subscriptionType).includes("ONE_MONTH")) await db.query("ALTER TABLE customer_subscriptions MODIFY COLUMN plan_code ENUM('ONE_MONTH','SIX_MONTHS','ONE_YEAR') NOT NULL");
  await ensureWorkPaymentTable();
  await ensureChatAttachmentColumns();
  await ensureContactMessageColumns();
  await ensureContactReplyTable();
  await ensureBookingRatingColumns();
  await ensureManualBkashPaymentSchema();
  await ensureBookingChangeRequestTable();
  await ensureDynamicServiceCategoryColumns();
  await ensurePartnerSocialColumns();
  await ensurePartnerPayoutSchema();
  await ensurePartnerChangeAndQuoteApprovalSchema();
  await ensureReliabilitySchema();
}

module.exports = { syncSchema };
