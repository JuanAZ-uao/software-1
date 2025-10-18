import mysql from 'mysql2/promise';

// Crear el pool de conexiones con los datos proporcionados directamente
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'gestionEventos',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10, // Valor por defecto, puedes ajustarlo si lo deseas
  queueLimit: 0
}); 

// Exportación por defecto
export default pool;

// También exportar como named export para compatibilidad
export const getPool = () => pool;
