import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
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
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/company', companyRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
