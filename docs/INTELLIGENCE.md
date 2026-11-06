# VeloAnalytics Intelligence & Infrastructure Documentation

## Overview
VeloAnalytics integrates a sophisticated AI Coaching engine designed to act as a clinical-grade sports scientist. Unlike generic chat assistants, our coach is **context-aware**, meaning it has access to your real performance data, historical trends, and physiological thresholds.

---

## 1. Secret Management (The Waterfall Strategy)

VeloAnalytics utilizes a multi-layered priority system for managing API keys (Gemini, Google Maps, OpenWeatherMap, etc.). This ensures maximum flexibility for both hosted (Vercel) and local (Tauri/Dev) environments.

### Priority 1: Settings Panel (Local Storage)
- **Location:** Settings > Intelligence Tab
- **Behavior:** Any key pasted here takes absolute precedence (**BYOK** - Bring Your Own Key).
- **Security:** Keys are stored strictly within the user's browser `localStorage`. They are never sent to our servers.

### Priority 2: Environment Variables (.env / Vercel Dashboard)
- **Fallback:** If the Settings Panel field is empty, the app falls back to build-time environment variables.
- **Vite Prefixes:**
  - `VITE_GEMINI_API_KEY`
  - `VITE_OPENAI_API_KEY`
  - `VITE_ANTHROPIC_API_KEY`
  - `VITE_GROQ_API_KEY`
  - `VITE_GOOGLE_MAPS_API_KEY`
  - `VITE_OPENWEATHERMAP_API_KEY`

---

## 2. AI Providers & "Bring Your Own Key" (BYOK)

VeloAnalytics does not charge for AI access. Instead, we use the BYOK model to give you total control over costs, privacy, and model quality.

### Cloud Providers (Online)
- **Google Gemini:** Optimized for speed and large context windows. Best for daily summaries. (Default: Gemini 2.5 Flash / Gemini 3 Flash Preview).
- **OpenAI (GPT-4o):** Exceptional reasoning and clinical analysis.
- **Anthropic (Claude 3.5):** Highly nuanced coaching personas and data interpretation.
- **Groq:** High-performance inference for Llama, Mistral, and other open models. Optimized for near-instant responses.

### Local Providers (Offline/Private)
- **Ollama / LM Studio:** Run models (like Phi-4, Llama 3, Gemma 3) entirely on your own hardware using OpenAI-compatible endpoints.
- **Privacy:** Data never leaves your machine.
- **Cost:** Forever free.

---

## 3. Data Access & Privacy

The Velo Coach is built on a **Zero-Storage** architecture.

### What the AI can see:
When you send a message, the app bundle provides the AI with a dense, **structured JSON physiological context**:
1. **Thresholds:** Your established **Critical Power (CP)** and **W' Balance (W'bal)** (anaerobic battery).
2. **Activity Metrics:**
  - **Intensity:** `xPower`, `Relative Intensity (RI)`, `BikeScore™`, and total `Work (KJ)`.
  - **Sensors:** Average and Maximum values for `Power`, `Heart Rate`, `Cadence`, and `Speed`.
  - **Efficiency:** `Efficiency Factor (EF)` (`EF = xPower ÷ Heart Rate`) and `Aerobic Decoupling (Pw:HR)`.
  - **Geography:** Total `Distance` and `Total Ascent` (Climbing).
3. **Wellness & Recovery Trends:**
  - **Sleep Sequence:** Multi-day history of sleep scores, quality, duration, resting heart rate, pulse oximetry (SpO₂), and respiration rate derived from Garmin Connect Sleep exports (supports 1-Day, 7-Day, 4-Week, and 1-Year formats with automatic format detection and non-destructive merging).
  - **HRV Sequence:** Multi-day history of overnight HRV vs. your personal baseline bounds from Garmin Connect HRV Status exports (supports 1-Day, 7-Day, 4-Week, and custom range formats).
  - **Velo Readiness (VRS):** The complete breakdown of the 5-in-1 composite readiness score, including active penalties (Sleep Debt, ACWR spikes, autonomic saturation).
4. **Fitness Trends (PMC):** Your current `LTS` (Fitness), `STS` (Fatigue), and `SB` (Form / Freshness, `SB = LTS - STS`), plus a 14-day projection.
5. **Historical Library:** A searchable index of your 20 most recent activities (Name, Date, FileName, and BikeScore).

