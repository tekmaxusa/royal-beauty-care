<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/booking_services.php';

const CHB_BOOKING_PENDING = 'pending';
const CHB_BOOKING_CONFIRMED = 'confirmed';
const CHB_BOOKING_CANCELLED = 'cancelled';

function chb_booking_blocks_slot(string $status): bool
{
    return $status === CHB_BOOKING_PENDING || $status === CHB_BOOKING_CONFIRMED;
}

/**
 * Slot state for booking UI: past (unbookable), booked (taken), or available.
 */
function booking_time_slot_state(string $dateYmd, string $timeHi): string
{
    if (!slot_is_bookable_relative_now($dateYmd, $timeHi)) {
        return 'past';
    }
    if (is_slot_taken($dateYmd, $timeHi)) {
        return 'booked';
    }

    return 'available';
}

/**
 * Dates in the next N days that still have at least one future bookable slot (may be fully taken — still listed).
 *
 * @return list<string> Y-m-d
 */
function booking_calendar_dates(int $daysAhead = 90): array
{
    $out = [];
    $start = new DateTimeImmutable('today');
    for ($i = 0; $i < $daysAhead; $i++) {
        $d = $start->modify('+' . $i . ' days')->format('Y-m-d');
        foreach (booking_time_options() as $opt) {
            if (slot_is_bookable_relative_now($d, $opt)) {
                $out[] = $d;
                break;
            }
        }
    }

    return $out;
}

function booking_slot_is_available_for_request(string $dateYmd, string $timeHi): bool
{
    return booking_time_slot_state($dateYmd, $timeHi) === 'available';
}

/**
 * @return list<array{id:int,service_category:string,service_name:string,booking_date:string,booking_time:string,status:string,service_total_cents:int,deposit_due_cents:int,deposit_paid_cents:int,deposit_refunded_cents:int,payment_status:string,created_at:string}>
 */
function fetch_bookings_for_user(int $userId): array
{
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT id, service_category, service_name, booking_date, booking_time, status,
                service_total_cents, deposit_due_cents, deposit_paid_cents, deposit_refunded_cents, payment_status, created_at
         FROM bookings WHERE user_id = :uid ORDER BY booking_date ASC, booking_time ASC'
    );
    $stmt->execute([':uid' => $userId]);

    return $stmt->fetchAll();
}

/**
 * Link prior guest bookings (user_id NULL) to this account when guest_email matches (case-insensitive).
 *
 * @return int Number of rows updated
 */
function chb_attach_guest_bookings_to_user(int $userId, string $email): int
{
    $emailNorm = strtolower(trim($email));
    if ($userId <= 0 || $emailNorm === '' || !filter_var($emailNorm, FILTER_VALIDATE_EMAIL)) {
        return 0;
    }
    $pdo = db();
    $stmt = $pdo->prepare(
        'UPDATE bookings SET user_id = :uid
         WHERE user_id IS NULL AND LOWER(TRIM(guest_email)) = :em'
    );
    $stmt->execute([':uid' => $userId, ':em' => $emailNorm]);

    return $stmt->rowCount();
}

/**
 * @return list<array{id:int,user_id:int,client_name:string,client_email:string,service_category:string,service_name:string,booking_date:string,booking_time:string,status:string,service_total_cents:int,deposit_due_cents:int,deposit_paid_cents:int,deposit_refunded_cents:int,payment_status:string,created_at:string}>
 */
function fetch_all_bookings_for_admin(): array
{
    $pdo = db();
    try {
        $stmt = $pdo->query(
            'SELECT b.id, b.user_id, COALESCE(u.name, b.guest_name) AS client_name, COALESCE(u.email, b.guest_email) AS client_email,
                    b.service_category, b.service_name, b.booking_date, b.booking_time, b.status,
                    b.service_total_cents, b.deposit_due_cents, b.deposit_paid_cents, b.deposit_refunded_cents, b.payment_status, b.created_at
             FROM bookings b
             LEFT JOIN users u ON u.id = b.user_id
             ORDER BY b.booking_date DESC, b.booking_time DESC, b.id DESC'
        );

        return $stmt->fetchAll();
    } catch (PDOException $e) {
        // Legacy schema fallback: guest_* and/or deposit_refunded_cents may not exist yet.
        $stmt = $pdo->query(
            "SELECT b.id, b.user_id, u.name AS client_name, u.email AS client_email,
                    b.service_category, b.service_name, b.booking_date, b.booking_time, b.status,
                    b.service_total_cents, b.deposit_due_cents, b.deposit_paid_cents,
                    0 AS deposit_refunded_cents,
                    COALESCE(b.payment_status, 'none') AS payment_status, b.created_at
             FROM bookings b
             LEFT JOIN users u ON u.id = b.user_id
             ORDER BY b.booking_date DESC, b.booking_time DESC, b.id DESC"
        );

        return $stmt->fetchAll();
    }
}

