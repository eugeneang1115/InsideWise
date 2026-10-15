import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import type { Db } from '../src/db.js';
import { Browser, MODERATOR, sampleReview, setup } from './helpers.js';

let app: FastifyInstance;
let db: Db;
before(async () => ({ app, db } = await setup()));
after(async () => { await app.close(); await db.end(); });

describe('public directory', () => {
  it('lists companies with server-side aggregates', async () => {
    const res = await new Browser(app).req('GET', '/api/companies');
    assert.equal(res.status, 200);
    assert.equal(res.body.companies.length, 9);
    const awan = res.body.companies.find((c: any) => c.id === 'awan');
    assert.equal(awan.reviewCount, 2);
    assert.equal(awan.rating, 4);
    assert.equal(awan.offices[0].city, 'Kuala Lumpur');
  });

  it('filters by search, industry keys from translated labels, rating and map bounds', async () => {
    const b = new Browser(app);
    assert.deepEqual((await b.req('GET', '/api/companies?q=kuching')).body.companies.map((c: any) => c.id), ['kenyalang']);
    const zh = await b.req('GET', '/api/companies?q=' + encodeURIComponent('金融') + '&qIndustries=Finance');
    assert.deepEqual(zh.body.companies.map((c: any) => c.id), ['teras']);
    const rated = await b.req('GET', '/api/companies?minRating=4.5');
    assert.ok(rated.body.companies.every((c: any) => c.rating >= 4.5));
    const klang = await b.req('GET', '/api/companies?bbox=101.4,2.9,101.9,3.3');
    assert.ok(klang.body.companies.length >= 4);
    assert.ok(klang.body.companies.every((c: any) => c.offices.some((o: any) => o.lng < 102)));
    assert.equal((await b.req('GET', '/api/companies?q=%25')).body.companies.length, 0, 'LIKE wildcards are escaped');
  });

  it('never exposes reviewer identity in public review responses', async () => {
    const res = await new Browser(app).req('GET', '/api/companies/meranti/reviews');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2);
    const text = JSON.stringify(res.body);
    assert.ok(!/user_?id|email|example\.invalid/i.test(text), text);
  });

  it('returns 404 for unknown companies', async () => {
    assert.equal((await new Browser(app).req('GET', '/api/companies/nope')).status, 404);
  });
});

describe('accounts', () => {
  it('registers, rejects duplicates and wrong passwords, and logs out', async () => {
    const b = new Browser(app);
    assert.equal((await b.register('a@example.test')).status, 201);
    assert.equal((await b.req('GET', '/api/me')).body.me.email, 'a@example.test');
    assert.equal((await new Browser(app).register('A@example.test')).body.error, 'emailTaken');
    const wrong = await new Browser(app).req('POST', '/api/auth/login', { email: 'a@example.test', password: 'not the password' });
    assert.equal(wrong.body.error, 'credentials');
    await b.req('POST', '/api/auth/logout');
    assert.equal((await b.req('GET', '/api/me')).body.me, null);
  });

  it('issues bearer tokens to the native app', async () => {
    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'n@example.test', password: 'correct horse battery', client: 'native' } });
    const { token } = reg.json();
    assert.ok(token);
    assert.equal(reg.cookies.find((c: any) => c.name === 'ki_session'), undefined);
    const res = await app.inject({ method: 'POST', url: '/api/reviews', headers: { authorization: `Bearer ${token}` }, payload: sampleReview('selat') });
    assert.equal(res.statusCode, 201, res.body);
  });

  it('rejects cookie-authenticated writes without the CSRF token', async () => {
    const b = new Browser(app);
    await b.register('csrf@example.test');
    const res = await b.req('POST', '/api/reviews', sampleReview('awan'), { csrf: false });
    assert.equal(res.status, 403);
  });
});

