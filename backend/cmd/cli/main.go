package main

import (
	"context"
	"os"
	"runtime/debug"

	"log/slog"

	"github.com/urfave/cli/v3"

	"user-management/cmd/cli/commands/db"
	"user-management/cmd/cli/commands/user"
)

const (
	appName = "user-management-cli"
)

func main() {
	info, _ := debug.ReadBuildInfo()

	var verbosityLevel int

	// plain text logging
	slog.With("go_version", info.GoVersion).
		With("revision", info.Main.Version).
		With("app", appName).
		Info("starting")

	var subCommands []*cli.Command
	if dbc := db.RegisterCommands(); dbc != nil {
		subCommands = append(subCommands, dbc)
	}

	if uc := user.RegisterCommands(); uc != nil {
		subCommands = append(subCommands, uc)
	}

	app := &cli.Command{
		Name:                   appName,
		Usage:                  "User management CLI tool",
		UseShortOptionHandling: true,
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:     "dsn",
				Usage:    "Database connection string",
				Required: true,
				Sources:  cli.EnvVars("DSN"),
				Config:   cli.StringConfig{TrimSpace: true},
			},
			&cli.BoolFlag{
				Name:    "verbosity",
				Aliases: []string{"v"},
				Config: cli.BoolConfig{
					Count: &verbosityLevel,
				},
				Action: func(_ context.Context, _ *cli.Command, _ bool) error {
					logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
						Level: getVerboseLevel(verbosityLevel),
					}))

					slog.SetDefault(logger.With("app", appName))
					return nil
				},
			},
		},
		Commands: subCommands,
	}

	app.VisibleFlags()

	err := app.Run(context.Background(), os.Args)
	if err != nil {
		slog.With("error", err).Error("application error")
		os.Exit(1)
	}
}

// getVerboseLevel returns the slog level based on the number of verbose flags.
func getVerboseLevel(verboseLevel int) slog.Level {
	switch verboseLevel {
	case 0:
		return slog.LevelError
	case 1:
		return slog.LevelWarn
	case 2:
		return slog.LevelInfo
	default:
		return slog.LevelDebug
	}
}
