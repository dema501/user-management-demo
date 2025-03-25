package config

import (
	"errors"
	"log/slog"
	"os"

	"github.com/jessevdk/go-flags"
)

const (
	AppName = "user-management"
)

type Config struct {
	Http struct {
		Port      int `long:"port" env:"PORT" description:"Port number for the server" default:"8080"`
		RateLimit int `long:"rate-limit" env:"RATE_LIMIT" description:"Rate limit for the server" default:"100"`
	} `group:"http" name:"http" env-namespace:"HTTP" description:"Server configuration"`

	Verbose []bool `short:"v" long:"verbose" description:"Enable verbose output (can be specified multiple times)"`

	DB struct {
		DSN          string `long:"dsn" env:"DSN"  description:"Database connection string" default:"postgresql://postgres:postgres@localhost:5432/template1?sslmode=disable&timeout=5s"`
		MaxOpenConns int    `long:"max-open-conns" env:"MAX_OPEN_CONNS" description:"Maximum number of open connections to the database" default:"8"`
		MaxIdleConns int    `long:"max-idle-conns" env:"MAX_IDLE_CONNS" description:"Maximum number of idle connections to the database" default:"4"`
	} `group:"db" name:"db" env-namespace:"DB" description:"Database configuration"`
}

func NewConfig() *Config {
	var cfg Config

	p := flags.NewParser(&cfg, flags.IgnoreUnknown|flags.PrintErrors|flags.PassDoubleDash|flags.HelpFlag)
	p.SubcommandsOptional = true

	if _, err := p.Parse(); err != nil {
		var flagsErr flags.ErrorType
		switch {
		case errors.As(err, &flagsErr):
			if errors.Is(flagsErr, flags.ErrHelp) {
				os.Exit(0)
			}
			os.Exit(1)
		default:
			os.Exit(1)
		}
	}

	// Configure logging based on verbosity
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: getVerboseLevel(cfg.Verbose),
	}))
	slog.SetDefault(logger.With("app", AppName))

	slog.With("cfg", cfg).Info("Config loaded")

	return &cfg
}

// getVerboseLevel returns the slog level based on the number of verbose flags.
func getVerboseLevel(verbose []bool) slog.Level {
	switch len(verbose) {
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
