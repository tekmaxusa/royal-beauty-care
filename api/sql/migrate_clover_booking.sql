-- Optional manual migration (usually applied automatically via db_ensure_schema on API boot).
-- Clover deposits + POS order linkage.

ALTER TABLE bookings
    ADD COLUMN clover_order_id VARCHAR(64) NULL DEFAULT NULL AFTER payment_status,
    ADD COLUMN clover_sync_error VARCHAR(512) NULL DEFAULT NULL AFTER clover_order_id,
    ADD COLUMN clover_synced_at DATETIME NULL DEFAULT NULL AFTER clover_sync_error;

ALTER TABLE booking_payments
    ADD COLUMN payment_gateway VARCHAR(20) NOT NULL DEFAULT 'cardconnect' AFTER merchid;

ALTER TABLE booking_payments MODIFY retref VARCHAR(80) NOT NULL DEFAULT '';
