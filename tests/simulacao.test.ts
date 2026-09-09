import { describe, it, expect } from 'vitest';
import { Simulacao, BAR_X } from '../src/engine/Simulacao';

/** gerador determinístico (mulberry32) para testes reprodutíveis */
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const DT = 1 / 30;
const run = (sim: Simulacao, seg: number) => { for (let i = 0; i < seg / DT; i++) sim.passo(DT); };
const taxa = (sim: Simulacao, seg: number) => {
  const r = sim.S.respostas, t = sim.S.t; run(sim, seg);
  return (sim.S.respostas - r) / ((sim.S.t - t) / 60);
};
/** fração do tempo que o sujeito passa nas imediações da barra */
const tempoPerto = (sim: Simulacao, seg: number) => {
  let perto = 0, n = 0;
  for (let i = 0; i < seg / DT; i++) { sim.passo(DT); n++; if (Math.abs(sim.rato.x - BAR_X) < 50) perto++; }
  return perto / n;
};
/** sujeito com treino ao comedouro e 15 min de CRF */
function treinado(seed = 7) {
  const sim = new Simulacao(mulberry32(seed));
  for (let i = 0; i < 15; i++) { sim.entregarReforco(); run(sim, 6); }
  sim.definirEsquema('CRF'); run(sim, 900); sim.S.saciedade = 0;
  return sim;
}

describe('aquisição', () => {
  it('treino ao comedouro cria o reforçador condicionado', () => {
    const sim = new Simulacao(mulberry32(1));
    for (let i = 0; i < 15; i++) { sim.entregarReforco(); run(sim, 6); }
    expect(sim.S.somComida).toBeGreaterThan(0.9);
  });
  it('CRF produz curva de aquisição', () => {
    const sim = treinado();
    expect(sim.S.forca).toBeGreaterThan(0.9);
    expect(taxa(sim, 600)).toBeGreaterThan(8);
  });
});

describe('assinaturas dos esquemas (Ferster & Skinner)', () => {
  const medir = (tipo: 'FR' | 'VR' | 'FI' | 'VI', valor: number) => {
    const sim = treinado(); sim.definirEsquema(tipo, valor); run(sim, 600); return taxa(sim, 900);
  };
  it('razão gera taxa mais alta que intervalo', () => {
    expect(medir('VR', 10)).toBeGreaterThan(medir('VI', 30));
    expect(medir('FR', 10)).toBeGreaterThan(medir('FI', 30));
  });
  it('FR apresenta pausa pós-reforço seguida de corrida', () => {
    const sim = treinado(); sim.definirEsquema('FR', 20); run(sim, 900);
    let pausa = 0, corrida = 0;
    for (let i = 0; i < 36000; i++) {
      const r0 = sim.S.respostas; sim.passo(DT);
      if (sim.S.respostas > r0) { const d = sim.S.t - sim.S.ultimoReforco; if (d > 2 && d < 7) pausa++; else if (d >= 7) corrida++; }
    }
    expect(pausa).toBeLessThan(corrida * 0.05);
  });
  it('FI apresenta festão: respostas se concentram no fim do intervalo', () => {
    const sim = treinado(); sim.definirEsquema('FI', 30); run(sim, 600);
    const tercos = [0, 0, 0];
    for (let i = 0; i < 36000; i++) {
      const r0 = sim.S.respostas; sim.passo(DT);
      if (sim.S.respostas > r0) tercos[Math.min(2, Math.floor((sim.S.t - sim.S.ultimoReforco) / 10))]++;
    }
    expect(tercos[2]).toBeGreaterThan(tercos[0] * 1.2);
  });
});

describe('extinção', () => {
  it('efeito do reforço parcial: VR resiste mais que CRF', () => {
    const crf = treinado(3); crf.definirEsquema('EXT');
    const vr = treinado(3); vr.definirEsquema('VR', 10); run(vr, 1500); vr.S.saciedade = 0; vr.definirEsquema('EXT');
    run(crf, 1800); run(vr, 1800);
    expect(taxa(vr, 1200)).toBeGreaterThan(taxa(crf, 1200));
  });
});

