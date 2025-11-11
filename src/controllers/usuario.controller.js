// src/controllers/usuario.controller.js
import * as svc from '../services/usuario.service.js';

export async function listar(req, res) {
  try {
    const q = String(req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const result = await svc.listarUsuarios({ q, page, limit });
    res.json(result);
  } catch (err) {
    console.error('usuario.controller.listar error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error listando usuarios' });
  }
}

export async function obtenerPorId(req, res) {
  try {
    const id = req.params.id;
    const usuario = await svc.obtenerUsuarioPorId(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    console.error('usuario.controller.obtenerPorId error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error obteniendo usuario' });
  }
}
