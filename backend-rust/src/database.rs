use crate::error::{AppError, AppResult};
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::{ConnectOptions, Pool, Postgres};
use std::str::FromStr;
use std::time::Duration;
use tracing::log::LevelFilter; // Use tracing's LevelFilter for SQLx logging

/// Creates and configures a PostgreSQL connection pool.
///
/// # Arguments
///
/// * `database_url` - The PostgreSQL connection string (DSN).
/// * `max_connections` - The maximum number of connections allowed in the pool.
///
/// # Returns
///
/// A `Result` containing the `Pool<Postgres>` or an `AppError`.
pub async fn create_pool(database_url: &str, max_connections: u32) -> AppResult<Pool<Postgres>> {
    if max_connections == 0 {
        return Err(AppError::Config(config::ConfigError::Message(
            "Database 'max_connections' must be greater than 0".to_string(),
        )));
    }

    let masked_dsn = mask_dsn_password(database_url);
    tracing::info!(
        dsn = %masked_dsn, // Log masked DSN
        max_connections = max_connections,
        "Creating database connection pool..."
    );

    // Parse DSN to configure connection options
    let connect_options = PgConnectOptions::from_str(database_url)
        .map_err(|e| {
            tracing::error!(error = %e, "Invalid database DSN format");
            AppError::Config(config::ConfigError::Message(format!(
                "Invalid database DSN: {}",
                e
            )))
        })?
        // Set SQLx statement logging level (adjust as needed)
        // Avoid DEBUG/TRACE in production if sensitive data is in queries
        .log_statements(LevelFilter::Info)
        // Log queries slower than 500ms as warnings
        .log_slow_statements(LevelFilter::Warn, Duration::from_millis(500));

    let pool_options = PgPoolOptions::new()
        .max_connections(max_connections)
        // Timeouts
        .acquire_timeout(Duration::from_secs(15)) // Wait max 15s to get a connection
        .idle_timeout(Duration::from_secs(60 * 10)) // Close idle connections after 10 mins
        .max_lifetime(Duration::from_secs(60 * 60)); // Force reconnect after 1 hour

    // Create the pool
    let pool = pool_options
        .connect_with(connect_options) // Use configured options
        .await
        .map_err(|err| {
            tracing::error!(error = %err, dsn = %masked_dsn, "Failed to create database pool");
            AppError::Database(err) // Wrap sqlx::Error
        })?;

    tracing::debug!("Database pool structure created. Verifying connection...");

    // Perform a simple query to ensure the connection works
    match sqlx::query("SELECT 1").execute(&pool).await {
        Ok(_) => {
            tracing::info!("Database pool connection verified successfully.");
            Ok(pool)
        }
        Err(err) => {
            tracing::error!(error = %err, "Database connection verification failed after pool creation.");
            // Close the pool as the initial connection failed post-creation
            pool.close().await; // Close the pool handle
            Err(AppError::Database(err))
        }
    }
}

/// Masks the password component of a database DSN for safe logging.
pub fn mask_dsn_password(dsn: &str) -> String {
    let (url_with_scheme, added_scheme) = if dsn.contains("://") {
        (dsn.to_string(), false)
    } else {
        (format!("postgres://{}", dsn), true)
    };

    if added_scheme {
        tracing::warn!("Added scheme postgres:// to DSN");
    }

    match url::Url::parse(&url_with_scheme) {
        Ok(mut url) => {
            if url.password().is_some() {
                let _ = url.set_password(Some("*****"));
            }
            url.to_string()
        }
        Err(_) => {
            // Fallback for invalid URLs: Try basic string splitting
            // This is less robust but better than logging the raw string.
            if let Some(at_pos) = dsn.find('@') {
                if let Some(colon_pos) = dsn[..at_pos].rfind(':') {
                    // Found potential user:pass@host
                    format!("{}*****@{}", &dsn[..=colon_pos], &dsn[at_pos + 1..])
                } else {
                    // Found user@host or just host
                    dsn.to_string() // No password detected
                }
            } else {
                // No '@', assume it's just host or invalid, return as is
                dsn.to_string()
            }
        }
    }
}

// --- Test Module ---
#[cfg(test)]
mod tests {
    use super::*;
    use dotenvy::dotenv;
    use std::env;

