// Package service provides user-related business logic operations.
package service

import (
	"context"
	"errors"
	"time"

	"user-management/internal/models"
	"user-management/internal/repository"
)

type UserService interface {
	ListUsers(ctx context.Context) ([]models.User, error)
	GetUser(ctx context.Context, id int64) (*models.User, error)
	CreateUser(ctx context.Context, req models.UserCreateRequest) (*models.User, error)
	UpdateUser(ctx context.Context, id int64, req models.UserUpdateRequest) (*models.User, error)
	DeleteUser(ctx context.Context, id int64) error
}

type userService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) UserService {
	return &userService{repo: repo}
}

func (s *userService) ListUsers(ctx context.Context) ([]models.User, error) {
	return s.repo.List(ctx)
}

func (s *userService) GetUser(ctx context.Context, id int64) (*models.User, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *userService) CreateUser(ctx context.Context, req models.UserCreateRequest) (*models.User, error) {
	// Check if username already exists
	exists, err := s.repo.ExistsByUserName(ctx, req.UserName)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("username already exists")
	}

	// Check if email already exists
	exists, err = s.repo.ExistsByEmail(ctx, req.Email, 0)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("email already exists")
	}

	// Validate user status
	if req.UserStatus != models.UserStatusActive &&
		req.UserStatus != models.UserStatusInactive &&
		req.UserStatus != models.UserStatusTerminated {
		return nil, errors.New("invalid user status")
	}

	user := &models.User{
		UserName:   req.UserName,
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		Email:      req.Email,
		UserStatus: req.UserStatus,
		Department: req.Department,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *userService) UpdateUser(ctx context.Context, id int64, req models.UserUpdateRequest) (*models.User, error) {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Check if username already exists and belongs to another user
	if user.UserName != req.UserName {
		exists, err := s.repo.ExistsByUserName(ctx, req.UserName)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, errors.New("username already exists")
		}
	}

	// Check if email already exists and belongs to another user
	if user.Email != req.Email {
		exists, err := s.repo.ExistsByEmail(ctx, req.Email, id)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, errors.New("email already exists")
		}
	}

	// Validate user status
	if req.UserStatus != models.UserStatusActive &&
		req.UserStatus != models.UserStatusInactive &&
		req.UserStatus != models.UserStatusTerminated {
		return nil, errors.New("invalid user status")
	}

	user.UserName = req.UserName
	user.FirstName = req.FirstName
	user.LastName = req.LastName
	user.Email = req.Email
	user.UserStatus = req.UserStatus
	user.Department = req.Department
	user.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *userService) DeleteUser(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
