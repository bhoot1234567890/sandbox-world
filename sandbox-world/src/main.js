import { WebGLRenderer, Scene, PerspectiveCamera, Clock } from 'three';
import { createTerrain } from './world/terrain.js';
import { createVegetation } from './world/vegetation.js';
import { createWater, updateWater } from './world/water.js';
import { createSky, updateSky, getSunDirection } from './world/sky.js';
import { createCharacter } from './player/character.js';
import { updateMovement } from './player/movement.js';
import { updateCamera, getYaw } from './player/camera.js';
import { initInput, isKeyDown, isMouseDown, consumeRightClick } from './systems/input.js';
import { initPlacement, updatePlacement } from './systems/placement.js';
import { initHUD, updateHUD } from './ui/hud.js';
import { getPlacedObjects } from './world/vegetation.js';
import { initPostProcessing, renderPostProcessing, resizePostProcessing } from './systems/postprocessing.js';
import { createParticles, updateParticles } from './systems/particles.js';

// Renderer
const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = 2; // PCFSoftShadowMap
renderer.toneMapping = 6; // AgXToneMapping — more cinematic, less washed-out whites
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

// Scene
const scene = new Scene();

// Camera
const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);

// Clock
const clock = new Clock();

// Systems
initInput(renderer.domElement);
initHUD();

// World
createTerrain(scene);
createVegetation(scene);
createWater(scene);
createSky(scene);

// Player
const player = createCharacter();
player.position.set(0, 5, 0);
scene.add(player);

// Placement
initPlacement(camera, scene);

// Post-processing
const composer = initPostProcessing(renderer, scene, camera);

// Particles
createParticles(scene);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  resizePostProcessing(window.innerWidth, window.innerHeight);
});

// Number key tracking
let lastNumberKey = -1;
const numberKeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];

// Game loop
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05); // Cap to avoid physics explosions
  const elapsed = clock.elapsedTime;

  // Track number key presses
  let numKey = -1;
  for (let i = 0; i < numberKeys.length; i++) {
    if (isKeyDown(numberKeys[i])) {
      numKey = i;
      break;
    }
  }
  const numberKeyThisFrame = (numKey !== -1 && numKey !== lastNumberKey) ? numKey : -1;
  lastNumberKey = numKey !== -1 ? numKey : lastNumberKey;

  // Update
  updateMovement(player, getYaw(), delta);
  updateCamera(camera, player, delta);
  updateSky(scene, elapsed);
  updateWater(elapsed, getSunDirection());
  updateParticles(elapsed, delta, player.position);
  updatePlacement(player, isMouseDown(), consumeRightClick(), numberKeyThisFrame);
  updateHUD(player, getPlacedObjects());

  // Render
  if (!renderPostProcessing()) {
    renderer.render(scene, camera);
  }
}

animate();
