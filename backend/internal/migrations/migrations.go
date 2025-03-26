package migrations

import "github.com/uptrace/bun/migrate"

// Migrations creates a new migrations.
var Migrations = migrate.NewMigrations()

func init() { //nolint:gochecknoinits,unused
	if err := Migrations.DiscoverCaller(); err != nil {
		panic(err)
	}
}
