# 🍎 VeloAnalytics macOS & Siri Integration Guide (Baby Steps)

This guide walks you through enabling **Siri Voice, Type to Siri, and macOS Spotlight** integration with VeloAnalytics.

---

## 🚀 Option 1: Web App / Browser (Zero-Build Quickstart)

If you use VeloAnalytics in Safari or Google Chrome:

1. Open VeloAnalytics.
2. Go to **Settings** (gear icon) → scroll down or click the **Apple Intelligence & Siri** section.
3. Click **"View Siri Setup & Export"**.
4. Switch to the **Web Shortcuts** tab:
   - Click **Copy Siri JSON Payload** (or **Download**).
5. Open macOS **Shortcuts.app** (pre-installed on your Mac):
   - Click **`+` (New Shortcut)**.
   - Add action: **Get Contents of URL** or **Get Clipboard**.
   - Add action: **Show Result** or **Speak Text**.
   - Name your shortcut `Velo Readiness`.
6. Now simply double-tap `Command` (or say *"Hey Siri, Velo Readiness"*) to run it!

---

## 🛠️ Option 2: Tauri Desktop App (Native macOS Build in Xcode)

Follow these baby steps to compile native macOS App Intents directly into your Tauri app bundle.

### Prerequisites on your Mac:
* macOS 14 (Sonoma) or macOS 15+ (Sequoia / Apple Intelligence beta).
* Xcode 15 or 16 installed from the Mac App Store.
* Node.js & Rust installed (`cargo`).

---

### Step-by-Step Instructions:

#### Step 1: Pull Your Code to Your Mac
```bash
git pull origin main
npm install
```

#### Step 2: Add the Rust Siri Command to Tauri
Open `src-tauri/src/main.rs` (or `src-tauri/src/lib.rs`) and:
1. Copy the code from `native-macos/TauriCommands.rs`.
2. Register the command in your invoke handler:
   ```rust
   .invoke_handler(tauri::generate_handler![
       sync_siri_snapshot,
       // your other commands...
   ])
   ```

#### Step 3: Add the Swift File to Xcode
1. In `src-tauri/tauri.conf.json`, ensure your bundle identifier is set (e.g. `"identifier": "com.veloanalytics.app"`).
2. Run Tauri build once to generate the Xcode macOS target:
   ```bash
   npm run tauri build -- --debug
   ```
3. Open the generated Xcode project:
   - Open `src-tauri/target/debug/bundle/macos/` or Xcode project.
4. Drag `native-macos/VeloAppIntents.swift` into the Xcode project file tree.
5. In Xcode, click your App Target → **Signing & Capabilities**:
   - Click `+ Capability` and add **App Intents**.

#### Step 4: Test Spoken Siri & Type-to-Siri
1. Launch your compiled Tauri app once so it writes its initial state snapshot.
2. Test **Type-to-Siri**:
   - Double-tap `Command` on your Mac keyboard.
   - Type: `What is my Velo Readiness?`
   - Siri will display your Readiness score, recovery status, and TSB form.
3. Test **macOS Spotlight**:
   - Press `⌘ + Space`.
   - Type: `velo readiness` or `ask velo coach`.
   - Press `Return` to jump into the coach or view metrics.

---

## ❓ Troubleshooting & FAQs

* **Q: Does this require an active internet connection?**
  * **A:** No! The native Tauri App Intent reads the local state snapshot directly from your Mac's filesystem (`~/Library/Application Support/com.veloanalytics.app/`). It works 100% offline.
* **Q: Can I use both Type-to-Siri and Voice?**
  * **A:** Yes. macOS treats spoken voice and Type-to-Siri as identical input streams.
* **Q: How do I remove or undo this feature?**
  * **A:** Simply delete the `/native-macos/` and `/src/integrations/apple/` folders. Nothing in your core performance calculations or activity parsers depends on them.
