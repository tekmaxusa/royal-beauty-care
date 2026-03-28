import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

export interface CloverPublicMeta {
  merchantId: string;
  publicKey: string;
  sdkUrl: string;
  sandbox?: string;
}

type CloverElement = {
  mount: (target: string | HTMLElement) => void;
  unmount?: () => void;
  addEventListener?: (ev: string, fn: (e: unknown) => void) => void;
};

type CloverElementsApi = {
  create: (t: string, styles?: Record<string, unknown>, opts?: Record<string, unknown>) => CloverElement;
};

type CloverInstance = {
  elements: () => CloverElementsApi;
  createToken: () => Promise<{ token?: string; errors?: Record<string, { error?: string }> }>;
};

declare global {
  interface Window {
    Clover?: new (publicKey: string, opts: { merchantId: string; locale?: string }) => CloverInstance;
  }
}

interface Props {
  active: boolean;
  depositCents: number;
  meta: CloverPublicMeta;
  onTokenChange: (token: string) => void;
}

function loadScriptOnce(src: string): Promise<void> {
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing && (window as unknown as { Clover?: unknown }).Clover) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Clover checkout SDK'));
    document.head.appendChild(s);
  });
}

/**
 * Clover hosted iframe elements + Google Pay / Apple Pay (Payment Request) button.
 * Produces a clv_ source token for the booking API.
 */
