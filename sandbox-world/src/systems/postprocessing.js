import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const ColorGradingShader = {
  name: 'ColorGradingShader',
  uniforms: {
    tDiffuse:    { value: null },
    warmth:      { value: 0.06 },
    contrast:    { value: 1.08 },
    saturation:  { value: 1.10 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float warmth;
    uniform float contrast;
    uniform float saturation;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // Warmth: subtle red boost, blue shift down
      texel.r += warmth;
      texel.b -= warmth * 0.4;

      // Contrast around mid-gray
      texel.rgb = (texel.rgb - 0.5) * contrast + 0.5;

      // Saturation boost
      float luma = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
      texel.rgb = mix(vec3(luma), texel.rgb, saturation);

      // Subtle lift in shadows for cinematic feel
      texel.rgb = pow(texel.rgb, vec3(0.97));

      texel.rgb = clamp(texel.rgb, 0.0, 1.0);
      gl_FragColor = texel;
    }
  `,
};

const VignetteShader = {
  name: 'VignetteShader',
  uniforms: {
    tDiffuse: { value: null },
    offset:   { value: 1.0 },
    darkness: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 center = vUv - 0.5;
      float dist = length(center);
      // Smooth vignette falloff
      float vignette = smoothstep(offset, offset - 0.5, dist);
      texel.rgb *= mix(1.0, vignette, darkness * 0.5);
      gl_FragColor = texel;
    }
  `,
};

let composer;

export function initPostProcessing(renderer, scene, camera) {
  // Skip on mobile for performance
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  if (isMobile) return null;

  composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    { x: window.innerWidth, y: window.innerHeight },
    0.35,  // strength — subtle glow on highlights
    0.6,   // radius — moderate spread
    0.75   // threshold — catch only bright areas
  );
  composer.addPass(bloomPass);

  const colorGradingPass = new ShaderPass(ColorGradingShader);
  composer.addPass(colorGradingPass);

  const vignettePass = new ShaderPass(VignetteShader);
  vignettePass.uniforms.offset.value  = 1.0;
  vignettePass.uniforms.darkness.value = 0.7;
  composer.addPass(vignettePass);

  return composer;
}

export function renderPostProcessing() {
  if (composer) {
    composer.render();
    return true;
  }
  return false;
}

export function resizePostProcessing(width, height) {
  if (composer) {
    composer.setSize(width, height);
  }
}
