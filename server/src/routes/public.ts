import type { FastifyInstance } from 'fastify';
import type { Db } from '../db.js';
import { ApiError } from '../errors.js';
import { companyQuery, pageQuery, reportInput, INDUSTRIES } from '../schemas.js';

const PAGE_SIZE = 10;

/** Public review fields. Deliberately excludes user_id and anything account-related. */
export const PUBLIC_REVIEW_COLUMNS = `r.id, r.employment, r.language, r.overall, r.pay, r.management, r.culture,
  r.growth, r.balance, r.title, r.pros, r.cons, r.is_demo AS "isDemo", r.published_at AS "publishedAt"`;

const AGGREGATE = `
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS "reviewCount", avg(overall)::float AS rating
    FROM reviews WHERE company_id = c.id AND status = 'published'
  ) agg ON true`;

const OFFICES = `
  COALESCE((SELECT json_agg(json_build_object('city', o.city, 'state', o.state, 'lat', o.lat, 'lng', o.lng, 'isPrimary', o.is_primary)
    ORDER BY o.is_primary DESC, o.id) FROM offices o WHERE o.company_id = c.id), '[]') AS offices`;

export function publicRoutes(app: FastifyInstance, db: Db) {
  app.get('/api/health', async () => {
    await db.query('SELECT 1');
    return { ok: true };
  });

  app.get('/api/companies', async (req) => {
    const q = companyQuery.parse(req.query);
    const where: string[] = [];
    const params: unknown[] = [];
    const p = (v: unknown) => `$${params.push(v)}`;

    if (q.q) {
      const like = p(`%${q.q.replace(/[\\%_]/g, (m) => '\\' + m)}%`);
      const extra = (q.qIndustries ?? '').split(',').filter((k): k is (typeof INDUSTRIES)[number] => (INDUSTRIES as readonly string[]).includes(k));
      where.push(`(c.name ILIKE ${like} OR c.industry ILIKE ${like}
        OR EXISTS (SELECT 1 FROM offices o WHERE o.company_id = c.id AND (o.city ILIKE ${like} OR o.state ILIKE ${like}))
        ${extra.length ? `OR c.industry = ANY(${p(extra)})` : ''})`);
    }
    if (q.industry) where.push(`c.industry = ${p(q.industry)}`);
    if (q.minRating > 0) where.push(`agg.rating >= ${p(q.minRating)}`);
    if (q.bbox) {
      const [west, south, east, north] = q.bbox.split(',').map(Number);
      where.push(`EXISTS (SELECT 1 FROM offices o WHERE o.company_id = c.id
        AND o.lat BETWEEN ${p(south)} AND ${p(north)} AND o.lng BETWEEN ${p(west)} AND ${p(east)})`);
    }
    const order = {
      name: 'c.name ASC',
      rating: 'agg.rating DESC NULLS LAST, c.name ASC',
      reviews: 'agg."reviewCount" DESC, c.name ASC',
    }[q.sort];

    const { rows } = await db.query(
      `SELECT c.id, c.name, c.industry, c.size, c.color, c.initials, c.is_demo AS "isDemo",
         agg."reviewCount", agg.rating, ${OFFICES}
       FROM companies c ${AGGREGATE}
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY ${order} LIMIT ${p(q.limit)}`,
      params,
    );
    return { companies: rows };
  });

  app.get<{ Params: { id: string } }>('/api/companies/:id', async (req) => {
    const { rows } = await db.query(
      `SELECT c.id, c.name, c.industry, c.size, c.color, c.initials, c.is_demo AS "isDemo",
         agg."reviewCount", agg.rating, ${OFFICES},
         (SELECT json_build_object(
            'pay', avg(pay)::float, 'management', avg(management)::float, 'culture', avg(culture)::float,
            'growth', avg(growth)::float, 'balance', avg(balance)::float)
          FROM reviews WHERE company_id = c.id AND status = 'published') AS breakdown
       FROM companies c ${AGGREGATE} WHERE c.id = $1`,
      [req.params.id],
    );
    if (!rows[0]) throw new ApiError('missing');
    return { company: rows[0] };
  });

  app.get<{ Params: { id: string } }>('/api/companies/:id/reviews', async (req) => {
    const { page } = pageQuery.parse(req.query);
    const { rows } = await db.query(
      `SELECT ${PUBLIC_REVIEW_COLUMNS}, count(*) OVER()::int AS total
       FROM reviews r WHERE r.company_id = $1 AND r.status = 'published'
       ORDER BY r.published_at DESC, r.id LIMIT $2 OFFSET $3`,
      [req.params.id, PAGE_SIZE, (page - 1) * PAGE_SIZE],
    );
    const total = rows[0]?.total ?? 0;
    return { reviews: rows.map(({ total: _t, ...r }) => r), page, pageSize: PAGE_SIZE, total };
  });

  app.post<{ Params: { id: string } }>(
    '/api/reviews/:id/reports',
    { config: { rateLimit: { max: 10, timeWindow: '1 hour' } } },
    async (req, reply) => {
      const { reason } = reportInput.parse(req.body);
      const { rowCount } = await db.query(
        `INSERT INTO reports (review_id, reporter_id, reason)
         SELECT id, $2, $3 FROM reviews WHERE id = $1 AND status = 'published'`,
        [uuidOrMissing(req.params.id), req.viewer?.id ?? null, reason],
      );
      if (!rowCount) throw new ApiError('missing');
      reply.code(201);
      return { ok: true };
    },
  );
}

export function uuidOrMissing(id: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError('missing');
  return id;
}
