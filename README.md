# Amadeu Simulator

Simulador aberto de condicionamento clássico e operante — uma caixa de Skinner em 3D
com um rato virtual governado por um modelo matemático de aprendizagem. Feito para
ensino de Análise Experimental do Comportamento. Licença MIT.

Implementação original: nenhum código, arte ou dado de outros simuladores foi usado.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 9 testes de regressão comportamental (vitest)
npm run build      # gera dist/ estático — serve de qualquer pasta (IIS, nginx, S3)
```

## Arquitetura

```
src/
  engine/Simulacao.ts   motor comportamental — classe pura, sem DOM, injeção de RNG para testes
  store/useLab.ts       zustand: estado da interface + "fotografia" do motor a ~8 Hz
  scene/Cena.tsx        React Three Fiber: caixa, aparato, rato (pelagem instanciada), laço do motor, ponte de áudio
  audio/AudioLab.ts     síntese Web Audio: aparato e vocalizações do rato, sem arquivos
  hooks/useMobile.ts    detecção de tela estreita / toque
  hud/                  Hud, Painel, Registro (canvas 2D), Barra
  pages/                Laboratorio (cena + HUD) e Instrucoes
tests/simulacao.test.ts assinaturas dos esquemas, efeito do reforço parcial, punição, supressão
```

O motor emite eventos (`pressao`, `reforco`, `som`, `choque`, `ato`…) que áudio e
animação consomem — o modelo nunca sabe que existe som ou 3D.

Separação deliberada: o motor avança a 30 Hz em passos fixos dentro do `useFrame`
e muta refs do Three.js diretamente. O React só re-renderiza a HUD quando o
store recebe uma nova fotografia — nada da árvore React roda por quadro.

## Modelo

| Fenômeno | Mecanismo |
|---|---|
| Aquisição e modelagem | regra delta com gradiente de contiguidade `e^(−atraso/2,5 s)` |
| Reforçador condicionado | associação som→comida multiplica a taxa de aprendizagem |
| Break-and-run (FR) | pausa `0,9·√n + 0,18·n` s, depois corrida ×1,55 |
| Festão (FI) | peso ∝ `(t / 0,85·I)^2,2` |
| Efeito do reforço parcial | decremento em extinção ∝ expectativa de reforço |
| Saciedade | +0,4 p.p. por pelota; reduz motivação em até 60 % |
| Condicionamento clássico | Rescorla-Wagner; supressão medida pela razão de Estes-Skinner |
| Punição | força ×0,62 e medo da barra +0,30 por choque contingente |

Referências: Skinner (1938); Estes & Skinner (1941); Ferster & Skinner (1957);
Rescorla & Wagner (1972); Catania (1998).

## Deploy

Site estático (SPA com `HashRouter`, sem backend). O `Dockerfile` faz build com
Node e serve `dist/` com nginx (config em `nginx.conf` — fallback de rota,
cache imutável para os assets com hash, gzip).

```bash
docker build -t amadeu-simulator .
docker run -p 8080:80 amadeu-simulator
```

No Dokploy: criar uma Application apontando para este repositório, tipo de
build "Dockerfile" (usa o `Dockerfile` da raiz), porta do container `80`.
Não precisa de variáveis de ambiente nem de banco de dados.

## Contribuir

Candidatos naturais: discriminação de estímulos (S<sup>D</sup>/S<sup>Δ</sup>),
esquemas concorrentes e matching law, encadeamento, esquiva, calibração dos
parâmetros contra registros publicados. Todo comportamento novo deve vir com um
teste em `tests/`.
