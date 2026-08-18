// Tauri Rust Command Extension for Siri Sync
// 
// Add these functions into your `src-tauri/src/main.rs` or `src-tauri/src/lib.rs` file.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct VeloRideSnapshot {
    pub date: String,
    pub name: String,
    pub distanceKm: f64,
    pub durationMinutes: i32,
    pub normalizedPower: Option<i32>,
    pub avgPower: Option<i32>,
    pub avgHeartRate: Option<i32>,
    pub tss: i32,
    pub kilojoules: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VeloTrainingBlock {
    pub totalRides: i32,
    pub totalKm: f64,
    pub totalHours: f64,
    pub totalTSS: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppleSiriSnapshot {
    pub timestamp: String,
    pub readinessScore: i32,
    pub readinessStatus: String,
    pub readinessModel: String,
    pub tsb: i32,
    pub sts: i32,
    pub lts: i32,
    pub sleepScore: Option<i32>,
    pub sleepDurationHours: Option<f64>,
    pub hrvOvernight: Option<f64>,
    pub latestRide: Option<VeloRideSnapshot>,
    pub trainingBlock7Days: VeloTrainingBlock,
    pub trainingBlock28Days: VeloTrainingBlock,
}

#[tauri::command]
pub fn sync_siri_snapshot(snapshot: AppleSiriSnapshot) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        if let Some(mut dir) = dirs_next::data_dir() {
            dir.push("com.veloanalytics.app");
            let _ = fs::create_dir_all(&dir);
            
            let file_path = dir.join("siri_snapshot.json");
            let json = serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?;
            fs::write(file_path, json).map_err(|e| e.to_string())?;
            return Ok(true);
        }
    }
    Ok(false)
}
