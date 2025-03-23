package user

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/urfave/cli/v3"

	"user-management/internal/models"
	"user-management/internal/repository"
	"user-management/internal/service"
)

// validate is a singleton validator for better performance
var (
	validate *validator.Validate
	once     sync.Once
)

// getValidator returns a singleton validator instance
func getValidator() *validator.Validate {
	once.Do(func() {
		validate = validator.New()
	})
	return validate
}

// initDB creates a database connection with the given DSN
func initDB(dsn string) (*bun.DB, error) {
	sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(dsn)))

	// Set connection pool parameters
	sqldb.SetMaxOpenConns(8)
	sqldb.SetMaxIdleConns(4)
	sqldb.SetConnMaxLifetime(time.Hour)
	sqldb.SetConnMaxIdleTime(30 * time.Minute)

	// Check if the connection is valid with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := sqldb.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return bun.NewDB(sqldb, pgdialect.New()), nil
}

// commonCommandAction is a helper function to reduce code duplication
func commonCommandAction(ctx context.Context, cmd *cli.Command, operation func(service.UserService, context.Context) error) error {
	db, err := initDB(cmd.String("dsn"))
	if err != nil {
		return err
	}
	defer func() {
		if err := db.Close(); err != nil {
			slog.With("error", err).Error("failed to close database connection")
		}
	}()

	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)

	return operation(userService, ctx)
}

func ListCommand() *cli.Command {
	return &cli.Command{
		Name:  "list",
		Usage: "List all users",
		Action: func(ctx context.Context, cmd *cli.Command) error {
			return commonCommandAction(ctx, cmd, func(userService service.UserService, ctx context.Context) error {
				users, err := userService.ListUsers(ctx)
				if err != nil {
					return fmt.Errorf("error listing users: %w", err)
				}

				slog.Info("Listing users", "count", len(users))

				// Output as JSON for cleaner display
				output, err := json.MarshalIndent(users, "", "  ")
				if err != nil {
					return fmt.Errorf("error formatting output: %w", err)
				}

				fmt.Println(string(output))
				return nil
			})
		},
	}
}

func GetCommand() *cli.Command {
	return &cli.Command{
		Name:  "get",
		Usage: "Get a user by ID",
		Flags: []cli.Flag{
			&cli.IntFlag{
				Name:     "id",
				Aliases:  []string{"i"},
				Usage:    "User ID",
				Required: true,
			},
		},
		Action: func(ctx context.Context, cmd *cli.Command) error {
			id := cmd.Int("id")
			if id <= 0 {
				return fmt.Errorf("invalid user ID: must be greater than 0")
			}

			return commonCommandAction(ctx, cmd, func(userService service.UserService, ctx context.Context) error {
				user, err := userService.GetUser(ctx, id)
				if err != nil {
					return fmt.Errorf("error getting user: %w", err)
				}

				output, err := json.MarshalIndent(user, "", "  ")
				if err != nil {
					return fmt.Errorf("error formatting output: %w", err)
				}

				fmt.Println(string(output))
				return nil
			})
		},
	}
}

