/**
 * Amadeu Simulator — motor comportamental.
 *
 * Modelo: regra delta com gradiente de contiguidade para a força operante,
 * Rescorla-Wagner para associações CS-US, expectativa de reforço (efeito do
 * reforço parcial), pausa pós-reforço em razão fixa, saciedade intra-sessão.
 *
 * Coordenadas: o sujeito se move em 1D ao longo do painel de interação,
 * de X_MIN a X_MAX (unidades arbitrárias). A camada visual mapeia isso para 3D.
 */

export const BAR_X = 92;
export const COMEDOURO_X = 150;
export const X_MIN = 52;
export const X_MAX = 530;

export type TipoEsquema = 'CRF' | 'FR' | 'VR' | 'FI' | 'VI' | 'EXT';
export type Ato = 'farejar' | 'limpar' | 'levantar' | 'pressionar' | 'comer' | 'congelar';
export type Destino = 'livre' | 'barra' | 'pressionar' | 'comedouro';
export type CS = 'som' | 'luz';

export interface Esquema { tipo: TipoEsquema; valor: number }

export interface Sujeito {
  t: number;
  velocidade: number;
  esquema: Esquema;
  respostas: number;
  reforcos: number;
  somComida: number;
  forca: number;
  perto: number;
  frustracao: number;
  expectativa: number;
  saciedade: number;
  medo: Record<CS, number>;
  medoBarra: number;
  exigencia: number;
  ultimoReforco: number;
  pressoesDesde: number;
  punir: boolean;
  parear: boolean;
  proxTrial: number;
  csFim: number;
  csSomAtivo: boolean;
  csLuzAtivo: boolean;
  baseAte: number;
  emBase: boolean;
  usNesteTrial: boolean;
  supBase: number | null;
  supCS: number | null;
  razaoSup: number | null;
  totBase: number;
  totCS: number;
  ensaios: number;
}

export interface Rato {
  x: number;
  dir: -1 | 1;
  modo: 'mover' | 'agir';
  ato: Ato;
  timer: number;
  dur: number;
  alvo: number | null;
  destino: Destino;
  ultimaPressao: number;
  ultimoPerto: number;
  passo: number;
  congelado: number;
}

export interface Mundo {
  pelota: boolean;
  somAte: number;
  luzAte: number;
  choqueAte: number;
  barraAte: number;
}

export interface Ponto { t: number; n: number }

export interface Registro { pontos: Ponto[]; marcas: Ponto[] }

/** Eventos emitidos pelo motor — consumidos por áudio e animação, nunca pelo próprio modelo. */
export type Evento = 'pressao' | 'reforco' | 'comer' | 'som' | 'luz' | 'choque' | 'ato' | 'chegou';
export type Ouvinte = (dado?: unknown) => void;

export class Simulacao {
  S!: Sujeito;
  rato!: Rato;
  mundo!: Mundo;
  registro!: Registro;
  private rnd: () => number;
  private ouvintes: Partial<Record<Evento, Ouvinte[]>> = {};

  /** Assina um evento; devolve a função que cancela a assinatura. */
  on(evento: Evento, cb: Ouvinte): () => void {
    (this.ouvintes[evento] ??= []).push(cb);
    return () => { this.ouvintes[evento] = (this.ouvintes[evento] ?? []).filter(f => f !== cb); };
  }
  private emitir(evento: Evento, dado?: unknown): void {
    for (const cb of this.ouvintes[evento] ?? []) cb(dado);
  }

  constructor(rnd: () => number = Math.random) {
    this.rnd = rnd;
    this.novoSujeito();
  }

  /* ---------------- estado ---------------- */

