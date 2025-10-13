// src/services/organizationEvent.service.js
import * as repo from '../repositories/organizationEvent.repository.js';
import * as orgRepo from '../repositories/organizations.repository.js';

/**
 * linkOrganizationToEvent accepts certificadoFile (multer file object) optional.
 * conn is optional transaction connection.
 *
 * Behaviour:
 * - If esRepresentanteLegal indicates the organization acts via its legal representative,
 *   and 'participante' is not provided, the service fetches the organization's representanteLegal
 *   and uses that value as participante.
 * - If organization not found or no representanteLegal available when required, returns 400.
 * - If the organization is NOT represented (esRepresentanteLegal=false) and participante is missing, returns 400.
 */
export async function linkOrganizationToEvent({ idOrganizacion, idEvento, participante = null, esRepresentanteLegal = 'no', certificadoFile = null, encargado = null }, conn) {
  if (!repo || typeof repo.insert !== 'function') {
    console.error('organizationEvent.repository.js exports:', repo);
    throw Object.assign(new Error('Repositorio organizacion_evento no exporta insert'), { status: 500 });
  }

  const esRepFlag = String(esRepresentanteLegal || '').toLowerCase() === 'si' ||
                    String(esRepresentanteLegal || '').toLowerCase() === 'true' ||
                    String(esRepresentanteLegal || '').toLowerCase() === 'yes';

  let participanteFinal = (participante && String(participante).trim() !== '') ? String(participante).trim()
                       : (encargado && String(encargado).trim() !== '') ? String(encargado).trim()
                       : null;

  // If org exists and is representative and no participante provided, read representanteLegal from org
  if (idOrganizacion && esRepFlag && !participanteFinal) {
    const org = await orgRepo.findById(idOrganizacion);
    if (!org) {
      const err = new Error('Organización no encontrada');
      err.status = 400;
      throw err;
    }
    // possible field names: representanteLegal or representante
    const repName = org.representanteLegal || org.representante || org.representante_legal || null;
    if (repName && String(repName).trim() !== '') {
      participanteFinal = String(repName).trim();
    } else {
      const err = new Error('participante o representanteLegal de la organización requerido');
      err.status = 400;
      throw err;
    }
  }

  // If org present and not representative, participante is mandatory
  if (idOrganizacion && !esRepFlag && !participanteFinal) {
    const err = new Error('participante requerido cuando la organización no actúa como representante legal');
    err.status = 400;
    throw err;
  }

  let certificadoPath = null;
  if (certificadoFile) {
    certificadoPath = `/uploads/${certificadoFile.filename}`;
  }

  const record = {
    idOrganizacion,
    idEvento,
    participante: participanteFinal,
    esRepresentanteLegal: esRepFlag ? 'si' : 'no',
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
