import { Router } from 'express';

const router = Router();

// GET /health — responds 200 { status: 'ok', db: 'not_configured' }
router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', db: 'not_configured' });
});

export default router;