  novoSujeito(): void {
    this.S = {
      t: 0, velocidade: 5,
      esquema: { tipo: 'CRF', valor: 5 },
      respostas: 0, reforcos: 0,
      somComida: 0, forca: 0, perto: 0, frustracao: 0,
      expectativa: 0.5, saciedade: 0,
      medo: { som: 0, luz: 0 }, medoBarra: 0,
      exigencia: 1, ultimoReforco: 0, pressoesDesde: 0,
      punir: false, parear: false,
      proxTrial: 25, csFim: 0, csSomAtivo: false, csLuzAtivo: false,
      baseAte: 0, emBase: false, usNesteTrial: false,
      supBase: null, supCS: null, razaoSup: null, totBase: 0, totCS: 0, ensaios: 0,
    };
    this.rato = {
      x: 330, dir: -1, modo: 'agir', ato: 'farejar', timer: 1.2, dur: 1.2,
      alvo: null, destino: 'livre', ultimaPressao: -99, ultimoPerto: -99, passo: 0, congelado: 0,
    };
    // barraAte começa em -Infinity (não 0) para que o anel de resposta em Cena.tsx,
    // cuja janela é calculada por subtração de tempo, não dispare uma pressão fantasma em t=0
    this.mundo = { pelota: false, somAte: 0, luzAte: 0, choqueAte: 0, barraAte: -Infinity };
    this.registro = { pontos: [{ t: 0, n: 0 }], marcas: [] };
    this.novaExigencia();
  }

  /* ---------------- comportamento ---------------- */

  medoAtual(): number {
    const { S, mundo } = this;
    return Math.max(
      mundo.somAte > S.t ? S.medo.som : 0,
      mundo.luzAte > S.t ? S.medo.luz : 0,
    );
  }

  private escolherComportamento(): void {
    const { S, rato, mundo } = this;
    if (rato.congelado > S.t) { this.iniciarAto('congelar', 0.6); return; }
    if (mundo.pelota) { rato.modo = 'mover'; rato.alvo = COMEDOURO_X; rato.destino = 'comedouro'; return; }

    const medo = this.medoAtual();
    const supressao = 1 - 0.85 * medo;
    const naZona = Math.abs(rato.x - BAR_X) < 74;
    const motivacao = 1 - 0.6 * S.saciedade;

    // esquemas de razão geram taxas mais altas; FR tem pausa pós-reforço; FI tem festão
    let modEsquema = 1;
    if (S.esquema.tipo === 'VR') modEsquema = 1.4;
    if (S.esquema.tipo === 'FR') {
      const pausa = Math.min(30, 0.9 * Math.sqrt(S.esquema.valor) + 0.18 * S.esquema.valor);
      modEsquema = (S.t - S.ultimoReforco) < pausa ? 0.005 : 1.55;
    }
    if (S.esquema.tipo === 'FI') {
      const decorrido = S.t - S.ultimoReforco;
      modEsquema = 0.12 + 0.88 * Math.min(1, Math.pow(decorrido / (0.85 * S.esquema.valor), 2.2));
    }

    const pesos: Record<string, number> = {
      explorar: 1.0,
      farejar: 0.9,
      limpar: 0.6 * (1 - medo),
      levantar: 0.7,
      irBarra: (0.35 + 7 * S.perto + 4 * S.forca) * supressao * motivacao,
      pressionar: naZona
        ? (0.05 + 14 * S.forca * modEsquema + 2.5 * S.frustracao) * supressao * (1 - S.medoBarra) * motivacao
        : 0,
    };

    const total = Object.values(pesos).reduce((a, b) => a + b, 0);
    let r = this.rnd() * total;
    let escolha = 'explorar';
    for (const [k, v] of Object.entries(pesos)) { r -= v; if (r <= 0) { escolha = k; break; } }

    if (escolha === 'explorar') {
      rato.modo = 'mover'; rato.destino = 'livre';
      rato.alvo = X_MIN + this.rnd() * (X_MAX - X_MIN);
    } else if (escolha === 'irBarra') {
      rato.modo = 'mover'; rato.destino = 'barra';
      rato.alvo = BAR_X + 16 + this.rnd() * 22;
    } else if (escolha === 'pressionar') {
      rato.modo = 'mover'; rato.destino = 'pressionar'; rato.alvo = BAR_X + 14;
    } else {
      const ato = escolha as Ato;
      this.iniciarAto(ato, ato === 'limpar' ? 2 + this.rnd() * 2 : 1 + this.rnd() * 1.4);
    }
  }

