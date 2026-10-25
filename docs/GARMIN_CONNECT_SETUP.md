# Garmin Connect Personal API Integration Guide

VeloAnalytics integrates directly with Garmin's **Personal Developer Program API**, enabling 1-click on-demand synchronization for your cycling activities (`.FIT` files) and health recovery metrics (Sleep Stages, Sleep Scores, and Overnight HRV).

---

## 1. What is the Garmin Personal API?

Garmin provides a personal API token interface allowing individual athletes and developers to access their own Garmin Connect data programmatically without needing a commercial enterprise agreement or a hosted OAuth server.

* **Swagger Documentation:** [Garmin Personal API Swagger](https://developer.garmin.com/gc-developer-program/personal/swagger-docs/)
* **Personal FAQ:** [Garmin Developer Program FAQ](https://developer.garmin.com/gc-developer-program/personal/personal-faq/)

---

## 2. Generating Your Personal API Key

1. Log in to [Garmin Connect Web](https://connect.garmin.com) on your computer.
2. Navigate to the Garmin Developer Portal for Personal Use:
   - Go to [developer.garmin.com/gc-developer-program/personal/](https://developer.garmin.com/gc-developer-program/personal/)
3. Generate a **Personal API Key**:
   - Copy the generated API key string.
   - Keep this key private. It provides read access to your personal activities and health records.

---

## 3. Configuring VeloAnalytics

1. Open VeloAnalytics in your browser or desktop app.
2. Click **Settings** (gear icon in the top header).
3. Select the **Garmin Connect** tab.
4. Paste your **Garmin Personal API Key** into the API Key input.
5. Click **Test Connection**.
   - VeloAnalytics exchanges your key for a short-lived token via `POST /personalapitoken-service/personal-api/personal-api-key/token`.
   - A green **Connected** badge will appear along with your Garmin display name upon successful verification.
6. Toggle whether you want to sync **Cycling Activities** and **Health & Sleep Data**.
7. Close Settings.

---

## 4. Synchronizing Your Data

### On-Demand Sync
* Click the **Sync Garmin** capsule button in the top navigation header at any time.
* Alternatively, click **Sync Garmin** directly from the activity upload view.
* The sync modal opens, allowing you to customize:
  - **Cycling Activity Count:** 10, 20, or 50 most recent rides.
  - **Health Lookback Range:** 7, 14, or 30 days of sleep and overnight HRV.
* Click **Sync Garmin** to initiate the download:
  - VeloAnalytics checks which rides are already saved locally using a 3-tier duplicate detection system (`activityId`, file name, and timestamp proximity).
  - New `.FIT` files are downloaded directly and fed into the Web Worker parsing queue.
  - Sleep stages, sleep scores, and overnight HRV trends are upserted into your local recovery history.

---

## 5. Privacy & Architecture Guarantees

* **100% Client-Side:** Your API key and activity records are stored exclusively on your device (`localStorage` / IndexedDB). No data passes through any third-party servers.
* **Dual Runtime Support:**
  - **macOS Desktop App (Tauri):** Network requests utilize native system HTTP transport, completely bypassing web browser CORS limitations.
  - **Web Browser:** Handled seamlessly via local dev reverse-proxy (`/api/garmin` -> `https://personal.connectapi.garmin.com`).
* **Non-Destructive Coexistence:** Dragging and dropping manual `.FIT` files or uploading CSV health files remains fully supported at all times.
