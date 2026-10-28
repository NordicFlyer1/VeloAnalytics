# Local Build Guide: VeloAnalytics

This guide provides the necessary steps to turn the VeloAnalytics code into a standalone desktop application using Tauri.

## 1. Initial Machine Setup
You only need to perform these installations once per computer.

* **Install Node.js**: Download the "LTS" version from [nodejs.org](https://nodejs.org).
* **Install Rust**: Visit [rustup.rs](https://rustup.rs) or run: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

### System Specific Requirements
Depending on your OS, you need specific build tools:

| System | Requirement | Link / Command |
| :--- | :--- | :--- |
| **Windows** | Microsoft C++ Build Tools | [Tauri Windows Setup](https://tauri.app/v1/guides/getting-started/prerequisites#windows) |
| **macOS** | Apple Command Line Tools | `xcode-select --install` |
| **Linux** | build-essential & libraries | [Tauri Linux Setup](https://tauri.app/v1/guides/getting-started/prerequisites#linux) |

---

## 2. Project Preparation
1. Open your **Terminal** (Mac/Linux) or **PowerShell** (Windows).
2. Navigate to your project folder: Type `cd ` (with a space) and drag your project folder into the terminal window. Press **Enter**.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Install the Tauri CLI tool:
   ```bash
   npm install --save-dev @tauri-apps/cli
   ```

---

## 3. Desktop Configuration (Tauri v2)

### Recommended: Use Pre-Configured Templates
This repository includes ready-to-use Tauri v2 configuration templates under `native-macos/src-tauri-templates/`. Simply copy them into your `src-tauri` directory:

```bash
mkdir -p src-tauri/src src-tauri/capabilities
cp native-macos/src-tauri-templates/Cargo.toml src-tauri/Cargo.toml
cp native-macos/src-tauri-templates/default.json src-tauri/capabilities/default.json
cp native-macos/src-tauri-templates/lib.rs src-tauri/src/lib.rs
cp native-macos/src-tauri-templates/main.rs src-tauri/src/main.rs
cp native-macos/src-tauri-templates/tauri.conf.json src-tauri/tauri.conf.json
```

*(For a full walkthrough including native macOS Siri AppIntents, see `native-macos/STEP-BY-STEP-GUIDE.md`.)*

### Alternative: Manual Initialization
If initializing from scratch with `npx tauri init`:
- **Window title**: VeloAnalytics
- **Frontend distribution (Assets)**: `../dist`
- **Dev server URL**: `http://localhost:3000` *(Vite runs on port 3000)*
- **Build command**: `npm run build`
- **Dev command**: `npm run dev`
- **Identifier**: `com.bruce.veloanalytics` in `tauri.conf.json`

---

## 4. Launch & Build
* **To Run in Development** (Live Preview):
  ```bash
  npx tauri dev
  ```

* **To Build Final Installer** (.exe, .app, or .deb):
  ```bash
  npx tauri build
  ```

*Note: The first build will take several minutes to download and compile Rust dependencies.*

---

## 5. Customizing App Icons
To replace the default Tauri logo with the VeloAnalytics branding:
1. Place a high-resolution square PNG (1024x1024) in your root folder named `app-icon.png`.
2. Run the icon generator:
   ```bash
   npx tauri icon app-icon.png
   ```
3. This will automatically generate all required sizes for your specific operating system's taskbar and windows.
