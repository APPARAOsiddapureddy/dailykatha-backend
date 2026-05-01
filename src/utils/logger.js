import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.logLevel,
  base: {
    service: env.serviceName,
    environment: env.environment,
    version: env.version,
  },
  redact: {
    paths: ['req.headers.authorization', 'headers.authorization'],
    remove: true,
  },
});

