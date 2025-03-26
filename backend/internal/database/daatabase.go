package database

import (
	"context"
	"database/sql"
	"log/slog"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/extra/bunslog"
	"go.uber.org/fx"

	"user-management/internal/config"
)

// NewConnection will manage when the database connects
// and will stop connection when application shutdown
func NewConnection(lc fx.Lifecycle, cfg *config.Config) *bun.DB {

	// Initialize Bun with PostgreSQL driver
	pgconn := pgdriver.NewConnector(
		pgdriver.WithDSN(cfg.DB.DSN),
		pgdriver.WithApplicationName(config.AppName),
		// if we have a custom schema, we can specify it here
		pgdriver.WithConnParams(map[string]any{
			"search_path": "public",
		}),
	)
	sqldb := sql.OpenDB(pgconn)

	// Set connection pool parameters
	sqldb.SetMaxOpenConns(cfg.DB.MaxOpenConns)
	sqldb.SetMaxIdleConns(cfg.DB.MaxIdleConns)

	db := bun.NewDB(sqldb, pgdialect.New())

	if slog.Default().Enabled(context.TODO(), slog.LevelDebug) {
		db.AddQueryHook(bunslog.NewQueryHook(
			bunslog.WithLogger(slog.Default()),
		))
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			slog.Info("Connecting with database")
			return db.PingContext(ctx)
		},
		OnStop: func(_ context.Context) error {
			slog.Info("Disconnection from database")
			return db.Close()
		},
	})

	return db
}
