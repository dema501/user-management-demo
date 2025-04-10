import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({
  path: `.env`,
});

dotenv.config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
  override: true,
});

if (!process.env.DSN) {
  throw new Error(`DSN is not set. Make sure it's available in .env*`);
}

console.log(`🚀 Drizzle config loaded ${process.env.DSN}`);

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './src/database/migrations',
  dbCredentials: {
    url: process.env.DSN as string,
  },
});
