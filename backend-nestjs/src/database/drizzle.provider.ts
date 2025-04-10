import { FactoryProvider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE_PROVIDER = 'DRIZZLE_PROVIDER';

// Define the type for the Drizzle instance more specifically
// It will include all schemas you import
export type DrizzleInstance = NodePgDatabase<typeof schema>;

export const DrizzleProvider: FactoryProvider<Promise<DrizzleInstance>> = {
  provide: DRIZZLE_PROVIDER,
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<DrizzleInstance> => {
    const logger = new Logger('DrizzleProvider');
    const dsn = configService.get<string>('DSN');
    if (!dsn) {
      throw new Error('DSN environment variable is not set');
    }

    logger.log('Initializing database connection pool...');
    const pool = new Pool({
      connectionString: dsn,
      max: configService.get<number>('DB_MAX_CONNECTIONS', 10),
    });

    // Test connection on startup
    try {
      await pool.connect();
      logger.log('Database connection pool established successfully.');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error; // Re-throw error to prevent application startup
    }

    // Pass the schema object to drizzle
    const db = drizzle(pool, {
      schema: schema,
      logger: configService.get<string>('NODE_ENV') !== 'production',
    }); // Enable Drizzle logger in non-prod

    logger.log('Drizzle ORM initialized.');
    return db;
  },
};
