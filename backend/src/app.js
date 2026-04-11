import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_request, response) => {
  response.json({
    name: 'StockPro API',
    status: 'ok',
  });
});

app.use('/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
