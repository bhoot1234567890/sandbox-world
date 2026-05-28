import { Vector3 } from 'three';
import { getMouseDelta, consumeScrollDelta, isKeyDown } from '../systems/input.js';

const _target     = new Vector3();
const _desiredPos = new Vector3();
const _lookTarget = new Vector3();

// Spring-damped position tracking
const _velocity = new Vector3();
const _lookVelocity = new Vector3();

let yaw = 0;
let pitch = 0.3;
let distance = 12;
let targetDistance = 12;

const SENSITIVITY = 0.003;
const MIN_DIST = 4;
const MAX_DIST = 30;

// Spring constants — lower = softer, higher = snappier
const SPRING_STIFFNESS = 12;
const SPRING_DAMPING   = 6;
const LOOK_STIFFNESS   = 18;
const LOOK_DAMPING     = 8;

let initialized = false;

// Smooth damp helper (critically damped spring)
function smoothDamp(current, target, velocity, stiffness, damping, dt) {
  const springForce = (target - current) * stiffness;
  const dampForce   = -velocity * damping;
  velocity += (springForce + dampForce) * dt;
  return { value: current + velocity * dt, velocity };
}

export function updateCamera(camera, player, delta) {
  const { dx, dy } = getMouseDelta();
  yaw   -= dx * SENSITIVITY;
  pitch += dy * SENSITIVITY;
  pitch  = Math.max(-0.5, Math.min(1.2, pitch));

  const scroll = consumeScrollDelta();
  targetDistance += scroll * 0.01;
  targetDistance  = Math.max(MIN_DIST, Math.min(MAX_DIST, targetDistance));

  // Look-at target: slightly above player head
  _target.copy(player.position);
  _target.y += 1.5;

  // Desired camera position from orbit
  _desiredPos.set(
    _target.x + distance * Math.sin(yaw) * Math.cos(pitch),
    _target.y + distance * Math.sin(pitch),
    _target.z + distance * Math.cos(yaw) * Math.cos(pitch)
  );

  if (!initialized) {
    camera.position.copy(_desiredPos);
    _lookTarget.copy(_target);
    distance = targetDistance;
    initialized = true;
  } else {
    // Smooth damped zoom
    distance += (targetDistance - distance) * Math.min(1, 8 * delta);

    // Spring-damped position following
    const sp = smoothDamp(camera.position.x, _desiredPos.x, _velocity.x, SPRING_STIFFNESS, SPRING_DAMPING, delta);
    camera.position.x = sp.value; _velocity.x = sp.velocity;
    const sy = smoothDamp(camera.position.y, _desiredPos.y, _velocity.y, SPRING_STIFFNESS, SPRING_DAMPING, delta);
    camera.position.y = sy.value; _velocity.y = sy.velocity;
    const sz = smoothDamp(camera.position.z, _desiredPos.z, _velocity.z, SPRING_STIFFNESS, SPRING_DAMPING, delta);
    camera.position.z = sz.value; _velocity.z = sz.velocity;

    // Spring-damped look target
    const lx = smoothDamp(_lookTarget.x, _target.x, _lookVelocity.x, LOOK_STIFFNESS, LOOK_DAMPING, delta);
    _lookTarget.x = lx.value; _lookVelocity.x = lx.velocity;
    const ly = smoothDamp(_lookTarget.y, _target.y, _lookVelocity.y, LOOK_STIFFNESS, LOOK_DAMPING, delta);
    _lookTarget.y = ly.value; _lookVelocity.y = ly.velocity;
    const lz = smoothDamp(_lookTarget.z, _target.z, _lookVelocity.z, LOOK_STIFFNESS, LOOK_DAMPING, delta);
    _lookTarget.z = lz.value; _lookVelocity.z = lz.velocity;
  }

  // Subtle camera sway when moving
  const moving = isKeyDown('KeyW') || isKeyDown('KeyA') || isKeyDown('KeyS') || isKeyDown('KeyD');
  if (moving) {
    const time = performance.now() * 0.001;
    const swayX = Math.sin(time * 4.5) * 0.03;
    const swayY = Math.sin(time * 9.0) * 0.015;
    camera.position.x += swayX;
    camera.position.y += swayY;
  }

  camera.lookAt(_lookTarget);
}

export function getYaw() { return yaw; }