describe('procedimentos aversivos', () => {
  it('punição contingente suprime a resposta', () => {
    const sim = treinado(); sim.definirEsquema('VI', 30); run(sim, 600);
    const antes = taxa(sim, 600);
    sim.alternarPunicao();
    expect(taxa(sim, 600)).toBeLessThan(antes * 0.3);
  });
  it('choque não sinalizado suprime a resposta mesmo sem CS presente', () => {
    // média entre sementes: a taxa numa janela curta é ruidosa demais num sujeito só
    const medir = (comChoque: boolean) => {
      let soma = 0;
      for (const seed of [3, 5, 9]) {
        const sim = treinado(seed); sim.definirEsquema('VI', 20); run(sim, 600); sim.S.saciedade = 0;
        if (comChoque) sim.aplicarChoque();
        soma += taxa(sim, 90);
      }
      return soma / 3;
    };
    expect(medir(true)).toBeLessThan(medir(false) * 0.8);
  });
  it('o medo eliciado pelo contexto decai com o tempo', () => {
    const sim = treinado(); sim.definirEsquema('VI', 20); run(sim, 300);
    sim.aplicarChoque();
    const logoDepois = sim.medoAtual();
    run(sim, 300);
    expect(logoDepois).toBeGreaterThan(0.4);
    expect(sim.medoAtual()).toBeLessThan(logoDepois * 0.2);
  });
  it('punição afasta o sujeito da barra, não só reduz a pressão', () => {
    const sim = treinado(); sim.definirEsquema('VI', 30); run(sim, 600); sim.S.saciedade = 0;
    const antes = tempoPerto(sim, 600);
    sim.alternarPunicao(); run(sim, 300); sim.S.saciedade = 0;
    expect(tempoPerto(sim, 600)).toBeLessThan(antes);
  });
  it('pareamento som→choque produz medo e supressão condicionada', () => {
    const sim = treinado(); sim.definirEsquema('VI', 30); run(sim, 600);
    sim.alternarPareamento(); run(sim, 3000);
    expect(sim.S.medo.som).toBeGreaterThan(0.8);
    expect(sim.S.razaoSup).not.toBeNull();
    expect(sim.S.razaoSup!).toBeLessThan(0.45);
  });
});

describe('controles manuais (som/luz/choque)', () => {
  it('alternarSom liga indefinidamente e só desliga no segundo clique', () => {
    const sim = new Simulacao(mulberry32(1));
    expect(sim.alternarSom()).toBe(true);
    expect(sim.S.csSomAtivo).toBe(true);
    run(sim, 30);
    expect(sim.S.csSomAtivo).toBe(true); // não desliga sozinho
    expect(sim.alternarSom()).toBe(false);
    expect(sim.S.csSomAtivo).toBe(false);
  });
  it('desligar o som sem choque pareado produz extinção pavloviana', () => {
    const sim = new Simulacao(mulberry32(3));
    // condiciona medo emparelhando som+choque manualmente algumas vezes
    for (let i = 0; i < 8; i++) { sim.alternarSom(); sim.alternarChoque(); run(sim, 0.1); sim.alternarChoque(); sim.alternarSom(); run(sim, 3); }
    const medoAntes = sim.S.medo.som;
    expect(medoAntes).toBeGreaterThan(0.3);
    sim.alternarSom(); run(sim, 5); sim.alternarSom(); // desta vez liga e desliga sem choque
    expect(sim.S.medo.som).toBeLessThan(medoAntes);
  });
  it('choque manual sustenta o congelamento e o zumbido enquanto ligado', () => {
    const sim = new Simulacao(mulberry32(2));
    expect(sim.alternarChoque()).toBe(true);
    run(sim, 2);
    expect(sim.mundo.choqueAte).toBeGreaterThan(sim.S.t); // ainda ligado
    expect(sim.rato.congelado).toBeGreaterThan(sim.S.t);
    expect(sim.alternarChoque()).toBe(false);
    run(sim, 1);
    expect(sim.mundo.choqueAte).toBeLessThanOrEqual(sim.S.t); // desligou
  });
  it('choque manual associa medo ao som presente, como o choque contingente', () => {
    const sim = new Simulacao(mulberry32(3));
    sim.alternarSom();
    sim.alternarChoque();
    expect(sim.S.medo.som).toBeGreaterThan(0);
  });
});

describe('utilidades', () => {
  it('exporta CSV com cabeçalho e eventos', () => {
    const sim = treinado(); const csv = sim.exportarCsv().split('\n');
    expect(csv[0]).toBe('tempo_s;respostas_acumuladas;evento');
    expect(csv.some(l => l.endsWith(';reforco'))).toBe(true);
  });
});
