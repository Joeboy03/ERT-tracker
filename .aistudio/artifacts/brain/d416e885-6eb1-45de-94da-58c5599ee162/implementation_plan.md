# Audio Chimes & 20-Hour Weekly Limit Proactive Alerts

Add an intelligent sound cue and proactive alert system to notify raters when they are approaching or have reached their 20-hour weekly limit, preventing accidental rating overages while maintaining the clean, minimalist aesthetic.

### User Review & Critical Decisions

> [!IMPORTANT]
> - **Zero External Audio Assets**: Audio chimes will be generated directly via the browser's native **Web Audio API** (synthesized sine/triangle waves with smooth exponential volume envelopes). This guarantees 100% offline reliability, instant playback with zero latency, and no broken audio CDN links.
> - **Subtle, Non-Intrusive Design**: Sound cues will be mellow and professional (a gentle marimba-style two-tone chime for warning, a distinct triple-tone alert for cap reached).
> - **Full User Control**: A quick-toggle sound mute icon will be placed in the header, with detailed volume adjustment and audio testing available in Settings.

---

### 1. Overview & Core Features

- **Proactive Threshold Alerts**:
  - **Warning Threshold**: Fires a gentle reminder chime and displays an amber warning chip when total 7-day ERT reaches **18.5 hours** (or within 1.5 hours of cap, configurable).
  - **Cap Reached Alert**: Fires an urgent notice chime and displays a persistent crimson alert when the 20.0-hour cap is reached or exceeded.
  - **Daily Goal Chime (Optional)**: A pleasant completion chime when today's daily ERT target is met.
- **Web Audio Sound Generator**:
  - `soundService.ts`: A lightweight sound synthesizer providing preset chimes:
    - `playWarningChime()`: Warm two-tone alert (D5 -> A5)
    - `playCapReachedChime()`: Prominent three-tone alert (A5 -> F#5 -> D5)
    - `playGoalCelebrationChime()`: Uplifting upward chime (C5 -> E5 -> G5)
  - Supports volume control, mute override, and test-play previews.
- **Visual Alert Banners**:
  - A slim inline alert strip integrated seamlessly above the task input card when within the warning zone or at the cap.
  - Clear calculation of exact remaining rating allowance (e.g., `Remaining this week: 1h 14m`).
- **Settings Integration**:
  - Enable/disable sound alerts.
  - Master chime volume slider with test buttons.
  - Configurable warning threshold (e.g., 18h, 19h, or 19.5h).

---

### 2. User Experience & Flows

1. **Approaching 20 Hours**:
   - As a user logs a task that pushes their 7-day total ERT past the warning threshold (e.g. 18.5h), the app plays a subtle two-tone audio chime and displays a sleek amber notification banner: *"You have 1h 30m remaining in your 7-day rolling window."*
2. **Reaching 20 Hours**:
   - If a newly logged task reaches or exceeds 20.0h, the app plays the cap-reached chime and renders an unmistakable warning badge advising the user to pause rating until older tasks roll off.
3. **Sound Control**:
   - The user can toggle audio on/off with one click from the top navigation bar (`SpeakerWaveIcon` / `SpeakerXMarkIcon`).
   - In Settings, the user can test all chimes and adjust the volume.

---

### 3. Technical Architecture & File Changes

1. **`src/utils/soundService.ts` (New)**:
   - Pure Web Audio API context helper.
   - Methods: `playChime(type: 'warning' | 'capReached' | 'dailyGoal', volume: number)`.
   - Audio unlocked safely on user interactions.
2. **`src/types.ts`**:
   - Extend user settings state to include:
     - `soundAlertsEnabled: boolean` (default: `true`)
     - `alertVolume: number` (0 to 1, default: `0.7`)
     - `warningThresholdHours: number` (default: `18.5`)
     - `dailyGoalChimeEnabled: boolean` (default: `true`)
3. **`src/components/CompactMetricsBar.tsx` / `src/App.tsx`**:
   - Monitor 7-day rolling total after each logged task or deletion.
   - Trigger the audio chime once per threshold crossing to avoid repetitive annoying sounds.
   - Display the compact limit status banner directly below the progress strip.
4. **`src/components/SettingsModal.tsx`**:
   - Add an **Audio & Limit Alerts** section with toggle switches, threshold slider, volume slider, and "Test Sound" buttons.

---

### 4. Verification & Testing

- Test logging tasks to cross 18.5 hours and verify the warning chime plays cleanly.
- Test reaching 20.0 hours and verify the cap-reached chime and visual alert activate.
- Verify the mute button in the top bar instantly suppresses all audio.
- Ensure audio does not throw browser `NotAllowedError` by gracefully handling user audio gesture requirements.
