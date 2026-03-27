import React, { useEffect, useState } from 'react';
import {
  currentNotificationPermission,
  requestSiteNotificationPermission,
  notificationsApiAvailable,
  notificationsSecureContext,
} from '../lib/merchantNotificationPermission';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiFetch, apiJson } from '../lib/api';
import { apiLogout, useAuth } from '../context/AuthContext';
import { unlockBookingAudioForAlerts } from '../lib/bookingAlertSound';

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { user, loading, refreshMe, setUser } = useAuth();
  const [clients, setClients] = useState<UserRow[]>([]);
  const [admins, setAdmins] = useState<UserRow[]>([]);
  const [csrf, setCsrf] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [notifPerm, setNotifPerm] = useState(() => currentNotificationPermission());
  const [notifMessage, setNotifMessage] = useState('');
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);

  const load = async () => {
    try {
      const data = await apiJson<{
        ok: boolean;
        clients?: UserRow[];
        admins?: UserRow[];
        csrf?: string;
      }>('/api/admin/users.php', { method: 'GET' });
      setClients(data.clients ?? []);
      setAdmins(data.admins ?? []);
      if (data.csrf) {
        setCsrf(data.csrf);
      }
    } catch {
      setError('Could not load accounts.');
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      void load();
    }
    setNotifPerm(currentNotificationPermission());
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

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      const res = await apiFetch('/api/admin/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csrf,
          action: 'create_user',
          name,
          email,
          password,
          role: 'client',
        }),
      });
      const data = (await res.json()) as { ok?: boolean; csrf?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not create account');
      } else {
        if (data.csrf) {
          setCsrf(data.csrf);
        }
        setName('');
        setEmail('');
        setPassword('');
        await load();
      }
    } catch {
      setError('Network error');
    } finally {
      setPending(false);
    }
  };

  const onDeleteClient = async (clientId: number, clientEmail: string) => {
    if (
      !window.confirm(
        `Permanently delete the client account ${clientEmail}? Their booking history will stay but unlink from this user.`,
      )
    ) {
      return;
    }
    if (!window.confirm('Final confirmation: delete this client account? This cannot be undone.')) {
      return;
    }
    setDeleteBusyId(clientId);
    setError('');
    try {
      const res = await apiFetch('/api/admin/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf, action: 'delete_client', user_id: clientId }),
      });
      const data = (await res.json()) as { ok?: boolean; csrf?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not delete account');
      } else {
        if (data.csrf) {
          setCsrf(data.csrf);
        }
        await load();
      }
    } catch {
      setError('Network error');
    } finally {
      setDeleteBusyId(null);
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
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-salon-gold">Merchant</p>
            <h1 className="text-2xl sm:text-3xl font-serif">Accounts</h1>
            <p className="text-sm text-salon-ink/60">{user.email}</p>
            <div className="mt-2 flex flex-col gap-1">
              {notifPerm === 'default' && (
                <button
                  type="button"
                  className="text-xs text-salon-ink/45 hover:text-salon-gold underline text-left"
                  onClick={() => {
                    void (async () => {
                      setNotifMessage('');
                      if (!notificationsApiAvailable()) {
                        setNotifMessage('This browser does not support notifications.');
                        return;
                      }
                      if (!notificationsSecureContext()) {
                        setNotifMessage(
                          'Use https:// or http://localhost:3000 — not http://192.168… — so the browser can show the prompt.',
                        );
                        return;
                      }
                      const r = await requestSiteNotificationPermission();
                      setNotifPerm(currentNotificationPermission());
                      if (r === 'insecure' || r === 'unsupported') {
                        setNotifMessage('Could not open the permission prompt. Try localhost or HTTPS.');
                      } else if (r === 'granted') {
                        void unlockBookingAudioForAlerts();
                        setNotifMessage(
                          'Notifications enabled. In-tab chime plays too; if macOS/Windows is silent, check System Settings → Notifications for your browser.',
                        );
                      } else if (r === 'denied') {
                        setNotifMessage('Blocked — allow notifications in the address bar site settings.');
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
                <span className="text-xs text-salon-ink/50">Notifications blocked in browser settings.</span>
              )}
              {notifPerm === 'unsupported' && (
                <span className="text-xs text-salon-ink/50">Notifications not available in this browser.</span>
              )}
              {notifMessage && <p className="text-xs text-salon-ink/70 max-w-xl">{notifMessage}</p>}
            </div>
          </div>
          <nav className="flex flex-wrap gap-4 items-center text-sm">
            <Link to="/admin/bookings" className="text-salon-ink/60 hover:text-salon-gold">
              Bookings
            </Link>
            <Link to="/admin/users" className="text-salon-gold font-medium">
              Accounts
            </Link>
            <button type="button" onClick={() => void onLogout()} className="text-salon-ink/50 hover:text-salon-gold">
              Log out
            </button>
          </nav>
        </header>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <div className="bg-white border border-salon-ink/5 shadow-sm p-6 sm:p-8 mb-8 sm:mb-10 w-full max-w-lg min-w-0">
          <h2 className="font-serif text-lg mb-4">Create client account</h2>
          <p className="text-xs text-salon-ink/50 mb-4">
            Merchant admins are not created here — use <code className="text-[10px]">.env</code> or the database.
          </p>
          <form onSubmit={onCreate} className="space-y-4">
            <input
              type="text"
              required
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-salon-ink/20 py-2 px-3"
            />
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-salon-ink/20 py-2 px-3"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-salon-ink/20 py-2 px-3"
            />
            <button type="submit" disabled={pending} className="gold-button w-full py-2 disabled:opacity-50">
              {pending ? 'Creating…' : 'Create'}
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-white border border-salon-ink/5 p-4 sm:p-6 min-w-0">
            <h3 className="font-medium mb-4">Clients</h3>
            <ul className="text-sm space-y-3">
              {clients.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between gap-2 border-b border-salon-ink/5 pb-3 sm:pb-2"
                >
                  <span className="min-w-0 break-words">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-salon-ink/60"> — </span>
                    <span className="break-all">{c.email}</span>
                  </span>
                  <button
                    type="button"
                    disabled={deleteBusyId === c.id}
                    onClick={() => void onDeleteClient(c.id, c.email)}
                    className="text-xs uppercase tracking-wider text-red-600 hover:underline disabled:opacity-40"
                  >
                    {deleteBusyId === c.id ? 'Removing…' : 'Delete'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-salon-ink/5 p-4 sm:p-6 min-w-0">
            <h3 className="font-medium mb-4">Admins</h3>
            <ul className="text-sm space-y-2">
              {admins.map((a) => (
                <li key={a.id} className="break-words">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-salon-ink/60"> — </span>
                  <span className="break-all">{a.email}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
