import { create } from 'zustand';
import { sim, type Ato, type TipoEsquema } from '../engine';
import { audio } from '../audio/AudioLab';

/** Fotografia do motor para a HUD. Atualizada a ~8 Hz para não re-renderizar a árvore React a cada quadro. */
export interface Snap {
  t: number; respostas: number; reforcos: number; taxa: number;
  ato: Ato | 'andar'; esquema: TipoEsquema; valor: number; razaoSup: number | null;
  somComida: number; forca: number; perto: number; expectativa: number; saciedade: number;
  medoSom: number; medoLuz: number; medoBarra: number; punir: boolean; parear: boolean;
}

interface Lab {
  rodando: boolean;
  velocidade: number;
  painelAberto: boolean;
  registroVisivel: boolean;
  audioLigado: boolean;
  autoGirar: boolean;
  snap: Snap;
  alternarRodando: () => void;
  definirVelocidade: (v: number) => void;
  alternarPainel: (aberto?: boolean) => void;
  alternarRegistro: () => void;
  alternarAudio: () => void;
  alternarAutoGirar: () => void;
  fotografar: () => void;
  novoSujeito: () => void;
}

const fotografar = (): Snap => {
  const { S, rato } = sim;
  return {
    t: S.t, respostas: S.respostas, reforcos: S.reforcos,
    taxa: S.t > 5 ? S.respostas / (S.t / 60) : 0,
    ato: rato.modo === 'agir' ? rato.ato : 'andar',
    esquema: S.esquema.tipo, valor: S.esquema.valor, razaoSup: S.razaoSup,
    somComida: S.somComida, forca: S.forca, perto: S.perto, expectativa: S.expectativa, saciedade: S.saciedade,
    medoSom: S.medo.som, medoLuz: S.medo.luz, medoBarra: S.medoBarra, punir: S.punir, parear: S.parear,
  };
};

export const useLab = create<Lab>((set) => ({
  rodando: false,
  velocidade: 5,
  painelAberto: false,
  registroVisivel: typeof window === 'undefined' || window.innerWidth > 720,
  audioLigado: true,
  autoGirar: false,
  snap: fotografar(),
  alternarRodando: () => { audio.ligar(); set(s => ({ rodando: !s.rodando })); },
  definirVelocidade: (v) => { sim.S.velocidade = v; set({ velocidade: v }); },
  alternarPainel: (aberto) => set(s => ({ painelAberto: aberto ?? !s.painelAberto })),
  alternarRegistro: () => set(s => ({ registroVisivel: !s.registroVisivel })),
  alternarAudio: () => set(s => { audio.ligar(); audio.mudo = s.audioLigado; return { audioLigado: !s.audioLigado }; }),
  alternarAutoGirar: () => set(s => ({ autoGirar: !s.autoGirar })),
  fotografar: () => set({ snap: fotografar() }),
  novoSujeito: () => { sim.novoSujeito(); set({ rodando: false, velocidade: sim.S.velocidade, snap: fotografar() }); },
}));

// registroVisivel deve reagir a mudanças de largura como useMobile(), não só ao valor inicial
if (typeof window !== 'undefined') {
  const consulta = window.matchMedia('(min-width: 721px)');
  consulta.addEventListener('change', e => useLab.setState({ registroVisivel: e.matches }));
}
