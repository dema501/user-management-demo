package services

import (
	"context"
	"github.com/uptrace/bun"

	"runtime"
	"time"
)

// Healthcheck interface define functions
// that returns the database connection status
// last time the sync was done and the system status
type Healthcheck interface {
	DatabaseReady() (bool, error)
	GetMemUsage() uint64

	SetOnlineSince(time.Time)
	OnlineSince() time.Duration
}

type hc struct {
	onlineSince time.Time
	db          *bun.DB
}

// NewHealthcheck returns an implementation of Healthcheck interface
func NewHealthcheck(db *bun.DB) Healthcheck {
	return &hc{
		db: db,
	}
}

func (h *hc) DatabaseReady() (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := h.db.PingContext(ctx); err != nil {
		return false, err
	}

	return true, nil
}

func (h *hc) GetMemUsage() uint64 {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	return m.Alloc
}

func (h *hc) SetOnlineSince(t time.Time) {
	h.onlineSince = t
}

func (h *hc) OnlineSince() time.Duration {
	return time.Since(h.onlineSince)
}