### Security Model:
- **Local Processing:** All data parsing happens in your browser/app. No VeloAnalytics server ever sees your files.
- **Direct-to-Vendor:** Your API keys are used to talk directly to Google/OpenAI/Anthropic/Groq from your browser.
- **Local-First Option:** If using a Local LLM provider (Ollama/LM Studio), the data never leaves your computer.
- **GitHub Safety:** The code is architected to never store hardcoded keys. User-provided keys stay in `localStorage`. Environment variables (like `.env`) are excluded from version control via `.gitignore`, ensuring no secrets are accidentally pushed to GitHub.

---

## 4. Intelligent File Search & Synergy

The coach understands your naming conventions and historical data.
1. **Filter by Metric:** You can search your library for specific values like "BikeScore 150" or "280W" in the History Panel.
2. **Date/File Verification:** Quickly isolate a ride by its naming convention (e.g., `2026_04_13`).
3. **Targeted Queries:** Once filtered, you can ask the coach: *"Analyze my MyWhoosh ride from the 13th that had 120 BikeScore."*

---

## 5. Environment & Platform Portability

### Web (Vercel / Standard Browser)
- **State:** Persistent across sessions via `localStorage`.
- **Behavior:** If you clear your browser cache/site data, your keys and history will be lost unless you have exported a backup.
- **Key Protection:** Use your hosting provider's (e.g., Vercel) dashboard to manage fallback environment variables.

### Desktop (Tauri / Standalone)
- **State:** Persistent. Tauri manages the webview's storage consistently.
- **Build Fallbacks:** If building a redistribution binary, you can include a `.env` file at the root. Vite will bake these into the app as Priority 2 fallbacks.
- **User Priority:** Even in the desktop binary, a user can override the built-in keys via the Settings > Intelligence panel.

---

## 6. Maintenance & Portability

### Export / Import Settings

- **Functionality:** Found in Settings > Maintenance under "Data Portability".
- **Two-Tier Portability Architecture:**
  - **Config Bundle (`Download Config`):** Captures application configuration, secret API keys (AI, Garmin, Maps, Weather), Garmin sync rules, physiological thresholds, and equipment profiles into `veloanalytics_config_backup_YYYY-MM-DD.json`.
  - **Full Vault Archive (`Export Full Archive`):** Captures the entire configuration bundle together with all parsed historical cycling sessions (`history`), enabling complete cross-machine or desktop migration.
- **Universal Restore:** The restore engine accepts either a Config Bundle or a Full Vault Archive, verifies schema version metadata, writes records atomically back into `localStorage`, and triggers a clean application reload.

### Garmin Wellness Data Ingestion (Sleep & HRV)
- **Functionality:** Found in Settings > Maintenance under "Wellness Data (Garmin Exports)".
- **Supported Timeframes:** 1 Day, 7 Days, 4 Weeks, and 1 Year (weekly aggregates).
- **Automatic Sniffing:** Automatically determines whether an uploaded CSV is a single-day vertical file, a continuous daily table, or a weekly macro aggregate.
- **Non-Destructive Multi-File Merging:** Users can upload a 1-year historical baseline followed by 7-day or 1-day detailed exports; VeloAnalytics deduplicates by date and merges high-resolution variables (such as SpO₂ and Respiration Rate) into existing daily entries without erasing them.

### Export Internal AI Context (JSON)
- **Functionality:** Found in the Intelligence Drawer (AI Chat) via the **Download** icon.
- **Purpose:** Downloads the exact structured JSON object that is sent to the Velo Coach.
- **Use Case:** Debugging AI responses, analyzing your own data trends with external tools, or "warm-starting" a conversation on another platform using the same physiological state.

---

## 7. Apple Intelligence, Siri & Spotlight Integration (macOS)

VeloAnalytics provides deep native integration with macOS Apple Intelligence, Siri Voice, Type to Siri, Spotlight Search, and the Apple Shortcuts ecosystem.

### Supported Query Formats (Voice or Typed)
- **"What is my Velo Readiness?"** — Returns today's Readiness Score (out of 100), Recovery Status, and overnight metrics.
- **"What was my last ride in Velo?"** — Returns date, distance, xPower, and BikeScore™ of your most recent workout.
- **"How much did I ride this week in Velo?"** — Computes rolling 7-day total distance, duration hours, and BikeScore™.
- **"Check my 28-day training load in Velo"** — Returns rolling 4-week total rides, mileage, and chronic BikeScore™ dose.
- **"Check my Stress Balance in Velo"** — Returns current Stress Balance (SB / Form), Short Term Stress (STS / Fatigue), and Long Term Stress (LTS / Fitness).
- **"Ask Velo Coach [query]"** — Automatically launches VeloAnalytics directly into the AI Coach assistant with context loaded.
- **Spotlight Search (`Cmd + Space`)** — Type `velo readiness` or `velo coach` into macOS Spotlight to view quick action cards.

