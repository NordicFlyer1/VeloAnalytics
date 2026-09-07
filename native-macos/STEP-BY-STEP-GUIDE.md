# 🍎 VeloAnalytics macOS & Siri Build Guide

This is the complete, unified step-by-step guide for building the **VeloAnalytics** native macOS desktop app using **Tauri & Rust**, including automated **Siri Voice, Type to Siri, and macOS Spotlight** integration.

---

## 🧠 How Siri Works with VeloAnalytics

VeloAnalytics uses a clean, fast **3-step relay**:

1. **React Web App:** Calculates your readiness, sleep, training load, and recent rides.
2. **Tauri / Rust Bridge:** Writes a lightweight local snapshot file to your Mac disk:  
   `~/Library/Application Support/com.bruce.veloanalytics/siri_snapshot.json`
3. **Siri / macOS:** Reads that local file whenever you speak or type.  
   * **Instant Response (<50ms):** Siri never has to boot the whole app or recalculate weeks of data.
   * **100% Offline & Private:** Your health and power numbers never leave your Mac.
   * **Works When App is Closed:** Siri can answer your readiness queries at any time.

---

## 1. The Setup (Run Once on Your Mac)

Open **Terminal** and navigate to your project folder:

```bash
cd ~/path/to/VeloAnalytics
```

Install the Tauri CLI locally and initialize:

```bash
npm install -D @tauri-apps/cli@latest
npx tauri init
```

### Quick answers for the `npx tauri init` prompts:
* **Window title:** `VeloAnalytics - Slightly Ahead of Our Time`
* **Assets path:** `../dist`
* **Dev server:** `http://localhost:5173` (or `http://localhost:3000`)
* **Build command:** `npm run build`
* **Dev command:** `npm run dev`

---

## 1.1 Assets, Icons & Configuration

1. **Copy App Assets:**  
   Copy the `app-assets` folder into the main project root directory (found in `VeloAnalytics Build > Other folder`).
2. **Set the Bundle Identifier:**  
   Open `src-tauri/tauri.conf.json` in your editor. Ensure line 5 is set to your custom identifier:
   ```json
   "identifier": "com.bruce.veloanalytics"
   ```
3. **Generate App Icons:**  
   Delete the default `icons` folder inside `src-tauri`, then run:
   ```bash
   npx tauri icon ./app-assets/icon.png
   ```

---

## 1.2 Adding the Siri Rust Bridge to Tauri

This step enables Rust to receive the snapshot from React and save it to `~/Library/Application Support/com.bruce.veloanalytics/siri_snapshot.json`.

### A. Add Dependencies to `src-tauri/Cargo.toml`
Open `src-tauri/Cargo.toml` in your text editor and ensure these crates are present under `[dependencies]`:

```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
dirs-next = "2.0"
tauri = { version = "2", features = [] } # or your installed tauri version
```

### B. Add the Sync Command to `src-tauri/src/main.rs` (or `lib.rs`)
Open `src-tauri/src/main.rs` (or `src-tauri/src/lib.rs` if using Tauri v2) and paste the code from `native-macos/TauriCommands.rs`:

```rust
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

#[derive(Debug, Serialize, Deserialize)]
pub struct AppleSiriSnapshot {
    pub timestamp: String,
    pub readinessScore: i32,
    pub readinessStatus: String,
    pub readinessModel: String,
    pub stressBalance: i32,
    pub shortTermStress: i32,
    pub longTermStress: i32,
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
```

### C. Register the Command in your Tauri Builder
In that same file, add `sync_siri_snapshot` inside the `invoke_handler`:

```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        sync_siri_snapshot
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
```

---

## 2. The Development Loop

Use this command while developing or testing locally. It opens a native macOS window that auto-refreshes when you edit code:

```bash
npx tauri dev
```

*When the app runs and calculates readiness, it will automatically write `siri_snapshot.json` to your Mac!*

---

## 3. The "Release" Build (For Distribution)

When you are ready to compile the standalone `.app` file:

```bash
npx tauri build
```

**Where is the file?**  
Look in: `src-tauri/target/release/bundle/macos/VeloAnalytics.app`

---

## 4. Sending to Friends (The Safe Way)

To prevent macOS from corrupting file permissions or quarantine attributes during download, compress it into a `.zip` using macOS `ditto`:

```bash
# Navigate to the folder where the .app lives
cd src-tauri/target/release/bundle/macos/

# Create the clean zip
ditto -c -k --sequesterRsrc --keepParent VeloAnalytics.app VeloAnalytics.zip
```

---

## 5. Enabling Siri & Spotlight on macOS

Now that your app writes `siri_snapshot.json`, you have two great ways to use Siri:

### Option A: macOS Shortcuts (Recommended — Fast & Zero Xcode)
This works immediately on any Mac without installing or opening Xcode:

1. Launch your compiled `VeloAnalytics.app` once so it generates the first snapshot.
2. Open the built-in macOS **Shortcuts.app** (`⌘ + Space` → `Shortcuts`).
3. Click **`+` (New Shortcut)** and name it **"Velo Readiness"**.
4. Add these 3 simple actions:
   * **Get File from Folder:** Navigate to `Library/Application Support/com.bruce.veloanalytics/siri_snapshot.json` (uncheck "Show Document Picker").
   * **Get Dictionary Value:** Set key to `readinessScore`.
   * **Show Result / Speak Text:**  
     `"Your Velo Readiness is (Dictionary Value) out of 100."`
5. **Test it:** Say *"Hey Siri, Velo Readiness"* or type `Velo Readiness` into Spotlight!

### Option B: Native Swift App Intents (Xcode Build)
If you want the voice commands baked directly into the `.app` bundle:
1. Ensure your active developer directory is set:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```
2. In Xcode, open your macOS app target.
3. Drag `native-macos/VeloAppIntents.swift` into the Xcode file tree (check *"Copy items if needed"*).
4. Under **Signing & Capabilities**, click `+ Capability` and add **App Intents**.
5. Build the project (`⌘ + R`).
6. You can now use native spoken commands:
   * *"Hey Siri, What is my Velo Readiness?"*
   * *"Hey Siri, Get Latest Velo Ride"*
   * *"Hey Siri, Get Velo Training Block"*

---

## 📋 Summary Checklist & Pro-Tips

* **Permission denied during npm commands?**  
  Always use `npx` (never `sudo npm`).
* **App won't open for friends (macOS Gatekeeper warning)?**  
  Tell them: **Right-Click the app → Open → Click "Open"**. This is required once for any Mac app not notarized through an Apple Developer paid team account.
* **Leaflet CSS Warning in console?**  
  Move your Leaflet `@import` statement to the very top line of your CSS file.
* **Verify Siri snapshot file on disk:**  
  You can verify the snapshot was written at any time in Terminal:
  ```bash
  cat "$HOME/Library/Application Support/com.bruce.veloanalytics/siri_snapshot.json"
  ```
