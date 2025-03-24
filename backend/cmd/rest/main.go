package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"runtime/debug"
	"syscall"

	"github.com/jessevdk/go-flags"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	slogecho "github.com/samber/slog-echo"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/extra/bunslog"
	"golang.org/x/time/rate"

	"user-management/internal/api"
	"user-management/internal/config"
	"user-management/internal/repository"
	"user-management/internal/service"
	"user-management/internal/validator"
)

const (
	appName = "user-management"
)

// @title User Management API
// @version 1.0
// @description A simple user management API
// @host localhost:8080
// @BasePath	/api/v1
func main() {
	info, _ := debug.ReadBuildInfo()

	// plain text logging
	slog.With("go_version", info.GoVersion).
		With("revision", info.Main.Version).
		With("app", appName).
		Info("starting")

	// Parse command-line options.
	var opts config.Config

	p := flags.NewParser(&opts, flags.IgnoreUnknown|flags.PrintErrors|flags.PassDoubleDash|flags.HelpFlag)
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
		Level: getVerboseLevel(opts.Verbose),
	}))
	slog.SetDefault(logger.With("app", appName))

	// Create a context that will be canceled on SIGINT or SIGTERM
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	// Initialize Bun with PostgreSQL driver
	pgconn := pgdriver.NewConnector(
		pgdriver.WithDSN(opts.DSN),
		pgdriver.WithApplicationName(appName),
		// if we have a custom schema, we can specify it here
		pgdriver.WithConnParams(map[string]any{
			"search_path": "public",
		}),
	)
	sqldb := sql.OpenDB(pgconn)
	// Set connection pool parameters
	sqldb.SetMaxOpenConns(8)
	sqldb.SetMaxIdleConns(4)

	db := bun.NewDB(sqldb, pgdialect.New())
	defer func() {
		if err := db.Close(); err != nil {
			logger.With("error", err).
				Error("failed to close database connection")
		}
	}()

	db.AddQueryHook(bunslog.NewQueryHook(
		bunslog.WithLogger(logger.With("log_type", "bun")),
	))

	// Check if the connection is valid
	if err := sqldb.PingContext(ctx); err != nil {
		logger.With("error", err).
			Error("failed to connect to database")
		os.Exit(1)
	}

	// Initialize repository, service, and API handlers
	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)
	userHandler := api.NewUserHandler(userService)

	// Create Echo instance
	e := echo.New()

	// Register validator
	e.Validator = validator.New()

	e.Use(slogecho.New(logger))
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	e.GET("/ping", func(c echo.Context) error {
		return c.String(http.StatusOK, "pong")
	})

	v1 := e.Group("/api/v1")
	{
		// limit the application to 100 requests/sec TBD
		v1.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(rate.Limit(opts.RateLimit))))

		// Routes
		v1.GET("/users", userHandler.ListUsers)
		v1.POST("/users", userHandler.CreateUser)
		v1.GET("/users/:id", userHandler.GetUser)
		v1.PUT("/users/:id", userHandler.UpdateUser)
		v1.DELETE("/users/:id", userHandler.DeleteUser)
	}

	// Swagger documentation
	e.GET("/swagger/*", api.SwaggerHandler())

	// Start server
	go func() {
		if err := e.Start(fmt.Sprintf(":%d", opts.Port)); err != nil && err != http.ErrServerClosed {
			logger.Error("shutting down the server", slog.Any("error", err))
		}
	}()

	// Wait for interrupt signal
	<-ctx.Done()

	// Prevent the HTTP server from establishing new keep-alive connections.
	e.Server.SetKeepAlivesEnabled(false)

	// Wait for the server to stop gracefully.
	if err := e.Shutdown(ctx); err != nil {
		logger.Error("error during server shutdown", slog.Any("error", err))
	}

	logger.Info("Server shut down successfully")
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
