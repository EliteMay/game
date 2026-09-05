import * as THREE from 'three';
import { HOME_POSITION } from './home-system.js';

const HOME = { x: HOME_POSITION.x, z: HOME_POSITION.z, width: 10, depth: 9 };

function mat(color, roughness = 0.82, metalness = 0.22, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

function addBox(parent, size, material, position, entity = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (entity) mesh.userData.entity = entity;
  parent.add(mesh);
  return mesh;
}

function collider(x, z, w, d, id) {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, homeColliderId: id };
}

function registerInteractive(world, root, action, label) {
  root.userData.entity = { kind: 'home', action, label };
  world.interactives.push(root);
}

export function installHomeWorld(world) {
  if (!world || world.homeController) return world?.homeController || null;
  const group = new THREE.Group();
  group.name = 'player-home';
  world.scene.add(group);

  const wall = mat(0x586260, 0.9, 0.36);
  const frame = mat(0x2a3031, 0.72, 0.68);
  const floorMat = mat(0x5f625b, 0.96, 0.06);
  const fabric = mat(0x5f6f75, 0.94, 0.05);
  const wood = mat(0x6b5742, 0.9, 0.05);
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x1a2729, emissive: 0x4a9ba0, emissiveIntensity: 1.2, roughness: 0.42 });
  const yellow = mat(0xb69637, 0.75, 0.34);

  const path = new THREE.Mesh(new THREE.PlaneGeometry(6, 17), mat(0x686861, 1, 0));
  path.rotation.x = -Math.PI / 2;
  path.position.set(HOME.x, 0.018, 28.5);
  path.receiveShadow = true;
  world.scene.add(path);

  addBox(group, [HOME.width, 0.18, HOME.depth], floorMat, [HOME.x, 0.09, HOME.z]);
  addBox(group, [HOME.width + 0.4, 0.25, HOME.depth + 0.4], frame, [HOME.x, 3.75, HOME.z]);

  const westX = HOME.x - HOME.width / 2;
  const eastX = HOME.x + HOME.width / 2;
  const northZ = HOME.z + HOME.depth / 2;
  const southZ = HOME.z - HOME.depth / 2;
  addBox(group, [0.22, 3.7, HOME.depth], wall, [westX, 1.9, HOME.z]);
  addBox(group, [0.22, 3.7, HOME.depth], wall, [eastX, 1.9, HOME.z]);
  addBox(group, [HOME.width, 3.7, 0.22], wall, [HOME.x, 1.9, northZ]);
  addBox(group, [3.45, 3.7, 0.22], wall, [westX + 1.72, 1.9, southZ]);
  addBox(group, [3.45, 3.7, 0.22], wall, [eastX - 1.72, 1.9, southZ]);
  addBox(group, [3.1, 0.55, 0.24], frame, [HOME.x, 3.43, southZ]);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(HOME.x - 1.45, 0, southZ);
  group.add(doorPivot);
  const door = addBox(doorPivot, [2.9, 3.35, 0.16], mat(0x414a49, 0.88, 0.45), [1.45, 1.68, 0]);
  addBox(doorPivot, [0.18, 0.18, 0.12], yellow, [2.5, 1.65, -0.12]);
  registerInteractive(world, door, 'door', 'Home Door');

  const bed = new THREE.Group();
  bed.position.set(HOME.x - 2.65, 0, HOME.z + 1.6);
  addBox(bed, [3.2, 0.55, 1.55], frame, [0, 0.36, 0]);
  addBox(bed, [2.95, 0.42, 1.42], fabric, [0, 0.82, 0]);
  addBox(bed, [0.82, 0.25, 1.15], mat(0xb9b5a3, 0.98, 0), [-1.0, 1.04, 0]);
  group.add(bed);
  registerInteractive(world, bed, 'bed', 'Bed');

  const desk = new THREE.Group();
  desk.position.set(HOME.x + 2.3, 0, HOME.z + 1.35);
  addBox(desk, [3.5, 0.18, 1.35], wood, [0, 1.05, 0]);
  for (const x of [-1.45, 1.45]) addBox(desk, [0.16, 1.05, 0.16], frame, [x, 0.53, 0]);
  const monitor = addBox(desk, [1.85, 1.1, 0.12], screenMat, [0, 1.82, -0.25]);
  addBox(desk, [0.16, 0.72, 0.16], frame, [0, 1.38, -0.18]);
  group.add(desk);
  registerInteractive(world, monitor, 'pc', 'Player Management PC');

  const storage = new THREE.Group();
  storage.position.set(HOME.x + 3.05, 0, HOME.z - 1.65);
  addBox(storage, [2.2, 2.4, 1.35], mat(0x4e5855, 0.9, 0.5), [0, 1.2, 0]);
  for (const y of [0.55, 1.25, 1.95]) addBox(storage, [1.75, 0.1, 1.42], frame, [0, y, 0]);
  group.add(storage);
  registerInteractive(world, storage, 'storage', 'Home Storage');

  const bench = new THREE.Group();
  bench.position.set(HOME.x - 1.0, 0, HOME.z - 1.95);
  addBox(bench, [3.7, 0.22, 1.25], wood, [0, 1.05, 0]);
  for (const x of [-1.55, 1.55]) addBox(bench, [0.18, 1.0, 0.18], frame, [x, 0.52, 0]);
  addBox(bench, [0.7, 0.18, 0.35], yellow, [-0.75, 1.27, 0]);
  addBox(bench, [0.38, 0.42, 0.3], mat(0x345d52, 0.75, 0.3), [0.45, 1.32, 0]);
  group.add(bench);
  registerInteractive(world, bench, 'workbench', 'Exploration Workbench');

  const lamp = new THREE.PointLight(0xf0d79d, 1.25, 12, 2);
  lamp.position.set(HOME.x, 3.2, HOME.z);
  group.add(lamp);

  const baseColliders = [
    collider(westX, HOME.z, 0.28, HOME.depth, 'home-west'),
    collider(eastX, HOME.z, 0.28, HOME.depth, 'home-east'),
    collider(HOME.x, northZ, HOME.width, 0.28, 'home-north'),
    collider(westX + 1.72, southZ, 3.45, 0.28, 'home-south-left'),
    collider(eastX - 1.72, southZ, 3.45, 0.28, 'home-south-right'),
    collider(HOME.x - 2.65, HOME.z + 1.6, 3.25, 1.6, 'home-bed'),
    collider(HOME.x + 2.3, HOME.z + 1.35, 3.55, 1.4, 'home-desk'),
    collider(HOME.x + 3.05, HOME.z - 1.65, 2.25, 1.4, 'home-storage'),
    collider(HOME.x - 1.0, HOME.z - 1.95, 3.75, 1.3, 'home-bench'),
  ];
  world.staticColliders.push(...baseColliders);

  const doorCollider = collider(HOME.x, southZ, 2.9, 0.28, 'home-door');
  world.staticColliders.push(doorCollider);

  let doorOpen = false;
  let doorAmount = 0;
  let targetDoorAmount = 0;

  function removeDoorCollider() {
    world.staticColliders = world.staticColliders.filter((entry) => entry.homeColliderId !== 'home-door');
  }
  function addDoorCollider() {
    if (!world.staticColliders.some((entry) => entry.homeColliderId === 'home-door')) world.staticColliders.push(doorCollider);
  }

  const controller = {
    group,
    get doorOpen() { return doorOpen; },
    toggleDoor() {
      doorOpen = !doorOpen;
      targetDoorAmount = doorOpen ? 1 : 0;
      if (doorOpen) removeDoorCollider();
      return doorOpen;
    },
    update(delta) {
      const speed = Math.min(1, Math.max(0, delta * 4.8));
      doorAmount = THREE.MathUtils.lerp(doorAmount, targetDoorAmount, speed);
      doorPivot.rotation.y = -Math.PI * 0.5 * doorAmount;
      if (!doorOpen && Math.abs(doorAmount) < 0.04) addDoorCollider();
    },
    containsPlayer(player) {
      return player && Math.abs(player.x - HOME.x) < HOME.width / 2 - 0.25 && Math.abs(player.z - HOME.z) < HOME.depth / 2 - 0.25;
    },
    dispose() {
      world.scene.remove(group);
      world.scene.remove(path);
      world.staticColliders = world.staticColliders.filter((entry) => !entry.homeColliderId);
      world.interactives = world.interactives.filter((entry) => entry !== door && entry !== bed && entry !== monitor && entry !== storage && entry !== bench);
    },
  };
  world.homeController = controller;
  return controller;
}

