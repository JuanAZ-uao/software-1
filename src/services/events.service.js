// src/services/events.service.js
import pool from '../db/pool.js';
import * as repo from '../repositories/events.repository.js';
import * as instRepo from '../repositories/installations.repository.js';
import * as avalService from './aval.service.js';
import * as instEventSvc from './eventInstallation.service.js';
import * as orgEventRepo from '../repositories/organizationEvent.repository.js';
import * as eventsRepo from '../repositories/events.repository.js';
import * as avalRepo from '../repositories/aval.repository.js';
import * as usuarioSvc from './usuario.service.js';
import * as notifSvc from './notifications.service.js';
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
    
    // Después de confirmar la transacción, enviar notificaciones a secretarías
    // (en paralelo, no bloqueamos la respuesta)
    try {
      const idFacultad = await repo.getFacultadByEvento(idEvento);
      if (idFacultad) {
        notifSvc.notifySecretariasOnReview(idEvento, idFacultad).catch(err => {
          console.error('Error notifying secretarias on review:', err);
        });
      }
    } catch (err) {
      console.error('Error in sendEventForReview notification:', err);
      // No throw, la actualización del evento ya se hizo
    }
    
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

export async function getApprovedEvents() {
  return await repo.findByState('aprobado');
}

export async function getEventById(id) {
  return await repo.findById(id);
}

export async function deleteEvent(id) {
  return await repo.deleteById(id);
}

/**
 * createEventWithOrgs
 *
 * - Inserta evento
 * - Crea/asegura aval del uploader (principal)
 * - Crea/asegura avales para organizadores adicionales; si no suben archivo,
 *   se reutiliza la ruta del aval del uploader y el tipo correspondiente.
 * - No borra la fila del uploader.
 */
export async function createEventWithOrgs({ evento, tipoAval, uploaderId, organizaciones = [], files = {}, avales = [] }) {
  validateEvento(evento);
  const tipoAvalNormalized = (typeof tipoAval !== 'undefined' && tipoAval !== null) ? tipoAval : '';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Insertar evento
    const created = await repo.insert(evento, conn);
    const idEvento = created.idEvento || created.id || created.insertId;
    if (!idEvento) throw Object.assign(new Error('No se pudo crear el evento'), { status: 500 });

    // 2) Asegurar aval del uploader (principal)
    // Si subió archivo, lo guardamos; si no, intentamos crear/actualizar la fila principal con tipoAval
    if (files?.avalFile) {
      await avalService.createAval(
        { idUsuario: Number(uploaderId), idEvento, file: files.avalFile, tipoAval: tipoAvalNormalized },
        conn,
        { principal: 1 }
      );
    } else if (tipoAvalNormalized) {
      await avalService.updateTipo({ idEvento, tipoAval: tipoAvalNormalized }, conn).catch(()=>{});
    } else {
      // intentar no fallar si no hay nada: crear fila principal mínima si no existe
      const existingUploaderAval = uploaderId ? await avalRepo.findByUserEvent(Number(uploaderId), idEvento, conn) : null;
      if (!existingUploaderAval && uploaderId) {
        await avalService.createAval(
          { idUsuario: uploaderId, idEvento, file: null, tipoAval: tipoAvalNormalized },
          conn,
          { principal: 1, forceAvalPdf: null }
        );
      }
    }

    // Leer la fila del uploader para obtener la ruta real y tipo (si existe)
    let uploaderAvalPdf = null;
    let uploaderTipoAval = tipoAvalNormalized || '';
    if (uploaderId) {
      const uploaderAvalRow = await avalRepo.findByUserEvent(Number(uploaderId), idEvento, conn);
      if (uploaderAvalRow) {
        if (uploaderAvalRow.avalPdf) uploaderAvalPdf = uploaderAvalRow.avalPdf;
        if (uploaderAvalRow.tipoAval) uploaderTipoAval = uploaderAvalRow.tipoAval;
      }
    }

    // 3) Instalaciones
    if (Array.isArray(evento.instalaciones) && evento.instalaciones.length) {
      if (instEventSvc?.linkInstallationsToEvent) {
        await instEventSvc.linkInstallationsToEvent(idEvento, evento.instalaciones, conn);
      } else if (repo.linkInstallations) {
        await repo.linkInstallations(idEvento, evento.instalaciones, conn);
      }
    }

    // 4) Organizaciones participantes
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
          esRepresentanteLegal: org.esRepresentanteLegal === 'si' ? 'si' : 'no',
          certificadoParticipacion: certPath
        }, conn);
      }
    }

    // 5) Procesar avales múltiples: crear/upsert una fila por cada userId recibido
    const commonTipoAval = tipoAvalNormalized;
    // proteger siempre al uploader si se incluye en la lista o no
    const incomingUserIds = new Set();
    if (Array.isArray(avales) && avales.length > 0) {
      for (const a of avales) {
        const rawUserId = a?.userId ?? a?.idUsuario ?? a;
        const userId = Number(rawUserId);
        if (!Number.isFinite(userId)) continue;
        incomingUserIds.add(String(userId));

        if (usuarioSvc && typeof usuarioSvc.validarNoSecretaria === 'function') {
          await usuarioSvc.validarNoSecretaria(userId, conn);
        }

        const file = files?.avalFiles?.[String(userId)] || null;

        // resolver tipoAval: item -> common -> uploader
        const resolvedTipoAval = (typeof a?.tipoAval !== 'undefined' && a?.tipoAval !== null)
          ? a.tipoAval
          : (commonTipoAval || uploaderTipoAval || '');

        // si no hay archivo del participante, forzar la ruta del uploader si existe
        const forcePdf = file ? null : (uploaderAvalPdf || null);

        await avalService.createAval(
          {
            idUsuario: userId,
            idEvento,
            file,
            tipoAval: resolvedTipoAval
          },
          conn,
          { principal: 0, forceAvalPdf: forcePdf }
        );
      }
    }

    // Asegurar que el uploader esté protegido en la lista entrante
    if (uploaderId) incomingUserIds.add(String(uploaderId));

    // 6) No eliminar la fila del uploader; en create no hay filas previas que borrar salvo asociaciones previas
    //    (si quieres limpiar filas antiguas, hazlo con cuidado; aquí no eliminamos nada en create)

    // 7) Certificado general si existe
    if (files?.certGeneral) {
      const certPath = `/uploads/${files.certGeneral.filename}`;
      if (repo.attachGeneralCertificate) {
        await repo.attachGeneralCertificate(idEvento, { certificadoParticipacion: certPath }, conn);
      } else {
        await conn.query('UPDATE evento SET certificadoParticipacion = ? WHERE idEvento = ?', [certPath, idEvento]);
      }
    }

    await conn.commit();

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
 *
 * - Actualiza evento
 * - Asegura fila principal del uploader
 * - Upsertea avales adicionales reutilizando avalPdf/tipo del uploader cuando no suben archivo
 * - No borra la fila principal ni filas con principal = 1
 */
