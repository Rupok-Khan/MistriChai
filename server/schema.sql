CREATE DATABASE IF NOT EXISTS technician_app;
USE technician_app;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('CUSTOMER','PARTNER','ADMIN') NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NULL UNIQUE,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_profile_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS site_settings (
  section_key VARCHAR(50) PRIMARY KEY,
  content_json LONGTEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partner_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  partner_code VARCHAR(10) NULL UNIQUE,
  first_name VARCHAR(60) NOT NULL,
  last_name VARCHAR(60) NOT NULL,
  nid_address TEXT NOT NULL,
  father_name VARCHAR(120) NOT NULL,
  mother_name VARCHAR(120) NOT NULL,
  nid_number VARCHAR(30) NOT NULL UNIQUE,
  profile_photo VARCHAR(255) NOT NULL,
  nid_front_photo VARCHAR(255) NOT NULL,
  nid_back_photo VARCHAR(255) NOT NULL,
  district VARCHAR(80) NOT NULL,
  thana VARCHAR(80) NOT NULL,
  ward_no VARCHAR(20) NOT NULL,
  city_corp_or_union VARCHAR(120) NOT NULL,
  technician_category VARCHAR(80) NOT NULL,
  working_start_time TIME NOT NULL,
  working_end_time TIME NOT NULL,
  experience_years INT NOT NULL DEFAULT 0,
  verification_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  availability_status ENUM('AVAILABLE','BUSY','OFFLINE') NOT NULL DEFAULT 'OFFLINE',
  rejection_reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_partner_profile_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS service_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(20) NOT NULL UNIQUE,
  customer_user_id INT NOT NULL,
  requested_partner_user_id INT NULL,
  assigned_partner_user_id INT NULL,
  category VARCHAR(80) NOT NULL,
  problem_summary TEXT NOT NULL,
  service_address TEXT NOT NULL,
  district VARCHAR(80) NOT NULL,
  thana VARCHAR(80) NOT NULL,
  ward_no VARCHAR(20) NULL,
  city_corp_or_union VARCHAR(120) NULL,
  preferred_date DATE NULL,
  preferred_time VARCHAR(50) NULL,
  booking_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  estimated_cash_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM(
    'PENDING_ASSIGNMENT',
    'WAITING_FOR_PARTNER',
    'ASSIGNED',
    'IN_PROGRESS',
    'COMPLETED',
    'REFUND_PENDING',
    'REFUNDED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
  admin_note TEXT NULL,
  customer_note TEXT NULL,
  partner_note TEXT NULL,
  customer_rating TINYINT UNSIGNED NULL,
  customer_review TEXT NULL,
  customer_rated_at DATETIME NULL,
  booked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  assigned_at DATETIME NULL,
  completed_at DATETIME NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_customer
    FOREIGN KEY (customer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_requested_partner
    FOREIGN KEY (requested_partner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_assigned_partner
    FOREIGN KEY (assigned_partner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS booking_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  sender_user_id INT NOT NULL,
  receiver_user_id INT NOT NULL,
  message_text TEXT NULL,
  attachment_url VARCHAR(255) NULL,
  attachment_name VARCHAR(255) NULL,
  attachment_type VARCHAR(120) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_message_booking
    FOREIGN KEY (booking_id) REFERENCES service_bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_sender
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_receiver
    FOREIGN KEY (receiver_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NULL,
  payer_user_id INT NULL,
  receiver_user_id INT NULL,
  transaction_type ENUM('BOOKING_FEE','SERVICE_CASH','REFUND','WITHDRAWAL') NOT NULL,
  payment_method ENUM('ONLINE','CASH','BANK','MOBILE_BANKING') NOT NULL DEFAULT 'ONLINE',
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING','PAID','REFUNDED','COMPLETED') NOT NULL DEFAULT 'PAID',
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_booking
    FOREIGN KEY (booking_id) REFERENCES service_bookings(id) ON DELETE SET NULL,
  CONSTRAINT fk_payment_payer
    FOREIGN KEY (payer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_payment_receiver
    FOREIGN KEY (receiver_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS partner_wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partner_user_id INT NOT NULL UNIQUE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallet_partner
    FOREIGN KEY (partner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partner_user_id INT NOT NULL,
  booking_id INT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type ENUM('CREDIT','DEBIT','WITHDRAW_REQUEST','WITHDRAW_PAID') NOT NULL,
  status ENUM('PENDING','COMPLETED','REJECTED') NOT NULL DEFAULT 'COMPLETED',
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallet_tx_partner
    FOREIGN KEY (partner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_wallet_tx_booking
    FOREIGN KEY (booking_id) REFERENCES service_bookings(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  user_role ENUM('CUSTOMER','PARTNER') NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contact_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS contact_message_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_message_id INT NOT NULL,
  reply_text TEXT NOT NULL,
  replied_by ENUM('ADMIN') NOT NULL DEFAULT 'ADMIN',
  replied_by_email VARCHAR(150) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contact_reply_message
    FOREIGN KEY (contact_message_id) REFERENCES contact_messages(id) ON DELETE CASCADE
);
