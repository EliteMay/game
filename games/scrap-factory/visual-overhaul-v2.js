import * as THREE from 'three';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/geometries/RoundedBoxGeometry.js';

const DETAIL_TAG = 'sfVisualOverhaulV2Detail';
const SMOOTH_TAG = 'sfVisualOverhaulV2Smoothed';
const DECORATED_TAG = 'sfVisualOverhaulV2Decorated';

function standardMaterial(color, {
  metalness = 0.5,
  roughness = 0.62,
  emissive = null,
  emissiveIntensity = 0,
  preview = false,
} = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    emissive: emissive == null ? 0x000000 : emissive,
    emissiveIntensity,
    transparent: preview,
    opacity: preview ? 0.5 : 1,
    depthWrite: !preview,
  });
}

function roundedGeometry(size, radius = null) {
  const [width, height, depth] = size;
  const minSide = Math.min(width, height, depth);
  const resolved = Math.min(radius ?? minSide * 0.28, minSide * 0.43, 0.32);
  return new RoundedBoxGeometry(width, height, depth, 3, Math.max(0.035, resolved));
}

function addRounded(parent, size, material, position = [0, 0, 0], rotation = [0, 0, 0], radius = null) {
  const mesh = new THREE.Mesh(roundedGeometry(size, radius), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radiusTop, radiusBottom, height, material, position = [0, 0, 0], rotation = [0, 0, 0], segments = 28) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addTorus(parent, radius, tube, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 36), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addDome(parent, radius, scale, material, position = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 14), material);
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addTube(parent, points, radius, material, tubularSegments = 36) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, tubularSegments, radius, 12, false), material);
  parent.add(mesh);
  return mesh;
}

function geometryCenterIsOrigin(geometry) {
  geometry.computeBoundingBox?.();
  const box = geometry.boundingBox;
  if (!box) return true;
  const center = new THREE.Vector3();
  box.getCenter(center);
  return center.lengthSq() < 0.00001;
}

function softenBox(mesh) {
  const geometry = mesh.geometry;
  if (!geometry || !geometryCenterIsOrigin(geometry)) return;
  if (geometry.type !== 'BoxGeometry' && geometry.type !== 'RoundedBoxGeometry') return;
  const p = geometry.parameters || {};
  const width = Number(p.width);
  const height = Number(p.height);
  const depth = Number(p.depth);
  if (![width, height, depth].every(Number.isFinite)) return;

  const minSide = Math.min(width, height, depth);
  const maxSide = Math.max(width, height, depth);
  if (minSide < 0.18 || maxSide / minSide > 22) return;

  const radius = Math.min(0.32, minSide * 0.3);
  if (geometry.type === 'RoundedBoxGeometry' && Number(p.radius || 0) >= radius * 0.92) return;

  mesh.geometry = new RoundedBoxGeometry(width, height, depth, 3, radius);
}

function smoothCylinder(mesh) {
  const geometry = mesh.geometry;
  if (!geometry || geometry.type !== 'CylinderGeometry' || !geometryCenterIsOrigin(geometry)) return;
  const p = geometry.parameters || {};
  const radialSegments = Number(p.radialSegments || 8);
  if (radialSegments >= 28) return;
  mesh.geometry = new THREE.CylinderGeometry(
    p.radiusTop,
    p.radiusBottom,
    p.height,
    28,
    p.heightSegments || 1,
    Boolean(p.openEnded),
    p.thetaStart || 0,
    p.thetaLength ?? Math.PI * 2,
  );
}

function smoothTorus(mesh) {
  const geometry = mesh.geometry;
  if (!geometry || geometry.type !== 'TorusGeometry' || !geometryCenterIsOrigin(geometry)) return;
  const p = geometry.parameters || {};
  if ((p.radialSegments || 8) >= 12 && (p.tubularSegments || 24) >= 36) return;
  mesh.geometry = new THREE.TorusGeometry(
    p.radius,
    p.tube,
    Math.max(12, p.radialSegments || 8),
    Math.max(36, p.tubularSegments || 24),
    p.arc ?? Math.PI * 2,
  );
}

