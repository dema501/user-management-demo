//go:build !migrate_tools

package db

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/urfave/cli/v3"
)

// PingCommand pings the database.
func PingCommand() *cli.Command {
	return &cli.Command{
		Name:  "ping",
		Usage: "ping the database",
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

			err = db.Ping()
			if err != nil {
				return fmt.Errorf("failed to ping database: %w", err)
			}
			slog.Info("database pinged... pong!")

			return nil
		},
	}
}

// RegisterCommands registers the database commands.
func RegisterCommands() *cli.Command {
	return &cli.Command{
		Name:  "db",
		Usage: "Database management commands",
		Commands: []*cli.Command{
			PingCommand(),
		},
	}
}
