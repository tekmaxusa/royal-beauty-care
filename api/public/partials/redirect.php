<?php

declare(strict_types=1);

/**
 * Internal path only — use after login (prevents open redirect).
 */
function chb_safe_next(string $next): string
{
    $next = trim($next);
    if ($next === '' || !str_starts_with($next, '/') || str_contains($next, '//')) {
        return '/dashboard';
    }
    if (str_contains($next, "\0") || str_contains($next, ':')) {
        return '/dashboard';
    }

    return $next;
}
