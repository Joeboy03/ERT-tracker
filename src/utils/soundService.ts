/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API Sound Synthesizer for TryRating Alerts & Chimes
// Zero external network dependencies, offline-ready, crisp & pleasant.

class SoundService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.7; // Default 70%

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.ctx && AudioCtx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  // Helper to play an individual synthesized chime tone
  private playTone(
    freq: number,
    startTime: number,
    duration: number,
    gainLevel: number = 1.0,
    type: OscillatorType = 'sine'
  ) {
    const ctx = this.getAudioContext();
    if (!ctx || this.isMuted || this.volume <= 0) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      // Smooth attack and natural exponential exponential decay
      const effectiveGain = this.volume * gainLevel * 0.28; // calibrated pleasant volume
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(effectiveGain, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  /**
   * Warning Chime: Pleasant marimba two-tone notification (D5 -> A5)
   * Signals that you are approaching the 20-hour limit.
   */
  public playWarningChime() {
    const ctx = this.getAudioContext();
    if (!ctx || this.isMuted || this.volume <= 0) return;

    const now = ctx.currentTime;
    // Tone 1: D5 (587.33 Hz)
    this.playTone(587.33, now, 0.35, 0.9, 'sine');
    // Tone 2: A5 (880.00 Hz)
    this.playTone(880.0, now + 0.16, 0.5, 1.0, 'sine');
  }

  /**
   * Cap Reached Chime: Distinctive 3-tone descending/alert chime (A5 -> F#5 -> D5)
   * Clearly notifies that the 20.0-hour limit is reached or exceeded.
   */
  public playCapReachedChime() {
    const ctx = this.getAudioContext();
    if (!ctx || this.isMuted || this.volume <= 0) return;

    const now = ctx.currentTime;
    // Tone 1: A5 (880 Hz)
    this.playTone(880.0, now, 0.25, 1.0, 'triangle');
    // Tone 2: F#5 (739.99 Hz)
    this.playTone(739.99, now + 0.18, 0.25, 0.9, 'triangle');
    // Tone 3: D5 (587.33 Hz) with warm decay
    this.playTone(587.33, now + 0.36, 0.65, 1.1, 'sine');
  }

  /**
   * Daily Goal Celebration Chime: Uplifting rising arpeggio (C5 -> E5 -> G5 -> C6)
   * Fires when today's daily ERT target is completed.
   */
  public playDailyGoalChime() {
    const ctx = this.getAudioContext();
    if (!ctx || this.isMuted || this.volume <= 0) return;

    const now = ctx.currentTime;
    this.playTone(523.25, now, 0.2, 0.8, 'sine');          // C5
    this.playTone(659.25, now + 0.12, 0.2, 0.85, 'sine');   // E5
    this.playTone(783.99, now + 0.24, 0.22, 0.95, 'sine');  // G5
    this.playTone(1046.50, now + 0.36, 0.6, 1.0, 'sine');   // C6
  }

  /**
   * Quick preview helper for settings
   */
  public preview(type: 'warning' | 'cap' | 'goal') {
    if (type === 'warning') this.playWarningChime();
    else if (type === 'cap') this.playCapReachedChime();
    else if (type === 'goal') this.playDailyGoalChime();
  }
}

export const soundService = new SoundService();
