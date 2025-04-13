use serde::{Deserialize, Serialize};

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
