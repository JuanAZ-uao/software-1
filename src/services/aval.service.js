// src/services/aval.service.js
import * as repo from '../repositories/aval.repository.js';

export async function createAval({ idUsuario, idEvento, file, tipoAval = null }, conn) {
  if (!file) throw Object.assign(new Error('File requerido para aval'), { status: 400 });
  if (!tipoAval || !['director_programa','director_docencia'].includes(tipoAval)) {
    throw Object.assign(new Error('tipoAval inválido'), { status: 400 });
  }
  const avalPdf = `/uploads/${file.filename}`;
  const record = {
    idUsuario,
    idEvento,
    avalPdf,
    principal: 1,
    tipoAval
  };
  return await repo.insert(record, conn);
}
