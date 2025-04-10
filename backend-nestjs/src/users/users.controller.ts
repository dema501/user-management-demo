import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UsePipes,
  Logger,
  BadRequestException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiAcceptedResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'; // Import Zod pipe
// Import Zod schemas
import {
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  UserIdParamSchema,
  type UserIdParam,
} from './schemas/user.schema';

@ApiTags('Users')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post()
  // Apply Zod validation pipe for the request body
  @UsePipes(new ZodValidationPipe(CreateUserRequestSchema))
  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedResponse({
    description: 'User created successfully.',
    type: UserDto, // Use Response DTO for Swagger
  })
  @ApiBadRequestResponse({
    description: 'Validation failed (invalid request body).',
  })
  @ApiConflictResponse({ description: 'Username or Email already exists.' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    // createUserDto here is validated and potentially transformed by ZodValidationPipe
    // Type hint CreateUserDto is mainly for controller method signature clarity & Swagger
    this.logger.log(
      `Received request to create user: ${createUserDto.userName}`,
    );
    try {
      const newUser = await this.usersService.create(createUserDto);
      return UserDto.fromEntity(newUser); // Map DB entity to Response DTO
    } catch (error: unknown) {
      const context = `Error in POST /users`;

      if (error instanceof Error) {
        this.logger.error(`${context}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`${context}: ${String(error)}`);
      }

      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiOkResponse({ description: 'List of all users.', type: [UserDto] })
  async findAll(): Promise<UserDto[]> {
    this.logger.log('Received request to list all users');
    const users = await this.usersService.findAll();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    return users.map(UserDto.fromEntity); // Map each entity
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific user by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user to retrieve',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({ description: 'User details found.', type: UserDto })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiBadRequestResponse({
    description: 'Invalid ID format (must be a positive integer).',
  })
  async findOne(
    @Param(new ZodValidationPipe(UserIdParamSchema)) params: UserIdParam,
  ): Promise<UserDto> {
    const { id } = params;

    this.logger.log(`Received request to get user by ID: ${id}`);
    // ID is validated by ParseIntPipe to be a number. Zod schema ensures positive int.
    if (id <= 0) {
      throw new BadRequestException('User ID must be a positive integer.');
    }
    try {
      const user = await this.usersService.findOne(id);
      return UserDto.fromEntity(user);
    } catch (error: unknown) {
      const context = `Error in GET /users/${id}`;

      if (error instanceof Error) {
        this.logger.error(`${context}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`${context}: ${String(error)}`);
      }

      throw error;
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user to update',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({ description: 'User updated successfully.', type: UserDto })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiBadRequestResponse({
    description:
      'Invalid ID format or validation failed (invalid request body).',
  })
  @ApiConflictResponse({
    description: 'Username or Email already exists for another user.',
  })
  async update(
    @Param(new ZodValidationPipe(UserIdParamSchema)) params: UserIdParam,
    @Body(new ZodValidationPipe(UpdateUserRequestSchema))
    updateUserDto: UpdateUserDto, // Use UpdateUserDto for Swagger/type hints
  ): Promise<UserDto> {
    const { id } = params;

    this.logger.log(`Received request to update user ID: ${id}`);
    if (id <= 0) {
      throw new BadRequestException('User ID must be a positive integer.');
    }
    try {
      const updatedUser = await this.usersService.update(id, updateUserDto);
      return UserDto.fromEntity(updatedUser);
    } catch (error: unknown) {
      const context = `Error in PUT /users/${id}`;

      if (error instanceof Error) {
        this.logger.error(`${context}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`${context}: ${String(error)}`);
      }

      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user to delete',
    type: Number,
    example: 1,
  })
  @ApiAcceptedResponse({ description: 'User deletion request accepted.' }) // 202
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiBadRequestResponse({
    description: 'Invalid ID format (must be a positive integer).',
  })
  @HttpCode(HttpStatus.ACCEPTED) // Set status code to 202
  async remove(
    @Param(new ZodValidationPipe(UserIdParamSchema)) params: UserIdParam,
  ): Promise<void> {
    const { id } = params;

    // this.logger.log;
    console.log(
      `!!!!!!!!!!!!!!!!!!!!Received request to delete user ID: ${id}`,
    );
    if (id <= 0) {
      throw new BadRequestException('User ID must be a positive integer.');
    }
    try {
      await this.usersService.remove(id);
    } catch (error: unknown) {
      const context = `Error in DELETE /users/${id}`;

      if (error instanceof Error) {
        this.logger.error(`${context}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`${context}: ${String(error)}`);
      }

      throw error;
    }
  }
}
