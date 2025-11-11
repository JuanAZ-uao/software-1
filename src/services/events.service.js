// src/services/events.service.js
import pool from '../db/pool.js';
import * as repo from '../repositories/events.repository.js';
import * as instRepo from '../repositories/installations.repository.js';
import * as avalService from './aval.service.js';
import * as instEventSvc from './eventInstallation.service.js';
import * as orgEventRepo from '../repositories/organizationEvent.repository.js';
import * as eventsRepo from '../repositories/events.repository.js'; // NUEVO
import * as avalRepo from '../repositories/aval.repository.js';
import * as usuarioSvc from './usuario.service.js';
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
// src/services/events.service.js (fragmento)
// Ajusta imports: pool, repo (evento), orgEventRepo, avalService, usuarioSvc, instEventSvc

export async function createEventWithOrgs({ evento, tipoAval, uploaderId, organizaciones = [], files = {}, avales = [] }) {
  // valida evento (tu validación existente)
  validateEvento(evento);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Insertar evento (repo.insert debe aceptar conn)
    const created = await repo.insert(evento, conn);
    const idEvento = created.idEvento || created.id || created.insertId;
    if (!idEvento) throw Object.assign(new Error('No se pudo crear el evento'), { status: 500 });

    // 2) Aval del uploader (si subió archivo) o solo tipoAval
    if (files?.avalFile) {
      // crear/upsert aval del uploader como principal (1)
      await avalService.createAval(
        { idUsuario: Number(uploaderId), idEvento, file: files.avalFile, tipoAval },
        conn,
        { principal: 1 }
      );
    } else if (tipoAval) {
      // actualizar tipo en la fila principal (si existe) o crearla
      await avalService.updateTipo({ idEvento, tipoAval }, conn).catch(()=>{});
    }

    // 2.b) Vincular instalaciones si aplica
    if (Array.isArray(evento.instalaciones) && evento.instalaciones.length) {
      if (instEventSvc?.linkInstallationsToEvent) {
        await instEventSvc.linkInstallationsToEvent(idEvento, evento.instalaciones, conn);
      } else if (repo.linkInstallations) {
        await repo.linkInstallations(idEvento, evento.instalaciones, conn);
      }
    }

    // 2.c) Organizaciones participantes
    if (Array.isArray(organizaciones) && organizaciones.length) {
      for (const org of organizaciones) {
        const orgId = org.idOrganizacion;
        if (!orgId) throw Object.assign(new Error('idOrganizacion requerido'), { status: 400 });
        const certFile = files?.orgFiles?.[orgId] || null;
        const certPath = certFile ? `/uploads/${certFile.filename}` : (org.certificadoParticipacion ?? null);

        await orgEventRepo.upsert({
          idOrganizacion: orgId,
          idEvento,
          participante: org.participante ?? null,
          esRepresentanteLegal: (org.esRepresentanteLegal ? 'si' : 'no'),
          certificadoParticipacion: certPath
        }, conn);
      }
    }

    // --- Obtener ruta del aval del uploader (si existe) para reutilizarla ---
    let uploaderAvalPdf = null;
    if (uploaderId) {
      const uploaderAval = await avalRepo.findByUserEvent(Number(uploaderId), idEvento, conn);
      if (uploaderAval && uploaderAval.avalPdf) uploaderAvalPdf = uploaderAval.avalPdf;
    }

    // 3) Procesar avales múltiples: crear/upsert una fila por cada userId recibido
    const commonTipoAval = tipoAval || null;
    if (Array.isArray(avales) && avales.length > 0) {
      for (const a of avales) {
        const rawUserId = a?.userId ?? a?.idUsuario ?? a;
        const userId = Number(rawUserId);
        if (!Number.isFinite(userId)) continue;

        // Validar que el usuario no sea secretaria (si el servicio existe)
        if (usuarioSvc && typeof usuarioSvc.validarNoSecretaria === 'function') {
          await usuarioSvc.validarNoSecretaria(userId, conn);
        }

        // archivo específico para este avalador (si se subió uno por usuario)
        const file = files?.avalFiles?.[String(userId)] || null;

        // Si no hay archivo para este usuario y existe uploaderAvalPdf, forzamos esa ruta
        const forcePdf = file ? null : (uploaderAvalPdf || null);

        // Crear/upsert aval para este usuario; participantes adicionales no deben ser principal
        await avalService.createAval(
          {
            idUsuario: userId,
            idEvento,
            file,
            tipoAval: a?.tipoAval ?? commonTipoAval
          },
          conn,
          { principal: 0, forceAvalPdf: forcePdf }
        );
      }
    }

    // 4) Certificado general si existe
    if (files?.certGeneral) {
      const certPath = `/uploads/${files.certGeneral.filename}`;
      if (repo.attachGeneralCertificate) {
        await repo.attachGeneralCertificate(idEvento, { certificadoParticipacion: certPath }, conn);
      } else {
        await conn.query('UPDATE evento SET certificadoParticipacion = ? WHERE idEvento = ?', [certPath, idEvento]);
      }
    }

    await conn.commit();

    // devolver el evento creado
    const result = await repo.findById(idEvento, conn);
    return result;
  } catch (err) {
    await conn.rollback();
    console.error('createEventWithOrgs error:', err);
    throw err;
  } finally {
    conn.release();
  }
}



