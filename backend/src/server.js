/**
 * Express HTTP Server Entry Point.
 * Binds listener to BACKEND_PORT (default 4000) and manages graceful shutdown.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import app from './app.js';
import { pool, query, closePool } from './db/pool.js';

const PORT = parseInt(process.env.BACKEND_PORT || '4000', 10);

async function startServer() {
  try {
    // 1. Verify PostgreSQL connectivity
    const testRes = await query('SELECT current_database() AS db_name, version();');
    console.log(`[DATABASE] Connected to PostgreSQL: "${testRes.rows[0].db_name}"`);

    // 2. Start HTTP server
    const server = app.listen(PORT, () => {
      console.log('='.repeat(70));
      console.log(`ROAD SAFETY API SERVER STARTED`);
      console.log(`Listening on: http://localhost:${PORT}`);
      console.log(`Health Check: http://localhost:${PORT}/api/health`);
      console.log(`Environment:  ${process.env.NODE_ENV || 'development'}`);
      console.log('='.repeat(70));
    });

    // 3. Graceful Shutdown Handlers
    const shutdown = async (signal) => {
      console.log(`\n[SHUTDOWN] Received ${signal}. Closing HTTP server and database pool...`);
      server.close(async () => {
        console.log('[SHUTDOWN] HTTP server closed.');
        try {
          await closePool();
          console.log('[SHUTDOWN] Database pool closed.');
          process.exit(0);
        } catch (err) {
          console.error('[SHUTDOWN ERROR] Error during pool closure:', err);
          process.exit(1);
        }
      });

      // Force close after 5s timeout
      setTimeout(() => {
        console.error('[SHUTDOWN] Forced shutdown after timeout.');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    console.error('[FATAL ERROR] Failed to initialize server:', err);
    process.exit(1);
  }
}

startServer();
