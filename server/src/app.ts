import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { ZodError } from 'zod';
import type { Config } from './config.js';
import type { Db } from './db.js';
import { registerAuth } from './auth.js';
import { ApiError } from './errors.js';
import { publicRoutes } from './routes/public.js';
import { accountRoutes } from './routes/account.js';
import { reviewRoutes } from './routes/reviews.js';
import { moderationRoutes } from './routes/moderation.js';

export async function buildApp(db: Db, config: Config, opts: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({
    trustProxy: true,
    bodyLimit: 64 * 1024,
    // Routine logs carry method, path and status only: no IPs, headers, bodies or account ids.
    logger: opts.logger === false ? false : {
      serializers: {
        req: (req) => ({ method: req.method, url: req.url.split('?')[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    },
  });

  await app.register(cookie);
  await app.register(cors, {
    origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin)),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });
  if (!config.disableRateLimit) await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ApiError) return reply.code(err.status).send({ error: err.code });
    if (err instanceof ZodError) return reply.code(400).send({ error: 'invalid', fields: err.issues.map((i) => i.path.join('.')) });
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 429) return reply.code(429).send({ error: 'slow' });
    if (status && status < 500) return reply.code(status).send({ error: 'invalid' });
    const e = err as Error;
    req.log.error({ err: { message: e.message, stack: e.stack } }, 'request failed');
    return reply.code(500).send({ error: 'unavailable' });
  });

  registerAuth(app, db, config);
  publicRoutes(app, db);
  accountRoutes(app, db, config);
  reviewRoutes(app, db);
  moderationRoutes(app, db);

  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'same-origin');
    if (req.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store');
  });

  if (config.webDist) {
    await app.register(fastifyStatic, { root: config.webDist, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'missing' });
      return reply.sendFile('index.html');
    });
  }
  return app;
}
