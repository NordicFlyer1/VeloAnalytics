# VeloAnalytics Design System & Implementation Guidelines

This document serves as the authoritative source of truth ("Design Bible") for the visual, structural, and documentation design of VeloAnalytics. Adhere strictly to these rules when creating or modifying components, charts, layouts, and documentation.

---

## 1. Visual Identity
- **Primary Color:** Orange (`#f97316` / `text-orange-500`)
- **Backgrounds:** 
  - Light Mode: `#f8f9fa`
  - Dark Mode: `#0a0a0a`
- **Cards:** 
  - Light Mode: White with subtle border
  - Dark Mode: `rgba(255, 255, 255, 0.05)` (Glassmorphism effect)
  - Radius: Use `rounded-3xl` for major modals (like Settings and About) to maintain consistency. Secondary cards (like bike profiles) should use `rounded-2xl` or matching `rounded-3xl` for a tasteful, unified look.
- **Borders:** `var(--app-border)` (Subtle, semi-transparent)

---

## 2. Typography
- **Headings:** `font-bold tracking-tight`
- **Metric Labels:** `text-[10px] uppercase tracking-widest font-bold text-app-muted`
- **Chart Labels:** `text-[10px] uppercase tracking-widest text-app-muted`
- **Tooltips:** `text-[12px]` for content, `font-bold` for labels.

---

## 3. Chart Design (Recharts)
- **Tooltips:** 
  - Background: `var(--app-tooltip-bg)` (Semi-transparent)
  - Blur: `backdrop-filter: blur(8px)`
  - Border: `1px solid var(--app-border)`
  - Shadow: `shadow-xl`
- **Grid Lines:** `stroke="var(--app-border)"`, `vertical={false}`, `strokeDasharray="3 3"`
- **Axes:** `axisLine={false}`, `tickLine={false}`, `fontSize={10}`, `stroke="var(--app-muted)"`
- **Legends:** `fontSize: '10px'`, `textTransform: 'uppercase'`, `letterSpacing: '0.1em'`, `color: 'var(--app-text)'`

---

## 4. Layout & Structure
- **Sections:** Every major analysis area must be wrapped in a card with a `SectionHeader`.
- **Collapsibility:** All sections must be collapsible using the `SectionHeader` and `AnimatePresence` with `motion.div`.
- **Responsive Grids:** 
  - Summary Cards: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` to accommodate growth.
  - Main Layout: `max-w-7xl mx-auto px-4 sm:px-6`.

---

## 5. Interaction
- **Hover States:** Buttons and cards should have subtle hover effects (e.g., `hover:bg-app-card/80`, `hover:border-orange-500/30`).
- **Transitions:** Use `framer-motion` (imported from `motion/react`) for all layout changes, entrances, and expansions.
- **Tooltips (UI):** Use standard HTML `title` attributes for simple tooltips on icons/buttons.

---

## 6. Global Controls
- **Collapse All:** A global toggle should exist to mass-expand or mass-collapse all sections.
- **Theme Toggle:** Supports Light and Dark modes with smooth transitions.

---

## 7. Control Standards
- **Selection Groups:** Use the "Capsule" pattern exclusively for all metric, range, and mode toggles: `bg-app-bg/50 p-1 rounded-full border border-app-border`.
- **Active State:** Active capsules use `bg-orange-500 text-black shadow-lg shadow-orange-500/20`.
- **Inactive State:** Inactive capsules use `text-app-muted hover:text-app-text transition-all`.

---

## 8. Typography & Units
- **Unit Case:** All units MUST be uppercase: `KM`, `M`, `W`, `RPM`, `KM/H`, `BPM`, `KJ`, `MS`, `L/MIN`.
- **Label Size:** Minimum secondary label size is `text-[10px]`. Avoid `text-[8px]` for data labels.
- **Metric Headers:** Consistent `text-[10px] uppercase tracking-widest font-bold text-app-muted`.

---

## 9. Chart Consistency
- **Tooltips:** MUST use `{ backgroundColor: 'var(--app-tooltip-bg)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid var(--app-border)', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }`.
- **Legends:** MUST use `verticalAlign="top"`, `fontSize: '10px'`, `textTransform: 'uppercase'`, `letterSpacing: '0.1em'`.
- **Grid:** `stroke="var(--app-border)"`, `vertical={false}`, `strokeDasharray="3 3"`.

---

## 10. Spacing & Visual Hierarchy
- **Section Spacing:** Main content vertical spacing is `space-y-6`.
- **Header Gaps:** Flex headers (e.g., summary metrics or control bars) use `gap-4`.
- **Card Padding:** All cards use consistent `p-8` for desktop and `p-4` or `p-6` for mobile.
- **Section Headers:** Vertical gap between section headers and content is established via the `space-y-6` container.

---

## 11. Metric Color Palette
- **Power:** Orange (`#f97316`)
- **W' Balance:** Purple (`#a855f7`)
- **Heart Rate:** Red (`#ef4444`)
- **Cadence:** Green (`#22c55e`)
- **Speed:** Cyan (`#06b6d4`)
- **Altitude:** Amber (`#f59e0b`)
- **Slope:** Slate (`#64748b`)
- **HRV:** Indigo (`#6366f1`)
- **PulseOX:** Fuchsia (`#d946ef`)
- **Respiration:** Emerald (`#10b981`)
- **Left Pedal / Power Phase:** Sky Blue (`#38bdf8`)
- **Right Pedal / Power Phase:** Rose (`#fb7185`)
- **Platform Center Offset (PCO):** Teal (`#14b8a6`)
- **Peak Power Phase:** Amber (`#fbbf24`)

