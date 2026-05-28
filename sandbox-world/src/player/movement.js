import { Vector3, MathUtils } from 'three';
import { isKeyDown } from '../systems/input.js';
import { applyPhysics, isOnGround } from '../systems/physics.js';

const WALK_SPEED = 10;
const SPRINT_SPEED = 18;
const ROTATION_LERP = 10;

const _forward = new Vector3();
const _right   = new Vector3();
const _moveDir = new Vector3();

let walkPhase = 0;
let currentRotation = 0;
let bodyBobOffset = 0;

export function updateMovement(player, cameraAngle, delta) {
  const speed = isKeyDown('ShiftLeft') ? SPRINT_SPEED : WALK_SPEED;
  const moving  = isKeyDown('KeyW') || isKeyDown('KeyA') || isKeyDown('KeyS') || isKeyDown('KeyD');
  const jumping = isKeyDown('Space') && isOnGround();

  _forward.set(-Math.sin(cameraAngle), 0, -Math.cos(cameraAngle));
  _right.set(-_forward.z, 0, _forward.x);

  _moveDir.set(0, 0, 0);
  if (isKeyDown('KeyW')) _moveDir.add(_forward);
  if (isKeyDown('KeyS')) _moveDir.sub(_forward);
  if (isKeyDown('KeyA')) _moveDir.sub(_right);
  if (isKeyDown('KeyD')) _moveDir.add(_right);

  if (_moveDir.lengthSq() > 0) {
    _moveDir.normalize();
    player.position.x += _moveDir.x * speed * delta;
    player.position.z += _moveDir.z * speed * delta;

    // Smooth rotation to face movement direction (single lerp with angle wrap)
    const targetRotation = Math.atan2(_moveDir.x, _moveDir.z);
    let diff = targetRotation - currentRotation;
    while (diff > Math.PI)  diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    currentRotation += diff * Math.min(1, ROTATION_LERP * delta);
    player.rotation.y = currentRotation;
  }

  applyPhysics(player.position, delta, jumping);

  // Animate limbs and body
  if (moving && isOnGround()) {
    const speedFactor = speed / WALK_SPEED;
    walkPhase += delta * speedFactor * 8;

    const swing = Math.sin(walkPhase) * (0.5 + speedFactor * 0.15);
    player.userData.leftLeg.rotation.x  =  swing;
    player.userData.rightLeg.rotation.x = -swing;
    player.userData.leftArm.rotation.x  = -swing;
    player.userData.rightArm.rotation.x =  swing;

    // Body bob — subtle vertical oscillation synced to walk
    const newBob = Math.sin(walkPhase * 2) * 0.05 * speedFactor;
    player.position.y += newBob - bodyBobOffset;
    bodyBobOffset = newBob;

    // Subtle arm sway on Z axis for natural feel
    player.userData.leftArm.rotation.z  =  Math.sin(walkPhase) * 0.08;
    player.userData.rightArm.rotation.z = -Math.sin(walkPhase) * 0.08;
  } else {
    // Smooth return to idle
    walkPhase += delta * 2;
    const decay = 1 - Math.pow(0.001, delta); // Frame-rate independent decay
    player.userData.leftLeg.rotation.x  *= (1 - decay);
    player.userData.rightLeg.rotation.x *= (1 - decay);
    player.userData.leftArm.rotation.x  *= (1 - decay);
    player.userData.rightArm.rotation.x *= (1 - decay);
    player.userData.leftArm.rotation.z  *= (1 - decay);
    player.userData.rightArm.rotation.z *= (1 - decay);

    // Gentle idle breathing bob
    const newBob = Math.sin(walkPhase) * 0.015;
    player.position.y += newBob - bodyBobOffset;
    bodyBobOffset = newBob;
  }
}
