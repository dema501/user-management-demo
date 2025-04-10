import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { eq, or } from 'drizzle-orm';

import { UsersService } from './users.service';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { CreateUserRequest } from './schemas/user.schema';

import * as schema from '../database/schema';
import type { User } from '../database/schema';

import { type DrizzleInstance } from '../database/drizzle.provider';

// Create a partial mock of DrizzleInstance with just the execute method we need
// Then use a type assertion with unknown as an intermediate step
const createMockDrizzle = (
  overrides?: Partial<DrizzleInstance>,
): DrizzleInstance => {
  // Create a minimum viable mock object with just the methods we use
  const base = {
    execute: mock(() => Promise.resolve(null)),
    query: {
      users: {
        findFirst: mock(() => Promise.resolve(null)),
      },
    },
    insert: mock(() => ({
      values: () => ({
        returning: () => Promise.resolve(null),
      }),
    })),
  };

  // Use a double cast to bypass type checking since we're only using execute in the tests
  return {
    ...base,
    ...overrides,
  } as unknown as DrizzleInstance;
};

describe('UsersService.create', () => {
  let service: UsersService;
  let mockDb: DrizzleInstance;

  const userDto: CreateUserRequest = {
    userName: 'johndoe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    userStatus: 'A',
    department: 'Engineering',
  };

  const createdUser = {
    userId: 1,
    ...userDto,
  } as User;

  beforeEach(() => {
    mockDb = createMockDrizzle();

    // Reset all mocks
    (mockDb.query.users.findFirst as ReturnType<typeof mock>).mockReset();
    (mockDb.insert as ReturnType<typeof mock>).mockReset();
    (mockDb.execute as ReturnType<typeof mock>).mockReset();
    service = new UsersService(mockDb);
  });

  it('should create a new user successfully', async () => {
    (
      mockDb.query.users.findFirst as ReturnType<typeof mock>
    ).mockImplementation(() => Promise.resolve(null));

    (mockDb.insert as ReturnType<typeof mock>).mockImplementation(() => ({
      values: () => ({
        returning: () =>
          Promise.resolve([
            {
              userId: 1,
              ...userDto,
            },
          ]),
      }),
    }));

    const result = await service.create(userDto);
    expect(result).toEqual(createdUser);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockDb.query.users.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: or(
          eq(
            schema.lower(schema.users.userName),
            userDto.userName.toLowerCase(),
          ),
          eq(schema.lower(schema.users.email), userDto.email.toLowerCase()),
        ),
      }),
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('should throw ConflictException if username exists', () => {
    (
      mockDb.query.users.findFirst as ReturnType<typeof mock>
    ).mockImplementation(() =>
      Promise.resolve({
        userName: userDto.userName,
        email: 'other@example.com',
      } as User),
    );

    expect(service.create(userDto)).rejects.toThrow(ConflictException);
  });

  it('should throw ConflictException if email exists', () => {
    (
      mockDb.query.users.findFirst as ReturnType<typeof mock>
    ).mockImplementation(() =>
      Promise.resolve({
        userName: 'someoneelse',
        email: userDto.email,
      } as User),
    );

    expect(service.create(userDto)).rejects.toThrow(ConflictException);
  });

  it('should throw InternalServerErrorException if insert returns empty array', () => {
    (mockDb.insert as ReturnType<typeof mock>).mockImplementation(() => ({
      values: () => ({
        returning: () => Promise.resolve([]),
      }),
    }));

    expect(service.create(userDto)).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('should throw ConflictException on unique constraint violation (23505)', () => {
    const dbError = Object.assign(new Error('duplicate key value'), {
      code: '23505',
      constraint: 'users_email_unique',
    });

    (mockDb.insert as ReturnType<typeof mock>).mockImplementation(() => ({
      values: () => ({
        returning: () => Promise.reject(dbError),
      }),
    }));

    expect(service.create(userDto)).rejects.toThrow(ConflictException);
  });
});
