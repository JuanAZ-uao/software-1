// src/services/events.service.js
import pool from '../db/pool.js';
import * as repo from '../repositories/events.repository.js';
import * as instRepo from '../repositories/installations.repository.js';
import * as avalService from './aval.service.js';
import * as orgEventService from './organizationEvent.service.js';
import * as instEventSvc from './eventInstallation.service.js';
import fs from 'fs';

function validateEvento(payload) {
  if (!payload) throw Object.assign(new Error('Payload evento requerido'), { status: 400 });
  if (!payload.nombre) throw Object.assign(new Error('Nombre requerido'), { status: 400 });
  if (!payload.tipo || !['academico','ludico'].includes(String(payload.tipo))) throw Object.assign(new Error('Tipo inválido'), { status: 400 });
  if (!payload.fecha) throw Object.assign(new Error('Fecha requerida'), { status: 400 });
  if (!payload.hora) throw Object.assign(new Error('Hora requerida'), { status: 400 });
  if (!payload.horaFin) throw Object.assign(new Error('HoraFin requerida'), { status: 400 });
  // note: idInstalacion single is deprecated; payload may contain 'instalaciones' array
  const fecha = new Date(payload.fecha);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  if (fecha < hoy) throw Object.assign(new Error('Fecha debe ser hoy o futura'), { status: 400 });
  if (payload.horaFin <= payload.hora) throw Object.assign(new Error('horaFin debe ser mayor que hora'), { status: 400 });
}

async function unlinkFileIfExists(file) {
  try {
    if (!file || !file.path) return;
    await fs.promises.unlink(file.path).catch(()=>{});
  } catch (e) { /* noop */ }
}

/**
 * Create event with zero or many organizations and multiple installations.
 * params:
 *   { evento, tipoAval, uploaderId, organizaciones = [], files: { avalFile, certGeneral, orgFiles } }
 */
export async function createEventWithOrgs({ evento, tipoAval, uploaderId, organizaciones = [], files = {} }) {
  validateEvento(evento);

  if (!files || !files.avalFile) {
    throw Object.assign(new Error('Aval (PDF) obligatorio'), { status: 400 });
  }
  if (!tipoAval || !['director_programa','director_docencia'].includes(tipoAval)) {
    throw Object.assign(new Error('tipoAval inválido'), { status: 400 });
  }

  // validate instalaciones array if present
  if (!Array.isArray(evento.instalaciones) || evento.instalaciones.length === 0) {
    throw Object.assign(new Error('instalaciones requeridas'), { status: 400 });
  }

  // Optional: validate that each installation exists (lightweight)
  for (const idInst of evento.instalaciones) {
    const inst = await instRepo.findById(idInst);
    if (!inst) throw Object.assign(new Error(`Instalación ${idInst} no encontrada`), { status: 400 });
  }

  // prevent duplicate event by same nombre+fecha+hora+one installation (idempotency is optional)
  const existing = await repo.findByUniqueMatch({
    nombre: evento.nombre,
    fecha: evento.fecha,
    hora: evento.hora,
    idInstalacion: evento.instalaciones[0] // use first for duplicate check
  });
  if (existing) return existing;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // insert event row (merge uploader)
    const payloadToInsert = { ...evento, idUsuario: uploaderId };
    // if your evento table has idInstalacion column you may set it to first installation for compatibility
    if (!payloadToInsert.idInstalacion && Array.isArray(evento.instalaciones) && evento.instalaciones.length > 0) {
      payloadToInsert.idInstalacion = evento.instalaciones[0];
    }

    const evCreated = await repo.insert(payloadToInsert, conn);
    const idEvento = evCreated.idEvento;

    // attach aval using aval service (expects multer file)
    await avalService.createAval({ idUsuario: uploaderId, idEvento, file: files.avalFile, tipoAval }, conn);

    // create enlaces evento_instalacion for each selected installation
    if (Array.isArray(evento.instalaciones) && evento.instalaciones.length > 0) {
      await instEventSvc.linkInstallationsToEvent(idEvento, evento.instalaciones, conn);
    }

    // process organizations if any
    if (Array.isArray(organizaciones) && organizaciones.length > 0) {
      for (const org of organizaciones) {
        const certFile = files.orgFiles && files.orgFiles[org.idOrganizacion] ? files.orgFiles[org.idOrganizacion] : null;
        await orgEventService.linkOrganizationToEvent({
          idOrganizacion: org.idOrganizacion,
          idEvento,
          participante: org.participante ?? null,
          esRepresentanteLegal: org.representanteLegal ?? 'no',
          certificadoFile: certFile
        }, conn);
      }
    }

    // attach general certificate if provided
    if (files.certGeneral) {
      const certPath = `/uploads/${files.certGeneral.filename}`;
      await repo.attachGeneralCertificate(idEvento, { certificadoParticipacion: certPath }, conn);
    }

    await conn.commit();

    const created = await repo.findById(idEvento);
    return created;
  } catch (err) {
    await conn.rollback();

    // cleanup uploaded files
    try {
      await unlinkFileIfExists(files?.avalFile);
      await unlinkFileIfExists(files?.certGeneral);
      if (files?.orgFiles) {
        for (const k of Object.keys(files.orgFiles)) {
          await unlinkFileIfExists(files.orgFiles[k]);
        }
      }
    } catch (e) { /* noop */ }

    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Update event and optionally replace installations and organization links
 * params: { id, evento, tipoAval, uploaderId, organizaciones = [], files: { avalFile, certGeneral, orgFiles } }
 */
export async function updateEventWithOrgs({ id, evento, tipoAval, uploaderId, organizaciones = [], files = {} }) {
  validateEvento(evento);

  // If payload contains instalaciones array, validate them
  if (evento.instalaciones !== undefined && !Array.isArray(evento.instalaciones)) {
    throw Object.assign(new Error('instalaciones debe ser un array'), { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await repo.updateById(id, evento, conn);

    if (files && files.avalFile) {
      if (!tipoAval || !['director_programa','director_docencia'].includes(tipoAval)) {
        throw Object.assign(new Error('tipoAval inválido'), { status: 400 });
      }
      await avalService.createAval({ idUsuario: uploaderId, idEvento: id, file: files.avalFile, tipoAval }, conn);
    }

    // replace installations if instalaciones provided explicitly
    if (Array.isArray(evento.instalaciones)) {
      await instEventSvc.unlinkByEvent(id, conn);
      if (evento.instalaciones.length > 0) {
        await instEventSvc.linkInstallationsToEvent(id, evento.instalaciones, conn);
      }
    }

    // replace organization links if organizaciones provided explicitly
    if (Array.isArray(organizaciones)) {
      await orgEventService.unlinkByEvent(id, conn);
      for (const org of organizaciones) {
        const certFile = files.orgFiles && files.orgFiles[org.idOrganizacion] ? files.orgFiles[org.idOrganizacion] : null;
        await orgEventService.linkOrganizationToEvent({
          idOrganizacion: org.idOrganizacion,
          idEvento: id,
          participante: org.participante ?? null,
          esRepresentanteLegal: org.representanteLegal ?? 'no',
          certificadoFile: certFile
        }, conn);
      }
    }

    if (files && files.certGeneral) {
      const certPath = `/uploads/${files.certGeneral.filename}`;
      await repo.attachGeneralCertificate(id, { certificadoParticipacion: certPath }, conn);
    }

    await conn.commit();
    const updated = await repo.findById(id);
    return updated;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getAllEvents() {
  return await repo.findAll();
}

export async function getEventById(id) {
  return await repo.findById(id);
}

export async function deleteEvent(id) {
  return await repo.deleteById(id);
}