  private iniciarAto(nome: Ato, dur: number): void {
    const { rato } = this;
    rato.modo = 'agir'; rato.ato = nome; rato.dur = dur; rato.timer = dur;
    this.emitir('ato', nome);
  }

  private aoChegar(): void {
    const { rato, mundo } = this;
    this.emitir('chegou', rato.destino);
    if (rato.destino === 'comedouro' && mundo.pelota) { this.iniciarAto('comer', 1.4); return; }
    if (rato.destino === 'pressionar') { this.iniciarAto('pressionar', 0.55); return; }
    if (rato.destino === 'barra') {
      this.iniciarAto(this.rnd() < 0.5 ? 'levantar' : 'farejar', 1 + this.rnd());
      return;
    }
    this.escolherComportamento();
  }

  private fimDoAto(): void {
    const { S, rato, mundo } = this;
    if (rato.ato === 'pressionar') {
      this.registrarPressao();
      // a punição pode ter chamado aplicarChoque() dentro de registrarPressao(), que já
      // iniciou o ato 'congelar' com a duração correta — não chamar escolherComportamento()
      // de novo agora, ou ele reinicia esse mesmo congelamento com 0,6s em vez de 2,2s
      if (rato.congelado > S.t) return;
    }
    if (rato.ato === 'comer') { mundo.pelota = false; this.consumirReforco(); }
    this.escolherComportamento();
  }

  /* ---------------- esquemas ---------------- */

  novaExigencia(): void {
    const { S } = this;
    const v = S.esquema.valor;
    switch (S.esquema.tipo) {
      case 'CRF': S.exigencia = 1; break;
      case 'FR': case 'FI': S.exigencia = v; break;
      case 'VR': S.exigencia = Math.max(1, Math.round(v * (0.25 + this.rnd() * 1.6))); break;
      case 'VI': S.exigencia = Math.max(1, v * (0.2 + this.rnd() * 1.7)); break;
      default: S.exigencia = Infinity;
    }
  }

  private esquemaSatisfeito(): boolean {
    const { S } = this;
    switch (S.esquema.tipo) {
      case 'CRF': return true;
      case 'FR': case 'VR': return S.pressoesDesde >= S.exigencia;
      case 'FI': case 'VI': return (S.t - S.ultimoReforco) >= S.exigencia;
      default: return false;
    }
  }

  definirEsquema(tipo: TipoEsquema, valor?: number): void {
    const { S } = this;
    S.esquema.tipo = tipo;
    if (valor !== undefined) S.esquema.valor = Math.min(120, Math.max(1, valor));
    S.pressoesDesde = 0; S.ultimoReforco = S.t;
    this.novaExigencia();
  }

  private registrarPressao(): void {
    const { S, rato, mundo, registro } = this;
    S.respostas++; S.pressoesDesde++; rato.ultimaPressao = S.t;
    mundo.barraAte = S.t + 0.25;
    this.emitir('pressao');
    registro.pontos.push({ t: S.t, n: S.respostas - 1 });
    registro.pontos.push({ t: S.t, n: S.respostas });
    if (S.supCS !== null && mundo.somAte > S.t) S.supCS++;
    else if (S.emBase && S.supBase !== null) S.supBase++;

    if (S.punir) this.aplicarChoque(true);

    const reforcada = this.esquemaSatisfeito();
    if (reforcada) {
      this.entregarReforco();
    } else {
      // uma pressão não reforçada só é "violação" na medida em que o sujeito esperava reforço
      const e = S.expectativa;
      S.frustracao = Math.min(1.8, S.frustracao + 0.11 * e * (S.forca > 0.25 ? 1 : 0.25));
      S.forca *= 1 - 0.040 * e;
      S.perto *= 1 - 0.006 * e;
    }
    S.expectativa += 0.05 * ((reforcada ? 1 : 0) - S.expectativa);
  }

