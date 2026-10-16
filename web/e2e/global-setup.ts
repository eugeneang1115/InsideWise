// Creates the moderator account once, before the parallel browser projects start (they would race to register it).
export default async function globalSetup() {
  const base = process.env.BASE_URL ?? 'http://localhost:8787';
  const email = process.env.E2E_MODERATOR ?? 'mod@example.test';
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'correct horse battery', client: 'native' }),
  });
  if (!res.ok && res.status !== 409) throw new Error(`Could not create the moderator account: ${res.status}`);
}
