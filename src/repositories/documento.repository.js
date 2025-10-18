import pool from '../db/pool.js';

/**
 * Retorna todos los documentos registrados
 */
export async function findAllDocumentos() {
  const [rows] = await pool.execute('SELECT * FROM documento ORDER BY id DESC');
  return rows;
}

/**
 * Retorna un documento por ID
 */
export async function findDocumentoById(id) {
  const [rows] = await pool.execute('SELECT id FROM documento WHERE id = ?', [id]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Verifica si un documento ya está vinculado a un usuario
 */
export async function isDocumentoUsado(id) {
  const [rows] = await pool.execute('SELECT idUsuario FROM usuario WHERE documento = ?', [id]);
  return rows.length > 0;
}