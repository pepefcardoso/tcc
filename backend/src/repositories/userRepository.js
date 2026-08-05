import { pool as defaultPool } from '../db.js';

const SAFE_SELECT_COLUMNS = 'id, email, role, athlete_id, created_at';

/**
 * Find a user by their ID, excluding the password hash.
 * @param {string} id - User UUID
 * @param {import('pg').Pool} pool
 * @returns {Promise<Object|null>}
 */
export async function findById(id, pool = defaultPool) {
  const { rows } = await pool.query(`SELECT ${SAFE_SELECT_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

/**
 * Find a user by their email, INCLUDES the password hash for authentication.
 * @param {string} email
 * @param {import('pg').Pool} pool
 * @returns {Promise<Object|null>}
 */
export async function findByEmail(email, pool = defaultPool) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

/**
 * Create a new user.
 * @param {Object} userData
 * @param {string} userData.email
 * @param {string} userData.password_hash
 * @param {string} userData.role
 * @param {string} [userData.athlete_id=null]
 * @param {import('pg').Pool} pool
 * @returns {Promise<Object>} The created user (excluding password hash)
 */
export async function create(
  { email, password_hash, role, athlete_id = null },
  pool = defaultPool
) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, role, athlete_id) 
     VALUES ($1, $2, $3, $4) 
     RETURNING ${SAFE_SELECT_COLUMNS}`,
    [email, password_hash, role, athlete_id]
  );
  return rows[0];
}

/**
 * Update a user partially.
 * @param {string} id
 * @param {Object} fields
 * @param {import('pg').Pool} pool
 * @returns {Promise<Object|null>}
 */
export async function update(id, fields, pool = defaultPool) {
  const allowedFields = ['email', 'password_hash', 'role', 'athlete_id'];
  const setClauses = [];
  const values = [];
  let paramIndex = 2;

  for (const [key, value] of Object.entries(fields)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    return findById(id, pool);
  }

  const queryText = `
    UPDATE users 
    SET ${setClauses.join(', ')} 
    WHERE id = $1 
    RETURNING ${SAFE_SELECT_COLUMNS}
  `;
  const queryParams = [id, ...values];

  const { rows } = await pool.query(queryText, queryParams);
  return rows[0] || null;
}