func CreateCommand() *cli.Command {
	return &cli.Command{
		Name:  "create",
		Usage: "Create a new user",
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:     "username",
				Aliases:  []string{"u"},
				Usage:    "Username",
				Required: true,
			},
			&cli.StringFlag{
				Name:     "first-name",
				Aliases:  []string{"f"},
				Usage:    "First name", // Fixed incorrect usage description
				Required: true,
			},
			&cli.StringFlag{
				Name:     "last-name",
				Aliases:  []string{"l"},
				Usage:    "Last name",
				Required: true,
			},
			&cli.StringFlag{
				Name:     "email",
				Aliases:  []string{"e"},
				Usage:    "Email address",
				Required: true,
			},
			&cli.StringFlag{
				Name:     "status",
				Aliases:  []string{"s"},
				Usage:    "User status",
				Required: true,
			},
			&cli.StringFlag{
				Name:     "department",
				Aliases:  []string{"d"},
				Usage:    "Department",
				Required: false,
			},
		},
		Action: func(ctx context.Context, cmd *cli.Command) error {
			req := models.UserCreateRequest{
				UserName:   cmd.String("username"),
				FirstName:  cmd.String("first-name"),
				LastName:   cmd.String("last-name"),
				Email:      cmd.String("email"),
				UserStatus: models.UserStatus(cmd.String("status")),
				Department: cmd.String("department"),
			}

			if err := getValidator().Struct(req); err != nil {
				return fmt.Errorf("invalid request: %w", err)
			}

			return commonCommandAction(ctx, cmd, func(userService service.UserService, ctx context.Context) error {
				user, err := userService.CreateUser(ctx, req)
				if err != nil {
					return fmt.Errorf("error creating user: %w", err)
				}

				slog.With("user", user).Info("User created successfully")

				return nil
			})
		},
	}
}

func UpdateCommand() *cli.Command {
	return &cli.Command{
		Name:  "update",
		Usage: "Update a user",
		Flags: []cli.Flag{
			&cli.IntFlag{
				Name:     "id",
				Aliases:  []string{"i"},
				Usage:    "User ID",
				Required: true,
			},
			&cli.StringFlag{
				Name:     "username",
				Aliases:  []string{"u"},
				Usage:    "Username",
				Required: false,
			},
			&cli.StringFlag{
				Name:     "first-name",
				Aliases:  []string{"f"},
				Usage:    "First name",
				Required: false,
			},
			&cli.StringFlag{
				Name:     "last-name",
				Aliases:  []string{"l"},
				Usage:    "Last name",
				Required: false,
			},
			&cli.StringFlag{
				Name:     "email",
				Aliases:  []string{"e"},
				Usage:    "Email address",
				Required: false,
			},
			&cli.StringFlag{
				Name:     "status",
				Aliases:  []string{"s"},
				Usage:    "User status",
				Required: false,
			},
			&cli.StringFlag{
				Name:     "department",
				Aliases:  []string{"d"},
				Usage:    "Department",
				Required: false,
			},
		},
		Action: func(ctx context.Context, cmd *cli.Command) error {
			id := cmd.Int("id")
			if id <= 0 {
				return fmt.Errorf("invalid user ID: must be greater than 0")
			}

			req := models.UserUpdateRequest{
				UserName:   cmd.String("username"),
				FirstName:  cmd.String("first-name"),
				LastName:   cmd.String("last-name"),
				Email:      cmd.String("email"),
				UserStatus: models.UserStatus(cmd.String("status")),
				Department: cmd.String("department"),
			}

			if err := getValidator().Struct(req); err != nil {
				return fmt.Errorf("invalid request: %w", err)
			}

			return commonCommandAction(ctx, cmd, func(userService service.UserService, ctx context.Context) error {
				user, err := userService.UpdateUser(ctx, id, req)
				if err != nil {
					return fmt.Errorf("error updating user: %w", err)
				}

				slog.With("user", user).Info("User updated successfully")
				return nil
			})
		},
	}
}

func DeleteCommand() *cli.Command {
	return &cli.Command{
		Name:  "delete",
		Usage: "Delete a user by ID",
		Flags: []cli.Flag{
			&cli.IntFlag{
				Name:     "id",
				Aliases:  []string{"i"},
				Usage:    "User ID",
				Required: true,
			},
		},
		Action: func(ctx context.Context, cmd *cli.Command) error {
			id := cmd.Int("id")
			if id <= 0 {
				return fmt.Errorf("invalid user ID: must be greater than 0")
			}

			return commonCommandAction(ctx, cmd, func(userService service.UserService, ctx context.Context) error {
				err := userService.DeleteUser(ctx, id)
				if err != nil {
					return fmt.Errorf("error deleting user: %w", err)
				}

				slog.With("user_id", id).Info("User updated successfully")
				return nil
			})
		},
	}
}
