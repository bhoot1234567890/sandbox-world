import { PlaneGeometry, MeshStandardMaterial, Mesh, Color, BufferAttribute, Vector3 } from 'three';
import { fbm } from '../utils/noise.js';
import { BIOME } from '../utils/colors.js';

const SIZE = 200;
const SEGMENTS = 199;
const WATER_LEVEL = 2;

let terrainMesh = null;
let heightData = null;

function getTerrainHeight(x, z) {
  const nx = (x + SIZE / 2) / SIZE;
  const nz = (z + SIZE / 2) / SIZE;
  const n = fbm(nx * 4, nz * 4, 3, 2, 0.5);
  const detail = fbm(nx * 12, nz * 12, 2, 2, 0.3) * 0.15;
  return (n + detail) * 18;
}

// Smooth biome color with noise-based blending at boundaries
function biomeColor(h, nx, nz) {
  const blendNoise = fbm(nx * 8, nz * 8, 2, 2, 0.5);
  const blend = (blendNoise * 0.5 + 0.5) * 2.0; // 0..2 offset

  const tmp = new Color();

  if (h < WATER_LEVEL - 3) {
    tmp.copy(BIOME.deepWater);
  } else if (h < WATER_LEVEL - 1) {
    const t = (h - (WATER_LEVEL - 3)) / 2;
    tmp.copy(BIOME.deepWater).lerp(BIOME.sand, t * 0.5 + blend * 0.05);
  } else if (h < WATER_LEVEL + 0.5) {
    const t = (h - (WATER_LEVEL - 1)) / 1.5;
    tmp.copy(BIOME.sand).lerp(BIOME.grass, t);
    // Sand patches via noise
    if (blendNoise > 0.2 && h < WATER_LEVEL) {
      tmp.lerp(BIOME.sand, 0.5);
    }
  } else if (h < 7) {
    const t = (h - (WATER_LEVEL + 0.5)) / (7 - WATER_LEVEL - 0.5);
    tmp.copy(BIOME.grass).lerp(BIOME.grassDark, t);
    // Variation
    tmp.r += blend * 0.02;
    tmp.g += blend * 0.03;
  } else if (h < 11) {
    const t = (h - 7) / 4;
    tmp.copy(BIOME.grassDark).lerp(BIOME.rock, t);
    // Grass patches on slopes
    if (blend > 1.2 && h < 9) {
      tmp.lerp(BIOME.grassDark, 0.4);
    }
  } else if (h < 16) {
    const t = (h - 11) / 5;
    tmp.copy(BIOME.rock).lerp(BIOME.rockDark, t);
  } else {
    const t = Math.min((h - 16) / 3, 1);
    tmp.copy(BIOME.rockDark).lerp(BIOME.snow, t);
    // Snow patches via noise
    if (blend < 0.8 && h < 18) {
      tmp.lerp(BIOME.rockDark, 0.4);
    }
  }

  return tmp;
}

export function createTerrain(scene) {
  const geo = new PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  heightData = new Float32Array(pos.count);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = getTerrainHeight(x, z);
    pos.setY(i, h);
    heightData[i] = h;
  }

  // Vertex colors with smooth biome blending
  const colors = new Float32Array(pos.count * 3);
  const tmpColor = new Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightData[i];
    const nx = (x + SIZE / 2) / SIZE;
    const nz = (z + SIZE / 2) / SIZE;

    tmpColor.copy(biomeColor(h, nx, nz));

    colors[i * 3]     = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3));

  geo.computeVertexNormals();

  const mat = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.0,
    flatShading: false,
  });

  terrainMesh = new Mesh(geo, mat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  return terrainMesh;
}

export function sampleTerrainHeight(x, z) {
  // Clamp to terrain bounds
  const half = SIZE / 2;
  const cx = Math.max(-half, Math.min(half, x));
  const cz = Math.max(-half, Math.min(half, z));

  const col = ((cx + half) / SIZE) * SEGMENTS;
  const row = ((cz + half) / SIZE) * SEGMENTS;

  const r = Math.floor(row);
  const c = Math.floor(col);

  if (r < 0 || r >= SEGMENTS || c < 0 || c >= SEGMENTS) {
    return getTerrainHeight(cx, cz);
  }

  const idx00 = r * (SEGMENTS + 1) + c;
  const idx10 = idx00 + 1;
  const idx01 = idx00 + (SEGMENTS + 1);
  const idx11 = idx01 + 1;

  const fx = col - c;
  const fz = row - r;

  const h00 = heightData[idx00] || 0;
  const h10 = heightData[idx10] || 0;
  const h01 = heightData[idx01] || 0;
  const h11 = heightData[idx11] || 0;

  const h0 = h00 * (1 - fx) + h10 * fx;
  const h1 = h01 * (1 - fx) + h11 * fx;

  return h0 * (1 - fz) + h1 * fz;
}

export const WATER_LEVEL_EXPORT = WATER_LEVEL;
export const TERRAIN_SIZE = SIZE;
