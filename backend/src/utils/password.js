import bcryptjs from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt.
 *
 * @param {string} plaintext - The plaintext password to hash.
 * @returns {Promise<string>} The resulting hash.
 */
export async function hashPassword(plaintext) {
  return bcryptjs.hash(plaintext, SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 *
 * @param {string} plaintext - The plaintext password.
 * @param {string} hash - The bcrypt hash to compare against.
 * @returns {Promise<boolean>} True if they match, false otherwise.
 */
export async function comparePassword(plaintext, hash) {
  return bcryptjs.compare(plaintext, hash);
}
