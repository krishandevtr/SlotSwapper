import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import eventsRouter from './routes/events';
import swapRouter from './routes/swap';
import requestsRouter from './routes/requests';
import { authMiddleware } from './middleware/auth';

dotenv.config();

export function createApp() {
  const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const app = express();
  app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_, res) => res.json({ ok: true }));

  app.use('/api/auth', authRouter);
  app.use('/api/events', authMiddleware, eventsRouter);
  app.use('/api', authMiddleware, swapRouter);
  app.use('/api', authMiddleware, requestsRouter);

  return app;
}
