import { z } from 'zod';
import type { Db } from '../db.js';
import { INDUSTRIES } from '../schemas.js';

export const companyFile = z.array(z.object({
  id: z.string().regex(/^[a-z0-9-]{2,80}$/),
  name: z.string().min(1).max(200),
  industry: z.enum(INDUSTRIES),
  size: z.string().max(40).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  initials: z.string().min(1).max(3),
  offices: z.array(z.object({
    city: z.string().min(1), state: z.string().min(1),
    lat: z.number().min(0.5).max(7.5), lng: z.number().min(99).max(120), // Malaysia
    isPrimary: z.boolean().default(false),
  })).min(1),
}));

/** Upserts companies and replaces their office list. */
export async function upsertCompanies(db: Db, data: z.infer<typeof companyFile>, isDemo: boolean) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const c of data) {
      await client.query(
        `INSERT INTO companies (id, name, industry, size, color, initials, is_demo) VALUES ($1,$2,$3,$4,COALESCE($5,'#42685c'),$6,$7)
         ON CONFLICT (id) DO UPDATE SET name = $2, industry = $3, size = $4, color = COALESCE($5, companies.color), initials = $6, is_demo = $7`,
        [c.id, c.name, c.industry, c.size ?? null, c.color ?? null, c.initials, isDemo],
      );
      await client.query('DELETE FROM offices WHERE company_id = $1', [c.id]);
      for (const o of c.offices) {
        await client.query('INSERT INTO offices (company_id, city, state, lat, lng, is_primary) VALUES ($1,$2,$3,$4,$5,$6)',
          [c.id, o.city, o.state, o.lat, o.lng, o.isPrimary]);
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
