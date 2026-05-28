import { TERRAIN_SIZE, WATER_LEVEL_EXPORT } from '../world/terrain.js';

const MINIMAP_SIZE = 150;
let ctx;
let lastTime = performance.now();
let frameCount = 0;
let fpsDisplay = 60;

export function initHUD() {
  const canvas = document.getElementById('minimap');
  if (canvas) {
    ctx = canvas.getContext('2d');
  }
}

export function updateHUD(player, placedObjects) {
  // FPS counter
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 500) {
    fpsDisplay = Math.round(frameCount / ((now - lastTime) / 1000));
    frameCount = 0;
    lastTime = now;
    const el = document.getElementById('fps');
    if (el) el.textContent = `FPS: ${fpsDisplay}`;
  }

  // Minimap
  if (!ctx) return;

  const half = TERRAIN_SIZE / 2;
  ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

  // Background
  ctx.fillStyle = '#1a3a2a';
  ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

  // Water area (center circle)
  ctx.fillStyle = 'rgba(30, 136, 229, 0.3)';
  ctx.beginPath();
  ctx.arc(MINIMAP_SIZE / 2, MINIMAP_SIZE / 2, MINIMAP_SIZE * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Placed objects as dots
  if (placedObjects) {
    ctx.fillStyle = '#FFD54F';
    for (const obj of placedObjects) {
      const mx = ((obj.position.x + half) / TERRAIN_SIZE) * MINIMAP_SIZE;
      const mz = ((obj.position.z + half) / TERRAIN_SIZE) * MINIMAP_SIZE;
      ctx.beginPath();
      ctx.arc(mx, mz, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Player position
  const px = ((player.position.x + half) / TERRAIN_SIZE) * MINIMAP_SIZE;
  const pz = ((player.position.z + half) / TERRAIN_SIZE) * MINIMAP_SIZE;

  ctx.fillStyle = '#4FC3F7';
  ctx.beginPath();
  ctx.arc(px, pz, 4, 0, Math.PI * 2);
  ctx.fill();

  // Player direction arrow
  ctx.strokeStyle = '#4FC3F7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, pz);
  const dirX = px - Math.sin(player.rotation.y) * 10;
  const dirZ = pz - Math.cos(player.rotation.y) * 10;
  ctx.lineTo(dirX, dirZ);
  ctx.stroke();
}
