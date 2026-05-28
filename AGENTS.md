# Repository Guidelines

## Project Overview

A browser-based 3D sandbox world built with **Three.js** and **Vite**. Features procedural terrain generation (simplex-noise FBM), a third-person player with physics, dynamic sky/water shaders, instanced vegetation, object placement, post-processing (bloom/vignette), ambient particles, and a canvas-based HUD with minimap. The project includes a Puppeteer-based automated smoke test (`test-sandbox.mjs`) that validates the app loads without console errors.

## Architecture & Data Flow

Module-based architecture with no classes in user code — all modules export plain functions. `main.js` is the single orchestrator that:

1. Creates the Three.js renderer, scene, camera, and clock
2. Initializes systems via `init*()` calls (input, HUD, placement, post-processing)
3. Creates world objects via `create*()` calls (terrain, vegetation, water, sky, character, particles)
4. Runs a `requestAnimationFrame` game loop that calls `update*()` functions each frame

Data flows through **shared mutable singletons** — each module owns its own state (sets, arrays, vectors) and exposes getter/consumer functions. Modules import siblings directly; there is no event bus or DI container.

```
main.js (orchestrator)
├── world/      terrain, sky, water, vegetation  (procedural generation)
├── player/     movement, camera, character       (controls & avatar)
├── systems/    input, physics, placement, particles, postprocessing  (engine services)
├── ui/         hud                               (2D overlay)
└── utils/      noise, colors                     (shared helpers)
```

## Key Directories

| Path | Purpose |
|---|---|
| `sandbox-world/` | Main application (Vite project root) |
| `sandbox-world/src/main.js` | Entry point and game loop |
| `sandbox-world/src/world/` | Terrain, sky, water, vegetation generation |
| `sandbox-world/src/player/` | Movement, camera, character model |
| `sandbox-world/src/systems/` | Input, physics, placement, particles, post-processing |
| `sandbox-world/src/ui/` | HUD (FPS counter, minimap, build-mode display) |
| `sandbox-world/src/utils/` | Color palette constants, FBM noise function |
| `sandbox-world/dist/` | Build output |
| `./` (root) | Test harness and browser-automation dependencies |

## Development Commands

```bash
# Start dev server (Vite, serves at localhost:5173)
cd sandbox-world && npm run dev

# Production build
cd sandbox-world && npm run build

# Run automated smoke test (requires dev server running)
node test-sandbox.mjs
```

## Code Conventions & Common Patterns

**Module pattern**: Every file exports named functions. No default exports, no classes, no `this`. State lives as module-level `let`/`const` variables.

```js
// Typical module shape (systems/input.js, systems/physics.js, etc.)
const keys = new Set();
let scrollDelta = 0;

export function initInput(canvas) { /* wire event listeners */ }
export function isKeyDown(code) { return keys.has(code); }
export function consumeScrollDelta() { const d = scrollDelta; scrollDelta = 0; return d; }
```

**Naming**:
- `create*()` — returns a new Three.js object (e.g. `createTerrain()`, `createCharacter()`, `createWater()`)
- `init*()` — wires up side effects on an existing element (e.g. `initInput(canvas)`, `initHUD()`)
- `update*()` — per-frame tick (e.g. `updateMovement()`, `updateCamera()`, `updateWater()`)
- `sample*()` / `get*()` / `consume*()` — read or drain state (e.g. `sampleTerrainHeight()`, `getMouseDelta()`, `consumeRightClick()`)

**Imports**: Named imports from `'three'`; relative imports with `.js` extensions for local modules. No barrel/index files.

**Three.js specifics**: Magic numbers for enum values are used inline with comments (e.g. `renderer.shadowMap.type = 2; // PCFSoftShadowMap`). Pixel ratio capped at 2. Custom GLSL shaders for water.

**CSS**: Single `style.css` with HUD overlay elements. No CSS framework. `pointer-events: none` on HUD container.

## Important Files

| File | Role |
|---|---|
| `sandbox-world/src/main.js` | Entry point — creates renderer/scene/camera, init systems, game loop |
| `sandbox-world/index.html` | HTML shell with HUD markup and `<script type="module">` |
| `sandbox-world/vite.config.js` | Vite config (pre-bundles `three` for dev perf) |
| `sandbox-world/package.json` | App deps: `three`, `simplex-noise`, `vite` |
| `package.json` (root) | Test deps: `puppeteer`, `playwright`, `selenium-webdriver`, `chromedriver` |
| `test-sandbox.mjs` | Puppeteer smoke test — headless Chrome + SwiftShader, captures console errors |
| `sandbox-world/src/utils/noise.js` | FBM noise wrapper around `simplex-noise` |
| `sandbox-world/src/utils/colors.js` | Centralized color constants for biomes/materials |

## Runtime/Tooling Preferences

- **Runtime**: Node.js (ESM — all `package.json` files use `"type": "module"`)
- **Package manager**: npm (`package-lock.json` present)
- **Bundler**: Vite 6.x (dev server + production build)
- **No TypeScript** — pure JavaScript with `.js` extensions
- **No linter/formatter configured** — no `.eslintrc`, `.prettierrc`, or similar
- **No test framework** — `test-sandbox.mjs` is a standalone Puppeteer script, not wired to a runner

## Testing & QA

- **Smoke test**: `test-sandbox.mjs` launches headless Chromium with SwiftShader (software WebGL), navigates to `localhost:5173`, waits 4 seconds, captures a screenshot to `/tmp/sandbox-final.png`, and reports console errors/warnings.
- **Prerequisite**: The Vite dev server must be running (`npm run dev`) before executing the smoke test.
- **Browser automation deps** are installed at the project root (not inside `sandbox-world/`).
- **No unit tests, no coverage tooling, no CI pipeline** exist as of the current state.