function restyleTree(root) {
  root?.traverse?.((node) => {
    if (!node.isMesh || node.userData?.[SMOOTH_TAG]) return;
    node.userData[SMOOTH_TAG] = true;
    softenBox(node);
    smoothCylinder(node);
    smoothTorus(node);
  });
}

function machinePalette(preview) {
  return {
    frame: standardMaterial(0x20282b, { metalness: 0.76, roughness: 0.46, preview }),
    body: standardMaterial(0x53666a, { metalness: 0.46, roughness: 0.54, preview }),
    dark: standardMaterial(0x151c1f, { metalness: 0.68, roughness: 0.5, preview }),
    accent: standardMaterial(0xd0aa43, { metalness: 0.34, roughness: 0.42, preview }),
    copper: standardMaterial(0xa86f4e, { metalness: 0.72, roughness: 0.36, preview }),
    info: standardMaterial(0x6e9da4, {
      metalness: 0.24,
      roughness: 0.34,
      emissive: 0x29494e,
      emissiveIntensity: 0.8,
      preview,
    }),
  };
}

function decorateConveyor(group, m) {
  for (const x of [-0.95, 0.95]) {
    addCylinder(group, 0.17, 0.17, 1.05, m.dark, [x, 0.52, 0], [Math.PI / 2, 0, 0]);
    addTorus(group, 0.18, 0.035, m.accent, [x, 0.52, -0.54], [Math.PI / 2, 0, 0]);
  }
  addRounded(group, [2.15, 0.18, 0.16], m.body, [0, 0.72, -0.62], [0, 0, 0], 0.07);
  addRounded(group, [2.15, 0.18, 0.16], m.body, [0, 0.72, 0.62], [0, 0, 0], 0.07);
}

function decorateHopper(group, m) {
  addTorus(group, 0.98, 0.085, m.accent, [0, 1.86, 0], [Math.PI / 2, 0, 0]);
  addCylinder(group, 0.5, 0.42, 0.32, m.dark, [0, 0.64, 0]);
  for (const [x, z] of [[-0.72, -0.72], [-0.72, 0.72], [0.72, -0.72], [0.72, 0.72]]) {
    addCylinder(group, 0.075, 0.095, 1.28, m.frame, [x, 0.68, z]);
  }
  addTube(group, [[0.76, 0.65, 0.1], [1.05, 0.78, 0.1], [1.18, 1.08, 0.1]], 0.085, m.copper, 18);
}

function decorateSeller(group, m) {
  addRounded(group, [2.0, 0.48, 1.5], m.frame, [0, 2.04, 0], [0, 0, -0.035], 0.22);
  addRounded(group, [1.35, 0.68, 0.1], m.info, [0, 1.42, -0.7], [-0.08, 0, 0], 0.08);
  for (const x of [-0.72, 0.72]) {
    addCylinder(group, 0.09, 0.12, 1.32, m.accent, [x, 0.72, -0.82]);
    addDome(group, 0.16, [1, 0.6, 1], m.accent, [x, 1.38, -0.82]);
  }
}

function decorateCrusher(group, m) {
  for (const x of [-0.5, 0.5]) {
    addCylinder(group, 0.48, 0.48, 0.18, m.frame, [x, 1.22, -0.88], [Math.PI / 2, 0, 0]);
    addTorus(group, 0.36, 0.06, m.accent, [x, 1.22, -0.99], [Math.PI / 2, 0, 0]);
  }
  addRounded(group, [1.72, 0.36, 1.64], m.body, [0, 1.92, 0.06], [0, 0, 0], 0.17);
  addTube(group, [[0.92, 1.0, 0.48], [1.18, 1.36, 0.5], [0.98, 1.8, 0.42]], 0.09, m.copper, 20);
}

function decorateSmelter(group, m) {
  addDome(group, 1.0, [1, 0.48, 1], m.body, [0, 2.02, 0]);
  addTorus(group, 1.02, 0.065, m.frame, [0, 1.86, 0], [Math.PI / 2, 0, 0]);
  addTube(group, [[-0.92, 0.8, 0.25], [-1.18, 1.15, 0.25], [-1.05, 1.75, 0.18]], 0.095, m.copper, 20);
}

