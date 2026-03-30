function listEnv(name: string, fallback: string): string[] {
  const raw = process.env[name] ?? fallback;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env['PORT']) || 4000,
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  isProd: process.env['NODE_ENV'] === 'production',
  /** Browser origins allowed for credentialed CORS (comma-separated). */
  frontendOrigins: listEnv('FRONTEND_ORIGIN', 'http://localhost:3000'),
  /** Where Google redirects after consent (this API, registered in Cloud Console). */
  googleRedirectUri:
    process.env['GOOGLE_REDIRECT_URI'] ?? 'http://localhost:4000/api/auth/google/callback',
  googleClientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
  googleClientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
  /** Signs cookies and encrypts refresh tokens at rest. */
  sessionSecret: process.env['SESSION_SECRET'] ?? 'dev-insecure-change-me',
  /** After OAuth, redirect the browser here (SPA). */
  frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
  /** Directory for session store (relative to api-gateway cwd). */
  dataDir: process.env['DATA_DIR'] ?? 'data',
  /** Set to `consent` if Google omits refresh_token (forces consent screen). */
  googleOauthPrompt: process.env['GOOGLE_OAUTH_PROMPT'] === 'consent' ? 'consent' : undefined,
  /**
   * Cookie SameSite mode.
   * - `lax` is fine for same-site SPA+API.
   * - `none` is required for cross-site (e.g. Vercel frontend -> Render API) because browsers won't
   *   send `SameSite=Lax` cookies on XHR/fetch.
   */
  cookieSameSite:
    process.env['COOKIE_SAMESITE'] === 'none'
      ? ('none' as const)
      : ('lax' as const),
} as const;

export function googleOAuthConfigured(): boolean {
  return Boolean(
    config.googleClientId && config.googleClientSecret && config.googleRedirectUri
  );
}
