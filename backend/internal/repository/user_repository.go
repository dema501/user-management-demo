// Package repository provides user-related data access operations.
package repository

import (
	"context"

	"github.com/uptrace/bun"

	"user-management/internal/models"
)

// UserRepository provides user-related data access operations.
type UserRepository interface {
	List(ctx context.Context) ([]models.User, error)
	GetByID(ctx context.Context, id int64) (*models.User, error)
	Create(ctx context.Context, user *models.User) error
	Update(ctx context.Context, user *models.User) error
	Delete(ctx context.Context, id int64) error
	ExistsByUserName(ctx context.Context, userName string) (bool, error)
	ExistsByEmail(ctx context.Context, email string, excludeID int64) (bool, error)
}

type userRepository struct {
	db *bun.DB
}

// NewUserRepository creates a new user repository.
func NewUserRepository(db *bun.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) List(ctx context.Context) ([]models.User, error) {
	var users []models.User
	err := r.db.NewSelect().Model(&users).Order("user_id ASC").Scan(ctx)
	return users, err
}

func (r *userRepository) GetByID(ctx context.Context, id int64) (*models.User, error) {
	user := new(models.User)
	err := r.db.NewSelect().Model(user).Where("user_id = ?", id).Scan(ctx)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *userRepository) Create(ctx context.Context, user *models.User) error {
	_, err := r.db.NewInsert().Model(user).Exec(ctx)
	return err
}

func (r *userRepository) Update(ctx context.Context, user *models.User) error {
	_, err := r.db.NewUpdate().Model(user).WherePK().Exec(ctx)
	return err
}

func (r *userRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.NewDelete().Model((*models.User)(nil)).Where("user_id = ?", id).Exec(ctx)
	return err
}

func (r *userRepository) ExistsByUserName(ctx context.Context, userName string) (bool, error) {
	exists, err := r.db.NewSelect().Model((*models.User)(nil)).Where("user_name = ?", userName).Exists(ctx)
	return exists, err
}

func (r *userRepository) ExistsByEmail(ctx context.Context, email string, excludeID int64) (bool, error) {
	query := r.db.NewSelect().Model((*models.User)(nil)).Where("email = ?", email)

	// If we're updating a user, exclude the current user from the check
	if excludeID != 0 {
		query = query.Where("user_id != ?", excludeID)
	}

	exists, err := query.Exists(ctx)
	return exists, err
}
