use crate::domain::models::{User, UserCreateRequest, UserUpdateRequest};
use crate::error::{AppError, AppResult};
use crate::repository::user_repository::UserRepository;
use std::sync::Arc;

/// Service layer for user-related business logic.
/// Holds a reference to the UserRepository for data access.
#[derive(Clone)] // Clone is cheap due to Arc<UserRepository>
pub struct UserService {
    user_repo: Arc<UserRepository>,
}

impl UserService {
    /// Creates a new UserService instance.
    pub fn new(user_repo: Arc<UserRepository>) -> Self {
        Self { user_repo }
    }

    /// Retrieves a list of all users.
    pub async fn list_users(&self) -> AppResult<Vec<User>> {
        tracing::debug!("Service: Listing all users");
        self.user_repo.list().await
    }

    /// Retrieves a single user by their ID.
    /// Handles the NotFound case directly from the repository.
    pub async fn get_user(&self, id: i64) -> AppResult<User> {
        tracing::debug!(user_id = id, "Service: Getting user by ID");
        self.user_repo.get_by_id(id).await
        // NotFound error is already mapped correctly in the repository layer
    }

    /// Creates a new user after validating the request and checking for conflicts.
    pub async fn create_user(&self, req: UserCreateRequest) -> AppResult<User> {
        tracing::debug!(request = ?req, "Service: Attempting to create user");

        tracing::debug!("Service: Create request validation successful");

        // 2. Extract validated data (safe to unwrap options due to `required` validation rule)
        let data = req.data;
        let user_name = data.user_name.expect("Username validated but is None"); // Should not happen if validation passed
        let email = data.email.expect("Email validated but is None");
        let first_name = data.first_name.expect("First name validated but is None");
        let last_name = data.last_name.expect("Last name validated but is None");
        let user_status = data.user_status.expect("User status validated but is None");
        let department = data.department; // Optional field, remains Option<String>

        // 3. Check for conflicts (username/email already exist)
        if self.user_repo.exists_by_user_name(&user_name).await? {
            tracing::warn!(user_name, "Service: Username conflict during creation");
            return Err(AppError::Conflict(format!(
                "Username '{}' already exists",
                user_name
            )));
        }
        // Use exclude_id = 0 for create check
        if self.user_repo.exists_by_email(&email, 0).await? {
            tracing::warn!(email, "Service: Email conflict during creation");
            return Err(AppError::Conflict(format!(
                "Email '{}' already exists",
                email
            )));
        }
        tracing::debug!("Service: No username/email conflicts found");

        // 4. Call repository to create the user
        // Convert Option<String> to Option<&str> for the repository call
        let created_user = self
            .user_repo
            .create(
                &user_name,
                &first_name,
                &last_name,
                &email,
                &user_status,
                department.as_deref(), // Get Option<&str> from Option<String>
            )
            .await?; // Propagate potential DB errors from repo

        tracing::info!(
            user_id = created_user.id,
            user_name,
            email,
            "Service: User created successfully"
        );
        Ok(created_user)
    }

