import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { apiNotFoundHandler, errorHandler } from './src/core/middlewares/index.js';
import { usuariosRouter } from './src/routes/users.routes.js';
import { authRouter } from './src/routes/auth.routes.js';
import catalogRoutes from './src/routes/catalog.routes.js';
import programaRoutes from './src/routes/programa.routes.js';
import facultadRoutes from './src/routes/facultad.routes.js';

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
  
  // Endpoint para listar todos los usuarios (para debugging)
  app.get('/api/usuarios', async (_req, res) => {
    try {
      const pool = (await import('./src/db/pool.js')).default;
      const [rows] = await pool.execute(`
        SELECT 
          u.idUsuario,
          u.nombre,
          u.apellidos,
          u.email,
          u.telefono,
          c.clave as password,
          CASE 
            WHEN e.idUsuario IS NOT NULL THEN 'estudiante'
            WHEN d.idUsuario IS NOT NULL THEN 'docente' 
            WHEN s.idUsuario IS NOT NULL THEN 'secretaria'
            ELSE 'usuario'
          END as tipo
        FROM usuario u 
        LEFT JOIN contraseña c ON u.idUsuario = c.idUsuario AND c.estado = 'activa'
        LEFT JOIN estudiante e ON u.idUsuario = e.idUsuario
        LEFT JOIN docente d ON u.idUsuario = d.idUsuario  
        LEFT JOIN secretariaAcademica s ON u.idUsuario = s.idUsuario
        ORDER BY u.idUsuario DESC
      `);
      res.json({ 
        success: true, 
        usuarios: rows
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });
  
  app.use('/api/auth', authRouter);
  app.use('/api/users', usuariosRouter);
  app.use('/api/catalog', catalogRoutes);
  app.use('/api/programas', programaRoutes);
  app.use('/api/facultades', facultadRoutes);
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
