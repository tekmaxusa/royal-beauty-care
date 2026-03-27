<?php

declare(strict_types=1);

function chb_migrate_drop_booking_slot_unique_if_exists(PDO $pdo, string $dbName): void
{
    $st = $pdo->prepare(
        'SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = :s AND TABLE_NAME = \'bookings\' AND INDEX_NAME = \'uq_booking_slot\' LIMIT 1'
    );
    $st->execute([':s' => $dbName]);
    if ($st->fetchColumn()) {
        $pdo->exec('ALTER TABLE bookings DROP INDEX uq_booking_slot');
    }

    $st2 = $pdo->prepare(
        'SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = :s AND TABLE_NAME = \'bookings\' AND INDEX_NAME = \'idx_bookings_slot\' LIMIT 1'
    );
    $st2->execute([':s' => $dbName]);
    if (!$st2->fetchColumn()) {
        $pdo->exec('ALTER TABLE bookings ADD KEY idx_bookings_slot (booking_date, booking_time)');
    }
}

/**
 * Legacy DBs without guest booking columns: nullable user_id + guest_name/email/phone.
 * Replaces former sql/migrate_v3_guest_bookings.sql (idempotent when guest_name exists).
 */
function chb_migrate_guest_bookings_columns_if_needed(PDO $pdo, string $dbName): void
{
    $st = $pdo->prepare(
        'SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = :s AND TABLE_NAME = \'bookings\' AND COLUMN_NAME = \'guest_name\' LIMIT 1'
    );
    $st->execute([':s' => $dbName]);
    if ($st->fetchColumn()) {
        return;
    }

    $fk = $pdo->prepare(
        'SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = :s AND TABLE_NAME = \'bookings\' AND COLUMN_NAME = \'user_id\'
         AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1'
    );
    $fk->execute([':s' => $dbName]);
    $fkName = $fk->fetchColumn();
    if (is_string($fkName) && $fkName !== '') {
        $pdo->exec('ALTER TABLE bookings DROP FOREIGN KEY `' . str_replace('`', '``', $fkName) . '`');
    }

    $pdo->exec('ALTER TABLE bookings MODIFY user_id INT UNSIGNED NULL');
    $pdo->exec(
        'ALTER TABLE bookings
            ADD COLUMN guest_name VARCHAR(255) NULL AFTER user_id,
            ADD COLUMN guest_email VARCHAR(255) NULL AFTER guest_name,
            ADD COLUMN guest_phone VARCHAR(64) NULL AFTER guest_email'
    );
    $pdo->exec(
        'ALTER TABLE bookings ADD CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL'
    );
}

/**
 * First admin from .env when no admin exists (see ADMIN_NAME / ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD).
 */
function chb_ensure_admin_user_from_env(PDO $pdo): void
{
    $n = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
    if ($n > 0) {
        return;
    }

    $em = getenv('ADMIN_EMAIL');
    $pw = getenv('ADMIN_INITIAL_PASSWORD');
    if (!is_string($em) || trim($em) === '' || !is_string($pw) || $pw === '') {
        return;
    }

    $em = strtolower(trim($em));
    if (!filter_var($em, FILTER_VALIDATE_EMAIL)) {
        return;
    }

    $nameRaw = getenv('ADMIN_NAME');
    $nm = is_string($nameRaw) && trim($nameRaw) !== '' ? trim($nameRaw) : 'Admin';

    $hash = password_hash($pw, PASSWORD_DEFAULT);
    if ($hash === false) {
        return;
    }

    $ex = $pdo->prepare('SELECT id FROM users WHERE email = :e LIMIT 1');
    $ex->execute([':e' => $em]);
    $id = $ex->fetchColumn();
    if ($id !== false) {
        $u = $pdo->prepare('UPDATE users SET role = :r, password = :p, name = :n WHERE id = :id');
        $u->execute([':r' => 'admin', ':p' => $hash, ':n' => $nm, ':id' => (int) $id]);

        return;
    }

    $ins = $pdo->prepare(
        'INSERT INTO users (name, email, password, google_sub, role) VALUES (:n, :e, :p, NULL, :r)'
    );
    $ins->execute([':n' => $nm, ':e' => $em, ':p' => $hash, ':r' => 'admin']);
}

/**
 * Applies additive schema updates for DBs created before service/Google columns existed.
 * Safe to run on every request (no-op when already migrated).
 */
