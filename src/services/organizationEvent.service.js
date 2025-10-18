// src/services/organizationEvent.service.js
import * as repo from '../repositories/organizationEvent.repository.js';
import * as orgRepo from '../repositories/organizations.repository.js';

/**
 * linkOrganizationToEvent acepta certificadoFile (multer file object) opcional.
 * conn es opcional (transacción).
 *
 * Comportamiento:
 * - Respeta participante si viene en payload.
 * - Si esRepresentanteLegal === 'si' y participante no viene, intenta backfill desde organización.
 * - Si esRepresentanteLegal === 'no' exige participante.
 * - Guarda la ruta del certificado si se recibe certificadoFile; si no se recibe, deja el valor tal como viene.
 */
export async function linkOrganizationToEvent({ idOrganizacion, idEvento, participante = null, esRepresentanteLegal = 'no', certificadoFile = null, encargado = null }, conn) {
  if (!idOrganizacion || !idEvento) {
    const err = new Error('idOrganizacion e idEvento requeridos');
    err.status = 400;
    throw err;
  }

  const esRepFlag = String(esRepresentanteLegal || '').toLowerCase() === 'si' ||
                    String(esRepresentanteLegal || '').toLowerCase() === 'true';

  // Preferir participante del payload; si no existe, usar encargado si se envió
  let participanteFinal = (participante && String(participante).trim() !== '') ? String(participante).trim()
                       : (encargado && String(encargado).trim() !== '') ? String(encargado).trim()
                       : null;

  // Si es representante legal y no vino participante, intentar backfill desde la organización
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

  // Si no es representante legal, participante es obligatorio
  if (!esRepFlag && !participanteFinal) {
    const err = new Error('participante requerido cuando la organización no actúa como representante legal');
    err.status = 400;
    throw err;
  }

  // Si se subió un archivo, guardar la ruta; si no, no tocar certificadoParticipacion aquí
  const certificadoPath = certificadoFile ? `/uploads/${certificadoFile.filename}` : null;

  const record = {
    idOrganizacion,
    idEvento,
    participante: participanteFinal,
    esRepresentanteLegal: esRepFlag ? 'si' : 'no',
    certificadoParticipacion: certificadoPath
  };

  // Usar upsert para insertar o actualizar la relación
  return await repo.upsert(record, conn);
}

export async function unlinkByEvent(idEvento, conn) {
  return await repo.deleteByEvent(idEvento, conn);
}

export async function findByEvent(idEvento, conn) {
  return await repo.findByEvent(idEvento, conn);
}
