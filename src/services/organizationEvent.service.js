// src/services/organizationEvent.service.js
import * as repo from '../repositories/organizationEvent.repository.js';

/**
 * linkOrganizationToEvent accepts certificadoFile (multer file object) optional.
 * conn is optional transaction connection.
 * Validates that 'participante' is present (NOT NULL in DB).
 */
export async function linkOrganizationToEvent({ idOrganizacion, idEvento, participante = null, esRepresentanteLegal = 'no', certificadoFile = null }, conn) {
  if (!participante || String(participante).trim() === '') {
    throw Object.assign(new Error('participante requerido cuando hay organización participante'), { status: 400 });
  }

  // si llega certificadoFile, guardamos ruta
  let certificadoPath = null;
  if (certificadoFile) {
    certificadoPath = `/uploads/${certificadoFile.filename}`;
  }
  const record = {
    idOrganizacion,
    idEvento,
    participante,
    esRepresentanteLegal,
    certificadoParticipacion: certificadoPath
  };
  return await repo.insert(record, conn);
}

export async function unlinkByEvent(idEvento, conn) {
  return await repo.deleteByEvent(idEvento, conn);
}

export async function findByEvent(idEvento) {
  return await repo.findByEvent(idEvento);
}
