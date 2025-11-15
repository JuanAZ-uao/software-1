// app.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiNotFoundHandler, errorHandler } from './src/core/middlewares/index.js';
import { usersRouter } from './src/routes/users.routes.js';
import { authRouter } from './src/routes/auth.routes.js';
import { notificationsRouter } from './src/routes/notifications.routes.js';
import catalogRoutes from './src/routes/catalog.routes.js';
import programaRoutes from './src/routes/programa.routes.js';
import facultadRoutes from './src/routes/facultad.routes.js';
import { organizationsRouter } from './src/routes/organizations.routes.js';
import { installationsRouter } from './src/routes/installations.routes.js';
import { eventsRouter } from './src/routes/events.routes.js';
import { organizationEventRouter } from './src/routes/organizationEvent.routes.js';
import {documentoRoutes} from './src/routes/documento.routes.js';
import { avalRouter } from './src/routes/aval.routes.js';
import { usuarioRouter } from './src/routes/usuario.routes.js';
import { evaluacionRouter } from './src/routes/evaluacion.routes.js';


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

  // Endpoint para debuggear notificaciones
  app.get('/api/debug/notifications-raw', async (_req, res) => {
    try {
      const pool = (await import('./src/db/pool.js')).default;
      const [rows] = await pool.execute(`SELECT * FROM notificacion LIMIT 5`);
      const [allRows] = await pool.execute(`SELECT COUNT(*) as total FROM notificacion`);
      res.json({ 
        success: true, 
        total: allRows[0].total,
        sample: rows,
        fields: rows.length > 0 ? Object.keys(rows[0]) : []
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/catalog', catalogRoutes);
  app.use('/api/programas', programaRoutes);
  app.use('/api/facultades', facultadRoutes);
  app.use('/api/organizations', organizationsRouter);
  app.use('/api/installations', installationsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/aval', avalRouter);
  app.use('/api/organization-event', organizationEventRouter);
  app.use('/api/documentos', documentoRoutes);
  app.use('/api/usuarios', usuarioRouter);
  app.use('/api/evaluaciones', evaluacionRouter);
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
  app.use('/api', apiNotFoundHandler);

  // Archivos estáticos y frontend (SPA)
  app.use(express.static(path.join(__dirname, 'public')));

  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
      next();
    }
  });

  // Middlewares de error
  app.use(errorHandler);

  return app;
};

export const app = createApp();