/**
 * @return array<string,mixed>|null
 */
function fetch_booking_by_id(int $bookingId): ?array
{
    $pdo = db();
    try {
        $stmt = $pdo->prepare(
            'SELECT b.id, b.user_id, COALESCE(u.name, b.guest_name) AS client_name, COALESCE(u.email, b.guest_email) AS client_email,
                    b.guest_phone, b.service_category, b.service_name, b.booking_date, b.booking_time, b.status,
                    b.service_total_cents, b.deposit_due_cents, b.deposit_paid_cents, b.deposit_refunded_cents, b.payment_status, b.created_at
             FROM bookings b
             LEFT JOIN users u ON u.id = b.user_id
             WHERE b.id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $bookingId]);
        $row = $stmt->fetch();

        return $row ?: null;
    } catch (PDOException $e) {
        // Legacy schema fallback.
        $stmt = $pdo->prepare(
            "SELECT b.id, b.user_id, u.name AS client_name, u.email AS client_email,
                    '' AS guest_phone, b.service_category, b.service_name, b.booking_date, b.booking_time, b.status,
                    b.service_total_cents, b.deposit_due_cents, b.deposit_paid_cents,
                    0 AS deposit_refunded_cents, COALESCE(b.payment_status, 'none') AS payment_status, b.created_at
             FROM bookings b
             LEFT JOIN users u ON u.id = b.user_id
             WHERE b.id = :id LIMIT 1"
        );
        $stmt->execute([':id' => $bookingId]);
        $row = $stmt->fetch();

        return $row ?: null;
    }
}

function is_slot_taken(string $dateYmd, string $timeHi): bool
{
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT 1 FROM bookings
         WHERE booking_date = :d AND booking_time = :t
           AND (status = :st1 OR status = :st2)
         LIMIT 1'
    );
    $stmt->execute([
        ':d' => $dateYmd,
        ':t' => $timeHi . ':00',
        ':st1' => CHB_BOOKING_PENDING,
        ':st2' => CHB_BOOKING_CONFIRMED,
    ]);

    return (bool) $stmt->fetchColumn();
}

function slot_is_bookable_relative_now(string $dateYmd, string $timeHi): bool
{
    $today = (new DateTimeImmutable('today'))->format('Y-m-d');
    if ($dateYmd > $today) {
        return true;
    }
    if ($dateYmd < $today) {
        return false;
    }
    $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $dateYmd . ' ' . $timeHi . ':00');
    if (!$dt || $dt->format('Y-m-d H:i:s') !== $dateYmd . ' ' . $timeHi . ':00') {
        return false;
    }

    return $dt > new DateTimeImmutable('now');
}

function count_available_slots_for_date(string $dateYmd): int
{
    $n = 0;
    foreach (booking_time_options() as $opt) {
        if (!is_slot_taken($dateYmd, $opt) && slot_is_bookable_relative_now($dateYmd, $opt)) {
            $n++;
        }
    }

    return $n;
}

function date_is_fully_blocked(string $dateYmd): bool
{
    return count_available_slots_for_date($dateYmd) === 0;
}

/**
 * @return list<string> Y-m-d for days with at least one bookable free slot
 */
function booking_available_dates(int $daysAhead = 90): array
{
    $out = [];
    $start = new DateTimeImmutable('today');
    for ($i = 0; $i < $daysAhead; $i++) {
        $d = $start->modify('+' . $i . ' days')->format('Y-m-d');
        if (!date_is_fully_blocked($d)) {
            $out[] = $d;
        }
    }

    return $out;
}

/**
 * @param list<array{category:string,service:string}> $serviceLines validated lines (display names)
 * @param int|null $userId Logged-in client id, or null for a guest booking
 * @return array{ok: bool, error?: string}
 */
