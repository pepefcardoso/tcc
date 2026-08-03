import 'dotenv/config';
import { runner } from 'node-pg-migrate';
import { fileURLToPath } from 'url';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('[migrate] ✖ DATABASE_URL is not set. Copy .env.example → .env and fill in credentials.');
  process.exit(1);
}

try {
  await runner({
    databaseUrl: DATABASE_URL,
    dir: fileURLToPath(new URL('../migrations', import.meta.url)),
    direction: 'up',
    migrationsTable: 'pgmigrations',
    verbose: true,
  });
  console.log('[migrate] ✔ Migrations complete.');
  process.exit(0);
} catch (err) {
  console.error('[migrate] ✖ Migration failed:', err.message);
  process.exit(1);
}
