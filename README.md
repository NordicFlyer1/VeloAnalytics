# VeloAnalytics

> **High-Performance Cycling Analytics & Physiological Modeling**  
> A standalone, local-first engine for high-resolution .FIT file analysis, W' Balance modeling, and training load analytics.

[Visit Landing Page](https://NordicFlyer1.github.io/VeloAnalytics/) • [Releases & Downloads](https://github.com/NordicFlyer1/VeloAnalytics/releases) • [Source-Available License](LICENSE)

---

## Overview

VeloAnalytics is a high-precision, local-first cycling analysis suite built for cyclists and performance practitioners who demand mathematical transparency and complete data sovereignty.

- **100% Local & Private:** All .FIT file parsing, mathematical recalculations, and database records remain exclusively on your device. Telemetry is processed locally and never transmitted to external servers.
- **W' Balance & Anaerobic Battery:** Dynamic recovery and expenditure tracking modeled on Critical Power (CP) and Skiba mathematical equations with fatigue non-stationarity adjustments.
- **Power Duration Curve:** High-resolution Mean Maximal Power (MMP) analysis from 1-second sprints to multi-hour endurance efforts, featuring multi-ride comparative overlays.
- **Cycling Dynamics & Biomechanical Modeling:** Dedicated multi-channel telemetry timelines and polar vector crank dials for Left/Right Balance, Platform Center Offset (PCO), Power Phase (PP), Peak Power Phase (PPP), seated vs. standing transitions, and torque effectiveness.
- **Interactive Route Telemetry:** Synchronized cross-scrubbing between power output, altitude, cadence, and GPS tracks with full-screen expansion.
- **Holistic Metric Integration:** Native correlation of power data with heart rate variability (HRV), respiration rate, blood oxygen (SpO₂), ambient temperature, and aerodynamic drag estimates.
- **Native Desktop & Web:** Available as a standalone native desktop application for macOS (Apple Silicon & Intel) via Tauri, as well as a client-side web application.

## What's New in v1.6.1

- **Dedicated Dual macOS Desktop Releases:** Release workflow now targets both Apple Silicon (`macos-14` / ARM64) and Intel (`macos-15` / x86_64) runners, publishing dedicated native `.dmg` bundles alongside Windows and Linux.
- **Vercel Web Garmin Connect Proxy:** Production-ready API proxy rewrite in `vercel.json` routing `/api/garmin/:path*` directly to Garmin Connect, resolving browser CORS restrictions and delivering full sync capability across both web and desktop.

---

## What's New in v1.6.0

- **Garmin Connect Daily Health & Sleep Sync:** Direct synchronization with Garmin Connect API for sleep telemetry, HRV trends, and daily biometric health tracking.
- **Resting Heart Rate (RHR) Extraction & Charting:** Fully integrated daily resting heart rate extraction into both the Sleep Trends and Recovery Status panels, featuring multi-source fallback (`daily_heart_rate.restingHeartRateInBeatsPerMinute` and sleep record `restingHeartRate`) with smart linear interpolation across missing gap days.
- **Multi-Platform Desktop & Web Parity:** Synchronized version parity across desktop native configurations (Tauri v2 / Rust for macOS, Windows, Linux) and the web client.
- **Zero-Drop Rate Limiter:** Enhanced Garmin Connect HTTP client retry logic with exponential backoff and rate-limit preservation for robust batch telemetry ingestion.

---

## What's New in v1.5.2

- **Decoupled Weather Timer Churn:** Decoupled external weather fetching from timeline cursor hover (`activePoint`). Weather now queries once on activity load at the ride's start coordinates, eliminating continuous timer arming/canceling and redundant network scheduling during 60 FPS chart scrubbing.
- **Deduplicated Summary Metric Recalculator:** Added an activity signature cache to `useDataRecalculator` that eliminates duplicate 15,000-point metric passes ($O(N)$ rolling fourth-power math, BikeScore, and zone distributions) when the background W' balance worker attaches anaerobic battery data.
- **Repository Cleanliness Hardening:** Enforced `.gitignore` rules for temporary platform attachment paths (`public/`), ensuring clean Git histories and zero unwanted assets in local or remote repositories.

---

## What's New in v1.5.1

- **Day Mode Theme & Contrast Resolution:** Synchronized Tailwind v4 dark variant selectors (`@custom-variant dark`) and standardized upload dialog tokens (`bg-app-card`, `border-app-border`, `text-app-text`), eliminating dark text-on-dark contrast anomalies.
- **Mobile Activity History Full-Screen View:** Elevated the mobile Activity History drawer into an edge-to-edge full-screen slide-in interface matching Velo Coach, complete with a touch-friendly circular dismiss control.
- **Map Controls Header Scroll Pass-Through:** Recalibrated Activity Map overlay controls (Standard / Terrain capsule toggle and highlight point buttons) to `z-20` so all elements pass smoothly underneath the sticky top navigation bar (`z-50`) when scrolling.
- **Leaflet Lifecycle Resilience:** Added unmount safeguards to Leaflet's `ResizeObserver` lifecycle within map bounds handling to prevent null container reference warnings.

---

## What's New in v1.5.0

- **Dual-Worker Threading Pipeline:** Isolated UI and Batch Web Worker channels ensure active ride charts, power curves, and W' balance compute in $<50\text{ms}$ with zero queue starvation during batch ingestion.
- **Foreground Priority Scheduling:** Selecting an activity to view instantly pauses background file processing, yielding 100% of CPU and worker threads to the active ride.
- **Interactive Queue Controls:** Tactile capsule controls (Pause / Resume) in the upload queue header and floating status pill allow effortless manual or automatic queue pacing.
- **$\le$ 8GB RAM Optimization:** Raw telemetry points stream directly to IndexedDB disk storage while JavaScript heap memory is immediately freed (`item.data = undefined`), eliminating WebKit/Chromium out-of-memory ("Sad Mac") crashes.
- **Throttled Batch State Loop:** Reduced React progress re-render cycles by 75% during batch file processing, preventing UI freezes when switching between the upload queue and the dashboard.
- **Theme-Aware Backdrop:** Light View features an airy faded orange drag indicator and modal backdrop (`bg-orange-500/10`), paired with deep glassmorphism in Dark View.
- **Tauri v2 Native Hardening:** Streamlined desktop window drop handlers to prevent IPC event collisions across macOS, Windows, and Linux.

---

## Downloads

Native desktop packages and installers are available directly from the repository's releases:

[Download Desktop Releases](https://github.com/NordicFlyer1/VeloAnalytics/releases)

---

## Documentation & Guides

- [Landing Page](https://NordicFlyer1.github.io/VeloAnalytics/)
- [Physiological Methodology & Formulae](docs/METHODOLOGY.md)
- [macOS Desktop Installation Guide](docs/MACOS_INSTALL.md)
- [Local Build Guide](docs/LOCAL_BUILD.md)

---

## License & Attribution

VeloAnalytics is **Source-Available software** and is **not open source**. 

Copyright © Bruce H. Kraus. All rights reserved.

Use, distribution, and modification of this software are governed strictly by the **[VeloAnalytics Software License](LICENSE)**:

- **Non-Commercial Use Only:** Free for personal, non-commercial athletic analysis and educational use. Commercial use—including use by paid coaches, bike fitters, subscription services, or for-profit businesses—requires a separate written commercial license from the Licensor.
- **No Contributions Accepted:** This repository is published on a read-only basis. Pull requests, code contributions, feature requests, or issue submissions are not accepted.
- **Distribution & Modifications:** Any permitted distribution or modified version must adhere strictly to the conditions in Sections 4 and 5 of the License, including preserving all copyright notices, license terms, and mandatory attribution.

> **Attribution Notice:**  
> VeloAnalytics is created and maintained by Bruce H. Kraus.  
> Source: https://github.com/NordicFlyer1/VeloAnalytics
