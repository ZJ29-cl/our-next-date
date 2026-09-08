/**
 * Web Audio API Sound Synthesizer for "Our Next Date"
 *
 * Provides warm, organic, tactile acoustic micro-interactions:
 * - Soft tactile tick: Pill & chip selections
 * - Warm segmented tick: Toggling between vibe styles
 * - Paper rustle: Unfolding progressive disclosure fields
 * - Rising tension pulse: Press-and-hold wax seal interaction
 * - Wax stamp seal: Satisfying physical thud + warm chime payoff
 * - Arrival chime: Gentle welcoming tone on confirmation screen
 *
 * Fully synthesized in-code without external audio assets.
 * Respects prefers-reduced-motion and user mute preferences.
 */

class SoundController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private holdOsc: OscillatorNode | null = null;
  private holdGain: GainNode | null = null;
  private holdFilter: BiquadFilterNode | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Check stored mute preference
      const storedMute = localStorage.getItem('ond_muted');
      if (storedMute !== null) {
        this.isMuted = storedMute === 'true';
      } else {
        // Respect prefers-reduced-motion as a hint for quieter experience
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.isMuted = prefersReducedMotion;
      }
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ond_muted', String(muted));
    }
    if (muted) {
      this.stopHoldTone();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Soft tick: Short, quiet tactile click for date/chip selection (<50ms)
   */
  public playChipTick() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);

      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Audio safety fallback
    }
  }

  /**
   * Warm tick: Slightly lower pitch, warmer wooden click for segmented toggle
   */
  public playSegmentedTick() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(480, now);
      filter.Q.setValueAtTime(1.2, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.055);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.065);
    } catch {
      // Audio safety fallback
    }
  }

  /**
   * Paper rustle / soft swoosh: Filtered noise for opening notes / expanding sections
   */
  public playPaperRustle() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.12; // 120ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.frequency.exponentialRampToValueAtTime(550, now + 0.11);
      filter.Q.setValueAtTime(1.8, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
    } catch {
      // Audio safety fallback
    }
  }

  /**
   * Start the rising tension tone during "Press & Hold to Seal"
   */
  public startHoldTone() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      this.stopHoldTone();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, now);
      filter.Q.setValueAtTime(1.5, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, now); // Warm low fundamental

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.2); // Gentle rise

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);

      this.holdOsc = osc;
      this.holdGain = gain;
      this.holdFilter = filter;
    } catch {
      // Audio safety fallback
    }
  }

  /**
   * Update the rising pitch / resonance based on hold progress (0 -> 1)
   */
  public updateHoldProgress(progress: number) {
    if (this.isMuted || !this.ctx || !this.holdOsc || !this.holdGain || !this.holdFilter) return;

    try {
      const now = this.ctx.currentTime;
      // Frequency smoothly rises from 95Hz to 165Hz
      const targetFreq = 95 + progress * 70;
      this.holdOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);

      // Lowpass opens up from 180Hz to 420Hz, bringing warmth and presence
      const targetCutoff = 180 + progress * 240;
      this.holdFilter.frequency.setTargetAtTime(targetCutoff, now, 0.05);

      // Gain grows subtly with tension
      const targetGain = 0.02 + progress * 0.04;
      this.holdGain.gain.setTargetAtTime(targetGain, now, 0.05);
    } catch {
      // Audio safety fallback
    }
  }

  /**
   * Stop the hold tension tone smoothly if released early
   */
  public stopHoldTone() {
    if (this.holdGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.holdGain.gain.cancelScheduledValues(now);
        this.holdGain.gain.setValueAtTime(this.holdGain.gain.value, now);
        this.holdGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      } catch {
        // Safe catch
      }
    }
    if (this.holdOsc) {
      try {
        this.holdOsc.stop(this.ctx ? this.ctx.currentTime + 0.09 : 0);
      } catch {
        // Safe catch
      }
    }
    this.holdOsc = null;
    this.holdGain = null;
    this.holdFilter = null;
  }

  /**
   * The Climax: Tactile wax stamp thud + warm resonant confirmation chord
   */
  public playSealStampSound() {
    this.stopHoldTone();
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Part 1: Physical "thud" of the brass seal pressing into warm wax (65Hz -> 35Hz)
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      const thudFilter = ctx.createBiquadFilter();

      thudFilter.type = 'lowpass';
      thudFilter.frequency.setValueAtTime(140, now);

      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(75, now);
      thudOsc.frequency.exponentialRampToValueAtTime(32, now + 0.12);

      thudGain.gain.setValueAtTime(0.14, now);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      thudOsc.connect(thudFilter);
      thudFilter.connect(thudGain);
      thudGain.connect(ctx.destination);

      thudOsc.start(now);
      thudOsc.stop(now + 0.16);

      // Part 2: Warm musical chime payoff (harmony in E & B for an open, loving resolution)
      const frequencies = [329.63, 493.88]; // E4 and B4
      frequencies.forEach((freq, idx) => {
        const chimeOsc = ctx.createOscillator();
        const chimeGain = ctx.createGain();

        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(freq, now + 0.04);

        const delay = now + 0.04 + idx * 0.02;
        chimeGain.gain.setValueAtTime(0.0001, now);
        chimeGain.gain.setValueAtTime(0.065 / (idx + 1), delay);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, delay + 0.35);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(ctx.destination);

        chimeOsc.start(delay);
        chimeOsc.stop(delay + 0.38);
      });
    } catch {
      // Audio safety fallback
    }
  }

  /**
   * Confirmation Screen Arrival: Gentle, single ambient bell tone
   */
  public playConfirmationChime() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(436, now + 0.4);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.48);
    } catch {
      // Audio safety fallback
    }
  }
}

export const sound = new SoundController();
