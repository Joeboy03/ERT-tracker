# TryRating Minimalist Dashboard & Compact Input Redesign

Redesign the TryRating dashboard layout to replace oversized, vertically stacked cards with an ultra-clean, minimal inline metrics strip, and elevate the task input box to the top of the workspace for frictionless, instant time logging.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions incorporate the user's confirmed choices:
> - **Card Density & Presentation**: Replaced giant card stacks and multi-tiered widgets with **inline mini stat chips and a single-line progress indicator** that cleanly communicates daily ERT, 7-day 20-hour limits, and payment earnings in a glanceable row.
> - **Input Box Positioning**: Elevated the task input box right below the compact header strip, eliminating deep scrolling so users can immediately type task ERTs upon opening the app.
> - **Visual Aesthetic**: Soft modern minimalism with crisp hairline borders (`border-slate-200/80 dark:border-slate-800`), refined typography with tabular figures (`tabular-nums`), quiet neutral surfaces, and zero bulky drop shadows or card sandwiches.

---

### 1. Overview & Core Concept

- **What It Does**: Transforms the TryRating Time Tracker from a vertically bloated interface into an aesthetically refined, high-density productivity dashboard. All critical metrics (daily ERT goal, 20-hour weekly cap status, session task count, and earnings) are unified into a compact, elegant metric strip. The primary action—logging ERT tasks—is brought to the top with a focused, streamlined input form.
- **Target Audience**: TryRating evaluators and raters who track multiple tasks throughout the day and need to rapidly log entries without navigating past overwhelming visual cards.
- **Key Value**: Radically reduces visual noise, saves vertical screen space, prevents task-logging fatigue, and provides instant, unmistakable clarity on how close the user is to their daily target and 20-hour weekly cap.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Immediate Task Entry**: Upon loading, the rater's focus lands directly on the streamlined task input bar with immediate category chips and a prominent ERT entry field (`12m`, `1.5h`, or `45`). Pressing Enter logs the task instantly.
2. **Glanceable Limit Monitoring**: A clean single-line progress strip right beneath the header highlights:
   - Today's ERT vs Daily Goal (with percentage).
   - 7-Day Window Status (e.g. `16.0h / 20.0h` with remaining allowance, clear colored status dot, and countdown to window reset).
   - Session task count and Period Payment earnings.
3. **Optional Drilldown**: An unobtrusive "Details" toggle allows expanding daily historical breakdown bars for the rolling 7-day window without forcing it to consume permanent vertical real estate.

#### Visual Identity & Theme
- **Aesthetic Direction**: Soft modern minimalism, utilitarian precision, zero visual clutter.
- **Color Palette**:
  - Neutral Canvas: Crisp white (`#ffffff`) and soft off-white (`#f8fafc`) in light mode; deep slate (`#0f172a` / `#1e293b`) in dark mode.
  - Accents: Indigo (`#6366f1`) for active focus and primary action; Emerald (`#10b981`) for nominal work state and earnings; Amber (`#f59e0b`) for approaching cap; Crimson (`#ef4444`) strictly for reaching the 20h limit.
- **Typography & Hierarchy**:
  - Clear sans font paired with tabular monospace numerals (`tabular-nums font-mono`) for all times, hours, and currency calculations.
  - Single-line unboxed metadata labels using subtle dividers (`·`) per zero-pill discipline.
- **Component Styling**:
  - Single-elevation depth: Flat card surfaces with 1px hairline borders (`border border-slate-200 dark:border-slate-800`).
  - Input Card: Slimmed down from bulky `p-10` padding to a focused `p-4 sm:p-5` container with clear focus rings.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Relocating Task Input to the Top**
  - *Chosen Approach*: Place the task input card directly above the session logs and right below the compact metric bar.
  - *Why*: Task entry is the single most frequent action in a time tracker. Pushing it down past multiple big cards creates unnecessary friction.
  - *Alternatives Considered*: Floating bottom dock (rejected to avoid covering session logs or mobile navigation).

- **Decision 2: Inline Mini Stat Chips vs Bulky Dedicated Visualizer**
  - *Chosen Approach*: Consolidate the 4 separate stat cards and the large 7-day breakdown block into a unified 4-metric strip with an integrated horizontal dual-track progress bar.
  - *Why*: Delivers all critical status points (daily ERT, 20h limit, tasks, payment) in less than 20% of the previous vertical height.
  - *Alternatives Considered*: Hiding the 7-day cap entirely behind a modal (rejected because knowing one's 20-hour limit is essential to avoid violating rating program limits).

---

### 4. Technical Architecture & Data Strategy

```
┌───────────────────────────────────────────────────────────────┐
│ Top Bar: Brand, Navigation (Tracker/History), Dark Mode, Auth │
├───────────────────────────────────────────────────────────────┤
│ Date Navigation Strip (Day Selector, Jump to Today, Backup)   │
├───────────────────────────────────────────────────────────────┤
│ Inline Mini Stat Strip (Daily ERT · 7-Day 20h Cap · Rate · #) │
│ [ ────── Integrated Minimal Dual Progress Line ─────── ]      │
├───────────────────────────────────────────────────────────────┤
│ Slim Task Input Card (Category Quick Select + ERT Input + Add)│
├───────────────────────────────────────────────────────────────┤
│ Task Session List (Table / Card rows with Edit & Delete)      │
└───────────────────────────────────────────────────────────────┘
```

- **State Preservation**: All existing state hooks (`weeklyLimit`, `weeklyWindowType`, `limitEnforcement`, `logs`, `categories`, `dailyGoal`, `baseRate`, `premiumRate`, `showEarnings`) and Firebase synchronization remain 100% active and preserved.
- **Progress Math**: Retains real-time calculations for rolling 7-day or Mon–Sun calendar week limits, displaying precise remaining hours and overtime alerts.