    // Helper function to get the database URL from environment variables
    fn get_test_db_url() -> String {
        dotenv().ok(); // Load .env file if present
        env::var("DATABASE_URL").expect("DATABASE_URL must be set for database tests")
    }

    #[test]
    fn test_mask_dsn_password_valid() {
        let dsn = "postgres://user:secretpassword@host:5432/dbname?sslmode=require";
        let masked = mask_dsn_password(dsn);
        assert_eq!(
            masked,
            "postgres://user:*****@host:5432/dbname?sslmode=require"
        );
    }

    #[test]
    fn test_mask_dsn_password_no_password() {
        let dsn = "postgres://user@host:5432/dbname";
        let masked = mask_dsn_password(dsn);
        assert_eq!(masked, "postgres://user@host:5432/dbname");
    }

    #[test]
    fn test_mask_dsn_password_only_host() {
        let dsn = "postgres://host:5432/dbname";
        let masked = mask_dsn_password(dsn);
        assert_eq!(masked, "postgres://host:5432/dbname");
    }

    #[test]
    fn test_mask_dsn_password_invalid_url_fallback() {
        // Fallback might not be perfect, but should hide common password patterns
        let dsn = "user:pass@host"; // Not a valid URL according to `url` crate
        let masked = mask_dsn_password(dsn);
        assert_eq!(masked, "postgres://user:*****@host");

        let dsn_no_pass = "user@host";
        let masked_no_pass = mask_dsn_password(dsn_no_pass);
        assert_eq!(masked_no_pass, "postgres://user@host");

        let dsn_just_host = "host";
        let masked_just_host = mask_dsn_password(dsn_just_host);
        assert_eq!(masked_just_host, "postgres://host");
    }

    // These tests require a running PostgreSQL database configured via DATABASE_URL
    // They are integration tests. Use `#[serial_test::serial]` if tests modify shared state.
    #[tokio::test]
    #[ignore] // Ignore by default unless explicitly run with `cargo test -- --ignored`
    async fn test_create_pool_success() {
        let db_url = get_test_db_url();
        let pool_result = create_pool(&db_url, 5).await;

        assert!(
            pool_result.is_ok(),
            "Pool creation failed: {:?}",
            pool_result.err()
        );

        let pool = pool_result.unwrap();
        // Check pool options
        assert_eq!(pool.options().get_max_connections(), 5);

        // Simple query to test connection after pool creation
        let result = sqlx::query_scalar!("SELECT 1 + 1") // Expects an i32 result
            .fetch_one(&pool)
            .await;

        assert!(result.is_ok(), "Test query failed: {:?}", result.err());
        assert_eq!(result.unwrap(), Some(2)); // sqlx scalar returns Option<T>

        pool.close().await;
    }

    #[tokio::test]
    #[ignore]
    async fn test_create_pool_invalid_dsn_format() {
        let db_url = "this-is-not-a-valid-dsn";
        let pool_result = create_pool(db_url, 5).await;

        assert!(pool_result.is_err());
        match pool_result.err().unwrap() {
            AppError::Config(config_err) => {
                // Check if the error message indicates invalid DSN
                assert!(config_err.to_string().contains("Invalid database DSN"));
            }
            e => panic!("Expected AppError::Config, got {:?}", e),
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_create_pool_connection_refused() {
        // Use a DSN likely to fail connection (e.g., wrong port or host)
        let db_url = "postgres://user:pass@localhost:9999/nonexistentdb";
        let pool_result = create_pool(db_url, 5).await;

        assert!(pool_result.is_err());
        match pool_result.err().unwrap() {
            AppError::Database(sqlx_err) => {
                // Check if it's a connection error (specific type might vary)
                assert!(sqlx_err.to_string().contains("error connecting"));
                // Or check for specific error kinds if needed
                // assert!(matches!(sqlx_err, sqlx::Error::Io(_)));
            }
            e => panic!("Expected AppError::Database, got {:?}", e),
        }
    }

    #[tokio::test]
    async fn test_create_pool_zero_connections_error() {
        let db_url = "dummy_url"; // DSN doesn't matter here
        let pool_result = create_pool(db_url, 0).await;

        assert!(pool_result.is_err());
        match pool_result.err().unwrap() {
            AppError::Config(config_err) => {
                assert!(config_err.to_string().contains("must be greater than 0"));
            }
            e => panic!(
                "Expected AppError::Config for zero connections, got {:?}",
                e
            ),
        }
    }
}
