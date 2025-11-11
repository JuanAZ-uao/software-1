// src/core/middlewares/upload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    const base = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    cb(null, `${base}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  // Aceptar solo PDFs por mimetype o extensión
  const mimetypeOk = file.mimetype && file.mimetype.toLowerCase().includes('pdf');
  const extOk = path.extname(file.originalname || '').toLowerCase() === '.pdf';
  if (!mimetypeOk && !extOk) {
    // Error manejable por el middleware global de errores
    return cb(new Error('Only PDF allowed'), false);
  }
  cb(null, true);
}

// Ajusta fileSize al límite que quieras aceptar (coincidir con validación cliente)
export const uploadAny = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 20 } // 20MB por archivo, hasta 20 archivos
}).any();

export const UPLOAD_DIR_PATH = UPLOAD_DIR;
