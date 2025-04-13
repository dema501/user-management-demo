use sqlx::{types::time::OffsetDateTime, Error as SqlxError, PgPool};
use std::sync::Arc;

use crate::domain::models::User;
use crate::error::{AppError, AppResult}; // Use AppResult

// --- UserRepository Implementation ---

/// Provides data access operations for User entities.
/// It holds an atomically reference-counted pointer to the database pool.
#[derive(Debug, Clone)] // Clone is cheap due to Arc<PgPool>
pub struct UserRepository {
    pool: Arc<PgPool>,
}

impl UserRepository {
    /// Creates a new UserRepository instance.
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }

    /// Retrieves all users from the database, ordered by ID.
    pub async fn list(&self) -> AppResult<Vec<User>> {
        tracing::debug!("Repository: Fetching all users");
        sqlx::query_as!(
            User, // Map directly to the User struct using struct field names
            r#"
            SELECT
                user_id as id, user_name, first_name, last_name, email,
                user_status as "user_status: _", -- Use placeholder "_" for enum, sqlx maps it
                department, created_at, updated_at
            FROM users ORDER BY user_id ASC
            "#
        )
        .fetch_all(&*self.pool) // Deref Arc<PgPool> to &PgPool
        .await
        .map_err(|e| {
            tracing::error!(error.cause_chain = ?e, "Repository: Failed to list users");
            AppError::Database(e)
        })
    }

    /// Retrieves a single user by their unique ID.
    /// Returns `AppError::NotFound` if no user with the ID exists.
    pub async fn get_by_id(&self, id: i64) -> AppResult<User> {
        tracing::debug!(user_id = id, "Repository: Fetching user by ID");
        sqlx::query_as!(
            User,
             r#"
            SELECT
                user_id as id, user_name, first_name, last_name, email,
                user_status,
                department, created_at, updated_at
            FROM users WHERE user_id = $1
            "#,
            id
        )
        .fetch_optional(&*self.pool) // Use fetch_optional to handle not found case
        .await
        .map_err(|e| {
             tracing::error!(error.cause_chain = ?e, user_id=id, "Repository: Failed to fetch user by ID");
             AppError::Database(e)
        })? // Propagate DB errors first
        .ok_or_else(|| {
             tracing::warn!(user_id = id, "Repository: User not found by ID");
             AppError::NotFound(format!("User with id {} not found", id)) // Map None to NotFound
        })
    }

    /// Creates a new user in the database.
    /// Assumes data validation and conflict checks (username/email uniqueness)
    /// are performed *before* calling this method (e.g., in the service layer).
    /// Returns the newly created User including its generated ID.
    pub async fn create(
        &self,
        user_name: &str,
        first_name: &str,
        last_name: &str,
        email: &str,
        user_status: &str,
        department: Option<&str>,
    ) -> AppResult<User> {
        tracing::debug!(user_name, email, "Repository: Creating new user");
        let now = OffsetDateTime::now_utc(); // Use UTC time

        sqlx::query_as!(
            User,
             r#"
            INSERT INTO users (user_name, first_name, last_name, email, user_status, department, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING
                user_id as id, user_name, first_name, last_name, email,
                user_status as "user_status: _",
                department, created_at, updated_at
            "#,
            user_name,
            first_name,
            last_name,
            email,
            user_status, // Cast Rust enum for the query parameter
            department, // Pass Option<&str> directly
            now,
            now
        )
        .fetch_one(&*self.pool) // Expect one row back from RETURNING
        .await
        .map_err(|e| {
            // Check if the error is a unique constraint violation
            if let SqlxError::Database(db_err) = &e {
                // Postgres unique violation code is "23505"
                if db_err.code().is_some_and(|code| code == "23505") {
                     tracing::warn!(user_name, email, constraint = ?db_err.constraint(), "Repository: Unique constraint violation during create");
                     // Let the service layer return AppError::Conflict based on this
                     return AppError::Database(e); // Return the original DB error for service to interpret
                }
            }
            tracing::error!(error.cause_chain = ?e, user_name, email, "Repository: Failed to create user");
            AppError::Database(e)
        })
    }

    /// Updates an existing user's details in the database.
    /// Assumes data validation and conflict checks are performed *before* calling.
    /// Returns the updated User.
    /// Returns `AppError::NotFound` if no user with the ID exists to update.
    #[allow(clippy::too_many_arguments)]
    pub async fn update(
        &self,
        id: i64,
        user_name: &str,
        first_name: &str,
        last_name: &str,
        email: &str,
        user_status: &str,
        department: Option<&str>,
    ) -> AppResult<User> {
        tracing::debug!(user_id = id, user_name, email, "Repository: Updating user");
        let now = OffsetDateTime::now_utc();

        sqlx::query_as!(
            User,
            r#"
            UPDATE users
            SET user_name = $1, first_name = $2, last_name = $3, email = $4,
                user_status = $5, department = $6, updated_at = $7
            WHERE user_id = $8
            RETURNING
                user_id as id, user_name, first_name, last_name, email,
                user_status as "user_status: _",
                department, created_at, updated_at
            "#,
            user_name, first_name, last_name, email,
            user_status, department, now,
            id
        )
        .fetch_optional(&*self.pool) // Use optional because UPDATE might affect 0 rows if ID not found
        .await
        .map_err(|e| {
             // Check for unique constraint violation during update
             if let SqlxError::Database(db_err) = &e {
                 if db_err.code().is_some_and(|code| code == "23505") {
                      tracing::warn!(user_id = id, user_name, email, constraint = ?db_err.constraint(), "Repository: Unique constraint violation during update");
                      return AppError::Database(e); // Return original DB error
                 }
             }
            tracing::error!(error.cause_chain = ?e, user_id = id, "Repository: Failed to update user");
            AppError::Database(e)
        })? // Propagate DB errors
        .ok_or_else(|| {
             tracing::warn!(user_id = id, "Repository: User not found for update");
             AppError::NotFound(format!("User with id {} not found for update", id))
        })
    }

    /// Deletes a user from the database by their ID.
    /// Returns `Ok(())` on success.
    /// Returns `AppError::NotFound` if no user with the ID exists to delete.
    pub async fn delete(&self, id: i64) -> AppResult<()> {
        tracing::debug!(user_id = id, "Repository: Deleting user");
        let result = sqlx::query!(
            "DELETE FROM users WHERE user_id = $1",
            id
        )
        .execute(&*self.pool)
        .await
        .map_err(|e| {
            tracing::error!(error.cause_chain = ?e, user_id = id, "Repository: Failed to delete user");
            AppError::Database(e)
        })?;

        // Check if any row was actually deleted
        if result.rows_affected() == 0 {
            tracing::warn!(user_id = id, "Repository: User not found for deletion");
            Err(AppError::NotFound(format!(
                "User with id {} not found for deletion",
                id
            )))
        } else {
            tracing::debug!(user_id = id, "Repository: User deleted successfully");
            Ok(())
        }
    }

    /// Checks if a user exists with the given username.
    pub async fn exists_by_user_name(&self, user_name: &str) -> AppResult<bool> {
        tracing::debug!(user_name, "Repository: Checking existence by username");
        sqlx::query_scalar!( // Returns Option<bool>, defaults to false if no row found
            "SELECT EXISTS (SELECT 1 FROM users WHERE user_name = $1 LIMIT 1)",
            user_name
         )
         .fetch_one(&*self.pool) // Expect exactly one row (containing true or false)
         .await
         .map(|exists| exists.unwrap_or(false)) // Map Option<bool> to bool (false if NULL/no row)
         .map_err(|e| {
             tracing::error!(error.cause_chain = ?e, user_name, "Repository: Failed to check username existence");
             AppError::Database(e)
         })
    }

    /// Checks if a user exists with the given email, optionally excluding a specific user ID.
    /// `exclude_id` should be 0 if no user ID needs to be excluded (e.g., during creation).
    pub async fn exists_by_email(&self, email: &str, exclude_id: i64) -> AppResult<bool> {
        tracing::debug!(email, exclude_id, "Repository: Checking existence by email");
        sqlx::query_scalar!(
            r#"SELECT EXISTS (
                SELECT 1 FROM users
                WHERE email = $1 AND ($2 = 0 OR user_id != $2)
                LIMIT 1
            )"#,
            email,
            exclude_id as i32 // Pass the ID to exclude (or 0 if none)
          )
          .fetch_one(&*self.pool)
          .await
          .map(|exists| exists.unwrap_or(false))
          .map_err(|e| {
              tracing::error!(error.cause_chain = ?e, email, exclude_id, "Repository: Failed to check email existence");
              AppError::Database(e)
          })
    }
}

