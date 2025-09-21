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

  // Tus rutas normales aquí
  // app.get('/ruta', ...);

  /**
   * Ruta catch-all para manejar 404
   * Esto debe ir al final, después de todas tus rutas
   */
  app.use((req, res) => {
    res.status(404).send('404 Not Found');
  });

  app.use(errorHandler);

  return app;
};

export const app = createApp();
