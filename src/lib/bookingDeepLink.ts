import type { Service } from '@/src/constants';

/**
 * Maps the last segment of marketing routes `/services/:segment` to booking-meta category ids
 * (see api/config/booking_services.php).
 */
const PATH_SEGMENT_TO_BOOKING_CATEGORY_ID: Record<string, string> = {
  'skin-care': 'skin-care',
  'permanent-makeup': 'permanent-makeup',
  'body-treatments': 'body-treatments',
  'laser-hair-removal': 'laser-hair-removal',
  'co2-fractional': 'co2-fractional-laser',
  injectables: 'injectables-fillers',
  'eyebrow-tinting': 'eyebrow-services',
  gentleman: 'gentleman-services',
  threading: 'threading-services',
  'eyelash-extensions': 'eyelash-extensions',
  waxing: 'waxing-services',
};

/**
 * @returns Booking category id, or `null` if this marketing section has no bookable catalog (e.g. products-only pages).
 */
export function pathSegmentToBookingCategoryId(segment: string): string | null {
  return PATH_SEGMENT_TO_BOOKING_CATEGORY_ID[segment] ?? null;
}

/**
 * Link target for “Book” from a service detail row. Uses optional {@link Service.bookingPick} for exact API names.
 */
export function buildBookingLinkFromServicePage(categoryPathSegment: string, service: Service): string {
  if (service.bookingPick) {
    const { categoryId, serviceName } = service.bookingPick;
    return `/booking?cat=${encodeURIComponent(categoryId)}&service=${encodeURIComponent(serviceName)}`;
  }
  const catId = pathSegmentToBookingCategoryId(categoryPathSegment);
  if (!catId) return '/booking';
  return `/booking?cat=${encodeURIComponent(catId)}&service=${encodeURIComponent(service.title)}`;
}

export interface BookingCategoryLike {
  id: string;
  services: { name: string }[];
}

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'for',
  'with',
  'from',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'min',
  'mins',
  'minute',
  'minutes',
  'session',
  'sessions',
]);

/** Strip price/duration tails from API labels so marketing titles can match the core name. */
function stripNoiseForMatch(s: string): string {
  return s
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\$[\d.,\s-]+/gi, ' ')
    .replace(/\bfrom\s+\$/gi, ' ')
    .replace(/\bstarting\s+at\s+\$/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForMatch(s: string): string {
  return stripNoiseForMatch(s)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(normalized: string): string[] {
  return normalized
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j] + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

/**
 * Score 0–100: how well `requested` (marketing / URL) matches `candidateName` (booking-meta).
 */
function scoreServiceMatch(requestedRaw: string, candidateName: string): number {
  const req = normalizeForMatch(requestedRaw);
  const cand = normalizeForMatch(candidateName);
  if (!req || !cand) return 0;
  if (req === cand) return 100;
  if (cand.includes(req) || req.includes(cand)) {
    return Math.min(100, 82 + Math.round(18 * (Math.min(req.length, cand.length) / Math.max(req.length, cand.length))));
  }

  const rt = tokenize(req);
  const ct = tokenize(cand);
  if (rt.length === 0) return 0;

  let tokenHits = 0;
  for (const t of rt) {
    const hit = ct.some(
      (u) =>
        u === t ||
        (t.length >= 3 && (u.startsWith(t) || u.includes(t))) ||
        (u.length >= 3 && t.includes(u))
    );
    if (hit) tokenHits++;
  }
  const recall = tokenHits / rt.length;
  const maxLen = Math.max(req.length, cand.length);
  const levSim = maxLen === 0 ? 1 : 1 - levenshtein(req, cand) / maxLen;

  return Math.min(100, recall * 72 + levSim * 28);
}

const MIN_SCORE = 42;
const AMBIGUOUS_GAP = 6;

/**
 * Maps a marketing/URL service label to the best booking-meta `name` in the category (fuzzy, not only exact).
 */
export function matchBookingServiceName(cat: BookingCategoryLike, requestedRaw: string): string | null {
  const requested = requestedRaw.trim();
  if (!requested) {
    return cat.services.length === 1 ? cat.services[0].name : null;
  }
  if (cat.services.length === 0) return null;
  if (cat.services.length === 1) return cat.services[0].name;

  const ranked = cat.services
    .map((s) => ({ name: s.name, score: scoreServiceMatch(requested, s.name) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]!;
  const second = ranked[1]!;

  if (best.score < MIN_SCORE) return null;
  /** Two strong, nearly tied candidates — avoid guessing (rare). */
  if (
    second &&
    best.score - second.score < AMBIGUOUS_GAP &&
    best.score >= 75 &&
    second.score >= 70
  ) {
    return null;
  }
  return best.name;
}
