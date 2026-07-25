import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './shared/utils/errors';
import { authRouter } from './modules/auth/auth.routes';
import { chatRouter } from './modules/chat/chat.routes';
import { ingestionRouter } from './modules/ingestion/ingestion.routes';
import { feedbackRouter } from './modules/feedback/feedback.routes';
import { adminRouter } from './modules/admin/admin.routes';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApp() {
  const app = express();

  // Security & parsing middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/chat', apiLimiter, chatRouter);
  app.use('/api/ingestion', apiLimiter, ingestionRouter);
  app.use('/api/feedback', apiLimiter, feedbackRouter);
  app.use('/api/admin', apiLimiter, adminRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}
