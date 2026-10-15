// In-browser stand-in for the API, used only by demo builds (VITE_DEMO=true) so the app can be tried
// without a server. Data lives in memory and resets on reload. Mirrors server/src/routes/*.
import seed from '../../server/seed/demo-companies.json';
import { ApiFailure, type Company, type OwnReview, type PublicReview, type ReviewStatus } from './api';

type Review = Omit<OwnReview, 'companyName' | 'appealOpen' | 'publishedAt'> & {
  userId: string; isDemo: boolean; createdAt: string; updatedAt: string; publishedAt: string | null;
};
interface Appeal { id: string; reviewId: string; message: string; status: 'open' | 'accepted' | 'declined'; createdAt: string }
interface Report { id: string; reviewId: string; reason: string; status: 'open' | 'dismissed' | 'actioned'; createdAt: string }

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
] as const;

let seq = 0;
const id = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const fail = (code: string, status = 400): never => { throw new ApiFailure(code, status); };

const companies = seed.map((c) => ({ ...c, size: c.size ?? null, isDemo: true }));
const reviews: Review[] = companies.flatMap((c, i) => [0, 1].map((j) => {
  const s = SAMPLES[(i + j) % 3];
  return {
    id: id(), companyId: c.id, userId: `demo-${j}`, status: 'published' as ReviewStatus, isDemo: true,
    employment: s.employment, language: s.language, title: s.title, pros: s.pros, cons: s.cons,
    overall: i === 1 ? 4 : i === 3 ? 3 : 5 - j, pay: 4, management: 4, culture: 5, growth: 3, balance: 4,
    moderatorNote: null, version: 1, createdAt: daysAgo(i * 3 + j), updatedAt: daysAgo(i * 3 + j), publishedAt: daysAgo(i * 3 + j),
  };
}));
const appeals: Appeal[] = [];
const reports: Report[] = [];
let me: { id: string; email: string; isModerator: boolean } | null = null;

const published = (companyId: string) => reviews.filter((r) => r.companyId === companyId && r.status === 'published');
const avg = (rs: Review[], k: 'overall' | 'pay' | 'management' | 'culture' | 'growth' | 'balance') =>
  rs.length ? rs.reduce((s, r) => s + r[k], 0) / rs.length : null;
const withAggregate = (c: (typeof companies)[number]): Company => {
  const rs = published(c.id);
  return { ...c, reviewCount: rs.length, rating: avg(rs, 'overall') };
};
const publicReview = (r: Review): PublicReview => ({
  id: r.id, employment: r.employment, language: r.language, title: r.title, pros: r.pros, cons: r.cons,
  overall: r.overall, pay: r.pay, management: r.management, culture: r.culture, growth: r.growth, balance: r.balance,
  isDemo: r.isDemo, publishedAt: r.publishedAt!,
});
const companyName = (cid: string) => companies.find((c) => c.id === cid)?.name ?? cid;
const own = (r: Review): OwnReview => ({
  ...publicReview({ ...r, publishedAt: r.publishedAt ?? r.updatedAt }), publishedAt: r.publishedAt!,
  companyId: r.companyId, companyName: companyName(r.companyId), status: r.status, moderatorNote: r.moderatorNote,
  version: r.version, appealOpen: appeals.some((a) => a.reviewId === r.id && a.status === 'open'),
} as OwnReview);
const modReview = (r: Review) => { const { appealOpen: _a, ...rest } = own(r); return rest; };

const PERSONAL = [/[\w.+-]+@[\w-]+(\.[\w-]+)+/i, /\b\d{6}[- ]?\d{2}[- ]?\d{4}\b/, /(\+?6?0)[- ]?1\d[- ]?\d{3,4}[- ]?\d{4}\b/];
function validReview(b: any) {
  const ratings = ['overall', 'pay', 'management', 'culture', 'growth', 'balance'];
  if (!ratings.every((k) => Number.isInteger(b[k]) && b[k] >= 1 && b[k] <= 5)) fail('invalid');
  if (b.consent !== true || (b.title ?? '').trim().length < 5 || (b.pros ?? '').trim().length < 20 || (b.cons ?? '').trim().length < 20) fail('invalid');
  if (PERSONAL.some((re) => re.test(`${b.title}\n${b.pros}\n${b.cons}`))) fail('personal', 422);
}
const viewer = () => me ?? fail('unauthorized', 401);
const moderator = () => (viewer().isModerator ? me! : fail('forbidden', 403));

