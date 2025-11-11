// src/services/aval.service.js
import * as repo from '../repositories/aval.repository.js';
import path from 'path';
import fs from 'fs';
import pool from '../db/pool.js';

async function unlinkFileIfExistsPath(certPath) {
  try {
    if (!certPath) return;
    const abs = certPath.startsWith('/') ? path.join(process.cwd(), certPath) : path.join(process.cwd(), 'uploads', certPath);
    await fs.promises.unlink(abs).catch(()=>{});
  } catch (e) { /* noop */ }
}

/**
 * Crea o reemplaza el aval para un evento por un usuario.
 * - file es opcional: si no se envía, no se borra el archivo previo y se preserva avalPdf (gracias a COALESCE en repo.upsert).
 * - Si se envía file, borra el archivo previo (si existía) y guarda la nueva ruta.
 * - tipoAval es opcional; si se provee se valida su formato.
 *
 * params: { idUsuario, idEvento, file = null, tipoAval = null }, conn opcional (transacción)
 */
// opts: { principal: 0|1 }  (por defecto 0)
/**
 * params: { idUsuario, idEvento, file = null, tipoAval = null }, conn opcional, opts: { principal, forceAvalPdf }
 */
export async function createAval({ idUsuario, idEvento, file = null, tipoAval = null }, conn, opts = {}) {
  if (!idUsuario) throw Object.assign(new Error('idUsuario requerido'), { status: 400 });
  if (!idEvento) throw Object.assign(new Error('idEvento requerido'), { status: 400 });

  const allowedTipos = ['director_programa','director_docencia'];
  if (tipoAval && !allowedTipos.includes(tipoAval)) {
    throw Object.assign(new Error('tipoAval inválido'), { status: 400 });
  }

  const connection = conn || pool;

  // buscar existente dentro de la misma conexión
  const existing = await repo.findByUserEvent(idUsuario, idEvento, connection);

  let avalPdf = null;
  if (file && file.filename) {
    // nuevo archivo: borrar anterior si existía
    if (existing && existing.avalPdf) {
      await unlinkFileIfExistsPath(existing.avalPdf).catch(()=>{});
    }
    avalPdf = `/uploads/${file.filename}`;
  } else if (opts && opts.forceAvalPdf) {
    // forzar la ruta provista (por ejemplo la del uploader)
    avalPdf = opts.forceAvalPdf;
  } else {
    // no se envió archivo y no hay force: dejar null para que repo.upsert maneje (o repo puede convertir a '')
    avalPdf = null;
  }

  // permitir pasar principal por opts; por defecto 0 (participante)
  const principalFlag = (typeof opts.principal !== 'undefined') ? (opts.principal ? 1 : 0) : 0;

  const record = {
    idUsuario: Number(idUsuario),
    idEvento: Number(idEvento),
    avalPdf,
    principal: principalFlag,
    tipoAval: tipoAval ?? null
  };

  // upsert: repo.upsert debe aceptar connection y manejar null/'' según esquema
  const upserted = await repo.upsert(record, connection);
  return upserted;
}

/**
 * Elimina un aval (fila) y borra archivo físico si existía.
 * params: { idEvento, idUsuario }, conn opcional
 */
export async function deleteAval({ idEvento, idUsuario }, conn) {
  if (!idEvento) throw Object.assign(new Error('idEvento requerido'), { status: 400 });
  if (!idUsuario) throw Object.assign(new Error('idUsuario requerido'), { status: 400 });

  const connection = conn || pool;

  const existing = await repo.findByUserEvent(idUsuario, idEvento, connection);
  if (existing && existing.avalPdf) {
    await unlinkFileIfExistsPath(existing.avalPdf).catch(()=>{});
  }

  const affected = await repo.deleteAval(idEvento, idUsuario, connection);
  return affected;
}

export async function findByEvent(idEvento, conn) {
  return await repo.findByEvent(idEvento, conn);
}

/**
 * Actualiza el tipoAval de la fila principal (principal = 1) para un evento.
 * Si no existe una fila principal, inserta una nueva fila mínima (sin archivo) y la marca principal.
 */
export async function updateTipo({ idEvento, tipoAval }, conn) {
  const connection = conn || pool;

  const [res] = await connection.query('UPDATE aval SET tipoAval = ? WHERE idEvento = ? AND principal = 1', [tipoAval, idEvento]);
  if (res.affectedRows > 0) {
    const [rows] = await connection.query('SELECT * FROM aval WHERE idEvento = ? AND principal = 1 LIMIT 1', [idEvento]);
    return rows[0] || null;
  }

  const insertSql = 'INSERT INTO aval (idEvento, avalPdf, tipoAval, principal, creadoEn) VALUES (?, NULL, ?, 1, NOW())';
  await connection.query(insertSql, [idEvento, tipoAval]);
  const [rows2] = await connection.query('SELECT * FROM aval WHERE idEvento = ? AND principal = 1 LIMIT 1', [idEvento]);
  return rows2[0] || null;
}
