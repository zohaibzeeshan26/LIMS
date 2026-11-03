import express, { Application } from 'express';
import cors from 'cors';

import { ENV } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middlewares/error.middleware';

export function createApp(): Application {
  const app = express();

  // Permissive CORS for development (supports localhost:3000, 127.0.0.1:3000, and standard clients)
  app.use(
    cors({
      origin: true, // Reflects the request origin, allowing all localhost/dev origins
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logger in development
  if (ENV.NODE_ENV === 'development') {
    app.use((req, res, next) => {

      console.log(`[HTTP] ${req.method} ${req.url}`);
      next();
    });
  }

  // Root server welcome/health check
  app.get('/', (req, res) => {
    res.json({
      service: 'City Pharma LIMS Backend Server',
      status: 'online',
      apiBase: '/api/v1',
      frontendUrl: 'http://localhost:3000',
    });
  });

  // Mount API router under /api/v1
  app.use('/api/v1', apiRouter);

  // Global error handler
  app.use(errorHandler);

  return app;
}
