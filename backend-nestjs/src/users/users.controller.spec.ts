import { describe, beforeEach, test, expect, mock } from 'bun:test'; // Use bun:test
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserDto } from './dto/user.dto.js';
import type { User } from '../database/schema.js';

describe('UsersController', () => {
  let controller: UsersController;

  // Mock User Service using bun:test mock
  const mockUsersService = {
    create: mock<UsersService['create']>(),
    findAll: mock<UsersService['findAll']>(),
    findOne: mock<UsersService['findOne']>(),
    update: mock<UsersService['update']>(),
    remove: mock<UsersService['remove']>(),
  };

  // Mock User Data
  const mockUser: User = {
    userId: 1,
    userName: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    userStatus: 'A',
    department: 'Testing',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T11:00:00Z'),
  };

  const mockUserDto = UserDto.fromEntity(mockUser);

  beforeEach(async () => {
    // Reset mocks before each test
    mockUsersService.create.mockReset();
    mockUsersService.findAll.mockReset();
    mockUsersService.findOne.mockReset();
    mockUsersService.update.mockReset();
    mockUsersService.remove.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService, // Use the mock object
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  test('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // --- Test POST /users ---
  describe('create', () => {
    const createUserDto: CreateUserDto = {
      userName: 'newuser',
      firstName: 'New',
      lastName: 'User',
      email: 'new@example.com',
      userStatus: 'A',
      department: 'Dev',
    };
    const createdUser: User = {
      ...mockUser,
      ...createUserDto,
      userId: 2,
      createdAt: new Date('2024-01-02T10:00:00Z'),
      updatedAt: new Date('2024-01-02T10:00:00Z'),
    };

    test('should create a user successfully', async () => {
      mockUsersService.create.mockResolvedValue(createdUser);

      // We test the controller, assuming the pipe allows valid data through
      const result = await controller.create(createUserDto); // Pass DTO

      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto); // Service receives validated data
      expect(result).toEqual(UserDto.fromEntity(createdUser)); // Controller returns DTO
      expect(mockUsersService.create).toHaveBeenCalledTimes(1);
    });

    test('should throw ConflictException if service throws ConflictException', () => {
      const conflictError = new ConflictException('Username already exists.');
      mockUsersService.create.mockRejectedValue(conflictError);

      expect(controller.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });

    test('should throw InternalServerErrorException on other service errors', () => {
      mockUsersService.create.mockRejectedValue(
        new InternalServerErrorException(),
      );
      expect(controller.create(createUserDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // --- Test GET /users ---
  describe('findAll', () => {
    test('should return an array of users', async () => {
      const users = [mockUser];
      mockUsersService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(result).toEqual(users.map(UserDto.fromEntity));
      expect(mockUsersService.findAll).toHaveBeenCalledTimes(1);
    });

    test('should return an empty array if no users exist', async () => {
      mockUsersService.findAll.mockResolvedValue([]);
      const result = await controller.findAll();
      expect(result).toEqual([]);
      expect(mockUsersService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  // --- Test GET /users/:id ---
  describe('findOne', () => {
    test('should return a single user if found', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne({ id: mockUser.userId });

      expect(result).toEqual(mockUserDto);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(mockUser.userId);
      expect(mockUsersService.findOne).toHaveBeenCalledTimes(1);
    });

    test('should throw NotFoundException if service throws NotFoundException', () => {
      const userId = 999;
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException(`User with ID ${userId} not found.`),
      );

      expect(controller.findOne({ id: userId })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
    });

    test('should throw BadRequestException for invalid ID (zero)', () => {
      const invalidId = 0;
      // The controller's logic should throw this *before* calling the service
      expect(controller.findOne({ id: invalidId })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUsersService.findOne).not.toHaveBeenCalled(); // Service shouldn't be called
    });

    test('should throw BadRequestException for invalid ID (negative)', () => {
      const invalidId = -5;
      // The controller's logic should throw this *before* calling the service
      expect(controller.findOne({ id: invalidId })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUsersService.findOne).not.toHaveBeenCalled(); // Service shouldn't be called
    });
  });

  // --- Test PUT /users/:id ---
  describe('update', () => {
    const userId = mockUser.userId;
    const updateUserDto: UpdateUserDto = {
      firstName: 'Updated First',
      department: 'QA',
    };
    const updatedUser: User = {
      ...mockUser,
      ...updateUserDto,
      updatedAt: new Date('2024-01-01T12:00:00Z'),
    };

    test('should update a user successfully', async () => {
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update({ id: userId }, updateUserDto);

      expect(mockUsersService.update).toHaveBeenCalledWith(
        userId,
        updateUserDto,
      );
      expect(result).toEqual(UserDto.fromEntity(updatedUser));
      expect(mockUsersService.update).toHaveBeenCalledTimes(1);
    });

    test('should throw NotFoundException if service throws NotFoundException', () => {
      const nonExistentId = 999;
      mockUsersService.update.mockRejectedValue(
        new NotFoundException(`User with ID ${nonExistentId} not found.`),
      );

      expect(
        controller.update({ id: nonExistentId }, updateUserDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockUsersService.update).toHaveBeenCalledWith(
        nonExistentId,
        updateUserDto,
      );
    });

    test('should throw ConflictException if service throws ConflictException', () => {
      mockUsersService.update.mockRejectedValue(
        new ConflictException('Email already exists.'),
      );

      expect(controller.update({ id: userId }, updateUserDto)).rejects.toThrow(
        ConflictException,
      );

      expect(mockUsersService.update).toHaveBeenCalledWith(
        userId,
        updateUserDto,
      );
    });

    test('should throw BadRequestException for invalid ID (zero)', () => {
      const invalidId = 0;
      expect(
        controller.update({ id: invalidId }, updateUserDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockUsersService.update).not.toHaveBeenCalled();
    });
  });

  // --- Test DELETE /users/:id ---
  describe('remove', () => {
    const userId = mockUser.userId;

    test('should delete a user successfully (returns void, expect ACCEPTED status)', async () => {
      mockUsersService.remove.mockResolvedValue(undefined); // remove returns void

      // Call the controller method directly
      await controller.remove({ id: userId }); // It should not throw

      expect(mockUsersService.remove).toHaveBeenCalledWith(userId);
      expect(mockUsersService.remove).toHaveBeenCalledTimes(1);
    });

    test('should throw NotFoundException if service throws NotFoundException', () => {
      const nonExistentId = 999;
      mockUsersService.remove.mockRejectedValue(
        new NotFoundException(`User with ID ${nonExistentId} not found.`),
      );

      expect(controller.remove({ id: nonExistentId })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUsersService.remove).toHaveBeenCalledWith(nonExistentId);
    });

    test('should throw BadRequestException for invalid ID (zero)', () => {
      const invalidId = 0;
      expect(controller.remove({ id: invalidId })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUsersService.remove).not.toHaveBeenCalled();
    });
  });
});
