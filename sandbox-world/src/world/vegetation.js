import {
  InstancedMesh, CylinderGeometry, ConeGeometry, SphereGeometry,
  IcosahedronGeometry, BufferGeometry, Float32BufferAttribute,
  Matrix4, Vector3, Euler, Quaternion, MeshStandardMaterial, DoubleSide
} from 'three';
import { sampleTerrainHeight, WATER_LEVEL_EXPORT, TERRAIN_SIZE } from './terrain.js';
import { TREE_TRUNK, TREE_LEAVES, ROCK_COLOR } from '../utils/colors.js';

const _mat4 = new Matrix4();
const _pos = new Vector3();
const _euler = new Euler();
const _quat = new Quaternion();
const _scale = new Vector3();

let placedObjects = [];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createVegetation(scene) {
  const rand = seededRandom(42);
  const half = TERRAIN_SIZE / 2 - 5;

  createTrees(scene, rand, half);
  createRocks(scene, rand, half);
  createGrass(scene, rand, half);
}

function createTrees(scene, rand, half) {
  const trunkGeo = new CylinderGeometry(0.15, 0.25, 2, 6);
  const leavesGeo = new ConeGeometry(1.2, 2.5, 6);
  const trunkMat = new MeshStandardMaterial({ color: TREE_TRUNK, flatShading: true });
  const leavesMat = new MeshStandardMaterial({ color: TREE_LEAVES, flatShading: true });

  const trunkMesh = new InstancedMesh(trunkGeo, trunkMat, 150);
  const leavesMesh = new InstancedMesh(leavesGeo, leavesMat, 150);
  trunkMesh.castShadow = true;
  leavesMesh.castShadow = true;

  let count = 0;
  for (let i = 0; i < 2000 && count < 150; i++) {
    const x = (rand() - 0.5) * half * 2;
    const z = (rand() - 0.5) * half * 2;
    const h = sampleTerrainHeight(x, z);
    if (h < WATER_LEVEL_EXPORT + 1 || h > 14) continue;

    const scale = 0.7 + rand() * 0.8;
    const rotation = rand() * Math.PI * 2;

    _euler.set(0, rotation, 0);
    _quat.setFromEuler(_euler);
    _scale.set(scale, scale, scale);

    _pos.set(x, h + 1 * scale, z);
    _mat4.compose(_pos, _quat, _scale);
    trunkMesh.setMatrixAt(count, _mat4);

    _pos.set(x, h + 2.5 * scale, z);
    _mat4.compose(_pos, _quat, _scale);
    leavesMesh.setMatrixAt(count, _mat4);

    count++;
  }
  trunkMesh.instanceMatrix.needsUpdate = true;
  leavesMesh.instanceMatrix.needsUpdate = true;
  trunkMesh.count = count;
  leavesMesh.count = count;

  scene.add(trunkMesh);
  scene.add(leavesMesh);
}

function createRocks(scene, rand, half) {
  const rockGeo = new IcosahedronGeometry(0.6, 1);
  const rockMat = new MeshStandardMaterial({ color: ROCK_COLOR, flatShading: true });
  const rockMesh = new InstancedMesh(rockGeo, rockMat, 80);
  rockMesh.castShadow = true;

  let count = 0;
  for (let i = 0; i < 1000 && count < 80; i++) {
    const x = (rand() - 0.5) * half * 2;
    const z = (rand() - 0.5) * half * 2;
    const h = sampleTerrainHeight(x, z);
    if (h < WATER_LEVEL_EXPORT) continue;

    const s = 0.5 + rand() * 1.5;
    _pos.set(x, h + s * 0.3, z);
    _euler.set(rand() * 0.3, rand() * Math.PI * 2, rand() * 0.3);
    _quat.setFromEuler(_euler);
    _scale.set(s, s * 0.7, s);
    _mat4.compose(_pos, _quat, _scale);
    rockMesh.setMatrixAt(count, _mat4);
    count++;
  }
  rockMesh.instanceMatrix.needsUpdate = true;
  rockMesh.count = count;
  scene.add(rockMesh);
}

function createGrass(scene, rand, half) {
  const bladeGeo = new BufferGeometry();
  const vertices = new Float32Array([
    -0.1, 0, 0,
     0.1, 0, 0,
     0, 0.4, 0,
  ]);
  bladeGeo.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  bladeGeo.computeVertexNormals();

  const grassMat = new MeshStandardMaterial({
    color: 0x66BB6A,
    flatShading: true,
    side: DoubleSide,
  });

  const grassMesh = new InstancedMesh(bladeGeo, grassMat, 400);
  let count = 0;
  for (let i = 0; i < 3000 && count < 400; i++) {
    const x = (rand() - 0.5) * half * 2;
    const z = (rand() - 0.5) * half * 2;
    const h = sampleTerrainHeight(x, z);
    if (h < WATER_LEVEL_EXPORT + 0.5 || h > 8) continue;

    const s = 0.5 + rand() * 1;
    _pos.set(x, h, z);
    _euler.set(0, rand() * Math.PI * 2, 0);
    _quat.setFromEuler(_euler);
    _scale.set(s, s, s);
    _mat4.compose(_pos, _quat, _scale);
    grassMesh.setMatrixAt(count, _mat4);
    count++;
  }
  grassMesh.instanceMatrix.needsUpdate = true;
  grassMesh.count = count;
  scene.add(grassMesh);
}

export function addPlacedObject(obj) {
  placedObjects.push(obj);
}

export function removeNearestObject(position, radius) {
  let minDist = radius;
  let idx = -1;
  for (let i = 0; i < placedObjects.length; i++) {
    const d = placedObjects[i].position.distanceTo(position);
    if (d < minDist) {
      minDist = d;
      idx = i;
    }
  }
  if (idx >= 0) {
    return placedObjects.splice(idx, 1)[0];
  }
  return null;
}

export function getPlacedObjects() {
  return placedObjects;
}