/**
 * updateEventWithOrgs
 */

// src/services/events.service.js (fragmento)

export async function updateEventWithOrgs({ id, evento, tipoAval, uploaderId, organizaciones = [], files = {}, avales = [] }) {
  validateEvento(evento);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Actualizar evento (usa tu repo.updateById o equivalente)
    if (typeof repo.updateById === 'function') {
      await repo.updateById(id, evento, conn);
    } else if (typeof repo.update === 'function') {
      await repo.update(id, evento, conn);
    } else {
      const fields = Object.keys(evento);
      if (fields.length) {
        const sets = fields.map(f => `${f} = ?`).join(', ');
        const params = fields.map(f => evento[f]);
        params.push(id);
        await conn.query(`UPDATE evento SET ${sets} WHERE idEvento = ?`, params);
      }
    }

    // 2) Aval global
    if (files?.avalFile) {
      await avalService.createAval({ idUsuario: uploaderId, idEvento: id, file: files.avalFile, tipoAval }, conn);
    } else if (tipoAval) {
      await avalService.updateTipo({ idEvento: id, tipoAval }, conn).catch(()=>{});
    }

    // 3) Organizaciones e instalaciones (mantén tu lógica previa)
    if (Array.isArray(evento.instalaciones) && evento.instalaciones.length) {
      if (instEventSvc?.linkInstallationsToEvent) {
        await instEventSvc.linkInstallationsToEvent(id, evento.instalaciones, conn);
      } else if (repo.linkInstallations) {
        await repo.linkInstallations(id, evento.instalaciones, conn);
      }
    }

    for (const org of organizaciones) {
      const orgId = org.idOrganizacion;
      if (!orgId) throw Object.assign(new Error('idOrganizacion requerido'), { status: 400 });
      const certFile = files?.orgFiles?.[orgId] || null;
      const deleteCert = files?.deleteCerts?.[orgId];
      if (certFile) {
        const certPath = `/uploads/${certFile.filename}`;
        await orgEventRepo.upsert({ idOrganizacion: orgId, idEvento: id, participante: org.participante ?? null, esRepresentanteLegal: (org.esRepresentanteLegal ? 'si' : 'no'), certificadoParticipacion: certPath }, conn);
      } else if (deleteCert) {
        await conn.query('UPDATE organizacion_evento SET certificadoParticipacion = NULL WHERE idOrganizacion = ? AND idEvento = ?', [orgId, id]);
        await orgEventRepo.upsert({ idOrganizacion: orgId, idEvento: id, participante: org.participante ?? null, esRepresentanteLegal: (org.esRepresentanteLegal ? 'si' : 'no'), certificadoParticipacion: null }, conn);
      } else {
        const existing = typeof orgEventRepo.findById === 'function' ? await orgEventRepo.findById(orgId, id, conn) : null;
        const currentCert = existing?.certificadoParticipacion ?? null;
        await orgEventRepo.upsert({ idOrganizacion: orgId, idEvento: id, participante: org.participante ?? null, esRepresentanteLegal: (org.esRepresentanteLegal ? 'si' : 'no'), certificadoParticipacion: currentCert }, conn);
      }
    }

    // 4) Avales: upsert de los enviados
    const commonTipoAval = tipoAval || null;
    if (Array.isArray(avales)) {
      for (const a of avales) {
        const userId = a?.userId || a?.idUsuario || a;
        if (!userId) continue;
        await usuarioSvc.validarNoSecretaria(userId, conn);
        const file = files?.avalFiles?.[String(userId)] || null;
        await avalService.createAval({ idUsuario: userId, idEvento: id, file, tipoAval: a?.tipoAval || commonTipoAval }, conn);
      }
    }

    // 5) Eliminar avales marcados
    const deleteAvalFlags = files?.deleteAvalFlags || {};
    for (const userId of Object.keys(deleteAvalFlags)) {
      if (deleteAvalFlags[userId]) {
        await avalService.deleteAval({ idEvento: id, idUsuario: userId }, conn);
      }
    }

    // 6) Certificado general
    if (files?.certGeneral) {
      const certPath = `/uploads/${files.certGeneral.filename}`;
      if (repo.attachGeneralCertificate) {
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

export async function getEventWithDetails(idEvento) {
  const evt = await repo.findByIdWithDetails(idEvento);
  return evt;
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