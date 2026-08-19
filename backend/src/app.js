import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { router } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: [env.CORS_ALLOWED_ORIGIN],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', router);

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
});

app.use(errorHandler);

export default app;
