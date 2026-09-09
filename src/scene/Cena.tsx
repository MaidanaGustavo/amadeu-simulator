import { useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { sim, BAR_X, COMEDOURO_X, X_MIN, X_MAX, type Ato, type Destino } from '../engine';
import { useLab } from '../store/useLab';
import { audio } from '../audio/AudioLab';
import { useMobile } from '../hooks/useMobile';

/* ---------- geometria da caixa ---------- */
export const W = 1.0, D = 0.7, H = 0.62, PZ = -D / 2;
export const xEng = (v: number) => -0.44 + (v - X_MIN) / (X_MAX - X_MIN) * 0.88;
const LX = xEng(BAR_X), HX = xEng(COMEDOURO_X);

const cor = {
  aluminio: '#aeb5ba', aco: '#8d959a', base: '#353c40', acrilico: '#d8ecf3',
  ambar: '#e0a84a', choque: '#e25b3f', pelota: '#d9c493', pelo: '#e9e4da', pele: '#e8b7bd', olho: '#1a1d1f',
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngulo = (a: number, b: number, t: number) => {
  const d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return a + d * t;
};

/* ---------- laço do motor: avança a simulação em passos fixos ---------- */
function Motor() {
  const acumulado = useRef(0);
  const tHud = useRef(0);
  useFrame((_, delta) => {
    const real = Math.min(0.1, delta);
    const { rodando, fotografar } = useLab.getState();
    if (rodando) {
      acumulado.current += real * sim.S.velocidade;
      const dt = 1 / 30; let n = 0;
      while (acumulado.current >= dt && n < 400) { sim.passo(dt); acumulado.current -= dt; n++; }
    }
    tHud.current += real;
    if (tHud.current > 0.12) { fotografar(); tHud.current = 0; }
  });
  return null;
}

/* ---------- caixa ---------- */
function Caixa() {
  const acrilico = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: cor.acrilico, transparent: true, opacity: 0.10, roughness: 0.04, metalness: 0,
    side: THREE.DoubleSide, depthWrite: false,
  }), []);
  const varas = useMemo(() => {
    const xs: number[] = [];
    for (let x = -W / 2 + 0.03; x <= W / 2 - 0.03; x += 0.036) xs.push(x);
    return xs;
  }, []);
  const varasRef = useRef<THREE.MeshStandardMaterial[]>([]);

  useFrame((_, delta) => {
    const alvo = sim.mundo.choqueAte > sim.S.t ? 0.9 : 0;
    for (const m of varasRef.current) if (m) m.emissiveIntensity = lerp(m.emissiveIntensity, alvo, Math.min(1, 18 * delta));
  });

  const e = 0.014;
  return (
    <group>
      {/* bancada */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.075} receiveShadow>
        <circleGeometry args={[2.6, 64]} />
        <meshStandardMaterial color="#1d2225" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* base */}
      <mesh position-y={-0.04} castShadow receiveShadow>
        <boxGeometry args={[W + 0.08, 0.07, D + 0.08]} />
        <meshStandardMaterial color={cor.base} metalness={0.55} roughness={0.5} />
      </mesh>
      <mesh position-y={-0.003} receiveShadow>
        <boxGeometry args={[W - 0.02, 0.005, D - 0.02]} />
        <meshStandardMaterial color="#23292c" roughness={0.9} />
      </mesh>
      {/* grade eletrificável */}
      {varas.map((x, i) => (
        <mesh key={i} rotation-x={Math.PI / 2} position={[x, 0.012, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.006, 0.006, D - 0.04, 12]} />
          <meshStandardMaterial ref={m => { if (m) varasRef.current[i] = m; }}
            color={cor.aco} metalness={0.85} roughness={0.3} emissive={cor.choque} emissiveIntensity={0} />
        </mesh>
      ))}
      {/* painel de interação */}
      <mesh position={[0, H / 2, PZ - 0.01]} castShadow receiveShadow>
        <boxGeometry args={[W, H, 0.02]} />
        <meshStandardMaterial color={cor.aluminio} metalness={0.7} roughness={0.38} />
      </mesh>
      {/* acrílico */}
      <mesh position={[-W / 2, H / 2, 0]} rotation-y={Math.PI / 2} material={acrilico}><planeGeometry args={[D, H]} /></mesh>
      <mesh position={[W / 2, H / 2, 0]} rotation-y={-Math.PI / 2} material={acrilico}><planeGeometry args={[D, H]} /></mesh>
      <mesh position={[0, H / 2, D / 2]} material={acrilico}><planeGeometry args={[W, H]} /></mesh>
      <mesh position-y={H} rotation-x={Math.PI / 2} material={acrilico}><planeGeometry args={[W, D]} /></mesh>
      {/* arestas */}
      {[-1, 1].flatMap(sx => [-1, 1].map(sz => (
        <mesh key={`v${sx}${sz}`} position={[sx * W / 2, H / 2, sz * D / 2]} castShadow>
          <boxGeometry args={[e, H, e]} /><meshStandardMaterial color="#4d565b" metalness={0.6} roughness={0.45} />
        </mesh>
      )))}
      {[-1, 1].map(sz => (
        <mesh key={`h${sz}`} position={[0, H, sz * D / 2]} castShadow>
          <boxGeometry args={[W + e, e, e]} /><meshStandardMaterial color="#4d565b" metalness={0.6} roughness={0.45} />
        </mesh>
      ))}
      {[-1, 1].map(sx => (
        <mesh key={`d${sx}`} position={[sx * W / 2, H, 0]} castShadow>
          <boxGeometry args={[e, e, D]} /><meshStandardMaterial color="#4d565b" metalness={0.6} roughness={0.45} />
        </mesh>
      ))}
      {/* house light */}
      <mesh position={[0.32, H - 0.012, PZ + 0.08]}>
        <boxGeometry args={[0.08, 0.02, 0.05]} />
        <meshStandardMaterial color="#fff3dc" emissive="#fff0d0" emissiveIntensity={0.9} />
      </mesh>
      <pointLight position={[0.32, H - 0.05, PZ + 0.08]} color="#fff0d6" intensity={0.45} distance={2.2} decay={2} />
    </group>
  );
}

