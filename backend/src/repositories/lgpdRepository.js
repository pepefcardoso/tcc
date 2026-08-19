import { pool as defaultPool } from '../db.js';
import * as sessionRepository from './sessionRepository.js';

/**
 * Export an athlete's complete data payload.
 *
 * @param {string} athleteId - UUID of the athlete
 * @param {Object} options
 * @param {boolean} [options.includeSamples=false] - If true, includes raw GPS/IMU samples (WARNING: can be very large)
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Object|null>} Returns null if athlete is not found.
 */
export async function exportAthleteData(
  athleteId,
  { includeSamples = false } = {},
  pool = defaultPool
) {
  const { rows: athleteRows } = await pool.query('SELECT * FROM athletes WHERE id = $1', [
    athleteId,
  ]);
  if (athleteRows.length === 0) {
    return null;
  }
  const athlete = athleteRows[0];

  const sessions = await sessionRepository.findByAthleteId(athleteId, {}, pool);

  if (includeSamples) {
    for (const session of sessions) {
      const { rows: gpsRows } = await pool.query(
        'SELECT time, latitude, longitude, speed_ms FROM gps_samples WHERE session_id = $1 ORDER BY time ASC',
        [session.id]
      );
      session.gps_samples = gpsRows;

      const { rows: imuRows } = await pool.query(
        'SELECT time, ac_x, ac_y, ac_z, gy_x, gy_y, gy_z FROM imu_samples WHERE session_id = $1 ORDER BY time ASC',
        [session.id]
      );
      session.imu_samples = imuRows;
    }
  }

  return {
    athlete,
    sessions,
  };
}

/**
 * Hard delete an athlete and all related data (LGPD Art. 18 Purge).
 * Respects ON DELETE RESTRICT by deleting child records explicitly.
 *
 * @param {string} athleteId - UUID of the athlete
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Object|null>} Returns { deleted: true, athlete_id } or null if not found.
 */
export async function purgeAthleteData(athleteId, pool = defaultPool) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('UPDATE users SET athlete_id = NULL WHERE athlete_id = $1', [athleteId]);

    await client.query(
      'DELETE FROM gps_samples WHERE session_id IN (SELECT id FROM sessions WHERE athlete_id = $1)',
      [athleteId]
    );
    await client.query(
      'DELETE FROM imu_samples WHERE session_id IN (SELECT id FROM sessions WHERE athlete_id = $1)',
      [athleteId]
    );

    await client.query(
      'DELETE FROM session_metrics WHERE session_id IN (SELECT id FROM sessions WHERE athlete_id = $1)',
      [athleteId]
    );

    await client.query('DELETE FROM sessions WHERE athlete_id = $1', [athleteId]);

    const { rows } = await client.query('DELETE FROM athletes WHERE id = $1 RETURNING id', [
      athleteId,
    ]);

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('COMMIT');
    return { deleted: true, athlete_id: athleteId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