export default function CloverDepositForm({ active, depositCents, meta, onTokenChange }: Props) {
  const rid = useId().replace(/:/g, '');
  const ids = useMemo(
    () => ({
      cardNumber: `chb-clv-cn-${rid}`,
      cardDate: `chb-clv-cd-${rid}`,
      cardCvv: `chb-clv-cv-${rid}`,
      cardPostal: `chb-clv-cp-${rid}`,
      pr: `chb-clv-pr-${rid}`,
      response: `chb-clv-rs-${rid}`,
    }),
    [rid]
  );
  const cloverRef = useRef<CloverInstance | null>(null);
  const elementsRef = useRef<CloverElement[]>([]);
  const [sdkError, setSdkError] = useState('');
  const [walletHint, setWalletHint] = useState('');

  const onTokenChangeRef = useRef(onTokenChange);
  onTokenChangeRef.current = onTokenChange;

  const teardown = useCallback(() => {
    for (const el of elementsRef.current) {
      try {
        el.unmount?.();
      } catch {
        /* ignore */
      }
    }
    elementsRef.current = [];
    cloverRef.current = null;
    onTokenChangeRef.current('');
  }, []);

  useEffect(() => {
    if (!active || depositCents <= 0) {
      teardown();
      setSdkError('');
      return;
    }

    let cancelled = false;

    void (async () => {
      setSdkError('');
      setWalletHint('');
      teardown();
      try {
        await loadScriptOnce(meta.sdkUrl);
        if (cancelled) return;
        const Ctor = window.Clover;
        if (!Ctor) {
          setSdkError('Clover SDK did not initialize.');
          return;
        }
        const clover = new Ctor(meta.publicKey, {
          merchantId: meta.merchantId,
          locale: 'en-US',
        });
        cloverRef.current = clover;
        const elements = clover.elements();
        const styles = { input: { fontSize: '16px', height: '42px' } };

        const cardNumber = elements.create('CARD_NUMBER', styles);
        const cardDate = elements.create('CARD_DATE', styles);
        const cardCvv = elements.create('CARD_CVV', styles);
        const cardPostal = elements.create('CARD_POSTAL_CODE', styles);

        cardNumber.mount(`#${ids.cardNumber}`);
        cardDate.mount(`#${ids.cardDate}`);
        cardCvv.mount(`#${ids.cardCvv}`);
        cardPostal.mount(`#${ids.cardPostal}`);
        elementsRef.current = [cardNumber, cardDate, cardCvv, cardPostal];

        const paymentReqData = {
          total: {
            label: 'Deposit',
            amount: depositCents,
          },
          options: {
            button: { buttonType: 'short' as const },
          },
        };

        const prBtn = elements.create('PAYMENT_REQUEST_BUTTON', { paymentReqData });
        prBtn.mount(`#${ids.pr}`);
        elementsRef.current.push(prBtn);

        const onPm = (raw: unknown) => {
          const o = raw as Record<string, unknown> | string | null;
          let token = '';
          if (typeof o === 'string') {
            token = o;
          } else if (o && typeof o === 'object') {
            token = String((o as { token?: string }).token ?? (o as { detail?: { token?: string } }).detail?.token ?? '');
          }
          if (token.startsWith('clv_')) {
            onTokenChangeRef.current(token);
            setWalletHint('Wallet payment ready — submit to confirm.');
          }
        };
        prBtn.addEventListener?.('paymentMethod', onPm);
        prBtn.addEventListener?.('paymentMethodEnd', () => {
          /* wallet sheet closed */
        });
      } catch (e) {
        if (!cancelled) {
          setSdkError(e instanceof Error ? e.message : 'Could not start Clover checkout.');
        }
      }
    })();

    return () => {
      cancelled = true;
      teardown();
    };
  }, [active, depositCents, meta.merchantId, meta.publicKey, meta.sdkUrl, ids, teardown]);

  const tokenizeCard = useCallback(async (): Promise<{ ok: boolean; token?: string; error?: string }> => {
    const clover = cloverRef.current;
    if (!clover) return { ok: false, error: 'Payment form is not ready.' };
    const res = await clover.createToken();
    if (res.errors && Object.keys(res.errors).length > 0) {
      const first = Object.values(res.errors)[0];
      return { ok: false, error: first?.error ?? 'Check your card details.' };
    }
    const t = res.token?.trim() ?? '';
    if (!t.startsWith('clv_')) {
      return { ok: false, error: 'Could not tokenize card.' };
    }
    onTokenChangeRef.current(t);
    return { ok: true, token: t };
  }, []);

  useEffect(() => {
    (window as unknown as { __chbCloverTokenize?: () => Promise<{ ok: boolean; token?: string; error?: string }> }).__chbCloverTokenize =
      tokenizeCard;
    return () => {
      delete (window as unknown as { __chbCloverTokenize?: unknown }).__chbCloverTokenize;
    };
  }, [tokenizeCard]);

  if (!active) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-salon-gold/15 text-salon-gold">
              <Lock className="w-4 h-4" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-salon-ink/55">Clover secure checkout</p>
              <p className="text-sm font-medium text-salon-ink">Card, Google Pay, or Apple Pay</p>
            </div>
          </div>
          <p className="text-xs text-salon-ink/55 mt-2 leading-relaxed">
            Card data is entered in Clover-hosted fields. Use the wallet button on supported browsers (e.g. Chrome for
            Google Pay, Safari for Apple Pay).
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-[10px] uppercase tracking-widest text-salon-ink/45">
          <ShieldCheck className="w-4 h-4 text-salon-gold" />
          PCI scope reduced
        </div>
      </div>

      {sdkError && (
        <p className="text-sm text-red-800 bg-red-50 border border-red-200/80 rounded-lg px-3 py-2" role="alert">
          {sdkError}
        </p>
      )}

      <div
        id={ids.pr}
        className="min-h-[44px] w-full max-w-[120px]"
        style={{ minWidth: 90, minHeight: 40 }}
      />

      <div className="space-y-3 pt-2 border-t border-salon-ink/10">
        <p className="text-[10px] uppercase tracking-widest text-salon-ink/45">Or pay with card</p>
        <div id={ids.cardNumber} className="min-h-[48px] rounded-xl border border-salon-ink/10 bg-white px-1" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div id={ids.cardDate} className="min-h-[48px] rounded-xl border border-salon-ink/10 bg-white px-1" />
          <div id={ids.cardCvv} className="min-h-[48px] rounded-xl border border-salon-ink/10 bg-white px-1" />
          <div id={ids.cardPostal} className="min-h-[48px] rounded-xl border border-salon-ink/10 bg-white px-1" />
        </div>
        <div id={ids.response} className="text-xs text-red-800 min-h-[1.25rem]" role="alert" />
      </div>

      {walletHint && <p className="text-xs text-emerald-800">{walletHint}</p>}
    </div>
  );
}

export async function cloverTokenizeFromWindow(): Promise<{ ok: boolean; token?: string; error?: string }> {
  const fn = (window as unknown as {
    __chbCloverTokenize?: () => Promise<{ ok: boolean; token?: string; error?: string }>;
  }).__chbCloverTokenize;
  if (!fn) return { ok: false, error: 'Clover payment is not active.' };
  return fn();
}
