import { PlaneGeometry, ShaderMaterial, Mesh, DoubleSide, Vector3 } from 'three';
import { WATER_LEVEL_EXPORT, TERRAIN_SIZE } from './terrain.js';

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  // Multi-octave wave function
  float waveHeight(float x, float z, float t) {
    float h = 0.0;
    h += sin(x * 0.4 + t * 1.2) * 0.18;
    h += sin(z * 0.6 + t * 0.9) * 0.12;
    h += sin((x + z) * 0.25 + t * 0.6) * 0.22;
    h += sin(x * 1.1 - t * 0.7) * 0.06;
    h += sin(z * 1.8 + t * 1.4) * 0.04;
    h += sin((x * 0.7 - z * 0.5) * 0.8 + t * 0.5) * 0.08;
    return h;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    float h = waveHeight(pos.x, pos.y, uTime);
    pos.z += h;
    vElevation = h;
    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

    // Analytical normal from wave partial derivatives
    float eps = 0.1;
    float hx = waveHeight(pos.x + eps, pos.y, uTime);
    float hz = waveHeight(pos.x, pos.y + eps, uTime);
    float dx = (hx - h) / eps;
    float dz = (hz - h) / eps;
    vNormal = normalize(vec3(-dx, 1.0, -dz));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSunDir;
  varying vec2 vUv;
  varying float vElevation;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    vec3 deepColor    = vec3(0.02, 0.10, 0.30);
    vec3 surfaceColor = vec3(0.08, 0.32, 0.55);
    vec3 foamColor    = vec3(0.88, 0.94, 1.0);

    // Depth-based color blend
    float depth = smoothstep(-0.35, 0.35, vElevation);
    vec3 color = mix(deepColor, surfaceColor, depth);

    // Foam on wave crests
    float foam = smoothstep(0.18, 0.40, vElevation);
    color = mix(color, foamColor, foam * 0.30);

    // Fresnel: brighter at grazing angles
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 normal = normalize(vNormal);
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);

    // Subsurface scattering approximation — light passing through wave
    float sss = pow(max(dot(viewDir, -uSunDir), 0.0), 3.0) * max(vElevation + 0.2, 0.0) * 0.6;
    vec3 sssColor = vec3(0.1, 0.5, 0.4);
    color += sssColor * sss;

    // Fresnel blend — tint toward sky reflection
    color = mix(color, color * 1.3 + vec3(0.08, 0.12, 0.18), fresnel);

    // Primary specular — tight sun reflection
    vec3 halfVec = normalize(uSunDir + viewDir);
    float spec1 = pow(max(dot(normal, halfVec), 0.0), 256.0);
    color += vec3(1.0, 0.97, 0.90) * spec1 * 1.0;

    // Secondary specular — broader highlight
    float spec2 = pow(max(dot(normal, halfVec), 0.0), 24.0);
    color += vec3(0.5, 0.7, 0.9) * spec2 * 0.12;

    // Subtle caustics shimmer
    float caustic1 = sin(vWorldPos.x * 3.0 + uTime * 2.0) * sin(vWorldPos.z * 3.0 + uTime * 1.5);
    float caustic2 = sin(vWorldPos.x * 5.0 - uTime * 1.8) * sin(vWorldPos.z * 4.5 + uTime * 2.2);
    float caustics = max(caustic1 + caustic2, 0.0) * 0.04;
    color += vec3(0.6, 0.8, 1.0) * caustics;

    gl_FragColor = vec4(color, 0.82);
  }
`;

let waterMesh;

export function createWater(scene) {
  const geo = new PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 80, 80);
  geo.rotateX(-Math.PI / 2);

  const mat = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime:   { value: 0 },
      uSunDir: { value: new Vector3(0.5, 0.8, 0.3).normalize() },
    },
    transparent: true,
    side: DoubleSide,
    depthWrite: false,
  });

  waterMesh = new Mesh(geo, mat);
  waterMesh.position.y = WATER_LEVEL_EXPORT;
  waterMesh.receiveShadow = false;
  scene.add(waterMesh);
}

export function updateWater(time, sunDir) {
  if (waterMesh) {
    waterMesh.material.uniforms.uTime.value = time;
    if (sunDir) waterMesh.material.uniforms.uSunDir.value.copy(sunDir);
  }
}
