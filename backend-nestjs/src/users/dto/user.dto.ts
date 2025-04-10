import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import {
  UserResponseSchema,
  UserStatusSchema,
} from '../schemas/user.schema.js';
import type { User } from '../../database/schema.js'; // Import DB type

// Infer type from Zod response schema
export type UserDtoType = z.infer<typeof UserResponseSchema>;

// DTO for API responses
export class UserDto implements UserDtoType {
  @ApiProperty({ example: 1, description: 'Unique user ID' })
  userId: number;

  @ApiProperty({ example: 'johndoe' })
  userName: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ enum: UserStatusSchema.enum, example: 'A' })
  userStatus: 'A' | 'I' | 'T'; // Use literal type

  @ApiPropertyOptional({ example: 'Engineering', nullable: true })
  department: string | null; // Match Zod/DB (nullable)

  @ApiProperty({
    example: '2023-10-27T10:00:00.000Z',
    type: String,
    format: 'date-time',
  }) // Specify type for Swagger
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-27T11:00:00.000Z',
    type: String,
    format: 'date-time',
  }) // Specify type for Swagger
  updatedAt: Date;

  // Static factory method for easy mapping from DB entity
  // Ensures the returned object conforms to the DTO structure/type
  static fromEntity(entity: User): UserDto {
    // Optionally validate the entity against the Zod schema before mapping
    // SelectUserSchema.parse(entity); // Uncomment for strict validation

    // Manual mapping (safer if entity structure might differ slightly)
    const dto = new UserDto();
    dto.userId = entity.userId;
    dto.userName = entity.userName;
    dto.firstName = entity.firstName;
    dto.lastName = entity.lastName;
    dto.email = entity.email;
    dto.userStatus = entity.userStatus as 'A' | 'I' | 'T'; // Cast based on DB constraint/schema
    dto.department = entity.department; // Assumes type match (string | null)
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;

    // Or return the entity directly if it perfectly matches UserDtoType and class-transformer is setup
    // return entity as UserDto;
  }
}
