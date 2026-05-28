import { sampleTerrainHeight, WATER_LEVEL_EXPORT } from '../world/terrain.js';

const GRAVITY = -30;
const PLAYER_HEIGHT = 1.8;

let velocityY = 0;
let isGrounded = false;

export function applyPhysics(position, delta, jumping) {
  if (jumping && isGrounded) {
    velocityY = 10;
    isGrounded = false;
  }

  velocityY += GRAVITY * delta;
  position.y += velocityY * delta;

  const groundY = sampleTerrainHeight(position.x, position.z) + PLAYER_HEIGHT;
  const waterY = WATER_LEVEL_EXPORT + PLAYER_HEIGHT;

  const floor = Math.max(groundY, waterY);

  if (position.y <= floor) {
    position.y = floor;
    velocityY = 0;
    isGrounded = true;
  }
}

export function isOnGround() {
  return isGrounded;
}
