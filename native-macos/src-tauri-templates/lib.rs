// Complete, drop-in replacement for `src-tauri/src/lib.rs`
// Generated for VeloAnalytics macOS desktop app with Siri integration and zero-Origin local AI streaming.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::ipc::Channel;
use tauri_plugin_http::reqwest;

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

struct LocalAiStreamState {
    cancellations: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

struct StreamCleanupGuard {
    cancellations: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
    request_id: String,
}

impl Drop for StreamCleanupGuard {
    fn drop(&mut self) {
        if let Ok(mut map) = self.cancellations.lock() {
            map.remove(&self.request_id);
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
enum LocalAiStreamEvent {
    Meta {
        status: u16,
        #[serde(rename = "contentType")]
        content_type: String,
    },
    Chunk(Vec<u8>),
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

#[tauri::command]
fn cancel_local_ai_stream(
    request_id: String,
    state: tauri::State<'_, LocalAiStreamState>,
) -> Result<(), String> {
    if let Ok(map) = state.cancellations.lock() {
        if let Some(flag) = map.get(&request_id) {
            flag.store(true, Ordering::Relaxed);
        }
    }
    Ok(())
}

/// Executes an HTTP POST directly via reqwest (without Origin, Referer, or Sec-Fetch-* headers)
/// strictly to loopback addresses (`127.0.0.1`, `localhost`, `[::1]`) and streams chunks over a Tauri Channel.
#[tauri::command]
async fn local_ai_chat_stream(
    request_id: String,
    url: String,
    body: String,
    api_key: Option<String>,
    on_event: Channel<LocalAiStreamEvent>,
    state: tauri::State<'_, LocalAiStreamState>,
) -> Result<(), String> {
    let parsed = reqwest::Url::parse(&url).map_err(|e| format!("Invalid local AI URL: {}", e))?;

    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err("Local AI loopback stream only supports http:// or https:// URLs.".to_string());
    }

    let host = parsed.host_str().unwrap_or("");
    if host != "127.0.0.1" && host != "localhost" && host != "[::1]" {
        return Err(
            "Local AI loopback stream is restricted to 127.0.0.1, localhost, or [::1].".to_string(),
        );
    }

    let cancel_flag = Arc::new(AtomicBool::new(false));
    {
        let mut map = state
            .cancellations
            .lock()
            .map_err(|_| "Failed to lock local AI stream state.".to_string())?;
        map.insert(request_id.clone(), cancel_flag.clone());
    }
    let _cleanup = StreamCleanupGuard {
        cancellations: state.cancellations.clone(),
        request_id,
    };

    let client = reqwest::Client::builder()
        .no_proxy()
        .build()
        .map_err(|e| format!("Failed to initialize local HTTP client: {}", e))?;

    let mut req = client
        .post(parsed)
        .header("Content-Type", "application/json")
        .header("Accept", "text/event-stream, application/json")
        .body(body);

    if let Some(key) = api_key {
        let trimmed = key.trim();
        if !trimmed.is_empty() {
            req = req.bearer_auth(trimmed);
        }
    }

    let mut response = req.send().await.map_err(|e| format!("{}", e))?;

    if cancel_flag.load(Ordering::Relaxed) {
        return Err("Request cancelled".to_string());
    }

    let status = response.status().as_u16();
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    on_event
        .send(LocalAiStreamEvent::Meta {
            status,
            content_type,
        })
        .map_err(|e| format!("Failed to send stream metadata: {}", e))?;

    while let Some(chunk) = response.chunk().await.map_err(|e| format!("{}", e))? {
        if cancel_flag.load(Ordering::Relaxed) {
            return Err("Request cancelled".to_string());
        }
        if !chunk.is_empty() {
            on_event
                .send(LocalAiStreamEvent::Chunk(chunk.to_vec()))
                .map_err(|e| format!("Failed to send stream chunk: {}", e))?;
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(LocalAiStreamState {
            cancellations: Arc::new(Mutex::new(HashMap::new())),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            sync_siri_snapshot,
            local_ai_chat_stream,
            cancel_local_ai_stream
        ])
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
