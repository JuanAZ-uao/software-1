// src/services/aval.service.js
import * as repo from '../repositories/aval.repository.js';
import path from 'path';
import fs from 'fs';

async function unlinkFileIfExistsPath(certPath) {
  try {
    if (!certPath) return;
    const abs = certPath.startsWith('/') ? path.join(process.cwd(), certPath) : path.join(process.cwd(), 'uploads', certPath);
    await fs.promises.unlink(abs).catch(()=>{});
  } catch (e) { /* noop */ }
}

/**
 * Crea o reemplaza el aval para un evento por un usuario.
 * - Si ya existe un registro (clave compuesta idUsuario+idEvento), elimina el archivo previo del FS si existía.
 * - Valida tipoAval y file.
 * - Realiza upsert en el repositorio y devuelve la fila resultante.
 *
 * params: { idUsuario, idEvento, file, tipoAval = null }, conn opcional (transacción)
 */
export async function createAval({ idUsuario, idEvento, file, tipoAval = null }, conn) {
  if (!file) throw Object.assign(new Error('File requerido para aval'), { status: 400 });
  if (!tipoAval || !['director_programa','director_docencia'].includes(tipoAval)) {
    throw Object.assign(new Error('tipoAval inválido'), { status: 400 });
  }
  if (!idUsuario) throw Object.assign(new Error('idUsuario requerido'), { status: 400 });
  if (!idEvento) throw Object.assign(new Error('idEvento requerido'), { status: 400 });

  // normalizar ruta del nuevo archivo
  const newPath = `/uploads/${file.filename}`;

  // buscar si ya existe un aval para este idUsuario+idEvento
  const existing = await repo.findByUserEvent(idUsuario, idEvento);

  // si existe y tiene avalPdf, borrar el archivo anterior del disco
  if (existing && existing.avalPdf) {
    await unlinkFileIfExistsPath(existing.avalPdf).catch(()=>{});
  }

  // preparar record y llamar al repo.upsert
  const record = {
    idUsuario,
    idEvento,
    avalPdf: newPath,
    principal: 1,
    tipoAval
  };

  const upserted = await repo.upsert(record, conn);
  return upserted;
}

export async function findByEvent(idEvento) {
  return await repo.findByEvent(idEvento);
}

/**
 * Actualiza el tipoAval de la fila principal (principal = 1) para un evento.
 * Si no existe una fila principal, inserta una nueva fila mínima (sin archivo) y la marca principal.
 */
export async function updateTipo({ idEvento, tipoAval }, conn) {
  const connection = conn || pool;

  // Asegura que tipoAval sea válido en caller; aquí no revalidamos exhaustivamente.
  // Intentar actualizar primero
  const [res] = await connection.query('UPDATE aval SET tipoAval = ? WHERE idEvento = ? AND principal = 1', [tipoAval, idEvento]);
  if (res.affectedRows > 0) {
    const [rows] = await connection.query('SELECT * FROM aval WHERE idEvento = ? AND principal = 1 LIMIT 1', [idEvento]);
    return rows[0] || null;
  }

  // Si no existía, insertar una fila mínima (sin archivo) y marcar principal
  const insertSql = 'INSERT INTO aval (idEvento, avalPdf, tipoAval, principal, creadoEn) VALUES (?, NULL, ?, 1, NOW())';
  await connection.query(insertSql, [idEvento, tipoAval]);
  const [rows2] = await connection.query('SELECT * FROM aval WHERE idEvento = ? AND principal = 1 LIMIT 1', [idEvento]);
  return rows2[0] || null;
}