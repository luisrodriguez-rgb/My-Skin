/**
 * MySkin - Sintetizador de Audio Retro en 8-Bits (Web Audio API)
 * Cero dependencias externas. Genera efectos sonoros procedurales clasicos.
 */

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    const saved = localStorage.getItem("myskin_audio_enabled");
    if (saved !== null) {
      this.enabled = saved === "true";
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    localStorage.setItem("myskin_audio_enabled", String(this.enabled));
    return this.enabled;
  }

  /**
   * Sonido sutil de paso (caminata)
   */
  public playStep() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.04);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (_) {}
  }

  /**
   * Arpegio de alerta 8-bits para entregas y deadlines
   */
  public playAlert() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [440, 554, 659, 880]; // A4, C#5, E5, A5
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const noteStart = now + idx * 0.07;

        osc.type = "square";
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.08, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.13);
      });
    } catch (_) {}
  }

  /**
   * Fanfarria de victoria retro (GitHub PR merged / nivel completado)
   */
  public playVictory() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const noteStart = now + idx * 0.09;
        const duration = idx === notes.length - 1 ? 0.35 : 0.1;

        osc.type = "square";
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.09, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + duration);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(noteStart);
        osc.stop(noteStart + duration + 0.02);
      });
    } catch (_) {}
  }

  /**
   * Tono suave para inicio de concentracion (Pomodoro)
   */
  public playFocus() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.25);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch (_) {}
  }

  /**
   * Tono descendente de descanso / siesta
   */
  public playSleep() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.42);
    } catch (_) {}
  }
}

export const audioEngine = new RetroAudioEngine();
