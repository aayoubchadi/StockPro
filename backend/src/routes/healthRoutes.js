import { Router } from 'express';

const router = Router();

router.get('/', (_request, response) => {
  response.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
