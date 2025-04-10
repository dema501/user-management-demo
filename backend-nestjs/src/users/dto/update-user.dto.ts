import { ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import {
  UpdateUserRequestSchema,
  UserStatusSchema,
} from '../schemas/user.schema.js';
import { PartialType } from '@nestjs/swagger'; // Use PartialType for Swagger if using .partial() in Zod
import { CreateUserDto } from './create-user.dto.js'; // Import CreateUserDto to derive from

// Infer type from Zod schema
export type UpdateUserDtoType = z.infer<typeof UpdateUserRequestSchema>;

// If using partial updates (UpdateUserRequestSchema = CreateUserRequestSchema.partial()):
// Use Swagger's PartialType to make properties optional in documentation
export class UpdateUserDto
  extends PartialType(CreateUserDto)
  implements UpdateUserDtoType
{
  // Properties are inherited and marked optional by PartialType
  // Add specific overrides if necessary, e.g., different examples
  @ApiPropertyOptional({
    description:
      'The username for the user. Must be alphanumeric, 4-255 characters.',
    minLength: 4,
    maxLength: 255,
    pattern: '^[a-zA-Z0-9]+$',
    example: 'janedoe',
  })
  userName?: string; // Make explicitly optional if not already

  @ApiPropertyOptional({
    description: "User's first name.",
    minLength: 1,
    maxLength: 255,
    example: 'Jane',
  })
  firstName?: string;

  @ApiPropertyOptional({
    description: "User's last name.",
    minLength: 1,
    maxLength: 255,
    example: 'Smith',
  })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Unique email address for the user.',
    format: 'email',
    maxLength: 255,
    example: 'jane.smith@example.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Current status of the user.',
    enum: UserStatusSchema.enum,
    example: 'I',
  })
  userStatus?: 'A' | 'I' | 'T';

  @ApiPropertyOptional({
    description: 'Optional department name.',
    maxLength: 255,
    example: 'Marketing',
    nullable: true,
  })
  department?: string | null;
}

// If using full updates (UpdateUserRequestSchema = CreateUserRequestSchema):
// export class UpdateUserDto extends CreateUserDto implements UpdateUserDtoType {
//   // Inherits all properties and required status from CreateUserDto
//   // Adjust examples if needed
// }
