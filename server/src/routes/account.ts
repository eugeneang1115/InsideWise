import type { FastifyInstance } from 'fastify';
import type { Config } from '../config.js';
import type { Db } from '../db.js';
import { createSession, requireViewer, setSessionCookie, SESSION_COOKIE } from '../auth.js';
import { ApiError } from '../errors.js';
import { credentials } from '../schemas.js';
import { hashPassword, hashToken, verifyPassword } from '../security.js';

const AUTH_LIMIT = { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } };
// Equalises login timing whether or not the email exists.
const DUMMY_HASH = hashPassword('timing-equaliser-password');

export function accountRoutes(app: FastifyInstance, db: Db, config: Config) {
  const issue = async (userId: string, client: 'web' | 'native', reply: Parameters<typeof setSessionCookie>[0]) => {
    const token = await createSession(db, userId, config);
    if (client === 'native') return { token };
    setSessionCookie(reply, token, config);
    return {};
  };

  app.post('/api/auth/register', AUTH_LIMIT, async (req, reply) => {
    const { email, password, client } = credentials.parse(req.body);
    const hash = await hashPassword(password);
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id`,
      [email, hash],
    );
    if (!rows[0]) throw new ApiError('emailTaken');
    reply.code(201);
    return { ...(await issue(rows[0].id, client, reply)), me: me(rows[0].id, email, config) };
  });

  app.post('/api/auth/login', AUTH_LIMIT, async (req, reply) => {
    const { email, password, client } = credentials.parse(req.body);
    const { rows } = await db.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
    const ok = rows[0] ? await verifyPassword(password, rows[0].password_hash) : (await DUMMY_HASH, false);
    if (!ok) throw new ApiError('credentials');
    return { ...(await issue(rows[0].id, client, reply)), me: me(rows[0].id, email, config) };
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies[SESSION_COOKIE];
    if (token) await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/api/me', async (req) => {
    const v = req.viewer;
    return { me: v ? me(v.id, v.email, config) : null };
  });

  /** Data export request: everything held about the signed-in account. */
  app.get('/api/me/export', async (req) => {
    const v = requireViewer(req);
    const [user, reviews, appeals] = await Promise.all([
      db.query('SELECT email, created_at AS "createdAt" FROM users WHERE id = $1', [v.id]),
      db.query('SELECT * FROM reviews WHERE user_id = $1', [v.id]),
      db.query('SELECT a.* FROM appeals a JOIN reviews r ON r.id = a.review_id WHERE r.user_id = $1', [v.id]),
    ]);
    return { account: user.rows[0], reviews: reviews.rows.map(({ user_id: _u, ...r }) => r), appeals: appeals.rows };
  });

  /** Deletes the account, its sessions, its reviews and their reports/appeals. */
  app.delete('/api/me', async (req, reply) => {
    const v = requireViewer(req);
    await db.query('DELETE FROM users WHERE id = $1', [v.id]);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });
}

function me(id: string, email: string, config: Config) {
  return { id, email, isModerator: config.moderatorEmails.has(email) };
}
