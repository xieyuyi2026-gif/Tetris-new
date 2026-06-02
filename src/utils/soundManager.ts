/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // AudioContext will be initialized on first sound play to comply with autoplay policy
  }

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public getMute(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  private playTone(freqs: number[], durationSec: number, type: OscillatorType = 'sine', decay: boolean = true) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(0.12 / freqs.length, now);

        if (decay) {
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
        } else {
          gainNode.gain.setValueAtTime(0.12 / freqs.length, now + durationSec * 0.8);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
        }

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + durationSec);
      });
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  public playMove() {
    // Brief low-pitch thud
    this.playTone([120], 0.05, 'triangle');
  }

  public playRotate() {
    // Rising tone
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);

      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn(e);
    }
  }

  public playDrop() {
    // Deep slide down
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn(e);
    }
  }

  public playLineClear() {
    // Happy bright chord
    const scale = [523.25, 659.25, 783.99]; // C5, E5, G5
    this.playTone(scale, 0.25, 'sine', true);
  }

  public playTetris() {
    // Even happier, ascending major scale sweep! Let's do a sequence of clean pitch notes
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50]; // C5 to C6 scale
      
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gainNode.gain.setValueAtTime(0.0, now + idx * 0.05);
        gainNode.gain.linearRampToValueAtTime(0.08, now + idx * 0.05 + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.15);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.15);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  public playLevelUp() {
    // Ascending arpeggio
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const arpeggio = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      
      arpeggio.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gainNode.gain.setValueAtTime(0.0, now + idx * 0.1);
        gainNode.gain.linearRampToValueAtTime(0.1, now + idx * 0.1 + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.25);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  public playGameOver() {
    // Sad falling low pitch tone
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(220, now);
      osc1.frequency.linearRampToValueAtTime(80, now + 0.6);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(215, now); // slightly detuned for chorus fatness
      osc2.frequency.linearRampToValueAtTime(78, now + 0.6);

      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.linearRampToValueAtTime(0.05, now + 0.3);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.6);
      osc2.start(now);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn(e);
    }
  }
}

export const sound = new SoundManager();
