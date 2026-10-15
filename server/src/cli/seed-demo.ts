// Loads the fictional preview directory and labelled sample reviews. Development and demos only.
import { readFile } from 'node:fs/promises';
import { loadConfig } from '../config.js';
import { createPool, migrate, type Db } from '../db.js';
import { hashPassword, newToken } from '../security.js';
import { companyFile, upsertCompanies } from './companies.js';

const SAMPLES = [
  { title: 'Supportive team, room to grow', language: 'en', employment: 'current',
    pros: 'The team shares knowledge openly and makes space for learning. Flexible hours make the working week easier to manage.',
    cons: 'Career progression could be explained more clearly. Project priorities sometimes change at short notice.' },
  { title: 'A good place to learn', language: 'en', employment: 'former',
    pros: 'Colleagues are approachable and willing to help. New starters get useful feedback and practical experience.',
    cons: 'Planning between teams could be better. More structured training would make a real difference.' },
  { title: '团队友善，工作节奏合理', language: 'zh', employment: 'current',
    pros: '同事乐于分享经验，遇到问题时能获得支持。团队重视协作，也愿意听取新的想法。',
    cons: '希望晋升标准能够更透明，也希望跨部门沟通和长期培训计划得到进一步改善。' },
];

export async function seedDemo(db: Db) {
  const file = new URL('../../seed/demo-companies.json', import.meta.url);
  const companies = companyFile.parse(JSON.parse(await readFile(file, 'utf8')));
  await upsertCompanies(db, companies, true);
  await db.query('DELETE FROM reviews WHERE is_demo');
  const authors: string[] = [];
  for (let n = 0; n < 2; n++) {
    // Demo authors cannot sign in: their password is random and discarded.
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id`,
      [`demo-author-${n}@example.invalid`, await hashPassword(newToken())],
    );
    authors.push(rows[0].id);
  }
  for (const [i, c] of companies.entries()) {
    for (const j of [0, 1]) {
      const s = SAMPLES[(i + j) % 3];
      const overall = i === 1 ? 4 : i === 3 ? 3 : 5 - j;
      await db.query(
        `INSERT INTO reviews (company_id, user_id, status, employment, language, overall, pay, management, culture, growth, balance,
           title, pros, cons, is_demo, published_at)
         VALUES ($1,$2,'published',$3,$4,$5,4,4,5,3,4,$6,$7,$8,true, now() - make_interval(days => $9))`,
        [c.id, authors[j], s.employment, s.language, overall, s.title, s.pros, s.cons, i * 3 + j],
      );
    }
  }
  return companies.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = createPool(loadConfig().databaseUrl);
  await migrate(db);
  console.log(`Seeded ${await seedDemo(db)} demo companies with sample reviews.`);
  await db.end();
}
