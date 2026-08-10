import { pool } from '../../src/db.js';
import * as sessionRepository from '../../src/repositories/sessionRepository.js';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

describe('SessionRepository Integration', () => {
  let athleteId;
  let sessionId;

  beforeAll(async () => {
    const { rows: athleteRows } = await pool.query(
      `INSERT INTO athletes (name) VALUES ('GPS Batch Integration Test') RETURNING id`
    );
    athleteId = athleteRows[0].id;
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE sessions CASCADE');

    const { rows: sessionRows } = await pool.query(
      `INSERT INTO sessions (athlete_id, source_filename, sync_status, created_at)
       VALUES ($1, 'test_batch.ndjson', 'processing', now()) RETURNING id`,
      [athleteId]
    );
    sessionId = sessionRows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM sessions WHERE athlete_id = $1', [athleteId]);
    await pool.query('DELETE FROM athletes WHERE id = $1', [athleteId]);
    await pool.end();
  });

  async function loadGpsFixture(filename) {
    const filePath = path.join(process.cwd(), 'test', 'fixtures', filename);
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const samples = [];
    for await (const line of rl) {
      if (line.trim()) {
        const record = JSON.parse(line.trim());
        if (record.type === 'gps') {
          samples.push(record);
        }
      }
    }
    return samples;
  }

  it('inserts N samples in <= ceil(N/batchSize) queries (N=7, batch=3)', async () => {
    const allSamples = await loadGpsFixture('gps_batch_session.ndjson');
    expect(allSamples).toHaveLength(7);

    let queryCount = 0;
    const countingPool = {
      query: async (...args) => {
        if (args[0] && args[0].includes('INSERT INTO gps_samples')) {
          queryCount++;
        }
        return pool.query(...args);
      },
    };

    const batchSize = 3;

    for (let i = 0; i < allSamples.length; i += batchSize) {
      const batch = allSamples.slice(i, i + batchSize);
      await sessionRepository.insertGpsBatch(sessionId, batch, countingPool);
    }

    expect(queryCount).toBe(Math.ceil(allSamples.length / batchSize));
    expect(queryCount).toBe(3);

    const { rows } = await pool.query(
      'SELECT COUNT(*) as count FROM gps_samples WHERE session_id = $1',
      [sessionId]
    );
    expect(parseInt(rows[0].count, 10)).toBe(7);
  });

  it('inserts safely when batch size > N (N=7, batch=500)', async () => {
    const allSamples = await loadGpsFixture('gps_batch_session.ndjson');
    expect(allSamples).toHaveLength(7);

    const countingPool = {
      query: async (...args) => {
        return pool.query(...args);
      },
    };

    const rowsInserted = await sessionRepository.insertGpsBatch(
      sessionId,
      allSamples,
      countingPool
    );
    expect(rowsInserted).toBe(7);

    const { rows } = await pool.query(
      'SELECT COUNT(*) as count FROM gps_samples WHERE session_id = $1',
      [sessionId]
    );
    expect(parseInt(rows[0].count, 10)).toBe(7);
  });
});