  /** Entrega uma pelota (contingente ao esquema ou manual, para modelagem). */
  entregarReforco(): void {
    const { S, rato, mundo, registro } = this;
    mundo.pelota = true;
    mundo.somAte = Math.max(mundo.somAte, S.t + 0.35);
    S.reforcos++;
    S.ultimoReforco = S.t;
    S.pressoesDesde = 0;
    this.novaExigencia();
    registro.marcas.push({ t: S.t, n: S.respostas });
    this.emitir('reforco');
    if (rato.modo === 'agir' && rato.ato !== 'comer') rato.timer = Math.min(rato.timer, 0.3);
  }

  private consumirReforco(): void {
    const { S, rato } = this;
    S.somComida += 0.28 * (1 - S.somComida);

    const ganhoP = Math.exp(-(S.t - rato.ultimaPressao) / 2.5);
    S.forca += 0.38 * ganhoP * (0.35 + 0.65 * S.somComida) * (1 - S.forca);

    const ganhoZ = Math.exp(-(S.t - rato.ultimoPerto) / 5);
    S.perto += 0.26 * ganhoZ * (1 - S.perto);

    S.frustracao *= 0.25;
    S.saciedade = Math.min(1, S.saciedade + 0.004);
  }

  /* ---------------- eventos do experimentador ---------------- */

  tocarSom(dur = 5): void { this.mundo.somAte = this.S.t + dur; this.S.csSomAtivo = true; this.emitir('som', dur); }
  acenderLuz(dur = 5): void { this.mundo.luzAte = this.S.t + dur; this.S.csLuzAtivo = true; this.emitir('luz', dur); }

  aplicarChoque(daBarra = false): void {
    const { S, rato, mundo } = this;
    mundo.choqueAte = S.t + 0.5;
    S.usNesteTrial = true;
    rato.congelado = S.t + 2.2;
    this.iniciarAto('congelar', 2.2);
    this.emitir('choque');

    if (daBarra) {
      S.forca *= 0.62;
      S.medoBarra = Math.min(1, S.medoBarra + 0.30);
    }
    // Rescorla-Wagner sobre os CSs presentes
    const presentes: CS[] = [];
    if (mundo.somAte > S.t - 1) presentes.push('som');
    if (mundo.luzAte > S.t - 1) presentes.push('luz');
    if (presentes.length) {
      const Vtotal = presentes.reduce((a, k) => a + S.medo[k], 0);
      for (const k of presentes) S.medo[k] = Math.max(0, Math.min(1, S.medo[k] + 0.35 * (1 - Vtotal)));
    }
  }

  private extincaoPavloviana(cs: CS): void {
    const V = this.S.medo[cs];
    this.S.medo[cs] = Math.max(0, V + 0.10 * (0 - V));
  }

  alternarPunicao(): boolean { this.S.punir = !this.S.punir; return this.S.punir; }
  alternarPareamento(): boolean {
    const { S } = this;
    S.parear = !S.parear;
    S.proxTrial = S.t + 8;
    // limpa qualquer linha de base/ensaio em andamento — ligar de novo não deve
    // herdar contagens de supressão de antes do desligamento
    S.emBase = false; S.supBase = null; S.supCS = null;
    return S.parear;
  }

  /** Intervalo entre sessões: 15 min de repouso, sujeito volta privado, recuperação espontânea parcial. */
  intervaloEntreSessoes(): void {
    const { S, mundo } = this;
    S.t += 900;
    S.frustracao = 0;
    S.saciedade = 0;
    S.forca = Math.min(1, S.forca + 0.12 * (1 - S.forca));
    S.medoBarra *= 0.55;
    // qualquer CS/ensaio em andamento não sobrevive ao salto de 15 min — encerra
    // silenciosamente (sem extinção, sem choque agendado, fora da razão de supressão)
    mundo.somAte = S.t; mundo.luzAte = S.t;
    S.csSomAtivo = false; S.csLuzAtivo = false; S.usNesteTrial = false;
    S.emBase = false; S.supBase = null; S.supCS = null;
    if (S.parear) S.proxTrial = S.t + 8;
  }

