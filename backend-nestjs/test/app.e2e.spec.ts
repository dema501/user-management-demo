import { describe, beforeAll, afterAll, test, expect } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest'; // Use supertest directly
import * as express from 'express';
import { AppModule } from './../src/app.module';
import { StatusResponse } from './../src/health/health.controller';
import { CreateUserDto } from './../src/users/dto/create-user.dto';

import { UserDto } from './../src/users/dto/user.dto';
import { UpdateUserDto } from './../src/users/dto/update-user.dto';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let apiPrefix: string;
  let httpServer: express.Application;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    configService = moduleFixture.get<ConfigService>(ConfigService);
    apiPrefix = configService.get<string>('API_PREFIX', '/api/v1');

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(apiPrefix);
    // It's good practice to apply global pipes used in production here too
    // app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); // Example if using class-validator pipes
    // For Zod, pipes are applied per-route, so we test their effect implicitly.

    await app.init();
    httpServer = app.getHttpServer() as express.Application;
  });

  afterAll(async () => {
    await app.close();
  });

  test('/ (GET) should redirect to docs', async () => {
    await request(httpServer)
      .get(apiPrefix)
      .expect(301) // Expect redirect status
      .expect('Location', `${apiPrefix}/docs`); // Expect redirect location
  });

  test('APIPrefix/status (GET) should return API status information', async () => {
    const response = await request(httpServer)
      .get(`${apiPrefix}/status`)
      .expect('Content-Type', /json/)
      .expect(200);

    const body = response.body as StatusResponse;

    expect(body).toBeInstanceOf(Object);
    expect(body.status).toBe('OK');
    // Assuming DB connection works in test env
    expect(body.db_status).toBe('OK');
    expect(body.environment).toBe('test'); // Ensure NODE_ENV=test is used for tests
    expect(body.uptime).toMatch(/^(\d+h )?\d+m \d+s$/);
    expect(body.mem_usage).toMatch(/^[\d.]+ MiB$/);
  });
});

