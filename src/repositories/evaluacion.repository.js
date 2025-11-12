// src/repositories/evaluacion.repository.js
import pool from '../db/pool.js';

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

  return { insertedId: result.insertId };
}

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

  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return {
    ...r,
    secretariaNombreCompleto: `${r.secretariaNombre} ${r.secretariaApellidos}`
  };
}

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

export async function eventoTieneEvaluacion(idEvento) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) as count FROM evaluacion WHERE idEvento = ?',
    [idEvento]
  );
  return rows[0].count > 0;
}

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
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return {
    ...r,
    secretariaNombreCompleto: `${r.secretariaNombre} ${r.secretariaApellidos}`
  };
}

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
  if (campos.length === 0) throw new Error('No hay campos para actualizar');

  valores.push(idEvaluacion);
  await connection.execute(
    `UPDATE evaluacion SET ${campos.join(', ')} WHERE idEvaluacion = ?`,
    valores
  );
  return await findById(idEvaluacion);
}

export async function deleteById(idEvaluacion, conn) {
  const connection = conn || pool;
  const [result] = await connection.execute(
    'DELETE FROM evaluacion WHERE idEvaluacion = ?',
    [idEvaluacion]
  );
  return result.affectedRows > 0;
}

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
