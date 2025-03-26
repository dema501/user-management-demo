package server

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	slogecho "github.com/samber/slog-echo"
	"go.uber.org/fx"

	"user-management/internal/config"
	"user-management/internal/services"
)

// NewServer returns a pointer to Server
func NewServer(lc fx.Lifecycle, cfg *config.Config, h services.Healthcheck, v echo.Validator) *echo.Echo {
	e := echo.New()

	e.Validator = v
	e.Use(slogecho.New(slog.Default()))
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			h.SetOnlineSince(time.Now())

			go func() {
				err := e.Start(fmt.Sprintf(":%d", cfg.Http.Port))
				if err != nil {
					slog.With("error", err).
						Error("failed to start server")
				}
			}()
			return nil
		},
		OnStop: func(c context.Context) error {
			slog.Info("Stopping server")
			return e.Shutdown(c)
		},
	})

	return e
}
