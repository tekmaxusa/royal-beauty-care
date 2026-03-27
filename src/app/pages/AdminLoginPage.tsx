import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiAdminLogin, useAuth } from '../context/AuthContext';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { refreshMe, setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      const u = await apiAdminLogin(email, password);
      setUser(u);
      await refreshMe();
      navigate('/admin/bookings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-salon-beige pt-24 sm:pt-28 pb-12 sm:pb-20 px-4 sm:px-6 overflow-x-hidden">
      <div className="max-w-md mx-auto w-full min-w-0 bg-white p-6 sm:p-10 shadow-lg border border-salon-ink/5">
        <p className="text-[10px] uppercase tracking-widest text-salon-gold mb-2">Merchant</p>
        <h1 className="text-2xl font-serif text-salon-ink mb-2">Sign in</h1>
        <p className="text-sm text-salon-ink/55 mb-6 break-words">
          Merchant sign-in only — client accounts cannot use this page. Use the admin email and password from your server (
          <code className="text-xs break-all">ADMIN_EMAIL</code> / <code className="text-xs break-all">ADMIN_INITIAL_PASSWORD</code>).
        </p>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-2">Email</label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-2">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
            />
          </div>
          <button type="submit" disabled={pending} className="w-full gold-button py-3 disabled:opacity-50">
            {pending ? 'Please wait…' : 'Sign in'}
          </button>
        </form>
        <p className="text-sm mt-8">
          <Link to="/" className="text-salon-ink/50 hover:text-salon-gold">
            ← Home
          </Link>
        </p>
      </div>
    </div>
  );
}
