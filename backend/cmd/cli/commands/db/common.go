package db

import (
	"database/sql"
	"fmt"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
)

// initDB creates a database connection with the given DSN
func initDB(dsn string) (*bun.DB, error) {
	sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(dsn)))

	// Set connection pool parameters
	sqldb.SetMaxOpenConns(8)
	sqldb.SetMaxIdleConns(4)

	// Check if the connection is valid
	if err := sqldb.Ping(); err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return bun.NewDB(sqldb, pgdialect.New()), nil
}
