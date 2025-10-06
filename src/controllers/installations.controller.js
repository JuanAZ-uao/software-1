// controllers/installations.controller.js
import * as svc from '../services/installations.service.js';

export async function getAll(req, res) {
  try {
    const list = await svc.getAllInstallations();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo instalaciones' });
  }
}
