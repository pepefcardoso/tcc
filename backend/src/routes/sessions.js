import { Router } from 'express';
import multer from 'multer';
import { authMiddleware, requireDevice } from '../middleware/auth.js';
import { upload } from '../middleware/multerUpload.js';
import { validate } from '../middleware/validate.js';
import { uploadBodySchema } from '../schemas/upload.schema.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

/**
 * Inline multer error handler.
 * Converts multer-specific errors to API contract status codes.
 */
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(413, 'file_too_large', 'Uploaded file exceeds the size limit'));
    }
    if (err.code === 'WRONG_TYPE') {
      return next(new AppError(415, 'unsupported_media_type', 'Only .ndjson files are accepted'));
    }
  }
  return next(err);
}

router.post(
  '/upload',
  authMiddleware,
  requireDevice,
  (req, res, next) => upload.single('file')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    return next();
  }),
  validate(uploadBodySchema),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new AppError(422, 'validation_error', 'File field "file" is required'));
      }

      return res.status(200).json({
        session_id: null,
        status: 'queued',
        file_path: req.file.path,
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