/* ---------- aparato: alavanca, comedouro, luz-sinal, alto-falante ---------- */
function Aparato() {
  const alavanca = useRef<THREE.Group>(null);
  const luz = useRef<THREE.MeshStandardMaterial>(null);
  const luzPt = useRef<THREE.PointLight>(null);
  const alte = useRef<THREE.MeshStandardMaterial>(null);
  const pelota = useRef<THREE.Mesh>(null);
  const escalaPelota = useRef(0);
  const faisca = useRef<THREE.Mesh>(null);
  const faiscaMat = useRef<THREE.MeshBasicMaterial>(null);
  const alavancaMat = useRef<THREE.MeshStandardMaterial>(null);
  const NUM_MIGALHAS = 6;
  const migalhas = useRef<(THREE.Mesh | null)[]>([]);
  const migalhaState = useRef(Array.from({ length: NUM_MIGALHAS }, () => ({ vida: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 })));
  const mordidaAnterior = useRef(-1);

  useFrame((state, delta) => {
    const k = Math.min(1, 10 * delta);
    const { S, mundo, rato } = sim;
    const pressionada = mundo.barraAte > S.t || (rato.modo === 'agir' && rato.ato === 'pressionar' && rato.timer < rato.dur * 0.7);
    if (alavanca.current) alavanca.current.rotation.x = lerp(alavanca.current.rotation.x, pressionada ? 0.32 : 0, k);
    // anel de resposta: um "ping" que se expande e apaga a cada pressão, visível mesmo com o áudio mudo
    const DUR_FAISCA = 0.5;
    const desdeAPressao = S.t - mundo.barraAte + 0.25;
    const pFaisca = desdeAPressao / DUR_FAISCA;
    const faiscaAtiva = pFaisca >= 0 && pFaisca < 1;
    if (faisca.current) {
      faisca.current.visible = faiscaAtiva;
      if (faiscaAtiva) faisca.current.scale.setScalar(lerp(0.45, 2.8, pFaisca));
    }
    if (faiscaMat.current) faiscaMat.current.opacity = faiscaAtiva ? 0.95 * (1 - pFaisca) * (1 - pFaisca) : 0;
    // a própria alavanca acende por um instante: marca a resposta no ponto exato onde ela ocorre
    if (alavancaMat.current) {
      alavancaMat.current.emissiveIntensity = lerp(alavancaMat.current.emissiveIntensity,
        faiscaAtiva ? 1.4 * (1 - pFaisca) : 0, Math.min(1, 16 * delta));
    }
    const luzOn = mundo.luzAte > S.t;
    if (luz.current) luz.current.emissiveIntensity = lerp(luz.current.emissiveIntensity, luzOn ? 1.6 : 0, k);
    if (luzPt.current) luzPt.current.intensity = lerp(luzPt.current.intensity, luzOn ? 0.9 : 0, k);
    const somOn = mundo.somAte > S.t;
    if (alte.current) alte.current.emissiveIntensity = lerp(alte.current.emissiveIntensity, somOn ? 0.5 + 0.3 * Math.sin(state.clock.elapsedTime * 16) : 0, k);
    // pelota: cresce ao cair no comedouro, encolhe em mordidas discretas (não uma rampa contínua)
    // durante o ato de comer, para ficar visualmente óbvio que está sendo mastigada aos poucos
    const comendo = rato.modo === 'agir' && rato.ato === 'comer';
    const progComer = comendo ? 1 - rato.timer / rato.dur : 0;
    const MORDIDAS = 5;
    const mordidaAtual = comendo ? Math.min(MORDIDAS, Math.floor(progComer * MORDIDAS)) : 0;
    if (comendo && mordidaAtual > mordidaAnterior.current) {
      // a cada mordida, solta farelos que caem e desaparecem perto do comedouro
      for (let n = 0; n < 2; n++) {
        const s = migalhaState.current.find(e => e.vida <= 0);
        if (!s) break;
        s.vida = 0.55;
        s.x = (Math.random() - 0.5) * 0.01; s.y = 0.01; s.z = (Math.random() - 0.5) * 0.01;
        s.vx = (Math.random() - 0.5) * 0.06; s.vy = 0.04 + Math.random() * 0.03; s.vz = (Math.random() - 0.5) * 0.06;
      }
    }
    mordidaAnterior.current = comendo ? mordidaAtual : -1;
    const alvoEscala = mundo.pelota ? Math.max(0, 1 - mordidaAtual / MORDIDAS) : 0;
    escalaPelota.current = lerp(escalaPelota.current, alvoEscala, Math.min(1, 16 * delta));
    if (pelota.current) {
      pelota.current.visible = escalaPelota.current > 0.02;
      pelota.current.scale.setScalar(escalaPelota.current);
    }
    // física simples dos farelos: sobem, caem com gravidade leve e somem
    for (let i = 0; i < NUM_MIGALHAS; i++) {
      const s = migalhaState.current[i], m = migalhas.current[i];
      if (!m) continue;
      if (s.vida > 0) {
        s.vida -= delta;
        s.vy -= 0.15 * delta;
        s.x += s.vx * delta; s.y += s.vy * delta; s.z += s.vz * delta;
        m.visible = s.vida > 0;
        m.position.set(HX + s.x, 0.032 + Math.max(0, s.y), PZ + 0.07 + s.z);
        (m.material as THREE.MeshStandardMaterial).opacity = Math.max(0, Math.min(1, s.vida / 0.55));
      } else if (m.visible) m.visible = false;
    }
  });

  return (
    <group>
      {/* alavanca */}
      <mesh position={[LX, 0.13, PZ + 0.01]} castShadow>
        <boxGeometry args={[0.06, 0.05, 0.02]} /><meshStandardMaterial color="#c9cfd3" metalness={0.9} roughness={0.25} />
      </mesh>
      <group ref={alavanca} position={[LX, 0.13, PZ + 0.02]}>
        <mesh position-z={0.055} castShadow>
          <boxGeometry args={[0.04, 0.011, 0.11]} />
          <meshStandardMaterial ref={alavancaMat} color="#c9cfd3" metalness={0.9} roughness={0.25}
            emissive={cor.ambar} emissiveIntensity={0} />
        </mesh>
      </group>
      {/* anel de resposta: pisca sobre a alavanca a cada pressão registrada */}
      <mesh ref={faisca} position={[LX, 0.145, PZ + 0.06]} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[0.015, 0.032, 32]} />
        <meshBasicMaterial ref={faiscaMat} color="#fff2c8" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* comedouro */}
      <mesh position={[HX, 0.0475, PZ + 0.045]} castShadow>
        <boxGeometry args={[0.12, 0.075, 0.09]} /><meshStandardMaterial color="#6d757a" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[HX, 0.052, PZ + 0.062]}>
        <boxGeometry args={[0.09, 0.055, 0.075]} /><meshStandardMaterial color="#1b1f22" roughness={0.9} />
      </mesh>
      <mesh ref={pelota} position={[HX, 0.032, PZ + 0.07]} castShadow visible={false}>
        <sphereGeometry args={[0.015, 16, 12]} /><meshStandardMaterial color={cor.pelota} roughness={0.8} />
      </mesh>
      {/* farelos: pipocam a cada mordida para reforçar visualmente que a pelota está sendo comida */}
      {Array.from({ length: NUM_MIGALHAS }).map((_, i) => (
        <mesh key={i} ref={m => { migalhas.current[i] = m; }} visible={false}>
          <boxGeometry args={[0.0035, 0.0035, 0.0035]} />
          <meshStandardMaterial color={cor.pelota} roughness={0.9} transparent opacity={1} />
        </mesh>
      ))}
      {/* luz-sinal */}
      <mesh position={[LX, 0.33, PZ + 0.02]}>
        <sphereGeometry args={[0.02, 20, 16]} />
        <meshStandardMaterial ref={luz} color="#5a4a2a" emissive={cor.ambar} emissiveIntensity={0} />
      </mesh>
      <pointLight ref={luzPt} position={[LX, 0.33, PZ + 0.08]} color={cor.ambar} intensity={0} distance={0.9} decay={2} />
      {/* alto-falante */}
      <mesh position={[0.28, 0.40, PZ + 0.006]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.055, 0.055, 0.012, 32]} />
        <meshStandardMaterial ref={alte} color="#2c3236" roughness={0.8} emissive={cor.ambar} emissiveIntensity={0} />
      </mesh>
      {[1, 2, 3].map(i => (
        <mesh key={i} position={[0.28, 0.40, PZ + 0.013]}>
          <torusGeometry args={[0.012 * i, 0.0015, 8, 40]} /><meshStandardMaterial color="#6f787d" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- ponte motor → áudio ---------- */
function Sons() {
  useEffect(() => {
    const ok = () => useLab.getState().audioLigado && sim.S.velocidade <= 20;
    const offs = [
      sim.on('reforco', () => { if (ok()) audio.dispensador(); }),
      sim.on('pressao', () => { if (ok()) audio.alavanca(); }),
      sim.on('som', d => {
        const n = Number(d);
        // desligar precisa acontecer mesmo mudo/acelerado, ou o tom sustentado fica preso tocando
        if (n === 0) { audio.tomDesligar(); return; }
        if (!ok()) return;
        if (n === Infinity) audio.tomLigar();
        else audio.tom(Math.min(10, n || 5) / Math.max(1, sim.S.velocidade / 5));
      }),
      sim.on('luz', () => { if (ok()) audio.luz(); }),
      sim.on('choque', () => { if (ok()) { audio.choque(); audio.guincho(1); } }),
      sim.on('chegou', d => { if (ok() && d !== 'livre') audio.passo(); }),
      sim.on('ato', d => {
        if (!ok()) return;
        const ato = d as Ato;
        if (ato === 'comer') audio.mastigar();
        else if (ato === 'farejar') audio.farejar();
        else if (ato === 'limpar') audio.cocar();
        else if (ato === 'levantar' && Math.random() < 0.18) audio.guincho(0.1);
        else if (ato === 'pressionar' && Math.random() < 0.12) audio.guincho(0.05);
      }),
    ];
    // desbloqueia o contexto de áudio no primeiro gesto, seja qual for
    const gesto = () => { audio.ligar(); window.removeEventListener('pointerdown', gesto); };
    window.addEventListener('pointerdown', gesto);
    return () => { offs.forEach(f => f()); window.removeEventListener('pointerdown', gesto); audio.tomDesligar(); };
  }, []);
  return null;
}

/* ---------- pelagem: instâncias de fios curtos sobre um elipsoide ---------- */
function Pelagem({ raio, escala, centro, quantidade, comprimento = 0.012, penteado = -0.7 }:
  { raio: number; escala: [number, number, number]; centro: [number, number, number]; quantidade: number; comprimento?: number; penteado?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => { const g = new THREE.ConeGeometry(0.0011, comprimento, 3); g.translate(0, comprimento / 2, 0); return g; }, [comprimento]);

  useLayoutEffect(() => {
    const m = ref.current; if (!m) return;
    const dummy = new THREE.Object3D(), normal = new THREE.Vector3(), dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const cor = new THREE.Color();
    const dourado = Math.PI * (3 - Math.sqrt(5));
    let k = 0;
    for (let i = 0; i < quantidade * 1.6 && k < quantidade; i++) {
      // esfera de Fibonacci com jitter, pulando a barriga (fios ali não aparecem e custam)
      const y = 1 - (i / (quantidade * 1.6 - 1)) * 2;
      if (y < -0.45) continue;
      const r = Math.sqrt(1 - y * y), th = dourado * i + Math.random() * 0.3;
      const px = Math.cos(th) * r, pz = Math.sin(th) * r;
      dummy.position.set(centro[0] + px * raio * escala[0], centro[1] + y * raio * escala[1], centro[2] + pz * raio * escala[2]);
      normal.set(px / escala[0], y / escala[1], pz / escala[2]).normalize();
      dir.copy(normal).addScaledVector(new THREE.Vector3(0, -0.15, penteado), 0.9).normalize(); // penteado para trás
      dir.x += (Math.random() - 0.5) * 0.35; dir.y += (Math.random() - 0.5) * 0.25; dir.z += (Math.random() - 0.5) * 0.25;
      dummy.quaternion.setFromUnitVectors(up, dir.normalize());
      const esc = 0.7 + Math.random() * 0.7;
      dummy.scale.set(1, esc, 1);
      dummy.updateMatrix();
      m.setMatrixAt(k, dummy.matrix);
      const tom = 0.86 + Math.random() * 0.14;
      cor.setRGB(tom * 0.93, tom * 0.90, tom * 0.85);
      m.setColorAt(k, cor);
      k++;
    }
    m.count = k;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [raio, escala, centro, quantidade, penteado]);

  return (
    <instancedMesh ref={ref} args={[geo, undefined, quantidade]} castShadow={false} receiveShadow frustumCulled={false}>
      <meshStandardMaterial color="#efeae0" roughness={1} />
    </instancedMesh>
  );
}

/** Textura de pelo gerada em canvas: riscos curtos, usada como mapa de cor e relevo. */
function useTexturaPelo() {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d')!;
    g.fillStyle = '#e6e1d7'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * 512, y = Math.random() * 512, l = 6 + Math.random() * 14;
      const t = 200 + Math.random() * 55;
      g.strokeStyle = `rgba(${t},${t - 6},${t - 14},${0.25 + Math.random() * 0.35})`;
      g.lineWidth = 0.6 + Math.random() * 0.8;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 3, y + l); g.stroke();
    }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/* ---------- rato ---------- */
// arrays estáveis: literais inline seriam recriados a cada render de Rato, e o
// useLayoutEffect de Pelagem depende de escala/centro por referência (finding de review)
const ESCALA_CORPO: [number, number, number] = [1, 0.78, 1.55];
const CENTRO_CORPO: [number, number, number] = [0, 0.055, 0.06];
const ESCALA_CABECA: [number, number, number] = [0.9, 0.85, 1.15];
const CENTRO_CABECA: [number, number, number] = [0, 0, 0];

// no escopo do módulo (não dentro de Rato()) para não remontar as pernas a cada
// render — recebe a textura e o callback de ref de fora em vez de fechar sobre elas
function Perna({ x, z, texPelo, onRef }: {
  x: number; z: number; texPelo: THREE.Texture; onRef: (g: THREE.Group | null) => void;
}) {
  return (
    <group ref={onRef} position={[x, 0.05, z]}>
      <mesh position-y={-0.025} castShadow><cylinderGeometry args={[0.008, 0.007, 0.05, 10]} /><meshStandardMaterial map={texPelo} color={cor.pelo} roughness={0.95} /></mesh>
      <mesh position-y={-0.05}><sphereGeometry args={[0.01, 10, 8]} /><meshStandardMaterial color={cor.pele} roughness={0.7} /></mesh>
    </group>
  );
}

function Rato({ mobile }: { mobile: boolean }) {
  const raiz = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const pescoco = useRef<THREE.Group>(null);
  const mandibula = useRef<THREE.Mesh>(null);
  const bigodesG = useRef<THREE.Group>(null);
  const orelhas = useRef<(THREE.Mesh | null)[]>([]);
  const cauda = useRef<THREE.Group>(null);
  const corpo = useRef<THREE.Mesh>(null);
  const pernas = useRef<(THREE.Group | null)[]>([]);
  const v = useRef({ z: 0.05, zAlvo: 0.05, yaw: Math.PI, pitch: 0, roll: 0, cabPitch: 0, cabYaw: 0, esc: 1, boca: 0, xCorr: 0,
    ultimoAlvo: null as number | null, xAnt: 0, zAnt: 0, fase: 0, orelhaT: [0, 0] as [number, number], bigodeT: 0, tremor: 0 });
  const texPelo = useTexturaPelo();

  const curvaCauda = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, -0.01, -0.07),
    new THREE.Vector3(-0.02, -0.02, -0.14), new THREE.Vector3(0.03, -0.035, -0.2)]), []);
  const bigodes = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 });
    const linhas: THREE.Line[] = [];
    for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(s * 0.01, -0.004, 0.08), new THREE.Vector3(s * 0.075, -0.004 + i * 0.013, 0.055 - Math.abs(i) * 0.01)]);
      linhas.push(new THREE.Line(g, mat));
    }
    return linhas;
  }, []);

  // guincho ocasional quando o choque termina e ao ser pego de surpresa pela luz
  useEffect(() => sim.on('luz', () => { if (Math.random() < 0.25) v.current.orelhaT = [0.6, 0.6]; }), []);

  useFrame((_, delta) => {
    const dt = Math.min(0.1, delta), k = Math.min(1, 9 * dt), r = v.current;
    const { rato, S, mundo } = sim;
    // o alvo de parada (BAR_X + 14, em Simulacao.ts) deixa a pata dianteira alguns
    // cm longe da alavanca; corrigido só visualmente para não afetar o RNG do motor
    const pressionandoAgora = rato.modo === 'agir' && rato.ato === 'pressionar';
    r.xCorr = lerp(r.xCorr, pressionandoAgora ? LX - xEng(rato.x) : 0, Math.min(1, 8 * dt));
    const x = xEng(rato.x) + r.xCorr;

    const destinos: Destino[] = ['barra', 'pressionar', 'comedouro'];
    const naFrente = (rato.modo === 'mover' && destinos.includes(rato.destino)) ||
      (rato.modo === 'agir' && (rato.ato === 'pressionar' || rato.ato === 'comer'));
    if (naFrente) r.zAlvo = PZ + 0.135;
    else if (rato.modo === 'mover' && rato.alvo !== r.ultimoAlvo) r.zAlvo = -0.14 + Math.random() * 0.36;
    r.ultimoAlvo = rato.alvo;
    r.z = lerp(r.z, r.zAlvo, Math.min(1, 4 * dt));

    const dx = x - r.xAnt, dz = r.z - r.zAnt;
    let yawAlvo = r.yaw;
    if (rato.modo === 'agir' && (rato.ato === 'pressionar' || rato.ato === 'comer')) yawAlvo = Math.PI;
    else if (Math.hypot(dx, dz) > 0.0006) yawAlvo = Math.atan2(dx, dz);
    const yawAntes = r.yaw;
    r.yaw = lerpAngulo(r.yaw, yawAlvo, Math.min(1, 8 * dt));
    const viradaYaw = lerpAngulo(0, r.yaw - yawAntes, 1);       // cabeça antecipa a curva
    r.xAnt = x; r.zAnt = r.z;

    const ato = rato.modo === 'agir' ? rato.ato : 'andar';
    const prog = rato.modo === 'agir' ? 1 - rato.timer / rato.dur : 0;
    const andando = ato === 'andar';
    const veloc = Math.min(1.6, Math.hypot(dx, dz) / Math.max(dt, 1e-3) / 0.6);
    r.fase += dt * (andando ? 9 + 6 * veloc : 3);

    let pitch = 0, cabPitch = 0, cabYaw = 0, esc = 1, boca = 0, roll = 0;
    switch (ato) {
      case 'levantar': pitch = -1.05 * Math.sqrt(Math.sin(Math.min(1, prog) * Math.PI)); cabPitch = -0.15; break;
      case 'pressionar': pitch = -0.95; cabPitch = 0.25 + 0.2 * Math.sin(prog * Math.PI); break;
      case 'comer': pitch = 0.22; cabPitch = 0.55 + 0.11 * Math.sin(r.fase * 4); boca = 0.5 + 0.5 * Math.sin(r.fase * 9); break;
      case 'limpar': pitch = -0.35; cabYaw = 0.9 * Math.sin(r.fase * 1.3); cabPitch = 0.35 + 0.1 * Math.sin(r.fase * 5); break;
      case 'congelar': esc = 0.86; cabPitch = 0.1; break;
      case 'farejar': cabPitch = 0.15 + 0.12 * Math.sin(r.fase * 5); cabYaw = 0.25 * Math.sin(r.fase * 1.7); break;
      default: cabPitch = 0.05 * Math.sin(r.fase * 0.5); cabYaw = -viradaYaw * 6; roll = 0.06 * Math.sin(r.fase) * veloc;
    }
    // medo ativo encolhe a postura
    const medo = sim.medoAtual();
    esc *= 1 - 0.08 * medo; pitch += 0.08 * medo;

    r.pitch = lerp(r.pitch, pitch, k); r.roll = lerp(r.roll, roll, k);
    r.cabPitch = lerp(r.cabPitch, cabPitch, k); r.cabYaw = lerp(r.cabYaw, cabYaw, Math.min(1, 6 * dt));
    r.esc = lerp(r.esc, esc, k); r.boca = lerp(r.boca, boca, Math.min(1, 14 * dt));

    // respiração e tremor (choque / congelamento)
    const resp = 1 + 0.018 * Math.sin(r.fase * (ato === 'congelar' ? 1.6 : 0.8));
    r.tremor = lerp(r.tremor, mundo.choqueAte > S.t ? 1 : (ato === 'congelar' ? 0.25 : 0), Math.min(1, 12 * dt));
    const jit = r.tremor * 0.004;

    if (raiz.current) {
      raiz.current.position.set(x + (Math.random() - 0.5) * jit, 0, r.z + (Math.random() - 0.5) * jit);
      raiz.current.rotation.set(0, r.yaw, r.roll); raiz.current.scale.y = r.esc;
    }
    if (torso.current) torso.current.rotation.x = r.pitch;
    if (pescoco.current) {
      pescoco.current.rotation.x = r.cabPitch; pescoco.current.rotation.y = r.cabYaw;
      // "engolida" sutil na cabeça a cada fechada de mandíbula, só durante o ato de comer
      pescoco.current.scale.setScalar(ato === 'comer' ? 1 + 0.06 * r.boca : 1);
    }
    if (mandibula.current) mandibula.current.rotation.x = 0.42 * r.boca;
    if (cauda.current) { cauda.current.rotation.y = 0.35 * Math.sin(r.fase * 0.6) + (andando ? 0.2 * Math.sin(r.fase) : 0); cauda.current.rotation.x = 0.1 * Math.sin(r.fase * 0.4); }
    if (corpo.current) { corpo.current.scale.set(resp, 0.78 * resp, 1.55); corpo.current.position.y = 0.055 + (andando ? 0.004 * Math.abs(Math.sin(r.fase)) : 0); }

    // orelhas: contração espontânea e ao ouvir o som
    if (mundo.somAte > S.t && Math.random() < 0.02) r.orelhaT = [0.6, 0.6];
    for (let i = 0; i < 2; i++) {
      if (Math.random() < 0.004) r.orelhaT[i] = 0.6;
      r.orelhaT[i] = Math.max(0, r.orelhaT[i] - dt);
      const o = orelhas.current[i]; if (o) o.rotation.z = (i === 0 ? -1 : 1) * (0.1 + 0.9 * Math.sin(Math.max(0, r.orelhaT[i]) * 5.2));
    }
    // bigodes vibram ao farejar
    if (bigodesG.current) bigodesG.current.rotation.z = (ato === 'farejar' ? 0.12 : 0.03) * Math.sin(r.fase * (ato === 'farejar' ? 14 : 2));

    // patas: pares diagonais, com elevação vertical e alcance para a alavanca
    pernas.current.forEach((p, i) => {
      if (!p) return;
      const dianteira = i < 2, lado = i % 2 === 0 ? -1 : 1, f = dianteira ? 1 : -1;
      const ph = r.fase + (lado * f > 0 ? 0 : Math.PI);
      const ang = andando ? 0.55 * Math.sin(ph) * (0.5 + 0.5 * veloc) : 0;
      p.rotation.x = lerp(p.rotation.x, ang, Math.min(1, 14 * dt));
      p.position.y = lerp(p.position.y, 0.05 + (andando ? Math.max(0, Math.sin(ph)) * 0.008 : 0), Math.min(1, 14 * dt));
      if (dianteira && ato === 'pressionar') p.rotation.x = lerp(p.rotation.x, -1.1 + 0.15 * Math.sin(prog * Math.PI * 2), k);
      if (dianteira && ato === 'limpar') p.rotation.x = lerp(p.rotation.x, -1.6 + 0.3 * Math.sin(r.fase * 5 + i), k);
      if (dianteira && ato === 'comer') p.rotation.x = lerp(p.rotation.x, -1.2, k);
    });
  });

  const fiosCorpo = mobile ? 700 : 2200, fiosCabeca = mobile ? 220 : 650;

  return (
    <group ref={raiz} position={[0.1, 0, 0.05]}>
      <group ref={torso} position-z={-0.06}>
        <mesh ref={corpo} position={[0, 0.055, 0.06]} scale={[1, 0.78, 1.55]} castShadow>
          <sphereGeometry args={[0.07, 32, 24]} />
          <meshStandardMaterial map={texPelo} bumpMap={texPelo} bumpScale={0.0025} color={cor.pelo} roughness={0.95} />
        </mesh>
        <Pelagem raio={0.07} escala={ESCALA_CORPO} centro={CENTRO_CORPO} quantidade={fiosCorpo} />
        <group ref={pescoco} position={[0, 0.075, 0.16]}>
          <mesh scale={[0.9, 0.85, 1.15]} castShadow><sphereGeometry args={[0.043, 24, 18]} /><meshStandardMaterial map={texPelo} bumpMap={texPelo} bumpScale={0.002} color={cor.pelo} roughness={0.95} /></mesh>
          <Pelagem raio={0.043} escala={ESCALA_CABECA} centro={CENTRO_CABECA} quantidade={fiosCabeca} comprimento={0.008} penteado={-0.9} />
          <mesh rotation-x={Math.PI / 2} position={[0, -0.006, 0.06]}><coneGeometry args={[0.024, 0.06, 16]} /><meshStandardMaterial map={texPelo} color={cor.pelo} roughness={0.95} /></mesh>
          <mesh ref={mandibula} position={[0, -0.022, 0.045]}><boxGeometry args={[0.022, 0.008, 0.04]} /><meshStandardMaterial color="#d9cfc4" roughness={0.9} /></mesh>
          <mesh position={[0, -0.006, 0.09]}><sphereGeometry args={[0.008, 12, 10]} /><meshStandardMaterial color={cor.pele} roughness={0.55} /></mesh>
          {[-1, 1].map((s, i) => (
            <group key={s}>
              <mesh ref={m => { orelhas.current[i] = m; }} position={[s * 0.032, 0.03, -0.005]} scale={[1, 1, 0.35]} rotation-z={s * -0.1}>
                <sphereGeometry args={[0.018, 16, 12]} /><meshStandardMaterial color={cor.pele} roughness={0.7} />
              </mesh>
              <mesh position={[s * 0.024, 0.008, 0.035]}><sphereGeometry args={[0.006, 12, 10]} /><meshStandardMaterial color={cor.olho} roughness={0.15} metalness={0.2} /></mesh>
            </group>
          ))}
          <group ref={bigodesG}>{bigodes.map((l, i) => <primitive key={i} object={l} />)}</group>
        </group>
        <Perna x={-0.035} z={0.11} texPelo={texPelo} onRef={g => { pernas.current[0] = g; }} />
        <Perna x={0.035} z={0.11} texPelo={texPelo} onRef={g => { pernas.current[1] = g; }} />
      </group>
      <Perna x={-0.04} z={-0.02} texPelo={texPelo} onRef={g => { pernas.current[2] = g; }} />
      <Perna x={0.04} z={-0.02} texPelo={texPelo} onRef={g => { pernas.current[3] = g; }} />
      <group ref={cauda} position={[0, 0.04, -0.045]}>
        <mesh castShadow><tubeGeometry args={[curvaCauda, 24, 0.006, 8, false]} /><meshStandardMaterial color={cor.pele} roughness={0.7} /></mesh>
      </group>
    </group>
  );
}

