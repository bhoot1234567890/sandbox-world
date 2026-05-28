import {
  BufferGeometry, Float32BufferAttribute,
  ShaderMaterial, Points, AdditiveBlending
} from 'three';

const PARTICLE_COUNT = 300;
const SPREAD = 80;
const PARTICLE_SPEED = 0.3;

let points;
let positions;
let velocities;
let phases;
let sizes;
let colorMixes;

const particleShader = {
  vertexShader: /* glsl */ `
    attribute float aSize;
    attribute float aPhase;
    attribute float aColorMix;
    uniform float uTime;
    varying float vAlpha;
    varying float vColorMix;
    void main() {
      vAlpha = 0.25 + 0.35 * (0.5 + 0.5 * sin(uTime * 1.2 + aPhase));
      vColorMix = aColorMix;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (220.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    varying float vAlpha;
    varying float vColorMix;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;

      // Soft radial falloff with inner glow
      float glow = 1.0 - smoothstep(0.0, 0.5, d);
      glow = pow(glow, 1.5);

      // Color variation: warm white to soft gold
      vec3 warmWhite = vec3(1.0, 0.97, 0.85);
      vec3 softGold  = vec3(1.0, 0.85, 0.55);
      vec3 paleBlue  = vec3(0.7, 0.85, 1.0);

      vec3 col;
      if (vColorMix < 0.5) {
        col = mix(paleBlue, warmWhite, vColorMix * 2.0);
      } else {
        col = mix(warmWhite, softGold, (vColorMix - 0.5) * 2.0);
      }

      gl_FragColor = vec4(col, glow * vAlpha);
    }
  `,
};

export function createParticles(scene) {
  positions  = new Float32Array(PARTICLE_COUNT * 3);
  velocities = new Float32Array(PARTICLE_COUNT * 3);
  phases     = new Float32Array(PARTICLE_COUNT);
  sizes      = new Float32Array(PARTICLE_COUNT);
  colorMixes = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    positions[i3]     = (Math.random() - 0.5) * SPREAD;
    positions[i3 + 1] = Math.random() * 20 + 2;
    positions[i3 + 2] = (Math.random() - 0.5) * SPREAD;

    velocities[i3]     = (Math.random() - 0.5) * PARTICLE_SPEED * 0.3;
    velocities[i3 + 1] = Math.random() * PARTICLE_SPEED * 0.1;
    velocities[i3 + 2] = (Math.random() - 0.5) * PARTICLE_SPEED * 0.3;

    phases[i] = Math.random() * Math.PI * 2;
    sizes[i] = 2 + Math.random() * 4;
    colorMixes[i] = Math.random();
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position',  new Float32BufferAttribute(positions, 3));
  geo.setAttribute('aSize',     new Float32BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase',    new Float32BufferAttribute(phases, 1));
  geo.setAttribute('aColorMix', new Float32BufferAttribute(colorMixes, 1));

  const mat = new ShaderMaterial({
    vertexShader:   particleShader.vertexShader,
    fragmentShader: particleShader.fragmentShader,
    uniforms: {
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  points = new Points(geo, mat);
  scene.add(points);
}

export function updateParticles(time, delta, playerPos) {
  if (!points) return;

  points.material.uniforms.uTime.value = time;
  const posAttr = points.geometry.attributes.position;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;

    // Gentle drift
    positions[i3]     += velocities[i3]     * delta;
    positions[i3 + 1] += velocities[i3 + 1] * delta + Math.sin(time * 0.5 + phases[i]) * 0.005;
    positions[i3 + 2] += velocities[i3 + 2] * delta;

    posAttr.setXYZ(i, positions[i3], positions[i3 + 1], positions[i3 + 2]);

    // Recycle particles that drift too far from player
    const dx = positions[i3]     - playerPos.x;
    const dz = positions[i3 + 2] - playerPos.z;
    const dist2 = dx * dx + dz * dz;
    if (dist2 > (SPREAD * 0.6) * (SPREAD * 0.6)) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * SPREAD * 0.4;
      positions[i3]     = playerPos.x + Math.cos(angle) * r;
      positions[i3 + 1] = Math.random() * 20 + 2;
      positions[i3 + 2] = playerPos.z + Math.sin(angle) * r;
    }
  }

  posAttr.needsUpdate = true;
}
