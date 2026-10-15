import type { FastifyInstance } from 'fastify';
import type { Db } from '../db.js';
import { requireModerator } from '../auth.js';
import { ApiError } from '../errors.js';
import { appealDecision, decisionInput } from '../schemas.js';
import { uuidOrMissing } from './public.js';
import { NEW_COMPANIES_SQL } from './companies.js';

// Moderators see review content and status, never the author's account.
const MOD_REVIEW = `json_build_object('id', r.id, 'companyId', r.company_id, 'companyName', c.name, 'status', r.status,
  'employment', r.employment, 'language', r.language, 'overall', r.overall, 'pay', r.pay, 'management', r.management,
  'culture', r.culture, 'growth', r.growth, 'balance', r.balance, 'title', r.title, 'pros', r.pros, 'cons', r.cons,
  'moderatorNote', r.moderator_note, 'version', r.version, 'updatedAt', r.updated_at)`;

const NEXT_STATUS = { publish: 'published', reject: 'rejected', request_changes: 'changes_requested', hide: 'hidden' } as const;

export function moderationRoutes(app: FastifyInstance, db: Db) {
  app.get('/api/mod/queue', async (req) => {
    requireModerator(req);
    const [companies, pending, reports, appeals] = await Promise.all([
      db.query(NEW_COMPANIES_SQL),
      db.query(`SELECT ${MOD_REVIEW} AS review FROM reviews r JOIN companies c ON c.id = r.company_id
                WHERE r.status = 'pending' ORDER BY r.updated_at ASC LIMIT 100`),
      db.query(`SELECT p.id, p.reason, p.created_at AS "createdAt", ${MOD_REVIEW} AS review
                FROM reports p JOIN reviews r ON r.id = p.review_id JOIN companies c ON c.id = r.company_id
                WHERE p.status = 'open' ORDER BY p.created_at ASC LIMIT 100`),
      db.query(`SELECT a.id, a.message, a.created_at AS "createdAt", ${MOD_REVIEW} AS review
                FROM appeals a JOIN reviews r ON r.id = a.review_id JOIN companies c ON c.id = r.company_id
                WHERE a.status = 'open' ORDER BY a.created_at ASC LIMIT 100`),
    ]);
    return { companies: companies.rows, pending: pending.rows.map((r) => r.review), reports: reports.rows, appeals: appeals.rows };
  });

  app.post<{ Params: { id: string } }>('/api/mod/reviews/:id/decision', async (req) => {
    const mod = requireModerator(req);
    const id = uuidOrMissing(req.params.id);
    const { action, note, version } = decisionInput.parse(req.body);
    await tx(db, async (q) => {
      const rows = await q(
        `UPDATE reviews SET status = $2, moderator_note = $3,
           published_at = CASE WHEN $2 = 'published' THEN COALESCE(published_at, now()) ELSE published_at END
         WHERE id = $1 AND version = $4 RETURNING id`,
        [id, NEXT_STATUS[action], note || null, version],
      );
      if (!rows[0]) {
        const exists = await q('SELECT 1 FROM reviews WHERE id = $1', [id]);
        throw new ApiError(exists.length ? 'conflict' : 'missing');
      }
      // Hiding resolves the reports that led to it; publishing leaves them for review.
      if (action === 'hide') {
        await q(`UPDATE reports SET status = 'actioned', resolved_at = now() WHERE review_id = $1 AND status = 'open'`, [id]);
      }
      await q('INSERT INTO moderation_events (review_id, moderator, action, note) VALUES ($1,$2,$3,$4)', [id, mod.email, action, note || null]);
    });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/mod/reports/:id/dismiss', async (req) => {
    const mod = requireModerator(req);
    const { rows } = await db.query(
      `UPDATE reports SET status = 'dismissed', resolved_at = now() WHERE id = $1 AND status = 'open' RETURNING review_id`,
      [uuidOrMissing(req.params.id)],
    );
    if (!rows[0]) throw new ApiError('missing');
    await db.query('INSERT INTO moderation_events (review_id, moderator, action) VALUES ($1,$2,$3)', [rows[0].review_id, mod.email, 'dismiss_report']);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/mod/appeals/:id', async (req) => {
    const mod = requireModerator(req);
    const { decision, note } = appealDecision.parse(req.body);
    await tx(db, async (q) => {
      const rows = await q(
        `UPDATE appeals SET status = $2, resolved_at = now() WHERE id = $1 AND status = 'open' RETURNING review_id`,
        [uuidOrMissing(req.params.id), decision === 'accept' ? 'accepted' : 'declined'],
      );
      if (!rows[0]) throw new ApiError('missing');
      const reviewId = rows[0].review_id;
      if (decision === 'accept') {
        await q(`UPDATE reviews SET status = 'published', moderator_note = $2, published_at = COALESCE(published_at, now()) WHERE id = $1`, [reviewId, note || null]);
      } else if (note) {
        await q('UPDATE reviews SET moderator_note = $2 WHERE id = $1', [reviewId, note]);
      }
      await q('INSERT INTO moderation_events (review_id, moderator, action, note) VALUES ($1,$2,$3,$4)', [reviewId, mod.email, `appeal_${decision}`, note || null]);
    });
    return { ok: true };
  });
}

type Query = (sql: string, params?: unknown[]) => Promise<any[]>;

async function tx(db: Db, fn: (q: Query) => Promise<void>) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await fn(async (sql, params) => (await client.query(sql, params)).rows);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
