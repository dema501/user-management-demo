```
backend-rust/
├── .dockerignore         # Adapted from Go
├── .gitignore            # Standard Rust gitignore + specifics
├── Cargo.toml            # Defined above
├── Dockerfile            # New Rust Dockerfile
├── Makefile              # Adapted for cargo commands
├── README.md             # Updated for Rust
├── Settings.toml         # Configuration file (optional, can rely solely on env/cli)
├── migrations/           # SQL migration files (managed by sqlx-cli)
│   └── YYYYMMDDHHMMSS_create_users.sql
├── sqlx-data.json        # For sqlx offline mode
├── src/
│   ├── bin/
│   │   ├── cli.rs        # CLI entry point
│   │   └── rest_api.rs   # API entry point
│   ├── api/              # Actix handlers (controllers)
│   │   ├── healthcheck.rs
│   │   ├── mod.rs
│   │   └── users.rs
│   ├── app_module.rs     # Shaku module definition
│   ├── cli_app/          # CLI command logic
│   │   ├── commands/
│   │   │   ├── db.rs
│   │   │   ├── mod.rs
│   │   │   └── user.rs
│   │   └── mod.rs
│   ├── config.rs         # Configuration struct and loading
│   ├── database.rs       # Database pool setup
│   ├── domain/           # Core business logic interfaces and models
│   │   ├── models/
│   │   │   ├── mod.rs
│   │   │   └── user.rs
│   │   ├── mod.rs
│   │   ├── repository.rs # Repository traits
│   │   └── service.rs    # Service traits
│   ├── error.rs          # Custom application errors
│   ├── infrastructure/   # Implementations of traits, external interactions
│   │   ├── mod.rs
│   │   ├── persistence/
│   │   │   ├── mod.rs
│   │   │   └── user_repository.rs # Repository implementation
│   │   └── validation.rs # Validation logic
│   ├── logging.rs        # Logging setup
│   ├── services/         # Service implementations
│   │   ├── healthcheck_service.rs
│   │   ├── mod.rs
│   │   └── user_service.rs
│   └── server.rs         # Actix server configuration
├── tests/                # Integration tests (API, maybe CLI)
│   ├── api_integration_tests.rs
│   └── common/
│       └── mod.rs        # Test helpers
└── e2e/                  # End-to-end tests
    ├── docker-compose.yml # Keep as is
    ├── e2e_test.rs       # Rust E2E test code
    └── seed.sql          # Keep as is
```
