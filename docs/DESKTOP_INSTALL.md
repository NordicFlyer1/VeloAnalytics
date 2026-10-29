# Desktop Installation Guide: macOS, Windows & Linux

This guide provides step-by-step instructions for installing and running **VeloAnalytics** on macOS, Windows, and Linux distributions.

---

## 1. macOS Installation

### Standard Installation
1. Download the latest `VeloAnalytics_*.dmg` from the [GitHub Releases](https://github.com/NordicFlyer1/VeloAnalytics/releases) page.
2. Double-click to open the downloaded `.dmg`.
3. Drag **VeloAnalytics** into your **Applications** folder.
4. Eject the disk image.

### Bypassing Gatekeeper ("Damaged and can't be opened")
Because VeloAnalytics is a non-commercial, source-available project distributed without an Apple Developer ID signature ($99/year), macOS Gatekeeper flags the downloaded binary with a browser quarantine attribute.

**The Quick Terminal Resolution:**
1. Open **Terminal.app** (via Spotlight or `Applications > Utilities > Terminal`).
2. Run this command:
  ```bash
  xattr -cr /Applications/VeloAnalytics.app
  ```
3. Open VeloAnalytics from Applications or Launchpad. It will start immediately.

*(For full details and a non-terminal System Settings walkthrough, see [MACOS_INSTALL.md](MACOS_INSTALL.md).)*

---

## 2. Windows Installation (Windows 10 & 11)

### Standard Installation
1. Download either the Windows Installer (`.msi`) or the standalone setup executable (`-setup.exe`) from the [GitHub Releases](https://github.com/NordicFlyer1/VeloAnalytics/releases) page.
2. Double-click the downloaded file to run the installer.
3. Follow the on-screen installation wizard.
4. Once complete, launch **VeloAnalytics** from the Start menu or desktop shortcut.

### Handling Windows SmartScreen ("Windows protected your PC")
Because VeloAnalytics is an independent release without an EV Code Signing certificate, Microsoft Defender SmartScreen may display a blue advisory screen:

> **Windows protected your PC**  
> *Microsoft Defender SmartScreen prevented an unrecognized app from starting.*

**How to Proceed:**
1. Click the underlined link that says **"More info"**.
2. Click the newly revealed **"Run anyway"** button.
3. The installer or application will launch normally.

> **System Requirements for Windows:**  
> - Windows 10 (version 1809 or higher) or Windows 11.  
> - Microsoft Edge WebView2 Runtime (pre-installed on Windows 11 and modern Windows 10 updates; automatically downloaded if missing).

---

## 3. Linux Installation (Ubuntu, Debian, Fedora, Arch, Mint)

VeloAnalytics provides two Linux release packages: an **AppImage** (universal portable binary) and a **.deb** package (for Debian, Ubuntu, and derivatives).

### Option A: AppImage (Universal — Recommended)
The AppImage requires no package installation and runs directly on almost any modern Linux distribution:

1. Download `VeloAnalytics_*_amd64.AppImage` from [GitHub Releases](https://github.com/NordicFlyer1/VeloAnalytics/releases).
2. Open terminal in the download folder and grant execution rights:
  ```bash
  chmod +x VeloAnalytics*.AppImage
  ```
3. Launch the application:
  ```bash
  ./VeloAnalytics*.AppImage
  ```
  *(Or right-click the `.AppImage` in your file manager, select **Properties > Permissions**, check **"Allow executing file as program"**, and double-click it.)*

### Option B: Debian / Ubuntu Package (.deb)
To install VeloAnalytics system-wide on Debian, Ubuntu, or Pop!_OS:

1. Download `velo-analytics_*_amd64.deb` from [GitHub Releases](https://github.com/NordicFlyer1/VeloAnalytics/releases).
2. Open terminal and run:
  ```bash
  sudo dpkg -i velo-analytics*_amd64.deb
  ```
3. If any dependencies are missing, resolve them automatically:
  ```bash
  sudo apt-get install -f
  ```
4. Launch **VeloAnalytics** from your application launcher or by running `velo-analytics` in terminal.

---

## 4. Privacy & Local Storage Guarantees

Regardless of whether you run VeloAnalytics on macOS, Windows, or Linux:
- **100% Local & Offline:** All `.FIT` file parsing, heart rate analysis, power curves, and W' Balance (W'bal) calculations run locally on your device.
- **Zero Telemetry Tracking:** No ride data, GPS coordinates, or biometric information is ever transmitted to external cloud servers.
- **Persistent Data:** Your activity history, personal records, and bike profiles are securely stored in your local application database. Updating to a newer release preserves all existing rides and configuration.
