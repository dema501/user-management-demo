import { describe, beforeEach, test, expect, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing'; // Import Test and TestingModule
import { sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import type { QueryResult } from 'pg';

import {
  DRIZZLE_PROVIDER,
  type DrizzleInstance,
} from '../database/drizzle.provider';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  // Create a mock result that matches the expected return type
  const mockQueryResult = {} as QueryResult;

  // Create a partial mock of DrizzleInstance with just the execute method we need
  // Then use a type assertion with unknown as an intermediate step
  const createMockDrizzle = () => {
    // Create a minimum viable mock object with just the methods we use
    const mockDb = {
      execute: mock(() => Promise.resolve(mockQueryResult)),
    };

    // Use a double cast to bypass type checking since we're only using execute in the tests
    return mockDb as unknown as DrizzleInstance;
  };

  // Define a more accurate mock type or use Partial if sufficient
  // Since we only mock 'execute', Partial is okay here.
  const mockDb = createMockDrizzle();

  // Mock Config Service with proper return type
  const mockConfigService = {
    get: mock((key: string, defaultValue?: string): string | undefined => {
      if (key === 'NODE_ENV') return 'test';
      if (key === 'DSN') return 'mock_db_url';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    // Reset mocks
    (mockDb.execute as ReturnType<typeof mock>).mockReset();
    mockConfigService.get.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DRIZZLE_PROVIDER,
          useValue: mockDb,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  test('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatus', () => {
    test('should return OK status when DB connection is successful', async () => {
      // Use arrow function to avoid unbound method error
      (mockDb.execute as ReturnType<typeof mock>).mockImplementation(() =>
        Promise.resolve(mockQueryResult),
      );
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      });

      const result = await controller.getStatus();

      // Disable eslint rule for this line since we know it's safe in a test context
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockDb.execute).toHaveBeenCalledWith(sql`SELECT 1`);

      expect(result.status).toBe('OK');
      expect(result.db_status).toBe('OK');
      expect(result.environment).toBe('test');
      expect(result.uptime).toMatch(/\d+m \d+s/); // Check format roughly
      expect(result.mem_usage).toMatch(/[\d.]+ MiB/); // Check format roughly
    });

    test('should return FAIL db_status when DB connection fails', async () => {
      const dbError = new Error('DB Connection Error');

      // Use arrow function to avoid unbound method error
      (mockDb.execute as ReturnType<typeof mock>).mockImplementation(() =>
        Promise.reject(dbError),
      );
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      const result = await controller.getStatus();

      // Disable eslint rule for this line since we know it's safe in a test context
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockDb.execute).toHaveBeenCalledWith(sql`SELECT 1`);
      expect(result.status).toBe('OK');
      expect(result.db_status).toBe('FAIL');
      expect(result.environment).toBe('development');
    });

    test('should correctly report uptime', async () => {
      (mockDb.execute as ReturnType<typeof mock>).mockImplementation(() =>
        Promise.resolve(mockQueryResult),
      );

      // Use more explicit typing for the Date handling
      // Define the startTime explicitly with proper typing
      const startTime = new Date();

      // Mock the private property on the controller
      // Using a safer casting approach to avoid unsafe member access
      Object.defineProperty(controller, 'startTime', {
        value: startTime,
        writable: true,
      });

      // Create the future time with safe operations
      const futureTimeMs = startTime.getTime() + 1000 * 65; // 1m 5s later
      const futureTime = new Date(futureTimeMs);

      // Type-safe way to mock system time in Bun
      const originalDateNow = Date.now;
      Date.now = () => futureTime.getTime();

      const result = await controller.getStatus();
      expect(result.uptime).toBe('1m 5s');

      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });
});
