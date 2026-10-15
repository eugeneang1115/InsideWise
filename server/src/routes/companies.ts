import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db.js';
import { requireModerator, requireViewer } from '../auth.js';
import { ApiError } from '../errors.js';
import { companyDecision, companyInput } from '../schemas.js';
import { containsPersonalDetails } from '../security.js';

interface City { city: string; state: string; lat: number; lng: number }
const CITIES: City[] = JSON.parse(readFileSync(new URL('../../seed/my-cities.json', import.meta.url), 'utf8'));
const PALETTE = ['#42685c', '#a5664c', '#ab6d79', '#8b6a3e', '#4d6a86', '#6b6f3a', '#7a5c8c', '#3f7a74'];

const SUBMIT_LIMIT = { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } };

function slug(name: string) {
  const base = name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'company';
  return `${base}-${randomBytes(3).toString('hex')}`;
}

function initials(name: string) {
  const words = name.replace(/\b(sdn|bhd|berhad|plc|ltd|the)\b\.?/gi, '').split(/\s+/).filter((w) => /\p{L}|\d/u.test(w));
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? name).slice(0, 2);
  return letters.toLowerCase();
}

const OWN_COLUMNS = `c.id, c.name, c.industry, c.size, c.status, c.website, c.moderator_note AS "moderatorNote",
  c.created_at AS "createdAt", (SELECT city FROM offices o WHERE o.company_id = c.id ORDER BY o.is_primary DESC, o.id LIMIT 1) AS city`;

export function companyRoutes(app: FastifyInstance, db: Db) {
  /** Adds a company. It is public at once; moderators check new companies afterwards and can remove them. */
  app.post('/api/companies', SUBMIT_LIMIT, async (req, reply) => {
    const v = requireViewer(req);
    const input = companyInput.parse(req.body);
    const city = CITIES.find((c) => c.city === input.city) ?? (() => { throw new ApiError('invalid'); })();
    if (containsPersonalDetails(input.name)) throw new ApiError('personal');

    const existing = await db.query(
      `SELECT id FROM companies WHERE lower(name) = lower($1) AND status <> 'rejected'
         AND (status = 'published' OR submitted_by = $2) LIMIT 1`,
      [input.name, v.id],
    );
    if (existing.rows[0]) {
      reply.code(409);
      return { error: 'companyExists', companyId: existing.rows[0].id };
    }

    const id = slug(input.name);
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO companies (id, name, industry, size, color, initials, status, submitted_by, website)
         VALUES ($1, $2, $3, $4, $5, $6, 'published', $7, $8)`,
        [id, input.name, input.industry, input.size ?? null, PALETTE[randomBytes(1)[0] % PALETTE.length],
          initials(input.name), v.id, input.website ?? null],
      );
      await client.query(
        'INSERT INTO offices (company_id, city, state, lat, lng, is_primary) VALUES ($1, $2, $3, $4, $5, true)',
        [id, city.city, city.state, city.lat, city.lng],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    reply.code(201);
    return { company: (await db.query(`SELECT ${OWN_COLUMNS} FROM companies c WHERE c.id = $1`, [id])).rows[0] };
  });

  app.get('/api/me/companies', async (req) => {
    const v = requireViewer(req);
    const { rows } = await db.query(
      `SELECT ${OWN_COLUMNS} FROM companies c WHERE c.submitted_by = $1 ORDER BY c.created_at DESC`, [v.id]);
    return { companies: rows };
  });

  /** keep: mark a user-added company as checked. remove: hide it and its reviews from the public. */
  app.post<{ Params: { id: string } }>('/api/mod/companies/:id', async (req) => {
    requireModerator(req);
    const { decision, note } = companyDecision.parse(req.body);
    const { rows } = await db.query(
      `UPDATE companies SET status = $2, moderator_note = $3, checked_at = now() WHERE id = $1 RETURNING id`,
      [req.params.id, decision === 'keep' ? 'published' : 'rejected', note || null],
    );
    if (!rows[0]) throw new ApiError('missing');
    return { ok: true };
  });
}

/** User-added companies no moderator has checked yet. */
export const NEW_COMPANIES_SQL = `SELECT ${OWN_COLUMNS},
  (SELECT count(*)::int FROM reviews r WHERE r.company_id = c.id) AS "reviewCount"
  FROM companies c WHERE c.submitted_by IS NOT NULL AND c.checked_at IS NULL AND c.status = 'published'
  ORDER BY c.created_at ASC LIMIT 100`;
