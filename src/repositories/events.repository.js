// src/repositories/events.repository.js
import pool from '../db/pool.js';

/**
 * Cache de columnas por tabla para evitar queries repetidas a INFORMATION_SCHEMA.
 * key: tableName, value: Set(columnName)
 */
const tableColumnsCache = new Map();

async function getTableColumns(tableName) {
  if (tableColumnsCache.has(tableName)) return tableColumnsCache.get(tableName);

  const sql = `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
  `;
  const [rows] = await pool.query(sql, [tableName]);
  const cols = new Set(rows.map(r => r.COLUMN_NAME));
  tableColumnsCache.set(tableName, cols);
  return cols;
}

function pickPayloadFields(payload, allowedCols) {
  const entries = [];
  const values = [];
  for (const key of Object.keys(payload)) {
    if (allowedCols.has(key)) {
      entries.push(key);
      values.push(payload[key]);
    }
  }
  return { entries, values };
}

export async function insert(evento, conn) {
  const connection = conn || pool;
  const allowedCols = await getTableColumns('evento');

  // pick only keys that exist in the table
  const { entries, values } = pickPayloadFields(evento, allowedCols);

  if (entries.length === 0) {
    throw Object.assign(new Error('No hay campos válidos para insertar en evento'), { status: 400 });
  }

  const placeholders = entries.map(() => '?').join(', ');
  const sql = `INSERT INTO evento (${entries.join(',')}) VALUES (${placeholders})`;
  const [result] = await connection.query(sql, values);

  const insertedId = result.insertId;
  const [rows] = await connection.query('SELECT * FROM evento WHERE idEvento = ? LIMIT 1', [insertedId]);
  return rows[0] || null;
}

export async function findById(id) {
  const [rows] = await pool.query(`
    SELECT 
      e.*,
      u.nombre as organizadorNombre,
      u.apellidos as organizadorApellidos,
      u.email as organizadorEmail,
      u.telefono as organizadorTelefono,
      a.avalPdf,
      a.tipoAval,
      GROUP_CONCAT(DISTINCT i.nombre) as instalacionesNombres,
      GROUP_CONCAT(DISTINCT i.idInstalacion) as instalacionesIds
    FROM evento e
    LEFT JOIN usuario u ON e.idUsuario = u.idUsuario
    LEFT JOIN evento_instalacion ei ON e.idEvento = ei.idEvento
    LEFT JOIN instalacion i ON ei.idInstalacion = i.idInstalacion
    LEFT JOIN aval a ON e.idEvento = a.idEvento AND a.principal = 1
    WHERE e.idEvento = ?
    GROUP BY e.idEvento, a.avalPdf, a.tipoAval
    LIMIT 1
  `, [id]);
  
  if (rows.length === 0) return null;
  
  const evento = rows[0];
  
  // Procesar y retornar evento con todos los campos
  return {
    ...evento,
    // Asegurar que todos los campos estén presentes
    nombre: evento.nombre || '',
    tipo: evento.tipo || '',
    fecha: evento.fecha || '',
    hora: evento.hora || '',
    horaFin: evento.horaFin || '',
    capacidad: evento.capacidad || null,
    ubicacion: evento.ubicacion || '',
    descripcion: evento.descripcion || '',
    avalPdf: evento.avalPdf || null,
    tipoAval: evento.tipoAval || null,
    organizadorNombre: `${evento.organizadorNombre || ''} ${evento.organizadorApellidos || ''}`.trim(),
    organizadorEmail: evento.organizadorEmail || '',
    organizadorTelefono: evento.organizadorTelefono || '',
    instalaciones: evento.instalacionesNombres ? 
      evento.instalacionesNombres.split(',').map((nombre, idx) => ({
        nombre: nombre.trim(),
        idInstalacion: evento.instalacionesIds?.split(',')[idx]
      })) : []
  };
}
export async function findAll() {
  const [rows] = await pool.query('SELECT * FROM evento ORDER BY idEvento DESC');
  return rows;
}

export async function findByUniqueMatch({ nombre, fecha, hora, idInstalacion }) {
  const [rows] = await pool.query(
    'SELECT * FROM evento WHERE nombre = ? AND fecha = ? AND hora = ? AND idInstalacion = ? LIMIT 1',
    [nombre, fecha, hora, idInstalacion]
  );
  return rows[0] || null;
}

