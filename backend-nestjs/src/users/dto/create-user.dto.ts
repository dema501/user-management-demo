import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import {
  CreateUserRequestSchema,
  UserStatusSchema,
} from '../schemas/user.schema.js'; // Use Zod schema

// Infer type from Zod schema
export type CreateUserDtoType = z.infer<typeof CreateUserRequestSchema>;

// Class for Swagger documentation, implementing the inferred type
export class CreateUserDto implements CreateUserDtoType {
  @ApiProperty({
    description:
      'The username for the user. Must be alphanumeric, 4-255 characters.',
    minLength: 4,
    maxLength: 255,
    pattern: '^[a-zA-Z0-9]+$',
    example: 'johndoe',
  })
  userName: string;

  @ApiProperty({
    description: "User's first name.",
    minLength: 1,
    maxLength: 255,
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: "User's last name.",
    minLength: 1,
    maxLength: 255,
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Unique email address for the user.',
    format: 'email',
    maxLength: 255,
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Current status of the user.',
    enum: UserStatusSchema.enum, // Use enum values from Zod schema
    example: 'A', // Use enum value directly
  })
  userStatus: 'A' | 'I' | 'T'; // Use literal type matching Zod enum

  @ApiPropertyOptional({
    description: 'Optional department name.',
    maxLength: 255,
    example: 'Engineering',
    nullable: true, // Indicate it can be null
  })
  department?: string | null; // Match Zod schema (optional, nullable)
}
