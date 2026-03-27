/**
 * API base: VITE_API_URL in production (e.g. https://api.example.com).
 * Local dev: leave unset and use Vite proxy → PHP container (see vite.config.ts).
 */
const rawBase = (import.meta.env.VITE_API_URL as string | undefined) || '';
let accessTokenMemory = '';

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (rawBase) {
    return `${rawBase.replace(/\/$/, '')}${p}`;
  }
  return p;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  if (accessTokenMemory) {
    headers.Authorization = `Bearer ${accessTokenMemory}`;
  }

  let res = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers,
  });
  if (res.status === 401 && !path.includes('/api/auth/refresh.php')) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retryHeaders: Record<string, string> = {
        ...(init?.headers as Record<string, string>),
      };
      if (accessTokenMemory) {
        retryHeaders.Authorization = `Bearer ${accessTokenMemory}`;
      }
      res = await fetch(apiUrl(path), {
        ...init,
        credentials: 'include',
        headers: retryHeaders,
      });
    }
  }
  return res;
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  const data = (await res.json()) as T;
  return data;
}

export async function apiReadJsonBody<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

interface RefreshResponse {
  ok?: boolean;
  accessToken?: string;
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl('/api/auth/refresh.php'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) {
      return false;
    }
    const data = (await res.json()) as RefreshResponse;
    if (!data.ok || !data.accessToken) {
      return false;
    }
    accessTokenMemory = data.accessToken;
    return true;
  } catch {
    return false;
  }
}

/**
 * After a full page reload the in-memory access token is empty. If the browser
 * still has a refresh-token cookie, exchange it for an access token before GET /me.
 * (Option A: me.php stays 200 + user null when truly logged out.)
 */
export async function ensureAccessTokenFromRefreshCookie(): Promise<boolean> {
  if (accessTokenMemory) {
    return true;
  }
  return tryRefreshToken();
}

export function setAccessToken(token: string): void {
  accessTokenMemory = token.trim();
}

export function clearAccessToken(): void {
  accessTokenMemory = '';
}
