import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { apiFetch, apiJson } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import BookingDateCalendar from '../components/BookingDateCalendar';
import {
  SALON_LOCATION_ADDRESS,
  SALON_LOCATION_NAME,
  SALON_NAME,
  SALON_LOCATION_PHONE,
} from '../lib/salonVenue';
import { clearBookingDraft, consumeBookingDraft, persistBookingDraft } from '../lib/bookingDraftStorage';

interface Category {
  id: string;
  name: string;
  services: { name: string; price: string }[];
}

interface SlotCell {
  time: string;
  state: 'available' | 'booked' | 'past';
}

type Step = 'choose' | 'review' | 'success';

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

function ReviewSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-4 border-b border-salon-ink/5 last:border-0 last:pb-0">
      <p className="text-[10px] uppercase tracking-[0.2em] text-salon-gold mb-2">{label}</p>
      <div className="text-salon-ink">{children}</div>
    </div>
  );
}

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
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

  const [step, setStep] = useState<Step>('choose');
  /** Single pick: `categoryId|serviceName` */
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
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

  const persistDraftBeforeSignIn = useCallback(() => {
    const stepToSave = step === 'review' ? 'review' : 'choose';
    persistBookingDraft({
      v: 1,
      step: stepToSave,
      selectedService,
      date,
      time,
      guestName,
      guestEmail,
      guestPhone,
    });
  }, [step, selectedService, date, time, guestName, guestEmail, guestPhone]);

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
        }>('/api/client/booking-meta.php', { method: 'GET' });
        const cats = data.categories ?? [];
        setCategories(cats);
        const s: Record<string, SlotCell[]> = data.slotsByDate ?? {};
        setSlotsByDate(s);
        setDepositPercent(typeof data.depositPercent === 'number' ? data.depositPercent : 20);
        setPaymentBypass(parsePaymentBypassFlag(data.paymentBypass));
        const tok = data.paymentTokenizer;
        if (tok && typeof tok.iframeSrc === 'string' && typeof tok.allowedOrigin === 'string') {
          setPaymentTokenizer(tok);
        } else {
          setPaymentTokenizer(null);
        }
        const dates = Object.keys(s).sort();

        const draft = consumeBookingDraft();
        if (draft) {
          setGuestName(draft.guestName);
          setGuestEmail(draft.guestEmail);
          setGuestPhone(draft.guestPhone);

          const [cid, sname] = (draft.selectedService ?? '').split('|');
          const cat = cats.find((c) => c.id === cid);
          const serviceOk =
            Boolean(draft.selectedService) && Boolean(cat?.services.some((x) => x.name === sname));
          setSelectedService(serviceOk ? draft.selectedService : null);

          const nextDate = draft.date && s[draft.date] ? draft.date : dates[0] || '';
          setDate(nextDate);
          const cells = s[nextDate] ?? [];
          const nextTime =
            draft.time && cells.some((c) => c.time === draft.time && c.state === 'available') ? draft.time : '';
          setTime(nextTime);

          const canReview =
            draft.step === 'review' && serviceOk && Boolean(nextDate) && Boolean(nextTime);
          setStep(canReview ? 'review' : 'choose');
        } else {
          setDate((prev) => (prev && s[prev] ? prev : dates[0] || ''));
        }
      } catch {
        setMetaError('Could not load booking options.');
      } finally {
        setMetaLoading(false);
      }
    })();
  }, []);

  const preselect = (location.state as { preselectCategory?: string } | null)?.preselectCategory;
  useEffect(() => {
    if (!preselect || categories.length === 0) return;
    const el = document.getElementById(`booking-cat-${preselect}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [preselect, categories]);

  useEffect(() => {
    if (step !== 'review') return;
    setBillingName((b) => {
      if (b.trim()) return b;
      if (isClientUser) return (user?.name ?? '').trim();
      return guestName.trim();
    });
  }, [step, isClientUser, user?.name, guestName]);

  const pickService = (catId: string, svcName: string) => {
    const key = `${catId}|${svcName}`;
    setSelectedService((prev) => (prev === key ? null : key));
  };

  const timesForDate = date ? slotsByDate[date] ?? [] : [];

  useEffect(() => {
    if (time && !timesForDate.some((c) => c.time === time && c.state === 'available')) {
      setTime('');
    }
  }, [date, time, timesForDate]);

  const serviceSummaryLines = useMemo(() => {
    if (!selectedService) return [];
    const [catId, svcName] = selectedService.split('|');
    const cat = categories.find((c) => c.id === catId);
    return cat ? [`${cat.name} — ${svcName}`] : [];
  }, [selectedService, categories]);

  const selectedServicePriceCents = useMemo(() => {
    if (!selectedService) return 0;
    const [catId, svcName] = selectedService.split('|');
    const cat = categories.find((c) => c.id === catId);
    const svc = cat?.services.find((s) => s.name === svcName);
    return svc ? parsePriceToCents(svc.price) : 0;
  }, [selectedService, categories]);

  const depositDueCents = useMemo(() => {
    return Math.round(selectedServicePriceCents * (depositPercent / 100));
  }, [selectedServicePriceCents, depositPercent]);

  const remainingBalanceCents = useMemo(() => {
    return Math.max(0, selectedServicePriceCents - depositDueCents);
  }, [selectedServicePriceCents, depositDueCents]);

  const needsCardPayment = depositDueCents > 0 && !paymentBypass;
  const useCardIframe = Boolean(needsCardPayment && paymentTokenizer);

  useEffect(() => {
    if (step !== 'review') return;
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = randomBookingIdempotencyKey();
    }
  }, [step]);

  useEffect(() => {
    if (step !== 'review' || !paymentTokenizer) {
      if (step !== 'review') setTokenizerCssLoaded(false);
      return;
    }
    setCardToken('');
    setTokenizerCssLoaded(false);
  }, [step, paymentTokenizer?.iframeSrc]);

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

  const goReview = () => {
    setMsg(null);
    if (!selectedService || !date || !time) {
      setMsg({ ok: false, text: 'Choose one service, a date, and a time.' });
      return;
    }
    setStep('review');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!selectedService || !date || !time) {
      setMsg({ ok: false, text: 'Choose a service, date, and time.' });
      return;
    }
    if (!isClientUser) {
      if (!guestName.trim() || !guestEmail.trim()) {
        setMsg({ ok: false, text: 'Please enter your name and email so we can confirm your visit.' });
        return;
      }
    }
    if (needsCardPayment) {
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
    setSubmitting(true);
    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = randomBookingIdempotencyKey();
      }
      const payload: Record<string, unknown> = {
        booking_date: date,
        booking_time: time,
        services: [selectedService],
        idempotency_key: idempotencyKeyRef.current,
      };
      if (!isClientUser) {
        payload.guest_name = guestName.trim();
        payload.guest_email = guestEmail.trim();
        payload.guest_phone = guestPhone.trim();
      }
      if (needsCardPayment) {
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
        setSelectedService(null);
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

  if (authLoading || metaLoading) {
    return (
      <div className="min-h-screen bg-salon-beige pt-28 flex justify-center">
        <p className="text-salon-ink/60">Loading…</p>
      </div>
    );
  }

  const reviewBlock = (
    <div className="rounded-2xl border border-salon-ink/10 bg-white shadow-[0_20px_50px_-24px_rgba(0,0,0,0.15)] overflow-hidden">
      <div className="px-6 sm:px-8 py-5 bg-gradient-to-r from-salon-beige/80 to-white border-b border-salon-ink/5">
        <h2 className="text-xl sm:text-2xl font-serif text-salon-ink">Confirm your appointment</h2>
        <p className="text-sm text-salon-ink/55 mt-1">Review details — your time will be reserved when you submit.</p>
      </div>
      <div className="px-6 sm:px-8 pt-2 pb-10 sm:pb-12">
        <ReviewSection label="Service">
          <p className="font-medium">{displayLines[0] ?? '—'}</p>
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
    <div className="min-h-screen bg-salon-beige pt-36 md:pt-40 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-serif text-salon-ink mb-2">Book appointment</h1>
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
        {msg && step !== 'success' && (
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

        {step === 'choose' && (
          <div className="bg-white border border-salon-ink/5 shadow-sm p-8 space-y-8">
            <div>
              <h2 className="text-sm uppercase tracking-widest text-salon-gold mb-2">Services</h2>
              <p className="text-xs text-salon-ink/50 mb-4">One service per appointment (one time slot).</p>
              <div className="space-y-6">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    id={`booking-cat-${cat.id}`}
                    className={
                      preselect === cat.id
                        ? 'scroll-mt-28 rounded-lg border border-salon-gold/50 bg-salon-gold/10 p-4'
                        : undefined
                    }
                  >
                    <p className="font-medium text-salon-ink mb-2">{cat.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {cat.services.map((s) => {
                        const key = `${cat.id}|${s.name}`;
                        const on = selectedService === key;
                        return (
                          <button
                            key={s.name}
                            type="button"
                            onClick={() => pickService(cat.id, s.name)}
                            className={`text-sm px-3 py-2 border rounded transition-colors ${
                              on ? 'bg-salon-gold/20 border-salon-gold' : 'border-salon-ink/10 hover:border-salon-gold/50'
                            }`}
                          >
                            {s.name} <span className="text-salon-gold text-xs">{s.price}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-2">Date</label>
                <BookingDateCalendar availableDates={availableDates} value={date} onChange={setDate} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-2">Time</label>
                {date ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {timesForDate.map((cell) => {
                        const sel = time === cell.time && cell.state === 'available';
                        const disabled = cell.state !== 'available';
                        return (
                          <button
                            key={cell.time}
                            type="button"
                            disabled={disabled}
                            onClick={() => cell.state === 'available' && setTime(cell.time)}
                            className={`min-w-[5.5rem] text-left text-sm px-3 py-2 border rounded transition-colors ${
                              sel
                                ? 'bg-salon-gold/25 border-salon-gold'
                                : disabled
                                  ? 'border-salon-ink/10 bg-salon-ink/[0.03] text-salon-ink/40 cursor-not-allowed'
                                  : 'border-salon-ink/15 hover:border-salon-gold/50 text-salon-ink'
                            }`}
                          >
                            <span className="font-medium">{formatTimeHm(cell.time)}</span>
                            {cell.state === 'booked' && (
                              <span className="block text-[10px] uppercase tracking-wider text-amber-800/80 mt-0.5">
                                Booked
                              </span>
                            )}
                            {cell.state === 'past' && (
                              <span className="block text-[10px] uppercase tracking-wider text-salon-ink/35 mt-0.5">
                                Past
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-salon-ink/45">Booked slots cannot be selected.</p>
                  </div>
                ) : (
                  <p className="text-sm text-salon-ink/50 mt-2">Choose a date to see times.</p>
                )}
              </div>
            </div>

            <button type="button" onClick={goReview} className="gold-button w-full py-3 flex items-center justify-center gap-2">
              Review request <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'review' && (
          <form onSubmit={onSubmit} className="space-y-8">
            {reviewBlock}

            {!isClientUser && (
              <div className="bg-white border border-salon-ink/5 shadow-sm p-8 space-y-4">
                <h3 className="text-sm font-medium text-salon-ink">Contact details</h3>
                <p className="text-xs text-salon-ink/55">We’ll use this to confirm your appointment.</p>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-1">Full name</label>
                  <input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
                    autoComplete="name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-1">Email</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-1">Phone (optional)</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
                    autoComplete="tel"
                  />
                </div>
              </div>
            )}

            <div className="bg-white border border-salon-ink/5 shadow-sm p-8 space-y-4">
              <h3 className="text-sm font-medium text-salon-ink">
                {needsCardPayment ? 'Deposit payment' : depositDueCents > 0 ? 'Deposit (dev bypass)' : 'Confirm'}
              </h3>
              {needsCardPayment ? (
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
                      className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
                      autoComplete="cc-name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-1">Street address</label>
                    <input
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
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
                        className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
                        autoComplete="address-level2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-1">State / Province</label>
                      <input
                        value={billingState}
                        onChange={(e) => setBillingState(e.target.value)}
                        className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
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
                        className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
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
                        className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
                        autoComplete="postal-code"
                        required
                      />
                    </div>
                  </div>
                  {useCardIframe && paymentTokenizer ? (
                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70">
                        Card (secure)
                      </label>
                      <p className="text-xs text-salon-ink/55">
                        Card number, expiry, and CVV are entered on our processor&apos;s hosted form. Only a token is sent
                        to our server.
                      </p>
                      {!tokenizerCssLoaded && (
                        <p className="text-xs text-salon-ink/45">Loading secure card form…</p>
                      )}
                      <iframe
                        title="Secure card entry"
                        src={paymentTokenizer.iframeSrc}
                        className="w-full max-w-[600px] border-0 bg-transparent"
                        style={{ height: 200, minHeight: 165 }}
                        allow="payment"
                      />
                      {cardToken ? (
                        <p className="text-xs text-emerald-800">Card verified — you can submit.</p>
                      ) : (
                        <p className="text-xs text-salon-ink/50">Complete all fields in the form above, then submit.</p>
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
                          className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
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
                            className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
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
                            className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
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

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between sm:items-center">
              <button
                type="button"
                onClick={() => {
                  setStep('choose');
                  setMsg(null);
                  idempotencyKeyRef.current = null;
                  setCardToken('');
                  setTokenizerCssLoaded(false);
                }}
                className="flex items-center justify-center gap-2 text-sm uppercase tracking-widest text-salon-ink/60 hover:text-salon-ink py-3"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button type="submit" disabled={submitting} className="gold-button py-3 px-8 flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? 'Submitting…' : (
                  <>
                    {needsCardPayment ? 'Pay deposit & confirm' : depositDueCents > 0 ? 'Confirm booking' : 'Confirm'} <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
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

        {step === 'choose' && (
          <p className="mt-8 text-center">
            <button type="button" onClick={() => navigate(-1)} className="text-sm text-salon-ink/50 hover:text-salon-gold">
              ← Back
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