export async function demoRequest(method: string, path: string, body: any): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 120)); // feel like a network call
  const url = new URL(path, 'https://demo.invalid');
  const q = url.searchParams;
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // drop "api"
  const KEYWORDS = new Set(['companies', 'reviews', 'reports', 'appeal', 'appeals', 'decision', 'dismiss', 'queue', 'export', 'me', 'mod', 'auth', 'login', 'register', 'logout']);
  const pid = decodeURIComponent(parts.find((p) => !KEYWORDS.has(p)) ?? '');
  const route = `${method} /${parts.map((p) => (KEYWORDS.has(p) ? p : ':id')).join('/')}`;

  switch (route) {
    case 'GET /companies': {
      const text = (q.get('q') ?? '').toLowerCase();
      const extra = (q.get('qIndustries') ?? '').split(',').filter(Boolean);
      const bbox = q.get('bbox')?.split(',').map(Number);
      let list = companies.map(withAggregate).filter((c) =>
        (!text || [c.name, c.industry, ...c.offices.flatMap((o) => [o.city, o.state])].some((s) => s.toLowerCase().includes(text)) || extra.includes(c.industry))
        && (!q.get('industry') || c.industry === q.get('industry'))
        && (!Number(q.get('minRating')) || (c.rating ?? 0) >= Number(q.get('minRating')))
        && (!bbox || c.offices.some((o) => o.lng >= bbox[0] && o.lat >= bbox[1] && o.lng <= bbox[2] && o.lat <= bbox[3])));
      const sort = q.get('sort');
      list = list.sort((a, b) => sort === 'rating' ? (b.rating ?? -1) - (a.rating ?? -1) || a.name.localeCompare(b.name)
        : sort === 'reviews' ? b.reviewCount - a.reviewCount || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
      return { companies: list };
    }
    case 'GET /companies/:id': {
      const c = companies.find((x) => x.id === pid) ?? fail('missing', 404);
      const rs = published(c.id);
      return { company: { ...withAggregate(c), breakdown: { pay: avg(rs, 'pay'), management: avg(rs, 'management'), culture: avg(rs, 'culture'), growth: avg(rs, 'growth'), balance: avg(rs, 'balance') } } };
    }
    case 'GET /companies/:id/reviews': {
      const page = Number(q.get('page') ?? 1);
      const rs = published(pid).sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!));
      return { reviews: rs.slice((page - 1) * 10, page * 10).map(publicReview), total: rs.length, page, pageSize: 10 };
    }
    case 'POST /reviews/:id/reports': {
      if ((body?.reason ?? '').trim().length < 10) fail('invalid');
      const r = reviews.find((x) => x.id === pid && x.status === 'published') ?? fail('missing', 404);
      reports.push({ id: id(), reviewId: r.id, reason: body.reason.trim(), status: 'open', createdAt: now() });
      return { ok: true };
    }
    case 'GET /me': return { me };
    case 'POST /auth/login':
    case 'POST /auth/register': {
      const email = String(body?.email ?? '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email) || String(body?.password ?? '').length < 10) fail('invalid');
      // In the preview every account can moderate, so the whole review cycle can be tried.
      me = { id: `u-${email}`, email, isModerator: true };
      return { me };
    }
    case 'POST /auth/logout': me = null; return { ok: true };
    case 'GET /me/export': {
      const v = viewer();
      return { account: { email: v.email }, reviews: reviews.filter((r) => r.userId === v.id).map(own) };
    }
    case 'DELETE /me': {
      const v = viewer();
      for (let i = reviews.length - 1; i >= 0; i--) if (reviews[i].userId === v.id) reviews.splice(i, 1);
      me = null;
      return { ok: true };
    }
    case 'GET /me/reviews': {
      const v = viewer();
      return { reviews: reviews.filter((r) => r.userId === v.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(own) };
    }
    case 'POST /reviews': {
      const v = viewer();
      validReview(body);
      if (!companies.some((c) => c.id === body.companyId)) fail('missing', 404);
      if (reviews.some((r) => r.companyId === body.companyId && r.userId === v.id)) fail('duplicate', 409);
      const r: Review = { ...body, id: id(), userId: v.id, status: 'pending', isDemo: false, moderatorNote: null, version: 1, createdAt: now(), updatedAt: now(), publishedAt: null };
      reviews.push(r);
      return { review: own(r) };
    }
    case 'PUT /reviews/:id': {
      const v = viewer();
      const r = reviews.find((x) => x.id === pid && x.userId === v.id) ?? fail('missing', 404);
      if (r.version !== body.version) fail('conflict', 409);
      validReview(body);
      const { version: _v, consent: _c, ...fields } = body;
      Object.assign(r, fields, { status: 'pending', version: r.version + 1, updatedAt: now() });
      for (let i = appeals.length - 1; i >= 0; i--) if (appeals[i].reviewId === r.id && appeals[i].status === 'open') appeals.splice(i, 1);
      return { review: own(r) };
    }
    case 'DELETE /reviews/:id': {
      const v = viewer();
      const i = reviews.findIndex((x) => x.id === pid && x.userId === v.id);
      if (i < 0) fail('missing', 404);
      reviews.splice(i, 1);
      return { ok: true };
    }
    case 'POST /reviews/:id/appeal': {
      const v = viewer();
      const r = reviews.find((x) => x.id === pid && x.userId === v.id) ?? fail('missing', 404);
      if (!['rejected', 'changes_requested', 'hidden'].includes(r.status) || appeals.some((a) => a.reviewId === r.id && a.status === 'open')) fail('conflict', 409);
      if ((body?.message ?? '').trim().length < 10) fail('invalid');
      appeals.push({ id: id(), reviewId: r.id, message: body.message.trim(), status: 'open', createdAt: now() });
      return { review: own(r) };
    }
    case 'GET /mod/queue': {
      moderator();
      const byId = (rid: string) => reviews.find((r) => r.id === rid)!;
      return {
        pending: reviews.filter((r) => r.status === 'pending').map(modReview),
        reports: reports.filter((p) => p.status === 'open' && byId(p.reviewId)).map((p) => ({ id: p.id, reason: p.reason, createdAt: p.createdAt, review: modReview(byId(p.reviewId)) })),
        appeals: appeals.filter((a) => a.status === 'open' && byId(a.reviewId)).map((a) => ({ id: a.id, message: a.message, createdAt: a.createdAt, review: modReview(byId(a.reviewId)) })),
      };
    }
    case 'POST /mod/reviews/:id/decision': {
      moderator();
      const r = reviews.find((x) => x.id === pid) ?? fail('missing', 404);
      if (r.version !== body.version) fail('conflict', 409);
      const statuses: Record<string, ReviewStatus> = { publish: 'published', reject: 'rejected', request_changes: 'changes_requested', hide: 'hidden' };
      const next = statuses[body.action] ?? fail('invalid');
      r.status = next;
      r.moderatorNote = body.note || null;
      if (next === 'published') r.publishedAt ??= now();
      if (next === 'hidden') reports.filter((p) => p.reviewId === r.id && p.status === 'open').forEach((p) => { p.status = 'actioned'; });
      return { ok: true };
    }
    case 'POST /mod/reports/:id/dismiss': {
      moderator();
      const p = reports.find((x) => x.id === pid && x.status === 'open') ?? fail('missing', 404);
      p.status = 'dismissed';
      return { ok: true };
    }
    case 'POST /mod/appeals/:id': {
      moderator();
      const a = appeals.find((x) => x.id === pid && x.status === 'open') ?? fail('missing', 404);
      a.status = body.decision === 'accept' ? 'accepted' : 'declined';
      const r = reviews.find((x) => x.id === a.reviewId)!;
      if (body.decision === 'accept') { r.status = 'published'; r.publishedAt ??= now(); }
      if (body.note) r.moderatorNote = body.note;
      return { ok: true };
    }
  }
  return fail('missing', 404);
}
