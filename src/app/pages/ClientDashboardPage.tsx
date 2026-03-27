import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiFetch, apiJson } from '../lib/api';
import { apiLogout, useAuth } from '../context/AuthContext';
import {
  formatBookingDateLabel,
  formatBookingPlacedAt,
  formatBookingTimeLabel,
} from '../lib/bookingDisplay';

interface BookingRow {
  id: number;
  service_category: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  created_at: string;
  /** false = inside minimum notice window (e.g. 24h); omit/true = cancel allowed */
  cancel_allowed?: boolean;
}

function serviceLabel(b: BookingRow): string {
  const cat = (b.service_category || '').trim();
  const name = (b.service_name || '').trim();
  if (cat && name) return `${cat} — ${name}`;
  return cat || name || '—';
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'confirmed') return 'bg-emerald-100 text-emerald-900 border-emerald-200';
  if (s === 'cancelled' || s === 'canceled') return 'bg-stone-100 text-stone-600 border-stone-200';
  return 'bg-amber-50 text-amber-900 border-amber-200';
}

const CLIENT_BOOKINGS_PAGE_SIZE = 10;

export default function ClientDashboardPage() {
  const navigate = useNavigate();
  const { user, loading, refreshMe, setUser } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [error, setError] = useState('');
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user || user.role !== 'client') {
      return;
    }
    void (async () => {
      try {
        const data = await apiJson<{ ok: boolean; bookings?: BookingRow[] }>('/api/client/bookings.php', {
          method: 'GET',
        });
        setBookings(data.bookings ?? []);
      } catch {
        setError('Could not load appointments.');
        setBookings([]);
      }
    })();
  }, [user]);

  const totalPages = useMemo(() => {
    if (!bookings || bookings.length === 0) return 1;
    return Math.max(1, Math.ceil(bookings.length / CLIENT_BOOKINGS_PAGE_SIZE));
  }, [bookings]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedBookings = useMemo(() => {
    if (!bookings) return [];
    const start = (page - 1) * CLIENT_BOOKINGS_PAGE_SIZE;
    return bookings.slice(start, start + CLIENT_BOOKINGS_PAGE_SIZE);
  }, [bookings, page]);

  if (loading) {
    return (
      <div className="min-h-screen bg-salon-beige pt-28 flex items-center justify-center">
        <p className="text-salon-ink/60">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login?next=%2Fdashboard%2F" replace />;
  }

  const onLogout = async () => {
    setUser(null);
    await apiLogout();
    try {
      await refreshMe();
    } catch {
      setUser(null);
    }
    navigate('/login', { replace: true });
  };

  const onCancelBooking = async (bookingId: number) => {
    if (!window.confirm('Cancel this appointment?')) return;
    setError('');
    setCancelingId(bookingId);
    try {
      const res = await apiFetch('/api/client/bookings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', booking_id: bookingId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not cancel appointment.');
        return;
      }
      setBookings((prev) =>
        (prev ?? []).map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
      );
    } catch {
      setError('Could not cancel appointment.');
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-salon-beige pt-36 md:pt-40 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-salon-gold mb-1">Client account</p>
              <h1 className="text-3xl sm:text-4xl font-serif text-salon-ink">Dashboard</h1>
              <p className="text-sm text-salon-ink/60 mt-2 max-w-xl">
                View your appointments and status in one place.
              </p>
            </div>
            <Link to="/booking" className="gold-button text-sm py-2.5 px-5 whitespace-nowrap text-center">
              Book appointment
            </Link>
          </div>
        </header>

        <section
          className="rounded-2xl border border-salon-ink/10 bg-white shadow-[0_20px_50px_-24px_rgba(0,0,0,0.15)] p-6 sm:p-8 mb-10"
          aria-label="Signed-in account"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-salon-gold mb-2">Signed in</p>
              <p className="font-medium text-salon-ink">{user.name}</p>
              <p className="text-sm text-salon-ink/60">{user.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => void onLogout()}
                className="text-sm uppercase tracking-widest text-salon-ink/60 hover:text-salon-gold"
              >
                Log out
              </button>
            </div>
          </div>
        </section>

        <div className="rounded-2xl border border-salon-ink/10 bg-white shadow-[0_20px_50px_-24px_rgba(0,0,0,0.15)] p-6 sm:p-8">
          <h2 className="text-lg font-serif mb-2" id="rbc-dash-appts">
            Your appointments
          </h2>
          <p className="text-sm text-salon-ink/60 mb-6">
            New appointments are <strong>confirmed</strong> when you book. If the salon cancels, you will get an email.
            {' '}
            You may cancel online at least <strong>24 hours</strong> before your appointment; inside that window, please call
            the salon.
          </p>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          {bookings === null ? (
            <p className="text-salon-ink/50">Loading…</p>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-salon-ink/10" role="status">
              <p className="text-salon-ink font-medium mb-1">No appointments yet</p>
              <p className="text-sm text-salon-ink/60 mb-6">
                Submit a booking request to see it listed here with live status.
              </p>
              <Link to="/booking" className="gold-button inline-block py-2 px-6 text-sm">
                Request an appointment
              </Link>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-salon-ink/10 text-[10px] uppercase tracking-widest text-salon-ink/50">
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Service</th>
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Time</th>
                    <th className="py-3">Order placed</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBookings.map((b) => (
                    <tr key={b.id} className="border-b border-salon-ink/5">
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${statusBadgeClass(b.status)}`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{serviceLabel(b)}</td>
                      <td className="py-3 pr-4">{formatBookingDateLabel(b.booking_date)}</td>
                      <td className="py-3 pr-4">{formatBookingTimeLabel(b.booking_time)}</td>
                      <td className="py-3 text-salon-ink/60">{formatBookingPlacedAt(b.created_at)}</td>
                      <td className="py-3 text-right">
                        {(() => {
                          const s = b.status.toLowerCase();
                          const active = s === 'confirmed' || s === 'pending';
                          if (!active) {
                            return <span className="text-xs text-salon-ink/40">—</span>;
                          }
                          if (b.cancel_allowed === false) {
                            return (
                              <span
                                className="text-xs text-salon-ink/50 max-w-[140px] inline-block text-right leading-snug"
                                title="Inside 24-hour cancellation window"
                              >
                                Within 24h — call salon
                              </span>
                            );
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => void onCancelBooking(b.id)}
                              disabled={cancelingId === b.id}
                              className="text-xs uppercase tracking-widest text-red-700 hover:text-red-800 disabled:opacity-50"
                            >
                              {cancelingId === b.id ? 'Canceling…' : 'Cancel'}
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {bookings.length > CLIENT_BOOKINGS_PAGE_SIZE && (
              <nav
                className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-salon-ink/70"
                aria-label="Appointment pages"
              >
                <span>
                  Page {page} of {totalPages} ({bookings.length} total)
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
            </>
          )}
        </div>

        <p className="mt-8 text-center">
          <Link to="/" className="text-sm text-salon-ink/50 hover:text-salon-gold">
            ← Back to site
          </Link>
        </p>
      </div>
    </div>
  );
}
