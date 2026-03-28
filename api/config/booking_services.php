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
            'id' => 'skin-care',
            'name' => 'Skin Care',
            'services' => [
                ['name' => 'Basic Facial Cleaning', 'price' => '$95.00 (45-60 Mins)'],
                ['name' => 'Deep Facial Cleaning', 'price' => '$120.00 (60-75 Mins)'],
                ['name' => 'Hydrating Facial with Vitamin C', 'price' => '$120.00 (60 Mins)'],
                ['name' => 'Shahanaz Gold Facial', 'price' => '$125.00 (60-75 Mins)'],
                ['name' => 'Shahanaz Diamond Facial', 'price' => '$125.00 (60-75 Mins)'],
                ['name' => 'Microdermabrasion Exfoliation', 'price' => '$135.00 (45-60 Mins)'],
                ['name' => 'Acne, Facial Extraction & Exfoliating', 'price' => '$145.00 (75 Mins)'],
                ['name' => 'Anti-Aging Facial', 'price' => '$145.00 (60-75 Mins)'],
                ['name' => 'LED Facial', 'price' => '$125.00 (60 Mins)'],
                ['name' => 'Chemical Peel', 'price' => '$175.00-$300.00 (30-45 Mins)'],
                ['name' => 'Oxygen Infusion Treatment', 'price' => '$165.00 (45-60 Mins)'],
                ['name' => 'Hydro Facial', 'price' => '$155.00 (60 Mins)'],
                ['name' => 'Microneedling Treatment', 'price' => '$300.00 (60-90 Mins)'],
                ['name' => 'Dermaplaning', 'price' => '$150.00 (45 Mins)'],
                ['name' => 'CO2 Fractional Laser Treatment', 'price' => '$500.00-$800.00 (30-60 Mins)'],
            ],
        ],
        [
            'id' => 'laser-hair-removal',
            'name' => 'Laser Hair Removal',
            'services' => [
                ['name' => 'Full Face Treatment', 'price' => '$150.00'],
                ['name' => 'Lip Treatment', 'price' => '$60.00'],
                ['name' => 'Chin Treatment', 'price' => '$60.00'],
                ['name' => 'Cheeks Treatment', 'price' => '$95.00'],
                ['name' => 'Ears (Both) Treatment', 'price' => '$85.00'],
                ['name' => 'Sideburns (Both) Treatment', 'price' => '$105.00'],
                ['name' => 'Neck - Front Treatment', 'price' => '$90.00'],
                ['name' => 'Neck - Back Treatment', 'price' => '$90.00'],
                ['name' => 'Nose Treatment', 'price' => '$60.00'],
                ['name' => 'Forehead Treatment', 'price' => '$60.00'],
                ['name' => 'Underarms Treatment', 'price' => '$95.00'],
                ['name' => 'Full Arms Treatment', 'price' => '$200.00'],
                ['name' => 'Half Arms Treatment', 'price' => '$100.00'],
                ['name' => 'Fingers & Hands Treatment', 'price' => '$80.00'],
                ['name' => 'Feet & Toes Treatment', 'price' => '$80.00'],
                ['name' => 'Shoulders Treatment', 'price' => '$125.00'],
                ['name' => 'Upper Back Treatment', 'price' => '$125.00'],
                ['name' => 'Buttocks Treatment', 'price' => '$135.00'],
                ['name' => 'Lower Back Treatment', 'price' => '$125.00'],
                ['name' => 'Full Back Treatment', 'price' => '$250.00'],
                ['name' => 'Chest Treatment', 'price' => '$125.00'],
                ['name' => 'Abdomen Treatment', 'price' => '$125.00'],
                ['name' => 'Bikini Treatment', 'price' => '$195.00'],
                ['name' => 'Brazilian Treatment', 'price' => '$195.00'],
                ['name' => 'Upper Legs Treatment', 'price' => '$195.00'],
                ['name' => 'Lower Legs Treatment', 'price' => '$180.00'],
                ['name' => 'Full Legs Treatment', 'price' => '$275.00'],
                ['name' => 'Full Body Treatment', 'price' => '$1000.00'],
            ],
        ],
        [
            'id' => 'co2-fractional-laser',
            'name' => 'CO2 Fractional Laser',
            'services' => [
                ['name' => 'CO2 Fractional Laser Resurfacing', 'price' => '$500.00-$800.00 (30-60 Mins)'],
            ],
        ],
        [
            'id' => 'injectables-fillers',
            'name' => 'Injectables & Fillers',
            'services' => [
                ['name' => 'Botox Cosmetic', 'price' => '$14.00/unit (20-30 Mins)'],
                ['name' => 'Dermal Fillers (Juvederm)', 'price' => '$500.00/syringe (45-60 Mins)'],
            ],
        ],
        [
            'id' => 'body-treatments',
            'name' => 'Body Treatments',
            'services' => [
                ['name' => 'Grand Paradise Experience', 'price' => '$146.00 (90 Mins)'],
                ['name' => 'Signature Brown Sugar Scrub', 'price' => '$70.00 (30 Mins)'],
                ['name' => 'Signature Body Wrap', 'price' => '$100.00 (60 Mins)'],
                ['name' => 'Seaweed Detoxifying Body Wrap', 'price' => '$100.00 (60 Mins)'],
                ['name' => 'Royal Honey Body Wrap', 'price' => '$100.00 (60 Mins)'],
                ['name' => 'Seasonal Wraps', 'price' => '$100.00 (60 Mins)'],
            ],
        ],
        [
            'id' => 'permanent-makeup',
            'name' => 'Permanent Makeup',
            'services' => [
                ['name' => '3D Eyebrow (Microblading)', 'price' => '$500.00 (2-3 Hours)'],
                ['name' => 'Microblading Touch-Up', 'price' => '$250.00 (60-90 Mins)'],
                ['name' => 'Powder Brow', 'price' => '$500.00 (2-3 Hours)'],
                ['name' => 'Powder Brow Touch-Up', 'price' => '$250.00 (60-90 Mins)'],
                ['name' => 'Lash Line Enhancement', 'price' => '$500.00 (90-120 Mins)'],
                ['name' => 'Lip Blush', 'price' => '$600.00 (2-3 Hours)'],
            ],
        ],
        [
            'id' => 'threading-services',
            'name' => 'Threading Services',
            'services' => [
                ['name' => 'Eyebrow Threading', 'price' => '$30.00 (15-20 Mins)'],
                ['name' => 'Upper Lip', 'price' => '$15.00 (10 Mins)'],
                ['name' => 'Chin', 'price' => '$15.00 (10 Mins)'],
                ['name' => 'Forehead', 'price' => '$15.00 (15 Mins)'],
                ['name' => 'Sideburns (Both)', 'price' => '$35.00 (20 Mins)'],
                ['name' => 'Nose Threading', 'price' => '$15.00 (10 Mins)'],
                ['name' => 'Full Face', 'price' => '$50.00 (30-45 Mins)'],
                ['name' => 'Full Face + Neck', 'price' => '$60.00 (45-60 Mins)'],
            ],
        ],
        [
            'id' => 'waxing-services',
            'name' => 'Waxing Services',
            'services' => [
                ['name' => 'Full Face', 'price' => '$60.00 (30-45 Mins)'],
                ['name' => 'Full Arms', 'price' => '$60.00 (30 Mins)'],
                ['name' => 'Under Arms', 'price' => '$30.00 (15 Mins)'],
                ['name' => 'Full Arm + Under Arm', 'price' => '$80.00 (45 Mins)'],
                ['name' => 'Half Leg', 'price' => '$60.00 (30 Mins)'],
                ['name' => 'Full Leg', 'price' => '$100.00 (45-60 Mins)'],
                ['name' => 'Stomach', 'price' => '$40.00 (15-20 Mins)'],
                ['name' => 'Back', 'price' => '$40.00 (20-30 Mins)'],
                ['name' => 'Bikini', 'price' => '$65.00 (20-30 Mins)'],
                ['name' => 'Neck (Front & Back)', 'price' => '$40.00 (15 Mins)'],
                ['name' => 'Brazilian Waxing', 'price' => '$120.00 (45-60 Mins)'],
                ['name' => 'Ear Waxing', 'price' => '$25.00 (15 Mins)'],
                ['name' => 'Nose Waxing', 'price' => '$25.00 (15 Mins)'],
                ['name' => 'Full Body Waxing', 'price' => '$300.00 (90-120 Mins)'],
            ],
        ],
        [
            'id' => 'eyebrow-services',
            'name' => 'Eyebrow Services',
            'services' => [
                ['name' => 'Eyebrow Tinting', 'price' => '$35.00 (20-30 Mins)'],
                ['name' => 'Eyelash Tinting', 'price' => '$75.00 (30 Mins)'],
                ['name' => 'Eyelash Lifting', 'price' => '$120.00 (45-60 Mins)'],
                ['name' => 'Eyelash Lifting + Tinting', 'price' => '$150.00 (75 Mins)'],
                ['name' => 'Eyebrow Lamination', 'price' => '$105.00 (45 Mins)'],
            ],
        ],
        [
            'id' => 'eyelash-extensions',
            'name' => 'Eyelash Extensions',
            'services' => [
                ['name' => 'Classic Eyelash Extensions', 'price' => '$150.00 (120 Mins)'],
                ['name' => 'Volume Lashes', 'price' => '$225.00 (180 Mins)'],
                ['name' => 'Hybrid Lashes', 'price' => '$185.00 (150 Mins)'],
                ['name' => 'Lash Refills (2-3 Weeks)', 'price' => 'From $75.00 (60-90 Mins)'],
                ['name' => 'Lash Lift & Tint', 'price' => '$110.00 (75 Mins)'],
            ],
        ],
        [
            'id' => 'gentleman-services',
            'name' => 'Gentleman Services',
            'services' => [
                ['name' => "Men's Revitalizing Facial", 'price' => '$105.00 (60 Mins)'],
                ['name' => "Men's Hair Removal", 'price' => 'From $35.00'],
                ['name' => 'Executive Manicure', 'price' => '$45.00 (45 Mins)'],
                ['name' => 'Soothing Back Therapy', 'price' => '$120.00 (60 Mins)'],
                ['name' => 'Laser Hair Reduction', 'price' => 'Consultation Required'],
            ],
        ],
        [
            'id' => 'testing',
            'name' => 'Testing',
            'services' => [
                ['name' => 'Test payment ($5)', 'price' => '$5.00'],
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

    return ['ok' => true, 'lines' => $lines];
}

/**
 * Parse display price strings like "$35+" into cents (3500).
 */
function booking_parse_price_to_cents(string $price): int
{
    if (!preg_match('/\d+(?:\.\d{1,2})?/', $price, $m)) {
        return 0;
    }
    $value = (float) ($m[0] ?? '0');

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

/**
 * Line items for Clover POS orders (one row per booked service).
 *
 * @param list<string> $picks list of "categoryId|serviceName"
 * @return list<array{label:string,price_cents:int}>
 */
function booking_clover_line_items_from_picks(array $picks): array
{
    $out = [];
    $seen = [];
    foreach ($picks as $pick) {
        if (!is_string($pick) || $pick === '') {
            continue;
        }
        $parts = explode('|', $pick, 2);
        if (count($parts) < 2) {
            continue;
        }
        $key = strtolower($parts[0]) . '|' . strtolower(trim($parts[1]));
        if (isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;
        $v = booking_validate_service_pick($parts[0], $parts[1]);
        if (!$v['ok']) {
            continue;
        }
        $cents = booking_service_price_cents((string) $parts[0], (string) $parts[1]);
        if ($cents <= 0) {
            continue;
        }
        $cat = (string) ($v['category'] ?? '');
        $svc = (string) ($v['service'] ?? '');
        $out[] = ['label' => $cat . ' — ' . $svc, 'price_cents' => $cents];
    }

    return $out;
}

function booking_deposit_due_cents(int $serviceTotalCents): int
{
    if ($serviceTotalCents <= 0) {
        return 0;
    }

    // 20% deposit, rounded to nearest cent.
    return (int) round($serviceTotalCents * 0.2);
}
