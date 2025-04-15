use actix_web::{web, App, HttpResponse, HttpServer};
use std::env;
use std::sync::Arc;
use time::OffsetDateTime;
use tokio::signal;

// Import local modules
mod api;
mod config;
mod database;
mod domain;
mod error;
mod logging;
mod repository;
mod service;

use crate::api::health::ServerStartTime;
use crate::config::load_config;
use crate::database::create_pool;
use crate::logging::init_global_subscriber;
use crate::repository::user_repository::UserRepository;
use crate::service::user_service::UserService;
// Import state struct

#[actix_web::main]
async fn main() -> anyhow::Result<()> {
    let start_time = OffsetDateTime::now_utc();
    dotenvy::dotenv().ok(); // Load .env file if present

    // Load Configuration
    let config = load_config().map_err(|e| {
        // Log config error before exiting if logging isn't set up yet
        eprintln!("Configuration Error: {}", e);
        e
    })?;

    let pkg_name = env::var("CARGO_PKG_NAME").expect("CARGO_PKG_NAME env var is not set");
    let pkg_version = env::var("CARGO_PKG_VERSION").expect("CARGO_PKG_VERSION env var is not set");

    // Configure Logging
    init_global_subscriber(&pkg_name, config.verbose);
    tracing::info!(config = ?config, "Configuration loaded");

    // Create Database Pool
    let db_pool = Arc::new(create_pool(&config.db.dsn, config.db.max_open_conns).await?);
    tracing::info!("Database pool created");

    // Create Repository (depends on pool)
    let user_repo = Arc::new(UserRepository::new(db_pool.clone()));
    tracing::info!("User repository created");

    // Create Service (depends on repository)
    let user_service = Arc::new(UserService::new(user_repo.clone()));
    tracing::info!("User service created");

    // Prepare state for Actix
    let db_pool_data = web::Data::from(db_pool.clone()); // web::Data wraps Arc
    let user_service_data = web::Data::from(user_service.clone());
    let start_time_data = web::Data::new(ServerStartTime { time: start_time });

    // Start HTTP Server
    let bind_address = format!("{}:{}", config.http.host, config.http.port);
    tracing::info!("Starting server on {}", bind_address);

    let server = HttpServer::new(move || {
        App::new()
            // Add state
            .app_data(db_pool_data.clone()) // Share DB pool
            .app_data(user_service_data.clone()) // Share User service
            .app_data(start_time_data.clone()) // Share start time
            // Add tracing middleware (structured logging per request)
            .wrap(tracing_actix_web::TracingLogger::default())
            // Add other middleware
            .wrap(actix_web::middleware::Compress::default())
            .wrap(actix_web::middleware::NormalizePath::trim())
            .wrap(
                actix_cors::Cors::default()
                    .allow_any_origin()
                    .allow_any_method()
                    .allow_any_header()
                    .max_age(3600),
            )
            .wrap(
                actix_web::middleware::DefaultHeaders::new()
                    .add(("X-Version", format!("{}-{}", pkg_name, pkg_version))),
            )
            // Configure API routes (users, health, etc.)
            .configure(api::configure_api)
            // Default route for 404
            .default_service(
                web::route().to(|| async { HttpResponse::NotFound().json("Not Found") }),
            )
    })
    .bind(&bind_address)?
    .workers(config.http.workers) // Use config or num CPUs
    .run();

    // Graceful Shutdown Handling
    let server_handle = server.handle();
    tokio::spawn(async move {
        signal::ctrl_c().await.expect("Failed to listen for ctrl-c");
        tracing::info!("Ctrl-C received, initiating shutdown...");
        // Optionally add a shutdown timeout
        server_handle.stop(true).await; // true = graceful
    });

    tracing::info!("Server started successfully");
    server.await?; // Wait for the server to stop

    tracing::info!("Server stopped gracefully");
    Ok(())
}
