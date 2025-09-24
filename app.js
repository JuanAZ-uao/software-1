import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { apiNotFoundHandler, errorHandler } from './src/core/middlewares/index.js';
import { usersRouter } from './src/modules/users/index.js';
import { authRouter } from './src/modules/auth/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  app.use(express.json());

  // Rutas API
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  
  // Endpoint de prueba para verificar BD
  app.get('/api/test-db', async (_req, res) => {
    try {
      const pool = (await import('./src/db/pool.js')).default;
      const [rows] = await pool.execute('SELECT COUNT(*) as count FROM usuario');
      res.json({ 
        success: true, 
        message: 'BD conectada correctamente',
        usuarios: rows[0].count 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });
  
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api', apiNotFoundHandler);

  // Archivos estáticos y frontend
  app.use(express.static(path.join(__dirname, 'public')));

  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
      res.status(404).send('404 Not Found');
    }
  });

  // Middlewares de error
  app.use(errorHandler);

  return app;
};
export const app = createApp();
