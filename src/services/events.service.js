// src/services/events.service.js
import pool from '../db/pool.js';
import * as repo from '../repositories/events.repository.js';
import * as instRepo from '../repositories/installations.repository.js';
import * as avalService from './aval.service.js';
import * as instEventSvc from './eventInstallation.service.js';
import * as orgEventRepo from '../repositories/organizationEvent.repository.js';
import * as eventsRepo from '../repositories/events.repository.js'; // NUEVO
import fs from 'fs';
import path from 'path';


export async function sendEventForReview({ idEvento }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const ev = await repo.findById(idEvento, conn);
    if (!ev) {
      await conn.rollback();
      return null;
    }

    // Solo permitir la transición si el evento está en 'registrado'
    if (String(ev.estado) !== 'registrado') {
      await conn.rollback();
      return ev;
    }

    // Actualizar estado a 'enRevision'
    const updated = await repo.updateById(idEvento, { estado: 'enRevision' }, conn);

    await conn.commit();
    return updated;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
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

async function unlinkFileIfExists(filePath) {
  try {
    if (!filePath) return;
    const abs = filePath.startsWith('/') ? path.join(process.cwd(), filePath) : path.join(process.cwd(), 'uploads', filePath);
    await fs.promises.unlink(abs).catch(()=>{});
  } catch (e) { /* noop */ }
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


/**
 * createEventWithOrgs
 */
export async function createEventWithOrgs({ evento, tipoAval, uploaderId, organizaciones = [], files = {} }) {
  validateEvento(evento);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const created = await repo.insert(evento, conn);
    const id = created.idEvento || created.id;

    if (files && files.avalFile) {
      await avalService.createAval({ idUsuario: uploaderId, idEvento: id, file: files.avalFile, tipoAval }, conn);
    } else if (tipoAval) {
      await avalService.updateTipo({ idEvento: id, tipoAval }, conn);
    }

    if (Array.isArray(evento.instalaciones) && evento.instalaciones.length > 0) {
      if (instEventSvc && typeof instEventSvc.linkInstallationsToEvent === 'function') {
        await instEventSvc.linkInstallationsToEvent(id, evento.instalaciones, conn);
      } else if (typeof repo.linkInstallations === 'function') {
        await repo.linkInstallations(id, evento.instalaciones, conn);
      }
    }

    if (Array.isArray(organizaciones) && organizaciones.length > 0) {
      for (const org of organizaciones) {
        const orgId = org.idOrganizacion;
        const esRepRaw = org.esRepresentanteLegal ?? org.representanteLegal;
        const esRepresentanteLegal = (esRepRaw === true) || String(esRepRaw).toLowerCase() === 'si' || String(esRepRaw).toLowerCase() === 'true';
        let participanteFinal = org.participante ?? null;
        if (esRepresentanteLegal) {
          const orgRepo = await import('../repositories/organizations.repository.js').then(m => m).catch(()=>null);
          const orgRecord = orgRepo && typeof orgRepo.findById === 'function' ? await orgRepo.findById(orgId, conn) : null;
          participanteFinal = orgRecord ? (orgRecord.representanteLegal || orgRecord.representante || orgRecord.representante_legal || participanteFinal) : participanteFinal;
        }
        const certPath = org.certificadoParticipacion ?? null;
        await orgEventRepo.upsert({
          idOrganizacion: orgId,
          idEvento: id,
          participante: participanteFinal,
          esRepresentanteLegal: esRepresentanteLegal ? 'si' : 'no',
          certificadoParticipacion: certPath
        }, conn);
      }
    }

    if (files && files.certGeneral) {
      const certPath = `/uploads/${files.certGeneral.filename}`;
      if (typeof repo.attachGeneralCertificate === 'function') {
        await repo.attachGeneralCertificate(id, { certificadoParticipacion: certPath }, conn);
      } else {
        await conn.query('UPDATE evento SET certificadoParticipacion = ? WHERE idEvento = ?', [certPath, id]);
      }
    }

    await conn.commit();
    return await repo.findById(id, conn);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * updateEventWithOrgs
 */
export async function updateEventWithOrgs({ id, evento, tipoAval, uploaderId, organizaciones = [], files = {} }) {
  validateEvento(evento);

  if (evento.instalaciones !== undefined && !Array.isArray(evento.instalaciones)) {
    throw Object.assign(new Error('instalaciones debe ser un array'), { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (evento.capacidad !== undefined || Array.isArray(evento.instalaciones)) {
      let instalacionesToCheck = null;
      if (Array.isArray(evento.instalaciones) && evento.instalaciones.length > 0) {
        instalacionesToCheck = evento.instalaciones;
      } else {
        if (typeof repo.findInstallationIdsByEvent === 'function') {
          instalacionesToCheck = await repo.findInstallationIdsByEvent(id, conn);
        } else if (instEventSvc && typeof instEventSvc.findInstallationsByEvent === 'function') {
          const rows = await instEventSvc.findInstallationsByEvent(id, conn);
          instalacionesToCheck = (rows || []).map(r => r.idInstalacion);
        } else {
          instalacionesToCheck = [];
        }
      }

      if (!Array.isArray(instalacionesToCheck) || instalacionesToCheck.length === 0) {
        throw Object.assign(new Error('No hay instalaciones para validar la capacidad'), { status: 400 });
      }

      const instalacionesRows = await instRepo.findByIds(instalacionesToCheck, conn);
      if (instalacionesRows.length !== instalacionesToCheck.length) {
        throw Object.assign(new Error('Una o más instalaciones seleccionadas no existen'), { status: 400 });
      }
      const totalInstCap = instalacionesRows.reduce((s, r) => s + Number(r.capacidad || 0), 0);

      if (evento.capacidad !== undefined && evento.capacidad !== null) {
        const capacidadNum = Number(evento.capacidad);
        if (!Number.isFinite(capacidadNum) || capacidadNum <= 0) {
          throw Object.assign(new Error('Capacidad debe ser un número mayor que 0'), { status: 400 });
        }
        if (capacidadNum > totalInstCap) {
          throw Object.assign(new Error(`Capacidad del evento (${capacidadNum}) excede la suma de capacidades de instalaciones vinculadas (${totalInstCap})`), { status: 400 });
        }
        evento.capacidad = capacidadNum;
      }
    }

    await repo.updateById(id, evento, conn);

    if (files && files.avalFile) {
      if (!tipoAval || !['director_programa','director_docencia'].includes(tipoAval)) {
        throw Object.assign(new Error('tipoAval inválido'), { status: 400 });
      }
      await avalService.createAval({ idUsuario: uploaderId, idEvento: id, file: files.avalFile, tipoAval }, conn);
    } else if (tipoAval) {
      if (!['director_programa','director_docencia'].includes(tipoAval)) {
        throw Object.assign(new Error('tipoAval inválido'), { status: 400 });
      }
      await avalService.updateTipo({ idEvento: id, tipoAval }, conn);
    } else if (files && files.deleteAval) {
      if (typeof avalService.deleteAvalFile === 'function') {
        await avalService.deleteAvalFile({ idEvento: id, conn });
      } else {
        await conn.query('UPDATE aval SET avalPdf = NULL WHERE idEvento = ? AND principal = 1', [id]);
      }
    }

    if (Array.isArray(evento.instalaciones)) {
      if (instEventSvc && typeof instEventSvc.unlinkByEvent === 'function' && typeof instEventSvc.linkInstallationsToEvent === 'function') {
        await instEventSvc.unlinkByEvent(id, conn);
        if (evento.instalaciones.length > 0) {
          await instEventSvc.linkInstallationsToEvent(id, evento.instalaciones, conn);
        }
      } else if (typeof repo.replaceInstallationsForEvent === 'function') {
        await repo.replaceInstallationsForEvent(id, evento.instalaciones, conn);
      }
    }

    if (Array.isArray(organizaciones)) {
      for (const org of organizaciones) {
        const orgId = org.idOrganizacion;
        if (!orgId) throw Object.assign(new Error('idOrganizacion requerido en organizaciones'), { status: 400 });

        const esRepRaw = org.esRepresentanteLegal ?? org.representanteLegal;
        const esRepresentanteLegal = (esRepRaw === true) || String(esRepRaw).toLowerCase() === 'si' || String(esRepRaw).toLowerCase() === 'true';

        let participanteFinal = org.participante ?? null;
        if (esRepresentanteLegal) {
          const orgRepo = await import('../repositories/organizations.repository.js').then(m => m).catch(()=>null);
          const orgRecord = orgRepo && typeof orgRepo.findById === 'function' ? await orgRepo.findById(orgId, conn) : null;
          if (!orgRecord) throw Object.assign(new Error(`Organización ${orgId} no encontrada`), { status: 400 });
          const repName = orgRecord.representanteLegal || orgRecord.representante || orgRecord.representante_legal || null;
          if (!repName || !String(repName).trim()) throw Object.assign(new Error(`No se encontró representante legal para organización ${orgId}`), { status: 400 });
          participanteFinal = String(repName).trim();
        } else {
          if (!participanteFinal || !String(participanteFinal).trim()) {
            throw Object.assign(new Error(`Debe especificar el encargado (participante) para la organización ${orgId}`), { status: 400 });
          }
          participanteFinal = String(participanteFinal).trim();
        }

        const certFile = files && files.orgFiles ? files.orgFiles[orgId] : null;
        const deleteCertFlag = (files && files.deleteCerts && files.deleteCerts[orgId]) || !!org.deleteCertBeforeUpload;

        await orgEventRepo.upsert({
          idOrganizacion: orgId,
          idEvento: id,
          participante: participanteFinal,
          esRepresentanteLegal: esRepresentanteLegal ? 'si' : 'no',
          certificadoParticipacion: certFile ? `/uploads/${certFile.filename}` : (org.certificadoParticipacion === undefined ? null : org.certificadoParticipacion)
        }, conn);

        if (deleteCertFlag && typeof orgEventRepo.clearCertificate === 'function') {
          await orgEventRepo.clearCertificate(orgId, id, conn);
        }
        if (certFile && typeof orgEventRepo.saveCertificateForAssoc === 'function') {
          await orgEventRepo.saveCertificateForAssoc({ idEvento: id, idOrganizacion: orgId, certFile, deletePrevious: deleteCertFlag }, conn);
        }
      }
    }

    if (files && files.certGeneral) {
      const certPath = `/uploads/${files.certGeneral.filename}`;
      if (typeof repo.attachGeneralCertificate === 'function') {
        await repo.attachGeneralCertificate(id, { certificadoParticipacion: certPath }, conn);
      } else {
        await conn.query('UPDATE evento SET certificadoParticipacion = ? WHERE idEvento = ?', [certPath, id]);
      }
    }

    await conn.commit();
    const updated = await repo.findById(id, conn);
    return updated;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
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