# VeloAnalytics Intelligence & Infrastructure Documentation

## Overview
VeloAnalytics integrates a sophisticated AI Coaching engine designed to act as a clinical-grade sports scientist. Unlike generic chat assistants, our coach is **context-aware**, meaning it has access to your real performance data, historical trends, and physiological thresholds.

---

## 1. Secret Management (The Waterfall Strategy)

VeloAnalytics utilizes a multi-layered priority system for managing API keys (Gemini, Google Maps, OpenWeatherMap, etc.). This ensures maximum flexibility for both hosted (Vercel) and local (Tauri/Dev) environments.

### Priority 1: Settings Panel (Local Storage)
*   **Location:** Settings > Intelligence Tab
*   **Behavior:** Any key pasted here takes absolute precedence (**BYOK** - Bring Your Own Key). 
*   **Security:** Keys are stored strictly within the user's browser `localStorage`. They are never sent to our servers.

### Priority 2: Environment Variables (.env / Vercel Dashboard)
*   **Fallback:** If the Settings Panel field is empty, the app falls back to build-time environment variables.
*   **Vite Prefixes:**
    *   `VITE_GEMINI_API_KEY`
    *   `VITE_GOOGLE_MAPS_API_KEY`
    *   `VITE_OPENWEATHERMAP_API_KEY`

---

## 2. AI Providers & "Bring Your Own Key" (BYOK)

VeloAnalytics does not charge for AI access. Instead, we use the BYOK model to give you total control over costs, privacy, and model quality.

### Cloud Providers (Online)
*   **Google Gemini**: Optimized for speed and large context windows. Best for daily summaries. (Default: Gemini 1.5 Pro).
*   **OpenAI (GPT-4o)**: Exceptional reasoning and clinical analysis.
*   **Anthropic (Claude 3.5)**: Highly nuanced coaching personas and data interpretation.

### Local Providers (Offline/Private)
*   **Ollama / LM Studio**: Run models (like Phi-4, Llama 3, Gemma 3) entirely on your own hardware using OpenAI-compatible endpoints.
*   **Privacy**: Data never leaves your machine.
*   **Cost**: Forever free.

---

## 3. Data Access & Privacy

The Velo Coach is built on a **Zero-Storage** architecture.

### What the AI can see:
When you send a message, the app bundle provides the AI with a dense physiological context:
1.  **Thresholds**: Your established **Critical Power (CP)** and **W' Balance** (anaerobic battery).
2.  **Summarization / Active Activity Summary**:
    *   **Intensity**: xPower (NP), Relative Intensity (RI), BikeScore, and total **Work (KJ)**.
    *   **Sensors**: Average and Maximum values for **Power**, **Heart Rate**, **Cadence**, and **Speed**.
    *   **Geography/Physics**: Total **Distance**, **Total Ascent** (Climbing), and **Aerobic Decoupling** (Efficiency/Pw:HR).
3.  **Fitness Trends (PMC)**: Your current **CTL** (Fitness), **ATL** (Fatigue), and **TSB** (Form/Freshness).
4.  **Historical Library**: A searchable index of your 20 most recent activities (Name, Date, FileName, and BikeScore).

### Security Model:
*   **Local Processing**: All data parsing happens in your browser/app. No VeloAnalytics server ever sees your files.
*   **Direct-to-Vendor**: Your API keys are used to talk directly to Google/OpenAI/Anthropic from your browser.
*   **Local-First Option**: If using a Local LLM provider (Ollama/LM Studio), the data never leaves your computer.
*   **GitHub Safety**: The code is architected to never store hardcoded keys. User-provided keys stay in `localStorage`. Environment variables (like `.env`) are excluded from version control via `.gitignore`, ensuring no secrets are accidentally pushed to GitHub.

---

## 4. Intelligent File Search & Synergy

The coach understands your naming conventions and historical data.
1.  **Filter by Metric**: You can search your library for specific values like "BikeScore 150" or "280W" in the History Panel.
2.  **Date/File Verification**: Quickly isolate a ride by its naming convention (e.g., `2026_04_13`).
3.  **Targeted Queries**: Once filtered, you can ask the coach: *"Analyze my MyWhoosh ride from the 13th that had 120 BikeScore."* 

---

## 5. Environment & Platform Portability

### Web (Vercel/Standard Browser)
*   **State:** Persistent across sessions via `localStorage`. 
*   **Behavior:** If you clear your browser cache/site data, your keys and history will be lost unless you have exported a backup.
*   **Key Protection:** Use your hosting provider's (e.g., Vercel) dashboard to manage fallback environment variables.

### Desktop (Tauri/Standalone)
*   **State:** Persistent. Tauri manages the webview's storage consistently.
*   **Build Fallbacks:** If building a redistribution binary, you can include a `.env` file at the root. Vite will bake these into the app as Priority 2 fallbacks.
*   **User Priority:** Even in the desktop binary, a user can override the built-in keys via the Settings > Intelligence panel.

---

## 6. Maintenance & Portability

### Export / Import Settings
*   **Functionality:** Found in Settings > Maintenance.
*   **Export:** Captures all `localStorage` configuration (Settings, API Keys, Physiological Thresholds, Equipment Profiles) into a single `.json` blob (`veloanalytics_config_backup.json`). Activity history is excluded to keep backups portable and focused on configuration and secrets.
*   **Import:** Overwrites the current `localStorage` settings with the backup content and reloads the application to sync state.
*   **Use Case:** Migrating between browsers (e.g., Chrome to Tauri), recovering from cache clearing, or syncing between devices.

---

## 6. FAQs

**Q: How do I set up External API Keys (Maps/Weather)?**
A: Paste your Google Maps and OpenWeatherMap keys into the Intelligence tab in Settings. If empty, the app falls back to build-time environment variables in your `.env` or Vercel dashboard.

**Q: Is my data used to train models?**
A: If using Cloud Providers (OpenAI/Google), they may use data according to their API Terms of Service (usually API data is *not* used for training). If using Local Providers (Ollama), training is impossible as data remains offline.

**Q: Why does the coach sometimes get math wrong?**
A: LLMs can struggle with arithmetic. VeloAnalytics handles this by **pre-calculating** the hard numbers (xPower, BikeScore, etc.) and passing the results to the AI for interpretation.

**Q: How do I update my coach's rules?**
A: Update the **System Prompt** in Settings with your preferred coaching methodology or persona.
