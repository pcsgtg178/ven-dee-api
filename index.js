import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { initDb } from './src/config/db.js';
import customerRoutes from './src/routes/customerRoutes.js';
import todoRoutes from './src/routes/todoRoutes.js';
import eventRoutes from './src/routes/eventRoutes.js';
import shiftRoutes from './src/routes/shiftRoutes.js';
import serviceRoutes from './src/routes/serviceRoutes.js';
import analyticsRoutes from './src/routes/analyticsRoutes.js';
import scheduleRoutes from './src/routes/scheduleRoutes.js';
import { notFoundHandler, errorHandler } from './src/middlewares/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 200, message: 'VenDee API is running smoothly' });
});
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, status: 200, message: 'VenDee API v1 is running smoothly' });
});

// Mount routes on /api/v1 (Official Specification)
app.use('/api/v1/shifts', shiftRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/schedule', scheduleRoutes);

// Mount routes on /api (Backward Compatibility)
app.use('/api/shifts', shiftRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/todos', todoRoutes);

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

// Start server and initialize database tables if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`VenDee API Server running on port ${PORT}`);
    await initDb();
  });
}

export default app;
