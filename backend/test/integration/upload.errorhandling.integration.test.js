import { jest } from '@jest/globals';
import { pool } from '../../src/db.js';
import * as uploadService from '../../src/services/uploadService.js';
import path from 'path';
import fs from 'fs';
import * as sessionRepository from '../../src/repositories/sessionRepository.js';
import { AppError } from '../../src/middleware/errorHandler.js';

describe('UploadErrorHandling Integration', () => {
  let athleteId;

  beforeAll(async () => {
    const { rows: athleteRows } = await pool.query(
      `INSERT INTO athletes (name) VALUES ('Error Handling Integration Test') RETURNING id`
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
  });

  it('rejects empty file and leaves no orphan rows', async () => {
    const fixturePath = path.join(process.cwd(), 'test', 'fixtures', 'empty_session.ndjson');
    const tempPath = path.join(process.cwd(), 'test', 'fixtures', 'temp_empty.ndjson');
    fs.copyFileSync(fixturePath, tempPath);

    await expect(
      uploadService.processUpload({
        filePath: tempPath,
        athleteId,
        sourceFilename: 'empty_session.ndjson',
      })
    ).rejects.toThrow(AppError);

    const { rows } = await pool.query('SELECT COUNT(*) as count FROM sessions WHERE source_filename = $1', ['empty_session.ndjson']);
    expect(parseInt(rows[0].count, 10)).toBe(0);
    expect(fs.existsSync(tempPath)).toBe(false);
  });

  it('rejects plaintext content and leaves no orphan rows', async () => {
    const fixturePath = path.join(process.cwd(), 'test', 'fixtures', 'plaintext_session.ndjson');
    const tempPath = path.join(process.cwd(), 'test', 'fixtures', 'temp_plaintext.ndjson');
    fs.copyFileSync(fixturePath, tempPath);

    await expect(
      uploadService.processUpload({
        filePath: tempPath,
        athleteId,
        sourceFilename: 'plaintext_session.ndjson',
      })
    ).rejects.toThrow(AppError);

    const { rows } = await pool.query('SELECT COUNT(*) as count FROM sessions WHERE source_filename = $1', ['plaintext_session.ndjson']);
    expect(parseInt(rows[0].count, 10)).toBe(0);

    const { rows: gpsRows } = await pool.query('SELECT COUNT(*) as count FROM gps_samples');
    expect(parseInt(gpsRows[0].count, 10)).toBe(0);

    expect(fs.existsSync(tempPath)).toBe(false);
  });

  it('rolls back transaction on mid-stream failure, leaving no orphan rows', async () => {
    const fixturePath = path.join(process.cwd(), 'test', 'fixtures', 'crash_session.ndjson');
    const tempPath = path.join(process.cwd(), 'test', 'fixtures', 'temp_crash.ndjson');
    fs.copyFileSync(fixturePath, tempPath);

    await expect(
      uploadService.processUpload({
        filePath: tempPath,
        athleteId,
        sourceFilename: 'crash_session.ndjson',
      })
    ).rejects.toThrow();

    const { rows } = await pool.query('SELECT COUNT(*) as count FROM sessions WHERE source_filename = $1', ['crash_session.ndjson']);
    expect(parseInt(rows[0].count, 10)).toBe(0);

    expect(fs.existsSync(tempPath)).toBe(false);
  });
});

