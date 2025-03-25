package server

import (
	"net/http"
	"user-management/internal/config"
	"user-management/internal/handlers"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"
)

// NewRegister will setup the middlewares request endpoint handlers and inject the necessary deps
func NewRegister(e *echo.Echo, cfg *config.Config, userHandler *handlers.UserHandler, hc *handlers.Healthcheck) {
	// Register validator
	e.GET("/ping", func(c echo.Context) error {
		return c.String(http.StatusOK, "pong")
	})
	e.GET("/status", hc.GetAPIStatus)

	v1 := e.Group("/api/v1")
	{
		// limit the application to 100 requests/sec TBD
		v1.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(rate.Limit(cfg.Http.RateLimit))))

		// Routes
		v1.GET("/users", userHandler.ListUsers)
		v1.POST("/users", userHandler.CreateUser)
		v1.GET("/users/:id", userHandler.GetUser)
		v1.PUT("/users/:id", userHandler.UpdateUser)
		v1.DELETE("/users/:id", userHandler.DeleteUser)
	}

	// Swagger documentation
	e.GET("/swagger/*any", handlers.SwaggerHandler())
}
