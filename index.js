import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { initDb } from './src/config/db.js';
import customerRoutes from './src/routes/customerRoutes.js';
import todoRoutes from './src/routes/todoRoutes.js';
import eventRoutes from './src/routes/eventRoutes.js';
import { notFoundHandler, errorHandler } from './src/middlewares/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 200, message: 'VenDee API is running smoothly' });
});

// API Routes
app.use('/api/customers', customerRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/events', eventRoutes);

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

// Start server and initialize database tables
app.listen(PORT, async () => {
  console.log(`VenDee API Server running on port ${PORT}`);
  await initDb();
});

export default app;
