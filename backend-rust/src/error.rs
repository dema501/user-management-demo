use actix_web::{http::StatusCode, HttpResponse, ResponseError};
use serde::{Deserialize, Serialize};
// Added Deserialize
use sqlx::Error as SqlxError;
use std::fmt::{Debug, Formatter};
use validator::ValidationErrors;

// --- Custom Error Enum ---

/// Represents the possible errors that can occur within the application.
#[derive(thiserror::Error)]
pub enum AppError {
    /// Database-related errors.
    #[error("Database error")] // Base message, details in source
    Database(#[from] SqlxError),

    // Validation variant removed
    #[error("Validation error(s)")]
    Validation(#[from] ValidationErrors),

    /// Configuration loading or parsing errors.
    #[error("Configuration error")]
    Config(#[from] config::ConfigError),

    /// Resource not found (e.g., user ID doesn't exist).
    #[error("Not found: {0}")]
    NotFound(String),

    /// Conflict error (e.g., unique constraint violation like username/email exists).
    #[error("Conflict: {0}")]
    Conflict(String),

    /// Invalid request data or format (not covered by validation, e.g., bad JSON).
    #[allow(dead_code)]
    #[error("Bad request: {0}")]
    BadRequest(String),

    /// Generic internal server error for unexpected issues.
    #[allow(dead_code)]
    #[error("Internal server error: {0}")]
    Internal(String), // Keep this for truly unexpected cases

    /// Errors originating from standard I/O operations.
    #[error(transparent)]
    Io(#[from] std::io::Error),

    /// Errors wrapped by anyhow, often from main setup or less specific sources.
    #[error(transparent)]
    Anyhow(#[from] anyhow::Error),
}

// Implement Debug manually to potentially customize output, especially for nested errors.
// The derived Debug is often sufficient.
impl Debug for AppError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        // Basic implementation, could be enhanced to show source errors
        match self {
            AppError::Database(err) => write!(f, "AppError::Database({:?})", err),
            AppError::Config(err) => write!(f, "AppError::Config({:?})", err),
            AppError::NotFound(msg) => write!(f, "AppError::NotFound({})", msg),
            AppError::Conflict(msg) => write!(f, "AppError::Conflict({})", msg),
            AppError::BadRequest(msg) => write!(f, "AppError::BadRequest({})", msg),
            AppError::Internal(msg) => write!(f, "AppError::Internal({})", msg),
            AppError::Io(err) => write!(f, "AppError::Io({:?})", err),
            AppError::Anyhow(err) => write!(f, "AppError::Anyhow({:?})", err),
            AppError::Validation(err) => write!(f, "AppError::Validation({:?})", err),
        }
    }
}

// --- Actix ResponseError Implementation ---

/// Structure for serializing/deserializing errors into a JSON response body.
#[derive(Serialize, Deserialize, Debug, PartialEq)] // Added Deserialize, Debug, PartialEq
pub struct ErrorResponse {
    // Make fields public for direct comparison in tests or add getter methods
    pub status: u16,
    pub error: String, // Use String to own the data after deserialization
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

// Helper struct to satisfy lifetimes for ErrorResponse owned String
struct ErrorResponseOwnedData {
    error_category: &'static str,
    message: Option<String>,
    details: Option<serde_json::Value>,
}

impl ResponseError for AppError {
    /// Determines the HTTP status code associated with each error variant.
    fn status_code(&self) -> StatusCode {
        match self {
            // 4xx Client Errors
            AppError::NotFound(_) => StatusCode::NOT_FOUND, // 404
            AppError::Conflict(_) => StatusCode::CONFLICT,  // 409
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST, // 400

            // Specific DB errors mapping to client errors
            AppError::Database(SqlxError::RowNotFound) => StatusCode::NOT_FOUND, // 404
            AppError::Database(err) if is_unique_constraint_violation(err) => StatusCode::CONFLICT, // 409

            // Validation errors mapping to client errors
            AppError::Validation(_) => StatusCode::BAD_REQUEST,

            // 5xx Server Errors
            AppError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR, // 500 (Default for DB errors)
            AppError::Config(_) => StatusCode::INTERNAL_SERVER_ERROR,   // 500
            AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR, // 500
            AppError::Io(_) => StatusCode::INTERNAL_SERVER_ERROR,       // 500
            AppError::Anyhow(_) => StatusCode::INTERNAL_SERVER_ERROR,   // 500
        }
    }

    /// Creates the HTTP response body for the error.
    fn error_response(&self) -> HttpResponse {
        let status = self.status_code();
        let ErrorResponseOwnedData {
            error_category,
            message,
            details,
        } = self.get_response_details();

        // Log the full error details internally before sending response
        if status.is_server_error() {
            tracing::error!(error.status = %status, error.category = error_category, error.message = ?message, error.details = ?details, error.source = ?self, "API Error Response (5xx)");
        } else {
            // Use warn for 4xx, but info might also be appropriate depending on the error type
            tracing::warn!(error.status = %status, error.category = error_category, error.message = ?message, error.details = ?details, error.source = ?self, "API Error Response (4xx)");
        }

        HttpResponse::build(status).json(ErrorResponse {
            status: status.as_u16(),
            error: error_category.to_string(), // Convert &'static str to String
            message,
            details,
        })
    }
}

impl AppError {
    /// Helper function to extract details for the JSON response body.
    fn get_response_details(&self) -> ErrorResponseOwnedData {
        match self {
            AppError::NotFound(msg) => ErrorResponseOwnedData {
                error_category: "Not Found",
                message: Some(msg.clone()),
                details: None,
            },
            AppError::Conflict(msg) => ErrorResponseOwnedData {
                error_category: "Conflict",
                message: Some(msg.clone()),
                details: None,
            },
            AppError::BadRequest(msg) => ErrorResponseOwnedData {
                error_category: "Bad Request",
                message: Some(msg.clone()),
                details: None,
            },
            AppError::Database(SqlxError::RowNotFound) => ErrorResponseOwnedData {
                error_category: "Not Found",
                message: Some("The requested resource was not found.".to_string()),
                details: None,
            },
            AppError::Database(err) if is_unique_constraint_violation(err) => {
                ErrorResponseOwnedData {
                    error_category: "Conflict",
                    message: Some(
                        "A resource with the provided identifier(s) already exists.".to_string(),
                    ),
                    details: None,
                }
            }
            AppError::Validation(errors) => ErrorResponseOwnedData {
                error_category: "Validation Error", // Or "Bad Request"
                message: Some("Input validation failed. Check details.".to_string()),
                // Serialize the ValidationErrors into a serde_json::Value for the details field
                details: serde_json::to_value(errors).ok(), // Use .ok() to ignore serialization errors (shouldn't happen)
            },
            // Generic Server Errors (avoid leaking internal details)
            AppError::Database(_)
            | AppError::Internal(_)
            | AppError::Io(_)
            | AppError::Anyhow(_)
            | AppError::Config(_) => ErrorResponseOwnedData {
                error_category: "Internal Server Error",
                message: Some("An unexpected error occurred on the server.".to_string()),
                details: None,
            },
        }
    }
}

/// Checks if an sqlx::Error represents a unique constraint violation (Postgres specific).
/// This might need adjustment based on the specific database and driver.
fn is_unique_constraint_violation(err: &SqlxError) -> bool {
    if let SqlxError::Database(db_err) = err {
        // Postgres unique violation code is "23505"
        // Use the trait method `code()` which returns Option<&str>
        if db_err.code().is_some_and(|code| code == "23505") {
            return true;
        }
    }
    false
}

// --- Type Alias for Results ---

/// A convenience type alias for `Result<T, AppError>`.
pub type AppResult<T> = Result<T, AppError>;

// --- Unit Tests ---
#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::body::to_bytes;
    // Import directly
    use actix_web::http::StatusCode;
    use sqlx::error::DatabaseError;
    use std::borrow::Cow;

    // Mock Database Error for testing status codes
    #[derive(Debug)]
    struct MockDbError {
        code: Option<String>,
        message: String,
    }

    impl std::error::Error for MockDbError {}

    impl std::fmt::Display for MockDbError {
        fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
            write!(f, "MockDbError: {}", self.message)
        }
    }

    // Implement the DatabaseError trait for the mock
    impl DatabaseError for MockDbError {
        fn message(&self) -> &str {
            &self.message
        }

        fn code(&self) -> Option<Cow<'_, str>> {
            self.code.as_deref().map(Cow::Borrowed)
        }

        // Other methods can return None or default values if not needed for the test
        fn kind(&self) -> sqlx::error::ErrorKind {
            sqlx::error::ErrorKind::Other // Or map based on code if necessary
        }
        // Implement other required methods with default/dummy values if needed
        fn as_error(&self) -> &(dyn std::error::Error + Send + Sync + 'static) {
            self
        }
        fn as_error_mut(&mut self) -> &mut (dyn std::error::Error + Send + Sync + 'static) {
            self
        }
        fn into_error(self: Box<Self>) -> Box<dyn std::error::Error + Send + Sync + 'static> {
            self
        }
    }

