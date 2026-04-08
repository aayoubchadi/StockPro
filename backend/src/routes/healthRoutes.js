import { Router } from 'express';
import { checkDatabaseConnection } from '../lib/db.js';

const router = Router();

router.get('/', async (_request, response, next) => {
  try {
    const dbCheck = await checkDatabaseConnection();

    response.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: 'ok',
        name: dbCheck.current_database,
        user: dbCheck.current_user,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
