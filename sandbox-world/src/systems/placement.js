import {
  Raycaster, Vector2, Vector3, MeshStandardMaterial,
  BoxGeometry, SphereGeometry, ConeGeometry, CylinderGeometry,
  Mesh, Group, IcosahedronGeometry
} from 'three';
import { sampleTerrainHeight, WATER_LEVEL_EXPORT } from '../world/terrain.js';
import { addPlacedObject, removeNearestObject } from '../world/vegetation.js';

const raycaster = new Raycaster();
const screenCenter = new Vector2(0, 0);

const PLACEABLE_TYPES = ['tree', 'rock', 'house', 'lamp', 'fence'];
const TYPE_LABELS = ['Tree', 'Rock', 'House', 'Lamp', 'Fence'];

let currentIndex = -1;
let ghostMesh = null;
let cameraRef = null;
let sceneRef = null;

const PLACEABLE_COLORS = {
  tree: 0x2E7D32,
  rock: 0x9E9E9E,
  house: 0xD7CCC8,
  lamp: 0xFFD54F,
  fence: 0x8D6E63,
};

function createGhostMesh(type) {
  let geo, mat;

  switch (type) {
    case 'tree': {
      const g = new Group();
      const trunk = new Mesh(new CylinderGeometry(0.15, 0.25, 2, 6), new MeshStandardMaterial({ color: 0x5D4037, flatShading: true, transparent: true, opacity: 0.5 }));
      trunk.position.y = 1;
      g.add(trunk);
      const leaves = new Mesh(new ConeGeometry(1.2, 2.5, 6), new MeshStandardMaterial({ color: 0x2E7D32, flatShading: true, transparent: true, opacity: 0.5 }));
      leaves.position.y = 3;
      g.add(leaves);
      return g;
    }
    case 'rock':
      return new Mesh(
        new IcosahedronGeometry(0.8, 1),
        new MeshStandardMaterial({ color: 0x9E9E9E, flatShading: true, transparent: true, opacity: 0.5 })
      );
    case 'house': {
      const g = new Group();
      const body = new Mesh(new BoxGeometry(3, 2.5, 3), new MeshStandardMaterial({ color: 0xD7CCC8, flatShading: true, transparent: true, opacity: 0.5 }));
      body.position.y = 1.25;
      g.add(body);
      const roof = new Mesh(new ConeGeometry(2.5, 1.5, 4), new MeshStandardMaterial({ color: 0xA1887F, flatShading: true, transparent: true, opacity: 0.5 }));
      roof.position.y = 3.25;
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      return g;
    }
    case 'lamp': {
      const g = new Group();
      const pole = new Mesh(new CylinderGeometry(0.05, 0.08, 3, 6), new MeshStandardMaterial({ color: 0x424242, flatShading: true, transparent: true, opacity: 0.5 }));
      pole.position.y = 1.5;
      g.add(pole);
      const bulb = new Mesh(new SphereGeometry(0.3, 8, 6), new MeshStandardMaterial({ color: 0xFFD54F, flatShading: true, emissive: 0xFFD54F, emissiveIntensity: 0.5, transparent: true, opacity: 0.5 }));
      bulb.position.y = 3.2;
      g.add(bulb);
      return g;
    }
    case 'fence': {
      const g = new Group();
      for (let i = -1; i <= 1; i++) {
        const post = new Mesh(new BoxGeometry(0.1, 1.2, 0.1), new MeshStandardMaterial({ color: 0x8D6E63, flatShading: true, transparent: true, opacity: 0.5 }));
        post.position.set(i * 0.5, 0.6, 0);
        g.add(post);
      }
      const rail = new Mesh(new BoxGeometry(1.2, 0.08, 0.06), new MeshStandardMaterial({ color: 0x8D6E63, flatShading: true, transparent: true, opacity: 0.5 }));
      rail.position.y = 0.9;
      g.add(rail);
      const rail2 = rail.clone();
      rail2.position.y = 0.5;
      g.add(rail2);
      return g;
    }
  }
}

