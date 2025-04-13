use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use time::OffsetDateTime;

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
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserCreateRequestData {
    pub user_name: Option<String>, // Use Option for potentially better validation messages later
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub user_status: Option<String>, // String status like "A", "I", "T"
    pub department: Option<String>,  // Optional field
}

/// Request body for creating a new user.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserCreateRequest {
    // Flatten wraps the inner struct's fields directly into this struct for JSON/serde
    #[serde(flatten)]
    pub data: UserCreateRequestData,
}

/// Data required for updating an existing user. All fields are mandatory for a PUT request.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserUpdateRequestData {
    pub user_name: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub user_status: Option<String>, // String status like "A", "I", "T"
    pub department: Option<String>,
}

/// Request body for updating an existing user (PUT).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserUpdateRequest {
    #[serde(flatten)]
    pub data: UserUpdateRequestData,
}

// --- Healthcheck Response Model ---
/// Represents the health status of the API and its dependencies.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthStatus {
    /// Status of the database connection ("OK" or "FAIL").
    db_status: String,
    /// Server uptime duration (e.g., "1h 15m 30s").
    uptime: String,
    // Add mem_usage back if you implement it using sysinfo or similar
    //
    // mem_usage: String,
}

impl HealthStatus {
    /// Creates a new HealthStatus instance.
    pub fn new(db_ok: bool, uptime_duration: Option<time::Duration>) -> Self {
        let db_status = if db_ok { "OK" } else { "FAIL" }.to_string();

        let uptime_str = uptime_duration.map_or_else(
            || "N/A".to_string(),
            |duration| {
                // Format duration into a human-readable string
                let secs = duration.whole_seconds();
                let hours = secs / 3600;
                let mins = (secs % 3600) / 60;
                let secs = secs % 60;

                let mut parts = Vec::new();
                if hours > 0 {
                    parts.push(format!("{}h", hours));
                }
                if mins > 0 {
                    parts.push(format!("{}m", mins));
                }
                // Always include seconds unless duration is exactly 0
                if secs > 0 || parts.is_empty() {
                    parts.push(format!("{}s", secs));
                }

                parts.join(" ")
            },
        );

        HealthStatus {
            db_status,
            uptime: uptime_str,
            // mem_usage: "N/A".to_string(), // Placeholder if not implemented
        }
    }
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
                user_name: Some("validuser".to_string()),
                first_name: Some("Valid".to_string()),
                last_name: Some("User".to_string()),
                email: Some("valid@example.com".to_string()),
                user_status: Some(String::from("A")), // Use String
                department: Some("Test Dept".to_string()),
            },
        };
        // Simple assertion to ensure it was created
        assert_eq!(req.data.user_name.unwrap(), "validuser");
    }

    /* // Validation tests commented out as per prompt
    #[test]
    fn test_create_request_valid() {
        let req = UserCreateRequest {
            data: UserCreateRequestData {
                user_name: Some("validuser".to_string()),
                first_name: Some("Valid".to_string()),
                last_name: Some("User".to_string()),
                email: Some("valid@example.com".to_string()),
                user_status: Some(String::from("A")), // Use String
                department: Some("Test Dept".to_string()),
            },
        };
        // Validate the outer request struct, which triggers validation on inner 'data' field
        // assert!(req.validate().is_ok()); // REMOVED
    }

    #[test]
    fn test_create_request_missing_required() {
        let req = UserCreateRequest {
            data: UserCreateRequestData {
                user_name: None, // Missing username
                first_name: Some("Valid".to_string()),
                last_name: Some("User".to_string()),
                email: Some("valid@example.com".to_string()),
                user_status: Some(String::from("A")), // Use String
                department: None,
            },
        };
        // let errors = req.validate().unwrap_err(); // REMOVED
        // Pass the errors object directly to the helper
        // validate_err_codes(&errors, &["user_name"], &["required"]); // REMOVED
    }

    #[test]
    fn test_create_request_invalid_format() {
        let req = UserCreateRequest {
            data: UserCreateRequestData {
                user_name: Some("invalid-user!".to_string()), // Invalid chars
                first_name: Some("Valid".to_string()),
                last_name: Some("User".to_string()),
                email: Some("invalid-email".to_string()), // Invalid email
                user_status: Some(String::from("A")), // Use String
                department: None,
            },
        };
        // let errors = req.validate().unwrap_err(); // REMOVED
        // Check that both username (regex) and email (email format) errors occurred
        // assert!(errors.field_errors().contains_key("user_name")); // REMOVED
        // assert!(errors.field_errors().contains_key("email")); // REMOVED
        // validate_err_codes(&errors, &["user_name"], &["regex"]); // REMOVED
        // validate_err_codes(&errors, &["email"], &["email"]); // REMOVED
    }

    #[test]
    fn test_create_request_length_errors() {
        let req = UserCreateRequest {
            data: UserCreateRequestData {
                user_name: Some("abc".to_string()), // Too short
                first_name: Some("".to_string()),   // Too short (violates min=1)
                last_name: Some("User".to_string()),
                email: Some("valid@example.com".to_string()),
                user_status: Some(String::from("A")), // Use String
                department: None,
            },
        };
        // let errors = req.validate().unwrap_err(); // REMOVED
        // assert!(errors.field_errors().contains_key("user_name")); // REMOVED
        // assert!(errors.field_errors().contains_key("first_name")); // REMOVED
        // validate_err_codes(&errors, &["user_name"], &["length"]); // REMOVED
        // validate_err_codes(&errors, &["first_name"], &["length"]); // REMOVED
    }
    */

    // --- UserUpdateRequest Tests (Validation removed) ---
    #[test]
    fn test_update_request_struct_creation() {
        let req = UserUpdateRequest {
            data: UserUpdateRequestData {
                user_name: Some("validuser".to_string()),
                first_name: Some("Valid".to_string()),
                last_name: Some("User".to_string()),
                email: Some("valid@example.com".to_string()),
                user_status: Some(String::from("I")), // Use String
                department: None,                     // Optional is fine
            },
        };
        assert_eq!(req.data.user_status.unwrap(), "I");
    }

    /* // Validation tests commented out as per prompt
    #[test]
    fn test_update_request_valid() {
        let req = UserUpdateRequest {
            data: UserUpdateRequestData {
                user_name: Some("validuser".to_string()),
                first_name: Some("Valid".to_string()),
                last_name: Some("User".to_string()),
                email: Some("valid@example.com".to_string()),
                user_status: Some(String::from("I")), // Use String
                department: None, // Optional is fine
            },
        };
        // assert!(req.validate().is_ok()); // REMOVED
    }

    #[test]
    fn test_update_request_missing_required() {
        let req = UserUpdateRequest {
            data: UserUpdateRequestData {
                user_name: Some("validuser".to_string()),
                first_name: None, // Missing first name
                last_name: Some("User".to_string()),
                email: Some("valid@example.com".to_string()),
                user_status: Some(String::from("I")), // Use String
                department: None,
            },
        };
        // let errors = req.validate().unwrap_err(); // REMOVED
        // validate_err_codes(&errors, &["first_name"], &["required"]); // REMOVED
    }
    */

    // --- HealthStatus Tests ---
    #[test]
    fn test_health_status_ok_formatting() {
        let status = HealthStatus::new(true, Some(time::Duration::seconds(90))); // 1m 30s
        assert_eq!(status.db_status, "OK");
        assert_eq!(status.uptime, "1m 30s");
    }

    #[test]
    fn test_health_status_fail_formatting() {
        let status = HealthStatus::new(false, Some(time::Duration::seconds(3665))); // 1h 1m 5s
        assert_eq!(status.db_status, "FAIL");
        assert_eq!(status.uptime, "1h 1m 5s");
    }

    #[test]
    fn test_health_status_no_uptime() {
        let status = HealthStatus::new(true, None);
        assert_eq!(status.db_status, "OK");
        assert_eq!(status.uptime, "N/A");
    }

    #[test]
    fn test_health_status_zero_uptime() {
        let status = HealthStatus::new(true, Some(time::Duration::ZERO));
        assert_eq!(status.db_status, "OK");
        assert_eq!(status.uptime, "0s"); // Should show 0s
    }
}
