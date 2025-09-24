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

// Validar contraseña del usuario (temporalmente sin bcrypt)
export const validateUserPassword = async (userId, password) => {
  const [rows] = await pool.execute(
    'SELECT clave FROM contraseña WHERE idUsuario = ? AND estado = "activa"',
    [userId]
  );
  
  if (!rows[0]) return false;
  
  // Comparación simple por ahora (para debugging)
  return password === rows[0].clave;
};

// Crear nuevo usuario
export const createUser = async (userData) => {
  const { nombre, apellidos, email, telefono, password, tipo } = userData;
  
  console.log('🔵 Repository - Creando usuario:', { nombre, apellidos, email, telefono, tipo });
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 1. Insertar en tabla usuario
    console.log('📝 Insertando en tabla usuario...');
    const [userResult] = await connection.execute(
      'INSERT INTO usuario (nombre, apellidos, email, telefono) VALUES (?, ?, ?, ?)',
      [nombre, apellidos, email, telefono]
    );
    
    const userId = userResult.insertId;
    console.log('✅ Usuario creado con ID:', userId);
    
    // 2. Insertar contraseña
    console.log('🔑 Insertando contraseña...');
    await connection.execute(
      'INSERT INTO contraseña (idUsuario, fechaCambio, clave, estado) VALUES (?, CURDATE(), ?, "activa")',
      [userId, password]
    );
    console.log('✅ Contraseña insertada');
    
    // 3. Insertar en tabla específica según tipo
    console.log('👤 Insertando tipo de usuario:', tipo);
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
    console.log('✅ Tipo de usuario insertado');
    
    await connection.commit();
    console.log('✅ Transacción completada exitosamente');
    
    return {
      idUsuario: userId,
      nombre,
      apellidos,
      email,
      telefono,
      tipo
    };
    
  } catch (error) {
    console.error('❌ Error en createUser:', error);
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};