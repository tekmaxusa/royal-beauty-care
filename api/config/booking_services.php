<?php

declare(strict_types=1);

/**
 * Service catalog (aligned with the booking UI).
 *
 * @return list<array{id:string,name:string,services:list<array{name:string,price:string}>}>
 */
function booking_service_categories(): array
{
    return [
        [
            'id' => 'cut',
            'name' => 'Cut',
            'services' => [
                ['name' => 'Women', 'price' => '$35+'],
                ['name' => 'Men', 'price' => '$25+'],
                ['name' => 'Kids', 'price' => '$25+'],
            ],
        ],
        [
            'id' => 'color',
            'name' => 'Color',
            'services' => [
                ['name' => 'Root', 'price' => '$80+'],
                ['name' => 'Manicure', 'price' => '$80+'],
                ['name' => 'Highlight (F)', 'price' => '$200+'],
                ['name' => 'Highlight (M)', 'price' => '$150+'],
            ],
        ],
        [
            'id' => 'perm',
            'name' => 'Perm',
            'services' => [
                ['name' => "Men's Iron Perm", 'price' => '$130+'],
                ['name' => "Basic Women's Perm", 'price' => '$100+'],
                ['name' => 'Set / Digital', 'price' => '$200+'],
                ['name' => 'Magic Setting', 'price' => '$250+'],
                ['name' => 'Japanese Magic Straight', 'price' => '$230+'],
            ],
        ],
        [
            'id' => 'style',
            'name' => 'Style',
            'services' => [
                ['name' => 'Shampoo', 'price' => '$20+'],
                ['name' => 'Blow Dry', 'price' => '$35+'],
                ['name' => 'Upstyle', 'price' => '$130+'],
                ['name' => 'Makeup', 'price' => '$150+'],
            ],
        ],
    ];
}

/**
 * @return array{ok: bool, category?: string, service?: string, error?: string}
 */
function booking_validate_service_pick(string $categoryId, string $serviceName): array
{
    $categoryId = trim($categoryId);
    $serviceName = trim($serviceName);
    if ($categoryId === '' || $serviceName === '') {
        return ['ok' => false, 'error' => 'Please choose a service.'];
    }

    foreach (booking_service_categories() as $cat) {
        if ($cat['id'] !== $categoryId) {
            continue;
        }
        foreach ($cat['services'] as $svc) {
            if ($svc['name'] === $serviceName) {
                return ['ok' => true, 'category' => $cat['name'], 'service' => $serviceName];
            }
        }
    }

    return ['ok' => false, 'error' => 'Invalid service selection.'];
}

/**
 * @param mixed $picks POST services[] (list of "categoryId|serviceName")
 * @return array{ok: bool, lines?: list<array{category:string,service:string}>, error?: string}
 */
function booking_validate_service_picks($picks): array
{
    if (!is_array($picks)) {
        return ['ok' => false, 'error' => 'Please select at least one service.'];
    }

    $flat = [];
    foreach ($picks as $p) {
        if (is_string($p) && $p !== '') {
            $flat[] = trim($p);
        }
    }

    if ($flat === []) {
        return ['ok' => false, 'error' => 'Please select at least one service.'];
    }

    $lines = [];
    $seen = [];

    foreach ($flat as $pick) {
        $parts = explode('|', $pick, 2);
        if (count($parts) < 2) {
            return ['ok' => false, 'error' => 'Invalid service selection.'];
        }
        $v = booking_validate_service_pick($parts[0], $parts[1]);
        if (!$v['ok']) {
            return ['ok' => false, 'error' => $v['error'] ?? 'Invalid service.'];
        }
        $cat = (string) ($v['category'] ?? '');
        $svc = (string) ($v['service'] ?? '');
        $key = strtolower($parts[0]) . '|' . strtolower($svc);
        if (isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;
        $lines[] = ['category' => $cat, 'service' => $svc];
    }

    if ($lines === []) {
        return ['ok' => false, 'error' => 'Please select at least one service.'];
    }

    if (count($lines) > 1) {
        return ['ok' => false, 'error' => 'Please choose only one service per appointment (one time slot).'];
    }

    return ['ok' => true, 'lines' => $lines];
}

/**
 * Parse display price strings like "$35+" into cents (3500).
 */
function booking_parse_price_to_cents(string $price): int
{
    $clean = preg_replace('/[^0-9.]/', '', $price);
    if (!is_string($clean) || $clean === '') {
        return 0;
    }
    $value = (float) $clean;

    return (int) round($value * 100);
}

/**
 * Lookup base service price in cents by category id and service name.
 * Returns 0 when no catalog price is found.
 */
function booking_service_price_cents(string $categoryId, string $serviceName): int
{
    $categoryId = trim($categoryId);
    $serviceName = trim($serviceName);
    if ($categoryId === '' || $serviceName === '') {
        return 0;
    }

    foreach (booking_service_categories() as $cat) {
        if ((string) ($cat['id'] ?? '') !== $categoryId) {
            continue;
        }
        foreach ((array) ($cat['services'] ?? []) as $svc) {
            if ((string) ($svc['name'] ?? '') === $serviceName) {
                return booking_parse_price_to_cents((string) ($svc['price'] ?? ''));
            }
        }
    }

    return 0;
}

/**
 * @param list<string> $picks list of "categoryId|serviceName"
 */
function booking_total_price_cents_from_picks(array $picks): int
{
    $total = 0;
    foreach ($picks as $pick) {
        if (!is_string($pick) || $pick === '') {
            continue;
        }
        $parts = explode('|', $pick, 2);
        if (count($parts) < 2) {
            continue;
        }
        $total += booking_service_price_cents((string) $parts[0], (string) $parts[1]);
    }

    return max(0, $total);
}

function booking_deposit_due_cents(int $serviceTotalCents): int
{
    if ($serviceTotalCents <= 0) {
        return 0;
    }

    // 20% deposit, rounded to nearest cent.
    return (int) round($serviceTotalCents * 0.2);
}
