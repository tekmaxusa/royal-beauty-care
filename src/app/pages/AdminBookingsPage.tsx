import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiFetch, apiJson } from '../lib/api';
import { apiLogout, useAuth } from '../context/AuthContext';
import {
  ADMIN_BOOKINGS_RELOAD_EVENT,
  type AdminBookingsReloadDetail,
  reportAdminBookingsBaseline,
} from '../components/MerchantBookingNotifier';
import {
  currentNotificationPermission,
  requestSiteNotificationPermission,
  notificationsApiAvailable,
  notificationsSecureContext,
} from '../lib/merchantNotificationPermission';
import { playMerchantRequestAlertSound, unlockBookingAudioForAlerts } from '../lib/bookingAlertSound';
import { formatBookingPlacedAt } from '../lib/bookingDisplay';

const ADMIN_BOOKINGS_PAGE_SIZE = 10;

interface BookingRow {
  id: number;
  user_id: number | null;
  client_name: string;
  client_email: string;
  service_category: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  service_total_cents: number;
  deposit_due_cents: number;
  deposit_paid_cents: number;
  deposit_refunded_cents?: number;
  payment_status: string;
  created_at: string;
}

function centsToUsd(cents: number): string {
  return `$${(Math.max(0, Number(cents || 0)) / 100).toFixed(2)}`;
}

/** Net deposit kept after refunds (for balance math). */
function netDepositCents(b: BookingRow): number {
  const paid = Number(b.deposit_paid_cents || b.deposit_due_cents || 0);
  const ref = Number(b.deposit_refunded_cents || 0);
  return Math.max(0, paid - ref);
}

function canRefundDeposit(b: BookingRow): boolean {
  const ps = b.payment_status || '';
  if (ps !== 'deposit_paid' && ps !== 'deposit_partially_refunded') return false;
  return netDepositCents(b) > 0;
}