// --- Unit/Integration Tests ---
// These tests ideally need a real database connection.
// Mark them with #[ignore] or setup a dedicated test database.
#[cfg(test)]
mod tests {
    use super::*;
    use crate::database; // For create_pool
    use sqlx::PgPool;
    use std::sync::Arc;

    // Helper to get a test pool and clean the users table
    async fn setup_db() -> Arc<PgPool> {
        dotenvy::dotenv().ok();
        let db_url =
            std::env::var("DATABASE_URL").expect("DATABASE_URL must be set for repository tests");
        // Use a small pool for tests
        let pool = database::create_pool(&db_url, 2)
            .await
            .expect("Failed to create test pool");
        // Clean the table before each test run involving data manipulation

        let pool_arc = Arc::new(pool);

        sqlx::query!("DELETE FROM users")
            .execute(pool_arc.as_ref())
            .await
            .expect("Failed to clean users table");

        pool_arc
    }

    #[tokio::test]
    #[ignore] // Requires DB
    async fn test_create_user_repo() {
        let pool = setup_db().await;
        let repo = UserRepository::new(pool.clone());

        let result = repo
            .create(
                "repo_create",
                "Repo",
                "Create",
                "repo.create@example.com",
                "A",
                Some("Dept A"),
            )
            .await;

        assert!(result.is_ok());
        let user = result.unwrap();
        assert!(user.id > 0);
        assert_eq!(user.user_name, "repo_create");
        assert_eq!(user.email, "repo.create@example.com");
        assert_eq!(user.user_status, "A".to_string());
        assert_eq!(user.department, Some("Dept A".to_string()));

        // Verify creation time is recent (within limits)
        let now = OffsetDateTime::now_utc();
        assert!((now - user.created_at).whole_seconds() < 5);
        assert_eq!(user.created_at, user.updated_at); // Should be same on create
    }

