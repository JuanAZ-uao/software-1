import { findAllDocumentos, findDocumentoById, isDocumentoUsado } from '../repositories/documento.repository.js';

export const getAllDocumentos = async (_req, res) => {
  const documentos = await findAllDocumentos();
  res.json({ success: true, documentos });
};

export const validateDocumentoDisponible = async (req, res) => {
  const { id } = req.params;

  const documento = await findDocumentoById(id);
  if (!documento) {
    return res.status(404).json({ success: false, message: 'Documento no registrado.' });
  }

  const usado = await isDocumentoUsado(id);
  if (usado) {
    return res.status(409).json({ success: false, message: 'Documento ya está vinculado a un usuario.' });
  }

  res.json({ success: true, message: 'Documento válido y disponible.' });
};