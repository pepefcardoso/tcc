import { pool as defaultPool } from '../db.js';

/**
 * Find an athlete by their ID.
 * @param {string} id - Athlete UUID
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Object|null>}
 */
export async function findById(id, pool = defaultPool) {
  const { rows } = await pool.query('SELECT * FROM athletes WHERE id = $1', [id]);
  return rows[0] || null;
}

/**
 * List athletes.
 * @param {Object} options
 * @param {boolean} [options.includeInactive=false] - Whether to include soft-deleted athletes
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Object[]>}
 */
export async function findAll({ includeInactive = false } = {}, pool = defaultPool) {
  let queryText = 'SELECT * FROM athletes';
  if (!includeInactive) {
    queryText += ' WHERE active = true';
  }
  queryText += ' ORDER BY name';
  const { rows } = await pool.query(queryText);
  return rows;
}

/**
 * Create a new athlete.
 * @param {Object} athleteData
 * @param {string} athleteData.name
 * @param {string} [athleteData.position]
 * @param {string} [athleteData.birth_date]
 * @param {number} [athleteData.weight_kg]
 * @param {number} [athleteData.height_m]
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Object>}
 */
export async function create(
  { name, position, birth_date, weight_kg, height_m },
  pool = defaultPool
) {
  const { rows } = await pool.query(
    `INSERT INTO athletes (name, position, birth_date, weight_kg, height_m) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING *`,
    [name, position, birth_date, weight_kg, height_m]
  );
  return rows[0];
}

/**
 * Update an athlete partially.
 * @param {string} id - Athlete UUID
 * @param {Object} fields - Fields to update
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Object|null>}
 */
export async function update(id, fields, pool = defaultPool) {
  const allowedFields = ['name', 'position', 'birth_date', 'weight_kg', 'height_m', 'active'];
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
    UPDATE athletes 
    SET ${setClauses.join(', ')} 
    WHERE id = $1 
    RETURNING *
  `;
  const queryParams = [id, ...values];

  const { rows } = await pool.query(queryText, queryParams);
  return rows[0] || null;
}

/**
 * Soft delete an athlete by setting active to false.
 * @param {string} id - Athlete UUID
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<Object|null>}
 */
export async function deactivate(id, pool = defaultPool) {
  const { rows } = await pool.query(
    'UPDATE athletes SET active = false WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] || null;
}
