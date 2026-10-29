# Local Build Guide: VeloAnalytics

This guide provides the necessary steps to compile and run VeloAnalytics locally as a standalone native desktop application using Tauri and Rust.

---

## 1. Initial Machine Setup

You only need to perform these installations once per computer.

- **Node.js:** Download and install the active LTS version from [nodejs.org](https://nodejs.org).
- **Rust Toolchain:** Install Rust via [rustup.rs](https://rustup.rs) or run:
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

### Platform Prerequisites

Depending on your operating system, install the platform build tools:

| System | Requirement | Command / Resource |
| :--- | :--- | :--- |
| **macOS** | Apple Command Line Tools | `xcode-select --install` |
| **Windows** | Microsoft C++ Build Tools | [Tauri Windows Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites#windows) |
| **Linux** | build-essential, webkit2gtk, libssl | [Tauri Linux Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites#linux) |

---

## 2. Project Preparation

1. Open your terminal (macOS/Linux) or PowerShell (Windows).
2. Navigate to your project folder:
  ```bash
  cd path/to/VeloAnalytics
  ```
3. Install frontend dependencies:
  ```bash
  npm install
  ```
4. Install the Tauri CLI tool:
  ```bash
  npm install --save-dev @tauri-apps/cli
  ```

---

## 3. Desktop Configuration (Tauri v2)

### Recommended: Pre-Configured Templates
This repository includes ready-to-use Tauri v2 configuration templates under `native-macos/src-tauri-templates/`. Copy them into your `src-tauri` directory:

```bash
mkdir -p src-tauri/src src-tauri/capabilities
cp native-macos/src-tauri-templates/Cargo.toml src-tauri/Cargo.toml
cp native-macos/src-tauri-templates/default.json src-tauri/capabilities/default.json
cp native-macos/src-tauri-templates/lib.rs src-tauri/src/lib.rs
cp native-macos/src-tauri-templates/main.rs src-tauri/src/main.rs
cp native-macos/src-tauri-templates/tauri.conf.json src-tauri/tauri.conf.json
```

*(For a complete walkthrough including native macOS Siri AppIntents, see `native-macos/STEP-BY-STEP-GUIDE.md`.)*

### Alternative: Manual Initialization
If initializing from scratch with `npx tauri init`:
- **Window title:** `VeloAnalytics`
- **Frontend distribution (Assets):** `../dist`
- **Dev server URL:** `http://localhost:3000` *(Vite runs on port 3000)*
- **Build command:** `npm run build`
- **Dev command:** `npm run dev`
- **Identifier:** `com.bruce.veloanalytics` in `tauri.conf.json`

---

## 4. Launch & Build Commands

- **Development Mode (Live Reload):**
  ```bash
  npx tauri dev
  ```

- **Production Desktop Build (.dmg, .msi / .exe, or .AppImage / .deb):**
  ```bash
  npx tauri build
  ```

> **Note:** The initial build will take several minutes to download and compile Rust crates. Subsequent incremental builds complete substantially faster.

---

## 5. Customizing App Icons

To generate platform-specific icons from a master asset:
1. Place a high-resolution square PNG (1024×1024) in your root folder named `app-icon.png`.
2. Run the Tauri icon generator:
  ```bash
  npx tauri icon app-icon.png
  ```
3. Tauri will automatically generate and place all required icon sizes across macOS, Windows, and Linux directories.
