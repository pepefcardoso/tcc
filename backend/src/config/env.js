import 'dotenv/config'; // Ensure dotenv is loaded before anything else
import { z } from 'zod';

// Define the environment schema based on .env.example
const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    PG_POOL_MAX: z.coerce.number().int().positive().default(10),

    // Auth
    JWT_USER_SECRET: z
      .string()
      .min(32, 'JWT_USER_SECRET must be at least 32 characters long'),
    JWT_USER_EXPIRES_IN: z.string().default('8h'),
    JWT_DEVICE_SECRET: z
      .string()
      .min(32, 'JWT_DEVICE_SECRET must be at least 32 characters long'),
    JWT_DEVICE_EXPIRES_IN: z.string().default('3650d'),

    // Upload
    UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(100),
    UPLOAD_TMP_DIR: z.string().default('/tmp/uploads'),

    // Processing
    GPS_BATCH_INSERT_SIZE: z.coerce.number().int().positive().default(500),
    IMU_BATCH_INSERT_SIZE: z.coerce.number().int().positive().default(1000),
  })
  .refine((data) => data.JWT_USER_SECRET !== data.JWT_DEVICE_SECRET, {
    message: 'JWT_USER_SECRET and JWT_DEVICE_SECRET must be different',
    path: ['JWT_DEVICE_SECRET'], // Attach the error to JWT_DEVICE_SECRET
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
    
    // Throw an error rather than exit directly to allow testing,
    // we'll handle the exit in the singleton initialization
    const error = new Error(errorMessage);
    error.isConfigError = true;
    throw error;
  }

  return result.data;
}

// Singleton for the app
let env;

try {
  env = validate(process.env);
} catch (error) {
  // During unit tests, we don't want to crash the process on import
  // if process.env isn't fully mocked yet.
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