function decorateStorage(group, m) {
  for (const x of [-0.55, 0.55]) {
    addCylinder(group, 0.43, 0.43, 1.65, m.body, [x, 1.02, -0.45]);
    addDome(group, 0.43, [1, 0.55, 1], m.body, [x, 1.86, -0.45]);
    addTorus(group, 0.44, 0.045, m.accent, [x, 1.28, -0.45], [Math.PI / 2, 0, 0]);
  }
  addTube(group, [[-0.55, 1.92, -0.45], [0, 2.18, -0.45], [0.55, 1.92, -0.45]], 0.07, m.frame, 18);
}

function decoratePower(group, m) {
  addCylinder(group, 0.5, 0.58, 1.35, m.dark, [0, 1.0, -0.55], [Math.PI / 2, 0, 0]);
  addTorus(group, 0.54, 0.07, m.copper, [0, 1.0, -1.22], [Math.PI / 2, 0, 0]);
  for (const x of [-0.72, 0.72]) {
    addCylinder(group, 0.12, 0.16, 1.75, m.frame, [x, 1.65, 0.42]);
    addDome(group, 0.19, [1, 0.7, 1], m.frame, [x, 2.54, 0.42]);
  }
}

function decorateAutomation(group, m) {
  addTorus(group, 0.68, 0.07, m.info, [0, 2.15, 0], [Math.PI / 2, 0, 0]);
  addCylinder(group, 0.08, 0.1, 1.1, m.frame, [0, 1.65, 0]);
  addRounded(group, [1.5, 0.28, 1.08], m.body, [0, 0.78, 0], [0, 0, 0], 0.13);
}

function decorateAssembler(group, m) {
  for (const x of [-0.82, 0.82]) {
    addCylinder(group, 0.28, 0.28, 0.55, m.dark, [x, 1.05, -0.62], [Math.PI / 2, 0, 0]);
    addTorus(group, 0.29, 0.045, m.accent, [x, 1.05, -0.9], [Math.PI / 2, 0, 0]);
  }
  addRounded(group, [1.78, 0.38, 1.48], m.body, [0, 1.78, 0], [0, 0, 0], 0.18);
  addTube(group, [[-0.66, 1.9, 0.5], [0, 2.25, 0.62], [0.66, 1.9, 0.5]], 0.065, m.copper, 20);
}

function decorateGeneric(group, m) {
  addRounded(group, [1.7, 0.32, 1.5], m.body, [0, 1.62, 0], [0, 0, 0], 0.16);
  for (const x of [-0.72, 0.72]) addCylinder(group, 0.16, 0.18, 0.8, m.frame, [x, 1.0, -0.72], [Math.PI / 2, 0, 0]);
}

function decorateBuilding(root, type, preview = false) {
  if (!root || root.userData?.[DECORATED_TAG]) return;
  root.userData[DECORATED_TAG] = true;
  const group = new THREE.Group();
  group.name = DETAIL_TAG;
  group.userData[DETAIL_TAG] = true;
  root.add(group);

  const m = machinePalette(preview);
  const key = String(type || '').toLowerCase();

  if (key === 'conveyor' || key.includes('conveyor')) decorateConveyor(group, m);
  else if (key === 'hopper' || key.includes('hopper')) decorateHopper(group, m);
  else if (key === 'seller' || key.includes('seller')) decorateSeller(group, m);
  else if (key === 'crusher' || key.includes('crusher')) decorateCrusher(group, m);
  else if (key === 'smelter' || key.includes('smelter') || key.includes('furnace')) decorateSmelter(group, m);
  else if (key === 'storage' || key.includes('warehouse') || key.includes('storage')) decorateStorage(group, m);
  else if (key.includes('generator') || key.includes('power') || key.includes('battery')) decoratePower(group, m);
  else if (key.includes('drone')) decorateAutomation(group, m);
  else if (key.includes('assembler') || key.includes('fabricator')) decorateAssembler(group, m);
  else decorateGeneric(group, m);

  group.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = !preview;
    node.receiveShadow = !preview;
    node.userData[SMOOTH_TAG] = true;
  });
}

