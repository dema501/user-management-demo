# User Management System - Backend (Rust)

## Overview

This is the backend for a web application for managing users. The system provides basic CRUD (Create, Read, Update, Delete) operations for user management via a REST API built in Rust, utilizing modern libraries and best practices like asynchronous processing and strong typing.

## Requirements

### Backend
- Rust 1.70+ (Stable)
- PostgreSQL database (Version 12+)
- `sqlx-cli` for database migrations (`cargo install sqlx-cli`)
- Docker (optional, for containerized deployment)

### Libraries and Frameworks
- **Web Framework**: [Actix Web](https://actix.rs/) - A powerful, pragmatic, and extremely fast web framework for Rust.
- **Database Access**: [SQLx](https://github.com/launchbadge/sqlx) - Compile-time verified, async-ready SQL toolkit.
- **Configuration**: [Clap](https://github.com/clap-rs/clap) (CLI args/env), [config-rs](https://github.com/mehcode/config-rs) (file loading)
- **Logging**: [Tracing](https://github.com/tokio-rs/tracing) - Application-level tracing framework.
- **Async Runtime**: [Tokio](https://tokio.rs/) - Runtime for writing reliable network applications.
- **Error Handling**: [thiserror](https://github.com/dtolnay/thiserror) - Crate for deriving `std::error::Error`.
- **Testing**: Standard Rust testing (`#[test]`), `tokio::test`, `actix_web::test`.

## Project Structure

The project follows a layered architecture promoting separation of concerns:

```
backend-rust/
├── .dockerignore         # Files to ignore in Docker builds
├── .gitignore            # Standard Rust gitignore + specifics
├── Cargo.toml            # Rust project manifest and dependencies
├── Dockerfile            # Multi-stage Dockerfile for building and running the Rust app
├── Makefile              # Common development tasks (build, run, test, lint, etc.)
├── README.md             # This file
├── Settings.toml         # Example configuration file (optional, values can be set via env/CLI)
├── src/
│   ├── api/              # API endpoint handlers (Actix Web)
│   │   ├── health.rs     # Handles /health endpoint
│   │   ├── mod.rs        # Configures API routes (/api/v1 scope)
│   │   └── users.rs      # Handles /users CRUD endpoints
│   ├── config.rs         # Configuration struct (AppConfig) and loading logic (clap, config-rs)
│   ├── database.rs       # Database connection pool setup (sqlx, PgPool)
│   ├── domain/           # Core domain models
│   │   ├── models/       # Data structures representing domain entities and requests/responses
│   │   │   ├── mod.rs    # Re-exports models
│   │   │   └── users.rs # Defines User, UserCreate/UpdateRequest structs
│   │   │   └── health.rs # Defines User, HealthStatus structs
│   │   └── mod.rs        # Domain module declaration
│   ├── error.rs          # Custom application errors (AppError), ResponseError implementation
│   ├── logging.rs        # Logging setup using tracing and tracing-subscriber
│   ├── main.rs           # Application entry point: loads config, sets up logging, DB pool, services, and starts Actix server
│   ├── repository/       # Data access layer implementations
│   │   ├── mod.rs        # Repository module declaration
│   │   └── user_repository.rs # UserRepository implementation interacting with the database
│   └── service/          # Business logic layer implementations
│       ├── mod.rs        # Service module declaration
│       └── user_service.rs # UserService implementation containing user-related business logic
```


## API Features

The API provides the following endpoints under the `/api/v1` prefix:

- `GET /users` - List all users
- `GET /users/{id}` - Get a specific user by ID
- `POST /users` - Create a new user
- `PUT /users/{id}` - Update an existing user
- `DELETE /users/{id}` - Delete a user
- `GET /health` - Check API health (DB connection, uptime)

*(Note: API documentation generation, e.g., via Swagger/OpenAPI with tools like `utoipa`, is not currently implemented but could be added.)*

## Getting Started

### Prerequisites

- Rust (stable toolchain, see `Cargo.toml` or use 1.70+)
- PostgreSQL database (running locally or in Docker)
- `sqlx-cli` (`cargo install sqlx-cli`)
- Make (optional, for using the Makefile commands)

### Setting Up the Database

1.  Ensure PostgreSQL is running.
2.  Create a database for the application.
3.  Set the database connection string as an environment variable:
    ```bash
    # Example for Linux/macOS
    export DATABASE_URL="postgresql://username:password@localhost:5432/database_name?sslmode=disable"
    # Example for Windows PowerShell
    $env:DATABASE_URL="postgresql://username:password@localhost:5432/database_name?sslmode=disable"
    ```
    *(Adjust username, password, host, port, and database_name accordingly)*
4.  Prepare the database using `sqlx-cli`:
    ```bash
    # Create the database if it doesn't exist (requires DB admin privileges)
    sqlx database create

    # Run database migrations (ensure you are in the backend-rust directory)
    sqlx migrate run
    ```
5.  (Optional) Prepare `sqlx-data.json` for offline query checks:
    ```bash
    cargo install sqlx-cli # (If not already installed)
    sqlx prepare --check # Check queries against live DB (run this after schema changes)
    ```

### Running the API Server

Configure the application using environment variables (priority: CLI > Env > File > Defaults) or a `Settings.toml` file. Key environment variables:
- `DATABASE_URL`: Overrides any other DSN setting.
- `APP_HTTP_HOST`: Server host (Default: `127.0.0.1`)
- `APP_HTTP_PORT`: Server port (Default: `8080`)
- `APP_DB_DSN`: Database DSN (alternative to `DATABASE_URL`)
- `APP_DB_MAX_OPEN_CONNS`: Max DB connections (Default: `10`)
- `APP_VERBOSE`: Verbosity level (0=Error, 1=Warn, 2=Info, 3=Debug, 4+=Trace). Add `-v`, `-vv`, `-vvv` flags to override.
- `RUST_LOG`: Alternative way to control logging levels (e.g., `RUST_LOG=backend_rust=debug,warn`). Verbosity flags (`-v`) take precedence for the app's log level if set.

```bash
# Ensure DATABASE_URL is set or configure via Settings.toml/other env vars

# Run using cargo (development, includes compilation)
cargo run -- -vv # Run with INFO level logging for the app

# Run with TRACE logging for the app, INFO for others
cargo run -- -vvvv

# Build release and run optimized binary
cargo build --release
./target/release/backend-rust -v # Run release build with WARN level

# Use Makefile commands (if available)
make run  # Check Makefile for exact behavior (might run debug/release)
make watch # Run with automatic recompilation on changes (requires cargo-watch)
```

The API will typically be available at `http://127.0.0.1:8080` (or as configured).

### Building Docker Image

```bash
# Build the image using the provided Dockerfile
docker build -t user-management-rust:latest .
```

### Running with Docker Compose

```bash
cd user-management
docker compose up backendrust
```

## Development

### Makefile Commands

The project includes a Makefile with various helpful commands (check the `Makefile` for details):

```bash
make build      # Build the application (debug)
make run        # Run the application (debug)
make test       # Run tests (unit and integration)
make test-int   # Run only ignored (integration) tests
make check      # Run cargo check (fast compile check)
make lint       # Run clippy (linter)
make fmt        # Format code with cargo fmt
make watch      # Run with hot reload via cargo-watch
make docker-build # Build the Docker image
# ... other commands may be present
```

### Testing

Run tests using Cargo:

```bash
# Run all unit tests
cargo test

# Run integration tests (often marked #[ignore], requiring a DB)
cargo test -- --ignored

# Run all tests
cargo test -- --include-ignored

# Use Makefile
make test       # Might run unit or all tests (check Makefile)
make test-int   # Typically runs ignored tests
```

## Project Highlights

- **Layered Architecture**: Clear separation between API handlers, business logic (Services), and data access (Repositories).
- **Asynchronous**: Built entirely on async Rust using Tokio and Actix Web for high concurrency.
- **Type Safety**: Leverages Rust's strong type system to prevent many common errors at compile time.
- **Database Integration**: Uses `sqlx` for compile-time checked SQL queries and robust connection pooling.
- **Configuration Flexibility**: Supports configuration via CLI flags, environment variables, and TOML files.
- **Structured Logging**: Uses `tracing` for configurable, structured (JSON) logging.
- **Error Handling**: Centralized application error type (`AppError`) with automatic mapping to HTTP responses.
- **Docker Support**: Multi-stage `Dockerfile` for creating optimized, small container images.
- **Graceful Shutdown**: Handles SIGINT/Ctrl+C for clean server shutdown.
- **Dependency Management**: Uses Cargo for straightforward dependency handling.

*(Note: Advanced request validation (beyond type checks and basic deserialization) and a dedicated CLI tool are not part of the current core features but could be added.)*

## License

This project is licensed under the MIT License - see the LICENSE file for details. (Assuming MIT, update if necessary).