export default function AdminBookingsPage() {
  const navigate = useNavigate();
  const { user, loading, refreshMe, setUser } = useAuth();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [csrf, setCsrf] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [notifPerm, setNotifPerm] = useState(() => currentNotificationPermission());
  const [notifMessage, setNotifMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await apiJson<{ ok: boolean; bookings?: BookingRow[]; csrf?: string }>(
        `/api/admin/bookings.php?_=${Date.now()}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      );
      const list = data.bookings ?? [];
      setRows(list);
      const maxId = list.length === 0 ? 0 : Math.max(...list.map((b) => b.id));
      reportAdminBookingsBaseline(maxId);
      if (data.csrf) {
        setCsrf(data.csrf);
      }
    } catch {
      setError('Could not load bookings.');
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      void load();
    }
  }, [user, load]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(rows.length / ADMIN_BOOKINGS_PAGE_SIZE)), [rows.length]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * ADMIN_BOOKINGS_PAGE_SIZE;
    return rows.slice(start, start + ADMIN_BOOKINGS_PAGE_SIZE);
  }, [rows, page]);

  const visibleIds = useMemo(() => paginatedRows.map((b) => b.id), [paginatedRows]);

  useEffect(() => {
    const valid = new Set(rows.map((r) => r.id));
    setSelectedIds((s) => s.filter((id) => valid.has(id)));
  }, [rows]);

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.includes(id));

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) {
      el.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [someVisibleSelected, allVisibleSelected]);

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((s) => s.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((s) => [...new Set([...s, ...visibleIds])]);
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    setNotifPerm(currentNotificationPermission());
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const onReload = (ev: Event) => {
      const detail = (ev as CustomEvent<AdminBookingsReloadDetail>).detail;
      const list = detail?.bookings;
      if (Array.isArray(list) && list.length > 0) {
        setError('');
        setRows(list as BookingRow[]);
        const maxId = Math.max(...list.map((b) => Number((b as BookingRow).id)));
        reportAdminBookingsBaseline(maxId);
        if (typeof detail?.csrf === 'string' && detail.csrf !== '') {
          setCsrf(detail.csrf);
        }
        return;
      }
      if (Array.isArray(list) && list.length === 0) {
        setError('');
        setRows([]);
        reportAdminBookingsBaseline(0);
        if (typeof detail?.csrf === 'string' && detail.csrf !== '') {
          setCsrf(detail.csrf);
        }
        return;
      }
      void loadRef.current();
    };
    window.addEventListener(ADMIN_BOOKINGS_RELOAD_EVENT, onReload);
    return () => window.removeEventListener(ADMIN_BOOKINGS_RELOAD_EVENT, onReload);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-salon-beige pt-28 flex justify-center">
        <p className="text-salon-ink/60">Loading…</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  const actCancel = async (b: BookingRow) => {
    let msg = `Cancel booking #${b.id}? The client will be emailed.`;
    if (canRefundDeposit(b) && netDepositCents(b) > 0) {
      msg += ` The card deposit (${centsToUsd(netDepositCents(b))}) will be reversed via CardConnect: void if still allowed, otherwise refund.`;
    }
    if (!window.confirm(msg)) {
      return;
    }
    setBusyId(b.id);
    setError('');
    setInfo('');
    try {
      const res = await apiFetch('/api/admin/bookings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf, action: 'cancel', booking_id: b.id }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        csrf?: string;
        error?: string;
        message?: string;
        payment_reversal?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Update failed');
      } else {
        if (data.csrf) {
          setCsrf(data.csrf);
        }
        setInfo(data.message || 'Booking cancelled.');
        await load();
      }
    } catch {
      setError('Network error');
    } finally {
      setBusyId(null);
    }
  };

  const bulkDeleteSelected = async () => {
    if (selectedIds.length === 0 || bulkBusy) return;
    const n = selectedIds.length;
    if (!window.confirm(`Delete ${n} selected booking(s)? This cannot be undone.`)) {
      return;
    }
    if (
      !window.confirm(
        `Final confirmation: permanently remove ${n} booking(s) from the database? This will not email clients.`,
      )
    ) {
      return;
    }
    setBulkBusy(true);
    setError('');
    setInfo('');
    try {
      const res = await apiFetch('/api/admin/bookings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf, action: 'delete_many', booking_ids: selectedIds }),
      });
      const data = (await res.json()) as { ok?: boolean; csrf?: string; error?: string; deleted?: number };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Delete failed');
      } else {
        if (data.csrf) {
          setCsrf(data.csrf);
        }
        setSelectedIds([]);
        await load();
      }
    } catch {
      setError('Network error');
    } finally {
      setBulkBusy(false);
    }
  };

  const onLogout = async () => {
    setUser(null);
    await apiLogout();
    try {
      await refreshMe();
    } catch {
      setUser(null);
    }
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-salon-beige pt-24 sm:pt-28 pb-12 sm:pb-20 px-4 sm:px-6 overflow-x-hidden">
      <div className="max-w-6xl mx-auto min-w-0">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-salon-gold">Merchant</p>
            <h1 className="text-2xl sm:text-3xl font-serif">Bookings</h1>
            <p className="text-sm text-salon-ink/60">{user.email}</p>
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <button
                  type="button"
                  className="text-xs text-salon-ink/45 hover:text-salon-gold underline"
                  onClick={() => {
                    void unlockBookingAudioForAlerts().then(() => playMerchantRequestAlertSound());
                  }}
                >
                  Test alert sound
                </button>
                {notifPerm === 'default' && (
                  <button
                    type="button"
                    className="text-xs text-salon-ink/45 hover:text-salon-gold underline"
                    onClick={() => {
                      void (async () => {
                        setNotifMessage('');
                        if (!notificationsApiAvailable()) {
                          setNotifMessage('This browser does not support notifications.');
                          return;
                        }
                        if (!notificationsSecureContext()) {
                          setNotifMessage(
                            'Notifications need a secure context. Use https:// or open the app at http://localhost:3000 (not http://192.168… or another IP).',
                          );
                          return;
                        }
                        const r = await requestSiteNotificationPermission();
                        setNotifPerm(currentNotificationPermission());
                        if (r === 'insecure' || r === 'unsupported') {
                          setNotifMessage(
                            'Could not open the permission prompt. Try https:// or http://localhost:3000.',
                          );
                        } else if (r === 'granted') {
                          void unlockBookingAudioForAlerts();
                          setNotifMessage(
                            'Notifications enabled. In-tab chime plays too; if macOS/Windows is silent, check System Settings → Notifications for your browser.',
                          );
                        } else if (r === 'denied') {
                          setNotifMessage(
                            'Notifications are blocked. Use the lock or site icon in the address bar and allow notifications for this site.',
                          );
                        }
                      })();
                    }}
                  >
                    Allow notifications (banner + in-tab chime)
                  </button>
                )}
                {notifPerm === 'granted' && (
                  <span className="text-xs text-emerald-700/90">Notifications on for this site</span>
                )}
                {notifPerm === 'denied' && (
                  <span className="text-xs text-salon-ink/50">
                    Notifications blocked — change in browser site settings to enable sounds.
                  </span>
                )}
                {notifPerm === 'unsupported' && (
                  <span className="text-xs text-salon-ink/50">Notifications API not available in this browser.</span>
                )}
              </div>
              {notifMessage && <p className="text-xs text-salon-ink/70 max-w-xl mt-1">{notifMessage}</p>}
            </div>
          </div>
          <nav className="flex flex-wrap gap-4 items-center text-sm">
            <Link to="/admin/bookings" className="text-salon-gold font-medium">
              Bookings
            </Link>
            <Link to="/admin/users" className="text-salon-ink/60 hover:text-salon-gold">
              Accounts
            </Link>
            <button type="button" onClick={() => void onLogout()} className="text-salon-ink/50 hover:text-salon-gold">
              Log out
            </button>
          </nav>
        </header>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {info && !error && <p className="text-emerald-800 text-sm mb-4">{info}</p>}

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              type="button"
              disabled={selectedIds.length === 0 || bulkBusy || busyId !== null}
              onClick={() => void bulkDeleteSelected()}
              className="text-xs uppercase tracking-wider px-3 py-2 border border-red-200 text-red-700 rounded hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto text-center"
            >
              {bulkBusy ? 'Deleting…' : `Delete selected (${selectedIds.length})`}
            </button>
          </div>
        )}

        {/* Narrow viewports: stacked cards — no horizontal scroll */}
        <div className="xl:hidden space-y-4">
          {rows.length === 0 ? (
            <div className="bg-white border border-salon-ink/5 shadow-sm p-8 text-center text-salon-ink/50 text-sm">
              No bookings yet.
            </div>
          ) : (
            paginatedRows.map((b) => (
              <article
                key={b.id}
                className="bg-white border border-salon-ink/5 shadow-sm rounded-lg p-4 space-y-3 min-w-0"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <input
                    type="checkbox"
                    className="rounded border-salon-ink/30 mt-1 shrink-0"
                    checked={selectedIds.includes(b.id)}
                    onChange={() => toggleOne(b.id)}
                    disabled={bulkBusy}
                    aria-label={`Select booking ${b.id}`}
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium text-salon-ink">#{b.id}</span>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-salon-beige capitalize">
                        {b.status}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-salon-ink/45">
                        {(b.payment_status || 'none').replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-salon-ink break-words">{b.client_name}</p>
                      <p className="text-xs text-salon-ink/50 break-all">{b.client_email}</p>
                    </div>
                    <p className="text-sm text-salon-ink/80 break-words">{b.service_name}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-salon-ink/45 block">Date</span>
                        {b.booking_date}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-salon-ink/45 block">Time</span>
                        {String(b.booking_time).slice(0, 5)}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-salon-ink/45 block">Total</span>
                        {centsToUsd(b.service_total_cents)}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-salon-ink/45 block">Deposit</span>
                        {centsToUsd(netDepositCents(b))}
                        {Number(b.deposit_refunded_cents || 0) > 0 && (
                          <span className="block text-[10px] text-salon-ink/45">
                            refunded {centsToUsd(Number(b.deposit_refunded_cents || 0))}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] uppercase tracking-wider text-salon-ink/45 block">Remaining</span>
                        {centsToUsd(Math.max(0, Number(b.service_total_cents || 0) - netDepositCents(b)))}
                      </div>
                      <div className="col-span-2 text-xs text-salon-ink/55">
                        <span className="text-[10px] uppercase tracking-wider text-salon-ink/45 block">Placed</span>
                        {formatBookingPlacedAt(b.created_at)}
                      </div>
                    </div>
                    {(b.status === 'confirmed' || b.status === 'pending') && (
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => void actCancel(b)}
                        className="w-full px-3 py-2.5 rounded-lg border border-red-200 bg-white text-red-700 text-[11px] font-semibold uppercase tracking-wide hover:bg-red-50 disabled:opacity-40"
                      >
                        {busyId === b.id ? 'Working…' : 'Cancel booking'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Wide screens: full table */}
        <div className="hidden xl:block bg-white border border-salon-ink/5 shadow-sm rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[10px] uppercase tracking-widest text-salon-ink/50">
                <th className="p-3 w-10">
                  <span className="sr-only">Select</span>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="rounded border-salon-ink/30"
                    checked={allVisibleSelected}
                    onChange={() => toggleSelectAllVisible()}
                    disabled={rows.length === 0 || bulkBusy}
                    aria-label="Select all bookings on this page"
                  />
                </th>
                <th className="p-3">ID</th>
                <th className="p-3">Status</th>
                <th className="p-3 w-[14%]">Client</th>
                <th className="p-3 w-[12%]">Service</th>
                <th className="p-3">Date</th>
                <th className="p-3">Time</th>
                <th className="p-3">Total</th>
                <th className="p-3">Deposit</th>
                <th className="p-3">Remaining</th>
                <th className="p-3">Pay status</th>
                <th className="p-3 min-w-[140px]">Order placed</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-salon-ink/50">
                    No bookings yet.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((b) => (
                  <tr key={b.id} className="border-b border-salon-ink/5">
                    <td className="p-3 align-top">
                      <input
                        type="checkbox"
                        className="rounded border-salon-ink/30"
                        checked={selectedIds.includes(b.id)}
                        onChange={() => toggleOne(b.id)}
                        disabled={bulkBusy}
                        aria-label={`Select booking ${b.id}`}
                      />
                    </td>
                    <td className="p-3">{b.id}</td>
                    <td className="p-3 capitalize">{b.status}</td>
                    <td className="p-3">
                      {b.client_name}
                      <br />
                      <span className="text-salon-ink/50 text-xs">{b.client_email}</span>
                    </td>
                    <td className="p-3 break-words">{b.service_name}</td>
                    <td className="p-3">{b.booking_date}</td>
                    <td className="p-3">{String(b.booking_time).slice(0, 5)}</td>
                    <td className="p-3 whitespace-nowrap">{centsToUsd(b.service_total_cents)}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span>{centsToUsd(netDepositCents(b))}</span>
                      {Number(b.deposit_refunded_cents || 0) > 0 && (
                        <span className="block text-[10px] text-salon-ink/45">
                          refunded {centsToUsd(Number(b.deposit_refunded_cents || 0))}
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {centsToUsd(
                        Math.max(0, Number(b.service_total_cents || 0) - netDepositCents(b)),
                      )}
                    </td>
                    <td className="p-3 capitalize">
                      {(b.payment_status || 'none').replace(/_/g, ' ')}
                    </td>
                    <td className="p-3 text-salon-ink/60 text-xs whitespace-nowrap">
                      {formatBookingPlacedAt(b.created_at)}
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex flex-col gap-2 min-w-[9.5rem]">
                        {(b.status === 'confirmed' || b.status === 'pending') && (
                          <button
                            type="button"
                            disabled={busyId === b.id}
                            onClick={() => void actCancel(b)}
                            className="inline-flex justify-center items-center w-full px-3 py-2 rounded-lg border border-red-200 bg-white text-red-700 text-[11px] font-semibold uppercase tracking-wide shadow-sm hover:bg-red-50 hover:border-red-300 hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-sm"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {rows.length > ADMIN_BOOKINGS_PAGE_SIZE && (
          <nav
            className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-salon-ink/70"
            aria-label="Booking pages"
          >
            <span>
              Page {page} of {totalPages} ({rows.length} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-salon-ink/15 rounded disabled:opacity-40 hover:border-salon-gold"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-salon-ink/15 rounded disabled:opacity-40 hover:border-salon-gold"
              >
                Next
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
