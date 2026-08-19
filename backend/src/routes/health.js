import { Router } from 'express';
import { checkDbConnectivity } from '../repositories/healthRepository.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    await checkDbConnectivity();
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (error) {
    console.error('[Health] DB unreachable:', error.message);
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});

export default router;
