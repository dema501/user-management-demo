# Variables
APP_NAME_API := user_api
APP_NAME_CLI := user_cli
BUILD_DIR := target/release
# Use CARGO_TARGET_DIR env var if you want to change output location

# Default target
all: help

# Build release binaries
compile:
	@echo "Building release binaries..."
	@cargo build --release

# Run the API server (release mode)
run: compile
	@echo "Running API server..."
	@RUST_LOG=info $(BUILD_DIR)/$(APP_NAME_API) # Adjust RUST_LOG as needed

# Run the API server (dev mode with watch) - Requires cargo-watch
# cargo install cargo-watch
watch:
	@echo "Running API server in watch mode (dev)..."
	@cargo watch -q -c -w src/ -x 'run --bin user_api'

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@cargo clean

# Run tests
test:
	@echo "Running tests..."
	@cargo test --all-features # Ensure features needed for tests are enabled

# Run tests with coverage - Requires cargo-tarpaulin
# cargo install cargo-tarpaulin
# Note: Tarpaulin might have issues with some setups (e.g., testcontainers)
coverage:
	@echo "Running tests with coverage..."
	@cargo tarpaulin --verbose --all-features --workspace --timeout 120 --out Html Xml

# Lint code
lint:
	@echo "Running clippy..."
	@cargo clippy --all-targets --all-features -- -D warnings

# Format code
format:
	@echo "Formatting code..."
	@cargo fmt --all

# Run database migrations (requires sqlx-cli installed and DATABASE_URL set)
# cargo install sqlx-cli
# export DATABASE_URL="postgresql://user:pass@host:port/db"
db-check:
	@echo "Checking database connection and migrations..."
	@sqlx database setup --database-url $$DATABASE_URL # Creates DB if not exists, runs migrations
	@sqlx migrate info --database-url $$DATABASE_URL

db-migrate:
	@echo "Running database migrations..."
	@sqlx migrate run --database-url $$DATABASE_URL

db-revert:
	@echo "Reverting last database migration..."
	@sqlx migrate revert --database-url $$DATABASE_URL

db-add-migration:
	@echo "Adding new migration (provide name):"
	@read -p "Migration name: " name; \
	sqlx migrate add -d migrations $$name --database-url $$DATABASE_URL

# Generate offline data for sqlx (useful for CI without DB)
sqlx-prepare:
	@echo "Preparing sqlx offline data..."
	@cargo sqlx prepare --database-url $$DATABASE_URL

# Build Docker image
docker-build:
	@echo "Building Docker image..."
	@docker build -t user-management-rust:latest .

# Run application in Docker (ensure DATABASE_URL is set for the container)
docker-run:
	@echo "Running Docker container..."
	@docker run -p 8080:8080 --env-file .env user-management-rust:latest

# Display help
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  compile         - Build release binaries"
	@echo "  run             - Run the API server (release)"
	@echo "  watch           - Run the API server in watch mode (dev)"
	@echo "  clean           - Remove build artifacts"
	@echo "  test            - Run tests"
	@echo "  coverage        - Run tests with coverage (requires cargo-tarpaulin)"
	@echo "  lint            - Run clippy linter"
	@echo "  format          - Format code with rustfmt"
	@echo "  db-check        - Check DB connection and run migrations"
	@echo "  db-migrate      - Run database migrations (requires sqlx-cli)"
	@echo "  db-revert       - Revert last database migration (requires sqlx-cli)"
	@echo "  db-add-migration - Add a new SQL migration file (requires sqlx-cli)"
	@echo "  sqlx-prepare    - Generate sqlx offline data"
	@echo "  docker-build    - Build the Docker image"
	@echo "  docker-run      - Run the application in a Docker container"
	@echo "  help            - Show this help message"

.PHONY: all compile run watch clean test coverage lint format db-check db-migrate db-revert db-add-migration sqlx-prepare docker-build docker-run help
