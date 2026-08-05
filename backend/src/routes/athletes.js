import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { createAthleteSchema } from '../schemas/athlete.schema.js';
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

router.get(
  '/',
  authMiddleware,
  async (req, res, next) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const athletes = await athleteRepository.findAll({ includeInactive });
      return res.status(200).json(athletes);
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
