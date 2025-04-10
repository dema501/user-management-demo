import { describe, test, expect } from 'bun:test';
import {
  UserStatusSchema,
  SelectUserSchema,
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  UserIdParamSchema,
} from './user.schema';

describe('User Schemas', () => {
  describe('UserStatusSchema', () => {
    test('should validate valid status values', () => {
      expect(UserStatusSchema.safeParse('A').success).toBe(true);
      expect(UserStatusSchema.safeParse('I').success).toBe(true);
      expect(UserStatusSchema.safeParse('T').success).toBe(true);
    });

    test('should reject invalid status values', () => {
      expect(UserStatusSchema.safeParse('X').success).toBe(false);
      expect(UserStatusSchema.safeParse('').success).toBe(false);
      expect(UserStatusSchema.safeParse(null).success).toBe(false);
    });
  });

  describe('CreateUserRequestSchema', () => {
    test('should validate a valid user creation request', () => {
      const validUser = {
        userName: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        userStatus: 'A',
        department: 'Engineering',
      };

      const result = CreateUserRequestSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    test('should validate a valid user with null department', () => {
      const validUser = {
        userName: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        userStatus: 'A',
        department: null,
      };

      const result = CreateUserRequestSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    test('should validate a valid user without department', () => {
      const validUser = {
        userName: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        userStatus: 'A',
      };

      const result = CreateUserRequestSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    test('should reject a user with invalid username format', () => {
      const invalidUser = {
        userName: 'john-doe', // Contains non-alphanumeric character
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        userStatus: 'A',
        department: 'Engineering',
      };

      const result = CreateUserRequestSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('alphanumeric');
      }
    });

    test('should reject a user with short username', () => {
      const invalidUser = {
        userName: 'jd', // Too short
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        userStatus: 'A',
        department: 'Engineering',
      };

      const result = CreateUserRequestSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'at least 4 characters',
        );
      }
    });

    test('should reject a user with invalid email', () => {
      const invalidUser = {
        userName: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'not-an-email',
        userStatus: 'A',
        department: 'Engineering',
      };

      const result = CreateUserRequestSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    test('should reject a user with invalid status', () => {
      const invalidUser = {
        userName: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        userStatus: 'X', // Invalid status
        department: 'Engineering',
      };

      const result = CreateUserRequestSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('userStatus');
      }
    });

    test('should reject when required fields are missing', () => {
      const invalidUser = {
        userName: 'johndoe',
        // firstName missing
        lastName: 'Doe',
        email: 'john.doe@example.com',
        userStatus: 'A',
      };

      const result = CreateUserRequestSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateUserRequestSchema', () => {
    test('should validate a complete user update', () => {
      const validUpdate = {
        userName: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        userStatus: 'A',
        department: 'Engineering',
      };

      const result = UpdateUserRequestSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    test('should validate a partial user update', () => {
      const partialUpdate = {
        firstName: 'Johnny',
        lastName: 'Doeson',
      };

      const result = UpdateUserRequestSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    test('should validate a single field update', () => {
      const singleFieldUpdate = {
        department: 'Sales',
      };

      const result = UpdateUserRequestSchema.safeParse(singleFieldUpdate);
      expect(result.success).toBe(true);
    });

    test('should reject an update with invalid field values', () => {
      const invalidUpdate = {
        email: 'not-an-email',
      };

      const result = UpdateUserRequestSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('UserIdParamSchema', () => {
    test('should validate a valid numeric ID', () => {
      const validId = { id: 123 };
      const result = UserIdParamSchema.safeParse(validId);
      expect(result.success).toBe(true);
    });

    test('should validate a numeric string ID and coerce to number', () => {
      const validId = { id: '123' };
      const result = UserIdParamSchema.safeParse(validId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.id).toBe('number');
        expect(result.data.id).toBe(123);
      }
    });

    test('should reject a negative ID', () => {
      const invalidId = { id: -1 };
      const result = UserIdParamSchema.safeParse(invalidId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('positive');
      }
    });

    test('should reject a non-numeric ID', () => {
      const invalidId = { id: 'abc' };
      const result = UserIdParamSchema.safeParse(invalidId);
      expect(result.success).toBe(false);
    });

    test('should reject a floating point ID', () => {
      const invalidId = { id: 1.5 };
      const result = UserIdParamSchema.safeParse(invalidId);
      expect(result.success).toBe(false);
    });
  });

  describe('SelectUserSchema', () => {
    test('should validate a complete user from database', () => {
      const dbUser = {
        userId: 1,
        userName: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        userStatus: 'A',
        department: 'Engineering',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = SelectUserSchema.safeParse(dbUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt instanceof Date).toBe(true);
        expect(result.data.updatedAt instanceof Date).toBe(true);
      }
    });

    test('should coerce string dates to Date objects', () => {
      const dbUser = {
        userId: 1,
        userName: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        userStatus: 'A',
        department: 'Engineering',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
      };

      const result = SelectUserSchema.safeParse(dbUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt instanceof Date).toBe(true);
        expect(result.data.updatedAt instanceof Date).toBe(true);
      }
    });

    test('should coerce string IDs to numbers', () => {
      const dbUser = {
        userId: '1', // String ID should be coerced to number
        userName: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        userStatus: 'A',
        department: 'Engineering',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = SelectUserSchema.safeParse(dbUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.userId).toBe('number');
      }
    });
  });
});
