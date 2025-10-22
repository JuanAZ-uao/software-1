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

  if (!Array.isArray(evento.instalaciones) || evento.instalaciones.length === 0) {
    throw Object.assign(new Error('instalaciones requeridas'), { status: 400 });
  }

  for (const idInst of evento.instalaciones) {
    const inst = await instRepo.findById(idInst);
    if (!inst) throw Object.assign(new Error(`Instalación ${idInst} no encontrada`), { status: 400 });
  }

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

    const payloadToInsert = { ...evento, idUsuario: uploaderId };
    if (!payloadToInsert.idInstalacion && Array.isArray(evento.instalaciones) && evento.instalaciones.length > 0) {
      payloadToInsert.idInstalacion = evento.instalaciones[0];
    }

    const evCreated = await repo.insert(payloadToInsert, conn);
    const idEvento = evCreated.idEvento;

    await avalService.createAval({ idUsuario: uploaderId, idEvento, file: files.avalFile, tipoAval }, conn);

    if (Array.isArray(evento.instalaciones) && evento.instalaciones.length > 0) {
      await instEventSvc.linkInstallationsToEvent(idEvento, evento.instalaciones, conn);
    }

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

    if (files.certGeneral) {
      const certPath = `/uploads/${files.certGeneral.filename}`;
      await repo.attachGeneralCertificate(idEvento, { certificadoParticipacion: certPath }, conn);
    }

    await conn.commit();

    const created = await repo.findById(idEvento);
    return created;
  } catch (err) {
    await conn.rollback();

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
 * Update event and synchronize organizations WITHOUT removing certificates unnecessarily.
 * Also supports replacing or deleting the event-level aval.
 *
 * params:
 *  { id, evento, tipoAval, uploaderId, organizaciones = [], files = {}, deleteAval = false }
 *
 * Notes:
 *  - deleteAval true + no files.avalFile will remove existing aval for (uploaderId,id)
 *  - if files.avalFile present, tipoAval is required and createAval will replace existing
 */
export async function updateEventWithOrgs({ id, evento, tipoAval, uploaderId, organizaciones = [], files = {}, deleteAval = false }) {
  validateEvento(evento);

  if (evento.instalaciones !== undefined && !Array.isArray(evento.instalaciones)) {
    throw Object.assign(new Error('instalaciones debe ser un array'), { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // update evento base
    await repo.updateById(id, evento, conn);

    // --- AVAL handling (delete flag or replace) ---
    // If client requested delete without uploading replacement, remove existing aval record and unlink file.
    if (deleteAval && (!files || !files.avalFile)) {
      // use repository directly to find existing aval for this user+event
      const avalRepo = await import('../repositories/aval.repository.js');
      if (typeof avalRepo.findByUserEvent === 'function') {
        const existingAval = await avalRepo.findByUserEvent(uploaderId, id);
        if (existingAval && existingAval.avalPdf) {
          await unlinkFileIfExistsPath(existingAval.avalPdf).catch(()=>{});
        }
      }
      if (typeof avalRepo.deleteByUserEvent === 'function') {
        await avalRepo.deleteByUserEvent(uploaderId, id, conn);
      } else {
        // fallback: attempt DELETE by executing query directly
        if (avalRepo.default) {
          // nothing
        } else {
          try {
            const connection = conn || (await import('../db/pool.js')).default;
            await connection.query('DELETE FROM aval WHERE idUsuario = ? AND idEvento = ?', [uploaderId, id]);
          } catch(e) { /* noop */ }
        }
      }
    }

    // If a new aval file is provided, validate tipoAval and create/replace
    if (files && files.avalFile) {
      if (!tipoAval || !['director_programa','director_docencia'].includes(tipoAval)) {
        throw Object.assign(new Error('tipoAval inválido'), { status: 400 });
      }
      await avalService.createAval({ idUsuario: uploaderId, idEvento: id, file: files.avalFile, tipoAval }, conn);
    }

    // instalaciones replace if provided explicitly
    if (Array.isArray(evento.instalaciones)) {
      await instEventSvc.unlinkByEvent(id, conn);
      if (evento.instalaciones.length > 0) {
        await instEventSvc.linkInstallationsToEvent(id, evento.instalaciones, conn);
      }
    }

    // get existing associations to preserve certificados when needed
    const existingAssocs = await orgEventService.findByEvent(id, conn); // array of relations
    const existingMap = {};
    existingAssocs.forEach(a => { existingMap[String(a.idOrganizacion)] = a; });

    const incomingOrgIds = (Array.isArray(organizaciones) ? organizaciones.map(o => String(o.idOrganizacion || o.id || '')).filter(Boolean) : []);

    // remove associations that exist in DB but are not present in incoming payload
    const toRemove = existingAssocs.map(a => String(a.idOrganizacion)).filter(eid => !incomingOrgIds.includes(eid));
    if (toRemove.length > 0) {
      for (const oid of toRemove) {
        await (await import('../repositories/organizationEvent.repository.js')).deleteByOrgEvent(oid, id, conn);
      }
    }

    // upsert each incoming organization
    if (Array.isArray(organizaciones)) {
      for (const org of organizaciones) {
        const orgId = org.idOrganizacion || org.id || null;
        if (!orgId) continue;

        const certFile = files.orgFiles && files.orgFiles[orgId] ? files.orgFiles[orgId] : null;
        const wantsDelete = !!org.deleteCertBeforeUpload;

        // if wantsDelete and no new file uploaded: delete physical file (if existed) and clear DB value
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

    // general certificate for event
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