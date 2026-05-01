import { query } from '../config/database.js';

export async function logApiRequest({ requestId, endpoint, method, statusCode, responseTimeMs }) {
  try {
    await query(
      `INSERT INTO api_logs (request_id, endpoint, method, status_code, response_time_ms)
       VALUES ($1, $2, $3, $4, $5)`,
      [requestId || null, endpoint, method, statusCode, responseTimeMs],
    );
  } catch {
    // best-effort only
  }
}

