import express from 'express';
import * as Sentry from '@sentry/node';

import { env } from './config/env.js';
import { corsMiddleware } from './middleware/cors.js';
import { apiRateLimit } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireHttps } from './middleware/requireHttps.js';
import { requestLogger } from './middleware/requestLogger.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import routes from './routes/index.js';
import { mountApiDocs } from './routes/apiDocs.js';
import { logger } from './utils/logger.js';

if (env.sentryDsn) {
  Sentry.init({ dsn: env.sentryDsn, environment: env.environment });
}

const app = express();
app.set('trust proxy', 1);

app.use(requestLogger);
app.use(securityHeaders);
app.use(requireHttps);
app.use(corsMiddleware);
app.use(apiRateLimit);
app.use(express.json({ limit: '2mb' }));

mountApiDocs(app);
app.use(routes);

app.use(errorHandler);

export default app;

// Only listen when executed directly
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const server = app.listen(env.port, () => {
    logger.info({ port: env.port }, 'daily-katha-api listening');
  });

  function shutdown(signal) {
    logger.info({ signal }, 'shutdown');
    server.close(() => process.exit(0));
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

