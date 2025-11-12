// src/services/evaluacion.service.js
import pool from '../db/pool.js';
import * as evalRepo from '../repositories/evaluacion.repository.js';
import fs from 'fs';
import path from 'path';

async function moveActaFile(file) {
  if (!file) return null;
  const uploadsDir = path.resolve(process.cwd(), 'uploads', 'actas');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const safeName = (file.originalname || file.filename || 'acta').replace(/\s+/g, '_');
  const fileName = `acta_${Date.now()}_${safeName}`;
  const destPath = path.join(uploadsDir, fileName);
  try {
    if (file.path && fs.existsSync(file.path)) {
      fs.renameSync(file.path, destPath);
    } else if (file.buffer) {
      fs.writeFileSync(destPath, file.buffer);
    } else {
      const src = file.filename ? path.join(process.cwd(), 'uploads', file.filename) : null;
      if (src && fs.existsSync(src)) fs.renameSync(src, destPath);
      else throw new Error('No se encontró archivo para mover');
    }
    return `/uploads/actas/${fileName}`;
  } catch (err) {
    throw err;
  }
}

/**
 * Crea una evaluación y actualiza el estado del evento en la misma transacción.
 * Siempre requiere actaAprobacion (tanto para aprobado como rechazado).
 */
export async function createEvaluation({ idEvento, estado, justificacion = null, actaFile = null, idSecretaria }) {
  if (!idEvento) throw Object.assign(new Error('idEvento requerido'), { status: 400 });
  if (!idSecretaria) throw Object.assign(new Error('idSecretaria requerido'), { status: 401 });
  if (!['aprobado', 'rechazado'].includes(String(estado))) throw Object.assign(new Error('estado inválido'), { status: 400 });

  // acta obligatoria siempre
  if (!actaFile) throw Object.assign(new Error('Acta requerida para la evaluación'), { status: 400 });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // bloquear evento
    const [evRows] = await conn.query('SELECT * FROM evento WHERE idEvento = ? FOR UPDATE', [idEvento]);
    if (!Array.isArray(evRows) || evRows.length === 0) {
      await conn.rollback();
      throw Object.assign(new Error('Evento no encontrado'), { status: 404 });
    }

    // verificar secretaria existe
    const [secRows] = await conn.query('SELECT idUsuario FROM secretariaAcademica WHERE idUsuario = ? LIMIT 1', [idSecretaria]);
    if (!Array.isArray(secRows) || secRows.length === 0) {
      await conn.rollback();
      throw Object.assign(new Error('Usuario no autorizado como secretaria academica'), { status: 403 });
    }

    // mover acta y obtener ruta
    const actaPath = await moveActaFile(actaFile);

    const evaluacionPayload = {
      estado,
      fechaEvaluacion: new Date().toISOString().split('T')[0],
      justificacion: justificacion || null,
      actaAprobacion: actaPath,
      idEvento,
      idSecretaria
    };

    const { insertedId } = await evalRepo.createEvaluacion(evaluacionPayload, conn);

    // <-- CAMBIO: cuando es rechazado, dejar evento en 'registrado'
    const nuevoEstado = estado === 'aprobado' ? 'aprobado' : 'registrado';
    await conn.query('UPDATE evento SET estado = ? WHERE idEvento = ?', [nuevoEstado, idEvento]);

    await conn.commit();

    const createdEval = await evalRepo.findById(insertedId);
    const [updatedEventRows] = await pool.query('SELECT * FROM evento WHERE idEvento = ?', [idEvento]);
    const updatedEvent = Array.isArray(updatedEventRows) && updatedEventRows.length ? updatedEventRows[0] : null;

    return {
      evaluacion: createdEval,
      evento: updatedEvent
    };
  } catch (err) {
    try { await conn.rollback(); } catch (e) { /* noop */ }
    throw err;
  } finally {
    conn.release();
  }
}

