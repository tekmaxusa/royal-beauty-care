import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Lock, ShieldCheck, User } from 'lucide-react';
import { apiFetch, apiJson } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import BookingDateCalendar from '../components/BookingDateCalendar';
import CloverDepositForm, {
  cloverTokenizeFromWindow,
  type CloverPublicMeta,
} from '../components/CloverDepositForm';
import {
  SALON_LOCATION_ADDRESS,
  SALON_LOCATION_NAME,
  SALON_NAME,
  SALON_LOCATION_PHONE,
} from '../lib/salonVenue';
import { clearBookingDraft, consumeBookingDraft, persistBookingDraft } from '../lib/bookingDraftStorage';
import { matchBookingServiceName } from '@/src/lib/bookingDeepLink';
import logoUrl from '@/src/assets/royal-logo.png';

interface Category {
  id: string;
  name: string;
  services: { name: string; price: string }[];
}

interface SlotCell {
  time: string;
  state: 'available' | 'booked' | 'past';
  /** Optional: parallel capacity hint from API */
  remaining?: number;
}

type Step = 'booking' | 'payment' | 'success';

function parsePriceToCents(price: string): number {
  const clean = price.replace(/[^0-9.]/g, '').trim();
  if (!clean) return 0;
  const value = Number.parseFloat(clean);
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.round(value * 100));
}

function formatUsd(cents: number): string {
  return `$${(Math.max(0, cents) / 100).toFixed(2)}`;
}

