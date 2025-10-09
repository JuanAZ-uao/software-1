// src/controllers/events.controller.js
import * as svc from '../services/events.service.js';

export async function getAll(req, res) {
  try {
    const list = await svc.getAllEvents();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo eventos' });
  }
}

export async function getById(req, res) {
  try {
    const ev = await svc.getEventById(req.params.id);
    if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(ev);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo evento' });
  }
}

export async function create(req, res) {
  try {
    // files puede contener arrays: req.files['avalPdf'] and req.files['certificadoParticipacion']
    const files = req.files || {};
    const avalFile = files['avalPdf']?.[0] || null;
    const certFile = files['certificadoParticipacion']?.[0] || null;

    const eventoRaw = req.body.evento;
    if (!eventoRaw) return res.status(400).json({ error: 'Evento no enviado' });
    const payloadEvento = JSON.parse(eventoRaw);

    const tipoAval = req.body.tipoAval;
    if (!tipoAval) return res.status(400).json({ error: 'tipoAval requerido' });

    const orgRel = req.body.organizacionId ? {
      organizacionId: req.body.organizacionId,
      orgIsRepresentative: req.body.orgIsRepresentative === '1',
      organizacionEncargado: req.body.organizacionEncargado || null,
      participante: req.body.participante || null,
      certificadoFile: certFile
    } : null;

    const uploaderId = req.user?.id || payloadEvento.idUsuario;

    const created = await svc.createEvent(payloadEvento, avalFile, orgRel, uploaderId, tipoAval);
    res.status(201).json(created);
  } catch (err) {
    console.error('events.controller.create error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error creando evento' });
  }
}

export async function update(req, res) {
  try {
    const files = req.files || {};
    const avalFile = files['avalPdf']?.[0] || null;
    const certFile = files['certificadoParticipacion']?.[0] || null;

    const payloadEvento = req.body.evento ? JSON.parse(req.body.evento) : {};
    const tipoAval = req.body.tipoAval || null;

    const orgRel = req.body.organizacionId ? {
      organizacionId: req.body.organizacionId,
      orgIsRepresentative: req.body.orgIsRepresentative === '1',
      organizacionEncargado: req.body.organizacionEncargado || null,
      participante: req.body.participante || null,
      certificadoFile: certFile
    } : null;

    const uploaderId = req.user?.id || payloadEvento.idUsuario;
    const updated = await svc.updateEvent(req.params.id, payloadEvento, avalFile, orgRel, uploaderId, tipoAval);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Error actualizando evento' });
  }
}

export async function remove(req, res) {
  try {
    const ok = await svc.deleteEvent(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando evento' });
  }
}
