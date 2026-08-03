import express from 'express';
import cors from 'cors';
import { router } from './routes/index.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use('/', router);

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
});

export default app;
