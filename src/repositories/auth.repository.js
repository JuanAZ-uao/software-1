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
export const createUser = async ({ nombre, apellidos, email, telefono, password, tipo }) => {
  console.log('🔵 Repository - Creando usuario:', { nombre, apellidos, email, telefono, tipo });
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log('🔄 Transacción iniciada');
    
    // 1. Insertar en la tabla usuario
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
 * Actualiza la contraseña de un usuario (usada para recuperación de contraseña)
 * @param {number} userId
 * @param {string} newPassword (sin hashear - se guarda tal como viene)
 */
export const updateUserPassword = async (userId, newPassword) => {
    await pool.execute(
        'UPDATE contraseña SET clave = ?, fechaCambio = NOW(), estado = "activa" WHERE idUsuario = ?',
        [newPassword, userId]
    );
};

/**
 * Actualiza el perfil de un usuario (nombre, apellidos, email, telefono)
 * Permite actualizar campos individuales - solo actualiza los campos que no son undefined/null
 */
export const updateUserProfile = async (userId, { nombre, apellidos, email, telefono }) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 Actualizando perfil del usuario:', userId);
    
    // Preparar campos a actualizar (solo los que no son undefined/null)
    const fields = [];
    const values = [];
    
    if (nombre !== undefined && nombre !== null) {
      fields.push('nombre = ?');
      values.push(nombre);
    }
    if (apellidos !== undefined && apellidos !== null) {
      fields.push('apellidos = ?');
      values.push(apellidos);
    }
    if (email !== undefined && email !== null) {
      fields.push('email = ?');
      values.push(email);
    }
    if (telefono !== undefined && telefono !== null) {
      fields.push('telefono = ?');
      values.push(telefono);
    }
    
    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }
    
    values.push(userId); // Para el WHERE
    
    // Actualizar datos del usuario
    await connection.execute(
      `UPDATE usuario SET ${fields.join(', ')} WHERE idUsuario = ?`,
      values
    );
    
    console.log('✅ Perfil actualizado exitosamente');
    
    // Retornar los datos actualizados con el tipo de usuario
    const [users] = await connection.execute(
      `SELECT u.idUsuario, u.nombre, u.apellidos, u.email, u.telefono,
              CASE 
                WHEN e.idUsuario IS NOT NULL THEN 'estudiante'
                WHEN d.idUsuario IS NOT NULL THEN 'docente' 
                WHEN s.idUsuario IS NOT NULL THEN 'secretaria'
                ELSE 'usuario'
              END as tipo
       FROM usuario u 
       LEFT JOIN estudiante e ON u.idUsuario = e.idUsuario
       LEFT JOIN docente d ON u.idUsuario = d.idUsuario  
       LEFT JOIN secretariaAcademica s ON u.idUsuario = s.idUsuario
       WHERE u.idUsuario = ?`,
      [userId]
    );
    
    return users[0];
    
  } catch (error) {
    console.error('❌ Error actualizando perfil:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Cambia la contraseña de un usuario después de verificar la contraseña actual
 */
export const changeUserPassword = async (userId, currentPassword, newPassword) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 Cambiando contraseña del usuario:', userId);
    
    // Verificar contraseña actual
    const [passwords] = await connection.execute(
      'SELECT clave FROM contraseña WHERE idUsuario = ? AND estado = "activa"',
      [userId]
    );
    
    if (passwords.length === 0) {
      throw new Error('Usuario no encontrado o sin contraseña activa');
    }
    
    // Por ahora comparación directa (sin hash) - consistente con validateUserPassword
    if (passwords[0].clave !== currentPassword) {
      throw new Error('La contraseña actual es incorrecta');
    }
    
    // Actualizar contraseña
    await connection.execute(
      'UPDATE contraseña SET clave = ?, fechaCambio = CURDATE() WHERE idUsuario = ? AND estado = "activa"',
      [newPassword, userId]
    );
    
    console.log('✅ Contraseña actualizada exitosamente');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error cambiando contraseña:', error);
    throw error;
  } finally {
    connection.release();
  }
};