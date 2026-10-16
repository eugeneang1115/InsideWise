import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Db } from '../db.js';
import { requireViewer } from '../auth.js';
import { ApiError } from '../errors.js';
import { appealInput, reviewInput, reviewUpdate } from '../schemas.js';
import { containsPersonalDetails } from '../security.js';
import { uuidOrMissing } from './public.js';

// Counted per account, so people sharing an office or campus network don't use up each other's limit.
const SUBMIT_LIMIT = { config: { rateLimit: { max: 10, timeWindow: '1 hour', keyGenerator: (req: FastifyRequest) => req.viewer?.id ?? req.ip } } };

const OWN_COLUMNS = `r.id, r.company_id AS "companyId", c.name AS "companyName", r.status, r.employment, r.language,
  r.overall, r.pay, r.management, r.culture, r.growth, r.balance, r.title, r.pros, r.cons,
  r.moderator_note AS "moderatorNote", r.version, r.created_at AS "createdAt", r.updated_at AS "updatedAt",
  r.published_at AS "publishedAt",
  EXISTS (SELECT 1 FROM appeals a WHERE a.review_id = r.id AND a.status = 'open') AS "appealOpen"`;

export function reviewRoutes(app: FastifyInstance, db: Db) {
  app.get('/api/me/reviews', async (req) => {
    const v = requireViewer(req);
    const { rows } = await db.query(
      `SELECT ${OWN_COLUMNS} FROM reviews r JOIN companies c ON c.id = r.company_id
       WHERE r.user_id = $1 ORDER BY r.updated_at DESC`,
      [v.id],
    );
    return { reviews: rows };
  });

  app.post('/api/reviews', SUBMIT_LIMIT, async (req, reply) => {
    const v = requireViewer(req);
    const input = reviewInput.parse(req.body);
    if (containsPersonalDetails(input.title, input.pros, input.cons)) throw new ApiError('personal');
    // Reviews can go to listed companies, or to a company the reviewer added that is awaiting approval.
    const company = await db.query(
      `SELECT 1 FROM companies WHERE id = $1 AND (status = 'published' OR submitted_by = $2)`,
      [input.companyId, v.id],
    );
    if (!company.rowCount) throw new ApiError('missing');
    const { rows } = await db.query(
      `INSERT INTO reviews (company_id, user_id, employment, language, overall, pay, management, culture, growth, balance, title, pros, cons)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (company_id, user_id) DO NOTHING RETURNING id`,
      [input.companyId, v.id, input.employment, input.language, input.overall, input.pay, input.management,
        input.culture, input.growth, input.balance, input.title, input.pros, input.cons],
    );
    if (!rows[0]) throw new ApiError('duplicate');
    reply.code(201);
    return { review: await ownReview(db, v.id, rows[0].id) };
  });

  // Any edit, including to a published review, goes back to moderation.
  app.put<{ Params: { id: string } }>('/api/reviews/:id', SUBMIT_LIMIT, async (req) => {
    const v = requireViewer(req);
    const id = uuidOrMissing(req.params.id);
    const input = reviewUpdate.parse(req.body);
    if (containsPersonalDetails(input.title, input.pros, input.cons)) throw new ApiError('personal');
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE reviews SET status = 'pending', employment = $3, language = $4, overall = $5, pay = $6, management = $7,
           culture = $8, growth = $9, balance = $10, title = $11, pros = $12, cons = $13,
           version = version + 1, updated_at = now()
         WHERE id = $1 AND user_id = $2 AND version = $14 RETURNING id`,
        [id, v.id, input.employment, input.language, input.overall, input.pay, input.management, input.culture,
          input.growth, input.balance, input.title, input.pros, input.cons, input.version],
      );
      if (!rows[0]) {
        const exists = await client.query('SELECT 1 FROM reviews WHERE id = $1 AND user_id = $2', [id, v.id]);
        throw new ApiError(exists.rowCount ? 'conflict' : 'missing');
      }
      // A resubmission supersedes any open appeal.
      await client.query(`DELETE FROM appeals WHERE review_id = $1 AND status = 'open'`, [id]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return { review: await ownReview(db, v.id, id) };
  });

  app.delete<{ Params: { id: string } }>('/api/reviews/:id', async (req) => {
    const v = requireViewer(req);
    const { rowCount } = await db.query('DELETE FROM reviews WHERE id = $1 AND user_id = $2', [uuidOrMissing(req.params.id), v.id]);
    if (!rowCount) throw new ApiError('missing');
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/reviews/:id/appeal', SUBMIT_LIMIT, async (req, reply) => {
    const v = requireViewer(req);
    const id = uuidOrMissing(req.params.id);
    const { message } = appealInput.parse(req.body);
    const review = await db.query('SELECT status FROM reviews WHERE id = $1 AND user_id = $2', [id, v.id]);
    if (!review.rows[0]) throw new ApiError('missing');
    if (!['rejected', 'changes_requested', 'hidden'].includes(review.rows[0].status)) throw new ApiError('conflict');
    const { rowCount } = await db.query(
      `INSERT INTO appeals (review_id, message) VALUES ($1, $2) ON CONFLICT (review_id) WHERE status = 'open' DO NOTHING`,
      [id, message],
    );
    if (!rowCount) throw new ApiError('conflict');
    reply.code(201);
    return { review: await ownReview(db, v.id, id) };
  });
}

async function ownReview(db: Db, userId: string, id: string) {
  const { rows } = await db.query(
    `SELECT ${OWN_COLUMNS} FROM reviews r JOIN companies c ON c.id = r.company_id WHERE r.id = $1 AND r.user_id = $2`,
    [id, userId],
  );
  return rows[0];
}
