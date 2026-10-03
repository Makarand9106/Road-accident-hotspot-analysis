/**
 * PostgreSQL Database Connection Pool.
 * Configured using environment variables with query timeouts and connection health checks.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { Pool } = pg;

const dbConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'road_safety',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    };

export const pool = new Pool({
  ...dbConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000, // 10s query timeout
});

pool.on('error', (err) => {
  console.error('[DB POOL ERROR] Unexpected client error:', err.message);
});

/**
 * Execute a parameterized query against PostgreSQL.
 * @param {string} text - SQL query string with positional placeholders ($1, $2, ...)
 * @param {Array} params - Array of parameter values
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params = []) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`[SLOW QUERY WARNING] ${duration}ms: ${text.slice(0, 100)}...`);
    }
    return res;
  } catch (err) {
    console.error(`[SQL EXECUTION ERROR] query: ${text.slice(0, 120)}... | error: ${err.message}`);
    throw err;
  }
}

/**
 * Gracefully terminate database pool connections.
 */
export async function closePool() {
  await pool.end();
}
