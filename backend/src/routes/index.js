import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import athletesRouter from './athletes.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/api/auth', authRouter);
router.use('/api/athletes', athletesRouter);

export { router };
