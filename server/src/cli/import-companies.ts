// Usage: npm run import:companies -w server -- path/to/companies.json
import { readFile } from 'node:fs/promises';
import { loadConfig } from '../config.js';
import { createPool, migrate } from '../db.js';
import { companyFile, upsertCompanies } from './companies.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: import-companies <companies.json>');
  process.exit(1);
}
const data = companyFile.parse(JSON.parse(await readFile(file, 'utf8')));
const db = createPool(loadConfig().databaseUrl);
await migrate(db);
await upsertCompanies(db, data, false);
console.log(`Imported ${data.length} companies.`);
await db.end();
