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
  const [rows] = await pool.query('SELECT * FROM evento WHERE idEvento = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function findAll() {
  const [rows] = await pool.query('SELECT * FROM evento ORDER BY fecha DESC, hora DESC');
  return rows;
}

export async function updateById(id, payload, conn) {
  const connection = conn || pool;
  const allowedCols = await getTableColumns('evento');
  const fields = [];
  const values = [];

  for (const key of Object.keys(payload)) {
    if (!allowedCols.has(key)) continue;
    fields.push(`${key} = ?`);
    values.push(payload[key]);
  }
  if (fields.length === 0) return;
  values.push(id);
  await connection.query(`UPDATE evento SET ${fields.join(', ')} WHERE idEvento = ?`, values);
}

export async function deleteById(id) {
  const [result] = await pool.query('DELETE FROM evento WHERE idEvento = ?', [id]);
  return result.affectedRows > 0;
}

/**
 * findByUniqueMatch remains useful for idempotency.
 * It will only query with columns that exist in the table.
 */
export async function findByUniqueMatch({ nombre, fecha, hora, idInstalacion }) {
  const allowedCols = await getTableColumns('evento');
  const conditions = [];
  const params = [];

  if (allowedCols.has('nombre') && typeof nombre !== 'undefined') { conditions.push('nombre = ?'); params.push(nombre); }
  if (allowedCols.has('fecha') && typeof fecha !== 'undefined') { conditions.push('fecha = ?'); params.push(fecha); }
  if (allowedCols.has('hora') && typeof hora !== 'undefined') { conditions.push('hora = ?'); params.push(hora); }
  if (allowedCols.has('idInstalacion') && typeof idInstalacion !== 'undefined') { conditions.push('idInstalacion = ?'); params.push(idInstalacion); }

  if (conditions.length === 0) return null;

  const sql = `SELECT * FROM evento WHERE ${conditions.join(' AND ')} LIMIT 1`;
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}
