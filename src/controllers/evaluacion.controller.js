// src/controllers/evaluacion.controller.js
import * as svc from '../services/evaluacion.service.js';

export async function crearEvaluacion(req, res) {
  try {
    const idEvento = Number(req.body.idEvento || req.body.id || req.params.id);
    const estado = String(req.body.estado || '').trim();
    const justificacion = req.body.justificacion || null;

    // Extraer archivo actaAprobacion (soporta req.files array u objeto)
    let actaFile = null;
    if (req.files) {
      if (Array.isArray(req.files)) {
        actaFile = req.files.find(f => f.fieldname === 'actaAprobacion') || null;
      } else if (req.files.actaAprobacion) {
        actaFile = Array.isArray(req.files.actaAprobacion) ? req.files.actaAprobacion[0] : req.files.actaAprobacion;
      } else {
        for (const k of Object.keys(req.files)) {
          const v = req.files[k];
          if (Array.isArray(v) && v.length && v[0].fieldname === 'actaAprobacion') { actaFile = v[0]; break; }
          if (v && v.fieldname === 'actaAprobacion') { actaFile = v; break; }
        }
      }
    }

    const idSecretaria = Number(req.user?.id || req.body.idSecretaria || 0);
    if (!idSecretaria) return res.status(401).json({ error: 'Secretaria no identificada' });

    const result = await svc.createEvaluation({
      idEvento,
      estado,
      justificacion,
      actaFile,
      idSecretaria
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('evaluacion.controller.crearEvaluacion error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error creando evaluación' });
  }
}
