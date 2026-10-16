import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadConfig } from '../src/config.js';
import { createPool } from '../src/db.js';
import { buildApp } from '../src/app.js';

test('ads are off until a valid AdSense id is set', async () => {
  const db = createPool('postgres://postgres@127.0.0.1:5432/unused'); // these routes never touch the database
  const off = await buildApp(db, loadConfig({ ADSENSE_CLIENT: 'not-an-id' }), { logger: false });
  assert.deepEqual((await off.inject('/api/config')).json(), { adsense: null });
  assert.equal((await off.inject('/ads.txt')).statusCode, 404);

  const on = await buildApp(db, loadConfig({ ADSENSE_CLIENT: 'ca-pub-1234567890123456', ADSENSE_SLOT: '9876543210' }), { logger: false });
  assert.deepEqual((await on.inject('/api/config')).json(), { adsense: { client: 'ca-pub-1234567890123456', slot: '9876543210' } });
  const txt = await on.inject('/ads.txt');
  assert.equal(txt.statusCode, 200);
  assert.equal(txt.body, 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
  await Promise.all([off.close(), on.close()]);
  await db.end();
});