/* ---------- canvas ---------- */
export default function Cena() {
  const mobile = useMobile();
  const autoGirar = useLab(s => s.autoGirar);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const l = lightRef.current; if (!l) return;
    l.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    const c = l.shadow.camera; c.near = 0.5; c.far = 8; c.left = -1.4; c.right = 1.4; c.top = 1.4; c.bottom = -1.4;
    l.shadow.bias = -0.0008; c.updateProjectionMatrix();
  }, [mobile]);

  return (
    <Canvas shadows dpr={mobile ? [1, 1.5] : [1, 2]}
      camera={{ position: [0, mobile ? 2.1 : 1.75, 0.12], fov: 36, near: 0.05, far: 40 }}
      gl={{ antialias: !mobile, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, powerPreference: 'high-performance' }}
      style={{ position: 'fixed', inset: 0, touchAction: 'none' }}>
      <hemisphereLight args={['#dfe7ec', '#1c2124', 0.55]} />
      <directionalLight ref={lightRef} position={[1.6, 2.6, 2.2]} intensity={0.95} color="#fff4e6" castShadow />
      <directionalLight position={[-2, 1.2, -1.5]} intensity={0.35} color="#b9c9d6" />
      <Caixa />
      <Aparato />
      <Rato mobile={mobile} />
      <Motor />
      <Sons />
      {/* rotação livre em 360° no azimute e quase completa na elevação — dá para olhar por baixo da grade */}
      <OrbitControls target={[0, 0.22, 0]} minDistance={0.7} maxDistance={5} minPolarAngle={0.02} maxPolarAngle={Math.PI - 0.15}
        enablePan={false} enableDamping dampingFactor={0.08} rotateSpeed={mobile ? 0.7 : 1}
        autoRotate={autoGirar} autoRotateSpeed={0.8} />
    </Canvas>
  );
}
