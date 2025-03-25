package handlers

import (
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"

	"user-management/internal/services"
)

// Healthcheck handlers define the endpoint controllers
// to access the API status
type Healthcheck struct {
	hcService services.Healthcheck
}

// NewHealthcheckHandler injects the healthcheck services
// into handler
func NewHealthcheckHandler(hcService services.Healthcheck) *Healthcheck {
	return &Healthcheck{hcService}
}

// GetAPIStatus returns the status of mongodb connection
// when the last sync occours and the system info
func (h *Healthcheck) GetAPIStatus(e echo.Context) error {
	dbReady, err := h.hcService.DatabaseReady()
	dbStatus := "OK"
	if err != nil || !dbReady {
		dbStatus = "FAIL"
	}

	return e.JSON(http.StatusOK, map[string]interface{}{
		"mem_usage": fmt.Sprintf("%v MiB", h.hcService.GetMemUsage()/1024/1024),
		"online_t":  h.hcService.OnlineSince().String(),
		"db_status": dbStatus,
	})
}