export async function updateById(id, payload, conn) {
  const connection = conn || pool;
  const allowedCols = await getTableColumns('evento');
  const { entries, values } = pickPayloadFields(payload, allowedCols);
  if (entries.length === 0) {
    throw Object.assign(new Error('No hay campos válidos para actualizar en evento'), { status: 400 });
  }
  const setSql = entries.map(k => `${k} = ?`).join(', ');
  const sql = `UPDATE evento SET ${setSql} WHERE idEvento = ?`;
  await connection.query(sql, [...values, id]);
  const [rows] = await connection.query('SELECT * FROM evento WHERE idEvento = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function deleteById(id) {
  const [result] = await pool.query('DELETE FROM evento WHERE idEvento = ?', [id]);
  return result.affectedRows > 0;
}

/* ---------- helper functions to attach files to event ---------- */

/**
 * Attach aval info to event row. If your evento table already has avalPdf/tipoAval columns,
 * this will update them. Otherwise, implement alternative storage.
 */
export async function attachAval(idEvento, { avalPdf, tipoAval }, conn) {
  const connection = conn || pool;
  // check columns
  const allowedCols = await getTableColumns('evento');
  const updates = [];
  const params = [];
  if (allowedCols.has('avalPdf')) {
    updates.push('avalPdf = ?');
    params.push(avalPdf);
  }
  if (allowedCols.has('tipoAval')) {
    updates.push('tipoAval = ?');
    params.push(tipoAval);
  }
  if (updates.length === 0) return null;
  const sql = `UPDATE evento SET ${updates.join(', ')} WHERE idEvento = ?`;
  await connection.query(sql, [...params, idEvento]);
  const [rows] = await connection.query('SELECT * FROM evento WHERE idEvento = ? LIMIT 1', [idEvento]);
  return rows[0] || null;
}

/**
 * Attach general certificate path to event (certificadoParticipacion column)
 */
export async function attachGeneralCertificate(idEvento, { certificadoParticipacion }, conn) {
  const connection = conn || pool;
  const allowedCols = await getTableColumns('evento');
  if (!allowedCols.has('certificadoParticipacion')) {
    // if column doesn't exist, skip (or you can insert to a separate table)
    return null;
  }
  await connection.query('UPDATE evento SET certificadoParticipacion = ? WHERE idEvento = ?', [certificadoParticipacion, idEvento]);
  const [rows] = await connection.query('SELECT * FROM evento WHERE idEvento = ? LIMIT 1', [idEvento]);
  return rows[0] || null;
}
  

// ============================================
// NUEVA FUNCIÓN PARA DASHBOARD DE SECRETARIAS
// ============================================

/**
 * Obtiene todos los eventos con detalles del organizador para el dashboard de secretarias
 * Incluye: nombre organizador, email, teléfono, instalaciones, aval
 */
export async function getAllEventsWithDetails() {
  const [rows] = await pool.query(`
    SELECT 
      e.*,
      u.nombre as organizadorNombre,
      u.apellidos as organizadorApellidos,
      u.email as organizadorEmail,
      u.telefono as organizadorTelefono,
      a.avalPdf,
      a.tipoAval,
      GROUP_CONCAT(DISTINCT i.nombre) as instalacionesNombres
    FROM evento e
    LEFT JOIN usuario u ON e.idUsuario = u.idUsuario
    LEFT JOIN evento_instalacion ei ON e.idEvento = ei.idEvento
    LEFT JOIN instalacion i ON ei.idInstalacion = i.idInstalacion
    LEFT JOIN aval a ON e.idEvento = a.idEvento AND a.principal = 1
    GROUP BY e.idEvento, a.avalPdf, a.tipoAval
    ORDER BY e.fecha DESC, e.hora DESC
  `);
  
  // Procesar instalaciones y formatear datos
  return rows.map(row => ({
    ...row,
    capacidad: row.capacidad || null,
    ubicacion: row.ubicacion || '',
    descripcion: row.descripcion || '',
    avalPdf: row.avalPdf || null,
    tipoAval: row.tipoAval || null,
    organizadorNombre: `${row.organizadorNombre || ''} ${row.organizadorApellidos || ''}`.trim(),
    organizadorEmail: row.organizadorEmail || '',
    organizadorTelefono: row.organizadorTelefono || '',
    instalaciones: row.instalacionesNombres ? 
      row.instalacionesNombres.split(',').map(nombre => ({ nombre: nombre.trim() })) : []
  }));
}