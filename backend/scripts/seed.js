import 'dotenv/config';
import pg from 'pg';
import bcryptjs from 'bcryptjs';

/*
 * Demo Credentials for local dev:
 * Email: demo@wearable.local
 * Password: demo1234
 */

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    '[seed] ✖ DATABASE_URL is not set. Copy .env.example → .env and fill in credentials.'
  );
  process.exit(1);
}

const ATHLETE_1_ID = 'aaaaaaaa-0001-0001-0001-000000000001';
const ATHLETE_2_ID = 'aaaaaaaa-0002-0002-0002-000000000002';

const DEMO_EMAIL = 'demo@wearable.local';
const DEMO_PASSWORD_PLAIN = 'demo1234';

async function seed() {
  const client = new pg.Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('[seed] Seeding demo data...');

    await client.query('BEGIN');

    const insertAthleteText = `
      INSERT INTO athletes (id, name, position, birth_date, weight_kg, height_m, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `;

    await client.query(insertAthleteText, [
      ATHLETE_1_ID,
      'Carlos Silva',
      'Atacante',
      '2000-03-15',
      72.5,
      1.78,
      true,
    ]);

    await client.query(insertAthleteText, [
      ATHLETE_2_ID,
      'Pedro Mendes',
      'Meio-Campista',
      '1999-07-22',
      68.0,
      1.75,
      true,
    ]);
    console.log('[seed] ✔ Athletes inserted (or already present).');

    const hash = await bcryptjs.hash(DEMO_PASSWORD_PLAIN, 10);
    const insertUserText = `
      INSERT INTO users (email, password_hash, role, athlete_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `;

    await client.query(insertUserText, [DEMO_EMAIL, hash, 'tecnico', null]);
    console.log('[seed] ✔ Demo user inserted (or already present).');

    await client.query('COMMIT');
    console.log(`[seed] ✔ Done. Demo credentials: ${DEMO_EMAIL} / ${DEMO_PASSWORD_PLAIN}`);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.message.includes('relation') && err.message.includes('does not exist')) {
      console.error('[seed] ✖ Database tables missing. Have you run \`npm run migrate\`?');
      console.error(`[seed] Error details: ${err.message}`);
    } else {
      console.error('[seed] ✖ Seeding failed:', err.message);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
