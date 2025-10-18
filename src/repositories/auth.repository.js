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
import pool from '../db/pool.js';

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
 * Valida la contraseña de un usuario comparando con el hash almacenado
 * @param {number} userId
 * @param {string} password - Contraseña en texto plano
 * @returns {boolean}
 */
export const validateUserPassword = async (userId, password) => {
    const [rows] = await pool.execute(
        'SELECT clave FROM `contraseña` WHERE idUsuario = ? AND estado = "activa"',
        [userId]
    );
    if (!rows[0]) return false;
    
    // Comparar la contraseña en texto plano con el hash almacenado
    return await bcrypt.compare(password, rows[0].clave);
};

//veerificar si el documento ya está registrado
export async function isDocumentoRegistrado(documentoId) {
  const [rows] = await pool.execute(
    'SELECT idUsuario FROM usuario WHERE documento = ?',
    [documentoId]
  );
  return rows.length > 0;
}

/**
 * Crea un nuevo usuario y registros relacionados en la base de datos
 * @param {object} userData
 * @returns {object} Usuario creado
 */
export const createUser = async ({ nombre, apellidos, email, documento, telefono, password, tipo }) => {
  console.log('🔵 Repository - Creando usuario:', { nombre, apellidos, documento, email, telefono, tipo });
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log('🔄 Transacción iniciada');
    
    // 1. Insertar en la tabla usuario
    console.log('📝 Insertando en tabla usuario...');
    const [userResult] = await connection.execute(
      'INSERT INTO usuario (nombre, apellidos, documento, email, telefono) VALUES (?, ?, ?, ?, ?)',
      [nombre, apellidos, documento, email, telefono]
    );
    
    const userId = userResult.insertId;
    console.log('✅ Usuario creado con ID:', userId);
    
    // 2. Insertar contraseña ENCRIPTADA
    console.log('🔑 Encriptando y guardando contraseña...');
    const hashedPassword = await bcrypt.hash(password, 10);
    await connection.execute(
      'INSERT INTO contraseña (idUsuario, fechaCambio, clave, estado) VALUES (?, CURDATE(), ?, "activa")',
      [userId, hashedPassword]
    );
    console.log('✅ Contraseña encriptada e insertada');
    
    // 3. Insertar en tabla específica según tipo CON RELACIONES CORRECTAS
    console.log('👤 Insertando tipo de usuario:', tipo);
    if (tipo === 'estudiante') {
      // Usar el primer programa disponible
      const [programas] = await connection.execute('SELECT idPrograma FROM programa LIMIT 1');
      if (programas.length === 0) {
        throw new Error('No hay programas disponibles para asignar al estudiante');
      }
      await connection.execute(
        'INSERT INTO estudiante (idUsuario, idPrograma) VALUES (?, ?)',
        [userId, programas[0].idPrograma]
      );
      console.log('✅ Estudiante insertado en programa ID:', programas[0].idPrograma);
      
    } else if (tipo === 'docente') {
      // Usar la primera unidad académica disponible
      const [unidades] = await connection.execute('SELECT idUnidadAcademica FROM unidadAcademica LIMIT 1');
      if (unidades.length === 0) {
        throw new Error('No hay unidades académicas disponibles para asignar al docente');
      }
      await connection.execute(
        'INSERT INTO docente (idUsuario, idUnidadAcademica) VALUES (?, ?)',
        [userId, unidades[0].idUnidadAcademica]
      );
      console.log('✅ Docente insertado en unidad ID:', unidades[0].idUnidadAcademica);
      
    } else if (tipo === 'secretaria') {
      // Usar la primera facultad disponible
      const [facultades] = await connection.execute('SELECT idFacultad FROM facultad LIMIT 1');
      if (facultades.length === 0) {
        throw new Error('No hay facultades disponibles para asignar a la secretaría');
      }
      await connection.execute(
        'INSERT INTO secretariaAcademica (idUsuario, idFacultad) VALUES (?, ?)',
        [userId, facultades[0].idFacultad]
      );
      console.log('✅ Secretaría insertada en facultad ID:', facultades[0].idFacultad);
    }
    
    await connection.commit();
    console.log('✅ Transacción completada exitosamente');
    
    return {
      idUsuario: userId,
      nombre,
      apellidos,
      documento,
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

/**
 * Actualiza la contraseña de un usuario encriptándola
 * @param {number} userId
 * @param {string} newPassword - Contraseña nueva en texto plano
 */
export const updateUserPassword = async (userId, newPassword) => {
    console.log('🔑 Encriptando nueva contraseña...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.execute(
        'UPDATE contraseña SET clave = ?, fechaCambio = CURDATE() WHERE idUsuario = ? AND estado = "activa"',
        [hashedPassword, userId]
    );
    console.log('✅ Contraseña actualizada y encriptada');
};