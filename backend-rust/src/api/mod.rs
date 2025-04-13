pub mod health;
pub mod users;

use actix_web::web;

// Configure all API routes for the Actix application
pub fn configure_api(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1")
            .service(users::configure_users_api())
            .service(health::configure_health_api()),
    );
}
