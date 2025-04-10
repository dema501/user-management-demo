import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '../../database/schema'; // Import Drizzle schema

// Define UserStatus enum using Zod
export const UserStatusSchema = z.enum(['A', 'I', 'T']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

// Base schema using Drizzle-Zod for fields present in the DB table
// Select schema represents the data returned from the DB
export const SelectUserSchema = createSelectSchema(users, {
  // Customize types or add refinements if needed
  userId: z.coerce.number().int().positive(), // Coerce from potential string/serial
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userStatus: UserStatusSchema, // Use our specific enum schema
});

// Insert schema represents data needed for creation (usually fewer fields)
// Drizzle-zod automatically omits defaults like 'userId', 'createdAt', 'updatedAt'
export const InsertUserSchema = createInsertSchema(users, {
  // Override or refine specific fields for insertion validation
  userName: z
    .string()
    .min(4, { message: 'Username must be at least 4 characters long' })
    .max(255)
    .regex(/^[a-zA-Z0-9]+$/, {
      message: 'Username must be alphanumeric',
    }),
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email().max(255),
  userStatus: UserStatusSchema, // Ensure status is one of the allowed values
  department: z.string().max(255).optional().nullable(), // Allow null or undefined
});

// --- Request Schemas ---

// Schema for the request body when creating a user
// It aligns closely with InsertUserSchema but defined explicitly for clarity
export const CreateUserRequestSchema = InsertUserSchema.pick({
  userName: true,
  firstName: true,
  lastName: true,
  email: true,
  userStatus: true,
  department: true,
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

// Schema for the request body when updating a user
// Often updates allow partial data. Use .partial() if desired.
// If all fields MUST be provided on update, use InsertUserSchema.pick({...}) similar to create
export const UpdateUserRequestSchema = CreateUserRequestSchema.partial(); // Allow partial updates
// If full update required:
// export const UpdateUserRequestSchema = CreateUserRequestSchema;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

// --- Param Schemas ---
export const UserIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive({ message: 'User ID must be a positive integer' }),
});
export type UserIdParam = z.infer<typeof UserIdParamSchema>;

// --- Response Schemas (Optional but good practice) ---
// Use the SelectUserSchema for responses
export const UserResponseSchema = SelectUserSchema;
export type UserResponse = z.infer<typeof UserResponseSchema>;

// For lists
export const UserListResponseSchema = z.array(UserResponseSchema);
export type UserListResponse = z.infer<typeof UserListResponseSchema>;