### Setup & Architecture
- **Web App (Browser):** Go to **Settings > Intelligence > Apple Intelligence & Siri** to export or copy ready-to-use Apple Shortcut JSON definitions.
- **Tauri Desktop:** Native Swift `AppIntents` and `AppShortcutsProvider` are located in `/native-macos/VeloAppIntents.swift` and communicate with Tauri via local file caches with zero cloud latency.

---

## 8. Voice & Verbal Coaching Interaction

VeloAnalytics features bidirectional voice interaction directly inside the Velo Coach sliding drawer, allowing athletes to ask questions hands-free and listen to synthesized verbal insights.

### Architecture & Privacy
- **Web Speech API:** Utilizes browser-native `SpeechRecognition` (for voice-to-text input) and `SpeechSynthesis` (for text-to-speech verbal playback).
- **Universal Provider Parity:** The speech layer operates independently of the LLM inference engine. Spoken voice input and audio readout work identically across all cloud AI providers (Google Gemini, OpenAI, Anthropic, Groq) and local offline instances (Ollama, LM Studio).
- **Zero Extra Cost & Zero Cloud Latency:** Operates entirely on the client device without requiring external speech API subscriptions (such as Whisper or ElevenLabs). Raw voice audio never leaves the browser.
- **Cycling Science Pronunciation Engine:** Automatic text sanitization converts cycling metric notations (`xPower: 285W`, `RI: 0.95`, `BikeScore: 120`, `Pw:HR: 3.2%`, `W'bal: 14.5 kJ`) into natural, intelligible spoken sentences.

### How to Use
- **Voice Questioning:** Click the microphone icon in the chat input bar (or tap while on mobile). Speak your question. Your speech appears live in the input field. Click Send (or press Enter) to submit.
- **On-Demand Read Aloud:** Click the speaker icon on any assistant message bubble to hear the coach's clinical analysis read aloud. Click the stop button at any time to pause or cancel speech.
- **Auto-Speak Mode:** Toggle **Voice: On** in the drawer header or in **Settings > Intelligence** to have every coach response read aloud automatically as soon as it is generated.

---

## 9. FAQs

**Q: How do I use voice input and verbal feedback with Velo Coach?**  
A: Open Velo Coach and click the microphone icon in the input field to speak your question. Click the speaker icon on any response to hear it read aloud, or turn on the "Voice: On" toggle in the header for hands-free auto-speak.

**Q: Does voice interaction work when using local models like Ollama or LM Studio?**  
A: Yes! Because voice synthesis and recognition run natively in your browser via the Web Speech API, voice works with 100% parity across all models, online or offline.

**Q: How do I use Siri, Type to Siri, and Spotlight with VeloAnalytics?**  
A: Use your voice or press `Command + Spacebar` (`Cmd + Space`) to type to Siri or search in Spotlight: "What is my Velo Readiness?", "What was my last ride?", or "Ask Velo Coach".

**Q: Does Siri work if I type instead of using my voice?**  
A: Yes. Apple unifies typing and voice Siri under the same AppIntents framework. Simply press `Cmd + Space` and type your query.

**Q: How do I set up External API Keys (Maps/Weather)?**  
A: Paste your Google Maps and OpenWeatherMap keys into the Intelligence tab in Settings. If empty, the app falls back to build-time environment variables in your `.env` or Vercel dashboard.

**Q: Is my data used to train models?**  
A: If using Cloud Providers (OpenAI/Google), they may use data according to their API Terms of Service (usually API data is *not* used for training). If using Local Providers (Ollama), training is impossible as data remains offline.

**Q: Why does the coach sometimes get math wrong?**  
A: LLMs can struggle with complex arithmetic. VeloAnalytics mitigates this by **pre-calculating** every metric (xPower, BikeScore, EF, Velo Readiness) and passing them as a **structured JSON schema**. This provides the AI with deterministic, verified figures to interpret rather than forcing it to guess from raw sensor streams.

**Q: What is "Velo Experimental Readiness"?**  
A: It is an opt-in algorithm that calculates physiological readiness using a multi-factor weighting (Sleep, HRV, Recovery, Load) and penalty logic. See the Methodology document for the full formula.

**Q: How do I update my coach's rules?**  
A: Update the **System Prompt** in Settings with your preferred coaching methodology or persona.
