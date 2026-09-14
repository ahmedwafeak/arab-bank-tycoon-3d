/**
 * AudioFX - Lightweight procedural Web Audio API effects for the Banking Dashboard
 */
export class AudioFX {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;

    const savedMaster = localStorage.getItem('bank_master_volume');
    const savedSfx = localStorage.getItem('bank_sfx_volume');
    const savedMuted = localStorage.getItem('bank_audio_muted');

    this.masterVolume = savedMaster !== null ? parseFloat(savedMaster) : 0.88;
    this.sfxVolume = savedSfx !== null ? parseFloat(savedSfx) : 0.90;
    this.enabled = savedMuted !== null ? (savedMuted !== 'true') : true;
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
        this.updateGains();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  updateGains() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) {
      const targetMaster = this.enabled ? this.masterVolume : 0;
      this.masterGain.gain.setValueAtTime(targetMaster, now);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, now);
    }
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    localStorage.setItem('bank_master_volume', this.masterVolume.toString());
    this.updateGains();
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    localStorage.setItem('bank_sfx_volume', this.sfxVolume.toString());
    this.updateGains();
  }

  setMuted(muted) {
    this.enabled = !muted;
    localStorage.setItem('bank_audio_muted', muted ? 'true' : 'false');
    this.updateGains();
    return !muted;
  }

  toggleSound() {
    return this.setMuted(this.enabled);
  }

  getOutputNode() {
    this.init();
    return this.sfxGain || (this.ctx ? this.ctx.destination : null);
  }

  playTestSound() {
    this.init();
    if (!this.ctx) return;
    this.playCash();
    setTimeout(() => this.playCashCounter(), 120);
    setTimeout(() => this.playSuccess(), 260);
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gain);
    gain.connect(this.getOutputNode());

    osc.start(now);
    osc.stop(now + 0.04);
  }

  playCash() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(850, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(gain);
    gain.connect(this.getOutputNode());

    osc.start(now);
    osc.stop(now + 0.14);
  }

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((f, i) => {
      const now = this.ctx.currentTime + i * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.25);

      osc.connect(gain);
      gain.connect(this.getOutputNode());

      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  playStamp() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.getOutputNode());

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playAlert() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(587.33, now + 0.1);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.getOutputNode());

    osc.start(now);
    osc.stop(now + 0.25);
  }

  playVaultGear() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Heavy metallic mechanical click / ratchet sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.06);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain);
    gain.connect(this.getOutputNode());

    osc.start(now);
    osc.stop(now + 0.06);
  }

  playVaultUnlock() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Heavy Bass Clank
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(90, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    subOsc.connect(subGain);
    subGain.connect(this.getOutputNode());
    subOsc.start(now);
    subOsc.stop(now + 0.35);

    // 2. High Metallic Shink / Unlock Resonance Chime
    const freqs = [659.25, 880, 1318.5];
    freqs.forEach((f, idx) => {
      const pingTime = now + 0.08 + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, pingTime);

      gain.gain.setValueAtTime(0.2, pingTime);
      gain.gain.exponentialRampToValueAtTime(0.001, pingTime + 0.4);

      osc.connect(gain);
      gain.connect(this.getOutputNode());

      osc.start(pingTime);
      osc.stop(pingTime + 0.4);
    });
  }

  playCashCounter() {
    this.playCashCounterMachine(12);
  }

  /**
   * Authentic Egyptian High-Speed Banknote Counting Machine Sound (صوت ماكينة عد النقدية السريعة)
   * Plays rapid mechanical flutter clicks with paper friction harmonics
   */
  playCashCounterMachine(billCount = 20) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const count = Math.max(8, Math.min(30, billCount));

    for (let i = 0; i < count; i++) {
      // Exponentially accelerate slightly like a real counting machine
      const tickTime = now + (i * 0.021);
      
      // 1. Mechanical snap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = i % 2 === 0 ? 'square' : 'sawtooth';
      const baseFreq = 950 + (i * 25) + (Math.random() * 200);
      osc.frequency.setValueAtTime(baseFreq, tickTime);
      osc.frequency.exponentialRampToValueAtTime(320, tickTime + 0.018);

      gain.gain.setValueAtTime(0.16, tickTime);
      gain.gain.exponentialRampToValueAtTime(0.002, tickTime + 0.018);

      osc.connect(gain);
      gain.connect(this.getOutputNode());

      osc.start(tickTime);
      osc.stop(tickTime + 0.018);

      // 2. Paper rustle noise burst
      if (i % 3 === 0) {
        const paperOsc = this.ctx.createOscillator();
        const paperGain = this.ctx.createGain();
        paperOsc.type = 'triangle';
        paperOsc.frequency.setValueAtTime(2400 + Math.random() * 600, tickTime);
        paperGain.gain.setValueAtTime(0.06, tickTime);
        paperGain.gain.exponentialRampToValueAtTime(0.001, tickTime + 0.012);

        paperOsc.connect(paperGain);
        paperGain.connect(this.getOutputNode());

        paperOsc.start(tickTime);
        paperOsc.stop(tickTime + 0.012);
      }
    }

    // Finishing tactile beep when counter stack completes
    const finishTime = now + (count * 0.021) + 0.03;
    const beep = this.ctx.createOscillator();
    const beepGain = this.ctx.createGain();
    beep.type = 'sine';
    beep.frequency.setValueAtTime(1760, finishTime); // High A6 confirm beep
    beepGain.gain.setValueAtTime(0.15, finishTime);
    beepGain.gain.exponentialRampToValueAtTime(0.001, finishTime + 0.08);

    beep.connect(beepGain);
    beepGain.connect(this.getOutputNode());
    beep.start(finishTime);
    beep.stop(finishTime + 0.08);
  }

  /**
   * Ultra-crisp Modern Fintech InstaPay Instant Transfer Chime (نغمة إشعار إنستاباي)
   */
  playInstaPayChime() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Harmonious upward resonant bell triad: C6, E6, G6
    const chord = [1046.50, 1318.51, 1567.98];

    chord.forEach((freq, idx) => {
      const startTime = now + (idx * 0.045);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Bright attack, smooth shimmering decay
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.38);

      osc.connect(gain);
      gain.connect(this.getOutputNode());

      osc.start(startTime);
      osc.stop(startTime + 0.38);
    });

    // Sub-harmonic warm base thump for satisfying weight
    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(261.63, now); // Middle C
    thump.frequency.exponentialRampToValueAtTime(130.81, now + 0.15);
    thumpGain.gain.setValueAtTime(0.18, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.005, now + 0.18);

    thump.connect(thumpGain);
    thumpGain.connect(this.getOutputNode());
    thump.start(now);
    thump.stop(now + 0.18);
  }
}
