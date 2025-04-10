import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';

import {
  DRIZZLE_PROVIDER,
  type DrizzleInstance,
} from '../database/drizzle.provider';

// Define the expected response type
export interface StatusResponse {
  status: string;
  db_status: string;
  environment: string;
  uptime: string;
  mem_usage: string;
}

@ApiTags('Health')
@Controller('status')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime = new Date();

  constructor(
    @Inject(DRIZZLE_PROVIDER) private db: DrizzleInstance,
    private configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get API status and basic health info' })
  @ApiOkResponse({
    description: 'API Status Information',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'OK' },
        db_status: { type: 'string', example: 'OK', enum: ['OK', 'FAIL'] },
        uptime: { type: 'string', example: '1h 5m 30s' },
        mem_usage: { type: 'string', example: '50.5 MiB' },
        environment: { type: 'string', example: 'development' },
      },
    },
  })
  async getStatus() {
    let dbStatus = 'OK';
    let dbError = null;

    try {
      // Attempt to execute a simple query to check DB connectivity
      await this.db.execute(sql`SELECT 1`);
      this.logger.debug('Database connection check successful.');
      // dbStatus remains 'OK' by default
    } catch (error: unknown) {
      dbStatus = 'FAIL'; // Set status to FAIL on any error
      this.logger.error('Database connection check failed:', error);

      // Type guard to safely access error message
      if (error instanceof Error) {
        dbError = error.message; // Store the specific error message if it's an Error instance
      } else {
        dbError = String(error); // Store the string representation of the error
      }
    }

    const uptimeMs = Date.now() - this.startTime.getTime();
    const totalSeconds = Math.floor(uptimeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const uptimeString = `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;

    const memoryUsage = process.memoryUsage();
    const memUsageMb = (memoryUsage.rss / (1024 * 1024)).toFixed(1);
    const environment = this.configService.get<string>('NODE_ENV', 'unknown');

    const response: StatusResponse = {
      status: 'OK',
      db_status: dbStatus,
      uptime: uptimeString,
      mem_usage: `${memUsageMb} MiB`,
      environment: environment,
    };

    if (dbError && environment !== 'production') {
      this.logger.warn(`DB Error details (not in response): ${dbError}`);
    }

    return response;
  }
}
