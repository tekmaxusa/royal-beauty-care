import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  startMerchantRequestAlertLoop,
  stopMerchantRequestAlertLoop,
  unlockBookingAudioForAlerts,
} from '../lib/bookingAlertSound';

/** How often we check for new bookings while on merchant pages */
const POLL_MS = 8_000;

const BASELINE_EVENT = 'rbc-admin-bookings-baseline';

/** AdminBookingsPage listens: apply `detail.bookings` from poll (instant) or refetch. */
export const ADMIN_BOOKINGS_RELOAD_EVENT = 'rbc-admin-bookings-reload';

export type AdminBookingsReloadDetail = { bookings: unknown[]; csrf?: string };

export function reportAdminBookingsBaseline(maxId: number): void {
  window.dispatchEvent(new CustomEvent(BASELINE_EVENT, { detail: { maxId } }));
}

interface BookingRow {
  id: number;
  status: string;
  client_name: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
}

/**
 * While the merchant is on /admin/bookings or /admin/users, polls for new bookings
 * and shows a toast + optional desktop notification for new pending requests.
 */
export default function MerchantBookingNotifier() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [toast, setToast] = useState<string | null>(null);
  const baselineMaxIdRef = useRef<number | null>(null);
  const pollLockRef = useRef(false);

  const path = location.pathname;
  const adminArea =
    user?.role === 'admin' &&
    !loading &&
    (path.endsWith('/admin/bookings') || path.endsWith('/admin/users'));

  useEffect(() => {
    const onBaseline = (ev: Event) => {
      const d = (ev as CustomEvent<{ maxId: number }>).detail;
      if (typeof d?.maxId !== 'number') return;
      const m = d.maxId;
      baselineMaxIdRef.current =
        baselineMaxIdRef.current === null ? m : Math.max(baselineMaxIdRef.current, m);
    };
    window.addEventListener(BASELINE_EVENT, onBaseline);
    return () => window.removeEventListener(BASELINE_EVENT, onBaseline);
  }, []);

  const poll = useCallback(async () => {
    if (!adminArea) return;
    if (pollLockRef.current) return;
    pollLockRef.current = true;
    try {
      const data = await apiJson<{ ok?: boolean; bookings?: BookingRow[]; csrf?: string }>(
        `/api/admin/bookings.php?_=${Date.now()}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      );
      const bookings = data.bookings ?? [];
      const ids = bookings.map((b) => b.id);
      const maxId = ids.length === 0 ? 0 : Math.max(...ids);

      if (baselineMaxIdRef.current === null) {
        baselineMaxIdRef.current = maxId;
        return;
      }

      if (maxId > baselineMaxIdRef.current) {
        const newcomers = bookings.filter((b) => b.id > baselineMaxIdRef.current!);
        baselineMaxIdRef.current = maxId;

        if (newcomers.length > 0) {
          const first = newcomers[0];
          const msg =
            newcomers.length === 1
              ? `New booking: ${first.client_name} · ${first.service_name} (${first.booking_date})`
              : `${newcomers.length} new bookings (e.g. ${first.client_name} · ${first.booking_date})`;
          setToast(msg);
          window.dispatchEvent(
            new CustomEvent(ADMIN_BOOKINGS_RELOAD_EVENT, {
              detail: { bookings, csrf: data.csrf } satisfies AdminBookingsReloadDetail,
            }),
          );
        }
      }
    } catch {
      /* ignore poll errors */
    } finally {
      pollLockRef.current = false;
    }
  }, [adminArea]);

  useEffect(() => {
    if (!adminArea) {
      baselineMaxIdRef.current = null;
      return;
    }

    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void poll();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [adminArea, poll]);

  useEffect(() => {
    if (!adminArea) return;
    const unlock = () => {
      void unlockBookingAudioForAlerts();
    };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [adminArea]);

  /** Desktop notification + in-tab chime until dismissed. */
  useEffect(() => {
    if (!toast) {
      stopMerchantRequestAlertLoop();
      return;
    }
    startMerchantRequestAlertLoop(toast);
    return () => {
      stopMerchantRequestAlertLoop();
    };
  }, [toast]);

  return (
    <>
      {toast && (
        <div
          role="status"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[100] rounded-2xl border border-salon-ink/10 bg-white shadow-[0_12px_40px_-18px_rgba(0,0,0,0.2)] border-l-4 border-l-salon-gold p-4 sm:p-5 min-w-0"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-salon-gold mb-2">New booking</p>
          <p className="text-sm text-salon-ink leading-relaxed mb-4">{toast}</p>
          <div className="flex flex-wrap gap-3 items-center">
            <Link
              to="/admin/bookings"
              className="inline-flex text-sm font-medium text-salon-ink underline hover:text-salon-gold"
              onClick={() => setToast(null)}
            >
              View bookings
            </Link>
            <button
              type="button"
              className="text-sm text-salon-ink/50 hover:text-salon-ink"
              onClick={() => setToast(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
}
