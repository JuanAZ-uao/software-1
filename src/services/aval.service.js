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
 * params: { idUsuario, idEvento, file = null, tipoAval = null }, conn opcional, opts: { principal, forceAvalPdf }
 */
export async function createAval({ idUsuario, idEvento, file = null, tipoAval = null }, conn, opts = {}) {
  if (!idUsuario) throw Object.assign(new Error('idUsuario requerido'), { status: 400 });
  if (!idEvento) throw Object.assign(new Error('idEvento requerido'), { status: 400 });

  const allowedTipos = ['director_programa','director_docencia'];
  if (tipoAval && !allowedTipos.includes(tipoAval)) {
    throw Object.assign(new Error('tipoAval inválido'), { status: 400 });
  }

  let tipoAvalNormalized = (typeof tipoAval !== 'undefined' && tipoAval !== null) ? tipoAval : '';

  const connection = conn || pool;

  // buscar existente dentro de la misma conexión
  const existing = await repo.findByUserEvent(idUsuario, idEvento, connection);

  // opts
  const forcePdf = opts?.forceAvalPdf ?? null;
  const principalFlag = (typeof opts.principal !== 'undefined') ? (opts.principal ? 1 : 0) : 0;

  // debug log (temporal)
  console.log('[createAval] start', { idUsuario, idEvento, hasFile: !!file, fileFilename: file?.filename, forcePdf, tipoAvalNormalized, existingAvalPdf: existing?.avalPdf });

  // resolver ruta del archivo de forma robusta
  let avalPdf = null;
  if (file && (file.filename || file.path)) {
    // nuevo archivo: borrar anterior si existía
    if (existing && existing.avalPdf) {
      await unlinkFileIfExistsPath(existing.avalPdf).catch(()=>{});
    }
    if (file.filename) {
      avalPdf = `/uploads/${file.filename}`;
    } else {
      const p = file.path || '';
      if (p) {
        const idx = p.indexOf('uploads');
        if (idx >= 0) avalPdf = p.substring(idx).startsWith('/') ? p.substring(idx) : '/' + p.substring(idx);
        else avalPdf = `/uploads/${path.basename(p)}`;
      } else {
        avalPdf = null;
      }
    }
  } else if (forcePdf) {
    // forzar la ruta provista (por ejemplo la del uploader)
    avalPdf = forcePdf;
  } else {
    // no se envió archivo y no hay force:
    // - si existe fila previa y tiene avalPdf, dejar null para preservar (repo.upsert lo manejará)
    // - si no existe fila previa o no tiene avalPdf, intentar reutilizar la ruta del principal del evento
    if (existing && existing.avalPdf) {
      avalPdf = null; // preserve existing via upsert
    } else {
      // buscar fila principal del evento
      const all = await repo.findByEvent(idEvento, connection);
      const principalRow = (all || []).find(r => Number(r.principal) === 1);
      if (principalRow && principalRow.avalPdf) {
        avalPdf = principalRow.avalPdf;
        if (!tipoAvalNormalized && principalRow.tipoAval) tipoAvalNormalized = principalRow.tipoAval;
        console.log('[createAval] using principal fallback', { principalAvalPdf: avalPdf, principalTipoAval: principalRow.tipoAval });
      } else {
        avalPdf = null;
      }
    }
  }

  const record = {
    idUsuario: Number(idUsuario),
    idEvento: Number(idEvento),
    avalPdf,
    principal: principalFlag,
    tipoAval: tipoAvalNormalized
  };

  // debug log antes de upsert
  console.log('[createAval] upsert record', { idUsuario: record.idUsuario, idEvento: record.idEvento, avalPdf: record.avalPdf, principal: record.principal, tipoAval: record.tipoAval });

  const upserted = await repo.upsert(record, connection);

  // debug log resultado
  console.log('[createAval] upserted', upserted && { idUsuario: upserted.idUsuario, idEvento: upserted.idEvento, avalPdf: upserted.avalPdf, principal: upserted.principal, tipoAval: upserted.tipoAval });

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

export async function updateTipo({ idEvento, tipoAval }, conn) {
  const connection = conn || pool;

  const tipoAvalNormalized = (typeof tipoAval !== 'undefined' && tipoAval !== null) ? tipoAval : '';

  const [res] = await connection.query('UPDATE aval SET tipoAval = ? WHERE idEvento = ? AND principal = 1', [tipoAvalNormalized, idEvento]);
  if (res.affectedRows > 0) {
    const [rows] = await connection.query('SELECT * FROM aval WHERE idEvento = ? AND principal = 1 LIMIT 1', [idEvento]);
    return rows[0] || null;
  }

  const insertSql = 'INSERT INTO aval (idEvento, avalPdf, tipoAval, principal, creadoEn) VALUES (?, ?, ?, 1, NOW())';
  await connection.query(insertSql, [idEvento, '', tipoAvalNormalized]);
  const [rows2] = await connection.query('SELECT * FROM aval WHERE idEvento = ? AND principal = 1 LIMIT 1', [idEvento]);
  return rows2[0] || null;
}
