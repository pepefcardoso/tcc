import { pool } from '../db.js';

/**
 * Checks connectivity to the database.
 * @returns {Promise<boolean>} True if connected, throws otherwise.
 */
export async function checkDbConnectivity() {
  const result = await pool.query('SELECT 1');
  return result.rows.length > 0;
}
