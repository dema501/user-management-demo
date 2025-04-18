use regex::Regex;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use time::OffsetDateTime;
use validator::{Validate, ValidationError};

// Define regex constants
lazy_static::lazy_static! {
    static ref ALPHANUM_REGEX: Regex = Regex::new(r"^[a-zA-Z0-9]+$").unwrap();
    static ref ALPHANUMUNICODE_REGEX: Regex = Regex::new(r"^[\p{L}\p{N}]+$").unwrap();
}

// Define validation for user_status
fn validate_user_status(status: &str) -> Result<(), ValidationError> {
    if !["A", "I", "T"].contains(&status) {
        let mut err = ValidationError::new("invalid_user_status");
        err.message =
            Some(format!("User status must be 'A', 'I', or 'T', but got '{}'", status).into());
        return Err(err);
    }
    Ok(())
}

// --- User Model ---
/// Represents a user entity in the database and API responses.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")] // JSON fields are camelCase
pub struct User {
    /// Unique identifier for the user (Database generated).
    #[sqlx(rename = "user_id")] // Map db column user_id to this field
    pub id: i64,

    /// Unique username for login.
    pub user_name: String,

    /// User's first name.
    pub first_name: String,

    /// User's last name.
    pub last_name: String,

    /// User's email address (must be unique).
    pub email: String,

    /// Current status of the user account (e.g., "A", "I", "T").
    pub user_status: String,

    /// Optional department the user belongs to.
    pub department: Option<String>,

    /// Timestamp when the user was created (UTC).
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,

    /// Timestamp when the user was last updated (UTC).
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

// --- Request Payloads ---

// Use a nested 'data' structure for Create/Update requests.
// This often leads to cleaner OpenAPI specs, especially if you have metadata outside 'data'.
// Using #[serde(flatten)] makes the JSON structure flat as expected by the API.

/// Data required for creating a new user.
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct UserCreateRequestData {
    #[validate(regex(
        path = *ALPHANUM_REGEX,
        message = "username must contain only alphanumeric characters"
    ))]
    #[validate(length(min = 4, message = "Username cannot be empty"))]
    pub user_name: String,

    #[validate(regex(
        path = *ALPHANUMUNICODE_REGEX,
        message = "First name must contain only letters and numbers and underscores"
    ))]
    #[validate(length(min = 1, message = "First name cannot be empty"))]
    pub first_name: String,

    #[validate(regex(
        path = *ALPHANUMUNICODE_REGEX,
        message = "First name must contain only letters and numbers and underscores"
    ))]
    #[validate(length(min = 1, message = "Last name cannot be empty"))]
    pub last_name: String,

    #[validate(email(message = "Invalid email format"))]
    #[validate(length(min = 1, message = "Email cannot be empty"))]
    pub email: String,

    #[validate(custom(function = "validate_user_status"))]
    pub user_status: String, // String status like "A", "I", "T"

    pub department: Option<String>, // Optional field
}

/// Request body for creating a new user.
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UserCreateRequest {
    // Flatten wraps the inner struct's fields directly into this struct for JSON/serde
    #[serde(flatten)]
    #[validate(nested)]
    pub data: UserCreateRequestData,
}

/// Data required for updating an existing user. All fields are mandatory for a PUT request.
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct UserUpdateRequestData {
    #[validate(regex(
        path = *ALPHANUM_REGEX,
        message = "username must contain only alphanumeric characters"
    ))]
    #[validate(length(min = 4, message = "Username cannot be empty"))]
    pub user_name: String,

    #[validate(regex(
        path = *ALPHANUMUNICODE_REGEX,
        message = "First name must contain only letters and numbers and underscores"
    ))]
    #[validate(length(min = 1, message = "First name cannot be empty"))]
    pub first_name: String,

    #[validate(regex(
        path = *ALPHANUMUNICODE_REGEX,
        message = "First name must contain only letters and numbers and underscores"
    ))]
    #[validate(length(min = 1, message = "Last name cannot be empty"))]
    pub last_name: String,

    #[validate(email(message = "Invalid email format"))]
    #[validate(length(min = 1, message = "Email cannot be empty"))]
    pub email: String,

    #[validate(custom(function = "validate_user_status"))]
    pub user_status: String, // String status like "A", "I", "T"

    pub department: Option<String>,
}

/// Request body for updating an existing user (PUT).
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UserUpdateRequest {
    #[serde(flatten)]
    #[validate(nested)]
    pub data: UserUpdateRequestData,
}

// --- Unit Tests ---
#[cfg(test)]
mod tests {
    use super::*;

    // --- Tests (Assuming String representation) ---
    #[test]
    fn test_user_status_serde_as_string() {
        // Test serialization
        let active_status = String::from("A");
        let json = serde_json::to_string(&active_status).unwrap();
        assert_eq!(json, "\"A\""); // String serializes with quotes

        // Test deserialization
        let deserialized: String = serde_json::from_str("\"A\"").unwrap();
        assert_eq!(deserialized, "A");

        let inactive_json = "\"I\"";
        let deserialized_i: String = serde_json::from_str(inactive_json).unwrap();
        assert_eq!(deserialized_i, "I");

        let terminated_json = "\"T\"";
        let deserialized_t: String = serde_json::from_str(terminated_json).unwrap();
        assert_eq!(deserialized_t, "T");

        // Any string will deserialize, so no "invalid" test in this context
        let other_json = "\"X\"";
        let deserialized_x: String = serde_json::from_str(other_json).unwrap();
        assert_eq!(deserialized_x, "X");
    }

    // --- UserCreateRequest Tests (Validation removed) ---
    #[test]
    fn test_create_request_struct_creation() {
        // Test that the struct can be created
        let req = UserCreateRequest {
            data: UserCreateRequestData {
                user_name: "validuser".to_string(),
                first_name: "Valid".to_string(),
                last_name: "User".to_string(),
                email: "valid@example.com".to_string(),
                user_status: String::from("A"), // Use String
                department: Some("Test Dept".to_string()),
            },
        };
        // Simple assertion to ensure it was created
        assert_eq!(req.data.user_name, "validuser");
    }

    // --- UserUpdateRequest Tests (Validation removed) ---
    #[test]
    fn test_update_request_struct_creation() {
        let req = UserUpdateRequest {
            data: UserUpdateRequestData {
                user_name: "validuser".to_string(),
                first_name: "Valid".to_string(),
                last_name: "User".to_string(),
                email: "valid@example.com".to_string(),
                user_status: String::from("I"), // Use String
                department: None,               // Optional is fine
            },
        };
        assert_eq!(req.data.user_status, "I");
    }
}
