package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"user-management/internal/config"
	"user-management/internal/database"
	"user-management/internal/handlers"
	"user-management/internal/repository"
	"user-management/internal/server"
	"user-management/internal/services"
	"user-management/internal/validator"

	"go.uber.org/fx"
)

//	@title			User Management API
//	@version		1.0
//	@description	A simple user management API
//	@host			localhost:8080
//	@BasePath		/api/v1
func main() {
	app := fx.New(
		fx.Provide(
			config.NewConfig,
			database.NewConnection,
		),

		fx.Provide(
			repository.NewUserRepository,
		),

		fx.Provide(
			services.NewHealthcheck,
			services.NewUserService,

			handlers.NewHealthcheckHandler,
			handlers.NewUserHandler,

			validator.NewEchoValidator,

			server.NewServer,
		),

		fx.Invoke(
			server.NewRegister,
		),
	)

	// Create base signal context
	sigCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Create timeout context derived from signal context
	// This context will be canceled either when:
	// 1. A signal is received OR
	// 2. The timeout expires
	ctx, cancel := context.WithTimeout(sigCtx, 15*time.Second)
	defer cancel()

	if err := app.Start(ctx); err != nil {
		slog.With("error", err).
			Error("failed to start application")
		os.Exit(1)
	}

	// Wait for interrupt signal
	<-app.Done()

	// Create another timeout context for shutdown
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()

	if err := app.Stop(shutdownCtx); err != nil {
		slog.With("error", err).
			Error("failed to stop application")
		os.Exit(1)
	}

	slog.Info("application stopped")
}
