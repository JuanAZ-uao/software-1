import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { apiNotFoundHandler, errorHandler } from './core/middlewares/index.js';
import { usersRouter } from './modules/users/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/users', usersRouter);

  app.use('/api', apiNotFoundHandler);

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.use(errorHandler);

  return app;
};

export const app = createApp();