    #[test]
    fn test_status_codes() {
        assert_eq!(
            AppError::NotFound("test".into()).status_code(),
            StatusCode::NOT_FOUND
        );
        assert_eq!(
            AppError::Conflict("test".into()).status_code(),
            StatusCode::CONFLICT
        );
        assert_eq!(
            AppError::BadRequest("test".into()).status_code(),
            StatusCode::BAD_REQUEST
        );
        assert_eq!(
            AppError::Internal("test".into()).status_code(),
            StatusCode::INTERNAL_SERVER_ERROR
        );
        // Ensure config crate is accessible or mock ConfigError construction
        // Assuming config::ConfigError::NotFound exists and is constructible
        assert_eq!(
            AppError::Config(config::ConfigError::NotFound("f".into())).status_code(),
            StatusCode::INTERNAL_SERVER_ERROR
        );
        assert_eq!(
            AppError::Io(std::io::Error::new(std::io::ErrorKind::Other, "test")).status_code(),
            StatusCode::INTERNAL_SERVER_ERROR
        );
        assert_eq!(
            AppError::Anyhow(anyhow::anyhow!("test")).status_code(),
            StatusCode::INTERNAL_SERVER_ERROR
        );

        // Database errors
        assert_eq!(
            AppError::Database(SqlxError::RowNotFound).status_code(),
            StatusCode::NOT_FOUND
        );

        // Simulate a unique constraint violation error using the mock
        let unique_db_error = MockDbError {
            code: Some("23505".to_string()),
            message: "duplicate key".to_string(),
        };
        let unique_error = SqlxError::Database(Box::new(unique_db_error));
        assert_eq!(
            AppError::Database(unique_error).status_code(),
            StatusCode::CONFLICT
        );

        // Simulate another DB error using the mock (no specific code)
        let other_mock_db_error = MockDbError {
            code: Some("xxxxx".to_string()), // Different code
            message: "some other db error".to_string(),
        };
        let other_db_error_mocked = SqlxError::Database(Box::new(other_mock_db_error));
        assert_eq!(
            AppError::Database(other_db_error_mocked).status_code(),
            StatusCode::INTERNAL_SERVER_ERROR
        );

        // Test with a non-Database variant of SqlxError
        let pool_error = SqlxError::PoolTimedOut;
        assert_eq!(
            AppError::Database(pool_error).status_code(),
            StatusCode::INTERNAL_SERVER_ERROR
        );
    }

