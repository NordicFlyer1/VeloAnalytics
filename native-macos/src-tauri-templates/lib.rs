// Complete, drop-in replacement for `src-tauri/src/lib.rs`
// Generated for VeloAnalytics macOS desktop app with Siri integration.

use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct VeloRideSnapshot {
    pub date: String,
    pub name: String,
    pub distanceKm: f64,
    pub durationMinutes: i32,
    pub xPower: Option<i32>,
    pub relativeIntensity: Option<f64>,
    pub avgPower: Option<i32>,
    pub avgHeartRate: Option<i32>,
    pub bikeScore: i32,
    pub workKilojoules: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VeloTrainingBlock {
    pub totalRides: i32,
    pub totalKm: f64,
    pub totalHours: f64,
    pub totalBikeScore: i32,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize)]
pub struct AppleSiriSnapshot {
    pub timestamp: String,
    pub readinessScore: i32,
    pub readinessStatus: String,
    pub readinessModel: String,
    pub veloReadinessScore: Option<i32>,
    pub veloReadinessStatus: Option<String>,
    pub isVeloReadinessEnabled: Option<bool>,
    pub activeScoreType: Option<String>,
    pub stressBalance: i32,
    pub shortTermStress: i32,
    pub longTermStress: i32,
    pub sleepScore: Option<i32>,
    pub sleepDurationHours: Option<f64>,
    pub hrvOvernight: Option<f64>,
    pub latestRide: Option<VeloRideSnapshot>,
    pub trainingBlock7Days: Option<VeloTrainingBlock>,
    pub trainingBlock28Days: Option<VeloTrainingBlock>,
}

#[tauri::command]
pub fn sync_siri_snapshot(snapshot: AppleSiriSnapshot) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        if let Some(data_dir) = dirs_next::data_dir() {
            for bundle_id in &["com.bruce.veloanalytics", "com.veloanalytics.app"] {
                let dir = data_dir.join(bundle_id);
                let _ = fs::create_dir_all(&dir);
                let file_path = dir.join("siri_snapshot.json");
                if let Ok(json) = serde_json::to_string_pretty(&snapshot) {
                    let _ = fs::write(file_path, json);
                }
            }
            return Ok(true);
        }
    }
    Ok(false)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![sync_siri_snapshot])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
