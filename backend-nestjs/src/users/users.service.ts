import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';

import {
  DRIZZLE_PROVIDER,
  type DrizzleInstance,
} from '../database/drizzle.provider';

import * as schema from '../database/schema';

import type { User, NewUser } from '../database/schema';
import type {
  CreateUserRequest,
  UpdateUserRequest,
} from './schemas/user.schema'; // Import Zod inferred types
import { eq, ne, and, or } from 'drizzle-orm';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject(DRIZZLE_PROVIDER) private db: DrizzleInstance) {}

  // Use Zod inferred type for input DTO
  async create(createUserDto: CreateUserRequest): Promise<User> {
    this.logger.log(`Attempting to create user: ${createUserDto.userName}`);

    // Check for existing username/email (case-insensitive check in DB is more robust)
    // Example: Using lower() in Drizzle if needed, otherwise rely on DB constraints/indices
    const existingUser = await this.db.query.users.findFirst({
      where: or(
        // Case-insensitive check for username
        eq(
          schema.lower(schema.users.userName),
          createUserDto.userName.toLowerCase(),
        ),
        // Case-insensitive check for email
        eq(schema.lower(schema.users.email), createUserDto.email.toLowerCase()),
      ),
      columns: { userId: true, userName: true, email: true },
    });

    if (existingUser) {
      console.log(`Existing user found: ${JSON.stringify(existingUser)}`);
      if (existingUser.userName === createUserDto.userName) {
        this.logger.warn(`Username conflict: ${createUserDto.userName}`);
        throw new ConflictException(
          `Username '${createUserDto.userName}' already exists.`,
        );
      }
      if (existingUser.email === createUserDto.email) {
        this.logger.warn(`Email conflict: ${createUserDto.email}`);
        throw new ConflictException(
          `Email '${createUserDto.email}' already exists.`,
        );
      }
    }

    try {
      // Map Zod DTO to Drizzle NewUser type
      const newUser: NewUser = {
        userName: createUserDto.userName,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        email: createUserDto.email,
        userStatus: createUserDto.userStatus,
        department: createUserDto.department, // Handles null/undefined correctly
        // createdAt/updatedAt are handled by DB defaults/triggers
      };

      const insertedUsers = await this.db
        .insert(schema.users)
        .values(newUser)
        .returning(); // Return the full user object

      if (!insertedUsers || insertedUsers.length === 0) {
        this.logger.error('Failed to insert user, no result returned.');
        throw new InternalServerErrorException('Could not create user.');
      }

      this.logger.log(
        `User created successfully with ID: ${insertedUsers[0].userId}`,
      );
      return insertedUsers[0]; // Return the full DB User entity
    } catch (err: unknown) {
      const error = err as {
        code?: string;
        message?: string;
        stack?: string;
        constraint?: string;
      };

      this.logger.error(
        `Error creating user ${createUserDto.userName}: ${error.code} - ${error.message}`,
        error.stack, // Log stack trace for debugging
      );

      // Handle known DB errors specifically
      if (error?.code === '23505') {
        // PostgreSQL unique violation
        if (error?.constraint === 'users_email_unique') {
          // Use constraint name from migration
          throw new ConflictException(
            `Email '${createUserDto.email}' already exists.`,
          );
        }
        // Add check for username constraint if you add one
        // if (error.constraint === 'users_user_name_unique') {
        //   throw new ConflictException(`Username '${createUserDto.userName}' already exists.`);
        // }
        // Add check for status constraint
        if (error?.constraint === 'user_status_check') {
          throw new BadRequestException(
            `Invalid user status: ${createUserDto.userStatus}. Must be one of 'A', 'I', 'T'.`,
          );
        }
        // Generic unique constraint message if specific one isn't matched
        throw new ConflictException('A unique constraint was violated.');
      }
      if (error?.code === '23514') {
        // Check constraint violation
        if (error?.constraint === 'user_status_check') {
          throw new BadRequestException(
            `Invalid user status: ${createUserDto.userStatus}. Must be one of 'A', 'I', 'T'.`,
          );
        }
        throw new BadRequestException('A data check constraint was violated.');
      }
      // Throw generic server error for other DB issues
      throw new InternalServerErrorException(
        'An unexpected error occurred while creating the user.',
      );
    }
  }

  async findAll(): Promise<User[]> {
    this.logger.log('Fetching all users');
    return await this.db.query.users.findMany({
      orderBy: (users, { asc }) => [asc(users.userId)],
    });
  }

  async findOne(id: number): Promise<User> {
    this.logger.log(`Fetching user with ID: ${id}`);
    if (isNaN(id) || id <= 0) {
      // This check might be redundant if ParseIntPipe is used effectively in controller
      throw new BadRequestException('Invalid User ID provided.');
    }
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.userId, id),
    });

    if (!user) {
      this.logger.warn(`User with ID ${id} not found.`);
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return user;
  }

  // Use Zod inferred type for input DTO
  async update(id: number, updateUserDto: UpdateUserRequest): Promise<User> {
    this.logger.log(`Attempting to update user with ID: ${id}`);
    if (isNaN(id) || id <= 0) {
      throw new BadRequestException('Invalid User ID provided.');
    }

    // If UpdateUserRequest allows partial updates, check if there's anything to update
    if (Object.keys(updateUserDto).length === 0) {
      throw new BadRequestException('No update data provided.');
    }

    // 1. Verify user exists (required before update)
    const currentUser = await this.findOne(id); // Re-use findOne to get NotFoundException if needed

    // 2. Check for conflicts if relevant fields are being updated
    if (
      updateUserDto.userName &&
      currentUser.userName !== updateUserDto.userName
    ) {
      const existing = await this.db.query.users.findFirst({
        where: and(
          eq(schema.users.userName, updateUserDto.userName),
          ne(schema.users.userId, id),
        ),
        columns: { userId: true },
      });
      if (existing)
        throw new ConflictException(
          `Username '${updateUserDto.userName}' already exists.`,
        );
    }
    if (updateUserDto.email && currentUser.email !== updateUserDto.email) {
      const existing = await this.db.query.users.findFirst({
        where: and(
          eq(schema.users.email, updateUserDto.email),
          ne(schema.users.userId, id),
        ),
        columns: { userId: true },
      });
      if (existing)
        throw new ConflictException(
          `Email '${updateUserDto.email}' already exists.`,
        );
    }

    try {
      // Drizzle handles partial updates automatically if you pass an object
      // with only the fields to update. Zod's .partial() ensures the DTO type matches this.
      const updateData: Partial<NewUser> = {
        ...updateUserDto,
        // Explicitly set updatedAt via $onUpdate in schema - Drizzle handles this
      };

      const updatedUsers = await this.db
        .update(schema.users)
        .set(updateData) // Pass the validated DTO directly (or a mapped version)
        .where(eq(schema.users.userId, id))
        .returning();

      if (!updatedUsers || updatedUsers.length === 0) {
        // Should be caught by findOne earlier, but acts as a safeguard
        this.logger.warn(
          `User with ID ${id} not found during update execution.`,
        );
        throw new NotFoundException(`User with ID ${id} not found.`);
      }

      this.logger.log(`User with ID ${id} updated successfully.`);
      return updatedUsers[0]; // Return the updated DB User entity
    } catch (err: unknown) {
      const error = err as {
        code?: string;
        message?: string;
        stack?: string;
        constraint?: string;
      };

      this.logger.error(
        `Error updating user ${id}: ${error?.code} - ${error.message}`,
        error.stack,
      );
      // Handle known DB errors specifically
      if (error?.code === '23505') {
        // Unique violation
        if (error?.constraint === 'users_email_unique')
          throw new ConflictException(
            `Email '${updateUserDto.email}' already exists.`,
          );
        // if (error.constraint === 'users_user_name_unique') throw new ConflictException(`Username '${updateUserDto.userName}' already exists.`);
        if (error?.constraint === 'user_status_check')
          throw new BadRequestException(
            `Invalid user status: ${updateUserDto.userStatus}. Must be 'A', 'I', or 'T'.`,
          );
        throw new ConflictException(
          'A unique constraint was violated during update.',
        );
      }
      if (error?.code === '23514') {
        // Check constraint violation
        if (error.constraint === 'user_status_check')
          throw new BadRequestException(
            `Invalid user status: ${updateUserDto.userStatus}. Must be 'A', 'I', or 'T'.`,
          );
        throw new BadRequestException(
          'A data check constraint was violated during update.',
        );
      }
      throw new InternalServerErrorException(
        'An unexpected error occurred while updating the user.',
      );
    }
  }

  async remove(id: number): Promise<void> {
    this.logger.log(`Attempting to delete user with ID: ${id}`);
    if (isNaN(id) || id <= 0) {
      throw new BadRequestException('Invalid User ID provided.');
    }

    // Use returning() to check if a row was actually deleted
    const result = await this.db
      .delete(schema.users)
      .where(eq(schema.users.userId, id))
      .returning({ deletedId: schema.users.userId });

    if (result.length === 0) {
      this.logger.warn(`User with ID ${id} not found for deletion.`);
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    this.logger.log(`User with ID ${id} deleted successfully.`);
  }
}
