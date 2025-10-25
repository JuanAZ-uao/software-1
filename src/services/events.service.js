// src/services/events.service.js
import pool from '../db/pool.js';
import * as repo from '../repositories/events.repository.js';
import * as instRepo from '../repositories/installations.repository.js';
import * as avalService from './aval.service.js';
import * as orgEventService from './organizationEvent.service.js';
import * as instEventSvc from './eventInstallation.service.js';
import * as evaluacionRepo from '../repositories/evaluacion.repository.js'; // NUEVO
import * as eventsRepo from '../repositories/events.repository.js'; // NUEVO
import fs from 'fs';
import path from 'path';

function validateEvento(payload) {
  if (!payload) throw Object.assign(new Error('Payload evento requerido'), { status: 400 });
  if (!payload.nombre) throw Object.assign(new Error('Nombre requerido'), { status: 400 });
  if (!payload.tipo || !['academico','ludico'].includes(String(payload.tipo))) throw Object.assign(new Error('Tipo inválido'), { status: 400 });
  if (!payload.fecha) throw Object.assign(new Error('Fecha requerida'), { status: 400 });
  if (!payload.hora) throw Object.assign(new Error('Hora requerida'), { status: 400 });
  if (!payload.horaFin) throw Object.assign(new Error('HoraFin requerida'), { status: 400 });
  const fecha = new Date(payload.fecha);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  if (fecha < hoy) throw Object.assign(new Error('Fecha debe ser hoy o futura'), { status: 400 });
  if (payload.horaFin <= payload.hora) throw Object.assign(new Error('horaFin debe ser mayor que hora'), { status: 400 });
  if (payload.capacidad !== undefined && payload.capacidad !== null) {
    const c = Number(payload.capacidad);
    if (!Number.isInteger(c) || c < 1) throw Object.assign(new Error('capacidad inválida'), { status: 400 });
  }
}

async function unlinkFileIfExistsPath(certPath) {
  try {
    if (!certPath) return;
    const abs = certPath.startsWith('/') ? path.join(process.cwd(), certPath) : path.join(process.cwd(), 'uploads', certPath);
    await fs.promises.unlink(abs).catch(()=>{});
  } catch (e) { /* noop */ }
}

async function unlinkFileIfExists(file) {
  try {
    if (!file) return;
    if (file.path) {
      await fs.promises.unlink(file.path).catch(()=>{});
    } else if (file.filename) {
      const abs = path.join(process.cwd(), 'uploads', file.filename);
      await fs.promises.unlink(abs).catch(()=>{});
    }
  } catch (e) { /* noop */ }
}

/**
 * Helper: compute total capacity available given array of installation ids
 */
async function computeSumCapacity(installationsIds = []) {
  let sum = 0;
  for (const id of installationsIds) {
    const inst = await instRepo.findById(id);
    if (!inst) throw Object.assign(new Error(`Instalación ${id} no encontrada`), { status: 400 });
    const capInst = inst.capacidad !== undefined && inst.capacidad !== null ? Number(inst.capacidad) : null;
    if (capInst === null || !Number.isInteger(capInst)) {
      throw Object.assign(new Error(`Capacidad no definida o inválida para instalación ${id}`), { status: 400 });
    }
    sum += capInst;
  }
  return sum;
}

/**
 * Create event with organizations and installations.
 * params:
 *   { evento, tipoAval, uploaderId, organizaciones = [], files: { avalFile, certGeneral, orgFiles } }
 */
