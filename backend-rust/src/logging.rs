use tracing::Level;
use tracing::Subscriber;
use tracing_subscriber::{filter::LevelFilter, fmt::time::UtcTime, EnvFilter, FmtSubscriber};

/// Configures the global tracing subscriber for structured JSON logging.
// The return type needs to handle the complex type returned by .finish()
// Using `impl Subscriber + Send + Sync` is idiomatic.
pub fn build_subscriber(app_name: &str, verbosity: u8) -> impl Subscriber + Send + Sync {
    // pub fn configure_logging(app_name: &str, verbosity: u8) {
    let app_crate_name = app_name.replace('-', "_"); // Crates use underscores

    // Determine the base level from verbosity flags
    let (app_level, default_other_level) = match verbosity {
        0 => (Level::ERROR, Level::WARN), // Default: App=ERROR, Others=WARN
        1 => (Level::WARN, Level::WARN),  // -v: App=WARN, Others=WARN
        2 => (Level::INFO, Level::WARN),  // -vv: App=INFO, Others=WARN
        3 => (Level::DEBUG, Level::INFO), // -vvv: App=DEBUG, Others=INFO
        _ => (Level::TRACE, Level::DEBUG), // -vvvv+: App=TRACE, Others=DEBUG
    };

    // Build the filter directive string based on verbosity
    let filter_directives = format!(
        "{}={},{}",
        app_crate_name,
        app_level,
        default_other_level // Default level for other crates
    );

    // Initialize EnvFilter builder
    let builder = EnvFilter::builder()
        // Set a very permissive default directive *for the builder itself*.
        // This ensures that if RUST_LOG is set but doesn't specify a default,
        // our settings below aren't immediately discarded.
        .with_default_directive(LevelFilter::WARN.into());

    // Determine the final filter: RUST_LOG or our verbosity-based directives
    let filter = if verbosity > 0 {
        // If verbosity flags are set (-v, -vv, ...), use them as the primary filter source,
        // effectively ignoring RUST_LOG for the app's level.
        // We still parse RUST_LOG first *in case* it provides useful settings for *other* crates,
        // but then we explicitly override the app's level and the global default.
        builder
            .parse_lossy(std::env::var("RUST_LOG").unwrap_or_default()) // Parse RUST_LOG if present
            .add_directive(format!("{}={}", app_crate_name, app_level).parse().unwrap()) // Override app level
            .add_directive(format!("{}", default_other_level).parse().unwrap()) // Override global default
    } else {
        // If no verbosity flags (verbosity == 0), primarily rely on RUST_LOG.
        // If RUST_LOG is not set, fall back to the default directives.
        match std::env::var("RUST_LOG") {
            Ok(rust_log_var) if !rust_log_var.is_empty() => {
                builder.parse_lossy(rust_log_var) // Use RUST_LOG if set and not empty
            }
            _ => {
                builder.parse_lossy(filter_directives) // Use default directives if RUST_LOG unset/empty
            }
        }
    };
    // Build the subscriber stack
    FmtSubscriber::builder()
        .with_env_filter(filter)
        .with_target(true) // Log target (module path)
        .with_line_number(true) // Log line numbers
        .with_level(true) // Log level
        .with_timer(UtcTime::rfc_3339()) // Use RFC 3339 timestamp format
        .json() // Output logs in JSON format
        .finish() // Build the subscriber part
}

// New function to initialize logging for the application
// This function *will* call set_global_default
pub fn init_global_subscriber(app_name: &str, verbosity: u8) {
    let subscriber = build_subscriber(app_name, verbosity);

    // Attempt to set the global default subscriber
    if let Err(e) = tracing::subscriber::set_global_default(subscriber) {
        // Use eprintln directly as tracing might not be initialized
        eprintln!("Failed to set global default tracing subscriber: {}", e);
        // Optionally, try initializing a fallback simple logger
        // env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("warn")).init();
    }

    // Log the final effective filter level AFTER initialization attempt
    // Note: Accessing the effective filter after building is complex with EnvFilter.
    // We log the intended levels based on the logic above.
    tracing::info!(
        verbosity,
        // configured_app_level = %app_level,
        // configured_default_level = %default_other_level,
        rust_log_env = std::env::var("RUST_LOG").ok(), // Show if RUST_LOG was present
        "Logging configured (JSON format)"
    );
}