function create_booking(
    ?int $userId,
    string $dateYmd,
    string $timeHi,
    array $serviceLines,
    ?string $guestName = null,
    ?string $guestEmail = null,
    ?string $guestPhone = null,
    int $serviceTotalCents = 0,
    int $depositDueCents = 0,
    int $depositPaidCents = 0,
    string $paymentStatus = 'none'
): array {
    $serviceTotalCents = max(0, $serviceTotalCents);
    $depositDueCents = max(0, $depositDueCents);
    $depositPaidCents = max(0, $depositPaidCents);
    $paymentStatus = trim($paymentStatus) === '' ? 'none' : trim($paymentStatus);

    $uid = $userId !== null && $userId > 0 ? $userId : null;
    $gName = null;
    $gEmail = null;
    $gPhone = null;
    if ($uid === null) {
        $gName = trim((string) $guestName);
        $gEmail = trim((string) $guestEmail);
        $gPhone = trim((string) $guestPhone);
        if ($gName === '' || $gEmail === '') {
            return ['ok' => false, 'error' => 'Please provide your name and email.'];
        }
        if (!filter_var($gEmail, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'error' => 'Invalid email address.'];
        }
        if (strlen($gName) > 250) {
            return ['ok' => false, 'error' => 'Name is too long.'];
        }
        if ($gPhone !== '' && strlen($gPhone) > 60) {
            return ['ok' => false, 'error' => 'Phone number is too long.'];
        }
    }

    if ($serviceLines === []) {
        return ['ok' => false, 'error' => 'Please select at least one service.'];
    }

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateYmd)) {
        return ['ok' => false, 'error' => 'Invalid date.'];
    }

    if (!preg_match('/^\d{2}:\d{2}$/', $timeHi)) {
        return ['ok' => false, 'error' => 'Invalid time.'];
    }

    $labels = [];
    $detailParts = [];
    foreach ($serviceLines as $line) {
        $cat = trim((string) ($line['category'] ?? ''));
        $svc = trim((string) ($line['service'] ?? ''));
        if ($cat === '' || $svc === '') {
            return ['ok' => false, 'error' => 'Invalid service data.'];
        }
        $labels[$cat] = true;
        $detailParts[] = $cat . ' — ' . $svc;
    }

    $categoryKeys = array_keys($labels);
    $service_category = count($categoryKeys) === 1
        ? $categoryKeys[0]
        : implode(' + ', $categoryKeys);
    if (function_exists('mb_strlen') && mb_strlen($service_category) > 190) {
        $service_category = mb_substr($service_category, 0, 187) . '…';
    } elseif (strlen($service_category) > 190) {
        $service_category = substr($service_category, 0, 187) . '…';
    }

    $service_name = implode(' · ', $detailParts);

    $today = new DateTimeImmutable('today');
    $picked = DateTimeImmutable::createFromFormat('Y-m-d', $dateYmd);
    if (!$picked || $picked->format('Y-m-d') !== $dateYmd) {
        return ['ok' => false, 'error' => 'Invalid date.'];
    }
    if ($picked < $today) {
        return ['ok' => false, 'error' => 'Cannot book a date in the past.'];
    }

    if (date_is_fully_blocked($dateYmd)) {
        return ['ok' => false, 'error' => 'That date has no open slots.'];
    }

    $timeNorm = $timeHi . ':00';
    $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $dateYmd . ' ' . $timeNorm);
    if (!$dt || $dt->format('Y-m-d H:i:s') !== $dateYmd . ' ' . $timeNorm) {
        return ['ok' => false, 'error' => 'Invalid time.'];
    }
    if (!slot_is_bookable_relative_now($dateYmd, $timeHi)) {
        return ['ok' => false, 'error' => 'Cannot book a time in the past.'];
    }

    if (is_slot_taken($dateYmd, $timeHi)) {
        return ['ok' => false, 'error' => 'That time slot is already booked.'];
    }

    $pdo = db();
    $stmt = $pdo->prepare(
        'INSERT INTO bookings (user_id, guest_name, guest_email, guest_phone, service_category, service_name, booking_date, booking_time, status, service_total_cents, deposit_due_cents, deposit_paid_cents, payment_status)
         VALUES (:uid, :gn, :ge, :gp, :sc, :sn, :d, :t, :st, :tot, :dd, :dp, :ps)'
    );
    try {
        $stmt->execute([
            ':uid' => $uid,
            ':gn' => $gName,
            ':ge' => $gEmail,
            ':gp' => $gPhone !== '' ? $gPhone : null,
            ':sc' => $service_category,
            ':sn' => $service_name,
            ':d' => $dateYmd,
            ':t' => $timeNorm,
            ':st' => CHB_BOOKING_CONFIRMED,
            ':tot' => $serviceTotalCents,
            ':dd' => $depositDueCents,
            ':dp' => $depositPaidCents,
            ':ps' => $paymentStatus,
        ]);
    } catch (PDOException $e) {
        if ((int) $e->errorInfo[1] === 1062) {
            return ['ok' => false, 'error' => 'That time slot was just taken. Please pick another.'];
        }
        throw $e;
    }

    $newId = (int) $pdo->lastInsertId();

    return ['ok' => true, 'booking_id' => $newId];
}

