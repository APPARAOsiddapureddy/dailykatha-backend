import { env } from '../config/env.js';

export function health(_req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}

export function status(_req, res) {
  res.json({
    uptime: process.uptime(),
    version: env.version,
    environment: env.environment,
  });
}