export async function updateEventWithOrgs({ id, evento, tipoAval, uploaderId, organizaciones = [], files = {}, avales = [] }) {
  validateEvento(evento);
  const tipoAvalNormalized = (typeof tipoAval !== 'undefined' && tipoAval !== null) ? tipoAval : '';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Actualizar evento
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

    // 2) Asegurar/actualizar aval global del uploader (principal)
    if (files?.avalFile) {
      await avalService.createAval(
        { idUsuario: uploaderId, idEvento: id, file: files.avalFile, tipoAval: tipoAvalNormalized },
        conn,
        { principal: 1 }
      );
    } else if (tipoAvalNormalized) {
      await avalService.updateTipo({ idEvento: id, tipoAval: tipoAvalNormalized }, conn).catch(()=>{});
    } else {
      // si no hay tipo ni archivo, no forzamos nada; pero nos aseguramos de que exista la fila principal
      const existingUploaderAval = uploaderId ? await avalRepo.findByUserEvent(Number(uploaderId), id, conn) : null;
      if (!existingUploaderAval && uploaderId) {
        await avalService.createAval(
          { idUsuario: uploaderId, idEvento: id, file: null, tipoAval: tipoAvalNormalized },
          conn,
          { principal: 1, forceAvalPdf: null }
        );
      }
    }

    // Leer la fila del uploader para obtener la ruta real y tipo (si existe)
    let uploaderAvalPdf = null;
    let uploaderTipoAval = tipoAvalNormalized || '';
    if (uploaderId) {
      const uploaderAvalRow = await avalRepo.findByUserEvent(Number(uploaderId), id, conn);
      if (uploaderAvalRow) {
        if (uploaderAvalRow.avalPdf) uploaderAvalPdf = uploaderAvalRow.avalPdf;
        if (uploaderAvalRow.tipoAval) uploaderTipoAval = uploaderAvalRow.tipoAval;
      }
    }

    // 3) Instalaciones
    if (Array.isArray(evento.instalaciones) && evento.instalaciones.length) {
      if (instEventSvc?.linkInstallationsToEvent) {
        await instEventSvc.linkInstallationsToEvent(id, evento.instalaciones, conn);
      } else if (repo.linkInstallations) {
        await repo.linkInstallations(id, evento.instalaciones, conn);
      }
    }

    // 4) Organizaciones
    if (Array.isArray(organizaciones) && organizaciones.length) {
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
    }

    // 5) Avales enviados: upsert (respetando uploader values)
    const commonTipoAval = tipoAvalNormalized;
    const incomingUserIds = new Set();
    if (Array.isArray(avales)) {
      for (const a of avales) {
        const userIdRaw = a?.userId ?? a?.idUsuario ?? a;
        const userId = Number(userIdRaw);
        if (!Number.isFinite(userId)) continue;
        incomingUserIds.add(String(userId));

        if (usuarioSvc && typeof usuarioSvc.validarNoSecretaria === 'function') {
          await usuarioSvc.validarNoSecretaria(userId, conn);
        }

        const file = files?.avalFiles?.[String(userId)] || null;

        const resolvedTipoAval = (typeof a?.tipoAval !== 'undefined' && a?.tipoAval !== null)
          ? a.tipoAval
          : (commonTipoAval || uploaderTipoAval || '');

        const forcePdf = file ? null : (uploaderAvalPdf || null);

        await avalService.createAval(
          { idUsuario: userId, idEvento: id, file, tipoAval: resolvedTipoAval },
          conn,
          { principal: 0, forceAvalPdf: forcePdf }
        );
      }
    }

    // proteger siempre al uploader (organizador principal) en la lista entrante
    if (uploaderId) incomingUserIds.add(String(uploaderId));

    // 6) Eliminar avales que ya no están en la lista incomingUserIds
    // nunca borrar la fila principal ni al uploader
    const existingAvalRows = await avalRepo.findByEvent(id, conn);
    const toDelete = [];
    for (const row of existingAvalRows || []) {
      const uid = String(row.idUsuario);
      if (String(uid) === String(uploaderId)) continue;
      if (Number(row.principal) === 1) continue;
      if (!incomingUserIds.has(String(uid))) toDelete.push(uid);
    }
    for (const uid of toDelete) {
      await avalService.deleteAval({ idEvento: id, idUsuario: uid }, conn);
    }

    // 7) Eliminar avales marcados explícitamente si vienen en files.deleteAvalFlags
    const deleteAvalFlags = files?.deleteAvalFlags || {};
    for (const userId of Object.keys(deleteAvalFlags)) {
      if (deleteAvalFlags[userId]) {
        await avalService.deleteAval({ idEvento: id, idUsuario: userId }, conn);
      }
    }

    // 8) Certificado general
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
    console.error('updateEventWithOrgs error:', err);
    throw err;
  } finally {
    conn.release();
  }
}