    /// Updates an existing user after validating the request and checking for conflicts.
    pub async fn update_user(&self, id: i64, req: UserUpdateRequest) -> AppResult<User> {
        tracing::debug!(user_id = id, request = ?req, "Service: Attempting to update user");

        // 1. Validate the incoming request data
        tracing::debug!("Service: Update request validation successful");

        // 2. Extract validated data
        let data = req.data;
        let user_name = data.user_name.expect("Username validated but is None");
        let email = data.email.expect("Email validated but is None");
        let first_name = data.first_name.expect("First name validated but is None");
        let last_name = data.last_name.expect("Last name validated but is None");
        let user_status = data.user_status.expect("User status validated but is None");
        let department = data.department;

        // 3. Check if user exists (implicitly done by get_by_id or update returning NotFound)
        // We might need the current user's data to compare username/email for conflict checks.
        // Alternatively, we can rely on the repository's update method potentially returning a unique constraint error.
        // Let's explicitly check here for clearer error messages.

        // Check username conflict (if changed and new one exists for *another* user)
        // Check email conflict (if changed and new one exists for *another* user)
        if self.user_repo.exists_by_user_name(&user_name).await? {
            // If the username exists, ensure it belongs to the *current* user being updated
            match self.user_repo.get_by_id(id).await {
                Ok(current_user) => {
                    if current_user.user_name != user_name {
                        tracing::warn!(
                            user_id = id,
                            user_name,
                            "Service: Username conflict during update"
                        );
                        return Err(AppError::Conflict(format!(
                            "Username '{}' is already taken by another user",
                            user_name
                        )));
                    }
                    // Username exists but belongs to the user being updated, which is fine.
                }
                Err(AppError::NotFound(_)) => {
                    // The user we are trying to update doesn't exist, repo update will handle this.
                    // Or we could return NotFound here explicitly. Let repo handle it for now.
                    tracing::warn!(
                        user_id = id,
                        "Service: User not found during conflict check for update"
                    );
                }
                Err(e) => return Err(e), // Propagate other DB errors
            }
        }

        // Use exclude_id = id for email check during update
        if self.user_repo.exists_by_email(&email, id).await? {
            tracing::warn!(user_id = id, email, "Service: Email conflict during update");
            return Err(AppError::Conflict(format!(
                "Email '{}' is already taken by another user",
                email
            )));
        }
        tracing::debug!("Service: No username/email conflicts found for update");

        // 4. Call repository to update the user
        let updated_user = self
            .user_repo
            .update(
                id,
                &user_name,
                &first_name,
                &last_name,
                &email,
                &user_status,
                department.as_deref(),
            )
            .await?; // Propagates NotFound or other DB errors from repo

        tracing::info!(
            user_id = updated_user.id,
            user_name,
            email,
            "Service: User updated successfully"
        );
        Ok(updated_user)
    }

    /// Deletes a user by their ID.
    /// Handles the NotFound case directly from the repository.
    pub async fn delete_user(&self, id: i64) -> AppResult<()> {
        tracing::debug!(user_id = id, "Service: Deleting user");
        // Repository's delete method handles the NotFound case appropriately
        self.user_repo.delete(id).await?;
        tracing::info!(user_id = id, "Service: User deleted successfully");
        Ok(())
    }
}

// --- Unit Tests ---
#[cfg(test)]
mod tests {
    use super::*;
    use crate::database; // Need create_pool for real repo tests
    use crate::domain::models::{UserCreateRequestData, UserUpdateRequestData};
    use crate::repository::user_repository::UserRepository; // Need concrete repo or mock trait
    use sqlx::PgPool;

    // --- Test Setup ---
    // Using a real repository connected to a test DB.
    // For true unit tests, mock the UserRepository trait (requires defining the trait).

    async fn setup_service() -> (UserService, Arc<PgPool>) {
        dotenvy::dotenv().ok();
        let db_url =
            std::env::var("DATABASE_URL").expect("DATABASE_URL required for service tests");
        let pool = database::create_pool(&db_url, 3)
            .await
            .expect("Failed to create test db pool");

        let pool_arc = Arc::new(pool);

        // Clean tables before test
        sqlx::query!("DELETE FROM users")
            .execute(pool_arc.as_ref())
            .await
            .unwrap();

        let repo = Arc::new(UserRepository::new(pool_arc.clone()));
        let service = UserService::new(repo);
        (service, pool_arc)
    }

