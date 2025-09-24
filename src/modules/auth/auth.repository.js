// src/modules/auth/auth.repository.js
import bcrypt from 'bcryptjs';
import pool from '../../db/pool.js';

// Buscar usuario por email
export const findUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    `SELECT u.*, c.clave, 
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
     WHERE u.email = ?`,
    [email]
  );
  
  return rows[0] || null;
};

// Validar contraseña del usuario
export const validateUserPassword = async (userId, password) => {
  const [rows] = await pool.execute(
    'SELECT clave FROM contraseña WHERE idUsuario = ? AND estado = "activa"',
    [userId]
  );
  
  if (!rows[0]) return false;
  
  return await bcrypt.compare(password, rows[0].clave);
};

// Crear nuevo usuario
export const createUser = async (userData) => {
  const { nombre, apellidos, email, telefono, password, tipo } = userData;
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 1. Insertar en tabla usuario
    const [userResult] = await connection.execute(
      'INSERT INTO usuario (nombre, apellidos, email, telefono) VALUES (?, ?, ?, ?)',
      [nombre, apellidos, email, telefono]
    );
    
    const userId = userResult.insertId;
    
    // 2. Insertar contraseña
    await connection.execute(
      'INSERT INTO contraseña (idUsuario, fechaCambio, clave, estado) VALUES (?, CURDATE(), ?, "activa")',
      [userId, password]
    );
    
    // 3. Insertar en tabla específica según tipo
    if (tipo === 'estudiante') {
      await connection.execute(
        'INSERT INTO estudiante (idUsuario, fechaIngreso) VALUES (?, CURDATE())',
        [userId]
      );
    } else if (tipo === 'docente') {
      await connection.execute(
        'INSERT INTO docente (idUsuario, fechaContratacion) VALUES (?, CURDATE())',
        [userId]
      );
    } else if (tipo === 'secretaria') {
      await connection.execute(
        'INSERT INTO secretariaAcademica (idUsuario, fechaAsignacion) VALUES (?, CURDATE())',
        [userId]
      );
    }
    
    await connection.commit();
    
    return {
      idUsuario: userId,
      nombre,
      apellidos,
      email,
      telefono,
      tipo
    };
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};