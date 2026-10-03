/**
 * Express Application Configuration.
 * Configures CORS, JSON body parser, request logging, route mounting, and centralized error handling.
 */

import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { ApiError } from './utils/errors.js';

const app = express();

// 1. CORS Configuration (Allows Vite Frontend Origin & Localhost)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    '*',
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 2. Body Parser
app.use(express.json({ limit: '1mb' }));

// 3. Simple Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// 4. Mount API Routes under /api
app.use('/api', routes);

// 5. 404 Not Found Handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// 6. Centralized Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || (err instanceof ApiError ? err.statusCode : 500);
  const message = err.message || 'An unexpected internal server error occurred.';
  const details = err.details || null;

  if (statusCode >= 500) {
    console.error(`[SERVER ERROR] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(details && { details }),
  });
});

export default app;
