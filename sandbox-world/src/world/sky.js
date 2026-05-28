import {
  HemisphereLight, DirectionalLight, Color, Fog, Vector3,
  ShaderMaterial, Mesh, SphereGeometry, BackSide
} from 'three';

// Sky gradient palette
const DAY_ZENITH     = new Color(0x4A90D9);
const DAY_HORIZON    = new Color(0xC8E4F4);
const SUNSET_ZENITH  = new Color(0x2A1B5E);
const SUNSET_HORIZON = new Color(0xFF6B35);
const NIGHT_ZENITH   = new Color(0x060A14);
const NIGHT_HORIZON  = new Color(0x101830);

const DAY_SUN_COLOR    = new Color(0xFFF8E8);
const SUNSET_SUN_COLOR = new Color(0xFF5500);
const NIGHT_SUN_COLOR  = new Color(0x223366);

const CYCLE_DURATION = 60;

let ambient, sun;
let skyDome;
let fog;
let skyUniforms;

// Temp colors — reused every frame
const _zenith  = new Color();
const _horizon = new Color();
const _sunCol  = new Color();

const skyVertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = /* glsl */ `
  uniform vec3 uZenithColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uSunIntensity;

  varying vec3 vDirection;

  void main() {
    vec3 dir = normalize(vDirection);
    float y = dir.y;

    // Gradient from horizon to zenith
    float t = pow(max(y, 0.0), 0.45);
    vec3 sky = mix(uHorizonColor, uZenithColor, t);

    // Below horizon — fade to dark ground
    if (y < 0.0) {
      sky = mix(uHorizonColor * 0.5, uHorizonColor, 1.0 + y);
    }

    // Sun disc + glow + atmospheric scatter
    vec3 sunDir = normalize(uSunDirection);
    float sunAngle = max(dot(dir, sunDir), 0.0);

    float sunDisc   = smoothstep(0.9975, 0.9998, sunAngle) * uSunIntensity;
    float sunGlow   = pow(sunAngle, 10.0) * 0.5 * uSunIntensity;
    float scatter   = pow(sunAngle, 3.0) * 0.2 * uSunIntensity;

    sky += uSunColor * (sunDisc + sunGlow + scatter);

    // Horizon haze for depth
    float haze = pow(1.0 - abs(y), 12.0);
    sky = mix(sky, uHorizonColor * 1.05, haze * 0.25);

    gl_FragColor = vec4(sky, 1.0);
  }
`;

export function createSky(scene) {
  const skyGeo = new SphereGeometry(300, 32, 32);

  skyUniforms = {
    uZenithColor:   { value: DAY_ZENITH.clone() },
    uHorizonColor:  { value: DAY_HORIZON.clone() },
    uSunColor:      { value: DAY_SUN_COLOR.clone() },
    uSunDirection:  { value: new Vector3(0.5, 0.8, 0.3).normalize() },
    uSunIntensity:  { value: 1.0 },
  };

  const skyMat = new ShaderMaterial({
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    uniforms: skyUniforms,
    side: BackSide,
    depthWrite: false,
  });

  skyDome = new Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  // Hemisphere ambient: sky color above, warm ground below
  ambient = new HemisphereLight(0x87CEEB, 0x8B6914, 0.6);
  scene.add(ambient);

  // Main directional (sun) light with shadows
  sun = new DirectionalLight(0xFFF4E0, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left   = -100;
  sun.shadow.camera.right  =  100;
  sun.shadow.camera.top    =  100;
  sun.shadow.camera.bottom = -100;
  sun.shadow.camera.near   = 0.5;
  sun.shadow.camera.far    = 300;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  // Soft fill from opposite side — reduces harsh shadow contrast
  const fill = new DirectionalLight(0xB0C8E0, 0.3);
  fill.position.set(-50, 40, -30);
  scene.add(fill);

  // Cool rim light — adds depth separation on silhouettes
  const rim = new DirectionalLight(0x6080B0, 0.15);
  rim.position.set(30, 15, -60);
  scene.add(rim);

  // Exponential fog for softer falloff
  fog = new Fog(DAY_HORIZON.clone(), 50, 200);
  scene.fog = fog;
}

export function updateSky(scene, time) {
  const t = (time % CYCLE_DURATION) / CYCLE_DURATION;
  const angle = t * Math.PI * 2;
  const sunY = Math.sin(angle);
  const sunX = Math.cos(angle);

  const sunPos = new Vector3(sunX * 100, sunY * 100, 50);
  sun.position.copy(sunPos);
  sun.target.position.set(0, 0, 0);

  // Update sky shader uniforms
  skyUniforms.uSunDirection.value.copy(sunPos).normalize();

  let sunIntensity, ambientIntensity;

  if (sunY > 0.2) {
    // Full day
    _zenith.copy(DAY_ZENITH);
    _horizon.copy(DAY_HORIZON);
    _sunCol.copy(DAY_SUN_COLOR);
    sunIntensity = 1.6;
    ambientIntensity = 0.6;
  } else if (sunY > -0.1) {
    // Sunset / sunrise transition
    const f = (sunY + 0.1) / 0.3;
    const ff = f * f * (3 - 2 * f); // smoothstep
    _zenith.copy(NIGHT_ZENITH).lerp(DAY_ZENITH, ff);
    _horizon.copy(NIGHT_HORIZON).lerp(SUNSET_HORIZON, ff < 0.5 ? ff * 2 : 1.0);
    if (ff >= 0.5) _horizon.lerp(DAY_HORIZON, (ff - 0.5) * 2);
    _sunCol.copy(SUNSET_SUN_COLOR).lerp(DAY_SUN_COLOR, ff);
    sunIntensity = 0.2 + ff * 1.4;
    ambientIntensity = 0.15 + ff * 0.45;
  } else {
    // Night
    _zenith.copy(NIGHT_ZENITH);
    _horizon.copy(NIGHT_HORIZON);
    _sunCol.copy(NIGHT_SUN_COLOR);
    sunIntensity = 0.05;
    ambientIntensity = 0.15;
  }

  skyUniforms.uZenithColor.value.copy(_zenith);
  skyUniforms.uHorizonColor.value.copy(_horizon);
  skyUniforms.uSunColor.value.copy(_sunCol);
  skyUniforms.uSunIntensity.value = sunIntensity > 0.3 ? 1.0 : sunIntensity;

  sun.color.copy(_sunCol);
  sun.intensity = sunIntensity;
  ambient.color.copy(_zenith);
  ambient.groundColor.set(0x8B6914);
  ambient.intensity = ambientIntensity;

  // Fog follows horizon color
  fog.color.copy(_horizon);
}

const _sunDir = new Vector3();
export function getSunDirection() {
  if (sun) {
    _sunDir.copy(sun.position).normalize();
  }
  return _sunDir;
}
