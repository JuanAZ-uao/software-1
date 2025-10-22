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
