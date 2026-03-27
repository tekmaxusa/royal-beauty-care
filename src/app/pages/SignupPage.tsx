import React, { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { apiSignup, useAuth } from '../context/AuthContext';
import { nextToReactRoute, validatedInternalNext } from '../lib/nextRoute';

function apiOriginForOAuth(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';
  if (fromEnv) {
    return fromEnv;
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8080';
  }
  return '';
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { user, loading, setUser, refreshMe } = useAuth();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const nextInternal = useMemo(() => validatedInternalNext(searchParams.get('next')), [searchParams]);
  const apiOrigin = apiOriginForOAuth();
  const googleStart =
    apiOrigin !== ''
      ? `${apiOrigin}/google-oauth-start.php?next=${encodeURIComponent(nextInternal)}`
      : '';
  const loginAfterHref = `/login?next=${encodeURIComponent(nextInternal)}`;
  const showGoogleFallback = apiOrigin === '';

  if (!loading && user) {
    return <Navigate to={nextToReactRoute(nextInternal)} replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      const u = await apiSignup(name, email, password);
      setUser(u);
      await refreshMe();
      navigate(nextToReactRoute(nextInternal), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-salon-beige pt-28 pb-20 px-6">
      <div className="max-w-md mx-auto bg-white p-10 shadow-lg border border-salon-ink/5">
        <h1 className="text-2xl font-serif text-salon-ink mb-2">Create account</h1>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-salon-ink/70 mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-b border-salon-ink/20 py-2 focus:border-salon-gold outline-none bg-transparent"
                />
              </div>
              <button type="submit" disabled={pending} className="w-full gold-button py-3 disabled:opacity-50">
                {pending ? 'Creating…' : 'Sign up'}
              </button>
            </form>
            <div className="relative my-8">
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[10px] uppercase text-salon-gold">
                Or
              </span>
              <hr className="border-salon-ink/10" />
            </div>
            {showGoogleFallback ? (
              <a
                href="https://accounts.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center border border-salon-ink/20 py-3 text-sm uppercase tracking-widest hover:border-salon-gold transition-colors"
              >
                <span className="font-semibold text-salon-ink/80 mr-1">G</span> Continue with Google
              </a>
            ) : (
              <a
                href={googleStart}
                className="block w-full text-center border border-salon-ink/20 py-3 text-sm uppercase tracking-widest hover:border-salon-gold transition-colors"
              >
                <span className="font-semibold text-salon-ink/80 mr-1">G</span> Continue with Google
              </a>
            )}
            {showGoogleFallback && (
              <p className="text-xs text-salon-ink/50 mt-2">Set VITE_API_URL for Google sign-in through this site.</p>
            )}
        <p className="text-sm text-salon-ink/60 mt-8">
          Already registered?{' '}
          <Link to={loginAfterHref} className="text-salon-gold hover:underline">
            Log in
          </Link>
        </p>
        <p className="text-sm mt-4">
          <Link to="/" className="text-salon-ink/50 hover:text-salon-gold">
            ← Back to site
          </Link>
        </p>
      </div>
    </div>
  );
}