function addWorldAccents(scene) {
  if (scene.userData?.sfVisualOverhaulV2WorldAccents) return;
  scene.userData.sfVisualOverhaulV2WorldAccents = true;

  const group = new THREE.Group();
  group.name = 'SF_VISUAL_OVERHAUL_V2_WORLD';
  group.userData[DETAIL_TAG] = true;

  const steel = standardMaterial(0x364246, { metalness: 0.72, roughness: 0.46 });
  const copper = standardMaterial(0x91664f, { metalness: 0.72, roughness: 0.38 });
  const accent = standardMaterial(0xd0aa43, { metalness: 0.4, roughness: 0.42 });
  const lamp = standardMaterial(0xd8e3de, {
    metalness: 0.1,
    roughness: 0.28,
    emissive: 0xffd889,
    emissiveIntensity: 1.7,
  });

  addTube(group, [[23, 5.65, -6.0], [23, 7.2, 0], [23, 5.65, 6.0]], 0.13, steel, 42);
  addTube(group, [[23.3, 5.45, -6.0], [23.3, 6.85, 0], [23.3, 5.45, 6.0]], 0.065, copper, 42);
  for (const z of [-4.2, 0, 4.2]) addDome(group, 0.14, [1, 0.7, 1], lamp, [22.86, 6.45 - Math.abs(z) * 0.05, z]);

  addTube(group, [[-16, 4.85, -19.3], [-8, 5.35, -19.3], [0, 5.45, -19.3], [8, 5.3, -19.3], [16, 4.8, -19.3]], 0.11, steel, 52);
  addTube(group, [[-16, 4.55, -19.65], [-8, 5.0, -19.65], [0, 5.1, -19.65], [8, 4.95, -19.65], [16, 4.5, -19.65]], 0.07, copper, 52);
  for (const x of [-12, -4, 4, 12]) addTorus(group, 0.18, 0.04, accent, [x, 5.15, -19.3], [Math.PI / 2, 0, 0]);

  group.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.userData[SMOOTH_TAG] = true;
  });
  scene.add(group);
}

function setDetailVisibility(scene, quality) {
  const visible = quality !== 'low';
  scene.traverse((node) => {
    if (node.userData?.[DETAIL_TAG]) node.visible = visible;
  });
}

function install() {
  const runtime = window.__scrapFactoryRuntime;
  const world = runtime?.world;
  if (!world?.scene || world.__sfVisualOverhaulV2Installed) return false;
  world.__sfVisualOverhaulV2Installed = true;

  restyleTree(world.scene);
  for (const root of world.buildingMeshes?.values?.() || []) {
    const type = root.userData?.entity?.type;
    restyleTree(root);
    if (type) decorateBuilding(root, type, false);
  }
  addWorldAccents(world.scene);

  const originalSceneAdd = world.scene.add.bind(world.scene);
  world.scene.add = (...objects) => {
    const result = originalSceneAdd(...objects);
    queueMicrotask(() => {
      for (const object of objects) {
        if (object?.userData?.[DETAIL_TAG]) continue;
        restyleTree(object);
        const entity = object?.userData?.entity;
        if (entity?.kind === 'building' && entity.type) decorateBuilding(object, entity.type, false);
      }
    });
    return result;
  };

  if (typeof world.startBuild === 'function') {
    const originalStartBuild = world.startBuild.bind(world);
    world.startBuild = (type) => {
      const result = originalStartBuild(type);
      if (world.buildPreview) {
        restyleTree(world.buildPreview);
        decorateBuilding(world.buildPreview, type, true);
      }
      return result;
    };
  }

  if (typeof world.setQuality === 'function') {
    const originalSetQuality = world.setQuality.bind(world);
    world.setQuality = (quality) => {
      const result = originalSetQuality(quality);
      setDetailVisibility(world.scene, quality);
      return result;
    };
  }

  const quality = runtime.getGame?.()?.settings?.quality || 'high';
  setDetailVisibility(world.scene, quality);
  return true;
}

let attempts = 0;
function boot() {
  attempts += 1;
  if (install() || attempts > 90) return;
  window.setTimeout(boot, 50);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(() => requestAnimationFrame(boot)), { once: true });
} else {
  requestAnimationFrame(() => requestAnimationFrame(boot));
}
