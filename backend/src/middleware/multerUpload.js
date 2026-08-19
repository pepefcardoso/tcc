import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

fs.mkdirSync(env.UPLOAD_TMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.UPLOAD_TMP_DIR),
  filename: (req, file, cb) => {
    const sanitized = path.basename(file.originalname);
    req._uploadTempFilename = sanitized;
    cb(null, sanitized);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = ['application/x-ndjson', 'application/ndjson', 'text/plain'];
  const extOk = file.originalname.toLowerCase().endsWith('.ndjson');
  if (allowed.includes(file.mimetype) || extOk) {
    cb(null, true);
  } else {
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
    err.code = 'WRONG_TYPE';
    cb(err, false);
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});
