import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setPending(true);
    try {
      const res = await apiFetch('/api/auth/forgot-password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) {
        setMsg({ ok: false, text: data.error || 'Something went wrong.' });
      } else {
        setMsg({ ok: true, text: data.message || 'Check your email.' });
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
        <h1 className="text-2xl font-serif text-salon-ink mb-2">Forgot password</h1>
        <p className="text-sm text-salon-ink/60 mb-6">
          Enter the email for your client account. If it exists and uses a password, we will send a reset link (valid for
          one hour).
        </p>
        {msg && (
          <p className={`text-sm mb-4 ${msg.ok ? 'text-emerald-800' : 'text-red-600'}`}>{msg.text}</p>
        )}
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-2">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
            />
          </div>
          <button type="submit" disabled={pending} className="w-full gold-button py-3 disabled:opacity-50">
            {pending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <p className="text-sm text-salon-ink/60 mt-8">
          <Link to="/login" className="text-salon-gold hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
