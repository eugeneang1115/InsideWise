import { loadConfig } from './config.js';
import { createPool, migrate } from './db.js';
import { buildApp } from './app.js';
import { seedDemo } from './cli/seed-demo.js';

const config = loadConfig();
const db = createPool(config.databaseUrl);
await migrate(db);
// SEED_DEMO=true loads the fictional sample directory into an empty database (previews and testing).
if (process.env.SEED_DEMO === 'true') {
  const { rows } = await db.query('SELECT count(*)::int AS n FROM companies');
  if (rows[0].n === 0) console.log(`Seeded ${await seedDemo(db)} demo companies.`);
}
const app = await buildApp(db, config);
await app.listen({ port: config.port, host: config.host });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close();
    await db.end();
    process.exit(0);
  });
}
