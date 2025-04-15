use actix_web::{web, HttpResponse, Responder, Scope};
use sqlx::PgPool;
use time::OffsetDateTime;

use crate::domain::models::HealthStatus;
use crate::error::AppResult;

// State to hold server start time
#[derive(Clone)]
pub struct ServerStartTime {
    pub time: OffsetDateTime,
}

// --- Handler ---

async fn get_api_status(
    pool: web::Data<PgPool>,                     // Inject PgPool directly
    start_time_data: web::Data<ServerStartTime>, // Inject start time state
) -> AppResult<impl Responder> {
    // Check DB connection
    let db_ready = match sqlx::query("SELECT 1").fetch_one(&**pool).await {
        Ok(_) => true,
        Err(e) => {
            tracing::error!("Healthcheck DB connection failed: {}", e);
            false
        }
    };

    // Calculate uptime
    let uptime = OffsetDateTime::now_utc() - start_time_data.time;

    let status_response = HealthStatus::new(db_ready, Some(uptime));

    // Return 503 if DB is not ready, otherwise 200
    let mut http_status = if db_ready {
        HttpResponse::Ok()
    } else {
        HttpResponse::ServiceUnavailable()
    };

    Ok(http_status.json(status_response))
}

// Function to configure routes for this module
pub fn configure_health_api() -> Scope {
    web::scope("/health").route("", web::get().to(get_api_status))
}
