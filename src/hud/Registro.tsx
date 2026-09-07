import { useEffect, useRef } from 'react';
import { sim } from '../engine';
import { useLab } from '../store/useLab';

const JANELA = 240, ALTURA_PENA = 50;
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/** Registro cumulativo desenhado em canvas 2D; redesenha 5x/s sem passar pelo React. */
export default function Registro() {
  const ref = useRef<HTMLCanvasElement>(null);
  const visivel = useLab(s => s.registroVisivel);
  const alternar = useLab(s => s.alternarRegistro);

  useEffect(() => {
    if (!visivel) return;
    const cv = ref.current!, ctx = cv.getContext('2d')!;
    const desenhar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const larg = cv.clientWidth || 320, alt = 110;
      cv.width = larg * dpr; cv.height = alt * dpr; cv.style.height = alt + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, larg, alt);
      const { S, registro } = sim;
      const t1 = Math.max(JANELA, S.t), t0 = t1 - JANELA;
      const px = (t: number) => 6 + (t - t0) / JANELA * (larg - 12);
      const yTopo = 8, yBase = alt - 18;
      const py = (n: number) => yBase - ((n % ALTURA_PENA) / ALTURA_PENA) * (yBase - yTopo);

      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
      for (let k = Math.ceil(t0 / 30) * 30; k <= t1; k += 30) { ctx.beginPath(); ctx.moveTo(px(k), yTopo); ctx.lineTo(px(k), yBase); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right'; ctx.fillText(fmt(t1), larg - 6, alt - 5);
      ctx.textAlign = 'left'; ctx.fillText(fmt(t0), 6, alt - 5);

      ctx.strokeStyle = '#e0a84a'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.beginPath();
      let ini = false, nAnt: number | null = null;
      for (const p of registro.pontos.concat([{ t: S.t, n: S.respostas }])) {
        if (p.t < t0) { nAnt = p.n; continue; }
        const X = px(p.t), Y = py(p.n);
        if (!ini) { ctx.moveTo(X, Y); ini = true; }
        else if (nAnt !== null && Math.floor(p.n / ALTURA_PENA) !== Math.floor(nAnt / ALTURA_PENA)) { ctx.lineTo(X, yTopo); ctx.stroke(); ctx.beginPath(); ctx.moveTo(X, yBase); }
        else ctx.lineTo(X, Y);
        nAnt = p.n;
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2;
      for (const m of registro.marcas) { if (m.t < t0) continue; const X = px(m.t), Y = py(m.n); ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + 4, Y + 6); ctx.stroke(); }
    };
    desenhar();
    const id = setInterval(desenhar, 200);
    window.addEventListener('resize', desenhar);
    return () => { clearInterval(id); window.removeEventListener('resize', desenhar); };
  }, [visivel]);

  if (!visivel) return null;
  return (
    <section className="registro vidro" aria-label="Registro cumulativo">
      <header><span>Registro cumulativo</span><button className="fantasma" onClick={alternar}>Ocultar</button></header>
      <canvas ref={ref} height={110} />
    </section>
  );
}
