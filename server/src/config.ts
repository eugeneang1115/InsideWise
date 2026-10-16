function list(value: string | undefined): string[] {
  return (value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

export interface Config {
  port: number;
  host: string;
  databaseUrl: string;
  /** Origins allowed to call the API with credentials (web dev server, Capacitor app). */
  corsOrigins: string[];
  /** Explicit moderator allowlist, matched against account emails (lower-cased). */
  moderatorEmails: Set<string>;
  /** Secure cookies require HTTPS; off only for local development. */
  secureCookies: boolean;
  /** Directory of the built web app to serve, if any. */
  webDist?: string;
  sessionDays: number;
  /** Turn off request rate limits (tests only). */
  disableRateLimit: boolean;
  /** Google AdSense publisher id (ca-pub-…). Ads stay off until it is set. */
  adsenseClient?: string;
  /** AdSense display ad unit id for the in-page ad slots. Without it only Auto ads (if enabled in AdSense) appear. */
  adsenseSlot?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';
  return {
    port: Number(env.PORT ?? 8787),
    host: env.HOST ?? '0.0.0.0',
    databaseUrl: env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:5432/insidewise',
    corsOrigins: list(env.CORS_ORIGINS ?? 'http://localhost:5173,https://localhost,capacitor://localhost'),
    moderatorEmails: new Set(list(env.MODERATOR_EMAILS).map((e) => e.toLowerCase())),
    secureCookies: env.SECURE_COOKIES ? env.SECURE_COOKIES === 'true' : production,
    webDist: env.WEB_DIST || undefined,
    sessionDays: Number(env.SESSION_DAYS ?? 30),
    disableRateLimit: env.DISABLE_RATE_LIMIT === 'true',
    adsenseClient: /^ca-pub-\d{10,20}$/.test(env.ADSENSE_CLIENT ?? '') ? env.ADSENSE_CLIENT : undefined,
    adsenseSlot: /^\d{5,20}$/.test(env.ADSENSE_SLOT ?? '') ? env.ADSENSE_SLOT : undefined,
  };
}
