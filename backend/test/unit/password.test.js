import { jest } from '@jest/globals';
import { hashPassword, comparePassword } from '../../src/utils/password.js';

describe('Password Utility', () => {
  const plaintext = 'my-super-secret-password';

  it('returns a hash string that is not equal to the plaintext', async () => {
    const hash = await hashPassword(plaintext);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash).not.toBe(plaintext);
  });

  it('returns a valid bcrypt hash string', async () => {
    const hash = await hashPassword(plaintext);
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('returns true when comparing matching plaintext and hash', async () => {
    const hash = await hashPassword(plaintext);
    const isValid = await comparePassword(plaintext, hash);
    expect(isValid).toBe(true);
  });

  it('returns false when comparing non-matching plaintext and hash', async () => {
    const hash = await hashPassword(plaintext);
    const isValid = await comparePassword('wrong-password', hash);
    expect(isValid).toBe(false);
  });

  it('generates different hashes for the same plaintext on consecutive calls', async () => {
    const hash1 = await hashPassword(plaintext);
    const hash2 = await hashPassword(plaintext);
    expect(hash1).not.toBe(hash2);
  });
});