    #[tokio::test]
    #[ignore]
    async fn test_create_user_repo_unique_constraint() {
        let pool = setup_db().await;
        let repo = UserRepository::new(pool.clone());

        // Create first user
        repo.create("unique_user", "U", "1", "unique@example.com", "A", None)
            .await
            .unwrap();

        // Attempt to create second user with same username
        let result_username = repo
            .create("unique_user", "U", "2", "unique2@example.com", "A", None)
            .await;
        assert!(result_username.is_err());
        match result_username.err().unwrap() {
            AppError::Database(SqlxError::Database(db_err)) => {
                assert_eq!(db_err.code().unwrap_or_default(), "23505"); // Check PG unique error code
            }
            _ => panic!("Expected unique constraint DB error"),
        }

        // Attempt to create third user with same email
        let result_email = repo
            .create("unique_user3", "U", "3", "unique@example.com", "A", None)
            .await;
        assert!(result_email.is_err());
        match result_email.err().unwrap() {
            AppError::Database(SqlxError::Database(db_err)) => {
                assert_eq!(db_err.code().unwrap_or_default(), "23505");
            }
            _ => panic!("Expected unique constraint DB error"),
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_get_by_id_repo_success() {
        let pool = setup_db().await;
        let repo = UserRepository::new(pool.clone());

        // Create a user first
        let created_user = repo
            .create("repo_get", "Repo", "Get", "repo.get@example.com", "I", None)
            .await
            .unwrap();

        // Fetch the user
        let result = repo.get_by_id(created_user.id).await;
        assert!(result.is_ok());
        let fetched_user = result.unwrap();

        assert_eq!(fetched_user.id, created_user.id);
        assert_eq!(fetched_user.user_name, "repo_get");
        assert_eq!(fetched_user.email, "repo.get@example.com");
        assert_eq!(fetched_user.user_status, "I".to_string());
        assert!(fetched_user.department.is_none());
    }

    #[tokio::test]
    #[ignore]
    async fn test_get_by_id_repo_not_found() {
        let pool = setup_db().await;
        let repo = UserRepository::new(pool.clone());
        let non_existent_id = 99999;

        let result = repo.get_by_id(non_existent_id).await;
        assert!(result.is_err());
        match result.err().unwrap() {
            AppError::NotFound(msg) => {
                assert!(msg.contains(&format!("User with id {} not found", non_existent_id)))
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_list_users_repo() {
        let pool = setup_db().await;
        let repo = UserRepository::new(pool.clone());

        // Create some users
        repo.create("list1", "L", "1", "list1@example.com", "A", None)
            .await
            .unwrap();
        repo.create("list2", "L", "2", "list2@example.com", "T", Some("Dept B"))
            .await
            .unwrap();

        let result = repo.list().await;
        assert!(result.is_ok());
        let users = result.unwrap();

        assert!(users.len() >= 2); // Should contain at least the two created
        assert!(users.iter().any(|u| u.user_name == "list1"));
        assert!(users.iter().any(|u| u.user_name == "list2"
            && u.user_status == "T"
            && u.department == Some("Dept B".to_string())));
    }

    #[tokio::test]
    #[ignore]
    async fn test_update_user_repo_success() {
        let pool = setup_db().await;
        let repo = UserRepository::new(pool.clone());
        let user = repo
            .create(
                "update_me",
                "Update",
                "Me",
                "update.me@example.com",
                "A",
                None,
            )
            .await
            .unwrap();

        let result = repo
            .update(
                user.id,
                "updated_user",
                "Updated",
                "User",
                "updated@example.com",
                "I",
                Some("Updated Dept"),
            )
            .await;

        assert!(result.is_ok());
        let updated_user = result.unwrap();

        assert_eq!(updated_user.id, user.id);
        assert_eq!(updated_user.user_name, "updated_user");
        assert_eq!(updated_user.email, "updated@example.com");
        assert_eq!(updated_user.user_status, "I".to_string());
        assert_eq!(updated_user.department, Some("Updated Dept".to_string()));
        // Check timestamps
        assert!(updated_user.updated_at > user.created_at);
        assert!(updated_user.updated_at > user.updated_at);
    }

    #[tokio::test]
    #[ignore]
    async fn test_update_user_repo_not_found() {
        let pool = setup_db().await;
        let repo = UserRepository::new(pool.clone());
        let non_existent_id = 99997;

        let result = repo
            .update(non_existent_id, "a", "b", "c", "d@d.com", "A", None)
            .await;
        assert!(result.is_err());
        match result.err().unwrap() {
            AppError::NotFound(msg) => assert!(msg.contains("not found for update")),
            _ => panic!("Expected NotFound error"),
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_update_user_repo_unique_constraint() {
        let pool = setup_db().await;
        let repo = UserRepository::new(pool.clone());

        let user2 = repo
            .create("update_u2", "U", "2", "update2@example.com", "A", None)
            .await
            .unwrap();

        // Try to update user2's email to user1's email
        let result = repo
            .update(
                user2.id,
                "update_u2",
                "U",
                "2",
                "update1@example.com",
                "A",
                None,
            )
            .await;

        assert!(result.is_err());
        match result.err().unwrap() {
            AppError::Database(SqlxError::Database(db_err)) => {
                assert_eq!(db_err.code().unwrap_or_default(), "23505");
            }
            e => panic!("Expected unique constraint DB error, got {:?}", e),
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_delete_user_repo_success() {
        let pool = setup_db().await;
        let repo = UserRepository::new(pool.clone());
        let user = repo
            .create(
                "delete_repo",
                "Delete",
                "Repo",
                "delete.repo@example.com",
                "A",
                None,
            )
            .await
            .unwrap();

        let delete_result = repo.delete(user.id).await;
        assert!(delete_result.is_ok());

        // Verify deletion
        let get_result = repo.get_by_id(user.id).await;
        assert!(get_result.is_err());
        assert!(matches!(get_result.err().unwrap(), AppError::NotFound(_)));
    }

    #[tokio::test]
    #[ignore]
    async fn test_delete_user_repo_not_found() {
        let pool = setup_db().await;
        let repo = UserRepository::new(pool.clone());
        let non_existent_id = 99996;

        let result = repo.delete(non_existent_id).await;
        assert!(result.is_err());
        match result.err().unwrap() {
            AppError::NotFound(msg) => assert!(msg.contains("not found for deletion")),
            _ => panic!("Expected NotFound error"),
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_exists_by_user_name_repo() {
        let pool = setup_db().await;
        let repo = UserRepository::new(pool.clone());
        repo.create(
            "exists_user",
            "Exists",
            "User",
            "exists@example.com",
            "A",
            None,
        )
        .await
        .unwrap();

        assert!(repo.exists_by_user_name("exists_user").await.unwrap());
        assert!(!repo.exists_by_user_name("non_existent_user").await.unwrap());
    }

    #[tokio::test]
    #[ignore]
    async fn test_exists_by_email_repo() {
        let pool = setup_db().await;
        let repo = UserRepository::new(pool.clone());
        let user = repo
            .create(
                "email_exists",
                "Email",
                "Exists",
                "email.exists@example.com",
                "A",
                None,
            )
            .await
            .unwrap();

        // Check exists without exclusion
        assert!(repo
            .exists_by_email("email.exists@example.com", 0)
            .await
            .unwrap());
        assert!(!repo
            .exists_by_email("non.existent@example.com", 0)
            .await
            .unwrap());

        // Check exists excluding the user itself (should be false)
        assert!(!repo
            .exists_by_email("email.exists@example.com", user.id)
            .await
            .unwrap());

        // Create another user and check exclusion again
        let user2 = repo
            .create(
                "email_exists2",
                "Email2",
                "Exists2",
                "email2.exists@example.com",
                "A",
                None,
            )
            .await
            .unwrap();
        assert!(repo
            .exists_by_email("email.exists@example.com", user2.id)
            .await
            .unwrap()); // Should still exist (checking user1's email excluding user2)
    }
}
