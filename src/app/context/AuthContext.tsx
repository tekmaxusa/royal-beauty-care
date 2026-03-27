import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  apiJson,
  clearAccessToken,
  ensureAccessTokenFromRefreshCookie,
  setAccessToken,
} from '../lib/api';

export type UserRole = 'client' | 'admin';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

interface MeResponse {
  ok: boolean;
  user: AuthUser | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refreshMe: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      await ensureAccessTokenFromRefreshCookie();
      const data = await apiJson<MeResponse>('/api/auth/me.php', { method: 'GET' });
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const value = useMemo(
    () => ({ user, loading, refreshMe, setUser }),
    [user, loading, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export async function apiLogin(email: string, password: string): Promise<AuthUser> {
  const res = await apiFetch('/api/auth/login.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { ok?: boolean; user?: AuthUser; accessToken?: string; error?: string };
  if (!res.ok || !data.ok || !data.user) {
    throw new Error(data.error || 'Login failed');
  }
  if (data.accessToken) {
    setAccessToken(data.accessToken);
  }
  return data.user;
}

export async function apiAdminLogin(email: string, password: string): Promise<AuthUser> {
  const res = await apiFetch('/api/auth/admin-login.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { ok?: boolean; user?: AuthUser; accessToken?: string; error?: string };
  if (!res.ok || !data.ok || !data.user) {
    throw new Error(data.error || 'Login failed');
  }
  if (data.accessToken) {
    setAccessToken(data.accessToken);
  }
  return data.user;
}

/** Creates account and starts session (same response shape as login). */
export async function apiSignup(name: string, email: string, password: string): Promise<AuthUser> {
  const res = await apiFetch('/api/auth/signup.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = (await res.json()) as { ok?: boolean; user?: AuthUser; accessToken?: string; error?: string };
  if (!res.ok || !data.ok || !data.user) {
    throw new Error(data.error || 'Sign up failed');
  }
  if (data.accessToken) {
    setAccessToken(data.accessToken);
  }
  return data.user;
}

/** Clears the PHP session cookie via JSON API (works through Vite `/api` proxy in dev). */
export async function apiLogout(): Promise<void> {
  try {
    const res = await apiFetch('/api/auth/logout.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}',
    });
    await res.text();
  } catch {
    /* still clear client state below */
  }
  clearAccessToken();
}
