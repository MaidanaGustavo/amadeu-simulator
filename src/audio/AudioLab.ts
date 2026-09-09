/**
 * Áudio do laboratório, sintetizado em tempo real com a Web Audio API.
 * Nenhum arquivo externo: cliques de solenoide, pelota, tom do CS, zumbido do
 * choque e as vocalizações do rato (guinchos, fareja, mastiga, coça) são todos
 * gerados por osciladores e ruído filtrado.
 *
 * Nota de fidelidade: ratos vocalizam sobretudo no ultrassom (22 e 50 kHz).
 * Os guinchos aqui ficam entre 2,5 e 6 kHz para serem audíveis — é o que um
 * detector heteródino de laboratório faria.
 */
export class AudioLab {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ruidoBuf: AudioBuffer | null = null;
  private ultimos: Record<string, number> = {};
  private tomOsc: OscillatorNode | null = null;
  private tomLfo: OscillatorNode | null = null;
  private tomGain: GainNode | null = null;
  private _mudo = false;
  volumeGlobal = 0.8;

  get mudo(): boolean { return this._mudo; }
  set mudo(v: boolean) {
    this._mudo = v;
    if (this.master) this.master.gain.setTargetAtTime(v ? 0 : this.volumeGlobal, this.ctx!.currentTime, 0.03);
  }

