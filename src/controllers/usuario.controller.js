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

export async function obtenerMe(req, res) {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ error: 'No autenticado' });
    const usuario = await svc.obtenerUsuarioPorId(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    console.error('usuario.controller.obtenerMe error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error obteniendo usuario' });
  }
}

export async function actualizarMe(req, res) {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ error: 'No autenticado' });

    const { nombre, apellidos, email, telefono } = req.body || {};

    // Basic validation
    if (typeof nombre === 'undefined' && typeof apellidos === 'undefined' && typeof email === 'undefined' && typeof telefono === 'undefined') {
      return res.status(400).json({ error: 'No hay datos para actualizar' });
    }

    const updated = await svc.actualizarUsuario(id, { nombre, apellidos, email, telefono });
    if (!updated) return res.status(500).json({ error: 'No se pudo actualizar el usuario' });
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('usuario.controller.actualizarMe error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error actualizando usuario' });
  }
}
