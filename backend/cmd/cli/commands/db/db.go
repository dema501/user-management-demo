package db

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"strings"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/migrate"
	"github.com/urfave/cli/v3"

	"user-management/internal/migrations"
	"user-management/internal/models"
)

// initDB creates a database connection with the given DSN
func initDB(dsn string) (*bun.DB, error) {
	sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(dsn)))

	// Set connection pool parameters
	sqldb.SetMaxOpenConns(8)
	sqldb.SetMaxIdleConns(4)

	// Check if the connection is valid
	if err := sqldb.Ping(); err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return bun.NewDB(sqldb, pgdialect.New()), nil
}

// commonCommandAction is a helper function to reduce code duplication
func commonCommandAction(ctx context.Context, cmd *cli.Command, operation func(*migrate.Migrator, context.Context) error) error {
	db, err := initDB(cmd.String("dsn"))
	if err != nil {
		return err
	}
	defer func() {
		if err := db.Close(); err != nil {
			slog.With("error", err).Error("failed to close database connection")
		}
	}()

	migrator := migrate.NewMigrator(db, migrations.Migrations)

	return operation(migrator, ctx)
}

func InitCommand() *cli.Command {
	return &cli.Command{
		Name:  "init",
		Usage: "create migration tables",
		Action: func(ctx context.Context, cmd *cli.Command) error {
			return commonCommandAction(ctx, cmd, func(migrator *migrate.Migrator, ctx context.Context) error {
				return migrator.Init(ctx)
			})
		},
	}
}

func MigrateCommand() *cli.Command {
	return &cli.Command{
		Name:  "migrate",
		Usage: "migrate database",
		Action: func(ctx context.Context, cmd *cli.Command) error {
			return commonCommandAction(ctx, cmd, func(migrator *migrate.Migrator, ctx context.Context) error {
				if err := migrator.Lock(ctx); err != nil {
					return err
				}
				defer migrator.Unlock(ctx) //nolint:errcheck

				group, err := migrator.Migrate(ctx)
				if err != nil {
					return err
				}
				if group.IsZero() {
					slog.Info("there are no new migrations to run (database is up to date)")
					return nil
				}

				slog.With("group", group.String()).
					Info("migrated to")
				return nil
			})
		},
	}
}

func RollbackCommand() *cli.Command {
	return &cli.Command{
		Name:  "rollback",
		Usage: "rollback the last migration group",
		Action: func(ctx context.Context, cmd *cli.Command) error {
			db, err := initDB(cmd.String("dsn"))
			if err != nil {
				return err
			}
			defer func() {
				if err := db.Close(); err != nil {
					slog.With("error", err).Error("failed to close database connection")
				}
			}()

			migrator := migrate.NewMigrator(db, migrations.Migrations)

			if err := migrator.Lock(ctx); err != nil {
				return err
			}
			defer migrator.Unlock(ctx) //nolint:errcheck

			group, err := migrator.Rollback(ctx)
			if err != nil {
				return err
			}
			if group.IsZero() {
				slog.Info("there are no groups to roll back\n")
				return nil
			}
			slog.With("group", group.String()).
				Info("rolled back")
			return nil
		},
	}
}

func LockCommand() *cli.Command {
	return &cli.Command{
		Name:  "lock",
		Usage: "lock migrations",
		Action: func(ctx context.Context, cmd *cli.Command) error {
			return commonCommandAction(ctx, cmd, func(migrator *migrate.Migrator, ctx context.Context) error {
				return migrator.Lock(ctx)
			})
		},
	}
}

func UnlockCommand() *cli.Command {
	return &cli.Command{
		Name:  "unlock",
		Usage: "unlock migrations",
		Action: func(ctx context.Context, cmd *cli.Command) error {
			return commonCommandAction(ctx, cmd, func(migrator *migrate.Migrator, ctx context.Context) error {
				return migrator.Unlock(ctx)
			})
		},
	}
}

func CreateGoCommand() *cli.Command {
	return &cli.Command{
		Name:  "create_go",
		Usage: "create a Go migration",
		Action: func(ctx context.Context, cmd *cli.Command) error {
			name := strings.Join(cmd.Args().Slice(), "_")

			return commonCommandAction(ctx, cmd, func(migrator *migrate.Migrator, ctx context.Context) error {
				mf, err := migrator.CreateGoMigration(ctx, name)
				if err != nil {
					return err
				}

				slog.With("name", mf.Name).
					With("path", mf.Path).
					Info("created migration")

				return nil
			})
		},
	}
}

func CreateSQLCommand() *cli.Command {
	return &cli.Command{
		Name:  "create_sql",
		Usage: "create a SQL migration",
		Action: func(ctx context.Context, cmd *cli.Command) error {
			name := strings.Join(cmd.Args().Slice(), "_")

			return commonCommandAction(ctx, cmd, func(migrator *migrate.Migrator, ctx context.Context) error {
				files, err := migrator.CreateSQLMigrations(ctx, name)
				if err != nil {
					return err
				}

				for _, mf := range files {
					slog.With("name", mf.Name).
						With("path", mf.Path).
						Info("created migration")
				}

				return nil
			})
		},
	}
}

func StatusCommand() *cli.Command {
	return &cli.Command{
		Name:  "status",
		Usage: "show migration status",
		Action: func(ctx context.Context, cmd *cli.Command) error {
			return commonCommandAction(ctx, cmd, func(migrator *migrate.Migrator, ctx context.Context) error {
				ms, err := migrator.MigrationsWithStatus(ctx)
				if err != nil {
					return err
				}

				slog.With("status", ms).
					With("unapplied", ms.Unapplied()).
					With("last_group", ms.LastGroup()).
					Info("migration status")

				return nil
			})
		},
	}
}

func TruncateUserTableCommand() *cli.Command {
	return &cli.Command{
		Name:  "truncate_user_table",
		Usage: "truncate the user table",
		Action: func(ctx context.Context, cmd *cli.Command) error {
			db, err := initDB(cmd.String("dsn"))
			if err != nil {
				return err
			}
			defer func() {
				if err := db.Close(); err != nil {
					slog.With("error", err).Error("failed to close database connection")
				}
			}()

			err = db.ResetModel(ctx, (*models.User)(nil))
			if err != nil {
				return fmt.Errorf("failed to reset user model: %w", err)
			}

			slog.Info("user table truncated")

			return nil
		},
	}
}
