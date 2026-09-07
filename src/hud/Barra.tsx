export default function Barra({ rotulo, valor, medo }: { rotulo: string; valor: number; medo?: boolean }) {
  const p = Math.round(Math.max(0, Math.min(1, valor)) * 100) + '%';
  return (
    <div className="barra">
      <div className="rot"><span>{rotulo}</span><em>{p}</em></div>
      <div className="trilho"><div className={'preenche' + (medo ? ' medo' : '')} style={{ width: p }} /></div>
    </div>
  );
}
