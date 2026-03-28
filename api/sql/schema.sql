-- Royal Beauty Care — initial schema (runs on first MySQL container start)

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NULL,
    google_sub VARCHAR(255) NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'client',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_google_sub (google_sub),
    KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NULL,
    guest_name VARCHAR(255) NULL,
    guest_email VARCHAR(255) NULL,
    guest_phone VARCHAR(64) NULL,
    service_category VARCHAR(191) NOT NULL DEFAULT '',
    service_name TEXT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    service_total_cents INT UNSIGNED NOT NULL DEFAULT 0,
    deposit_due_cents INT UNSIGNED NOT NULL DEFAULT 0,
    deposit_paid_cents INT UNSIGNED NOT NULL DEFAULT 0,
    deposit_refunded_cents INT UNSIGNED NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'none',
    clover_order_id VARCHAR(64) NULL DEFAULT NULL,
    clover_sync_error VARCHAR(512) NULL DEFAULT NULL,
    clover_synced_at DATETIME NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_bookings_slot (booking_date, booking_time),
    KEY idx_bookings_status (status),
    KEY idx_bookings_payment_status (payment_status),
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    booking_id INT UNSIGNED NULL,
    orderid VARCHAR(80) NOT NULL,
    merchid VARCHAR(32) NOT NULL DEFAULT '',
    payment_gateway VARCHAR(20) NOT NULL DEFAULT 'cardconnect',
    amount_cents INT UNSIGNED NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'declined',
    respstat VARCHAR(8) NOT NULL DEFAULT '',
    respcode VARCHAR(16) NOT NULL DEFAULT '',
    resptext VARCHAR(255) NOT NULL DEFAULT '',
    retref VARCHAR(80) NOT NULL DEFAULT '',
    account_last4 VARCHAR(8) NOT NULL DEFAULT '',
    booking_date DATE NULL,
    booking_time TIME NULL,
    raw_response_json TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_booking_payments_orderid (orderid),
    KEY idx_booking_payments_booking (booking_id),
    KEY idx_booking_payments_retref (retref),
    KEY idx_booking_payments_status (status),
    CONSTRAINT fk_booking_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_refunds (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    booking_id INT UNSIGNED NOT NULL,
    reversal_kind VARCHAR(8) NOT NULL DEFAULT 'refund',
    amount_cents INT UNSIGNED NOT NULL DEFAULT 0,
    orig_retref VARCHAR(32) NOT NULL DEFAULT '',
    retref VARCHAR(32) NOT NULL DEFAULT '',
    orderid VARCHAR(80) NOT NULL DEFAULT '',
    respstat VARCHAR(8) NOT NULL DEFAULT '',
    respcode VARCHAR(16) NOT NULL DEFAULT '',
    resptext VARCHAR(255) NOT NULL DEFAULT '',
    raw_response_json TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_booking_refunds_booking (booking_id),
    CONSTRAINT fk_booking_refunds_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_idempotency (
    idempotency_key VARCHAR(64) NOT NULL,
    state VARCHAR(16) NOT NULL DEFAULT 'processing',
    http_code SMALLINT UNSIGNED NULL,
    response_json MEDIUMTEXT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (idempotency_key),
    KEY idx_booking_idempotency_state_started (state, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_password_resets_user (user_id),
    KEY idx_password_resets_expires (expires_at),
    CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
