use actix_web::{web, HttpResponse, Responder, Scope};
// Import the specific request/response types needed
use crate::domain::models::{UserCreateRequest, UserUpdateRequest}; // Added User
use crate::error::AppResult;
use crate::service::user_service::UserService; // Import the concrete service

// --- Handlers ---

/// List all users currently in the system.
async fn list_users(
    // Inject the UserService instance via application state
    user_service: web::Data<UserService>,
) -> AppResult<impl Responder> {
    tracing::info!("Handler: Received request to list users");
    let users = user_service.list_users().await?;
    tracing::debug!("Handler: Found {} users", users.len());
    Ok(HttpResponse::Ok().json(users))
}

/// Get a specific user by their unique ID.
async fn get_user(
    user_service: web::Data<UserService>,
    // Extract the user ID from the URL path
    path: web::Path<i64>,
) -> AppResult<impl Responder> {
    let user_id = path.into_inner();
    tracing::info!(user_id = user_id, "Handler: Received request to get user");
    let user = user_service.get_user(user_id).await?;
    tracing::debug!(user_id = user_id, "Handler: Found user");
    Ok(HttpResponse::Ok().json(user))
}

/// Create a new user in the system.
async fn create_user(
    user_service: web::Data<UserService>,
    // Automatically deserialize JSON payload into UserCreateRequest
    // Handles basic JSON parsing errors (returns 400 Bad Request)
    req: web::Json<UserCreateRequest>,
) -> AppResult<impl Responder> {
    let create_request = req.into_inner();
    // Log relevant parts of the request, avoid logging sensitive info if any
    tracing::info!(user_name = ?create_request.data.user_name, email = ?create_request.data.email, "Handler: Received request to create user");

    // Service layer handles validation and creation logic
    let created_user = user_service.create_user(create_request).await?; // This can return Validation or Conflict errors

    tracing::info!(
        user_id = created_user.id,
        "Handler: User created successfully"
    );
    // Return 201 Created status code with the created user object
    Ok(HttpResponse::Created().json(created_user))
}

/// Update an existing user by their ID.
async fn update_user(
    user_service: web::Data<UserService>,
    path: web::Path<i64>,
    req: web::Json<UserUpdateRequest>,
) -> AppResult<impl Responder> {
    let user_id = path.into_inner();
    let update_request = req.into_inner();
    tracing::info!(user_id = user_id, user_name = ?update_request.data.user_name, email = ?update_request.data.email, "Handler: Received request to update user");

    // Service layer handles validation, existence check, and update logic
    let updated_user = user_service.update_user(user_id, update_request).await?;

    tracing::info!(
        user_id = updated_user.id,
        "Handler: User updated successfully"
    );
    Ok(HttpResponse::Ok().json(updated_user))
}

/// Delete a user by their unique ID.
async fn delete_user(
    user_service: web::Data<UserService>,
    path: web::Path<i64>,
) -> AppResult<impl Responder> {
    let user_id = path.into_inner();
    tracing::info!(
        user_id = user_id,
        "Handler: Received request to delete user"
    );

    user_service.delete_user(user_id).await?;

    tracing::info!(user_id = user_id, "Handler: User deleted successfully");
    // Return 204 No Content status code on successful deletion
    Ok(HttpResponse::NoContent().finish())
}

// --- Route Configuration ---

/// Configures the routes for the user API endpoints under the `/users` scope.
pub fn configure_users_api() -> Scope {
    web::scope("/users")
        .route("", web::get().to(list_users)) // GET /users
        .route("", web::post().to(create_user)) // POST /users
        .route("/{id}", web::get().to(get_user)) // GET /users/{id}
        .route("/{id}", web::put().to(update_user)) // PUT /users/{id}
        .route("/{id}", web::delete().to(delete_user)) // DELETE /users/{id}
}
