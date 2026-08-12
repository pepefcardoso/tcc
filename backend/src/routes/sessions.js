import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { authMiddleware, requireDeviceOrOperator } from '../middleware/auth.js';
import { upload } from '../middleware/multerUpload.js';
import { validate } from '../middleware/validate.js';
import { uploadBodySchema } from '../schemas/upload.schema.js';
import { AppError } from '../middleware/errorHandler.js';
import * as athleteRepository from '../repositories/athleteRepository.js';
import * as sessionRepository from '../repositories/sessionRepository.js';
import { enqueue } from '../services/processingQueue.js';
import * as uploadService from '../services/uploadService.js';
import { calculateAcwr, classifyAcwrZone } from '../services/acwrService.js';
import { requireRole } from '../middleware/role.js';
import { pseSchema } from '../schemas/pse.schema.js';

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
  requireDeviceOrOperator,
  (req, res, next) =>
    upload.single('file')(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      return next();
    }),
  validate(uploadBodySchema),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new AppError(422, 'validation_error', 'File field "file" is required'));
      }

      const athlete = await athleteRepository.findById(req.body.athlete_id);
      if (!athlete) {
        fs.unlink(req.file.path, () => {});
        return next(new AppError(404, 'athlete_not_found', 'Athlete not found'));
      }

      const originalname = path.basename(req.file.originalname);
      const existingSession = await sessionRepository.findByFilename(originalname);

      if (existingSession) {
        return res.status(200).json({
          session_id: existingSession.id,
          status: 'duplicate_skipped',
          metrics: existingSession.metrics,
        });
      }

      const taskResult = await enqueue(() =>
        uploadService.processUpload({
          filePath: req.file.path,
          athleteId: req.body.athlete_id,
          sourceFilename: originalname,
        })
      );

      return res.status(200).json(taskResult);
    } catch (error) {
      return next(error);
    }
  }
);

router.patch(
  '/:id/pse',
  authMiddleware,
  requireRole('atleta', 'tecnico', 'preparador'),
  validate(pseSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { pse } = req.body;

      if (pse < 1 || pse > 10) {
        return next(
          new AppError(
            422,
            'invalid_pse_range',
            'PSE must be an integer between 1 and 10 inclusive'
          )
        );
      }

      const session = await sessionRepository.findById(id);
      if (!session) {
        return next(new AppError(404, 'session_not_found', 'Session not found'));
      }

      const durationMinutes = session.duration_minutes ?? 0;
      const sessionLoad = pse * durationMinutes;

      const updated = await sessionRepository.updatePse(id, pse, sessionLoad);

      const acwrResult = await calculateAcwr(updated.athlete_id);
      const acwrZone = classifyAcwrZone(acwrResult.acwr);

      return res.status(200).json({
        session_id: updated.id,
        pse: updated.pse,
        session_load: parseFloat(updated.session_load),
        acwr: { value: acwrResult.acwr, zone: acwrZone },
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
