import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export const isNative = Capacitor.isNativePlatform();
/** Web is served by the API server (same origin). The Android app calls the deployed API. */
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const TOKEN_KEY = 'iw-session-token';
/** Demo builds answer every call in the browser with sample data (see demo.ts); nothing reaches a server. */
export const isDemo = import.meta.env.VITE_DEMO === 'true';

export interface Office { city: string; state: string; lat: number; lng: number; isPrimary: boolean }
export interface Company {
  id: string; name: string; industry: string; size: string | null; color: string; initials: string;
  isDemo: boolean; reviewCount: number; rating: number | null; offices: Office[];
}
export interface CompanyDetail extends Company {
  breakdown: Record<'pay' | 'management' | 'culture' | 'growth' | 'balance', number | null>;
}
export interface Ratings { overall: number; pay: number; management: number; culture: number; growth: number; balance: number }
export interface PublicReview extends Ratings {
  id: string; employment: 'current' | 'former'; language: string; title: string; pros: string; cons: string;
  isDemo: boolean; publishedAt: string;
}
export type ReviewStatus = 'pending' | 'published' | 'changes_requested' | 'rejected' | 'hidden';
export interface OwnReview extends Omit<PublicReview, 'isDemo'> {
  companyId: string; companyName: string; status: ReviewStatus; moderatorNote: string | null;
  version: number; appealOpen: boolean;
}
export interface ModReview extends Omit<OwnReview, 'appealOpen' | 'publishedAt'> {}
export interface Me { id: string; email: string; isModerator: boolean }

export class ApiFailure extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}

let tokenCache: string | null | undefined;
async function token(): Promise<string | null> {
  if (!isNative) return null;
  if (tokenCache === undefined) tokenCache = (await Preferences.get({ key: TOKEN_KEY })).value;
  return tokenCache;
}
async function setToken(value: string | null) {
  tokenCache = value;
  if (value) await Preferences.set({ key: TOKEN_KEY, value });
  else await Preferences.remove({ key: TOKEN_KEY });
}

function csrf(): string {
  return document.cookie.split('; ').find((c) => c.startsWith('iw_csrf='))?.slice(8) ?? '';
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (isDemo) return (await import('./demo')).demoRequest(method, path, body) as Promise<T>;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const bearer = await token();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  else if (method !== 'GET') {
    if (!csrf()) await fetch(`${BASE}/api/me`, { credentials: 'include' }); // obtains the CSRF cookie
    headers['X-CSRF-Token'] = csrf();
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method, headers, credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiFailure('unavailable', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && bearer) await setToken(null);
    throw new ApiFailure(data.error ?? 'unavailable', res.status);
  }
  return data as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') s.set(k, String(v));
  return s.toString();
};

export type ReviewInput = Ratings & {
  companyId: string; employment: 'current' | 'former'; language: string;
  title: string; pros: string; cons: string; consent: true;
};

export const api = {
  companies: (p: { q?: string; qIndustries?: string; industry?: string; minRating?: number; sort?: string; bbox?: string }) =>
    request<{ companies: Company[] }>('GET', `/api/companies?${qs(p)}`),
  company: (id: string) => request<{ company: CompanyDetail }>('GET', `/api/companies/${encodeURIComponent(id)}`),
  reviews: (id: string, page: number) =>
    request<{ reviews: PublicReview[]; total: number; page: number; pageSize: number }>('GET', `/api/companies/${encodeURIComponent(id)}/reviews?page=${page}`),
  report: (reviewId: string, reason: string) => request('POST', `/api/reviews/${reviewId}/reports`, { reason }),

  me: () => request<{ me: Me | null }>('GET', '/api/me'),
  async auth(mode: 'login' | 'register', email: string, password: string) {
    const res = await request<{ me: Me; token?: string }>('POST', `/api/auth/${mode}`, { email, password, client: isNative ? 'native' : 'web' });
    if (res.token) await setToken(res.token);
    return res.me;
  },
  async logout() {
    await request('POST', '/api/auth/logout').catch(() => {});
    await setToken(null);
  },
  exportData: () => request<unknown>('GET', '/api/me/export'),
  async deleteAccount() {
    await request('DELETE', '/api/me');
    await setToken(null);
  },

  myReviews: () => request<{ reviews: OwnReview[] }>('GET', '/api/me/reviews'),
  createReview: (input: ReviewInput) => request<{ review: OwnReview }>('POST', '/api/reviews', input),
  updateReview: (id: string, input: Omit<ReviewInput, 'companyId'> & { version: number }) =>
    request<{ review: OwnReview }>('PUT', `/api/reviews/${id}`, input),
  deleteReview: (id: string) => request('DELETE', `/api/reviews/${id}`),
  appeal: (id: string, message: string) => request('POST', `/api/reviews/${id}/appeal`, { message }),

  queue: () => request<{
    pending: ModReview[];
    reports: { id: string; reason: string; createdAt: string; review: ModReview }[];
    appeals: { id: string; message: string; createdAt: string; review: ModReview }[];
  }>('GET', '/api/mod/queue'),
  decide: (id: string, action: 'publish' | 'reject' | 'request_changes' | 'hide', version: number, note?: string) =>
    request('POST', `/api/mod/reviews/${id}/decision`, { action, version, note }),
  dismissReport: (id: string) => request('POST', `/api/mod/reports/${id}/dismiss`),
  decideAppeal: (id: string, decision: 'accept' | 'decline', note?: string) =>
    request('POST', `/api/mod/appeals/${id}`, { decision, note }),
};
