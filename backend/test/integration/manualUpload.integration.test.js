import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/db.js';
import { signUserToken, signDeviceToken } from '../../src/utils/jwt.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { env } from '../../src/config/env.js';

describe('Manual Upload Integration', () => {
  let athleteId;
  let tecnicoToken;
  let preparadorToken;
  let atletaToken;
  let deviceToken;

  const validSessionPath = path.join(process.cwd(), 'test', 'fixtures', 'valid_session.ndjson');

  beforeAll(async () => {
    const { rows: athleteRows } = await pool.query(
      `INSERT INTO athletes (name) VALUES ('Manual Upload Test Athlete') RETURNING id`
    );
    athleteId = athleteRows[0].id;

    tecnicoToken = signUserToken({ sub: crypto.randomUUID(), role: 'tecnico' });
    preparadorToken = signUserToken({ sub: crypto.randomUUID(), role: 'preparador' });
    atletaToken = signUserToken({ sub: crypto.randomUUID(), role: 'atleta' });
    deviceToken = signDeviceToken({ sub: 'device-123' });
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE sessions CASCADE');
  });

  afterAll(async () => {
    await pool.query('DELETE FROM sessions WHERE athlete_id = $1', [athleteId]);
    await pool.query('DELETE FROM athletes WHERE id = $1', [athleteId]);
    await pool.end();
  });

  it('should process upload when authenticated as tecnico', async () => {
    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .field('athlete_id', athleteId)
      .attach('file', validSessionPath);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('processed');
    expect(res.body).toHaveProperty('session_id');
    expect(res.body).toHaveProperty('metrics');
  });

  it('should process upload when authenticated as preparador', async () => {
    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', `Bearer ${preparadorToken}`)
      .field('athlete_id', athleteId)
      .attach('file', validSessionPath);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('processed');
  });

  it('should return 403 when authenticated as atleta', async () => {
    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', `Bearer ${atletaToken}`)
      .field('athlete_id', athleteId)
      .attach('file', validSessionPath);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('forbidden');
  });

  it('should return 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/api/sessions/upload')
      .field('athlete_id', athleteId)
      .attach('file', validSessionPath);

    expect(res.status).toBe(401);
  });

  it('should process upload when authenticated as device (existing path)', async () => {
    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', `Bearer ${deviceToken}`)
      .field('athlete_id', athleteId)
      .attach('file', validSessionPath);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('processed');
  });

  it('should return 404 for valid UUID but non-existent athlete', async () => {
    const nonExistentId = crypto.randomUUID();
    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .field('athlete_id', nonExistentId)
      .attach('file', validSessionPath);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('athlete_not_found');
  });

  it('should return 422 when athlete_id is missing', async () => {
    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .attach('file', validSessionPath);

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
  });

  it('should return 422 when athlete_id has invalid UUID format', async () => {
    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .field('athlete_id', 'not-a-uuid')
      .attach('file', validSessionPath);

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
  });

  it('should skip duplicate processing and return 200 duplicate_skipped', async () => {
    await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .field('athlete_id', athleteId)
      .attach('file', validSessionPath);

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .field('athlete_id', athleteId)
      .attach('file', validSessionPath);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('duplicate_skipped');
  });

  it('should return 422 for an empty file', async () => {
    const emptySessionPath = path.join(process.cwd(), 'test', 'fixtures', 'empty_session.ndjson');
    fs.writeFileSync(emptySessionPath, '');

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .field('athlete_id', athleteId)
      .attach('file', emptySessionPath);

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation_error');
  });

  it('should return 413 for oversized file', async () => {
    const tempOversizedPath = path.join(process.cwd(), 'test', 'fixtures', 'oversized_temp.ndjson');
    const maxSizeMB = env.UPLOAD_MAX_FILE_SIZE_MB || 50;
    const oversizedBytes = maxSizeMB * 1024 * 1024 + 1024;

    const buf = Buffer.alloc(1024, 'a');
    const fd = fs.openSync(tempOversizedPath, 'w');
    let written = 0;
    while (written < oversizedBytes) {
      fs.writeSync(fd, buf, 0, buf.length, null);
      written += buf.length;
    }
    fs.closeSync(fd);

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .field('athlete_id', athleteId)
      .attach('file', tempOversizedPath);

    expect(res.status).toBe(413);

    const targetTempPath = path.join(env.UPLOAD_TMP_DIR, 'oversized_temp.ndjson');
    expect(fs.existsSync(targetTempPath)).toBe(false);

    fs.unlinkSync(tempOversizedPath);
  });

  it('should return 415 for a file with a non-ndjson extension', async () => {
    const wrongTypePath = path.join(process.cwd(), 'test', 'fixtures', 'wrong_type.txt');

    const res = await request(app)
      .post('/api/sessions/upload')
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .field('athlete_id', athleteId)
      .attach('file', wrongTypePath, { contentType: 'text/plain' });

    expect(res.status).toBe(415);
    expect(res.body.error).toBe('unsupported_media_type');
  });
});
