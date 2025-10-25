import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

// Define the environment schema with Zod validation
const envSchema = z.object({
  PORT: z
    .string()
    .optional()
    .default('4000')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'PORT must be a positive number',
    }),
  JWT_SECRET: z.string().min(16, { message: 'JWT_SECRET must be at least 16 characters long' }),
  DATABASE_URL: z
    .string()
    .refine((val) => val.startsWith('postgres://') || val.startsWith('postgresql://'), {
      message: 'DATABASE_URL must start with postgres:// or postgresql://',
    }),
  REDIS_URL: z.string().optional(),
  CACHE_DEFAULT_TTL: z
    .string()
    .optional()
    .default('60')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'CACHE_DEFAULT_TTL must be a positive number',
    }),
  RATE_LIMIT_PER_MIN: z
    .string()
    .optional()
    .default('60')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'RATE_LIMIT_PER_MIN must be a positive number',
    }),
  ETHERSCAN_API_KEY: z.string().min(1, { message: 'ETHERSCAN_API_KEY is required' }),
});

// Parse and validate environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

// Export the validated environment configuration
export const env = parsedEnv.data;

// Log non-secret configuration on startup
console.log('✓ Environment configuration loaded');
console.log(`  PORT: ${env.PORT}`);
const dbUrlParts = env.DATABASE_URL.split('@');
console.log(`  DATABASE_URL: ${dbUrlParts.length > 1 ? dbUrlParts[1] : '[configured]'}`);
console.log(`  REDIS_URL: ${env.REDIS_URL ? '[configured]' : '[not set]'}`);
console.log(`  ETHERSCAN_API_KEY: [configured]`);
console.log(`  JWT_SECRET: [configured]`);