---

## 12. Mobile Responsiveness & Patterns
- **Capsule Sliders:** For selection groups with many items (e.g., AI Providers), use a horizontal scroll pattern on mobile: `flex overflow-x-auto no-scrollbar whitespace-nowrap`. This maintains the "Capsule" aesthetic without breaking the layout or forcing awkward abbreviations.
- **Touch Targets:** Maintain a minimum height of `py-2.5` (approx 40-44px) for all interactive elements.
- **Scroll Indication:** Ensure the container has enough padding/gap so that the next item is partially visible, indicating scrollability.

---

## 13. Documentation & Markdown Architecture
- **Bullet Marker Syntax:** All lists must use standard dash markers (`- `) exclusively. Never use asterisks (`* `) or mixed markers within the same document.
- **Indentation Standard:** Nested lists must use exactly 2 spaces of indentation per hierarchy level (`  - `). Never use 3 or 4 spaces.
- **Spacing Uniformity:** Exactly one blank line must separate headings, paragraphs, lists, code fences, and section dividers. Never use consecutive blank lines or trailing document whitespace.
- **Horizontal Dividers:** Separate major sections (`##` or `###`) with a standard Markdown horizontal divider (`---`) flanked by single blank lines.
- **Heading Hierarchy:**
  - `## [Topic Title]` for conceptual, architectural, or reference documentation.
  - `## 1. [Action Title]`, `## 2. [Action Title]` for procedural step-by-step installation and configuration guides.
  - No decorative or informal emojis in technical documentation headings.

---

## 14. Mathematical Formula Standards (Option A Unicode)
- **Universal Option A Standard:** Formulas in Markdown documentation must NEVER rely on raw LaTeX (such as `$`, `$$`, `\frac`, `\times`), which frequently fails to render in web viewports or third-party Markdown parsers.
- **Inline Monospace Blocks:** Mathematical expressions must be enclosed in inline code backticks with explicit Unicode symbols (`×`, `²`, `⁴`, `÷`, `τ`, `±`, `°`, `e`, `≤`, `≥`, `√`).
- **Standard Formula Block Structure:**
  - **Concept:** Concise definition of what the metric represents.
  - **Formula:** `` `Variable = Expression` ``
  - **Calculation:** Bulleted breakdown detailing variable definitions, windowing, and constants.
  - **Interpretation:** Performance context, physiological benchmark, and operational guidance.

---

## 15. Brand, Metric & Terminology Standards
- **BikeScore™:** Must include the trademark symbol (`BikeScore™`) on first occurrence per document; subsequent occurrences may use `BikeScore`.
- **W' Balance (W'bal):** Standardized name for the dynamic anaerobic battery.
- **Critical Power (CP):** Always capital `CP` when abbreviated.
- **xPower:** Standardized normalized power notation with lowercase `x` and capital `P`.
- **Relative Intensity (RI):** Ratio of `xPower` to `CP`.
- **Efficiency Factor (EF):** Ratio of `xPower` to average Heart Rate.
- **Aerobic Decoupling (Pw:HR):** Percentage drift between first and second half efficiency.
- **Velo Readiness (VRS):** The 5-in-1 composite physiological readiness index.
- **Training Load Metrics:** LTS (Fitness, 42-day rolling EMA), STS (Fatigue, 7-day rolling EMA), and SB (Form, LTS - STS).
- **File Format:** Always write as `.FIT` (uppercase with dot) or `FIT file`. Never write as `.fit` or `Fit file`.

---

## 16. Blockquotes & Alert Standards
- **Format:** Informational and caution callouts must use standard Markdown blockquotes with bold lead-ins:
  - `> **Note:** [Explanatory details]`
  - `> **Warning:** [Critical operational warnings]`
  - `> **Important:** [Vital requirements or prerequisites]`
- **No HTML Alerts:** Do not use custom raw HTML warning containers or non-standard markdown extensions.

---

## 17. Licensing, Attribution & Provenance Standards
- **License Model:** VeloAnalytics is Source-Available, non-commercial software (NOT open source). Commercial use requires a separate written license.
- **Coggan Attribution:** The conceptual framework of power-based training metrics (NP, IF, TSS) is acknowledged to Dr. Andrew Coggan and Hunter Allen.
- **Skiba Attribution:** The W' balance dynamic continuous integral and exponential recovery model is attributed to Dr. Philip Skiba et al.
- **Author & Copyright:** Copyright © Bruce H. Kraus. All rights reserved.
