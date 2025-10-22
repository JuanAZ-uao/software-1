import pool from '../db/pool.js';

/**
 * Crea una nueva evaluación de evento
 * @param {object} evaluacion - Datos de la evaluación
 * @param {connection} conn - Conexión de base de datos (opcional para transacciones)
 * @returns {object} Resultado de la inserción
 */
export async function createEvaluacion(evaluacion, conn) {
  const connection = conn || pool;
  
  const [result] = await connection.execute(
    `INSERT INTO evaluacion (estado, fechaEvaluacion, justificacion, actaAprobacion, idEvento, idSecretaria) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      evaluacion.estado,
      evaluacion.fechaEvaluacion || new Date().toISOString().split('T')[0],
      evaluacion.justificacion,
      evaluacion.actaAprobacion || null,
      evaluacion.idEvento,
      evaluacion.idSecretaria
    ]
  );
  
  return { 
    insertedId: result.insertId,
    ...evaluacion
  };
}

/**
 * Obtiene todas las evaluaciones de un evento específico
 * @param {number} idEvento - ID del evento
 * @returns {Array} Lista de evaluaciones
 */
export async function findByEvento(idEvento) {
  const [rows] = await pool.execute(
    `SELECT 
      e.idEvaluacion,
      e.estado,
      e.fechaEvaluacion,
      e.justificacion,
      e.actaAprobacion,
      e.idEvento,
      e.idSecretaria,
      u.nombre AS secretariaNombre,
      u.apellidos AS secretariaApellidos,
      u.email AS secretariaEmail
     FROM evaluacion e 
     JOIN usuario u ON e.idSecretaria = u.idUsuario 
     WHERE e.idEvento = ? 
     ORDER BY e.fechaEvaluacion DESC`,
    [idEvento]
  );
  
  return rows.map(row => ({
    ...row,
    secretariaNombreCompleto: `${row.secretariaNombre} ${row.secretariaApellidos}`
  }));
}

/**
 * Obtiene todas las evaluaciones del sistema
 * @returns {Array} Lista completa de evaluaciones
 */
export async function findAll() {
  const [rows] = await pool.execute(
    `SELECT 
      e.idEvaluacion,
      e.estado,
      e.fechaEvaluacion,
      e.justificacion,
      e.actaAprobacion,
      e.idEvento,
      e.idSecretaria,
      u.nombre AS secretariaNombre,
      u.apellidos AS secretariaApellidos,
      ev.nombre AS nombreEvento,
      ev.tipo AS tipoEvento,
      ev.fecha AS fechaEvento
     FROM evaluacion e 
     JOIN usuario u ON e.idSecretaria = u.idUsuario 
     JOIN evento ev ON e.idEvento = ev.idEvento
     ORDER BY e.fechaEvaluacion DESC`
  );
  
  return rows.map(row => ({
    ...row,
    secretariaNombreCompleto: `${row.secretariaNombre} ${row.secretariaApellidos}`
  }));
}

/**
 * Obtiene una evaluación por su ID
 * @param {number} idEvaluacion - ID de la evaluación
 * @returns {object|null} Evaluación encontrada o null
 */
export async function findById(idEvaluacion) {
  const [rows] = await pool.execute(
    `SELECT 
      e.*,
      u.nombre AS secretariaNombre,
      u.apellidos AS secretariaApellidos
     FROM evaluacion e 
     JOIN usuario u ON e.idSecretaria = u.idUsuario 
     WHERE e.idEvaluacion = ?`,
    [idEvaluacion]
  );
  
  if (rows.length === 0) return null;
  
  return {
    ...rows[0],
    secretariaNombreCompleto: `${rows[0].secretariaNombre} ${rows[0].secretariaApellidos}`
  };
}

/**
 * Verifica si un evento ya tiene una evaluación
 * @param {number} idEvento - ID del evento
 * @returns {boolean} True si ya tiene evaluación
 */
export async function eventoTieneEvaluacion(idEvento) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) as count FROM evaluacion WHERE idEvento = ?',
    [idEvento]
  );
  
  return rows[0].count > 0;
}

/**
 * Obtiene la última evaluación de un evento
 * @param {number} idEvento - ID del evento
 * @returns {object|null} Última evaluación o null
 */
export async function findUltimaEvaluacionByEvento(idEvento) {
  const [rows] = await pool.execute(
    `SELECT 
      e.*,
      u.nombre AS secretariaNombre,
      u.apellidos AS secretariaApellidos
     FROM evaluacion e 
     JOIN usuario u ON e.idSecretaria = u.idUsuario 
     WHERE e.idEvento = ? 
     ORDER BY e.fechaEvaluacion DESC 
     LIMIT 1`,
    [idEvento]
  );
  
  if (rows.length === 0) return null;
  
  return {
    ...rows[0],
    secretariaNombreCompleto: `${rows[0].secretariaNombre} ${rows[0].secretariaApellidos}`
  };
}

/**
 * Obtiene todas las evaluaciones realizadas por una secretaria específica
 * @param {number} idSecretaria - ID de la secretaria
 * @returns {Array} Lista de evaluaciones realizadas
 */
export async function findBySecretaria(idSecretaria) {
  const [rows] = await pool.execute(
    `SELECT 
      e.*,
      ev.nombre AS nombreEvento,
      ev.tipo AS tipoEvento,
      ev.fecha AS fechaEvento
     FROM evaluacion e 
     JOIN evento ev ON e.idEvento = ev.idEvento
     WHERE e.idSecretaria = ? 
     ORDER BY e.fechaEvaluacion DESC`,
    [idSecretaria]
  );
  
  return rows;
}

/**
 * Actualiza una evaluación existente
 * @param {number} idEvaluacion - ID de la evaluación
 * @param {object} datos - Nuevos datos
 * @param {connection} conn - Conexión opcional
 * @returns {object} Evaluación actualizada
 */
export async function update(idEvaluacion, datos, conn) {
  const connection = conn || pool;
  
  const campos = [];
  const valores = [];
  
  if (datos.estado) {
    campos.push('estado = ?');
    valores.push(datos.estado);
  }
  
  if (datos.justificacion) {
    campos.push('justificacion = ?');
    valores.push(datos.justificacion);
  }
  
  if (datos.actaAprobacion !== undefined) {
    campos.push('actaAprobacion = ?');
    valores.push(datos.actaAprobacion);
  }
  
  if (campos.length === 0) {
    throw new Error('No hay campos para actualizar');
  }
  
  valores.push(idEvaluacion);
  
  await connection.execute(
    `UPDATE evaluacion SET ${campos.join(', ')} WHERE idEvaluacion = ?`,
    valores
  );
  
  return await findById(idEvaluacion);
}

/**
 * Elimina una evaluación (usar con precaución)
 * @param {number} idEvaluacion - ID de la evaluación
 * @param {connection} conn - Conexión opcional
 * @returns {boolean} True si se eliminó correctamente
 */
export async function deleteById(idEvaluacion, conn) {
  const connection = conn || pool;
  
  const [result] = await connection.execute(
    'DELETE FROM evaluacion WHERE idEvaluacion = ?',
    [idEvaluacion]
  );
  
  return result.affectedRows > 0;
}

/**
 * Obtiene estadísticas de evaluaciones
 * @returns {object} Estadísticas
 */
export async function getEstadisticas() {
  const [rows] = await pool.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN estado = 'aprobado' THEN 1 ELSE 0 END) as aprobados,
      SUM(CASE WHEN estado = 'rechazado' THEN 1 ELSE 0 END) as rechazados,
      COUNT(DISTINCT idSecretaria) as secretariasActivas
    FROM evaluacion
  `);
  
  return rows[0];
}