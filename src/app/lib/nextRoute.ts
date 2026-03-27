/**
 * Same rules as PHP `chb_safe_next` (internal path only).
 */
export function validatedInternalNext(raw: string | null): string {
  if (raw == null) {
    return '/dashboard/';
  }
  const t = raw.trim();
  if (t === '' || !t.startsWith('/') || t.includes('//') || t.includes(':')) {
    return '/dashboard/';
  }
  return t;
}

/**
 * Map a safe internal "next" path to a React Router path.
 * Booking uses the JS flow at /booking instead of PHP book-appointment.php.
 */
export function nextToReactRoute(next: string | null): string {
  const n = validatedInternalNext(next);
  if (n === '/' || n.startsWith('/index')) {
    return '/';
  }
  if (n.startsWith('/dashboard')) {
    return '/dashboard';
  }
  if (n.startsWith('/book-appointment') || n.startsWith('/book.php') || n.startsWith('/booking')) {
    return '/booking';
  }
  if (n.startsWith('/login')) {
    return '/login';
  }
  if (n.startsWith('/signup')) {
    return '/signup';
  }
  return '/dashboard';
}
