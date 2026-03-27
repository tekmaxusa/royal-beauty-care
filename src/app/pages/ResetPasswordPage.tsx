import React, { useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return <Navigate to="/forgot-password" replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) {
      setMsg({ ok: false, text: 'Password must be at least 8 characters.' });
      return;
    }
    if (password !== password2) {
      setMsg({ ok: false, text: 'Passwords do not match.' });
      return;
    }
    setPending(true);
    try {
      const res = await apiFetch('/api/auth/reset-password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) {
        setMsg({ ok: false, text: data.error || 'Reset failed.' });
      } else {
        setMsg({ ok: true, text: data.message || 'Password updated.' });
        setDone(true);
      }
    } catch {
      setMsg({ ok: false, text: 'Network error.' });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-salon-beige pt-28 pb-20 px-6">
      <div className="max-w-md mx-auto bg-white p-10 shadow-lg border border-salon-ink/5">
        <h1 className="text-2xl font-serif text-salon-ink mb-2">Set a new password</h1>
        <p className="text-sm text-salon-ink/60 mb-6">Choose a new password for your client account.</p>
        {msg && (
          <p className={`text-sm mb-4 ${msg.ok ? 'text-emerald-800' : 'text-red-600'}`}>{msg.text}</p>
        )}
        {done ? (
          <Link to="/login" className="inline-block gold-button py-3 px-6 text-sm text-center w-full">
            Sign in
          </Link>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-2">
                New password
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-2">
                Confirm password
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
              />
            </div>
            <button type="submit" disabled={pending} className="w-full gold-button py-3 disabled:opacity-50">
              {pending ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
        {!done && (
          <p className="text-sm text-salon-ink/60 mt-8">
            <Link to="/login" className="text-salon-gold hover:underline">
              Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