function createSolidObject(type) {
  switch (type) {
    case 'tree': {
      const g = new Group();
      const trunk = new Mesh(new CylinderGeometry(0.15, 0.25, 2, 6), new MeshStandardMaterial({ color: 0x5D4037, flatShading: true }));
      trunk.castShadow = true;
      trunk.position.y = 1;
      g.add(trunk);
      const leaves = new Mesh(new ConeGeometry(1.2, 2.5, 6), new MeshStandardMaterial({ color: 0x2E7D32, flatShading: true }));
      leaves.castShadow = true;
      leaves.position.y = 3;
      g.add(leaves);
      return g;
    }
    case 'rock': {
      const m = new Mesh(
        new IcosahedronGeometry(0.8, 1),
        new MeshStandardMaterial({ color: 0x9E9E9E, flatShading: true })
      );
      m.castShadow = true;
      return m;
    }
    case 'house': {
      const g = new Group();
      const body = new Mesh(new BoxGeometry(3, 2.5, 3), new MeshStandardMaterial({ color: 0xD7CCC8, flatShading: true }));
      body.castShadow = true;
      body.receiveShadow = true;
      body.position.y = 1.25;
      g.add(body);
      const roof = new Mesh(new ConeGeometry(2.5, 1.5, 4), new MeshStandardMaterial({ color: 0xA1887F, flatShading: true }));
      roof.castShadow = true;
      roof.position.y = 3.25;
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      // Door
      const door = new Mesh(new BoxGeometry(0.6, 1.2, 0.1), new MeshStandardMaterial({ color: 0x5D4037, flatShading: true }));
      door.position.set(0, 0.6, 1.55);
      g.add(door);
      return g;
    }
    case 'lamp': {
      const g = new Group();
      const pole = new Mesh(new CylinderGeometry(0.05, 0.08, 3, 6), new MeshStandardMaterial({ color: 0x424242, flatShading: true }));
      pole.castShadow = true;
      pole.position.y = 1.5;
      g.add(pole);
      const bulb = new Mesh(new SphereGeometry(0.3, 8, 6), new MeshStandardMaterial({ color: 0xFFD54F, flatShading: true, emissive: 0xFFD54F, emissiveIntensity: 1 }));
      bulb.position.y = 3.2;
      g.add(bulb);
      return g;
    }
    case 'fence': {
      const g = new Group();
      for (let i = -1; i <= 1; i++) {
        const post = new Mesh(new BoxGeometry(0.1, 1.2, 0.1), new MeshStandardMaterial({ color: 0x8D6E63, flatShading: true }));
        post.castShadow = true;
        post.position.set(i * 0.5, 0.6, 0);
        g.add(post);
      }
      const rail = new Mesh(new BoxGeometry(1.2, 0.08, 0.06), new MeshStandardMaterial({ color: 0x8D6E63, flatShading: true }));
      rail.position.y = 0.9;
      g.add(rail);
      const rail2 = rail.clone();
      rail2.position.y = 0.5;
      g.add(rail2);
      return g;
    }
  }
}

export function initPlacement(camera, scene) {
  cameraRef = camera;
  sceneRef = scene;
}

export function updatePlacement(player, mouse1Down, rightClick, numberKeys) {
  if (numberKeys >= 0) {
    const newIdx = numberKeys;
    if (newIdx === currentIndex) {
      // Toggle off
      currentIndex = -1;
      if (ghostMesh) {
        sceneRef.remove(ghostMesh);
        ghostMesh = null;
      }
    } else {
      currentIndex = newIdx;
      if (ghostMesh) sceneRef.remove(ghostMesh);
      ghostMesh = createGhostMesh(PLACEABLE_TYPES[currentIndex]);
      sceneRef.add(ghostMesh);
    }
    updateBuildModeUI();
  }

  // Position ghost at terrain
  if (ghostMesh && currentIndex >= 0) {
    // Cast ray forward from player
    const dir = new Vector3();
    cameraRef.getWorldDirection(dir);
    dir.y = -0.3;
    dir.normalize();
    raycaster.set(cameraRef.position, dir);

    // Simple: place in front of player on terrain
    const placePos = new Vector3(
      player.position.x - Math.sin(player.rotation.y) * 5,
      0,
      player.position.z - Math.cos(player.rotation.y) * 5
    );
    const h = sampleTerrainHeight(placePos.x, placePos.z);
    placePos.y = Math.max(h, WATER_LEVEL_EXPORT);
    ghostMesh.position.copy(placePos);

    // Place on click
    if (mouse1Down) {
      const obj = createSolidObject(PLACEABLE_TYPES[currentIndex]);
      obj.position.copy(placePos);
      sceneRef.add(obj);
      addPlacedObject(obj);
    }
  }

  // Remove on right click
  if (rightClick) {
    const removed = removeNearestObject(player.position, 8);
    if (removed) {
      sceneRef.remove(removed);
    }
  }
}

function updateBuildModeUI() {
  const el = document.getElementById('build-type');
  if (el) {
    el.textContent = currentIndex >= 0 ? TYPE_LABELS[currentIndex] : 'None';
  }
}

export function getBuildIndex() { return currentIndex; }
