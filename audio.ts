type Wave = OscillatorType;

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;
  private last: Record<string, number> = {};

  init() {
    if (this.ctx) return;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (this.master) this.master.gain.value = v ? 0.5 : 0;
  }

  private tone(freq: number, dur: number, type: Wave, gain: number, delay = 0, slideTo?: number) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, gain: number, delay = 0) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 900;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  private throttle(key: string, ms: number) {
    const now = performance.now();
    if (this.last[key] && now - this.last[key] < ms) return false;
    this.last[key] = now;
    return true;
  }

  call(kind: string) {
    if (!this.throttle("call" + kind, 120)) return;
    switch (kind) {
      case "emergency":
        this.tone(1180, 0.09, "square", 0.16);
        this.tone(1480, 0.09, "square", 0.16, 0.12);
        this.tone(1180, 0.09, "square", 0.16, 0.24);
        break;
      case "keys":
        this.tone(700, 0.1, "triangle", 0.16);
        this.tone(940, 0.14, "triangle", 0.14, 0.11);
        break;
      case "assist":
        this.tone(820, 0.1, "sine", 0.18);
        this.tone(660, 0.14, "sine", 0.15, 0.12);
        break;
      default:
        this.tone(620, 0.1, "sine", 0.17);
        this.tone(780, 0.14, "sine", 0.14, 0.11);
    }
  }

  clear() {
    this.tone(880, 0.07, "triangle", 0.16);
    this.tone(1180, 0.07, "triangle", 0.16, 0.06);
    this.tone(1560, 0.14, "triangle", 0.14, 0.12);
  }

  bonus() {
    this.tone(1046, 0.06, "square", 0.1);
    this.tone(1318, 0.06, "square", 0.1, 0.05);
    this.tone(1760, 0.12, "square", 0.09, 0.1);
  }

  fail() {
    this.tone(300, 0.35, "sawtooth", 0.2, 0, 90);
    this.tone(150, 0.4, "square", 0.14, 0.02, 60);
  }

  hit() {
    if (!this.throttle("hit", 200)) return;
    this.noise(0.18, 0.24);
    this.tone(160, 0.2, "square", 0.16, 0, 70);
  }

  dash() {
    if (!this.throttle("dash", 90)) return;
    this.noise(0.1, 0.1);
    this.tone(520, 0.09, "sine", 0.08, 0, 900);
  }

  pickup() {
    this.tone(760, 0.06, "square", 0.11);
    this.tone(1140, 0.09, "square", 0.09, 0.05);
  }

  ui() {
    this.tone(560, 0.05, "square", 0.07);
  }

  levelUp() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => this.tone(n, 0.16, "triangle", 0.14, i * 0.1));
  }

  gameOver() {
    const notes = [523, 466, 392, 262];
    notes.forEach((n, i) => this.tone(n, 0.32, "sawtooth", 0.13, i * 0.18));
  }

  tick() {
    if (!this.throttle("tick", 240)) return;
    this.tone(1400, 0.04, "square", 0.055);
  }
}

export const sfx = new Sfx();
