import { sim, type TipoEsquema } from '../engine';
import { useLab } from '../store/useLab';
import Barra from './Barra';

const intervalo = (t: TipoEsquema) => t === 'FI' || t === 'VI';

const descricaoEsquema: Record<TipoEsquema, string> = {
  CRF: 'Toda pressão na barra é reforçada.',
  FR: 'Reforça a cada N pressões — ex.: FR 10 reforça a 10ª pressão desde o último reforço.',
  VR: 'Reforça após um número variável de pressões, em média N a cada vez.',
  FI: 'Reforça a primeira pressão após I segundos desde o último reforço.',
  VI: 'Reforça a primeira pressão após um intervalo variável, em média I segundos.',
  EXT: 'Nenhuma pressão é reforçada — usado para estudar a extinção.',
};

export default function Painel() {
  const aberto = useLab(s => s.painelAberto);
  const alternarPainel = useLab(s => s.alternarPainel);
  const velocidade = useLab(s => s.velocidade);
  const definirVelocidade = useLab(s => s.definirVelocidade);
  const snap = useLab(s => s.snap);
  const fotografar = useLab(s => s.fotografar);
  const novoSujeito = useLab(s => s.novoSujeito);

  const baixarCsv = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([sim.exportarCsv()], { type: 'text/csv;charset=utf-8' }));
    a.download = 'amadeu-simulator-sessao.csv'; a.click();
  };

  return (
    <aside id="painel" className={'painel' + (aberto ? ' aberto' : '')} aria-label="Painel do experimentador" aria-hidden={!aberto}>
      <header><h2>Painel</h2><button className="fantasma" onClick={() => alternarPainel(false)}>Fechar</button></header>

      <section>
        <h3>Esquema de reforço</h3>
        <div className="campo">
          <select aria-label="Tipo de esquema" value={snap.esquema} onChange={e => { sim.definirEsquema(e.target.value as TipoEsquema); fotografar(); }}>
            <option value="CRF" title={descricaoEsquema.CRF}>Reforço contínuo (CRF)</option>
            <option value="FR" title={descricaoEsquema.FR}>Razão fixa (FR)</option>
            <option value="VR" title={descricaoEsquema.VR}>Razão variável (VR)</option>
            <option value="FI" title={descricaoEsquema.FI}>Intervalo fixo (FI)</option>
            <option value="VI" title={descricaoEsquema.VI}>Intervalo variável (VI)</option>
            <option value="EXT" title={descricaoEsquema.EXT}>Extinção (EXT)</option>
          </select>
          <input type="number" min={1} max={120} aria-label="Valor do esquema" value={snap.valor}
            disabled={snap.esquema === 'CRF' || snap.esquema === 'EXT'}
            onChange={e => {
              // ignora estados intermediários da digitação (ex.: campo vazio ao apagar) —
              // "" || 1 resetaria o progresso do esquema para um valor não digitado pelo usuário
              if (e.target.value === '') return;
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              sim.definirEsquema(snap.esquema, v); fotografar();
            }} />
          <small>{intervalo(snap.esquema) ? 's' : 'resp.'}</small>
        </div>
        <p className="dica">{descricaoEsquema[snap.esquema]}</p>
        <div className="campo">
          <label htmlFor="vel">Velocidade da simulação</label>
          <select id="vel" value={velocidade} onChange={e => definirVelocidade(+e.target.value)}>
            <option value={1}>1×</option><option value={5}>5×</option><option value={20}>20×</option><option value={60}>60×</option>
          </select>
        </div>
      </section>

      <section>
        <h3>Procedimentos aversivos</h3>
        <div className="lista">
          <button className={snap.punir ? 'ativo' : ''} onClick={() => { sim.alternarPunicao(); fotografar(); }}>{snap.punir ? 'Punição ligada' : 'Punir cada pressão'}</button>
          <button className={snap.parear ? 'ativo' : ''} onClick={() => { sim.alternarPareamento(); fotografar(); }}>{snap.parear ? 'Pareamento ligado' : 'Parear som → choque'}</button>
        </div>
      </section>

      <section>
        <h3>Estado interno do sujeito</h3>
        <Barra rotulo="Som do dispensador → comida" valor={snap.somComida} />
        <Barra rotulo="Força da resposta de pressionar" valor={snap.forca} />
        <Barra rotulo="Permanecer perto da barra" valor={snap.perto} />
        <Barra rotulo="Expectativa de reforço por pressão" valor={snap.expectativa} />
        <Barra rotulo="Saciedade" valor={snap.saciedade} />
        <Barra rotulo="Medo do som" valor={snap.medoSom} medo />
        <Barra rotulo="Medo da luz" valor={snap.medoLuz} medo />
        <Barra rotulo="Medo da barra" valor={snap.medoBarra} medo />
        <Barra rotulo="Medo do contexto (pós-choque)" valor={snap.medoContexto} medo />
      </section>

      <section>
        <h3>Sessão</h3>
        <div className="lista">
          <button onClick={() => { sim.intervaloEntreSessoes(); fotografar(); }}>Intervalo entre sessões<small>+15 min</small></button>
          <button onClick={baixarCsv}>Baixar dados<small>CSV</small></button>
          <button onClick={novoSujeito}>Novo sujeito</button>
        </div>
      </section>
    </aside>
  );
}
