import { env } from '../config/index.js';
import mysql from 'mysql2/promise';

// Crear el pool de conexiones
const pool = mysql.createPool({
  host: env.db.host,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  port: env.db.port,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0
});

// Exportación por defecto
export default pool;

// También exportar como named export para compatibilidad
export const getPool = () => pool;
