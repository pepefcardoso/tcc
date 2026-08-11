import { pool } from '../../src/db.js';
import * as uploadService from '../../src/services/uploadService.js';
import * as sessionRepository from '../../src/repositories/sessionRepository.js';
import { ProcessingService } from '../../src/services/processingService.js';
import path from 'path';
import fs from 'fs';

const originalGpsBatchSize = ProcessingService.prototype.gpsBatchSize;
const originalImuBatchSize = ProcessingService.prototype.imuBatchSize;

describe('UploadService Integration', () => {
  let athleteId;
  const fixturePath = path.join(process.cwd(), 'test', 'fixtures', 'mixed_session.ndjson');

  beforeAll(async () => {
    const { rows: athleteRows } = await pool.query(
      `INSERT INTO athletes (name) VALUES ('UploadService Integration Test') RETURNING id`
    );
    athleteId = athleteRows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM sessions WHERE athlete_id = $1', [athleteId]);
    await pool.query('DELETE FROM athletes WHERE id = $1', [athleteId]);
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE sessions CASCADE');

    const tempPath = path.join(process.cwd(), 'test', 'fixtures', 'temp_integration.ndjson');
    fs.copyFileSync(fixturePath, tempPath);
  });

  it('processes a mixed NDJSON file and populates both hypertables', async () => {
    const tempPath = path.join(process.cwd(), 'test', 'fixtures', 'temp_integration.ndjson');

    const result = await uploadService.processUpload({
      filePath: tempPath,
      athleteId,
      sourceFilename: 'integration_test_session.ndjson',
    });

    expect(result.status).toBe('processed');
    expect(result.session_id).toBeDefined();

    const { rows: sessionRows } = await pool.query(
      'SELECT sync_status FROM sessions WHERE id = $1',
      [result.session_id]
    );
    expect(sessionRows[0].sync_status).toBe('processed');

    const { rows: gpsRows } = await pool.query(
      'SELECT COUNT(*) as count FROM gps_samples WHERE session_id = $1',
      [result.session_id]
    );
    expect(parseInt(gpsRows[0].count, 10)).toBe(6);

    const { rows: imuRows } = await pool.query(
      'SELECT COUNT(*) as count FROM imu_samples WHERE session_id = $1',
      [result.session_id]
    );
    expect(parseInt(imuRows[0].count, 10)).toBe(10);

    const { rows: metricsRows } = await pool.query(
      'SELECT * FROM session_metrics WHERE session_id = $1',
      [result.session_id]
    );
    expect(metricsRows).toHaveLength(1);
    expect(parseFloat(metricsRows[0].total_distance_m)).toBeCloseTo(result.metrics.total_distance_m, 1);
    expect(parseFloat(metricsRows[0].max_speed_kmh)).toBeCloseTo(result.metrics.max_speed_kmh, 1);
    expect(parseInt(metricsRows[0].sprint_count, 10)).toBe(result.metrics.sprint_count);
    expect(parseFloat(metricsRows[0].player_load)).toBeCloseTo(result.metrics.player_load, 4);

    expect(fs.existsSync(tempPath)).toBe(false);
  });
});
