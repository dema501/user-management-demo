use clap::Parser;
use config::{ConfigError, Environment, File};
use serde::Deserialize;
use std::path::PathBuf;
use tracing;

// Combined Config struct using Clap for CLI/Env and Serde for file loading
#[derive(Debug, Clone, Deserialize, Parser)]
#[clap(name = "user-management-backend", version, about, long_about = None)]
pub struct Config {
    #[clap(flatten)]
    #[serde(flatten)]
    pub http: HttpConfig,

    #[clap(flatten)]
    #[serde(flatten)]
    pub db: DbConfig,

    /// Enable verbose output (increase level with more flags: -v, -vv, -vvv)
    #[clap(short, long, action = clap::ArgAction::Count, env = "APP_VERBOSE")]
    #[serde(default)] // Default to 0 if not in file/env
    pub verbose: u8,

    /// Load configuration from a specific TOML file
    #[clap(short, long, value_name = "FILE", env = "APP_CONFIG_FILE")]
    #[serde(skip)] // Don't expect 'config_file' field in the config file itself
    config_file: Option<PathBuf>,
}

#[derive(Debug, Clone, Deserialize, Parser)]
#[group(id = "http")] // Group for clap help message
pub struct HttpConfig {
    /// Host address to bind the server
    #[clap(long, env = "APP_HTTP_HOST", default_value = "127.0.0.1")]
    #[serde(default = "default_http_host")]
    pub host: String,

    /// Port number for the server
    #[clap(long, env = "APP_HTTP_PORT", default_value_t = 8080)]
    #[serde(default = "default_http_port")]
    pub port: u16,

    /// Number of worker threads for the server
    #[clap(long, env = "APP_HTTP_WORKERS", default_value_t = 1)]
    #[serde(default = "default_http_workers")]
    pub workers: usize,

    // Rate limit example - not used directly by Actix core, needs middleware
    #[clap(long, env = "APP_HTTP_RATE_LIMIT", default_value_t = 100)]
    #[serde(default = "default_http_rate_limit")]
    pub rate_limit: usize,
}

#[derive(Debug, Clone, Deserialize, Parser)]
#[group(id = "db")]
pub struct DbConfig {
    /// Database connection string (DSN)
    /// Recommended: Set via DATABASE_URL environment variable
    #[clap(long, env = "DATABASE_URL")]
    #[serde(default = "default_db_dsn")] // Provide a fallback default
    pub dsn: String,

    /// Maximum number of connections in the database pool
    #[clap(long, env = "DATABASE_MAX_OPEN_CONNS", default_value_t = 10)] // Use DATABASE_ prefix
    #[serde(default = "default_db_max_open_conns")]
    pub max_open_conns: u32,
}

// Default value functions for serde (used if field missing in config file/env)
fn default_http_host() -> String {
    "127.0.0.1".to_string()
}
// Default value functions for serde (used if field missing in config file/env)
fn default_http_port() -> u16 {
    8080
}
fn default_http_workers() -> usize {
    num_cpus::get()
}
fn default_http_rate_limit() -> usize {
    100
}
fn default_db_dsn() -> String {
    // Sensible default for local dev, but encourage override via DATABASE_URL
    "postgresql://localhost:5432/template1?sslmode=disable".to_string()
}
fn default_db_max_open_conns() -> u32 {
    10
} // Default pool size

// --- Loading Logic ---

pub fn load_config() -> Result<Config, ConfigError> {
    // 1. Get base defaults and parse CLI args + mapped env vars
    // Clap's `Parser::parse()` reads args and env vars defined in `#[clap(env = ...)]`
    let cli_args = Config::parse();

    // 2. Determine configuration file path
    // Priority: CLI flag > Env Var > Default ("Settings.toml")
    let config_file_path = cli_args
        .config_file
        .clone()
        .or_else(|| std::env::var("APP_CONFIG_FILE").ok().map(PathBuf::from))
        .unwrap_or_else(|| PathBuf::from("Settings.toml")); // Default file name

    tracing::debug!(
        "Attempting to load config file from: {:?}",
        config_file_path
    );

    // 3. Initialize config builder
    let builder = config::Config::builder()
        // Add default values (lowest priority)
        // Setting defaults directly in the struct with #[serde(default = ...)]
        // and #[clap(default_value = ...)] is usually sufficient.
        // .set_default("http.host", "127.0.0.1")?
        // .set_default("http.port", 8080)?
        // ... other defaults
        // Add config file source (optional)
        .add_source(File::from(config_file_path.clone()).required(false))
        // Add environment variables source (prefix APP_)
        // Overrides file values. Separator "__" allows nested vars like APP_HTTP__PORT
        .add_source(
            Environment::with_prefix("APP")
                .prefix_separator("_")
                .separator("__")
                .try_parsing(true) // Attempt to parse numbers, bools
                .list_separator(",") // For potential array values
                .with_list_parse_key("some.list"), // Example if needed
        );

    // 4. Build the config from file and environment variables
    let mut cfg: Config = builder.build()?.try_deserialize()?;

    // 5. Apply CLI arguments (highest priority)
    // We need to check if a CLI argument was *actually* provided,
    // not just relying on its default value, to ensure it overrides.
    // We can compare the parsed `cli_args` with a default-parsed version.
    let default_cli_args = Config::parse_from(Vec::<&str>::new()); // Get clap's defaults

    // Merge only if the CLI value differs from clap's own default
    if cli_args.http.host != default_cli_args.http.host {
        cfg.http.host = cli_args.http.host;
    }
    if cli_args.http.port != default_cli_args.http.port {
        cfg.http.port = cli_args.http.port;
    }
    if cli_args.db.dsn != default_cli_args.db.dsn && !cli_args.db.dsn.is_empty() {
        // Ensure CLI DSN isn't just the default empty string from clap if not set
        cfg.db.dsn = cli_args.db.dsn;
    }
    if cli_args.db.max_open_conns != default_cli_args.db.max_open_conns {
        cfg.db.max_open_conns = cli_args.db.max_open_conns;
    }

    // Verbosity: Use the highest value provided (CLI flag overrides lower env/file)
    if cli_args.verbose > cfg.verbose {
        cfg.verbose = cli_args.verbose;
    }

    // Final check: Ensure DATABASE_URL env var (if set directly, not via APP_DB_DSN)
    // takes precedence over everything else for the DSN.
    if let Ok(db_url_env) = std::env::var("DATABASE_URL") {
        if !db_url_env.is_empty() {
            cfg.db.dsn = db_url_env;
        }
    }

    // 6. Final Validation
    if cfg.db.dsn.is_empty() {
        return Err(ConfigError::Message(
            "Database DSN ('db.dsn' or DATABASE_URL) must be set.".into(),
        ));
    }
    if cfg.db.max_open_conns == 0 {
        return Err(ConfigError::Message(
            "'db.max_open_conns' must be greater than 0.".into(),
        ));
    }

    // Log the final loaded configuration (mask sensitive info like DSN password)
    let mut logged_cfg = cfg.clone();
    logged_cfg.db.dsn = crate::database::mask_dsn_password(&logged_cfg.db.dsn);
    tracing::debug!(final_config = ?logged_cfg, "Final configuration loaded");

    Ok(cfg)
}