function formatYmdLong(ymd: string): string {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime())
    ? ymd
    : dt.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTimeHm(hm: string): string {
  const t = hm.trim().slice(0, 5);
  const [hh, mm] = t.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return hm;
  const d = new Date(2000, 0, 1, hh, mm, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** e.g. "MARCH 28" for slot headings */
function formatSlotsHeadingDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    .replace(',', '')
    .toUpperCase();
}

/** booking-meta `paymentBypass` — accept bool, 1, or string (some proxies alter JSON). */
function parsePaymentBypassFlag(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (typeof v === 'string') {
    const s = v.toLowerCase().trim();
    return s === '1' || s === 'true' || s === 'yes' || s === 'on';
  }
  return false;
}

function randomBookingIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface PaymentTokenizerMeta {
  iframeSrc: string;
  allowedOrigin: string;
}

type BookingSummaryRow = {
  key: string;
  category: string;
  name: string;
  priceLabel: string;
  priceCents: number;
};

function BookingSummaryAndPolicies({
  selectedServiceRows,
  date,
  time,
  therapist,
  selectedServicePriceCents,
}: {
  selectedServiceRows: BookingSummaryRow[];
  date: string;
  time: string;
  therapist: string;
  selectedServicePriceCents: number;
}) {
  return (
    <>
      <div className="rounded-2xl bg-white border border-salon-ink/10 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.18)] overflow-hidden">
        <div className="h-40 bg-[url('https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200')] bg-cover bg-center relative">
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="p-6">
          <h3 className="font-serif text-lg text-salon-ink mb-4">Booking Summary</h3>
          <div className="space-y-4 text-sm">
            <div className="flex gap-3">
              <span className="mt-0.5 text-salon-gold">
                <Check className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-widest text-salon-ink/50">Service</div>
                {selectedServiceRows.length > 0 ? (
                  <div className="space-y-2 mt-1">
                    {selectedServiceRows.map((row) => (
                      <div key={row.key} className="flex items-start justify-between gap-3">
                        <div className="text-salon-ink leading-snug">{row.name}</div>
                        <div className="text-salon-gold font-medium whitespace-nowrap">{formatUsd(row.priceCents)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-salon-ink">Please add at least one service</div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 text-salon-gold">
                <CalendarDays className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-salon-ink/50">Date & time</div>
                <div className="text-salon-ink">
                  {date ? `${formatYmdLong(date)}${time ? ` at ${formatTimeHm(time)}` : ''}` : '—'}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 text-salon-gold">
                <User className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-salon-ink/50">Therapist</div>
                <div className="text-salon-ink italic">{therapist}</div>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-salon-ink/10 flex items-center justify-between">
            <div className="text-salon-ink font-medium">Total Price</div>
            <div className="text-salon-gold text-2xl font-semibold">{formatUsd(selectedServicePriceCents)}</div>
          </div>
          <div className="mt-6 text-xs text-salon-ink/45 text-right italic">*Payment due at time of service</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-[#0b1626] text-white p-6 shadow-[0_28px_70px_-45px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between">
          <h4 className="font-serif text-lg">Important Policies</h4>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80">i</span>
        </div>
        <ul className="mt-5 space-y-3 text-sm text-white/80">
          <li>Please arrive 15 minutes prior to your appointment time to complete necessary forms.</li>
          <li>Cancellations made less than 24 hours in advance may be subject to a cancellation fee.</li>
          <li>To maintain our serene environment, please silence your mobile devices.</li>
        </ul>
      </div>
    </>
  );
}

function ReviewSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-4 border-b border-salon-ink/5 last:border-0 last:pb-0">
      <p className="text-[10px] uppercase tracking-[0.2em] text-salon-gold mb-2">{label}</p>
      <div className="text-salon-ink">{children}</div>
    </div>
  );
}

function StepPill({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
          active ? 'bg-salon-gold text-white' : 'bg-salon-ink/10 text-salon-ink/70'
        }`}
      >
        {n}
      </span>
      <span className={`text-xs tracking-wide ${active ? 'text-salon-ink' : 'text-salon-ink/55'}`}>{label}</span>
    </div>
  );
}

export default function BookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, SlotCell[]>>({});
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState('');
  const [depositPercent, setDepositPercent] = useState(20);
  /** Mirrors server payment-skip flag — no live card charge; hide card form in dev. */
  const [paymentBypass, setPaymentBypass] = useState(false);
  /** CardConnect Hosted iFrame Tokenizer (from booking-meta). */
  const [paymentTokenizer, setPaymentTokenizer] = useState<PaymentTokenizerMeta | null>(null);
  /** `cardconnect` | `clover` from booking-meta (CHB_DEPOSIT_GATEWAY). */
  const [depositGateway, setDepositGateway] = useState<'cardconnect' | 'clover'>('cardconnect');
  const [cloverPublic, setCloverPublic] = useState<CloverPublicMeta | null>(null);
  /** Clover `clv_` source token (card tokenize or wallet). */
  const [cloverSourceToken, setCloverSourceToken] = useState('');

  const [step, setStep] = useState<Step>('booking');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [activeServiceName, setActiveServiceName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [therapist, setTherapist] = useState('Any Available Professional');
  const [billingName, setBillingName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingCountry, setBillingCountry] = useState('US');
  const [billingPostal, setBillingPostal] = useState('');
  const [cardAccount, setCardAccount] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  /** CardSecure token from iframe postMessage — never raw PAN on our origin. */
  const [cardToken, setCardToken] = useState('');
  const [tokenizerCssLoaded, setTokenizerCssLoaded] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const draftInitDoneRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; code?: string } | null>(null);

  const [successSnapshot, setSuccessSnapshot] = useState<{
    date: string;
    time: string;
    lines: string[];
    name: string;
    email: string;
    phone: string;
    serviceTotalCents: number;
    depositPaidCents: number;
    remainingBalanceCents: number;
  } | null>(null);

  const isClientUser = user?.role === 'client';

  const guestName = useMemo(() => `${guestFirstName} ${guestLastName}`.trim(), [guestFirstName, guestLastName]);

  const persistDraftBeforeSignIn = useCallback(() => {
    const stepToSave: 'choose' | 'review' = step === 'payment' ? 'review' : 'choose';
    persistBookingDraft({
      v: 1,
      step: stepToSave,
      selectedService: selectedServices[0] ?? null,
      selectedServices,
      date,
      time,
      guestName,
      guestEmail,
      guestPhone,
    });
  }, [step, selectedServices, date, time, guestName, guestEmail, guestPhone]);

  const availableDates = useMemo(() => {
    return Object.keys(slotsByDate)
      .filter((d) => (slotsByDate[d] ?? []).some((c) => c.state === 'available'))
      .sort();
  }, [slotsByDate]);

  useEffect(() => {
    void (async () => {
      setMetaLoading(true);
      setMetaError('');
      try {
        const data = await apiJson<{
          ok: boolean;
          categories?: Category[];
          slotsByDate?: Record<string, SlotCell[]>;
          depositPercent?: number;
          paymentBypass?: boolean;
          paymentTokenizer?: PaymentTokenizerMeta | null;
          depositGateway?: string;
          clover?: CloverPublicMeta | null;
        }>('/api/client/booking-meta.php', { method: 'GET' });
        const cats = data.categories ?? [];
        setCategories(cats);
        const s: Record<string, SlotCell[]> = data.slotsByDate ?? {};
        setSlotsByDate(s);
        setDepositPercent(typeof data.depositPercent === 'number' ? data.depositPercent : 20);
        setPaymentBypass(parsePaymentBypassFlag(data.paymentBypass));
        setDepositGateway(data.depositGateway === 'clover' ? 'clover' : 'cardconnect');
        const cp = data.clover;
        if (
          cp &&
          typeof cp.merchantId === 'string' &&
          typeof cp.publicKey === 'string' &&
          typeof cp.sdkUrl === 'string' &&
          cp.merchantId.trim() &&
          cp.publicKey.trim() &&
          cp.sdkUrl.trim()
        ) {
          setCloverPublic(cp);
        } else {
          setCloverPublic(null);
        }
        const tok = data.paymentTokenizer;
        if (tok && typeof tok.iframeSrc === 'string' && typeof tok.allowedOrigin === 'string') {
          setPaymentTokenizer(tok);
        } else {
          setPaymentTokenizer(null);
        }
        const dates = Object.keys(s).sort();
        const defaultCategoryId = (cats[0]?.id ?? '').trim();
        const defaultServiceName = (cats[0]?.services?.[0]?.name ?? '').trim();
        setActiveCategoryId(defaultCategoryId);
        setActiveServiceName(defaultServiceName);
        setDate(dates[0] || '');
        setTime('');
      } catch {
        setMetaError('Could not load booking options.');
      } finally {
        setMetaLoading(false);
      }
    })();
  }, []);

  /** Deep link ?cat=&service= from marketing pages, or restore draft after login (only when no cat query). */
  useEffect(() => {
    if (metaLoading || categories.length === 0) return;

    const catParam = searchParams.get('cat');
    const serviceParam = searchParams.get('service');

    if (catParam) {
      const cat = categories.find((c) => c.id === catParam);
      if (cat) {
        const requested = serviceParam ? decodeURIComponent(serviceParam) : '';
        const matched = matchBookingServiceName(cat, requested);
        setActiveCategoryId(cat.id);
        setActiveServiceName(matched ?? cat.services[0]?.name ?? '');
        setSelectedServices(matched ? [`${cat.id}|${matched}`] : []);
        const dates = Object.keys(slotsByDate).sort();
        const nextDate = dates[0] || '';
        setDate(nextDate);
        setTime('');
        setStep('booking');
      }
      return;
    }

    if (draftInitDoneRef.current) return;
    draftInitDoneRef.current = true;

    const draft = consumeBookingDraft();
    if (draft) {
      const parts = (draft.guestName ?? '').trim().split(/\s+/);
      setGuestFirstName(parts[0] ?? '');
      setGuestLastName(parts.slice(1).join(' '));
      setGuestEmail(draft.guestEmail);
      setGuestPhone(draft.guestPhone);

      const draftKeys = (draft.selectedServices ?? (draft.selectedService ? [draft.selectedService] : []))
        .filter((x) => typeof x === 'string' && x.trim() !== '')
        .filter((key, idx, arr) => arr.indexOf(key) === idx);
      const validated = draftKeys.filter((key) => {
        const [cid, sname] = key.split('|');
        const c = categories.find((k) => k.id === cid);
        return Boolean(c?.services.some((x) => x.name === sname));
      });
      setSelectedServices(validated);

      const dates = Object.keys(slotsByDate).sort();
      const nextDate = draft.date && slotsByDate[draft.date] ? draft.date : dates[0] || '';
      setDate(nextDate);
      const cells = slotsByDate[nextDate] ?? [];
      const nextTime =
        draft.time && cells.some((c) => c.time === draft.time && c.state === 'available') ? draft.time : '';
      setTime(nextTime);

      const canPayment =
        draft.step === 'review' && validated.length > 0 && Boolean(nextDate) && Boolean(nextTime);
      setStep(canPayment ? 'payment' : 'booking');
    } else {
      setDate((prev) => (prev && slotsByDate[prev] ? prev : Object.keys(slotsByDate).sort()[0] || ''));
    }
  }, [metaLoading, categories, searchParams, slotsByDate]);

  const activeCategory = useMemo(() => {
    return categories.find((c) => c.id === activeCategoryId) ?? null;
  }, [categories, activeCategoryId]);

  useEffect(() => {
    if (!activeCategory && categories.length > 0) {
      setActiveCategoryId(categories[0].id);
      setActiveServiceName(categories[0].services[0]?.name ?? '');
      return;
    }
    if (!activeCategory) return;
    if (!activeCategory.services.some((s) => s.name === activeServiceName)) {
      setActiveServiceName(activeCategory.services[0]?.name ?? '');
    }
  }, [activeCategory, categories, activeServiceName]);

  const addActiveService = () => {
    if (!activeCategoryId || !activeServiceName) return;
    const key = `${activeCategoryId}|${activeServiceName}`;
    setSelectedServices((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const removeSelectedService = (key: string) => {
    setSelectedServices((prev) => prev.filter((x) => x !== key));
  };

  const timesForDate = date ? slotsByDate[date] ?? [] : [];

  useEffect(() => {
    if (time && !timesForDate.some((c) => c.time === time && c.state === 'available')) {
      setTime('');
    }
  }, [date, time, timesForDate]);

  const serviceSummaryLines = useMemo(() => {
    return selectedServices
      .map((key) => {
        const [catId, svcName] = key.split('|');
        const cat = categories.find((c) => c.id === catId);
        return cat ? `${cat.name} — ${svcName}` : '';
      })
      .filter((x) => x !== '');
  }, [selectedServices, categories]);

  const selectedServicePriceCents = useMemo(() => {
    return selectedServices.reduce((sum, key) => {
      const [catId, svcName] = key.split('|');
      const cat = categories.find((c) => c.id === catId);
      const svc = cat?.services.find((s) => s.name === svcName);
      return sum + (svc ? parsePriceToCents(svc.price) : 0);
    }, 0);
  }, [selectedServices, categories]);

  const depositDueCents = useMemo(() => {
    return Math.round(selectedServicePriceCents * (depositPercent / 100));
  }, [selectedServicePriceCents, depositPercent]);

  const remainingBalanceCents = useMemo(() => {
    return Math.max(0, selectedServicePriceCents - depositDueCents);
  }, [selectedServicePriceCents, depositDueCents]);

  const needsCardPayment = depositDueCents > 0 && !paymentBypass;
  const useCardIframe = Boolean(needsCardPayment && depositGateway === 'cardconnect' && paymentTokenizer);
  const useCloverPayment = Boolean(needsCardPayment && depositGateway === 'clover' && cloverPublic);
  const cloverPaymentBlocked = Boolean(needsCardPayment && depositGateway === 'clover' && !cloverPublic);

  useEffect(() => {
    if (!needsCardPayment) return;
    setBillingName((b) => {
      if (b.trim()) return b;
      if (isClientUser) return (user?.name ?? '').trim();
      return guestName.trim();
    });
  }, [needsCardPayment, isClientUser, user?.name, guestName]);

  useEffect(() => {
    if (!useCardIframe || !paymentTokenizer) {
      setTokenizerCssLoaded(false);
      return;
    }
    setCardToken('');
    setTokenizerCssLoaded(false);
  }, [useCardIframe, paymentTokenizer?.iframeSrc]);

  useEffect(() => {
    const tok = paymentTokenizer;
    if (!tok) return;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== tok.allowedOrigin) return;
      const raw = e.data;
      const chunks = typeof raw === 'string' ? raw.split('^') : [raw];
      for (let i = chunks.length - 1; i >= 0; i--) {
        try {
          const piece = chunks[i];
          const parsed =
            typeof piece === 'string' ? JSON.parse(piece) : (piece as Record<string, unknown>);
          if (!parsed || typeof parsed !== 'object') continue;
          if ('cssLoaded' in parsed && parsed.cssLoaded) {
            setTokenizerCssLoaded(true);
            return;
          }
          if ('validationError' in parsed && parsed.validationError) {
            setCardToken('');
            return;
          }
          const msgTok = parsed.message;
          if (typeof msgTok === 'string' && /^[0-9A-Za-z]{12,32}$/.test(msgTok)) {
            setCardToken(msgTok);
            return;
          }
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [paymentTokenizer]);

  const snap = successSnapshot;
  const displayDate = snap?.date ?? date;
  const displayTime = snap?.time ?? time;
  const displayLines = snap?.lines ?? serviceSummaryLines;
  const customerDisplayName = snap
    ? snap.name
    : isClientUser
      ? (user?.name ?? '')
      : guestName.trim();
  const customerDisplayEmail = snap ? snap.email : isClientUser ? (user?.email ?? '') : guestEmail.trim();
  const customerPhoneDisplay = snap ? snap.phone : guestPhone.trim();
  const snapServiceTotalCents = snap?.serviceTotalCents ?? selectedServicePriceCents;
  const snapDepositCents = snap?.depositPaidCents ?? depositDueCents;
  const snapRemainingCents = snap?.remainingBalanceCents ?? remainingBalanceCents;

  /** When a deposit applies, booking is split: details first, then payment. */
  const requiresPaymentStep = depositDueCents > 0;

  const goToPayment = () => {
    setMsg(null);
    if (selectedServices.length === 0 || !date || !time) {
      setMsg({ ok: false, text: 'Choose at least one service, a date, and a time.' });
      return;
    }
    if (!isClientUser) {
      if (!guestName.trim() || !guestEmail.trim()) {
        setMsg({ ok: false, text: 'Please enter your name and email so we can confirm your visit.' });
        return;
      }
    }
    if (requiresPaymentStep && cloverPaymentBlocked) {
      setMsg({
        ok: false,
        text: 'Card checkout is not available right now (Clover keys missing). Contact the salon or try again later.',
      });
      return;
    }
    setStep('payment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (requiresPaymentStep && step !== 'payment') {
      return;
    }
    if (selectedServices.length === 0 || !date || !time) {
      setMsg({ ok: false, text: 'Choose at least one service, date, and time.' });
      return;
    }
    if (!isClientUser) {
      if (!guestName.trim() || !guestEmail.trim()) {
        setMsg({ ok: false, text: 'Please enter your name and email so we can confirm your visit.' });
        return;
      }
    }
    let resolvedCloverToken = '';
    if (needsCardPayment) {
      if (depositGateway === 'clover') {
        resolvedCloverToken = cloverSourceToken.trim();
        if (!resolvedCloverToken) {
          const tr = await cloverTokenizeFromWindow();
          if (!tr.ok || !tr.token?.trim()) {
            setMsg({
              ok: false,
              text: tr.error ?? 'Complete the Clover payment form or use Google Pay / Apple Pay, then try again.',
            });
            return;
          }
          resolvedCloverToken = tr.token.trim();
          setCloverSourceToken(resolvedCloverToken);
        }
      } else {
        const nameOnCard = billingName.trim() || (isClientUser ? (user?.name ?? '').trim() : guestName.trim());
        if (!nameOnCard) {
          setMsg({ ok: false, text: 'Please enter the name on the card (or your full name above).' });
          return;
        }
        if (!billingAddress.trim() || !billingCity.trim() || !billingState.trim()) {
          setMsg({ ok: false, text: 'Please enter billing street, city, and state for card verification.' });
          return;
        }
        if (!billingPostal.trim()) {
          setMsg({ ok: false, text: 'Please provide billing ZIP/postal code.' });
          return;
        }
        if (useCardIframe) {
          if (!cardToken.trim()) {
            setMsg({
              ok: false,
              text: 'Complete the secure card form above and wait until it is ready before submitting.',
            });
            return;
          }
        } else if (!cardAccount.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
          setMsg({ ok: false, text: 'Please enter card number, expiry, and CVV.' });
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = randomBookingIdempotencyKey();
      }
      const payload: Record<string, unknown> = {
        booking_date: date,
        booking_time: time,
        services: selectedServices,
        idempotency_key: idempotencyKeyRef.current,
      };
      if (!isClientUser) {
        payload.guest_name = guestName.trim();
        payload.guest_email = guestEmail.trim();
        payload.guest_phone = guestPhone.trim();
      }
      if (needsCardPayment) {
        if (depositGateway === 'clover') {
          payload.clover_source = resolvedCloverToken;
        } else {
          const nameOnCard = billingName.trim() || (isClientUser ? (user?.name ?? '').trim() : guestName.trim());
          payload.billing_name = nameOnCard;
          payload.billing_address = billingAddress.trim();
          payload.billing_city = billingCity.trim();
          payload.billing_state = billingState.trim();
          payload.billing_country = billingCountry.trim() || 'US';
          payload.billing_postal = billingPostal.trim();
          if (useCardIframe) {
            payload.card_token = cardToken.trim();
          } else {
            payload.card_account = cardAccount.trim();
            payload.card_expiry = cardExpiry.trim();
            payload.card_cvv = cardCvv.trim();
          }
        }
      }
      const res = await apiFetch('/api/client/bookings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        code?: string;
        amounts?: {
          service_total_cents?: number;
          deposit_paid_cents?: number;
          remaining_balance_cents?: number;
        };
      };
      if (!res.ok || !data.ok) {
        const errCode = data.code;
        if (errCode !== 'duplicate_request' && errCode !== 'booking_error_charge_pending') {
          idempotencyKeyRef.current = randomBookingIdempotencyKey();
        }
        setMsg({
          ok: false,
          text: data.error || 'Booking failed.',
          code: errCode,
        });
      } else {
        setMsg({ ok: true, text: data.message || 'Submitted.' });
        setSuccessSnapshot({
          date,
          time,
          lines: [...serviceSummaryLines],
          name: isClientUser ? (user?.name ?? '') : guestName.trim(),
          email: isClientUser ? (user?.email ?? '') : guestEmail.trim(),
          phone: guestPhone.trim(),
          serviceTotalCents: data.amounts?.service_total_cents ?? selectedServicePriceCents,
          depositPaidCents: data.amounts?.deposit_paid_cents ?? depositDueCents,
          remainingBalanceCents: data.amounts?.remaining_balance_cents ?? remainingBalanceCents,
        });
        setStep('success');
        setSelectedServices([]);
        setBillingName('');
        setBillingAddress('');
        setBillingCity('');
        setBillingState('');
        setBillingCountry('US');
        setBillingPostal('');
        setCardAccount('');
        setCardExpiry('');
        setCardCvv('');
        setCardToken('');
        setCloverSourceToken('');
        idempotencyKeyRef.current = null;
        clearBookingDraft();
      }
    } catch {
      idempotencyKeyRef.current = randomBookingIdempotencyKey();
      setMsg({ ok: false, text: 'Network error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedServiceRows = useMemo(() => {
    return selectedServices
      .map((key) => {
        const [catId, svcName] = key.split('|');
        const cat = categories.find((c) => c.id === catId);
        const svc = cat?.services.find((x) => x.name === svcName);
        if (!cat || !svc) return null;
        return {
          key,
          category: cat.name,
          name: svc.name,
          priceLabel: svc.price,
          priceCents: parsePriceToCents(svc.price),
        };
      })
      .filter((x): x is { key: string; category: string; name: string; priceLabel: string; priceCents: number } => Boolean(x));
  }, [selectedServices, categories]);

  // IMPORTANT: keep all hooks above any conditional return to avoid hook-order mismatches (React error #310).
  if (authLoading || metaLoading) {
    return (
      <div className="booking-page-loader" aria-busy="true" aria-live="polite">
        <div className="booking-page-loader__logo-wrap">
          <span className="booking-page-loader__orbit" aria-hidden />
          <span className="booking-page-loader__orbit booking-page-loader__orbit--delayed" aria-hidden />
          <img
            src={logoUrl}
            alt=""
            className="booking-page-loader__logo"
            decoding="async"
          />
        </div>
        <p className="booking-page-loader__tagline">Preparing your booking</p>
        <p className="booking-page-loader__sub">Royal Beauty Care</p>
      </div>
    );
  }

  const isSuccess = step === 'success';

  const reviewBlock = (
    <div className="rounded-2xl border border-salon-ink/10 bg-white shadow-[0_20px_50px_-24px_rgba(0,0,0,0.15)] overflow-hidden">
      <div className="px-6 sm:px-8 py-5 bg-gradient-to-r from-salon-beige/80 to-white border-b border-salon-ink/5">
        <h2 className="text-xl sm:text-2xl font-serif text-salon-ink">Confirm your appointment</h2>
        <p className="text-sm text-salon-ink/55 mt-1">Review details — your time will be reserved when you submit.</p>
      </div>
      <div className="px-6 sm:px-8 pt-2 pb-10 sm:pb-12">
        <ReviewSection label="Service">
          <div className="space-y-1">
            {displayLines.length > 0 ? (
              displayLines.map((line) => (
                <p key={line} className="font-medium">{line}</p>
              ))
            ) : (
              <p className="font-medium">—</p>
            )}
          </div>
        </ReviewSection>
        <ReviewSection label="Date & time">
          <p className="font-medium">
            {formatYmdLong(displayDate)} · {formatTimeHm(displayTime)}
          </p>
        </ReviewSection>
        <ReviewSection label="Payment">
          <p className="font-medium">Service total: {formatUsd(snapServiceTotalCents)}</p>
          <p className="text-sm text-salon-ink/65 mt-1">Deposit due now ({depositPercent}%): {formatUsd(snapDepositCents)}</p>
          {paymentBypass && snapDepositCents > 0 && (
            <p className="text-sm text-amber-800/90 mt-1">
              Dev mode: card payment is off (payment skip). No charge — confirm to book.
            </p>
          )}
          <p className="text-sm text-salon-ink/65 mt-1">Remaining balance in store: {formatUsd(snapRemainingCents)} (+ tip in Clover POS)</p>
        </ReviewSection>
        <ReviewSection label="Salon">
          <p className="font-medium">{SALON_NAME}</p>
        </ReviewSection>
        <ReviewSection label="Location">
          <p className="font-medium">{SALON_LOCATION_NAME}</p>
          <p className="text-sm text-salon-ink/65 mt-1">{SALON_LOCATION_ADDRESS}</p>
          <p className="text-xs text-salon-ink/45 mt-2">Phone {SALON_LOCATION_PHONE}</p>
        </ReviewSection>
        <ReviewSection label={isClientUser ? 'Your account' : 'Guest contact'}>
          <p className="font-medium">{customerDisplayName || '—'}</p>
          <p className="text-sm text-salon-ink/65 mt-1">{customerDisplayEmail || '—'}</p>
          {!isClientUser && customerPhoneDisplay && <p className="text-sm text-salon-ink/65 mt-1">{customerPhoneDisplay}</p>}
        </ReviewSection>
      </div>
    </div>
  );

  return (
    <div className="booking-page min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-salon-beige pt-36 md:pt-40 pb-20 px-4 sm:px-6 touch-pan-y">
      <div className="max-w-6xl mx-auto w-full min-w-0">
        <div className="rounded-2xl overflow-hidden shadow-[0_28px_80px_-40px_rgba(0,0,0,0.25)] border border-salon-ink/10 bg-white min-w-0">
          <div className="bg-[#0b1626] text-white px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-xl sm:text-2xl font-serif">Book Appointment</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-0 min-w-0">
            {/* Left: steps */}
            <div className="min-w-0 px-4 sm:px-8 py-7">
        {isClientUser ? (
          <p className="text-sm text-salon-ink/60 mb-8">
            Signed in as <strong>{user!.name}</strong>.{' '}
            <Link to="/dashboard" className="text-salon-gold hover:underline">
              Dashboard
            </Link>
          </p>
        ) : (
          <p className="text-sm text-salon-ink/60 mb-8">
            Book as a guest — no account required.{' '}
            <Link
              to={`/login?next=${encodeURIComponent('/booking')}`}
              className="text-salon-gold hover:underline"
              onClick={persistDraftBeforeSignIn}
            >
              Sign in
            </Link>{' '}
            anytime to track requests in your dashboard.
          </p>
        )}

        {metaError && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-salon-ink/10 bg-white border-l-4 border-l-amber-800/45 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.12)] px-5 py-4 sm:px-6 sm:py-5"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-900/60 mb-2">Could not load</p>
            <p className="text-sm text-salon-ink leading-relaxed">{metaError}</p>
          </div>
        )}
        {msg && !isSuccess && (
          <div
            role="alert"
            className={`mb-6 rounded-2xl border border-salon-ink/10 bg-white shadow-[0_12px_40px_-18px_rgba(0,0,0,0.12)] border-l-4 overflow-hidden ${
              msg.ok ? 'border-l-emerald-700/60' : 'border-l-red-800/50'
            }`}
          >
            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <p
                className={`text-[10px] uppercase tracking-[0.2em] mb-2 ${
                  msg.ok ? 'text-emerald-800/70' : 'text-red-900/55'
                }`}
              >
                {msg.ok ? 'Request sent' : msg.code === 'email_registered' ? 'Sign in to book' : 'Could not book'}
              </p>
              <p className={`text-sm leading-relaxed ${msg.ok ? 'text-emerald-950/85' : 'text-salon-ink'}`}>
                {msg.text}
              </p>
              {!msg.ok && msg.code === 'email_registered' && (
                <Link
                  to={`/login?next=${encodeURIComponent('/booking')}`}
                  className="mt-5 inline-flex items-center justify-center rounded-lg bg-salon-ink px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-salon-ink/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold focus-visible:ring-offset-2"
                  onClick={persistDraftBeforeSignIn}
                >
                  Sign in to continue
                </Link>
              )}
            </div>
          </div>
        )}

        {!isSuccess && (
          <form onSubmit={onSubmit} className="min-w-0 space-y-10">
            {requiresPaymentStep && (
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-salon-ink/50">
                <span className={step === 'booking' ? 'font-semibold text-salon-gold' : 'text-salon-ink/40'}>
                  1. Your visit
                </span>
                <span className="text-salon-ink/20" aria-hidden>
                  →
                </span>
                <span className={step === 'payment' ? 'font-semibold text-salon-gold' : 'text-salon-ink/40'}>
                  2. Payment
                </span>
              </div>
            )}
            {!(requiresPaymentStep && step === 'payment') && (
            <div className="space-y-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-salon-ink/55 mb-2">Service</p>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_auto] gap-4 items-end">
                  <div>
                    <label className="block text-xs font-medium text-salon-ink/80 mb-2">Category</label>
                    <select
                      value={activeCategoryId}
                      onChange={(e) => setActiveCategoryId(e.target.value)}
                      className="w-full rounded-xl border border-salon-ink/15 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-salon-ink/80 mb-2">Service</label>
                    <select
                      value={activeServiceName}
                      onChange={(e) => setActiveServiceName(e.target.value)}
                      className="w-full rounded-xl border border-salon-ink/15 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                      required
                    >
                      {(activeCategory?.services ?? []).map((svc) => (
                        <option key={svc.name} value={svc.name}>
                          {svc.name} — {svc.price}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={addActiveService}
                    className="gold-button py-3 px-6 whitespace-nowrap"
                  >
                    Add Service
                  </button>
                </div>
                {selectedServiceRows.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-salon-ink/10 bg-salon-ink/[0.02] p-4 sm:p-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-salon-ink/55 mb-3">Selected Services</p>
                    <div className="space-y-3">
                      {selectedServiceRows.map((row) => (
                        <div key={row.key} className="rounded-xl border border-salon-ink/10 bg-white px-4 py-3 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-salon-ink">{row.name}</p>
                            <p className="text-xs text-salon-ink/55 mt-1">{row.category}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-salon-gold">{formatUsd(row.priceCents)}</span>
                            <button
                              type="button"
                              onClick={() => removeSelectedService(row.key)}
                              className="text-red-600 hover:text-red-700 text-xs uppercase tracking-widest"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-salon-ink/10 flex items-center justify-between text-sm">
                      <span className="font-medium text-salon-ink">Total Price:</span>
                      <span className="font-semibold text-salon-gold">{formatUsd(selectedServicePriceCents)}</span>
                    </div>
                  </div>
                )}
                <div className="lg:hidden mt-6 space-y-6 border-t border-salon-ink/10 pt-6">
                  <BookingSummaryAndPolicies
                    selectedServiceRows={selectedServiceRows}
                    date={date}
                    time={time}
                    therapist={therapist}
                    selectedServicePriceCents={selectedServicePriceCents}
                  />
                </div>
                <div className="mt-5">
                  <label className="block text-xs font-medium text-salon-ink/80 mb-2">Preferred Therapist (Optional)</label>
                  <select
                    value={therapist}
                    onChange={(e) => setTherapist(e.target.value)}
                    className="w-full rounded-xl border border-salon-ink/15 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                  >
                    <option>Any Available Professional</option>
                    <option>Geetha (skin care)</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-salon-ink/55 mb-2">Date & time</p>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8">
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-salon-ink">
                      <CalendarDays className="w-4 h-4 text-salon-gold" />
                      <h2 className="font-serif text-lg">Date</h2>
                    </div>
                    <BookingDateCalendar availableDates={availableDates} value={date} onChange={setDate} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-salon-ink">
                      <Clock3 className="w-4 h-4 text-salon-gold" />
                      <h2 className="font-serif text-lg tracking-wide uppercase">
                        Available slots
                        {date ? (
                          <span className="text-salon-ink/70"> ({formatSlotsHeadingDate(date)})</span>
                        ) : null}
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {timesForDate.map((cell) => {
                        const disabled = cell.state !== 'available';
                        const sel = time === cell.time && !disabled;
                        const remaining =
                          typeof cell.remaining === 'number' && cell.remaining > 0 ? cell.remaining : 3;
                        return (
                          <button
                            key={cell.time}
                            type="button"
                            disabled={disabled}
                            onClick={() => cell.state === 'available' && setTime(cell.time)}
                            className={`rounded-xl border px-3 py-3 text-sm text-center transition-colors ${
                              sel
                                ? 'border-salon-gold bg-salon-gold/15'
                                : disabled
                                  ? 'border-salon-ink/10 bg-salon-ink/[0.03] text-salon-ink/35 cursor-not-allowed'
                                  : 'border-salon-ink/15 bg-white hover:border-salon-gold/60'
                            }`}
                          >
                            <div className="font-semibold text-salon-ink">{formatTimeHm(cell.time)}</div>
                            {cell.state === 'available' && (
                              <div className="text-[11px] mt-1.5 font-medium text-emerald-700">
                                {remaining} slots remaining
                              </div>
                            )}
                            {cell.state === 'booked' && (
                              <div className="text-[10px] mt-1 text-amber-800/80">Booked</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <input type="hidden" value={time} required />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-salon-ink/55 mb-2">Your details</p>
                {!isClientUser ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs text-salon-ink/70 mb-2">First Name</label>
                      <input
                        value={guestFirstName}
                        onChange={(e) => setGuestFirstName(e.target.value)}
                        className="w-full rounded-xl border border-salon-ink/15 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                        autoComplete="given-name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-salon-ink/70 mb-2">Last Name</label>
                      <input
                        value={guestLastName}
                        onChange={(e) => setGuestLastName(e.target.value)}
                        className="w-full rounded-xl border border-salon-ink/15 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                        autoComplete="family-name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-salon-ink/70 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full rounded-xl border border-salon-ink/15 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-salon-ink/70 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="w-full rounded-xl border border-salon-ink/15 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                        autoComplete="tel"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-salon-ink/70 mb-2">Special Requests / Notes</label>
                      <textarea
                        value={specialNotes}
                        onChange={(e) => setSpecialNotes(e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-salon-ink/15 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold resize-none"
                        placeholder="Any allergies or specific concerns we should know about?"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5">
                    <div>
                      <label className="block text-xs text-salon-ink/70 mb-2">Special Requests / Notes</label>
                      <textarea
                        value={specialNotes}
                        onChange={(e) => setSpecialNotes(e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-salon-ink/15 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold resize-none"
                        placeholder="Any allergies or specific concerns we should know about?"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {(!requiresPaymentStep || step === 'payment') && (
            <>
            {requiresPaymentStep && step === 'payment' && (
              <div className="lg:hidden mb-6 border-b border-salon-ink/10 pb-6">
                <BookingSummaryAndPolicies
                  selectedServiceRows={selectedServiceRows}
                  date={date}
                  time={time}
                  therapist={therapist}
                  selectedServicePriceCents={selectedServicePriceCents}
                />
              </div>
            )}
            <div className="rounded-2xl border border-salon-ink/10 bg-white shadow-[0_20px_50px_-24px_rgba(0,0,0,0.15)] overflow-hidden">
              <div className="px-6 sm:px-8 py-5 border-b border-salon-ink/5 bg-gradient-to-r from-white to-salon-beige/60">
                <p className="text-[10px] uppercase tracking-[0.25em] text-salon-ink/55">Online payment</p>
                <div className="mt-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <h3 className="text-lg sm:text-xl font-serif text-salon-ink">
                    {needsCardPayment ? 'Secure deposit' : depositDueCents > 0 ? 'Deposit (dev bypass)' : 'Confirm booking'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-salon-ink/5 px-3 py-1 text-[11px] text-salon-ink/70">
                      Total <span className="ml-2 font-medium text-salon-ink">{formatUsd(snapServiceTotalCents)}</span>
                    </span>
                    <span className="inline-flex items-center rounded-full bg-salon-gold/15 px-3 py-1 text-[11px] text-salon-ink/70">
                      Due now <span className="ml-2 font-medium text-salon-ink">{formatUsd(depositDueCents)}</span>
                    </span>
                  </div>
                </div>
                <p className="text-xs text-salon-ink/60 mt-3 leading-relaxed">
                  Remaining balance is collected in store (tip handled in Clover POS).
                </p>
              </div>

              <div className="px-6 sm:px-8 py-7 space-y-6">
              {needsCardPayment && cloverPaymentBlocked ? (
                <div
                  className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900"
                  role="alert"
                >
                  Online deposit via Clover is not configured (missing merchant keys). Please contact {SALON_NAME} or try
                  again later.
                </div>
              ) : needsCardPayment && useCloverPayment && cloverPublic ? (
                <>
                  <p className="text-xs text-salon-ink/55">
                    Pay {formatUsd(depositDueCents)} now to reserve this slot. Remaining balance and tip are collected in
                    store.
                  </p>
                  <CloverDepositForm
                    active={step === 'payment'}
                    depositCents={depositDueCents}
                    meta={cloverPublic}
                    onTokenChange={setCloverSourceToken}
                  />
                  {cloverSourceToken ? (
                    <p className="text-xs text-emerald-800">Payment method ready — submit to confirm.</p>
                  ) : (
                    <p className="text-xs text-salon-ink/50">
                      Enter card details or use the wallet button, then submit.
                    </p>
                  )}
                </>
              ) : needsCardPayment ? (
                <>
                  <p className="text-xs text-salon-ink/55">
                    Pay {formatUsd(depositDueCents)} now to reserve this slot. Remaining balance and tip are collected in store.
                  </p>
                  <p className="text-xs text-salon-ink/55">
                    Use the same billing address your bank has on file — it helps verify your card.
                  </p>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-1">Name on card</label>
                    <input
                      value={billingName}
                      onChange={(e) => setBillingName(e.target.value)}
                      className="w-full rounded-xl border border-salon-ink/15 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                      autoComplete="cc-name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-1">Street address</label>
                    <input
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      className="w-full rounded-xl border border-salon-ink/15 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                      autoComplete="street-address"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-1">City</label>
                      <input
                        value={billingCity}
                        onChange={(e) => setBillingCity(e.target.value)}
                        className="w-full rounded-xl border border-salon-ink/15 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                        autoComplete="address-level2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-1">State / Province</label>
                      <input
                        value={billingState}
                        onChange={(e) => setBillingState(e.target.value)}
                        className="w-full rounded-xl border border-salon-ink/15 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                        autoComplete="address-level1"
                        placeholder="CO"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-1">Country (ISO)</label>
                      <input
                        value={billingCountry}
                        onChange={(e) => setBillingCountry(e.target.value.toUpperCase())}
                        className="w-full rounded-xl border border-salon-ink/15 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                        autoComplete="country"
                        placeholder="US"
                        maxLength={2}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-1">ZIP / Postal</label>
                      <input
                        value={billingPostal}
                        onChange={(e) => setBillingPostal(e.target.value)}
                        className="w-full rounded-xl border border-salon-ink/15 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                        autoComplete="postal-code"
                        required
                      />
                    </div>
                  </div>
                  {useCardIframe && paymentTokenizer ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-salon-gold/15 text-salon-gold">
                              <Lock className="w-4 h-4" />
                            </span>
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-salon-ink/55">Secure card form</p>
                              <p className="text-sm font-medium text-salon-ink">Secure checkout</p>
                            </div>
                          </div>
                          <p className="text-xs text-salon-ink/55 mt-2 leading-relaxed">
                            Your card number is entered on our processor&apos;s hosted form. We only receive a payment token.
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                          {cardToken ? (
                            <span className="text-[10px] uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200/70 rounded-full px-3 py-1">
                              Verified
                            </span>
                          ) : tokenizerCssLoaded ? (
                            <span className="text-[10px] uppercase tracking-widest text-salon-ink/55 bg-white border border-salon-ink/10 rounded-full px-3 py-1">
                              Ready
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase tracking-widest text-salon-ink/45 bg-white border border-salon-ink/10 rounded-full px-3 py-1">
                              Loading…
                            </span>
                          )}
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-salon-ink/45">
                            <ShieldCheck className="w-4 h-4 text-salon-gold" />
                            Tokenized
                          </div>
                        </div>
                      </div>

                      <iframe
                        title="Secure card entry"
                        src={paymentTokenizer.iframeSrc}
                        className="w-full max-w-full block border-0 bg-transparent overflow-hidden h-[242px] min-h-[226px] md:h-[300px] md:min-h-[300px]"
                        allow="payment"
                      />

                      {cardToken ? (
                        <p className="text-xs text-emerald-800">Card verified — you can submit.</p>
                      ) : (
                        <p className="text-xs text-salon-ink/50">Complete all fields in the secure form above, then submit.</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-1">
                          Card number
                        </label>
                        <input
                          value={cardAccount}
                          onChange={(e) => setCardAccount(e.target.value)}
                          className="w-full rounded-xl border border-salon-ink/15 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                          autoComplete="cc-number"
                          inputMode="numeric"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-1">
                            Expiry (MMYY)
                          </label>
                          <input
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full rounded-xl border border-salon-ink/15 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                            autoComplete="cc-exp"
                            placeholder="1228"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-1">CVV</label>
                          <input
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            className="w-full rounded-xl border border-salon-ink/15 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                            autoComplete="cc-csc"
                            inputMode="numeric"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : depositDueCents > 0 ? (
                <>
                  <p className="text-xs text-salon-ink/55">
                    The server has <strong className="font-medium text-salon-ink/80">payment skip</strong> enabled. Your
                    deposit of {formatUsd(depositDueCents)} is recorded for testing only — no card is charged.
                  </p>
                  <p className="text-xs text-amber-900/80 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2">
                    Turn off payment skip in <code className="text-[11px]">api/.env</code> and restart PHP for
                    real payments.
                  </p>
                </>
              ) : (
                <p className="text-xs text-salon-ink/55">
                  No deposit is required for this service. Submit to confirm your appointment.
                </p>
              )}
              </div>
            </div>
            </>
            )}

            <div className={`flex flex-col-reverse gap-3 sm:flex-row sm:items-center ${requiresPaymentStep && step === 'payment' ? 'sm:justify-between' : 'justify-end'}`}>
              {requiresPaymentStep && step === 'payment' && (
                <button
                  type="button"
                  onClick={() => {
                    setMsg(null);
                    setStep('booking');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-none border border-salon-ink/20 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-salon-ink transition-colors hover:border-salon-gold hover:text-salon-gold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to details
                </button>
              )}
              <div className="flex justify-end sm:ml-auto">
                {requiresPaymentStep && step === 'booking' ? (
                  <button
                    type="button"
                    onClick={goToPayment}
                    className="gold-button py-3 px-10 flex items-center justify-center gap-2"
                  >
                    Continue to payment <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="submit" disabled={submitting} className="gold-button py-3 px-10 flex items-center justify-center gap-2 disabled:opacity-50">
                    {submitting ? 'Submitting…' : (
                      <>
                        {needsCardPayment ? 'Pay deposit & confirm' : depositDueCents > 0 ? 'Confirm booking' : 'Confirm'}{' '}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {isSuccess && (
          <div className="space-y-8">
            <div className="text-emerald-900 bg-emerald-50 border border-emerald-200/80 rounded-xl px-4 py-4">
              <p className="font-medium">You are booked</p>
              <p className="text-sm text-emerald-900/80 mt-1">
                {msg?.text || 'Your appointment is confirmed. Check your email for details.'}
              </p>
            </div>
            {reviewBlock}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/" className="text-center text-sm border border-salon-ink/15 py-3 px-6 hover:border-salon-gold transition-colors">
                Back to home
              </Link>
              {isClientUser && (
                <Link to="/dashboard" className="text-center gold-button py-3 px-6">
                  Open dashboard
                </Link>
              )}
              {!isClientUser && (
                <Link to="/signup" className="text-center gold-button py-3 px-6">
                  Create an account
                </Link>
              )}
            </div>
          </div>
        )}

        {/* end left */}
            </div>

            {/* Right: summary + policies (desktop only — mobile shows same blocks under Selected Services) */}
            <aside className="hidden min-w-0 lg:block bg-[#f7f6f3] px-4 sm:px-8 py-7 border-l border-salon-ink/10">
              <BookingSummaryAndPolicies
                selectedServiceRows={selectedServiceRows}
                date={date}
                time={time}
                therapist={therapist}
                selectedServicePriceCents={selectedServicePriceCents}
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
