// Complete, drop-in replacement for `src-tauri/src/lib.rs`
// Generated for VeloAnalytics macOS desktop app with Siri integration.

use serde::{Deserialize, Serialize};
use std::fs;

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize)]
struct VeloRideSnapshot {
    date: String,
    name: String,
    distanceKm: f64,
    durationMinutes: i32,
    xPower: Option<i32>,
    relativeIntensity: Option<f64>,
    avgPower: Option<i32>,
    avgHeartRate: Option<i32>,
    bikeScore: i32,
    workKilojoules: Option<i32>,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize)]
struct VeloTrainingBlock {
    totalRides: i32,
    totalKm: f64,
    totalHours: f64,
    totalBikeScore: i32,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize)]
struct AppleSiriSnapshot {
    timestamp: String,
    readinessScore: i32,
    readinessStatus: String,
    readinessModel: String,
    veloReadinessScore: Option<i32>,
    veloReadinessStatus: Option<String>,
    isVeloReadinessEnabled: Option<bool>,
    activeScoreType: Option<String>,
    stressBalance: i32,
    shortTermStress: i32,
    longTermStress: i32,
    sleepScore: Option<i32>,
    sleepDurationHours: Option<f64>,
    hrvOvernight: Option<f64>,
    latestRide: Option<VeloRideSnapshot>,
    trainingBlock7Days: Option<VeloTrainingBlock>,
    trainingBlock28Days: Option<VeloTrainingBlock>,
}

#[tauri::command]
fn sync_siri_snapshot(snapshot: AppleSiriSnapshot) -> Result<bool, String> {
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
