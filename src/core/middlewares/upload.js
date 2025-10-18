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
  if (!file.mimetype || !file.mimetype.includes('pdf')) {
    return cb(new Error('Only PDF allowed'), false);
  }
  cb(null, true);
}

// Accept dynamic field names (certificado_org_<id>), plus avalPdf and certificadoParticipacion.
// Limit files for safety.
export const uploadAny = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 20 } // 10MB max per file, up to 20 files
}).any();

export const UPLOAD_DIR_PATH = UPLOAD_DIR;