describe('review lifecycle', () => {
  it('runs submit → pending → changes requested → appeal → published → edit → pending', async () => {
    const author = new Browser(app);
    await author.register('author@example.test');
    const mod = new Browser(app);
    await mod.register(MODERATOR);

    assert.equal((await author.req('POST', '/api/reviews', sampleReview('rimba'))).status, 201);
    assert.equal((await author.req('POST', '/api/reviews', sampleReview('rimba'))).body.error, 'duplicate');
    let [mine] = (await author.req('GET', '/api/me/reviews')).body.reviews;
    assert.equal(mine.status, 'pending');

    // Not public while pending.
    assert.equal((await author.req('GET', '/api/companies/rimba/reviews')).body.total, 2);

    // Regular users cannot moderate.
    assert.equal((await author.req('GET', '/api/mod/queue')).status, 403);

    const queue = (await mod.req('GET', '/api/mod/queue')).body;
    const queued = queue.pending.find((r: any) => r.id === mine.id);
    assert.ok(queued);
    assert.ok(!JSON.stringify(queue).includes('author@example.test'), 'moderators do not see author identity');

    assert.equal((await mod.req('POST', `/api/mod/reviews/${mine.id}/decision`, { action: 'request_changes', note: 'Please remove the team name.', version: 0 })).body.error, 'conflict');
    assert.equal((await mod.req('POST', `/api/mod/reviews/${mine.id}/decision`, { action: 'request_changes', note: 'Please remove the team name.', version: mine.version })).status, 200);
    mine = (await author.req('GET', '/api/me/reviews')).body.reviews[0];
    assert.equal(mine.status, 'changes_requested');
    assert.equal(mine.moderatorNote, 'Please remove the team name.');

    assert.equal((await author.req('POST', `/api/reviews/${mine.id}/appeal`, { message: 'There is no team name in the text.' })).status, 201);
    assert.equal((await author.req('POST', `/api/reviews/${mine.id}/appeal`, { message: 'Second appeal at the same time.' })).body.error, 'conflict');
    const appeal = (await mod.req('GET', '/api/mod/queue')).body.appeals.find((a: any) => a.review.id === mine.id);
    assert.equal((await mod.req('POST', `/api/mod/appeals/${appeal.id}`, { decision: 'accept' })).status, 200);

    const company = (await author.req('GET', '/api/companies/rimba')).body.company;
    assert.equal(company.reviewCount, 3);
    assert.equal((await author.req('GET', '/api/companies/rimba/reviews')).body.total, 3);

    mine = (await author.req('GET', '/api/me/reviews')).body.reviews[0];
    const edit = await author.req('PUT', `/api/reviews/${mine.id}`, { ...sampleReview('rimba'), title: 'Edited headline here', version: mine.version });
    assert.equal(edit.body.review.status, 'pending');
    assert.equal((await author.req('GET', '/api/companies/rimba')).body.company.reviewCount, 2);
    const stale = await author.req('PUT', `/api/reviews/${mine.id}`, { ...sampleReview('rimba'), version: mine.version });
    assert.equal(stale.body.error, 'conflict');
  });

  it('enforces ownership on edit and delete', async () => {
    const owner = new Browser(app);
    await owner.register('owner@example.test');
    const { review } = (await owner.req('POST', '/api/reviews', sampleReview('padi'))).body;
    const other = new Browser(app);
    await other.register('other@example.test');
    assert.equal((await other.req('PUT', `/api/reviews/${review.id}`, { ...sampleReview('padi'), version: review.version })).status, 404);
    assert.equal((await other.req('DELETE', `/api/reviews/${review.id}`)).status, 404);
    assert.equal((await owner.req('DELETE', `/api/reviews/${review.id}`)).status, 200);
  });

  it('blocks obvious personal details and invalid input', async () => {
    const b = new Browser(app);
    await b.register('pii@example.test');
    const withEmail = { ...sampleReview('bayu'), pros: 'Email me at someone@example.com for the full story please.' };
    assert.equal((await b.req('POST', '/api/reviews', withEmail)).body.error, 'personal');
    const withIc = { ...sampleReview('bayu'), cons: 'My manager 850101-14-5678 was difficult to work with daily.' };
    assert.equal((await b.req('POST', '/api/reviews', withIc)).body.error, 'personal');
    assert.equal((await b.req('POST', '/api/reviews', { ...sampleReview('bayu'), overall: 9 })).body.error, 'invalid');
    assert.equal((await b.req('POST', '/api/reviews', { ...sampleReview('bayu'), consent: false })).body.error, 'invalid');
  });

  it('accepts reports on published reviews and lets moderators hide or dismiss', async () => {
    const reader = new Browser(app);
    const [first, second] = (await reader.req('GET', '/api/companies/teras/reviews')).body.reviews;
    assert.equal((await reader.req('POST', `/api/reviews/${first.id}/reports`, { reason: 'short' })).body.error, 'invalid');
    assert.equal((await reader.req('POST', `/api/reviews/${first.id}/reports`, { reason: 'Names a specific junior colleague.' })).status, 201);
    assert.equal((await reader.req('POST', `/api/reviews/${second.id}/reports`, { reason: 'I just disagree with this review.' })).status, 201);

    const mod = new Browser(app);
    await mod.req('POST', '/api/auth/login', { email: MODERATOR, password: 'correct horse battery' });
    const { reports } = (await mod.req('GET', '/api/mod/queue')).body;
    const r1 = reports.find((r: any) => r.review.id === first.id);
    const r2 = reports.find((r: any) => r.review.id === second.id);
    assert.equal((await mod.req('POST', `/api/mod/reviews/${first.id}/decision`, { action: 'hide', note: 'Identifies a person.', version: r1.review.version })).status, 200);
    assert.equal((await mod.req('POST', `/api/mod/reports/${r2.id}/dismiss`)).status, 200);
    const after = (await reader.req('GET', '/api/companies/teras/reviews')).body;
    assert.equal(after.total, 1);
    assert.equal((await mod.req('GET', '/api/mod/queue')).body.reports.length, 0);
  });

  it('deletes an account with its reviews and exports its data', async () => {
    const b = new Browser(app);
    await b.register('leaver@example.test');
    await b.req('POST', '/api/reviews', sampleReview('kinabalu'));
    const exported = (await b.req('GET', '/api/me/export')).body;
    assert.equal(exported.account.email, 'leaver@example.test');
    assert.equal(exported.reviews.length, 1);
    assert.equal((await b.req('DELETE', '/api/me')).status, 200);
    const { rowCount } = await db.query(`SELECT 1 FROM reviews WHERE company_id = 'kinabalu' AND NOT is_demo`);
    assert.equal(rowCount, 0);
  });
});
