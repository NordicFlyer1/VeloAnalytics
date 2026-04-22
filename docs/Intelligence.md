# VeloAnalytics AI Intelligence Documentation

## Overview
VeloAnalytics integrates a sophisticated AI Coaching engine designed to act as a clinical-grade sports scientist. Unlike generic chat assistants, our coach is **context-aware**, meaning it has access to your real performance data, historical trends, and physiological thresholds.

---

## 1. AI Providers & "Bring Your Own Key" (BYOK)
VeloAnalytics does not charge for AI access. Instead, we use a BYOK model to give you total control over costs, privacy, and model quality.

### Cloud Providers (Online)
*   **Google Gemini**: Optimized for speed and large context windows. Best for daily summaries.
*   **OpenAI (GPT-4o)**: Exceptional reasoning and clinical analysis.
*   **Anthropic (Claude 3.5)**: Highly nuanced coaching personas and data interpretation.

### Local Providers (Offline/Private)
*   **Ollama / LM Studio**: Run models (like Phi-4, Llama 3) entirely on your own hardware. 
*   **Privacy**: Data never leaves your machine.
*   **Cost**: Forever free.

---

## 2. Data Access & Privacy
The Velo Coach is built on a **Zero-Storage** architecture.

### What the AI can see:
When you send a message, the app bundle provides the AI with a dense physiological context:
*   **Thresholds**: Your established **Critical Power (CP)** and **W' Balance** (anaerobic battery).
*   **Active Activity Summary**:
    *   **Intensity**: xPower (NP), Relative Intensity (RI), BikeScore, and total **Work (KJ)**.
    *   **Sensors**: Average and Maximum values for **Power**, **Heart Rate**, **Cadence**, and **Speed**.
    *   **Geography/Physics**: Total **Distance**, **Total Ascent** (Climbing), and **Aerobic Decoupling** (Efficiency/Pw:HR).
*   **Fitness Trends (PMC)**: Your current **CTL** (Fitness), **ATL** (Fatigue), and **TSB** (Form/Freshness).
*   **Historical Library**: A searchable index of your 20 most recent activities (Name, Date, FileName, and BikeScore).

### Full Metric Familiarity
The coach is programmed to understand the relationships between these metrics. For example, it understands that:
*   **W' Balance** depletion correlates with efforts above **CP**.
*   **Aerobic Decoupling** over 5% on a long ride may indicate cardiovascular drift.
*   **BikeScore** vs **KJ** highlights the "quality" of work (intensity vs volume).
*   **Form (TSB)** is the primary driver for "Ready to Race" vs "Need Recovery" advice.

### Security Model:
*   **Local Processing**: All data parsing happens in your browser/app. No VeloAnalytics server ever sees your files.
*   **Direct-to-Vendor**: Your API keys are used to talk directly to Google/OpenAI/Anthropic. They are stored in your encrypted local browser storage.
*   **Identity**: We recommend using the **Section 11** methodology to keep your personal cycling dossier private on your device.

---

## 3. Intelligent File Search
The coach understands your naming conventions. If you name your files using the standard `YYYY_MM_DD_HH_MM_SS` format (e.g., `2026_04_13_09_37_33`) or use custom names like "MyWhoosh", the coach can find them.

**Example Queries:**
*   *"How did my power numbers look on the 2026_04_13 MyWhoosh ride?"*
*   *"Compare my efficiency on my last three MyWhoosh sessions."*
*   *"Based on the Section 11 rules, was my MyWhoosh ride yesterday a success?"*

---

## 4. Section 11 & Coaching Logic (Planned)
**Current Status: Manual Configuration**
While deep integration is planned, you can currently implement the **Section 11 Coaching** methodology by:
1.  Copying your preferred rules or persona from the Section 11 documentation.
2.  Pasting them into the **Coach Persona (System Prompt)** in Settings.

**Planned Features:**
*   **Knowledge Library**: A dedicated UI to upload and manage the latest .md files from the Section 11 GitHub.
*   **Private Dossiers**: Structured storage for your personal cycling profile that stays 100% on your device.
*   **Onboarding Interviews**: Guided sessions where the coach asks specific Section 11 questions to build your profile.

---

## 5. FAQs
**Q: Is my data used to train models?**
A: If using Cloud Providers (OpenAI/Google), they may use data according to their API Terms of Service (usually API data is *not* used for training, unlike consumer chat apps). If using Local Providers (Ollama), training is impossible.

**Q: Why does the coach sometimes get math wrong?**
A: LLMs struggle with arithmetic. VeloAnalytics solves this by **pre-calculating** the hard numbers (NP, BikeScore, etc.) and handing the "answers" to the AI. Use the AI for *interpretation*, not calculation.

**Q: How do I update my coach's rules?**
A: Simply update the **System Prompt** in Settings with the latest Section 11 documentation.
