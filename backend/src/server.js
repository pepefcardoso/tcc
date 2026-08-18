import { env } from './config/env.js';
import app from './app.js';

const PORT = env.PORT;

const server = app.listen(PORT, (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});
