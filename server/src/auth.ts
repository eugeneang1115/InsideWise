import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from './config.js';
import type { Db } from './db.js';
import { ApiError } from './errors.js';
import { hashToken, newToken, safeEqual } from './security.js';

export interface Viewer {
  id: string;
  email: string;
  isModerator: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    viewer: Viewer | null;
    /** True when the viewer was identified by the session cookie (browser) rather than a bearer token (native app). */
    viaCookie: boolean;
  }
}

export const SESSION_COOKIE = 'iw_session';
export const CSRF_COOKIE = 'iw_csrf';
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function registerAuth(app: FastifyInstance, db: Db, config: Config) {
  app.decorateRequest('viewer', null);
  app.decorateRequest('viaCookie', false);

  app.addHook('onRequest', async (req, reply) => {
    if (!req.url.startsWith('/api/')) return;
    ensureCsrfCookie(req, reply, config);

    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
    const cookie = req.cookies[SESSION_COOKIE];
    const token = bearer || cookie;
    req.viaCookie = !bearer && !!cookie;

    // Browser writes must prove same-site origin with the double-submit token.
    // Bearer-token requests cannot be forged cross-site, so they skip this.
    if (req.viaCookie && UNSAFE.has(req.method)) {
      const sent = String(req.headers['x-csrf-token'] ?? '');
      const expected = req.cookies[CSRF_COOKIE] ?? '';
      if (!sent || !expected || !safeEqual(sent, expected)) throw new ApiError('forbidden');
    }

    if (!token) return;
    const { rows } = await db.query(
      `SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [hashToken(token)],
    );
    if (rows[0]) {
      req.viewer = { id: rows[0].id, email: rows[0].email, isModerator: config.moderatorEmails.has(rows[0].email) };
    }
  });
}

function ensureCsrfCookie(req: FastifyRequest, reply: FastifyReply, config: Config) {
  if (req.cookies[CSRF_COOKIE]) return;
  const token = newToken();
  req.cookies[CSRF_COOKIE] = token;
  reply.setCookie(CSRF_COOKIE, token, { path: '/', sameSite: 'lax', secure: config.secureCookies, httpOnly: false });
}

export async function createSession(db: Db, userId: string, config: Config): Promise<string> {
  const token = newToken();
  await db.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))`,
    [hashToken(token), userId, config.sessionDays],
  );
  return token;
}

export function setSessionCookie(reply: FastifyReply, token: string, config: Config) {
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/', httpOnly: true, sameSite: 'lax', secure: config.secureCookies,
    maxAge: config.sessionDays * 86400,
  });
}

export function requireViewer(req: FastifyRequest): Viewer {
  if (!req.viewer) throw new ApiError('unauthorized');
  return req.viewer;
}

export function requireModerator(req: FastifyRequest): Viewer {
  const viewer = requireViewer(req);
  if (!viewer.isModerator) throw new ApiError('forbidden');
  return viewer;
}
