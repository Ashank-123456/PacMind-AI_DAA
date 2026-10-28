/**
 * @file soundEffects.js
 * @description Lightweight, self-contained Web Audio API synthesizer for retro arcade sound effects.
 * Requires zero external audio assets, zero network requests, and handles browser autoplay policies safely.
 */

class SoundEffectsSynthesizer {
  constructor() {
    /** @type {AudioContext | null} */
    this.audioContext = null;
    /** @type {boolean} */
    this.isEnabled = false;
  }

  /**
   * Initializes the AudioContext upon user gesture.
   */
  initializeContext() {
    if (typeof window === 'undefined') return;

    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  /**
   * Toggles sound output enabled state.
   * @param {boolean} enabled - True to allow audio playback
   */
  setEnabled(enabled) {
    this.isEnabled = Boolean(enabled);
    if (this.isEnabled) {
      this.initializeContext();
    }
  }

  /**
   * Synthesizes a high-frequency pellet collection chime.
   */
  playPelletChime() {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const now = this.audioContext.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.045);

      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch (_) {
      // Graceful silence on context restrictions
    }
  }

  /**
   * Synthesizes an energizer power pellet resonance.
   */
  playPowerPelletSiren() {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const now = this.audioContext.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.18);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (_) {}
  }

  /**
   * Synthesizes a ghost consumption crunch.
   */
  playGhostEatenCrunch() {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const now = this.audioContext.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(820, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.22);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (_) {}
  }
}

export const soundEffects = new SoundEffectsSynthesizer();
