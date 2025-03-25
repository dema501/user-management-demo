package handlers

import (
	"github.com/labstack/echo/v4"
	echoSwagger "github.com/swaggo/echo-swagger"

	// Import the docs
	_ "user-management/docs/swagger"
)

// SwaggerHandler returns a handler for serving Swagger documentation
func SwaggerHandler() echo.HandlerFunc {
	return echoSwagger.WrapHandler
}
