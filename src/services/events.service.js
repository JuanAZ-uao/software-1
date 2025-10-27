// src/services/events.service.js
import pool from '../db/pool.js';
import * as repo from '../repositories/events.repository.js';
import * as instRepo from '../repositories/installations.repository.js';
import * as instEventSvc from './eventInstallation.service.js';
import * as evaluacionRepo from '../repositories/evaluacion.repository.js'; // NUEVO
import * as eventsRepo from '../repositories/events.repository.js'; // NUEVO
import fs from 'fs';
import path from 'path';

function throwWithStatus(msg, status = 400) {
  const err = new Error(msg);
  err.status = status;
  throw err;
}

function validateEvento(payload) {
  if (!payload) throwWithStatus('Payload evento requerido', 400);
  if (!payload.nombre) throwWithStatus('Nombre requerido', 400);
  if (!payload.tipo || !['academico', 'ludico'].includes(String(payload.tipo))) throwWithStatus('Tipo inválido', 400);
  if (!payload.fecha) throwWithStatus('Fecha requerida', 400);
  if (!payload.hora) throwWithStatus('Hora requerida', 400);
  if (!payload.horaFin) throwWithStatus('HoraFin requerida', 400);
  const fecha = new Date(payload.fecha);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  if (fecha < hoy) throwWithStatus('Fecha debe ser hoy o futura', 400);
  if (payload.horaFin <= payload.hora) throwWithStatus('horaFin debe ser mayor que hora', 400);
  if (payload.capacidad !== undefined && payload.capacidad !== null) {
    const c = Number(payload.capacidad);
    if (!Number.isInteger(c) || c < 1) throwWithStatus('capacidad inválida', 400);
  }
}

async function unlinkFileIfExists(file) {
  try {
    if (!file) return;
    if (file.path) {
      await fs.promises.unlink(file.path).catch(() => { });
    } else if (file.filename) {
      const abs = path.join(process.cwd(), 'uploads', file.filename);
      await fs.promises.unlink(abs).catch(() => { });
    }
  } catch (e) { /* noop */ }
}

async function computeSumCapacity(installationsIds = []) {
  let sum = 0;
  for (const id of installationsIds) {
    const inst = await instRepo.findById(id);
    if (!inst) throwWithStatus(`Instalación ${id} no encontrada`, 400);
    const capInst = inst.capacidad !== undefined && inst.capacidad !== null ? Number(inst.capacidad) : null;
    if (capInst === null || !Number.isInteger(capInst)) throwWithStatus(`Capacidad no definida o inválida para instalación ${id}`, 400);
    sum += capInst;
  }
  return sum;
}

/* Create minimal event (no aval/orgs) */
export async function createEvent({ evento, uploaderId }) {
  validateEvento(evento);

  if (evento.capacidad === undefined || evento.capacidad === null) throwWithStatus('capacidad del evento requerida', 400);
  const capacidadEvento = Number(evento.capacidad);
  if (!Number.isInteger(capacidadEvento) || capacidadEvento < 1) throwWithStatus('capacidad inválida', 400);

  if (!Array.isArray(evento.instalaciones) || evento.instalaciones.length === 0) throwWithStatus('instalaciones requeridas', 400);

  const sumCap = await computeSumCapacity(evento.instalaciones);
  if (sumCap < capacidadEvento) throwWithStatus(`Capacidad total de instalaciones seleccionadas (${sumCap}) es menor que la capacidad del evento (${capacidadEvento})`, 400);

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

    if (Array.isArray(evento.instalaciones) && evento.instalaciones.length > 0) {
      await instEventSvc.linkInstallationsToEvent(idEvento, evento.instalaciones, conn);
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


export async function updateEventSimpleFields({ id, partial, requesterId }) {
  if (!id) throwWithStatus('Id requerido', 400);
  if (!partial || Object.keys(partial).length === 0) throwWithStatus('Payload requerido', 400);
  if (!requesterId) throwWithStatus('Usuario no identificado', 401);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM evento WHERE idEvento = ? FOR UPDATE', [id]);
    if (!rows || rows.length === 0) throwWithStatus('Evento no encontrado', 404);
    const ev = rows[0];

    if (String(ev.idUsuario) !== String(requesterId)) throwWithStatus('No autorizado para editar este evento', 403);

    // Sólo actualizamos las columnas válidas que repo.updateById filtrará
    const updated = await repo.updateById(id, partial, conn);

    await conn.commit();
    return updated;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/* Update only estado (registrado -> enRevision) with permission check */
export async function updateEventState({ id, nuevoEstado, requesterId }) {
  if (!id) throwWithStatus('Id de evento requerido', 400);
  if (!nuevoEstado) throwWithStatus('Estado requerido', 400);

  const allowed = ['registrado', 'enRevision', 'aprobado', 'rechazado'];
  if (!allowed.includes(nuevoEstado)) throwWithStatus('Estado inválido', 400);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute('SELECT * FROM evento WHERE idEvento = ? FOR UPDATE', [id]);
    if (!rows || rows.length === 0) throwWithStatus('Evento no encontrado', 404);
    const ev = rows[0];

    if (!requesterId) throwWithStatus('Usuario no identificado', 401);
    if (String(ev.idUsuario) !== String(requesterId)) {
      // By default, only owner can change to enRevision; secretarias use evaluateEvent
      throwWithStatus('No autorizado para cambiar estado', 403);
    }

    const current = ev.estado || 'registrado';
    if (current !== 'registrado') throwWithStatus(`No se puede cambiar estado desde ${current}`, 400);
    if (nuevoEstado !== 'enRevision') throwWithStatus('Transición no permitida desde UI', 400);

    await conn.execute('UPDATE evento SET estado = ? WHERE idEvento = ?', [nuevoEstado, id]);

    await conn.commit();
    const [updatedRows] = await conn.execute('SELECT * FROM evento WHERE idEvento = ? LIMIT 1', [id]);
    return updatedRows[0] || null;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/* Delete/get/list/evaluate/getForSecretaria */
export async function deleteEvent(id, options = {}) {
  if (!id) throwWithStatus('Id requerido', 400);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const ok = await repo.deleteById(id, conn);
    if (!ok) { await conn.rollback(); return false; }
    await conn.commit();
    return true;
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
  if (!id) throwWithStatus('Id requerido', 400);
  return await repo.findById(id);
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