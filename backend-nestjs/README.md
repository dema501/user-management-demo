<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# User Management System - Backend (NestJS)

## Overview

This is the NestJS backend for a web application designed for managing users. The system provides basic CRUD (Create, Read, Update, Delete) operations for user management via a REST API, built using the NestJS framework and leveraging modern libraries like Drizzle ORM and Zod for validation.

## Requirements

### Backend
- Node.js (LTS recommended, check `package.json` for specific engine requirements if available)
- Bun (Used as package manager and runner)
- PostgreSQL database
- Docker (optional, for containerized deployment)

### Libraries and Frameworks
- **Web Framework**: [NestJS](https://nestjs.com/) - A progressive Node.js framework for building efficient, reliable and scalable server-side applications.
- **Database ORM**: [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM that focuses on type safety and developer experience.
- **Validation**: [Zod](https://zod.dev/) - TypeScript-first schema declaration and validation library.
- **Configuration**: [@nestjs/config](https://docs.nestjs.com/techniques/configuration) - Configuration module for NestJS applications.
- **API Documentation**: [@nestjs/swagger](https://docs.nestjs.com/openapi/introduction) - Integrates Swagger UI for API documentation.
- **Testing**: [Bun Test](https://bun.sh/docs/test/writing) - Built-in testing framework used in this project.

## Project Structure

The project follows a standard NestJS modular structure:

```
user-management/
├── backend-nestjs/
│   ├── src/
│   │   ├── app.controller.ts     # Root controller (e.g., for redirects)
│   │   ├── app.module.ts         # Root application module
│   │   ├── main.ts               # Application entry point
│   │   ├── common/               # Common utilities (e.g., pipes, interceptors)
│   │   │   └── pipes/
│   │   │       └── zod-validation.pipe.ts # Zod validation pipe
│   │   ├── database/             # Database connection, schema, migrations
│   │   │   ├── drizzle.provider.ts # Drizzle ORM provider setup
│   │   │   ├── database.module.ts  # Database module
│   │   │   ├── schema.ts           # Drizzle ORM schema definition
│   │   │   └── migrations/         # Drizzle Kit migrations
│   │   ├── health/               # Health check endpoint module
│   │   │   ├── health.controller.ts
│   │   │   └── health.module.ts
│   │   └── users/                # User feature module
│   │       ├── dto/                # Data Transfer Objects (Validated by Zod, used by Swagger)
│   │       ├── schemas/            # Zod schemas for validation and type inference
│   │       ├── users.controller.ts # API request handlers (Controller)
│   │       ├── users.module.ts     # Feature module definition
│   │       └── users.service.ts    # Business logic (Service)
│   ├── test/                     # End-to-end tests
│   ├── .env.example              # Example environment variables
│   ├── .eslintrc.js              # ESLint configuration
│   ├── bun.lockb                 # Bun lock file
│   ├── Dockerfile                # (Optional) Dockerfile for containerization
│   ├── drizzle.config.ts         # Drizzle Kit configuration
│   ├── nest-cli.json             # NestJS CLI configuration
│   ├── package.json              # Project dependencies and scripts
│   ├── README.md                 # This file
│   └── tsconfig.json             # TypeScript configuration
```

## API Features

The API provides the following endpoints under the `/api/v1` prefix:

- `GET /users` - List all users
- `GET /users/{id}` - Get a specific user by ID
- `POST /users` - Create a new user (with Zod validation)
- `PUT /users/{id}` - Update an existing user (with Zod validation)
- `DELETE /users/{id}` - Delete a user
- `GET /status` - Get API status and basic health info (DB connection, memory, uptime)

API documentation is available through Swagger UI at `/api/v1/docs`.

## Getting Started

### Prerequisites

- Node.js (check `package.json` engines or use LTS)
- Bun (`npm install -g bun`)
- PostgreSQL database
- Docker (optional)

### Setting Up the Database

1.  **Configure Environment Variables:**
    Copy `.env.example` to `.env` (or `.env.development`, `.env.production`) and fill in your PostgreSQL connection string:
    ```bash
    # .env
    DSN="postgresql://username:password@localhost:5432/database_name?sslmode=disable"
    # Other variables like PORT, NODE_ENV might also be needed
    ```
    *Note: The application uses `@nestjs/config` which loads `.env.{NODE_ENV}` and falls back to `.env`.*

2.  **Run Database Migrations:**
    Use Drizzle Kit to apply the database schema migrations:
    ```bash
    bun run migrate
    ```

### Running the API Server

```bash
# Install dependencies
bun install

# Development mode with hot reload (uses .env.development or .env)
bun run start:dev

# Production mode (uses .env.production or .env)
# Build step might be required first depending on setup
bun run build # (if needed)
bun run start:prod
```

The API will typically be available at `http://localhost:3000` (or the `PORT` specified in your `.env` file). The base path for the API is `/api/v1`.

### Building Docker Image (If Dockerfile is present)

```bash
docker build -t user-management-nestjs:latest .
```

### Running with Docker (If Dockerfile is present)

```bash
# Make sure to replace placeholders with your actual DB details
# Use host.docker.internal for localhost access from container on Docker Desktop
docker run -p 3000:3000 \
  -e DSN="postgresql://username:password@host.docker.internal:5432/database_name?sslmode=disable" \
  -e NODE_ENV="production" \
  user-management-nestjs:latest
```

## Development

### Available Bun Scripts (Check `package.json`)

Common scripts usually include:

```bash
# Run in development mode with watch
bun run start:dev

# Build for production
bun run build

# Run in production mode (after build)
bun run start:prod

# Run linters
bun run lint

# Run formatters (e.g., Prettier)
bun run format

# Run database migrations
bun run migrate

# Generate new database migration
bun run migrate:generate MIGRATION_NAME

# Run unit tests (using bun:test)
bun run test

# Run end-to-end tests
bun run test:e2e

# Run tests with coverage
bun run test:cov
```

### Testing

Run the tests using Bun's built-in test runner:

```bash
# Run unit tests (files matching *.spec.ts)
bun run test

# Run end-to-end tests (files matching *.e2e-spec.ts)
bun run test:e2e
```

## API Documentation

Swagger documentation is automatically generated based on decorators in the controllers and DTOs. Access it at `/api/v1/docs` when the server is running.

No manual generation step (`make swagger`) is typically needed, as it's integrated into the NestJS application lifecycle.

## Project Highlights

- **Clean Architecture**: Leverages NestJS modules, controllers, and services for separation of concerns.
- **Type Safety**: End-to-end type safety with TypeScript, Drizzle ORM, and Zod.
- **Validation**: Robust request validation using Zod schemas integrated via a custom NestJS pipe.
- **Database Management**: SQL migrations managed by Drizzle Kit.
- **Configuration**: Environment-aware configuration using `@nestjs/config` with Zod validation for environment variables.
- **Error Handling**: Consistent error responses using NestJS built-in exception filters and custom exceptions.
- **Logging**: Structured logging using `@nestjs/common` Logger.
- **API Documentation**: Automatic Swagger UI generation via `@nestjs/swagger`.
- **Health Check**: Simple `/status` endpoint for monitoring basic application health.
- **Testing**: Unit and E2E tests using `bun:test`.
- **Docker Support**: Ready for containerization (requires `Dockerfile`).
- **Graceful Shutdown**: Properly handles shutdown signals via NestJS `enableShutdownHooks`.

## License

This project is MIT licensed.
