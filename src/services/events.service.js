// src/services/events.service.js
import pool from '../db/pool.js';
import * as repo from '../repositories/events.repository.js';
import * as instRepo from '../repositories/installations.repository.js';
import * as avalService from './aval.service.js';
import * as orgEventService from './organizationEvent.service.js';

function validateEvento(payload) {
  if (!payload) throw Object.assign(new Error('Payload evento requerido'), { status: 400 });
  if (!payload.nombre) throw Object.assign(new Error('Nombre requerido'), { status: 400 });
  if (!payload.tipo || !['academico','ludico'].includes(String(payload.tipo))) throw Object.assign(new Error('Tipo inválido'), { status: 400 });
  if (!payload.fecha) throw Object.assign(new Error('Fecha requerida'), { status: 400 });
  if (!payload.hora) throw Object.assign(new Error('Hora requerida'), { status: 400 });
  if (!payload.horaFin) throw Object.assign(new Error('HoraFin requerida'), { status: 400 });
  if (!payload.idInstalacion) throw Object.assign(new Error('idInstalacion requerido'), { status: 400 });
  const fecha = new Date(payload.fecha);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  if (fecha < hoy) throw Object.assign(new Error('Fecha debe ser hoy o futura'), { status: 400 });
  if (payload.horaFin <= payload.hora) throw Object.assign(new Error('horaFin debe ser mayor que hora'), { status: 400 });
}

export async function createEvent(payloadEvento, avalFile, orgRel, uploaderId, tipoAval) {
  validateEvento(payloadEvento);

  if (!avalFile) throw Object.assign(new Error('Aval (PDF) obligatorio'), { status: 400 });
  if (!tipoAval || !['director_programa','director_docencia'].includes(tipoAval)) {
    throw Object.assign(new Error('tipoAval inválido'), { status: 400 });
  }

  const inst = await instRepo.findById(payloadEvento.idInstalacion);
  if (!inst) throw Object.assign(new Error('Instalación no encontrada'), { status: 400 });

  // Prevención de duplicados (nombre+fecha+hora+instalacion)
  const existing = await repo.findByUniqueMatch({
    nombre: payloadEvento.nombre,
    fecha: payloadEvento.fecha,
    hora: payloadEvento.hora,
    idInstalacion: payloadEvento.idInstalacion
  });
  if (existing) {
    // devolver existente para idempotencia
    return existing;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const evCreated = await repo.insert({ ...payloadEvento, idUsuario: uploaderId }, conn);
    const idEvento = evCreated.idEvento;

    // crear aval
    await avalService.createAval({ idUsuario: uploaderId, idEvento, file: avalFile, tipoAval }, conn);

    // si hay organizacion participante, crear registro org-evento y adjuntar certificado si existe
    if (orgRel && orgRel.organizacionId) {
      // validar participante (service linkOrganizationToEvent lo valida también)
      await orgEventService.linkOrganizationToEvent({
        idOrganizacion: orgRel.organizacionId,
        idEvento,
        participante: orgRel.participante || null,
        esRepresentanteLegal: orgRel.orgIsRepresentative ? 'si' : 'no',
        certificadoFile: orgRel.certificadoFile || null
      }, conn);
    }

    await conn.commit();
    const created = await repo.findById(idEvento);
    return created;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateEvent(id, payloadEvento, avalFile, orgRel, uploaderId, tipoAval) {
  validateEvento(payloadEvento);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await repo.updateById(id, payloadEvento, conn);

    if (avalFile) {
      if (!tipoAval || !['director_programa','director_docencia'].includes(tipoAval)) {
        throw Object.assign(new Error('tipoAval inválido'), { status: 400 });
      }
      await avalService.createAval({ idUsuario: uploaderId, idEvento: id, file: avalFile, tipoAval }, conn);
    }

    if (orgRel && orgRel.organizacionId) {
      // eliminar vínculos previos y volver a crear con nuevo certificado si llega
      await orgEventService.unlinkByEvent(id, conn);
      await orgEventService.linkOrganizationToEvent({
        idOrganizacion: orgRel.organizacionId,
        idEvento: id,
        participante: orgRel.participante || null,
        esRepresentanteLegal: orgRel.orgIsRepresentative ? 'si' : 'no',
        certificadoFile: orgRel.certificadoFile || null
      }, conn);
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
