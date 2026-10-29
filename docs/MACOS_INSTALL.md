# macOS Installation & Gatekeeper Guide

This guide explains how to install and run **VeloAnalytics** on macOS, and how to resolve the standard Gatekeeper security notice for source-available applications.

---

## 1. Quick Start: Installation

1. Download the latest **`VeloAnalytics_*.dmg`** from the [GitHub Releases](https://github.com/NordicFlyer1/VeloAnalytics/releases) page.
2. Open the downloaded `.dmg` disk image.
3. Drag **VeloAnalytics** into your **Applications** folder.
4. Eject the disk image.

---

## 2. Resolving the "Damaged and can't be opened" Warning

When you first launch VeloAnalytics on macOS, you may encounter this dialog:

> **"VeloAnalytics.app" is damaged and can't be opened. You should move it to the Trash.**

### Why does this happen?
**The application is NOT damaged or corrupted.**

This dialog is macOS Gatekeeper's default security response. Whenever an application is downloaded via a web browser without an Apple Developer ID signature ($99/year), macOS attaches a temporary browser quarantine flag (`com.apple.quarantine`) to the application bundle.

VeloAnalytics is an independent, source-available, non-commercial cycling analytics suite. All ride data, biometrics, and telemetry remain strictly on your local machine.

---

## 3. How to Resolve (Choose Option A or Option B)

### Option A: Terminal (Recommended — Takes 3 Seconds)

1. Ensure **VeloAnalytics.app** is inside your **`/Applications`** folder.
2. Open **Terminal.app** (via Spotlight `Cmd + Space` or `Applications > Utilities > Terminal`).
3. Paste the following command and press **Enter**:
  ```bash
  xattr -cr /Applications/VeloAnalytics.app
  ```
4. Launch VeloAnalytics from Applications or Launchpad. It will start immediately without prompts.

> **Note on xattr:**  
> `xattr` is the standard macOS utility for extended file attributes. The `-c` flag clears the quarantine tag, and `-r` applies recursively to the application bundle. It does not alter system files or require administrator (`sudo`) privileges.

---

### Option B: macOS System Settings (GUI Method)

1. Open **VeloAnalytics** from your Applications folder until the warning dialog appears, then click **Cancel**.
2. Open **System Settings** on your Mac.
3. Navigate to **Privacy & Security** in the left sidebar.
4. Scroll down to the **Security** section.
5. You will see an advisory notice:  
   *"VeloAnalytics was blocked from use because it is not from an identified developer."*
6. Click **Open Anyway** and authenticate with your Mac password or Touch ID.
7. Click **Open** on the final confirmation prompt.

---

## 4. Preserving Data During Future Updates

When updating to a newer version of VeloAnalytics, drag the new release `.app` into `/Applications` and select **Replace**. Your saved rides, equipment profiles, physiological thresholds, and local cache are preserved automatically.
