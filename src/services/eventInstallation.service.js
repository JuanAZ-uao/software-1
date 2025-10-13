// src/services/eventInstallation.service.js
import * as repo from '../repositories/eventInstallation.repository.js';

/**
 * linkInstallationsToEvent: crea enlaces evento->instalacion.
 * idEvento: number
 * instalaciones: array of idInstalacion (strings or numbers)
 * conn: optional DB connection/transaction
 */
export async function linkInstallationsToEvent(idEvento, instalaciones = [], conn) {
  if (!idEvento) {
    throw Object.assign(new Error('idEvento requerido'), { status: 400 });
  }
  if (!Array.isArray(instalaciones)) instalaciones = [];
  const created = [];
  for (const idInst of instalaciones) {
    if (!idInst) continue;
    const rec = { idEvento, idInstalacion: idInst };
    const row = await repo.insert(rec, conn);
    created.push(row);
  }
  return created;
}

export async function unlinkByEvent(idEvento, conn) {
  if (!idEvento) return 0;
  return await repo.deleteByEvent(idEvento, conn);
}

export async function findByEvent(idEvento) {
  if (!idEvento) return [];
  return await repo.findByEvent(idEvento);
}

