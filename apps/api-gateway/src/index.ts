import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { app, server, applyGraphQLMiddleware } from './graphql/index.js';
import { applyAnalyticsRoutes } from './analytics/routes.js';
import { applyAuthRoutes } from './auth/routes.js';
import { applySyncRoutes } from './sync/routes.js';
import { config } from './config/env.js';

const port = config.port;

server.start().then(() => {
  app.use(cookieParser(config.sessionSecret));
  app.use(express.json({ limit: '6mb' }));
  app.use(
    cors({
      origin: config.frontendOrigins,
      credentials: true,
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
