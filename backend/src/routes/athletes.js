import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { createAthleteSchema, patchAthleteSchema } from '../schemas/athlete.schema.js';
import * as athleteRepository from '../repositories/athleteRepository.js';

const router = Router();

router.post(
  '/',
  authMiddleware,
  requireRole('tecnico', 'preparador'),
  validate(createAthleteSchema),
  async (req, res, next) => {
    try {
      const { name, position, birth_date, weight_kg, height_m } = req.body;
      const athlete = await athleteRepository.create({
        name,
        position,
        birth_date,
        weight_kg,
        height_m,
      });

      return res.status(201).json(athlete);
    } catch (error) {
      return next(error);
    }
  }
);

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const athletes = await athleteRepository.findAll({ includeInactive });
    return res.status(200).json(athletes);
  } catch (error) {
    return next(error);
  }
});

router.patch(
  '/:id',
  authMiddleware,
  requireRole('tecnico', 'preparador'),
  validate(patchAthleteSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const athlete = await athleteRepository.update(id, req.body);

      if (!athlete) {
        return next(new AppError(404, 'athlete_not_found', 'Athlete not found'));
      }

      return res.status(200).json(athlete);
    } catch (error) {
      return next(error);
    }
  }
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole('tecnico', 'preparador'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const athlete = await athleteRepository.deactivate(id);

      if (!athlete) {
        return next(new AppError(404, 'athlete_not_found', 'Athlete not found'));
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
