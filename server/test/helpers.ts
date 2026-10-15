import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { loadConfig } from '../src/config.js';
import { createPool, migrate, type Db } from '../src/db.js';
import { buildApp } from '../src/app.js';
import { seedDemo } from '../src/cli/seed-demo.js';

export const MODERATOR = 'mod@example.test';

export async function setup(): Promise<{ app: FastifyInstance; db: Db }> {
  const config = loadConfig({
    ...process.env,
    DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://postgres@127.0.0.1:5432/insidewise_test',
    MODERATOR_EMAILS: MODERATOR,
    DISABLE_RATE_LIMIT: 'true',
  });
  const db = createPool(config.databaseUrl);
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(db);
  await seedDemo(db);
  const app = await buildApp(db, config, { logger: false });
  return { app, db };
}

/** A browser-like client: keeps cookies and sends the CSRF header on writes. */
export class Browser {
  cookies: Record<string, string> = {};
  constructor(private app: FastifyInstance) {}

  async req(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown, opts: { csrf?: boolean } = {}) {
    if (!this.cookies.iw_csrf) await this.app.inject({ method: 'GET', url: '/api/me' }).then((r) => this.keep(r));
    const res = await this.app.inject({
      method, url, payload: body as object,
      cookies: this.cookies,
      headers: opts.csrf === false ? {} : { 'x-csrf-token': this.cookies.iw_csrf },
    });
    this.keep(res);
    return { status: res.statusCode, body: res.body ? res.json() : undefined };
  }

  private keep(res: LightMyRequestResponse) {
    for (const c of res.cookies as { name: string; value: string }[]) {
      if (c.value) this.cookies[c.name] = c.value; else delete this.cookies[c.name];
    }
  }

  async register(email: string, password = 'correct horse battery') {
    return this.req('POST', '/api/auth/register', { email, password });
  }
}

export const sampleReview = (companyId: string) => ({
  companyId, employment: 'current', language: 'en',
  overall: 4, pay: 3, management: 4, culture: 5, growth: 3, balance: 4,
  title: 'Steady place with good people',
  pros: 'Supportive colleagues and clear weekly planning help a lot.',
  cons: 'Promotion criteria are not written down anywhere useful.',
  consent: true,
});
