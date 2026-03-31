import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { app, server, applyGraphQLMiddleware } from './graphql/index.js';
import { applyAnalyticsRoutes } from './analytics/routes.js';
import { applyAuthRoutes } from './auth/routes.js';
import { applySyncRoutes } from './sync/routes.js';
import { config } from './config/env.js';

const port = config.port;

function originMatches(allowed: string, origin: string): boolean {
  if (allowed === origin) return true;
  // Support a simple wildcard for Vercel preview domains, e.g.:
  // FRONTEND_ORIGIN=https://mealroulette.vercel.app,https://*.vercel.app
  if (allowed.includes('*')) {
    try {
      const a = new URL(allowed.replace('*', 'wildcard'));
      const o = new URL(origin);
      if (a.protocol !== o.protocol) return false;
      const hostPattern = a.host.replace('wildcard', '*');
      if (hostPattern.startsWith('*.')) {
        const suffix = hostPattern.slice(1); // ".vercel.app"
        return o.host.endsWith(suffix);
      }
    } catch {
      return false;
    }
  }
  return false;
}

server.start().then(() => {
  app.use(cookieParser(config.sessionSecret));
  app.use(express.json({ limit: '6mb' }));
  app.use(
    cors({
      origin: (origin, callback) => {
        // Non-browser clients (no Origin header).
        if (!origin) return callback(null, true);
        const ok = config.frontendOrigins.some((a) => originMatches(a, origin));
        // IMPORTANT: don't throw errors here; cors will treat it as a request error (500).
        // Return `false` to omit CORS headers, letting the browser enforce the block.
        return callback(null, ok);
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  applyAuthRoutes(app);
  applySyncRoutes(app);
  applyAnalyticsRoutes(app);
  applyGraphQLMiddleware();

  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.listen(port, () => {
    console.log(`API Gateway listening on http://localhost:${port}/graphql`);
  });
});