// Add a new describe block for Users E2E tests
describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let apiPrefix: string;
  let httpServer: express.Application;
  let createdUserId: number; // To store the ID of the user created in tests

  // User data for tests
  const baseUser: CreateUserDto = {
    userName: 'e2etestuser',
    firstName: 'E2E',
    lastName: 'Tester',
    email: 'e2e.tester@example.com',
    userStatus: 'A',
    department: 'E2E Dept',
  };

  beforeAll(async () => {
    // Re-initialize app or reuse if possible (depends on test isolation needs)
    // For simplicity, let's re-init here, ensure a clean state if needed
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    configService = moduleFixture.get<ConfigService>(ConfigService);
    apiPrefix = configService.get<string>('API_PREFIX', '/api/v1');

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(apiPrefix);
    // Apply Zod pipes globally if that's the intended pattern,
    // otherwise rely on controller-level application.
    // We test controller-level application implicitly.

    await app.init();
    httpServer = app.getHttpServer() as express.Application;

    // Clean up potential leftovers from previous runs (optional but recommended)
    // This assumes your test DB allows direct manipulation or you have a cleanup endpoint
    // Example: Find user by email and delete if exists
    const findResponse = await request(httpServer).get(`${apiPrefix}/users`);
    if (findResponse.ok) {
      const users = findResponse.body as UserDto[];
      const existing = users.find((u) => u.email === baseUser.email);
      if (existing) {
        await request(httpServer).delete(
          `${apiPrefix}/users/${existing.userId}`,
        );
      }
    }
  });

  afterAll(async () => {
    // Clean up the created user if it exists
    if (createdUserId) {
      await request(httpServer).delete(`${apiPrefix}/users/${createdUserId}`);
    }
    await app.close();
  });

  // --- CRUD Tests ---

  test('APIPrefix/users (POST) - should create a new user', async () => {
    const response = await request(httpServer)
      .post(`${apiPrefix}/users`)
      .set('Content-Type', 'application/json')
      .send(baseUser)
      .expect('Content-Type', /json/)
      .expect(201); // Expect HTTP 201 Created

    const body = response.body as UserDto;

    expect(body).toBeInstanceOf(Object);
    expect(body.userId).toBeGreaterThan(0);
    expect(body.userName).toBe(baseUser.userName);
    expect(body.email).toBe(baseUser.email);
    expect(body.userStatus).toBe(baseUser.userStatus);
    expect(body.department as string).toBe(baseUser.department as string);
    expect(body.createdAt).toBeString(); // Check if it's a date string
    expect(body.updatedAt).toBeString();

    createdUserId = body.userId; // Store ID for later tests
  });

  test('APIPrefix/users (POST) - should fail to create user with duplicate email', async () => {
    await request(httpServer)
      .post(`${apiPrefix}/users`)
      .set('Content-Type', 'application/json')
      .send(baseUser)
      .expect('Content-Type', /json/)
      .expect(409); // Expect HTTP 409 Conflict
  });

  test('APIPrefix/users (POST) - should fail with invalid data (missing username)', async () => {
    const invalidUser = { ...baseUser };
    // @ts-expect-error Testing invalid input
    delete invalidUser.userName;

    const response = await request(httpServer)
      .post(`${apiPrefix}/users`)
      .send(invalidUser)
      .expect('Content-Type', /json/)
      .expect(400); // Expect HTTP 400 Bad Request

    const body = response.body as {
      message?: string;
      stack?: string;
      constraint?: string;
      errors?: {
        userName?: string[];
      };
    };

    expect(body.message).toContain('Validation failed');
    expect(body.errors?.userName).toBeArray(); // Check Zod error format
  });

  test('APIPrefix/users (GET) - should return a list of users (including the created one)', async () => {
    const response = await request(httpServer)
      .get(`${apiPrefix}/users`)
      .expect('Content-Type', /json/)
      .expect(200);

    const users = response.body as UserDto[];
    expect(users).toBeArray();
    expect(users.length).toBeGreaterThanOrEqual(1);

    const foundUser = users.find((u) => u.userId === createdUserId);
    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe(baseUser.email);
  });

  test('APIPrefix/users/:id (GET) - should return the specific created user', async () => {
    expect(createdUserId).toBeDefined(); // Ensure user was created

    const response = await request(httpServer)
      .get(`${apiPrefix}/users/${createdUserId}`)
      .expect('Content-Type', /json/)
      .expect(200);

    const user = response.body as UserDto;
    expect(user.userId).toBe(createdUserId);
    expect(user.email).toBe(baseUser.email);
  });

  test('APIPrefix/users/:id (GET) - should return 404 for non-existent user', async () => {
    await request(httpServer)
      .get(`${apiPrefix}/users/999999`) // Use a likely non-existent ID
      .expect('Content-Type', /json/)
      .expect(404);
  });

  test('APIPrefix/users/:id (GET) - should return 400 for invalid ID format', async () => {
    await request(httpServer)
      .get(`${apiPrefix}/users/abc`) // Invalid format
      .expect('Content-Type', /json/)
      .expect(400); // ParseIntPipe fails

    await request(httpServer)
      .get(`${apiPrefix}/users/0`) // Controller validation
      .expect('Content-Type', /json/)
      .expect(400);
  });

  test('APIPrefix/users/:id (PUT) - should update the user', async () => {
    expect(createdUserId).toBeDefined();

    const updateData: UpdateUserDto = {
      firstName: 'UpdatedE2E',
      department: null, // Test setting to null
      userStatus: 'I',
    };

    const response = await request(httpServer)
      .put(`${apiPrefix}/users/${createdUserId}`)
      .send(updateData)
      .expect('Content-Type', /json/)
      .expect(200);

    const updatedUser = response.body as UserDto;
    expect(updatedUser.userId).toBe(createdUserId);
    expect(updatedUser.firstName).toBe(updateData.firstName as string);
    expect(updatedUser.department).toBeNull(); // Check null update
    expect(updatedUser.userStatus).toBe(
      updateData.userStatus as 'A' | 'I' | 'T',
    );
  });

  test('APIPrefix/users/:id (PUT) - should return 404 for non-existent user', async () => {
    await request(httpServer)
      .put(`${apiPrefix}/users/999999`)
      .set('Content-Type', 'application/json')
      .send(baseUser)
      .expect('Content-Type', /json/)
      .expect(404);
  });

  test('APIPrefix/users/:id (PUT) - should return 400 for invalid update data', async () => {
    expect(createdUserId).toBeDefined();
    await request(httpServer)
      .put(`${apiPrefix}/users/${createdUserId}`)
      .send({ userStatus: 'X' }) // Invalid status
      .expect('Content-Type', /json/)
      .expect(400);
  });

  // Optional: Add PUT conflict test if feasible (requires another user)

  test('APIPrefix/users/:id (DELETE) - should delete the user', async () => {
    expect(createdUserId).toBeDefined();

    await request(httpServer)
      .delete(`${apiPrefix}/users/${createdUserId}`)
      .expect(202); // Expect HTTP 202 Accepted

    // Verify deletion by trying to GET the user again
    await request(httpServer)
      .get(`${apiPrefix}/users/${createdUserId}`)
      .expect(404);

    // Mark as deleted so afterAll doesn't try again
    const deletedId = createdUserId;
    createdUserId = 0; // Resetting like this is a simple way

    // Try deleting again, should be 404
    await request(httpServer)
      .delete(`${apiPrefix}/users/${deletedId}`)
      .expect(404);
  });

  test('APIPrefix/users/:id (DELETE) - should return 404 for non-existent user', async () => {
    await request(httpServer)
      .delete(`${apiPrefix}/users/999999`)
      .expect('Content-Type', /json/)
      .expect(404);
  });

  test('APIPrefix/users/:id (DELETE) - should return 400 for invalid ID format', async () => {
    await request(httpServer)
      .delete(`${apiPrefix}/users/abc`)
      .expect('Content-Type', /json/)
      .expect(400);
  });
});