// funciones adicionales (sin cambios)
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

export async function evaluateEvent({ idEvento, estado, justificacion, actaFile, idSecretaria }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [eventoRows] = await connection.execute('SELECT * FROM evento WHERE idEvento = ?', [idEvento]);
    if (eventoRows.length === 0) throw new Error('Evento no encontrado');
    const evento = eventoRows[0];
    const estadoActual = evento.estado || 'registrado';
    if (estadoActual !== 'registrado' && evento.estado !== null) throw new Error(`El evento ya ha sido evaluado (estado actual: ${evento.estado})`);
    const [secretariaRows] = await connection.execute('SELECT idUsuario FROM secretariaAcademica WHERE idUsuario = ?', [idSecretaria]);
    if (secretariaRows.length === 0) throw new Error('Usuario no autorizado para evaluar eventos');

    let actaPath = null;
    if (estado === 'aprobado' && actaFile) {
      const uploadsDir = path.resolve(process.cwd(), 'uploads', 'actas');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const fileName = `acta_${idEvento}_${Date.now()}.pdf`;
      const destPath = path.join(uploadsDir, fileName);
      fs.renameSync(actaFile.path, destPath);
      actaPath = `/uploads/actas/${fileName}`;
    }

    const estadoValido = estado === 'aprobado' ? 'aprobado' : 'rechazado';
    await connection.execute('UPDATE evento SET estado = ? WHERE idEvento = ?', [estadoValido, idEvento]);
    await connection.execute(
      `INSERT INTO evaluacion (estado, fechaEvaluacion, justificacion, actaAprobacion, idEvento, idSecretaria) 
       VALUES (?, CURDATE(), ?, ?, ?, ?)`,
      [estado, justificacion, actaPath, idEvento, idSecretaria]
    );

    await connection.commit();

    // Después de confirmar la transacción, enviar notificación al organizador
    // (en paralelo, no bloqueamos la respuesta)
    try {
      notifSvc.notifyOrganizerOnEvaluation(idEvento, estado, justificacion).catch(err => {
        console.error('Error notifying organizer on evaluation:', err);
      });
    } catch (err) {
      console.error('Error in evaluateEvent notification:', err);
      // No throw, la evaluación del evento ya se hizo
    }

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
