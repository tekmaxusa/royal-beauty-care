import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, User } from 'lucide-react';
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

type Step = 'service' | 'time' | 'details' | 'review' | 'success';

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

  const [step, setStep] = useState<Step>('service');
  /** Single pick: `categoryId|serviceName` */
  const [selectedService, setSelectedService] = useState<string | null>(null);
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
    const stepToSave: 'choose' | 'review' = step === 'review' ? 'review' : 'choose';
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
          const parts = (draft.guestName ?? '').trim().split(/\s+/);
          setGuestFirstName(parts[0] ?? '');
          setGuestLastName(parts.slice(1).join(' '));
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
          setStep(canReview ? 'review' : 'service');
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

  const goTime = () => {
    setMsg(null);
    if (!selectedService) {
      setMsg({ ok: false, text: 'Please select a service.' });
      return;
    }
    setStep('time');
  };

  const goDetails = () => {
    setMsg(null);
    if (!date || !time) {
      setMsg({ ok: false, text: 'Please select a date and time.' });
      return;
    }
    setStep('details');
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

  const serviceOptions = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    for (const cat of categories) {
      for (const s of cat.services) {
        out.push({
          key: `${cat.id}|${s.name}`,
          label: `${s.name} — ${s.price}`,
        });
      }
    }
    return out;
  }, [categories]);

  const selectedServiceLabel = useMemo(() => {
    if (!selectedService) return 'Please select a service';
    const [catId, svcName] = selectedService.split('|');
    const cat = categories.find((c) => c.id === catId);
    const svc = cat?.services.find((x) => x.name === svcName);
    if (!cat || !svc) return 'Please select a service';
    return `${cat.name} — ${svc.name} (${svc.price})`;
  }, [selectedService, categories]);

  return (
    <div className="min-h-screen bg-salon-beige pt-36 md:pt-40 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl overflow-hidden shadow-[0_28px_80px_-40px_rgba(0,0,0,0.25)] border border-salon-ink/10 bg-white">
          <div className="bg-[#0b1626] text-white px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-xl sm:text-2xl font-serif">Book Appointment</h1>
            <div className="flex items-center gap-6">
              <StepPill n={1} label="Service" active={step === 'service' || step === 'time' || step === 'details' || step === 'review' || step === 'success'} />
              <StepPill n={2} label="Time" active={step === 'time' || step === 'details' || step === 'review' || step === 'success'} />
              <StepPill n={3} label="Details" active={step === 'details' || step === 'review' || step === 'success'} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-0">
            {/* Left: steps */}
            <div className="px-6 sm:px-8 py-7">
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

        {step === 'service' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-salon-ink/80 mb-2">Select Service</label>
                <select
                  value={selectedService ?? ''}
                  onChange={(e) => setSelectedService(e.target.value || null)}
                  className="w-full rounded-xl border border-salon-ink/15 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salon-gold"
                >
                  <option value="">Please select a service</option>
                  {serviceOptions.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={goTime} className="gold-button px-6 py-3">
                Add Service
              </button>
            </div>

            <div>
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

            <div className="flex items-center justify-end">
              <button type="button" onClick={goTime} className="gold-button px-8 py-3">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'time' && (
          <div className="space-y-7">
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
                  <h2 className="font-serif text-lg">Available slots</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {timesForDate.map((cell) => {
                    const disabled = cell.state !== 'available';
                    const sel = time === cell.time && !disabled;
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
                              : 'border-salon-ink/15 hover:border-salon-gold/60'
                        }`}
                      >
                        <div className="font-medium">{formatTimeHm(cell.time)}</div>
                        {cell.state === 'booked' && <div className="text-[10px] mt-1 text-amber-800/80">Booked</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('service')}
                className="text-sm uppercase tracking-widest text-salon-ink/60 hover:text-salon-gold"
              >
                <ArrowLeft className="inline-block w-4 h-4 mr-2" />
                Back
              </button>
              <button type="button" onClick={goDetails} className="gold-button px-8 py-3">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-7">
            <div className="flex items-center gap-2 text-salon-ink">
              <User className="w-4 h-4 text-salon-gold" />
              <h2 className="font-serif text-lg">Your Details</h2>
            </div>
            {!isClientUser && (
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
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('time')}
                className="text-sm uppercase tracking-widest text-salon-ink/60 hover:text-salon-gold"
              >
                <ArrowLeft className="inline-block w-4 h-4 mr-2" />
                Back
              </button>
              <button type="button" onClick={goReview} className="gold-button px-8 py-3">
                Confirm Booking <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <form onSubmit={onSubmit} className="space-y-8">
            {reviewBlock}

            {/* Contact details already collected in Details step */}

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

        {/* end left */}
            </div>

            {/* Right: summary + policies */}
            <aside className="bg-[#f7f6f3] px-6 sm:px-8 py-7 border-l border-salon-ink/10">
              <div className="rounded-2xl bg-white border border-salon-ink/10 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.18)] overflow-hidden">
                <div className="h-40 bg-[url('https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200')] bg-cover bg-center relative">
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-lg text-salon-ink mb-4">Booking Summary</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex gap-3">
                      <span className="mt-0.5 text-salon-gold"><Check className="w-4 h-4" /></span>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-salon-ink/50">Service</div>
                        <div className="text-salon-ink">{selectedServiceLabel}</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="mt-0.5 text-salon-gold"><CalendarDays className="w-4 h-4" /></span>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-salon-ink/50">Date & time</div>
                        <div className="text-salon-ink">{date ? formatYmdLong(date) : '—'}{time ? ` at ${formatTimeHm(time)}` : ''}</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="mt-0.5 text-salon-gold"><User className="w-4 h-4" /></span>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-salon-ink/50">Therapist</div>
                        <div className="text-salon-ink italic">{therapist}</div>
                      </div>
                    </div>
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
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
