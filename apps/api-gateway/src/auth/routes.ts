import { randomBytes } from 'node:crypto';
import type { Express, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { config, googleOAuthConfigured } from '../config/env.js';
import { createSession, deleteSession, getSession } from './sessionStore.js';

const OAUTH_STATE_COOKIE = 'mr_oauth_state';

function appendQuery(url: string, params: Record<string, string>): string {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, v);
  }
  return u.toString();
}

function appendHash(url: string, fragment: string): string {
  const u = new URL(url);
  u.hash = fragment.startsWith('#') ? fragment : `#${fragment}`;
  return u.toString();
}

function oauthClient(): OAuth2Client {
  return new OAuth2Client(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri
  );
}

const baseCookie = {
  httpOnly: true,
  // Required when SameSite=None (modern browsers reject insecure None cookies).
  secure: config.isProd || config.cookieSameSite === 'none',
  sameSite: config.cookieSameSite,
  path: '/',
};

export function applyAuthRoutes(app: Express): void {
  app.get('/api/auth/google/start', (_req: Request, res: Response) => {
    if (!googleOAuthConfigured()) {
      res.status(503).json({ error: 'Google OAuth is not configured on the server' });
      return;
    }
    const state = randomBytes(24).toString('hex');
    res.cookie(OAUTH_STATE_COOKIE, state, {
      ...baseCookie,
      maxAge: 10 * 60 * 1000,
      signed: true,
    });
    const client = oauthClient();
    const url = client.generateAuthUrl({
      access_type: 'offline',
      ...(config.googleOauthPrompt ? { prompt: config.googleOauthPrompt } : {}),
      scope: [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/drive.appdata',
      ],
      state,
    });
    res.redirect(302, url);
  });

  app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
    if (!googleOAuthConfigured()) {
      res.redirect(
        appendQuery(config.frontendUrl, { sync: 'error', reason: 'not_configured' })
      );
      return;
    }
    const code = req.query['code'];
    const state = req.query['state'];
    if (typeof code !== 'string' || typeof state !== 'string') {
      res.redirect(appendQuery(config.frontendUrl, { sync: 'error', reason: 'missing_code' }));
      return;
    }
    const expectedState = req.signedCookies?.[OAUTH_STATE_COOKIE];
    if (!expectedState || expectedState !== state) {
      res.redirect(appendQuery(config.frontendUrl, { sync: 'error', reason: 'bad_state' }));
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { ...baseCookie, signed: true });

    try {
      const client = oauthClient();
      const { tokens } = await client.getToken(code);
      if (!tokens.refresh_token) {
        res.redirect(
          appendQuery(config.frontendUrl, {
            sync: 'error',
            reason: 'no_refresh_token',
          })
        );
        return;
      }
      client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const { data } = await oauth2.userinfo.get();
      const email = data.email ?? '';
      const googleSub = data.id ?? '';
      if (!googleSub) {
        res.redirect(
          appendQuery(config.frontendUrl, { sync: 'error', reason: 'no_user_id' })
        );
        return;
      }
      const sessionId = createSession({
        refreshToken: tokens.refresh_token,
        googleSub,
        email,
      });
      // Safari may block cross-site cookies (ITP). Return the session id as an opaque bearer token.
      // Put the token in the fragment so it isn't sent to the server as a query param / referrer.
      const frontWithSync = appendQuery(config.frontendUrl, { sync: 'ok' });
      res.redirect(appendHash(frontWithSync, `token=${encodeURIComponent(sessionId)}`));
    } catch {
      res.redirect(appendQuery(config.frontendUrl, { sync: 'error', reason: 'token_exchange' }));
    }
  });

  function bearerToken(req: Request): string | null {
    const h = req.header('authorization');
    if (!h) return null;
    const m = /^Bearer\s+(.+)\s*$/i.exec(h);
    return m?.[1] ?? null;
  }

  app.get('/api/auth/me', (req: Request, res: Response) => {
    // Avoid caches / conditional requests causing confusing 304s.
    res.setHeader('Cache-Control', 'no-store');
    const sid = bearerToken(req);
    if (!sid) {
      res.json({ authenticated: false as const });
      return;
    }
    const rec = getSession(sid);
    if (!rec) {
      res.json({ authenticated: false as const });
      return;
    }
    res.json({
      authenticated: true as const,
      email: rec.email,
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const sid = bearerToken(req);
    if (sid) {
      deleteSession(sid);
    }
    res.status(204).send();
  });
}
