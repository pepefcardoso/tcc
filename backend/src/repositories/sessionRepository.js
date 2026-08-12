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

/**
 * Mark a session as processed.
 *
 * @param {string} sessionId - The UUID of the session
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Object>} The updated session row
 */
export async function markProcessed(sessionId, pool = defaultPool) {
  const { rows } = await pool.query(
    `UPDATE sessions SET sync_status = 'processed' WHERE id = $1 RETURNING *`,
    [sessionId]
  );
  return rows[0] ?? null;
}

/**
 * Inserts processed session metrics into session_metrics table.
 *
 * @param {string} sessionId - The UUID of the session
 * @param {Object} metrics - Computed session metrics
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Object>} The inserted metrics row
 */
export async function insertMetrics(sessionId, metrics, pool = defaultPool) {
  const { rows } = await pool.query(
    `INSERT INTO session_metrics
       (session_id, total_distance_m, max_speed_kmh, sprint_count, player_load)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      sessionId,
      metrics.total_distance_m,
      metrics.max_speed_kmh,
      metrics.sprint_count,
      metrics.player_load,
    ]
  );
  return rows[0];
}

/**
 * Begin a new database transaction for an upload stream.
 *
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<import('pg').PoolClient>} The checked-out client with an active transaction
 */
export async function beginUploadTransaction(pool = defaultPool) {
  const client = await pool.connect();
  await client.query('BEGIN');
  return client;
}

/**
 * Rollback a database transaction and release the client back to the pool.
 *
 * @param {import('pg').PoolClient} client - The active database client
 * @returns {Promise<void>}
 */
export async function rollbackAndRelease(client) {
  if (client) {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }
}

/**
 * Find a session by its ID, including joined metrics if available.
 *
 * @param {string} id - The UUID of the session
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Object|null>} The session row or null
 */
export async function findById(id, pool = defaultPool) {
  const { rows } = await pool.query(
    `SELECT 
       s.*, 
       sm.total_distance_m, 
       sm.max_speed_kmh, 
       sm.sprint_count, 
       sm.player_load
     FROM sessions s
     LEFT JOIN session_metrics sm ON sm.session_id = s.id
     WHERE s.id = $1`,
    [id]
  );
  if (rows.length === 0) return null;

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
 * Update the PSE and computed session_load for a session.
 *
 * @param {string} id - The UUID of the session
 * @param {number} pse - The Perceived Exertion (1-10)
 * @param {number} sessionLoad - The computed session load (PSE * duration_minutes)
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Object|null>} The updated session row or null
 */
export async function updatePse(id, pse, sessionLoad, pool = defaultPool) {
  const { rows } = await pool.query(
    `UPDATE sessions
     SET pse = $2, session_load = $3
     WHERE id = $1
     RETURNING id, pse, session_load, duration_minutes, athlete_id`,
    [id, pse, sessionLoad]
  );
  return rows[0] ?? null;
}

/**
 * Returns all session_load values for an athlete within the last N days,
 * ordered by started_at ASC, anchored to a reference timestamp.
 *
 * @param {string} athleteId
 * @param {number} days        - Window size in calendar days
 * @param {Date}   [referenceDate=new Date()] - Anchor for the rolling window
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Array<{started_at: Date, session_load: number}>>}
 */
export async function getSessionLoadHistory(athleteId, days, referenceDate = new Date(), pool = defaultPool) {
  const queryText = `
    SELECT started_at, session_load
    FROM sessions
    WHERE athlete_id = $1
      AND session_load IS NOT NULL
      AND started_at >= $2::timestamptz - ($3 || ' days')::interval
      AND started_at <= $2::timestamptz
    ORDER BY started_at ASC
  `;
  
  const { rows } = await pool.query(queryText, [
    athleteId,
    referenceDate.toISOString(),
    days
  ]);
  
  return rows.map(row => ({
    started_at: row.started_at,
    session_load: parseFloat(row.session_load)
  }));
}

/**
 * Find all sessions for a given athlete, optionally filtered by date range.
 *
 * @param {string} athleteId - Athlete UUID
 * @param {Object} [options]
 * @param {string} [options.from] - YYYY-MM-DD
 * @param {string} [options.to] - YYYY-MM-DD
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Object[]>}
 */
export async function findByAthleteId(athleteId, { from, to } = {}, pool = defaultPool) {
  let queryText = `
    SELECT 
      s.*, 
      sm.total_distance_m, 
      sm.max_speed_kmh, 
      sm.sprint_count, 
      sm.player_load
    FROM sessions s
    LEFT JOIN session_metrics sm ON sm.session_id = s.id
    WHERE s.athlete_id = $1
  `;
  
  const queryParams = [athleteId];
  let paramIndex = 2;

  if (from) {
    queryText += ` AND s.started_at >= $${paramIndex}::date`;
    queryParams.push(from);
    paramIndex++;
  }

  if (to) {
    queryText += ` AND s.started_at < ($${paramIndex}::date + interval '1 day')`;
    queryParams.push(to);
  }

  queryText += ` ORDER BY s.started_at DESC`;

  const { rows } = await pool.query(queryText, queryParams);

  return rows.map((row) => {
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
  });
}
