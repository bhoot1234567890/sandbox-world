import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

export function fbm(x, z, octaves = 3, lacunarity = 2, persistence = 0.5) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency, z * frequency) * amplitude;
    max += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value / max;
}