export async function createEventWithOrgs({ evento, tipoAval, uploaderId, organizaciones = [], files = {} }) {
  validateEvento(evento);

  // require capacidad at creation
  if (evento.capacidad === undefined || evento.capacidad === null) {
    throw Object.assign(new Error('capacidad del evento requerida'), { status: 400 });
  }
  const capacidadEvento = Number(evento.capacidad);
  if (!Number.isInteger(capacidadEvento) || capacidadEvento < 1) {
    throw Object.assign(new Error('capacidad inválida'), { status: 400 });
  }

  if (!files || !files.avalFile) {
    throw Object.assign(new Error('Aval (PDF) obligatorio'), { status: 400 });
  }
  if (!tipoAval || !['director_programa','director_docencia'].includes(tipoAval)) {
    throw Object.assign(new Error('tipoAval inválido'), { status: 400 });
  }

  if (!Array.isArray(evento.instalaciones) || evento.instalaciones.length === 0) {
    throw Object.assign(new Error('instalaciones requeridas'), { status: 400 });
  }

  // compute sum capacity of selected installations
  const sumCap = await computeSumCapacity(evento.instalaciones);
  if (sumCap < capacidadEvento) {
    throw Object.assign(new Error(`Capacidad total de instalaciones seleccionadas (${sumCap}) es menor que la capacidad del evento (${capacidadEvento})`), { status: 400 });
  }

  // optional uniqueness check
  const existing = await repo.findByUniqueMatch({
    nombre: evento.nombre,
    fecha: evento.fecha,
    hora: evento.hora,
    idInstalacion: evento.instalaciones[0]
  });
  if (existing) return existing;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const payloadToInsert = { ...evento, idUsuario: uploaderId, capacidad: capacidadEvento };
    if (!payloadToInsert.idInstalacion && Array.isArray(evento.instalaciones) && evento.instalaciones.length > 0) {
      payloadToInsert.idInstalacion = evento.instalaciones[0];
    }

    const evCreated = await repo.insert(payloadToInsert, conn);
    const idEvento = evCreated.idEvento;

    // create aval (service handles file persistence)
    await avalService.createAval({ idUsuario: uploaderId, idEvento, file: files.avalFile, tipoAval }, conn);

    // link installations
    if (Array.isArray(evento.instalaciones) && evento.instalaciones.length > 0) {
      await instEventSvc.linkInstallationsToEvent(idEvento, evento.instalaciones, conn);
    }

    // organizations linking and certificates
    if (Array.isArray(organizaciones) && organizaciones.length > 0) {
      for (const org of organizaciones) {
        const certFile = files.orgFiles && files.orgFiles[org.idOrganizacion] ? files.orgFiles[org.idOrganizacion] : null;
        await orgEventService.linkOrganizationToEvent({
          idOrganizacion: org.idOrganizacion,
          idEvento,
          participante: org.participante ?? null,
          esRepresentanteLegal: org.representanteLegal ?? org.esRepresentanteLegal ?? 'no',
          certificadoFile: certFile,
          encargado: org.encargado ?? null
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
        for (const k of Object.keys(files.orgFiles)) await unlinkFileIfExists(files.orgFiles[k]);
      }
    } catch (e) { /* noop */ }
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Update event and synchronize organizations WITHOUT removing certificates unnecessarily.
 * Also supports replacing or deleting the event-level aval.
 *
 * params:
 *  { id, evento, tipoAval, uploaderId, organizaciones = [], files = {}, deleteAval = false }
 */
export async function updateEventWithOrgs({ id, evento, tipoAval, uploaderId, organizaciones = [], files = {}, deleteAval = false }) {
  validateEvento(evento);

  if (evento.instalaciones !== undefined && !Array.isArray(evento.instalaciones)) {
    throw Object.assign(new Error('instalaciones debe ser un array'), { status: 400 });
  }

  // if client provided capacidad, validate against installations (provided or existing)
  const capacidadEvento = (evento.capacidad !== undefined && evento.capacidad !== null) ? Number(evento.capacidad) : null;
  if (capacidadEvento !== null) {
    if (!Number.isInteger(capacidadEvento) || capacidadEvento < 1) throw Object.assign(new Error('capacidad inválida'), { status: 400 });
    const instIds = Array.isArray(evento.instalaciones) ? evento.instalaciones : (await instEventSvc.findInstallationsByEvent(id) || []);
    if (!Array.isArray(instIds) || instIds.length === 0) throw Object.assign(new Error('instalaciones requeridas para validar capacidad'), { status: 400 });
    const sumCap = await computeSumCapacity(instIds);
    if (sumCap < capacidadEvento) throw Object.assign(new Error(`Capacidad total de instalaciones (${sumCap}) menor que capacidad del evento (${capacidadEvento})`), { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // update base event
    await repo.updateById(id, evento, conn);

    // --- AVAL handling (preservar/replace/delete) ---
    if (deleteAval && (!files || !files.avalFile)) {
      const existingAval = await avalService.findByUserEvent?.(uploaderId, id) || null;
      if (existingAval && existingAval.avalPdf) {
        await unlinkFileIfExistsPath(existingAval.avalPdf).catch(()=>{});
      }
      if (avalService.deleteByUserEvent) {
        await avalService.deleteByUserEvent(uploaderId, id, conn);
      } else {
        try {
          const avalRepo = await import('../repositories/aval.repository.js');
          if (avalRepo.deleteByUserEvent) await avalRepo.deleteByUserEvent(uploaderId, id, conn);
        } catch (e) { /* noop */ }
      }
    }

    if (files && files.avalFile) {
      if (!tipoAval || !['director_programa','director_docencia'].includes(tipoAval)) {
        throw Object.assign(new Error('tipoAval inválido'), { status: 400 });
      }
      await avalService.createAval({ idUsuario: uploaderId, idEvento: id, file: files.avalFile, tipoAval }, conn);
    }

    // instalaciones replace if provided
    if (Array.isArray(evento.instalaciones)) {
      await instEventSvc.unlinkByEvent(id, conn);
      if (evento.instalaciones.length > 0) await instEventSvc.linkInstallationsToEvent(id, evento.instalaciones, conn);
    }

    // existing org-event associations to manage certificates
    const existingAssocs = await orgEventService.findByEvent(id, conn);
    const existingMap = {};
    (existingAssocs || []).forEach(a => { existingMap[String(a.idOrganizacion)] = a; });

    const incomingOrgIds = (Array.isArray(organizaciones) ? organizaciones.map(o => String(o.idOrganizacion || o.id || '')).filter(Boolean) : []);

    // delete associations removed by client
    const toRemove = (existingAssocs || []).map(a => String(a.idOrganizacion)).filter(eid => !incomingOrgIds.includes(eid));
    if (toRemove.length > 0) {
      for (const oid of toRemove) {
        await orgEventService.deleteByOrgEvent(oid, id, conn);
      }
    }

    // upsert incoming orgs
    if (Array.isArray(organizaciones)) {
      for (const org of organizaciones) {
        const orgId = org.idOrganizacion || org.id || null;
        if (!orgId) continue;

        const certFile = files.orgFiles && files.orgFiles[orgId] ? files.orgFiles[orgId] : null;
        const wantsDelete = !!org.deleteCertBeforeUpload;

        if (wantsDelete && !certFile) {
          const existing = existingMap[String(orgId)];
          if (existing && existing.certificadoParticipacion) {
            await unlinkFileIfExistsPath(existing.certificadoParticipacion).catch(()=>{});
          }
          await orgEventService.clearCertificateForOrg(orgId, id, conn);
        }

        const esRep = org.esRepresentanteLegal ?? org.representanteLegal ?? org.representante ?? 'no';
        const participantePayload = (org.participante === undefined) ? null : org.participante;

        await orgEventService.linkOrganizationToEvent({
          idOrganizacion: orgId,
          idEvento: id,
          participante: participantePayload,
          esRepresentanteLegal: esRep,
          certificadoFile: certFile,
          encargado: org.encargado ?? null
        }, conn);
      }
    }

    // attach general certificate if present
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

// ============================================
// NUEVAS FUNCIONES PARA DASHBOARD DE SECRETARIAS
// ============================================

/**
 * Obtiene eventos específicamente para secretarias académicas
 * Incluye información del organizador y estado actual
 */
export async function getEventsForSecretaria() {
  try {
    const eventos = await eventsRepo.getAllEventsWithDetails();
    return eventos;
  } catch (error) {
    console.error('Error getting events for secretaria:', error);
    throw error;
  }
}

/**
 * Evalúa un evento (aprobar/rechazar)
 */
export async function evaluateEvent({ idEvento, estado, justificacion, actaFile, idSecretaria }) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Verificar que el evento existe y está en estado 'registrado'
    const [eventoRows] = await connection.execute(
      'SELECT * FROM evento WHERE idEvento = ?',
      [idEvento]
    );
    
    if (eventoRows.length === 0) {
      throw new Error('Evento no encontrado');
    }
    
    const evento = eventoRows[0];
    
    // Permitir evaluar eventos en estado 'registrado' o sin estado (null)
    const estadoActual = evento.estado || 'registrado';
    if (estadoActual !== 'registrado' && evento.estado !== null) {
      throw new Error(`El evento ya ha sido evaluado (estado actual: ${evento.estado})`);
    }
    
    // Verificar que el usuario es una secretaria
    const [secretariaRows] = await connection.execute(
      'SELECT idUsuario FROM secretariaAcademica WHERE idUsuario = ?',
      [idSecretaria]
    );
    
    if (secretariaRows.length === 0) {
      throw new Error('Usuario no autorizado para evaluar eventos');
    }
    
    let actaPath = null;
    
    // Si se aprueba y hay archivo de acta, guardarlo
    if (estado === 'aprobado' && actaFile) {
      const uploadsDir = path.resolve(process.cwd(), 'uploads', 'actas');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const fileName = `acta_${idEvento}_${Date.now()}.pdf`;
      const destPath = path.join(uploadsDir, fileName);
      
      // Mover archivo
      fs.renameSync(actaFile.path, destPath);
      actaPath = `/uploads/actas/${fileName}`;
    }
    
    // Actualizar estado del evento
    // Mapear estado a valores válidos de la BD (solo 'aprobado' o 'rechazado')
    const estadoValido = estado === 'aprobado' ? 'aprobado' : 'rechazado';
    
    await connection.execute(
      'UPDATE evento SET estado = ? WHERE idEvento = ?',
      [estadoValido, idEvento]
    );
    
    // Crear evaluación
    await connection.execute(
      `INSERT INTO evaluacion (estado, fechaEvaluacion, justificacion, actaAprobacion, idEvento, idSecretaria) 
       VALUES (?, CURDATE(), ?, ?, ?, ?)`,
      [estado, justificacion, actaPath, idEvento, idSecretaria]
    );
    
    await connection.commit();
    
    return {
      success: true,
      message: `Evento ${estado} exitosamente`,
      evento: {
        ...evento,
        estado,
        evaluacion: {
          estado,
          justificacion,
          actaAprobacion: actaPath,
          fechaEvaluacion: new Date().toISOString().split('T')[0],
          idSecretaria
        }
      }
    };
    
  } catch (error) {
    await connection.rollback();
    console.error('Error evaluating event:', error);
    throw error;
  } finally {
    connection.release();
  }
}