/**
 * Admin sets booking status. Sends client email when moving to confirmed or cancelled.
 *
 * @return array{ok: bool, error?: string, old_status?: string, new_status?: string}
 */
function admin_set_booking_status(int $bookingId, string $newStatus): array
{
    if ($newStatus !== CHB_BOOKING_CANCELLED) {
        return ['ok' => false, 'error' => 'Appointments are confirmed when booked. Merchants can only cancel.'];
    }

    $row = fetch_booking_by_id($bookingId);
    if (!$row) {
        return ['ok' => false, 'error' => 'Booking not found.'];
    }

    $old = (string) $row['status'];
    if ($old === $newStatus) {
        return ['ok' => true, 'old_status' => $old, 'new_status' => $newStatus];
    }

    if ($old === CHB_BOOKING_CANCELLED) {
        return ['ok' => false, 'error' => 'This booking is already cancelled.'];
    }

    if ($old !== CHB_BOOKING_PENDING && $old !== CHB_BOOKING_CONFIRMED) {
        return ['ok' => false, 'error' => 'This booking cannot be cancelled.'];
    }

    $pdo = db();
    $stmt = $pdo->prepare('UPDATE bookings SET status = :st WHERE id = :id AND status = :old');
    $stmt->execute([':st' => $newStatus, ':id' => $bookingId, ':old' => $old]);
    if ($stmt->rowCount() === 0) {
        return ['ok' => false, 'error' => 'Could not update booking (it may have changed).'];
    }

    return ['ok' => true, 'old_status' => $old, 'new_status' => $newStatus];
}

/**
 * Permanently remove bookings (admin only). Does not send client emails.
 *
 * @param list<int> $ids
 * @return array{ok: bool, error?: string, deleted?: int}
 */
function admin_delete_bookings(array $ids): array
{
    $clean = [];
    foreach ($ids as $x) {
        $id = (int) $x;
        if ($id > 0) {
            $clean[$id] = true;
        }
    }
    $idList = array_keys($clean);
    if ($idList === []) {
        return ['ok' => false, 'error' => 'No bookings selected.'];
    }
    if (count($idList) > 500) {
        return ['ok' => false, 'error' => 'Too many bookings in one request.'];
    }
    sort($idList, SORT_NUMERIC);

    $pdo = db();
    $placeholders = implode(',', array_fill(0, count($idList), '?'));
    $stmt = $pdo->prepare('DELETE FROM bookings WHERE id IN (' . $placeholders . ')');
    $stmt->execute($idList);

    return ['ok' => true, 'deleted' => $stmt->rowCount()];
}

/**
 * @return list<string> HH:MM options (30-minute steps, business hours)
 */
function booking_time_options(): array
{
    $out = [];
    for ($h = 9; $h <= 17; $h++) {
        foreach (['00', '30'] as $m) {
            if ($h === 17 && $m === '30') {
                break;
            }
            $out[] = sprintf('%02d:%s', $h, $m);
        }
    }

    return $out;
}

function chb_booking_services_summary(array $bookingRow): string
{
    $cat = trim((string) ($bookingRow['service_category'] ?? ''));
    $name = trim((string) ($bookingRow['service_name'] ?? ''));
    if ($cat !== '' && $name !== '') {
        return trim($cat . ' — ' . $name, ' —');
    }

    return $name !== '' ? $name : $cat;
}
