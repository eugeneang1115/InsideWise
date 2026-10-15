import { z } from 'zod';

export const METRICS = ['overall', 'pay', 'management', 'culture', 'growth', 'balance'] as const;
export const INDUSTRIES = [
  'Technology', 'Finance', 'Consumer', 'Creative', 'Manufacturing', 'Retail', 'Healthcare', 'Education',
  'Hospitality', 'Logistics', 'Energy', 'Construction', 'Property', 'Telecommunications', 'Government',
  'ProfessionalServices', 'Agriculture', 'Other',
] as const;
export const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,000+'] as const;

const rating = z.coerce.number().int().min(1).max(5);
const text = (min: number, max: number) => z.string().trim().min(min).max(max);

export const reviewInput = z.object({
  companyId: z.string().min(1).max(80),
  employment: z.enum(['current', 'former']),
  language: z.enum(['en', 'ms', 'zh']),
  overall: rating, pay: rating, management: rating, culture: rating, growth: rating, balance: rating,
  title: text(5, 120),
  pros: text(20, 2000),
  cons: text(20, 2000),
  consent: z.literal(true),
});
export const reviewUpdate = reviewInput.omit({ companyId: true }).extend({ version: z.coerce.number().int() });

export const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(200),
  client: z.enum(['web', 'native']).default('web'),
});

export const reportInput = z.object({ reason: text(10, 1000) });
export const appealInput = z.object({ message: text(10, 1000) });

export const decisionInput = z.object({
  action: z.enum(['publish', 'reject', 'request_changes', 'hide']),
  note: z.string().trim().max(1000).optional(),
  version: z.coerce.number().int(),
});
export const appealDecision = z.object({
  decision: z.enum(['accept', 'decline']),
  note: z.string().trim().max(1000).optional(),
});

export const companyQuery = z.object({
  q: z.string().trim().max(100).optional(),
  /** Industry keys whose translated label matched q on the client (e.g. a Chinese search term). */
  qIndustries: z.string().max(200).optional(),
  industry: z.enum(INDUSTRIES).optional().or(z.literal('').transform(() => undefined)),
  minRating: z.coerce.number().min(0).max(5).default(0),
  sort: z.enum(['name', 'rating', 'reviews']).default('name'),
  bbox: z.string().regex(/^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$/).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const companyInput = z.object({
  name: text(2, 120),
  industry: z.enum(INDUSTRIES),
  city: z.string().min(1).max(80),
  size: z.enum(COMPANY_SIZES).optional().or(z.literal('').transform(() => undefined)),
  website: z.string().trim().max(200).url().refine((u) => /^https?:\/\//i.test(u)).optional()
    .or(z.literal('').transform(() => undefined)),
});
export const companyDecision = z.object({
  decision: z.enum(['keep', 'remove']),
  note: z.string().trim().max(1000).optional(),
});

export const pageQuery = z.object({ page: z.coerce.number().int().min(1).max(1000).default(1) });
