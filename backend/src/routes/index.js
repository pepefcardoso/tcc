import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import athletesRouter from './athletes.js';
import sessionsRouter from './sessions.js';
import dashboardRouter from './dashboard.js';
import adminRouter from './admin.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/api/auth', authRouter);
router.use('/api/athletes', athletesRouter);
router.use('/api/sessions', sessionsRouter);
router.use('/api/dashboard', dashboardRouter);
router.use('/api/admin/athletes', adminRouter);

export { router };