    // Helper needs to be async because `to_bytes` is async
    async fn get_error_response_body(app_error: AppError) -> ErrorResponse {
        let response = app_error.error_response();
        let body_bytes = to_bytes(response.into_body()).await.unwrap();
        serde_json::from_slice(&body_bytes).unwrap_or_else(|e| {
            panic!(
                "Failed to deserialize error response body: {:?}, Body: {}",
                e,
                String::from_utf8_lossy(&body_bytes)
            )
        })
    }

    #[actix_web::test]
    async fn test_error_response_formatting() {
        // Not Found
        let not_found_err = AppError::NotFound("User 123 not found".to_string());
        // Use .await when calling the async helper function
        let body_nf = get_error_response_body(not_found_err).await;
        assert_eq!(body_nf.status, 404);
        assert_eq!(body_nf.error, "Not Found");
        assert_eq!(body_nf.message, Some("User 123 not found".to_string()));
        assert!(body_nf.details.is_none());

        // Conflict
        let conflict_err = AppError::Conflict("Email already exists".to_string());
        let body_c = get_error_response_body(conflict_err).await; // Use .await
        assert_eq!(body_c.status, 409);
        assert_eq!(body_c.error, "Conflict");
        assert_eq!(body_c.message, Some("Email already exists".to_string()));
        assert!(body_c.details.is_none());

        // Internal Server Error (generic message)
        let internal_err = AppError::Internal("Something broke!".to_string());
        let body_i = get_error_response_body(internal_err).await; // Use .await
        assert_eq!(body_i.status, 500);
        assert_eq!(body_i.error, "Internal Server Error");
        assert!(body_i.message.is_some());
        assert_eq!(
            body_i.message.unwrap(),
            "An unexpected error occurred on the server."
        ); // Generic message
        assert!(body_i.details.is_none());

        // Database Row Not Found (maps to 404 Not Found)
        let db_not_found_err = AppError::Database(SqlxError::RowNotFound);
        let body_db_nf = get_error_response_body(db_not_found_err).await; // Use .await
        assert_eq!(body_db_nf.status, 404);
        assert_eq!(body_db_nf.error, "Not Found");
        assert_eq!(
            body_db_nf.message,
            Some("The requested resource was not found.".to_string())
        );
        assert!(body_db_nf.details.is_none());
    }
}