export function pulseWorldScanner(world, profile) {
  if (!world || !profile?.unlocked) return [];
  const origin = new THREE.Vector3(world.player.x, 0, world.player.z);
  const candidates = [];
  for (const mesh of world.scrapMeshes?.values?.() || []) {
    const p = mesh.position.clone();
    const distance = p.distanceTo(origin);
    if (distance > profile.radius) continue;
    const itemId = mesh.userData?.entity?.itemId || null;
    const tracked = profile.trackedItemId && profile.trackedItemId === itemId;
    const rare = ['e_waste'].includes(itemId);
    candidates.push({ mesh, distance, itemId, tracked, rare });
  }
  candidates.sort((a, b) => Number(b.tracked) - Number(a.tracked) || a.distance - b.distance);
  const selected = candidates.slice(0, profile.maxTargets);
  for (const entry of selected) {
    const color = entry.tracked ? 0x69d4ff : (profile.rareDetection && entry.rare ? 0xd7a7ff : 0xe5c65a);
    const helper = new THREE.BoxHelper(entry.mesh, color);
    helper.userData.scannerFx = true;
    world.scene.add(helper);
    window.setTimeout(() => {
      world.scene.remove(helper);
      helper.geometry?.dispose?.();
      helper.material?.dispose?.();
    }, profile.durationMs);
  }
  return selected;
}
