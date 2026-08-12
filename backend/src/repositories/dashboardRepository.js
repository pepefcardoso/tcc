import { pool as defaultPool } from '../db.js';

/**
 * Fetches the latest session and metrics for every active athlete.
 * Uses LATERAL JOIN to efficiently retrieve the most recent session per athlete.
 * 
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Array<Object>>}
 */
export async function getLatestSessionPerActiveAthlete(pool = defaultPool) {
  const queryText = `
    SELECT
      a.id AS athlete_id,
      a.name,
      s.id AS session_id,
      s.started_at AS date,
      s.pse,
      s.duration_minutes,
      sm.total_distance_m,
      sm.max_speed_kmh,
      sm.sprint_count,
      sm.player_load
    FROM athletes a
    LEFT JOIN LATERAL (
      SELECT id, started_at, pse, duration_minutes
      FROM sessions
      WHERE athlete_id = a.id
      ORDER BY started_at DESC
      LIMIT 1
    ) s ON true
    LEFT JOIN session_metrics sm ON sm.session_id = s.id
    WHERE a.active = true
    ORDER BY a.name ASC;
  `;

  const { rows } = await pool.query(queryText);
  return rows;
}
