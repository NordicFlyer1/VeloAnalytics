# VeloAnalytics Design System & Implementation Guidelines

This document serves as the source of truth for the visual and structural design of VeloAnalytics. Adhere to these rules when creating or modifying components, charts, or layouts.

## 1. Visual Identity
- **Primary Color:** Orange (`#f97316` / `text-orange-500`)
- **Backgrounds:** 
  - Light Mode: `#f8f9fa`
  - Dark Mode: `#0a0a0a`
- **Cards:** 
  - Light Mode: White with subtle border
  - Dark Mode: `rgba(255, 255, 255, 0.05)` (Glassmorphism effect)
- **Borders:** `var(--app-border)` (Subtle, semi-transparent)

## 2. Typography
- **Headings:** `font-bold tracking-tight`
- **Metric Labels:** `text-[10px] uppercase tracking-widest font-bold text-app-muted`
- **Chart Labels:** `text-[10px] uppercase tracking-widest text-app-muted`
- **Tooltips:** `text-[12px]` for content, `font-bold` for labels.

## 3. Chart Design (Recharts)
- **Tooltips:** 
  - Background: `var(--app-tooltip-bg)` (Semi-transparent)
  - Blur: `backdrop-filter: blur(8px)`
  - Border: `1px solid var(--app-border)`
  - Shadow: `shadow-xl`
- **Grid Lines:** `stroke="var(--app-border)"`, `vertical={false}`, `strokeDasharray="3 3"`
- **Axes:** `axisLine={false}`, `tickLine={false}`, `fontSize={10}`, `stroke="var(--app-muted)"`
- **Legends:** `fontSize: '10px'`, `textTransform: 'uppercase'`, `letterSpacing: '0.1em'`, `color: 'var(--app-text)'`

## 4. Layout & Structure
- **Sections:** Every major analysis area must be wrapped in a card with a `SectionHeader`.
- **Collapsibility:** All sections must be collapsible using the `SectionHeader` and `AnimatePresence` with `motion.div`.
- **Responsive Grids:** 
  - Summary Cards: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` to accommodate growth.
  - Main Layout: `max-w-7xl mx-auto px-4 sm:px-6`.

## 5. Interaction
- **Hover States:** Buttons and cards should have subtle hover effects (e.g., `hover:bg-app-card/80`, `hover:border-orange-500/30`).
- **Transitions:** Use `framer-motion` (imported from `motion/react`) for all layout changes, entrances, and expansions.
- **Tooltips (UI):** Use standard HTML `title` attributes for simple tooltips on icons/buttons.

## 6. Global Controls
- **Collapse All:** A global toggle should exist to mass-expand or mass-collapse all sections.
- **Theme Toggle:** Supports Light and Dark modes with smooth transitions.