  /* ---------------- laço ---------------- */

  passo(dt: number): void {
    const { S, rato, mundo, registro } = this;
    S.t += dt;

    const esq = Math.exp(-dt / 2400);
    S.forca *= esq; S.perto *= esq; S.somComida *= Math.exp(-dt / 3600);
    S.frustracao *= Math.exp(-dt / 22);
    S.medoBarra *= Math.exp(-dt / 260);
    S.saciedade *= Math.exp(-dt / 1500);

    // fim de um CS: sem US no ensaio → extinção pavloviana
    if (S.csSomAtivo && mundo.somAte <= S.t) {
      if (!S.usNesteTrial) this.extincaoPavloviana('som');
      this.finalizarTesteSupressao();
      S.csSomAtivo = false; S.usNesteTrial = false;
    }
    if (S.csLuzAtivo && mundo.luzAte <= S.t) {
      if (!S.usNesteTrial) this.extincaoPavloviana('luz');
      S.csLuzAtivo = false; S.usNesteTrial = false;
    }

    // ensaios automáticos: 10 s de linha de base, 10 s de som, choque no fim do som
    if (S.parear) {
      if (!S.emBase && !S.csSomAtivo && S.t >= S.proxTrial) {
        S.emBase = true; S.supBase = 0; S.supCS = null; S.baseAte = S.t + 10;
      }
      if (S.emBase && S.t >= S.baseAte) {
        S.emBase = false; S.supCS = 0;
        this.tocarSom(10); S.csFim = S.t + 10; S.usNesteTrial = false;
        S.proxTrial = S.t + 60 + this.rnd() * 50;
      }
      if (S.csSomAtivo && !S.usNesteTrial && S.t >= S.csFim - 0.3) {
        this.aplicarChoque(false);
      }
    }

    // raio menor que a distância até o comedouro (58) para não contar "comendo" como "perto da barra"
    if (Math.abs(rato.x - BAR_X) < 50) rato.ultimoPerto = S.t;

    if (rato.modo === 'mover' && rato.alvo !== null) {
      const vel = 62 * (rato.destino === 'comedouro' ? 1.5 : 1);
      const d = rato.alvo - rato.x;
      rato.dir = d < 0 ? -1 : 1;
      rato.passo += dt * 7;
      if (Math.abs(d) < 4) { rato.x = rato.alvo; this.aoChegar(); }
      else rato.x += Math.sign(d) * Math.min(Math.abs(d), vel * dt);
      rato.x = Math.max(X_MIN, Math.min(X_MAX, rato.x));
    } else {
      rato.timer -= dt;
      if (rato.timer <= 0) this.fimDoAto();
    }

    if (registro.pontos.length > 6000) registro.pontos.splice(0, 2000);
  }

  private finalizarTesteSupressao(): void {
    const { S } = this;
    // razão de supressão de Estes-Skinner, acumulada entre ensaios: 0,5 = sem supressão
    if (S.supCS !== null && S.supBase !== null) {
      S.totCS += S.supCS; S.totBase += S.supBase; S.ensaios++;
      const soma = S.totCS + S.totBase;
      if (soma > 0) S.razaoSup = S.totCS / soma;
    }
    S.supBase = null; S.supCS = null;
  }

  /* ---------------- exportação ---------------- */

  exportarCsv(): string {
    const linhas = ['tempo_s;respostas_acumuladas;evento'];
    let ultimo = -1;
    for (const p of this.registro.pontos) {
      if (p.n === ultimo) continue;
      ultimo = p.n;
      linhas.push(`${p.t.toFixed(2)};${p.n};pressao`);
    }
    for (const m of this.registro.marcas) linhas.push(`${m.t.toFixed(2)};${m.n};reforco`);
    return linhas.join('\n');
  }
}
