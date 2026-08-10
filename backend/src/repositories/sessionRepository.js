import { pool as defaultPool } from '../db.js';

/**
 * Find a session and its associated metrics by the source filename.
 * Used for duplicate detection before processing.
 *
 * @param {string} filename - The original filename of the NDJSON upload
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Object|null>} An object with the session details and nested metrics (if processed), or null
 */
export async function findByFilename(filename, pool = defaultPool) {
  const queryText = `
    SELECT 
      s.*,
      sm.total_distance_m,
      sm.max_speed_kmh,
      sm.sprint_count,
      sm.player_load
    FROM sessions s
    LEFT JOIN session_metrics sm ON sm.session_id = s.id
    WHERE s.source_filename = $1
  `;
  const { rows } = await pool.query(queryText, [filename]);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  let metrics = null;
  if (row.total_distance_m !== null && row.total_distance_m !== undefined) {
    metrics = {
      total_distance_m: parseFloat(row.total_distance_m),
      max_speed_kmh: parseFloat(row.max_speed_kmh),
      sprint_count: parseInt(row.sprint_count, 10),
      player_load: parseFloat(row.player_load),
    };
  }

  return {
    id: row.id,
    athlete_id: row.athlete_id,
    started_at: row.started_at,
    duration_minutes: row.duration_minutes,
    pse: row.pse,
    session_load: row.session_load ? parseFloat(row.session_load) : null,
    device_id: row.device_id,
    source_filename: row.source_filename,
    sync_status: row.sync_status,
    created_at: row.created_at,
    metrics,
  };
}

/**
 * Create a new session row to claim the filename before processing starts.
 *
 * @param {Object} sessionData
 * @param {string} sessionData.athlete_id
 * @param {string} sessionData.source_filename
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Object>}
 */
export async function create({ athlete_id, source_filename }, pool = defaultPool) {
  const { rows } = await pool.query(
    `INSERT INTO sessions (athlete_id, source_filename, sync_status, created_at) 
     VALUES ($1, $2, 'processing', now()) 
     RETURNING *`,
    [athlete_id, source_filename]
  );
  return rows[0];
}

/**
 * Inserts a batch of GPS samples into the gps_samples hypertable.
 *
 * @param {string} sessionId - The UUID of the session
 * @param {Array<Object>} samples - Array of GPS records { time, latitude, longitude, speed_ms }
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<number>} Number of inserted rows
 */
export async function insertGpsBatch(sessionId, samples, pool = defaultPool) {
  if (!samples || samples.length === 0) return 0;

  const columns = 5;
  const placeholders = samples
    .map((_, i) => {
      const base = i * columns;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    })
    .join(', ');

  const values = samples.flatMap((s) => [
    sessionId,
    new Date(s.time),
    s.latitude,
    s.longitude,
    s.speed_ms,
  ]);

  const queryText = `
    INSERT INTO gps_samples (session_id, time, latitude, longitude, speed_ms)
    VALUES ${placeholders}
  `;

  const result = await pool.query(queryText, values);
  return result.rowCount;
}

/**
 * Inserts a batch of IMU samples into the imu_samples hypertable.
 *
 * @param {string} sessionId - The UUID of the session
 * @param {Array<Object>} samples - Array of IMU records { time, ac_x, ac_y, ac_z, gy_x, gy_y, gy_z }
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<number>} Number of inserted rows
 */
export async function insertImuBatch(sessionId, samples, pool = defaultPool) {
  if (!samples || samples.length === 0) return 0;

  const columns = 8;
  const placeholders = samples
    .map((_, i) => {
      const base = i * columns;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
    })
    .join(', ');

  const values = samples.flatMap((s) => [
    sessionId,
    new Date(s.time),
    s.ac_x,
    s.ac_y,
    s.ac_z,
    s.gy_x,
    s.gy_y,
    s.gy_z,
  ]);

  const queryText = `
    INSERT INTO imu_samples (session_id, time, ac_x, ac_y, ac_z, gy_x, gy_y, gy_z)
    VALUES ${placeholders}
  `;

  const result = await pool.query(queryText, values);
  return result.rowCount;
}
