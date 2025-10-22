// src/services/organizationEvent.service.js
import * as repo from '../repositories/organizationEvent.repository.js';
import * as orgRepo from '../repositories/organizations.repository.js';

/**
 * linkOrganizationToEvent:
 * - Respeta participante si viene.
 * - Si esRepresentanteLegal === 'si' y participante no viene, backfill desde organización.
 * - Si esRepresentanteLegal === 'no' exige participante.
 * - Si certificadoFile viene, actualiza la ruta; si no viene, no toca certificado (repo.upsert preserva).
 */
export async function linkOrganizationToEvent({ idOrganizacion, idEvento, participante = null, esRepresentanteLegal = 'no', certificadoFile = null, encargado = null }, conn) {
  if (!idOrganizacion || !idEvento) {
    const err = new Error('idOrganizacion e idEvento requeridos');
    err.status = 400;
    throw err;
  }

  const esRepFlag = String(esRepresentanteLegal || '').toLowerCase() === 'si' ||
                    String(esRepresentanteLegal || '').toLowerCase() === 'true';

  // prefer participante param; fallback to encargado param
  let participanteFinal = (participante && String(participante).trim() !== '') ? String(participante).trim()
                       : (encargado && String(encargado).trim() !== '') ? String(encargado).trim()
                       : null;

  // backfill from organization when esRepFlag === true and no participante provided
  if (esRepFlag && !participanteFinal) {
    const org = await orgRepo.findById(idOrganizacion);
    if (!org) {
      const err = new Error('Organización no encontrada');
      err.status = 400;
      throw err;
    }
    const repName = org.representanteLegal || org.representante || org.representante_legal || null;
    if (repName && String(repName).trim() !== '') {
      participanteFinal = String(repName).trim();
    } else {
      const err = new Error('participante o representanteLegal de la organización requerido');
      err.status = 400;
      throw err;
    }
  }

  if (!esRepFlag && !participanteFinal) {
    const err = new Error('participante requerido cuando la organización no actúa como representante legal');
    err.status = 400;
    throw err;
  }

  const certificadoPath = certificadoFile ? `/uploads/${certificadoFile.filename}` : null;

  const record = {
    idOrganizacion,
    idEvento,
    participante: participanteFinal,
    esRepresentanteLegal: esRepFlag ? 'si' : 'no',
    certificadoParticipacion: certificadoPath
  };

  return await repo.upsert(record, conn);
}

/* helpers */
export async function unlinkByEvent(idEvento, conn) {
  return await repo.deleteByEvent(idEvento, conn);
}

export async function findByEvent(idEvento, conn) {
  return await repo.findByEvent(idEvento, conn);
}

export async function clearCertificateForOrg(idOrganizacion, idEvento, conn) {
  return await repo.clearCertificate(idOrganizacion, idEvento, conn);
}
