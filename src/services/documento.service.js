import { findDocumentoById, isDocumentoUsado } from '../repositories/documento.repository.js';

/**
 * Valida que el documento exista y no esté usado
 */
export async function validarDocumentoParaRegistro(documentoId) {
  const documento = await findDocumentoById(documentoId);
  if (!documento) {
    throw new Error('El documento no está registrado en la base de datos.');
  }

  const yaUsado = await isDocumentoUsado(documentoId);  
  if (yaUsado) {
    throw new Error('Este documento ya ha sido utilizado por otro usuario.');
  }

  return true;
}