function db_ensure_schema(PDO $pdo): void
{
    static $done = false;
    if ($done) {
        return;
    }

    $dbName = $pdo->query('SELECT DATABASE()')->fetchColumn();
    if (!is_string($dbName) || $dbName === '') {
        $done = true;

        return;
    }

    $hasCol = static function (PDO $pdo, string $schema, string $table, string $column): bool {
        $st = $pdo->prepare(
            'SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = :s AND TABLE_NAME = :t AND COLUMN_NAME = :c LIMIT 1'
        );
        $st->execute([':s' => $schema, ':t' => $table, ':c' => $column]);

        return (bool) $st->fetchColumn();
    };

    if (!$hasCol($pdo, $dbName, 'bookings', 'service_category')) {
        $pdo->exec(
            "ALTER TABLE bookings ADD COLUMN service_category VARCHAR(64) NOT NULL DEFAULT '' AFTER user_id"
        );
    }
    if (!$hasCol($pdo, $dbName, 'bookings', 'service_name')) {
        $pdo->exec(
            "ALTER TABLE bookings ADD COLUMN service_name VARCHAR(255) NOT NULL DEFAULT '' AFTER service_category"
        );
    }

    chb_migrate_guest_bookings_columns_if_needed($pdo, $dbName);

    if (!$hasCol($pdo, $dbName, 'users', 'google_sub')) {
        $pdo->exec('ALTER TABLE users MODIFY password VARCHAR(255) NULL');
        $pdo->exec(
            'ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) NULL UNIQUE AFTER password'
        );
    }

    if (!$hasCol($pdo, $dbName, 'users', 'role')) {
        $pdo->exec(
            "ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'client' AFTER google_sub"
        );
        $pdo->exec('ALTER TABLE users ADD KEY idx_users_role (role)');
    }

    if (!$hasCol($pdo, $dbName, 'bookings', 'status')) {
        $pdo->exec(
            "ALTER TABLE bookings ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'confirmed' AFTER booking_time"
        );
        $pdo->exec('ALTER TABLE bookings ADD KEY idx_bookings_status (status)');
    }

    if (!$hasCol($pdo, $dbName, 'bookings', 'service_total_cents')) {
        $pdo->exec(
            "ALTER TABLE bookings ADD COLUMN service_total_cents INT UNSIGNED NOT NULL DEFAULT 0 AFTER status"
        );
    }
    if (!$hasCol($pdo, $dbName, 'bookings', 'deposit_due_cents')) {
        $pdo->exec(
            "ALTER TABLE bookings ADD COLUMN deposit_due_cents INT UNSIGNED NOT NULL DEFAULT 0 AFTER service_total_cents"
        );
    }
    if (!$hasCol($pdo, $dbName, 'bookings', 'deposit_paid_cents')) {
        $pdo->exec(
            "ALTER TABLE bookings ADD COLUMN deposit_paid_cents INT UNSIGNED NOT NULL DEFAULT 0 AFTER deposit_due_cents"
        );
    }
    if (!$hasCol($pdo, $dbName, 'bookings', 'deposit_refunded_cents')) {
        $pdo->exec(
            "ALTER TABLE bookings ADD COLUMN deposit_refunded_cents INT UNSIGNED NOT NULL DEFAULT 0 AFTER deposit_paid_cents"
        );
    }
    if (!$hasCol($pdo, $dbName, 'bookings', 'payment_status')) {
        $pdo->exec(
            "ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'none' AFTER deposit_refunded_cents"
        );
    }
    $stPayIdx = $pdo->prepare(
        'SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = :s AND TABLE_NAME = \'bookings\' AND INDEX_NAME = \'idx_bookings_payment_status\' LIMIT 1'
    );
    $stPayIdx->execute([':s' => $dbName]);
    if (!$stPayIdx->fetchColumn()) {
        $pdo->exec('ALTER TABLE bookings ADD KEY idx_bookings_payment_status (payment_status)');
    }

    chb_migrate_drop_booking_slot_unique_if_exists($pdo, $dbName);

    if ($hasCol($pdo, $dbName, 'bookings', 'service_name')) {
        $t = $pdo->prepare(
            'SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = :s AND TABLE_NAME = \'bookings\' AND COLUMN_NAME = \'service_name\''
        );
        $t->execute([':s' => $dbName]);
        $sn = $t->fetch();
        if ($sn && strtolower((string) $sn['DATA_TYPE']) === 'varchar') {
            $pdo->exec('ALTER TABLE bookings MODIFY service_name TEXT NOT NULL');
        }

        $u = $pdo->prepare(
            'SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = :s AND TABLE_NAME = \'bookings\' AND COLUMN_NAME = \'service_category\''
        );
        $u->execute([':s' => $dbName]);
        $len = $u->fetchColumn();
        if ($len !== false && (int) $len > 0 && (int) $len < 191) {
            $pdo->exec(
                "ALTER TABLE bookings MODIFY service_category VARCHAR(191) NOT NULL DEFAULT ''"
            );
        }
    }

    if ($hasCol($pdo, $dbName, 'users', 'role')) {
        chb_ensure_admin_user_from_env($pdo);
    }

    $hasTable = static function (PDO $pdo, string $schema, string $table): bool {
        $st = $pdo->prepare(
            'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = :s AND TABLE_NAME = :t LIMIT 1'
        );
        $st->execute([':s' => $schema, ':t' => $table]);

        return (bool) $st->fetchColumn();
    };

    if (!$hasTable($pdo, $dbName, 'password_resets')) {
        $pdo->exec(
            'CREATE TABLE password_resets (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id INT UNSIGNED NOT NULL,
                token_hash CHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_password_resets_user (user_id),
                KEY idx_password_resets_expires (expires_at),
                CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    if (!$hasTable($pdo, $dbName, 'booking_payments')) {
        $pdo->exec(
            'CREATE TABLE booking_payments (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                booking_id INT UNSIGNED NULL,
                orderid VARCHAR(80) NOT NULL,
                merchid VARCHAR(32) NOT NULL DEFAULT \'\',
                amount_cents INT UNSIGNED NOT NULL DEFAULT 0,
                currency VARCHAR(3) NOT NULL DEFAULT \'USD\',
                status VARCHAR(20) NOT NULL DEFAULT \'declined\',
                respstat VARCHAR(8) NOT NULL DEFAULT \'\',
                respcode VARCHAR(16) NOT NULL DEFAULT \'\',
                resptext VARCHAR(255) NOT NULL DEFAULT \'\',
                retref VARCHAR(32) NOT NULL DEFAULT \'\',
                account_last4 VARCHAR(8) NOT NULL DEFAULT \'\',
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    if (!$hasTable($pdo, $dbName, 'booking_refunds')) {
        $pdo->exec(
            'CREATE TABLE booking_refunds (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                booking_id INT UNSIGNED NOT NULL,
                reversal_kind VARCHAR(8) NOT NULL DEFAULT \'refund\',
                amount_cents INT UNSIGNED NOT NULL DEFAULT 0,
                orig_retref VARCHAR(32) NOT NULL DEFAULT \'\',
                retref VARCHAR(32) NOT NULL DEFAULT \'\',
                orderid VARCHAR(80) NOT NULL DEFAULT \'\',
                respstat VARCHAR(8) NOT NULL DEFAULT \'\',
                respcode VARCHAR(16) NOT NULL DEFAULT \'\',
                resptext VARCHAR(255) NOT NULL DEFAULT \'\',
                raw_response_json TEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_booking_refunds_booking (booking_id),
                CONSTRAINT fk_booking_refunds_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    if ($hasTable($pdo, $dbName, 'booking_refunds') && !$hasCol($pdo, $dbName, 'booking_refunds', 'reversal_kind')) {
        $pdo->exec(
            "ALTER TABLE booking_refunds ADD COLUMN reversal_kind VARCHAR(8) NOT NULL DEFAULT 'refund' AFTER booking_id"
        );
    }

    if (!$hasTable($pdo, $dbName, 'booking_idempotency')) {
        $pdo->exec(
            'CREATE TABLE booking_idempotency (
                idempotency_key VARCHAR(64) NOT NULL,
                state VARCHAR(16) NOT NULL DEFAULT \'processing\',
                http_code SMALLINT UNSIGNED NULL,
                response_json MEDIUMTEXT NULL,
                started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL DEFAULT NULL,
                PRIMARY KEY (idempotency_key),
                KEY idx_booking_idempotency_state_started (state, started_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    if (!$hasTable($pdo, $dbName, 'auth_refresh_tokens')) {
        $pdo->exec(
            'CREATE TABLE auth_refresh_tokens (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id INT UNSIGNED NOT NULL,
                token_hash CHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                revoked_at DATETIME NULL DEFAULT NULL,
                last_used_at DATETIME NULL DEFAULT NULL,
                user_agent VARCHAR(255) NOT NULL DEFAULT \'\',
                ip_addr VARCHAR(64) NOT NULL DEFAULT \'\',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_auth_refresh_tokens_hash (token_hash),
                KEY idx_auth_refresh_tokens_user (user_id),
                KEY idx_auth_refresh_tokens_exp_rev (expires_at, revoked_at),
                CONSTRAINT fk_auth_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    if ($hasCol($pdo, $dbName, 'bookings', 'status')) {
        $pdo->exec("UPDATE bookings SET status = 'confirmed' WHERE status = 'pending'");
    }

    $done = true;
}
