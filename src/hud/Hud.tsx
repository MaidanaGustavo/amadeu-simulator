import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sim } from '../engine';
import { useLab } from '../store/useLab';
import Registro from './Registro';
import Painel from './Painel';

const nomesAto: Record<string, string> = { andar: 'Locomoção', farejar: 'Farejando', limpar: 'Limpeza', levantar: 'Levantando',
  pressionar: 'Pressionando a barra', comer: 'Comendo', congelar: 'Congelamento' };
const nomesEsquema: Record<string, string> = { CRF: 'Reforço contínuo', FR: 'Razão fixa', VR: 'Razão variável',
  FI: 'Intervalo fixo', VI: 'Intervalo variável', EXT: 'Extinção' };
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const num = (v: number) => v.toFixed(1).replace('.', ',');

export default function Hud() {
  const snap = useLab(s => s.snap);
  const rodando = useLab(s => s.rodando);
  const alternarRodando = useLab(s => s.alternarRodando);
  const alternarPainel = useLab(s => s.alternarPainel);
  const registroVisivel = useLab(s => s.registroVisivel);
  const alternarRegistro = useLab(s => s.alternarRegistro);
  const audioLigado = useLab(s => s.audioLigado);
  const alternarAudio = useLab(s => s.alternarAudio);
  const autoGirar = useLab(s => s.autoGirar);
  const alternarAutoGirar = useLab(s => s.alternarAutoGirar);
  const fotografar = useLab(s => s.fotografar);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/INPUT|SELECT|TEXTAREA/.test((document.activeElement as HTMLElement)?.tagName ?? '')) return;
      // repetição automática do navegador ao segurar a tecla não deve virar pressões extras
      if (e.repeat) { if (e.code === 'Space') e.preventDefault(); return; }
      if (e.code === 'Space') { e.preventDefault(); sim.entregarReforco(); }
      if (e.key === 'p' || e.key === 'P') alternarRodando();
      if (e.key === 'm' || e.key === 'M') alternarAudio();
      if (e.key === 'g' || e.key === 'G') alternarAutoGirar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [alternarRodando, alternarAudio, alternarAutoGirar]);

  const esquema = nomesEsquema[snap.esquema] + (snap.esquema === 'CRF' || snap.esquema === 'EXT' ? '' :
    ` ${snap.valor}${snap.esquema === 'FI' || snap.esquema === 'VI' ? ' s' : ''}`);
  // realce discreto do contador logo após uma pressão; sai do snapshot, sem timer nem re-render extra
  const pressaoRecente = snap.t - snap.ultimaPressao < 0.4;

  return (
    <>
      <div className="hud">
        <div className="topo">
          <div className="marca vidro">
            <h1>Amadeu Simulator</h1>
            <p><b className={snap.ato === 'comer' ? 'comendo' : ''}>{nomesAto[snap.ato]}</b> · <span>{esquema}</span></p>
          </div>
          <div className="estado vidro">
            <div><b>{fmt(snap.t)}</b><span>sessão</span></div>
            <div className={pressaoRecente ? 'pulso' : ''}><b>{snap.respostas}</b><span>pressões</span></div>
            <div><b>{snap.reforcos}</b><span>reforços</span></div>
            <div><b>{num(snap.taxa)}</b><span>resp/min</span></div>
            <div className="opcional"><b>{snap.razaoSup === null ? '—' : snap.razaoSup.toFixed(2).replace('.', ',')}</b><span>supressão</span></div>
          </div>
          <div className="acoes-topo">
            <button className={'vidro icone' + (autoGirar ? ' ativo' : '')} onClick={alternarAutoGirar}
              aria-pressed={autoGirar} title="Girar a caixa automaticamente (G)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9"/><path d="M13.5 2.5v2.6h-2.6"/></svg>
              <span className="rotulo">Girar</span>
            </button>
            <button className={'vidro icone' + (audioLigado ? '' : ' silenciado')} onClick={alternarAudio}
              aria-pressed={audioLigado} title={audioLigado ? 'Silenciar (M)' : 'Ativar áudio (M)'}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 6v4h2.6l3.4 2.6V3.4L5.1 6z"/>
                {audioLigado ? <><path d="M10.8 5.8a3 3 0 0 1 0 4.4"/><path d="M12.6 4a5.6 5.6 0 0 1 0 8"/></> : <path d="M10.5 6.2l3 3.6M13.5 6.2l-3 3.6"/>}
              </svg>
              <span className="rotulo">{audioLigado ? 'Áudio' : 'Mudo'}</span>
            </button>
            <Link className="botao vidro" to="/instrucoes"><span className="rotulo">Instruções</span><span className="rotulo-curto">?</span></Link>
            <button className="vidro" onClick={() => alternarPainel()} aria-controls="painel">Painel</button>
          </div>
        </div>

        <div className="meio"><Registro /></div>

        <nav className="doca vidro" aria-label="Controles do experimentador">
          <button className={rodando ? '' : 'principal'} onClick={alternarRodando}>{rodando ? 'Pausar' : 'Iniciar'}</button>
          <button onClick={() => sim.entregarReforco()}><span className="rotulo">Dar comida</span><span className="rotulo-curto">Comida</span><kbd>espaço</kbd></button>
          <button className={snap.somLigado ? 'ativo' : ''} aria-pressed={snap.somLigado} onClick={() => { sim.alternarSom(); fotografar(); }}>{snap.somLigado ? 'Parar som' : 'Som'}</button>
          <button className={snap.luzLigada ? 'ativo' : ''} aria-pressed={snap.luzLigada} onClick={() => { sim.alternarLuz(); fotografar(); }}>{snap.luzLigada ? 'Apagar luz' : 'Luz'}</button>
          <button className={'perigo' + (snap.choqueLigado ? ' ativo' : '')} aria-pressed={snap.choqueLigado} onClick={() => { sim.alternarChoque(); fotografar(); }}>{snap.choqueLigado ? 'Parar choque' : 'Choque'}</button>
          {!registroVisivel && <button className="fantasma" onClick={alternarRegistro}>Registro</button>}
        </nav>
      </div>
      <Painel />
    </>
  );
}
