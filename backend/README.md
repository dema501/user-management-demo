# User Management System - Backend

## Overview

This is backend for web application for managing users. The system provides basic CRUD (Create, Read, Update, Delete) operations for user management with a REST API backend built in Go and utilizing modern libraries and best practices.

## Requirements

### Backend
- Go 1.22+
- PostgreSQL database
- Docker (optional, for containerized deployment)

### Libraries and Frameworks
- **Web Framework**: [Echo](https://echo.labstack.com/) - High performance, minimalist Go web framework
- **Database Access**: [Bun](https://bun.uptrace.dev/) - SQL-first Golang ORM
- **Command Line Interface**: [urfave/cli](https://github.com/urfave/cli) - A simple, fast, and fun package for building command line apps in Go
- **Testing**:
  - [Ginkgo](https://github.com/onsi/ginkgo) - BDD-style testing framework
  - [Gomega](https://github.com/onsi/gomega) - Matcher/assertion library

## Project Structure

The project follows a clean MVC architecture with clear separation of concerns:

```
user-management/
├── backend/
│   ├── cmd/
│   │   ├── cli/           # Command-line interface tool
│   │   └── rest/          # REST API server
│   ├── docs/
│   │   └── swagger/       # API documentation
│   ├── internal/
│   │   ├── api/           # HTTP handlers (Controller)
│   │   ├── config/        # Configuration
│   │   ├── migrations/    # Database migrations
│   │   ├── models/        # Domain models
│   │   ├── repository/    # Data access layer
│   │   └── service/       # Business logic
│   ├── tests/             # Integration tests and test data
│   ├── Dockerfile
│   ├── go.mod
│   ├── go.sum
│   └── Makefile
```

## API Features

The API provides the following endpoints:

- `GET /api/v1/users` - List all users
- `GET /api/v1/users/{id}` - Get a specific user by ID
- `POST /api/v1/users` - Create a new user
- `PUT /api/v1/users/{id}` - Update an existing user
- `DELETE /api/v1/users/{id}` - Delete a user

API documentation is available through Swagger UI at `/swagger/index.html`.

## Getting Started

### Prerequisites

- Go 1.22 or later
- PostgreSQL database
- Make (optional, for using the Makefile commands)

### Setting Up the Database

1. Create a PostgreSQL database
2. Use the provided migration tools to set up the schema:

```bash
# Set your database connection string
export DSN="postgresql://username:password@localhost:5432/database_name?sslmode=disable"

# Run database migrations
go run cmd/cli/main.go --dsn "${DSN}" db init
go run cmd/cli/main.go --dsn "${DSN}" db migrate
```

### Running the API Server

```bash
# Development mode with hot reload
make dev

# Or run directly
go run cmd/rest/main.go --dsn "${DSN}" -vvv
```

The API will be available at http://localhost:8080.

### Building Docker Image

```bash
docker build -t user-management:latest .
```

### Running with Docker

```bash
docker run -p 8080:8080 \
  -e DSN="postgresql://username:password@host.docker.internal:5432/database_name?sslmode=disable" \
  user-management:latest
```

## Command-Line Interface

The project includes a CLI tool for database management and user operations:

### Database Commands

```bash
# Initialize the database
go run cmd/cli/main.go --dsn "${DSN}" db init

# Run migrations
go run cmd/cli/main.go --dsn "${DSN}" db migrate

# Roll back the last migration
go run cmd/cli/main.go --dsn "${DSN}" db rollback

# Create a new migration
go run cmd/cli/main.go --dsn "${DSN}" db create_go migration_name
```

### User Management Commands

```bash
# List all users
go run cmd/cli/main.go --dsn "${DSN}" user list

# Get a specific user
go run cmd/cli/main.go --dsn "${DSN}" user get --id 1

# Create a user
go run cmd/cli/main.go --dsn "${DSN}" user create \
  --username johndoe \
  --first-name John \
  --last-name Doe \
  --email john.doe@example.com \
  --status A \
  --department Engineering

# Update a user
go run cmd/cli/main.go --dsn "${DSN}" user update \
  --id 1 \
  --username johndoe \
  --email new.email@example.com

# Delete a user
go run cmd/cli/main.go --dsn "${DSN}" user delete --id 1
```

## Development

### Makefile Commands

The project includes a Makefile with various helpful commands:

```bash
make compile    # Compile the application locally
make run        # Run the application
make test       # Run tests
make docs       # Generate API documentation
make swagger    # Generate Swagger documentation
make dev        # Run with hot reload for development
```

### Testing

Run the tests with:

```bash
make test

# Or directly with Go
go test -v ./...
```

## API Documentation

Swagger documentation is available at `/swagger/index.html` when the server is running.

To regenerate the Swagger documentation after API changes:

```bash
make swagger
```

## Project Highlights

- **Clean Architecture**: Following MVC pattern with clear separation of concerns
- **Validation**: Robust request validation with detailed error messages
- **Error Handling**: Consistent error responses throughout the API
- **Logging**: Structured JSON logging with different verbosity levels
- **CLI Tool**: Feature-rich command-line interface for database and user management
- **Docker Support**: Easy containerization for deployment
- **Graceful Shutdown**: Proper handling of shutdown signals
- **API Documentation**: Comprehensive Swagger documentation

## License

This project is licensed under the MIT License - see the LICENSE file for details.