    // Helper to create a user request
    fn create_user_request(username: &str, email: &str, status: &str) -> UserCreateRequest {
        UserCreateRequest {
            data: UserCreateRequestData {
                user_name: Some(username.to_string()),
                first_name: Some("Service".to_string()),
                last_name: Some("Test".to_string()),
                email: Some(email.to_string()),
                user_status: Some(status.to_string()),
                department: None,
            },
        }
    }
    // Helper to create an update request
    fn update_user_request(username: &str, email: &str, status: &str) -> UserUpdateRequest {
        UserUpdateRequest {
            data: UserUpdateRequestData {
                user_name: Some(username.to_string()),
                first_name: Some("ServiceUpdate".to_string()),
                last_name: Some("TestUpdate".to_string()),
                email: Some(email.to_string()),
                user_status: Some(status.to_string()),
                department: Some("Updated".to_string()),
            },
        }
    }

    // --- Tests ---

    #[tokio::test]
    #[ignore] // Integration test (needs DB)
    async fn test_create_user_service_success() {
        let (service, _pool) = setup_service().await;

        let req = create_user_request("service_create_ok", "service.create.ok@example.com", "A");
        let result = service.create_user(req).await;
        assert!(result.is_ok());

        let user = result.unwrap();
        assert_eq!(user.user_name, "service_create_ok");
        assert_eq!(user.email, "service.create.ok@example.com");
    }

