# macOS Installation & Gatekeeper Guide

This guide explains how to install and open **VeloAnalytics** on macOS, and how to resolve the common Gatekeeper notice for open-source apps.

---

## Quick Start: Installation

1. Download the latest **`VeloAnalytics_*.dmg`** from the [GitHub Releases](https://github.com/NordicFlyer1/VeloAnalytics/releases) page.
2. Open the downloaded `.dmg` file.
3. Drag **VeloAnalytics** into your **Applications** folder.
4. Eject the disk image.

---

## Resolving the "Damaged and can't be opened" Warning

When you first launch VeloAnalytics on macOS, you may encounter this message:

> **"VeloAnalytics.app" is damaged and can't be opened. You should move it to the Trash.**

### Why does this happen?
**The application is NOT damaged or corrupted.** 

This message is macOS Gatekeeper's default security behavior. Whenever an application is downloaded via a web browser without an expensive, proprietary Apple Developer ID certificate and notarization ($99/year), macOS attaches a temporary browser quarantine flag (`com.apple.quarantine`) to the bundle.

VeloAnalytics is an independent, 100% open-source privacy-first cycling analytics application. All ride data and telemetry remain strictly on your local machine.

---

## How to Fix (Choose Option A or Option B)

### Option A: Terminal (Recommended — Takes 3 Seconds)

1. Ensure **VeloAnalytics.app** is inside your **`/Applications`** folder.
2. Open **Terminal.app** (via Spotlight or `Applications > Utilities > Terminal`).
3. Paste the following command and press **Enter**:

```bash
xattr -cr /Applications/VeloAnalytics.app
```

4. Launch VeloAnalytics from your Applications folder or Dock. It will open immediately without warnings.

> **What does this command do?**  
> `xattr` is the standard macOS utility for extended file attributes. `-c` clears the browser quarantine tag, and `-r` applies it recursively to the application bundle. It does not modify system files or require administrator (`sudo`) privileges.

---

### Option B: macOS System Settings (No Terminal)

1. Open **VeloAnalytics** from your Applications folder until the warning dialog appears, then click **Cancel**.
2. Open **System Settings** on your Mac.
3. Navigate to **Privacy & Security** (in the left sidebar).
4. Scroll down to the **Security** section.
5. You will see a notice:  
   *"VeloAnalytics was blocked from use because it is not from an identified developer."*
6. Click **Open Anyway** and enter your Mac password or use Touch ID.
7. Click **Open** on the final confirmation prompt.

---

## Future Updates

When updating to a new version of VeloAnalytics, simply drag the new version into `/Applications` and choose **Replace**. Your saved rides, gear profiles, preferences, and local cache will be automatically preserved!