  /** Precisa ser chamado a partir de um gesto do usuário (política de autoplay). */
  ligar(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._mudo ? 0 : this.volumeGlobal;
      // compressor suave evita clipping quando vários eventos coincidem
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.12;
      this.master.connect(comp).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get pronto(): boolean { return !!this.ctx && this.ctx.state === 'running'; }

  /* ---------- utilitários ---------- */

  private podeTocar(nome: string, minMs: number): boolean {
    const agora = performance.now();
    if (agora - (this.ultimos[nome] ?? 0) < minMs) return false;
    this.ultimos[nome] = agora; return true;
  }

  private ruido(): AudioBuffer {
    if (this.ruidoBuf) return this.ruidoBuf;
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (this.ruidoBuf = buf);
  }

  /** Rajada de ruído filtrado: a base de cliques, farejadas e mastigação. */
  private rajada(t0: number, dur: number, freq: number, q: number, ganho: number, tipo: BiquadFilterType = 'bandpass'): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.ruido();
    const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(ganho, t0 + Math.min(0.004, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.02);
  }

  private tomSimples(t0: number, dur: number, f0: number, f1: number, ganho: number, tipo: OscillatorType = 'sine', ataque = 0.005): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); o.type = tipo;
    o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(ganho, t0 + ataque);
    g.gain.setValueAtTime(ganho, t0 + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master!); o.start(t0); o.stop(t0 + dur + 0.02);
  }

  /* ---------- aparato ---------- */

  /** Clique do solenoide do dispensador seguido da pelota caindo no comedouro. */
  dispensador(): void {
    if (!this.pronto || !this.podeTocar('disp', 60)) return;
    const t = this.ctx!.currentTime;
    this.rajada(t, 0.035, 3200, 2, 0.35);
    this.tomSimples(t, 0.03, 1400, 900, 0.18, 'square');
    // pelota: dois ou três toques secos, cada vez mais fracos
    for (let i = 0; i < 3; i++) this.rajada(t + 0.09 + i * (0.045 + i * 0.02), 0.02, 5200 - i * 700, 6, 0.16 / (i + 1), 'highpass');
  }

  alavanca(): void {
    if (!this.pronto || !this.podeTocar('alav', 40)) return;
    const t = this.ctx!.currentTime;
    this.tomSimples(t, 0.025, 950, 620, 0.14, 'square');
    this.rajada(t + 0.005, 0.03, 2400, 3, 0.12);
  }

  /** Tom do estímulo condicionado: 2,8 kHz com leve vibrato. */
  tom(dur: number): void {
    if (!this.pronto) return;
    const ctx = this.ctx!, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.frequency.value = 2800;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 6;
    const lfoG = ctx.createGain(); lfoG.gain.value = 18;
    lfo.connect(lfoG).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.10, t + 0.03);
    g.gain.setValueAtTime(0.10, t + dur - 0.05); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.master!); o.start(t); lfo.start(t); o.stop(t + dur); lfo.stop(t + dur);
  }

  /** Liga o tom do CS de forma sustentada (botão manual), até tomDesligar() ser chamado. */
  tomLigar(): void {
    if (!this.pronto || this.tomOsc) return;
    const ctx = this.ctx!, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.frequency.value = 2800;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 6;
    const lfoG = ctx.createGain(); lfoG.gain.value = 18;
    lfo.connect(lfoG).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.10, t + 0.03);
    o.connect(g).connect(this.master!); o.start(t); lfo.start(t);
    this.tomOsc = o; this.tomLfo = lfo; this.tomGain = g;
  }

  /** Desliga o tom sustentado iniciado por tomLigar(). Seguro chamar mesmo sem tom ativo. */
  tomDesligar(): void {
    if (!this.tomOsc || !this.tomLfo || !this.tomGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.tomGain.gain.cancelScheduledValues(t);
    this.tomGain.gain.setValueAtTime(this.tomGain.gain.value, t);
    this.tomGain.gain.linearRampToValueAtTime(0, t + 0.05);
    this.tomOsc.stop(t + 0.06); this.tomLfo.stop(t + 0.06);
    this.tomOsc = null; this.tomLfo = null; this.tomGain = null;
  }

  luz(): void {
    if (!this.pronto || !this.podeTocar('luz', 100)) return;
    const t = this.ctx!.currentTime;
    this.tomSimples(t, 0.04, 400, 380, 0.05, 'triangle');   // relé
  }

  /** Zumbido do choque: dente-de-serra grave + ruído, com tremolo de rede elétrica. */
  choque(dur = 0.5): void {
    if (!this.pronto || !this.podeTocar('choque', 200)) return;
    const ctx = this.ctx!, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 58;
    const trem = ctx.createOscillator(); trem.frequency.value = 30;
    const tremG = ctx.createGain(); tremG.gain.value = 0.5;
    const g = ctx.createGain(); g.gain.value = 0;
    trem.connect(tremG).connect(g.gain);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(0.22, t + 0.01);
    env.gain.setValueAtTime(0.22, t + dur - 0.05); env.gain.linearRampToValueAtTime(0, t + dur);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    o.connect(g).connect(f).connect(env).connect(this.master!);
    o.start(t); trem.start(t); o.stop(t + dur); trem.stop(t + dur);
    this.rajada(t, dur, 1200, 0.8, 0.10);
  }

  /* ---------- rato ---------- */

  /** Guincho curto: varredura de frequência com leve modulação. `aflicao` alonga e eleva. */
  guincho(aflicao = 0): void {
    if (!this.pronto || !this.podeTocar('guincho', 250)) return;
    const ctx = this.ctx!, t = ctx.currentTime;
    const n = aflicao > 0.5 ? 2 + Math.floor(Math.random() * 2) : 1;
    for (let i = 0; i < n; i++) {
      const t0 = t + i * (0.16 + Math.random() * 0.08);
      const dur = 0.09 + Math.random() * 0.08 + aflicao * 0.25;
      const base = 3200 + Math.random() * 900 + aflicao * 1200;
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(base * 0.85, t0);
      o.frequency.linearRampToValueAtTime(base * 1.25, t0 + dur * 0.35);
      o.frequency.exponentialRampToValueAtTime(base * 0.7, t0 + dur);
      const fm = ctx.createOscillator(); fm.frequency.value = 38 + Math.random() * 20;
      const fmG = ctx.createGain(); fmG.gain.value = 90 + aflicao * 200;
      fm.connect(fmG).connect(o.frequency);
      const g = ctx.createGain();
      const pico = 0.05 + aflicao * 0.18;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(pico, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(this.master!); o.start(t0); fm.start(t0); o.stop(t0 + dur + 0.02); fm.stop(t0 + dur + 0.02);
    }
  }

  farejar(): void {
    if (!this.pronto || !this.podeTocar('farejar', 700)) return;
    const t = this.ctx!.currentTime;
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) this.rajada(t + i * 0.085, 0.045, 5500 + Math.random() * 1500, 1.2, 0.045, 'bandpass');
  }

  mastigar(): void {
    if (!this.pronto || !this.podeTocar('mastigar', 900)) return;
    const t = this.ctx!.currentTime;
    for (let i = 0; i < 9; i++) this.rajada(t + i * 0.11 + Math.random() * 0.02, 0.03, 1800 + Math.random() * 800, 2.5, 0.07);
  }

  cocar(): void {
    if (!this.pronto || !this.podeTocar('cocar', 1200)) return;
    const t = this.ctx!.currentTime;
    for (let i = 0; i < 6; i++) this.rajada(t + i * 0.07, 0.04, 3800, 1.5, 0.035);
  }

  passo(): void {
    if (!this.pronto || !this.podeTocar('passo', 120)) return;
    this.rajada(this.ctx!.currentTime, 0.03, 700, 1, 0.025, 'lowpass');
  }
}

export const audio = new AudioLab();
