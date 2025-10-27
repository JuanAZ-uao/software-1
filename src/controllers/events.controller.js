// src/controllers/events.controller.js
import * as svc from '../services/events.service.js';

/* Helpers */
function mapFilesArrayToDict(filesArray = []) {
  const dict = {};
  for (const f of filesArray) {
    dict[f.fieldname] = dict[f.fieldname] || [];
    dict[f.fieldname].push(f);
  }
  return dict;
}

function parseJSONSafe(raw) {
  if (!raw && raw !== '') return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

/* GET /api/events */
export async function getAll(req, res) {
  try {
    const list = await svc.getAllEvents();
    return res.json(list);
  } catch (err) {
    console.error('events.controller.getAll error:', err);
    return res.status(500).json({ error: 'Error obteniendo eventos' });
  }
}

/* GET /api/events/for-secretaria */
export async function getEventsForSecretaria(req, res) {
  try {
    const list = await svc.getEventsForSecretaria();
    return res.json(list);
  } catch (err) {
    console.error('events.controller.getEventsForSecretaria error:', err);
    return res.status(500).json({ error: 'Error obteniendo eventos para secretaria' });
  }
}

/* POST /api/events/evaluate */
export async function evaluateEvent(req, res) {
  try {
    const filesDict = mapFilesArrayToDict(req.files || []);
    const { idEvento, estado, justificacion } = req.body;
    const actaFile = filesDict['actaAprobacion'] ? filesDict['actaAprobacion'][0] : null;
    const idSecretaria = req.user?.id || req.body.idSecretaria;

    if (!idEvento) return res.status(400).json({ error: 'idEvento requerido' });
    if (!estado) return res.status(400).json({ error: 'estado requerido' });
    if (!idSecretaria) return res.status(401).json({ error: 'Secretaria no identificada' });

    const result = await svc.evaluateEvent({
      idEvento,
      estado,
      justificacion,
      actaFile,
      idSecretaria
    });

    return res.json(result);
  } catch (err) {
    console.error('events.controller.evaluateEvent error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error evaluando evento' });
  }
}

/* GET /api/events/:id */
export async function getById(req, res) {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Id requerido' });

    const ev = await svc.getEventById(id);
    if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });
    return res.json(ev);
  } catch (err) {
    console.error('events.controller.getById error:', err);
    return res.status(500).json({ error: 'Error obteniendo evento' });
  }
}

/* POST /api/events */
export async function create(req, res) {
  try {
    const filesDict = mapFilesArrayToDict(req.files || []);
    const eventoRaw = req.body.evento;
    if (!eventoRaw) return res.status(400).json({ error: 'Evento no enviado' });
    const payloadEvento = parseJSONSafe(eventoRaw);
    if (!payloadEvento) return res.status(400).json({ error: 'evento JSON inválido' });

    const uploaderId = req.user?.id || payloadEvento.idUsuario || null;
    if (!uploaderId) return res.status(401).json({ error: 'Usuario no identificado' });

    // Minimal create: frontend currently doesn't use organizaciones/aval here
    const created = await svc.createEvent({
      evento: payloadEvento,
      uploaderId
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error('events.controller.create error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error creando evento' });
  }
}

/* PUT /api/events/:id
   - If request is state-only (e.g., { estado: 'enRevision' }), delegate to updateEventState
   - Otherwise delegate to updateEvent (partial update)
*/
export async function update(req, res) {
  try {
    // detect state-only
    const bodyKeys = Object.keys(req.body || {});
    const isStateOnly = (bodyKeys.length === 1 && (req.body.estado !== undefined || req.body.estado !== null))
      || (bodyKeys.length === 0 && req.query && req.query.estado);

    if (isStateOnly) {
      const nuevoEstado = req.body.estado || req.query.estado;
      const requesterId = req.user?.id || req.body.requesterId || null;
      const updated = await svc.updateEventState({ id: req.params.id, nuevoEstado, requesterId });
      return res.json(updated);
    }

    // parse incoming JSON body (or body.evento if multipart)
    let payloadEvento = null;
    if (req.body.evento) payloadEvento = parseJSONSafe(req.body.evento);
    else if (Object.keys(req.body || {}).length > 0) payloadEvento = req.body;
    else payloadEvento = {};

    // only accept simple-update if payload contains at least one of the allowed keys
    const allowed = new Set(['nombre','fecha','hora','horaFin']);
    const keys = Object.keys(payloadEvento);
    const simpleKeys = keys.filter(k => allowed.has(k));

    if (simpleKeys.length === 0) {
      // no simple keys provided — treat as bad request
      return res.status(400).json({ error: 'Solo se permiten actualizaciones de nombre, fecha, hora y horaFin en este flujo' });
    }

    const partial = {};
    for (const k of simpleKeys) partial[k] = payloadEvento[k];

    const requesterId = req.user?.id || payloadEvento.idUsuario || null;
    if (!requesterId) return res.status(401).json({ error: 'Usuario no identificado' });

    const updated = await svc.updateEventSimpleFields({ id: req.params.id, partial, requesterId });
    return res.json(updated);
  } catch (err) {
    console.error('events.controller.update error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error actualizando evento' });
  }
}

/* DELETE /api/events/:id */
export async function remove(req, res) {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Id requerido' });

    const ok = await svc.deleteEvent(id, { requesterId: req.user?.id });
    if (!ok) return res.status(404).json({ error: 'Evento no encontrado o no permitido' });
    return res.json({ success: true });
  } catch (err) {
    console.error('events.controller.remove error:', err);
    return res.status(500).json({ error: 'Error eliminando evento' });
  }
}
