// src/modules/auth/auth.repository.js
/**
 * auth.repository.js - Repositorio de autenticación
 *
 * Este archivo contiene funciones para interactuar con la base de datos relacionadas con usuarios y autenticación:
 * - Buscar usuario por email
 * - Validar contraseña
 * - Crear nuevo usuario y registros relacionados
 *
 * Utiliza pool de MySQL para ejecutar queries y transacciones.
 */

import bcrypt from 'bcryptjs';
import pool from '../../db/pool.js';

/**
 * Busca un usuario por email y retorna sus datos, tipo y contraseña activa
 * @param {string} email
 * @returns {object|null} Usuario o null si no existe
 */
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

/**
 * Valida la contraseña de un usuario (por ahora comparación simple, sin hash)
 * @param {number} userId
 * @param {string} password
 * @returns {boolean}
 */
export const validateUserPassword = async (userId, password) => {
  const [rows] = await pool.execute(
    'SELECT clave FROM `contraseña` WHERE idUsuario = ? AND estado = "activa"',
    [userId]
  );
  if (!rows[0]) return false;
  // Comparación simple por ahora (para debugging)
  return password === rows[0].clave;
};

/**
 * Crea un nuevo usuario y registros relacionados en la base de datos
 * @param {object} userData
 * @returns {object} Usuario creado
 */
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
      'INSERT INTO `contraseña` (idUsuario, fechaCambio, clave, estado) VALUES (?, CURDATE(), ?, "activa")',
      [userId, password]
    );
    console.log('✅ Contraseña insertada');
    // 3. Insertar en tabla específica según tipo CON RELACIONES CORRECTAS
    console.log('👤 Insertando tipo de usuario:', tipo);
    if (tipo === 'estudiante') {
      // Asegurar que exista al menos un programa
      let [progRows] = await connection.execute('SELECT idPrograma FROM programa LIMIT 1');
      if (progRows.length === 0) {
        // Crear dependencias mínimas: facultad y programa
        const [facRes] = await connection.execute('INSERT INTO facultad (nombre) VALUES ("General")');
        const facId = facRes.insertId;
        await connection.execute('INSERT INTO programa (nombre, idFacultad) VALUES ("General", ?)', [facId]);
        ;[progRows] = await connection.execute('SELECT idPrograma FROM programa LIMIT 1');
      }
      const programId = progRows[0].idPrograma;
      await connection.execute(
        'INSERT INTO estudiante (idUsuario, idPrograma) VALUES (?, ?)',
        [userId, programId]
      );
    } else if (tipo === 'docente') {
      // Asegurar que exista al menos una unidad académica
      let [uaRows] = await connection.execute('SELECT idUnidadAcademica FROM unidadAcademica LIMIT 1');
      if (uaRows.length === 0) {
        const [facRes] = await connection.execute('INSERT INTO facultad (nombre) VALUES ("General")');
        const facId = facRes.insertId;
        await connection.execute('INSERT INTO unidadAcademica (nombre, idFacultad) VALUES ("General", ?)', [facId]);
        ;[uaRows] = await connection.execute('SELECT idUnidadAcademica FROM unidadAcademica LIMIT 1');
      }
      const uaId = uaRows[0].idUnidadAcademica;
      await connection.execute(
        'INSERT INTO docente (idUsuario, idUnidadAcademica) VALUES (?, ?)',
        [userId, uaId]
      );
    } else if (tipo === 'secretaria') {
      // Asegurar que exista al menos una facultad
      let [facRows] = await connection.execute('SELECT idFacultad FROM facultad LIMIT 1');
      if (facRows.length === 0) {
        const [facRes] = await connection.execute('INSERT INTO facultad (nombre) VALUES ("General")');
        facRows = [{ idFacultad: facRes.insertId }];
      }
      const facId = facRows[0].idFacultad;
      await connection.execute(
        'INSERT INTO secretariaAcademica (idUsuario, idFacultad) VALUES (?, ?)',
        [userId, facId]
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