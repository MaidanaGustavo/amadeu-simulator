# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Amadeu Simulator — an open-source 3D simulator of classical and operant conditioning (a Skinner
box with a virtual rat driven by a mathematical learning model), built for teaching
Experimental Analysis of Behavior. All identifiers, comments, and UI text are in
**Portuguese** — match that convention in any code you write or edit here.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest run — behavioral regression tests in tests/simulacao.test.ts
npm run build      # tsc -b && vite build → dist/ (static, serves from any subpath: IIS, nginx, S3)
npm run lint        # oxlint
docker build -t amadeu-simulator .   # prod image: node build stage -> nginx serving dist/
docker run -p 8080:80 amadeu-simulator
```

Run a single test file/case with vitest directly, e.g. `npx vitest run tests/simulacao.test.ts -t "FI apresenta festão"`.

Deployed via Dokploy as a Dockerfile-based Application (see `Dockerfile` / `nginx.conf`); no env vars or database needed — it's a static SPA.

## Architecture

```
src/
  engine/Simulacao.ts   behavioral engine — pure class, no DOM, RNG injected for deterministic tests
  engine/index.ts        exports the engine + a singleton `sim` instance shared by scene and store
  store/useLab.ts        zustand: UI state + a "snapshot" of the engine taken at ~8 Hz
  scene/Cena.tsx          React Three Fiber: box, apparatus, rat (instanced fur), engine loop, audio bridge
  audio/AudioLab.ts      real-time Web Audio synthesis: apparatus sounds + rat vocalizations, no audio files
  hooks/useMobile.ts     narrow-screen / touch-device detection
  hud/                    Hud, Painel (control panel), Registro (2D canvas cumulative-record), Barra
  pages/                  Laboratorio (Cena + Hud) and Instrucoes
tests/simulacao.test.ts  schedule signatures, partial-reinforcement effect, punishment, suppression
```

### The core split: engine vs. rendering

`Simulacao` (`src/engine/Simulacao.ts`) is a **framework-free** class holding all behavioral
state (`Sujeito`/subject, `Rato`/rat position, `Mundo`/world, `Registro`/cumulative record).
It advances via `passo(dt)` in fixed steps and knows nothing about React, Three.js, or audio.
A single shared instance (`sim`, from `src/engine/index.ts`) is mutated directly by both the
3D scene and the HUD — there is no engine↔view message passing beyond the event bus below.

The engine emits typed events (`pressao`, `reforco`, `som`, `luz`, `choque`, `ato`, `chegou`)
via `sim.on(evento, cb)`. Audio (`Sons` in `Cena.tsx`) and animation subscribe to these; the
model itself never references sound or 3D — **new behavioral mechanics must stay engine-side
and communicate outward only through events**, never call into audio/scene code.

### Two render loops running at different rates, deliberately

- **Cena.tsx `Motor` component**: inside `useFrame` (R3F, ~60 Hz), advances `sim` in fixed
  `1/30 s` steps (accumulator pattern) and mutates Three.js object refs directly every frame.
  None of the React tree re-renders on this loop.
- **`useLab` store**: takes a "photograph" (`fotografar()`) of `sim` state roughly every
  0.12 s (~8 Hz) and pushes it into zustand as `snap`. Only the HUD subscribes to `snap`, so
  React re-renders are throttled independently of simulation/render rate.

When touching simulation speed, animation, or HUD readouts, know which of these two loops you're
in — mixing them (e.g. reading `sim` state directly in a React component that should react to
`snap`, or fotografar-ing every frame) defeats the performance design.

### Coordinate system

The subject moves in 1D along the interaction panel, `X_MIN` to `X_MAX` (arbitrary units,
`Simulacao.ts`). `xEng()` in `Cena.tsx` maps that 1D coordinate into 3D world space. `BAR_X`
and `COMEDOURO_X` (lever and feeder positions) are defined once in the engine and reused by
the scene for object placement.

### Behavioral model

Implemented in `Simulacao.ts`, referenced against Skinner (1938), Estes & Skinner (1941),
Ferster & Skinner (1957), Rescorla & Wagner (1972), Catania (1998):

| Phenomenon | Mechanism |
|---|---|
| Acquisition / shaping | delta rule with contiguity gradient `e^(-delay/2.5s)` |
| Conditioned reinforcer | sound→food association multiplies learning rate |
| Break-and-run (FR) | post-reinforcement pause `0.9·√n + 0.18·n` s, then run ×1.55 |
| Scalloping (FI) | response weight ∝ `(t / 0.85·I)^2.2` |
| Partial reinforcement effect | extinction decrement ∝ reinforcement expectancy |
| Satiation | +0.4pp per pellet; reduces motivation up to 60% |
| Classical conditioning | Rescorla-Wagner; suppression via Estes-Skinner ratio |
| Punishment | force ×0.62 and bar-fear +0.30 per contingent shock |

Any new behavioral phenomenon (stimulus discrimination, concurrent schedules/matching law,
chaining, avoidance) should land as a pure addition to `Simulacao.ts`, be exercised through
`passo()`/public methods only, and ship with a test in `tests/`.

### Testing pattern

Tests instantiate `Simulacao` with a seeded deterministic RNG (`mulberry32`, defined inline in
`tests/simulacao.test.ts`) instead of `Math.random`, then fast-forward with repeated `passo(dt)`
calls (`run(sim, seconds)`) to assert on aggregate/statistical behavior (response rates,
suppression ratios) rather than exact trajectories. Follow this pattern for new engine tests —
don't assert on a single-step exact value where the model is stochastic.

### Routing

`HashRouter` (not `BrowserRouter`) is used deliberately so the built `dist/` works when served
from any static subpath or `file://` (no server-side rewrite rules needed).
