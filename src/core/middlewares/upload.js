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

// acepta avalPdf (single) y certificadoParticipacion (single) simultáneamente
export const uploadFields = multer({ storage, fileFilter }).fields([
  { name: 'avalPdf', maxCount: 1 },
  { name: 'certificadoParticipacion', maxCount: 1 }
]);

export const UPLOAD_DIR_PATH = UPLOAD_DIR;
