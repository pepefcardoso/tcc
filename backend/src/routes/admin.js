import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { AppError } from '../middleware/errorHandler.js';
import * as lgpdRepository from '../repositories/lgpdRepository.js';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('tecnico', 'preparador'));

/**
 * GET /api/admin/athletes/:id/export
 * Exports athlete, sessions, and optionally raw samples.
 */
router.get('/:id/export', async (req, res, next) => {
  try {
    const { id } = req.params;
    const includeSamples = req.query.includeSamples === 'true';

    const data = await lgpdRepository.exportAthleteData(id, { includeSamples });

    if (!data) {
      return next(new AppError(404, 'athlete_not_found', 'Athlete not found'));
    }

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/admin/athletes/:id/purge
 * Hard deletes an athlete and all associated data.
 */
router.delete('/:id/purge', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await lgpdRepository.purgeAthleteData(id);

    if (!result) {
      return next(new AppError(404, 'athlete_not_found', 'Athlete not found'));
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
