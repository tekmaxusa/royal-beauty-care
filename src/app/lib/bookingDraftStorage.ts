const KEY = 'chb_booking_draft_v1';

export type BookingDraftStep = 'choose' | 'review';

export type BookingDraft = {
  v: 1;
  step: BookingDraftStep;
  selectedService: string | null;
  date: string;
  time: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
};

export function persistBookingDraft(draft: BookingDraft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // quota / private mode
  }
}

export function clearBookingDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function consumeBookingDraft(): BookingDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    if (o.v !== 1) return null;
    const step: BookingDraftStep = o.step === 'review' ? 'review' : 'choose';
    const sel = o.selectedService;
    const selectedService = typeof sel === 'string' ? sel : null;
    return {
      v: 1,
      step,
      selectedService,
      date: typeof o.date === 'string' ? o.date : '',
      time: typeof o.time === 'string' ? o.time : '',
      guestName: typeof o.guestName === 'string' ? o.guestName : '',
      guestEmail: typeof o.guestEmail === 'string' ? o.guestEmail : '',
      guestPhone: typeof o.guestPhone === 'string' ? o.guestPhone : '',
    };
  } catch {
    return null;
  }
}
