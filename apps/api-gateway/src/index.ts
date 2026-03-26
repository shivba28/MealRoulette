import cors from 'cors';
import { app, server, applyGraphQLMiddleware } from './graphql/index.js';
import { applyAnalyticsRoutes } from './analytics/routes.js';
import { config } from './config/env.js';

const port = config.port;

server.start().then(() => {
  app.use(cors<cors.CorsRequest>());
  applyAnalyticsRoutes(app);
  applyGraphQLMiddleware();

  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.listen(port, () => {
    console.log(`API Gateway listening on http://localhost:${port}/graphql`);
  });
});