    #[tokio::test]
    #[ignore]
    async fn test_create_user_service_username_conflict() {
        let (service, _pool) = setup_service().await;
        let req1 = create_user_request("conflict_user", "email1@example.com", "A");
        service.create_user(req1).await.unwrap(); // Create first user

        let req2 = create_user_request("conflict_user", "email2@example.com", "A"); // Same username
        let result = service.create_user(req2).await;
        assert!(result.is_err());
        match result.err().unwrap() {
            AppError::Conflict(msg) => {
                assert!(msg.contains("Username 'conflict_user' already exists"))
            }
            _ => panic!("Expected Conflict error"),
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_create_user_service_email_conflict() {
        let (service, _pool) = setup_service().await;

        let req1 = create_user_request("user1_email", "conflict@example.com", "A");
        service.create_user(req1).await.unwrap(); // Create first user

        let req2 = create_user_request("user2_email", "conflict@example.com", "A"); // Same email
        let result = service.create_user(req2).await;
        assert!(result.is_err());

        match result.err().unwrap() {
            AppError::Conflict(msg) => {
                assert!(msg.contains("Email 'conflict@example.com' already exists"))
            }
            _ => panic!("Expected Conflict error"),
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_get_user_service_success() {
        let (service, _pool) = setup_service().await;

        let req = create_user_request("service_get", "service.get@example.com", "I");
        let created_user = service.create_user(req).await.unwrap();

        let result = service.get_user(created_user.id).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap().id, created_user.id);
    }

    #[tokio::test]
    #[ignore]
    async fn test_get_user_service_not_found() {
        let (service, _pool) = setup_service().await;

        let non_existent_id = 98765;
        let result = service.get_user(non_existent_id).await;
        assert!(result.is_err());

        assert!(matches!(result.err().unwrap(), AppError::NotFound(_)));
    }

    #[tokio::test]
    #[ignore]
    async fn test_list_users_service() {
        let (service, _pool) = setup_service().await;
        service
            .create_user(create_user_request(
                "svc_list1",
                "svclist1@example.com",
                "A",
            ))
            .await
            .unwrap();
        service
            .create_user(create_user_request(
                "svc_list2",
                "svclist2@example.com",
                "A",
            ))
            .await
            .unwrap();

        let result = service.list_users().await;
        assert!(result.is_ok());
        assert!(result.unwrap().len() >= 2);
    }

    #[tokio::test]
    #[ignore]
    async fn test_delete_user_service_success() {
        let (service, _pool) = setup_service().await;
        let created_user = service
            .create_user(create_user_request(
                "service_del",
                "service.del@example.com",
                "T",
            ))
            .await
            .unwrap();

        let delete_result = service.delete_user(created_user.id).await;
        assert!(delete_result.is_ok());

        // Verify get fails
        let get_result = service.get_user(created_user.id).await;
        assert!(get_result.is_err());
        assert!(matches!(get_result.err().unwrap(), AppError::NotFound(_)));
    }

    #[tokio::test]
    #[ignore]
    async fn test_delete_user_service_not_found() {
        let (service, _pool) = setup_service().await;

        let non_existent_id = 98764;
        let result = service.delete_user(non_existent_id).await;
        assert!(result.is_err());

        assert!(matches!(result.err().unwrap(), AppError::NotFound(_)));
    }

    #[tokio::test]
    #[ignore]
    async fn test_update_user_service_success() {
        let (service, _pool) = setup_service().await;
        let user = service
            .create_user(create_user_request("svc_upd_orig", "svcupdorig@e.com", "A"))
            .await
            .unwrap();
        let update_req = update_user_request("svc_upd_new", "svcupdnew@e.com", "I");

        let result = service.update_user(user.id, update_req).await;
        assert!(result.is_ok());
        let updated_user = result.unwrap();
        assert_eq!(updated_user.id, user.id);
        assert_eq!(updated_user.user_name, "svc_upd_new");
        assert_eq!(updated_user.email, "svcupdnew@e.com");
        assert_eq!(updated_user.user_status, "I");
        assert_eq!(updated_user.department, Some("Updated".to_string()));
    }

    #[tokio::test]
    #[ignore]
    async fn test_update_user_service_not_found() {
        let (service, _pool) = setup_service().await;
        let non_existent_id = 98763;
        let update_req = update_user_request("svc_upd_nf", "svcupdnf@e.com", "A");
        let result = service.update_user(non_existent_id, update_req).await;
        assert!(result.is_err());
        assert!(matches!(result.err().unwrap(), AppError::NotFound(_)));
    }

    #[tokio::test]
    #[ignore]
    async fn test_update_user_service_email_conflict() {
        let (service, _pool) = setup_service().await;
        let user = service
            .create_user(create_user_request("svcupdconf2", "conf2@e.com", "A"))
            .await
            .unwrap();

        // Try to update user2's email to user1's email
        let update_req = update_user_request("svcupdconf2_new", "conf1@e.com", "A"); // Conflict email

        let result = service.update_user(user.id, update_req).await;
        assert!(result.is_err());

        assert!(matches!(result.err().unwrap(), AppError::Conflict(_)));
    }

    #[tokio::test]
    #[ignore]
    async fn test_update_user_service_username_conflict() {
        let (service, _pool) = setup_service().await;
        let user = service
            .create_user(create_user_request(
                "svcupdconf_user2",
                "userconf2@e.com",
                "A",
            ))
            .await
            .unwrap();

        // Try to update user2's username to user1's username
        let update_req = update_user_request("svcupdconf_user1", "userconf2_new@e.com", "A"); // Conflict username

        let result = service.update_user(user.id, update_req).await;
        println!("Update Result: {:?}", result); // Add logging
        assert!(
            result.is_err(),
            "Update should have failed due to username conflict"
        );
        assert!(
            matches!(result.err().unwrap(), AppError::Conflict(_)),
            "Error should be Conflict"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_update_user_service_no_conflict_if_self() {
        // Ensure updating a user with their *own* existing username/email doesn't cause a conflict error
        let (service, _pool) = setup_service().await;
        let user = service
            .create_user(create_user_request("selfupdate", "self@e.com", "A"))
            .await
            .unwrap();

        // Update request with the SAME username and email, just changing status
        let mut update_req = update_user_request("selfupdate", "self@e.com", "I");
        update_req.data.first_name = Some("SelfUpdated".to_string()); // Change something else

        let result = service.update_user(user.id, update_req).await;
        assert!(
            result.is_ok(),
            "Updating user with own username/email failed: {:?}",
            result.err()
        );
        let updated_user = result.unwrap();
        assert_eq!(updated_user.user_status, "I");
        assert_eq!(updated_user.first_name, "SelfUpdated");
    }
}
