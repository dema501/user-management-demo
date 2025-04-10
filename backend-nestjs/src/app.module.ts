import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';

import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';

// Define the Zod schema for environment variables
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('/api/v1'),
  DSN: z.string().url(),
  RATE_LIMIT: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // It will look for ".env.{NODE_ENV}" first, then ".env"
      // Variables in .env.test will override those in .env.
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validate: (config) => {
        try {
          return envSchema.parse(config);
        } catch (error: unknown) {
          // Throw a more informative error message
          if (error instanceof z.ZodError) {
            throw new Error(
              `Environment variable validation failed:\n${error.errors
                .map(
                  (e) =>
                    `- ${e.path.join('.')}: ${e.message} (received: ${config[e.path[0]]})`,
                )
                .join('\n')}`,
            );
          }
          throw error;
        }
      },
    }),
    DatabaseModule,
    UsersModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
