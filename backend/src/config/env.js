import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    PG_POOL_MAX: z.coerce.number().int().positive().default(10),

    // Auth
    JWT_USER_SECRET: z.string().min(32, 'JWT_USER_SECRET must be at least 32 characters long'),
    JWT_USER_EXPIRES_IN: z.string().default('8h'),
    JWT_DEVICE_SECRET: z.string().min(32, 'JWT_DEVICE_SECRET must be at least 32 characters long'),
    JWT_DEVICE_EXPIRES_IN: z.string().default('3650d'),

    // Upload
    UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(100),
    UPLOAD_TMP_DIR: z.string().default('/tmp/uploads'),

    // Processing
    GPS_BATCH_INSERT_SIZE: z.coerce.number().int().positive().default(500),
    IMU_BATCH_INSERT_SIZE: z.coerce.number().int().positive().default(1000),

    // Rate Limiting
    RATE_LIMIT_LOGIN_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(10),
    RATE_LIMIT_UPLOAD_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_UPLOAD_MAX: z.coerce.number().int().positive().default(30),

    // Security
    CORS_ALLOWED_ORIGIN: z.string().url('CORS_ALLOWED_ORIGIN must be a valid URL').default('http://localhost:5173'),
  })
  .refine((data) => data.JWT_USER_SECRET !== data.JWT_DEVICE_SECRET, {
    message: 'JWT_USER_SECRET and JWT_DEVICE_SECRET must be different',
    path: ['JWT_DEVICE_SECRET'],
  });

/**
 * Validates a raw environment object against the schema.
 * Exported for testing purposes.
 * @param {Record<string, string | undefined>} rawEnv - The raw environment variables
 * @returns {z.infer<typeof envSchema>} The parsed and validated environment
 * @throws {Error} if validation fails
 */
export function validate(rawEnv) {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    let errorMessage = '[env] Configuration error — the app cannot start:\n';
    for (const error of result.error.issues) {
      errorMessage += `  ✖ ${error.path.join('.')}: ${error.message}\n`;
    }

    const error = new Error(errorMessage);
    error.isConfigError = true;
    throw error;
  }

  return result.data;
}

let env;

try {
  env = validate(process.env);
} catch (error) {
  if (process.env.NODE_ENV !== 'test') {
    if (error.isConfigError) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

export { env };
