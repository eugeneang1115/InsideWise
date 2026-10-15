import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64, SCRYPT);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, key] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length, SCRYPT);
  return timingSafeEqual(actual, expected);
}

export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Triage check for obvious identifying details. Not a guarantee: moderators
 * still review every submission before publication.
 */
const PERSONAL_PATTERNS = [
  /[\w.+-]+@[\w-]+(\.[\w-]+)+/i, // email
  /\b\d{6}[- ]?\d{2}[- ]?\d{4}\b/, // Malaysian IC (MyKad)
  /(\+?6?0)[- ]?1\d[- ]?\d{3,4}[- ]?\d{4}\b/, // Malaysian mobile
];

export function containsPersonalDetails(...texts: string[]): boolean {
  const text = texts.join('\n');
  return PERSONAL_PATTERNS.some((re) => re.test(text));
}
