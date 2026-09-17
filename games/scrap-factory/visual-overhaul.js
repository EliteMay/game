import * as THREE from 'three';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/geometries/RoundedBoxGeometry.js';

const OPTIONAL_DETAIL_TAG = 'sfVisualOptionalDetail';
const STRUCTURAL_TAG = 'sfVisualStructuralShell';
const SMOOTH_TAG = 'sfVisualSmoothed';
const DECORATED_TAG = 'sfVisualDecorated';
const HIDDEN_LEGACY_TAG = 'sfVisualLegacyHidden';

function material(color, {
  metalness = 0.5,
  roughness = 0.6,
  emissive = 0x000000,
  emissiveIntensity = 0,
  preview = false,
} = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    emissive,
    emissiveIntensity,
    transparent: preview,
    opacity: preview ? 0.48 : 1,
    depthWrite: !preview,
  });
}

function roundedGeometry(size, radius = null) {
  const [width, height, depth] = size;
  const minSide = Math.min(width, height, depth);
  const resolvedRadius = Math.min(radius ?? minSide * 0.28, minSide * 0.44, 0.34);
  return new RoundedBoxGeometry(width, height, depth, 3, Math.max(0.03, resolvedRadius));
}

function addRounded(parent, size, mat, position = [0, 0, 0], rotation = [0, 0, 0], radius = null) {
  const mesh = new THREE.Mesh(roundedGeometry(size, radius), mat);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radiusTop, radiusBottom, height, mat, position = [0, 0, 0], rotation = [0, 0, 0], segments = 32) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, false), mat);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addTorus(parent, radius, tube, mat, position = [0, 0, 0], rotation = [0, 0, 0], arc = Math.PI * 2) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 14, 40, arc), mat);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addDome(parent, radius, scale, mat, position = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 18), mat);
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addTube(parent, points, radius, mat, tubularSegments = 36) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, tubularSegments, radius, 14, false), mat);
  parent.add(mesh);
  return mesh;
}

function markMeshes(root, { castShadow = true, receiveShadow = true } = {}) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = castShadow;
    node.receiveShadow = receiveShadow;
    node.userData[SMOOTH_TAG] = true;
  });
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
  const { width, height, depth } = geometry.parameters || {};
  if (![width, height, depth].every(Number.isFinite)) return;

  const minSide = Math.min(width, height, depth);
  const maxSide = Math.max(width, height, depth);
  if (minSide < 0.14 || maxSide / Math.max(minSide, 0.001) > 28) return;

  const radius = Math.min(0.34, minSide * 0.32);
  if (geometry.type === 'RoundedBoxGeometry' && Number(geometry.parameters?.radius || 0) >= radius * 0.92) return;
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
    32,
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
  if ((p.radialSegments || 8) >= 14 && (p.tubularSegments || 24) >= 40) return;
  mesh.geometry = new THREE.TorusGeometry(
    p.radius,
    p.tube,
    Math.max(14, p.radialSegments || 8),
    Math.max(40, p.tubularSegments || 24),
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

function boxDimensions(node) {
  const geometry = node?.geometry;
  if (!geometry || !['BoxGeometry', 'RoundedBoxGeometry'].includes(geometry.type)) return null;
  const p = geometry.parameters || {};
  const dims = [Number(p.width), Number(p.height), Number(p.depth)];
  return dims.every(Number.isFinite) ? dims : null;
}

function hideLegacyShell(root, type) {
  const key = String(type || '').toLowerCase();
  root.traverse((node) => {
    if (!node.isMesh || node.userData?.[STRUCTURAL_TAG] || node.userData?.[OPTIONAL_DETAIL_TAG]) return;
    const dims = boxDimensions(node);
    if (!dims) return;
    const [w, h, d] = dims;
    const largeDimensions = dims.filter((value) => value >= 0.9).length;
    let hide = false;

    if (key.includes('seller')) {
      hide = w >= 1.45 && d >= 1.1 && h >= 0.16;
    } else if (key.includes('crusher')) {
      hide = w >= 1.55 && d >= 1.35 && h >= 0.2;
    } else if (key === 'storage' || key.includes('industrial_storage')) {
      hide = largeDimensions >= 2;
    } else if (key.includes('assembler') || key.includes('fabricator')) {
      hide = dims.filter((value) => value >= 0.75).length >= 2;
    }

    if (hide) {
      node.visible = false;
      node.userData[HIDDEN_LEGACY_TAG] = true;
    }
  });
}

function palette(preview) {
  return {
    frame: material(0x222a2d, { metalness: 0.78, roughness: 0.44, preview }),
    dark: material(0x151b1e, { metalness: 0.68, roughness: 0.48, preview }),
    body: material(0x52666a, { metalness: 0.46, roughness: 0.52, preview }),
    bodyWarm: material(0x765847, { metalness: 0.42, roughness: 0.56, preview }),
    accent: material(0xd2aa3f, { metalness: 0.34, roughness: 0.4, preview }),
    copper: material(0xa66b49, { metalness: 0.75, roughness: 0.34, preview }),
    rubber: material(0x171c1e, { metalness: 0.03, roughness: 0.96, preview }),
    screen: material(0x5e9199, {
      metalness: 0.18,
      roughness: 0.28,
      emissive: 0x244f56,
      emissiveIntensity: 1.1,
      preview,
    }),
  };
}

function createShellRoot(root, preview) {
  const shell = new THREE.Group();
  shell.name = 'SF_VISUAL_STRUCTURAL_SHELL';
  shell.userData[STRUCTURAL_TAG] = true;
  shell.userData.preview = preview;
  root.add(shell);
  return shell;
}

function createDetailRoot(root) {
  const details = new THREE.Group();
  details.name = 'SF_VISUAL_OPTIONAL_DETAIL';
  details.userData[OPTIONAL_DETAIL_TAG] = true;
  root.add(details);
  return details;
}

function shellConveyor(shell, details, m) {
  for (const x of [-0.95, -0.48, 0, 0.48, 0.95]) {
    addCylinder(shell, 0.085, 0.085, 0.9, m.dark, [x, 0.51, 0], [Math.PI / 2, 0, 0]);
  }
  for (const z of [-0.56, 0.56]) addRounded(shell, [2.25, 0.16, 0.13], m.frame, [0, 0.58, z], [0, 0, 0], 0.06);
  for (const x of [-0.96, 0.96]) {
    addTorus(details, 0.18, 0.035, m.accent, [x, 0.51, -0.48], [Math.PI / 2, 0, 0]);
  }
}

function shellHopper(shell, details, m) {
  addCylinder(shell, 1.03, 0.43, 1.25, m.body, [0, 1.27, 0], [0, 0, 0], 32);
  addTorus(shell, 1.03, 0.085, m.accent, [0, 1.89, 0], [Math.PI / 2, 0, 0]);
  addCylinder(shell, 0.43, 0.43, 0.36, m.dark, [0, 0.48, 0]);
  for (const [x, z] of [[-0.72, -0.72], [-0.72, 0.72], [0.72, -0.72], [0.72, 0.72]]) {
    addCylinder(details, 0.065, 0.085, 1.12, m.frame, [x, 0.62, z]);
  }
  addTube(details, [[0.7, 0.55, 0.08], [1.02, 0.72, 0.08], [1.16, 1.05, 0.08]], 0.085, m.copper, 20);
}

function shellSeller(shell, details, m) {
  const body = addCylinder(shell, 0.72, 0.86, 1.52, m.bodyWarm, [0, 1.06, 0], [0, 0, 0], 32);
  body.scale.z = 0.82;
  addDome(shell, 0.74, [1.08, 0.46, 0.88], m.bodyWarm, [0, 1.83, 0]);
  addTorus(shell, 0.77, 0.07, m.accent, [0, 1.73, 0], [Math.PI / 2, 0, 0]);
  addRounded(shell, [1.18, 0.58, 0.10], m.screen, [0, 1.34, -0.7], [-0.08, 0, 0], 0.08);
  addCylinder(shell, 0.58, 0.68, 0.18, m.frame, [0, 0.22, 0]);
  for (const x of [-0.66, 0.66]) {
    addCylinder(details, 0.075, 0.105, 1.2, m.accent, [x, 0.66, -0.76]);
    addDome(details, 0.14, [1, 0.6, 1], m.accent, [x, 1.27, -0.76]);
  }
}

function shellCrusher(shell, details, m) {
  addCylinder(shell, 0.88, 0.98, 0.54, m.frame, [0, 0.42, 0], [0, 0, 0], 32);
  for (const x of [-0.48, 0.48]) {
    addCylinder(shell, 0.5, 0.5, 1.5, m.dark, [x, 1.18, 0], [Math.PI / 2, 0, 0], 32);
    addTorus(shell, 0.39, 0.055, m.accent, [x, 1.18, -0.77], [Math.PI / 2, 0, 0]);
  }
  addCylinder(shell, 0.82, 0.52, 0.72, m.bodyWarm, [0, 1.92, 0.05], [0, 0, 0], 32);
  addTorus(shell, 0.8, 0.06, m.frame, [0, 2.27, 0.05], [Math.PI / 2, 0, 0]);
  addTube(details, [[0.88, 0.9, 0.46], [1.15, 1.28, 0.5], [1.0, 1.78, 0.42]], 0.09, m.copper, 22);
  addCylinder(details, 0.38, 0.38, 0.68, m.copper, [0.98, 1.15, 0.45], [0, 0, Math.PI / 2]);
}

function shellSmelter(shell, details, m) {
  addCylinder(shell, 1.0, 1.08, 1.8, m.bodyWarm, [0, 1.05, 0], [0, 0, 0], 32);
  addDome(shell, 0.98, [1, 0.48, 1], m.bodyWarm, [0, 1.96, 0]);
  for (const y of [0.5, 1.18, 1.75]) addTorus(shell, 1.02, 0.055, m.frame, [0, y, 0], [Math.PI / 2, 0, 0]);
  addCylinder(shell, 0.31, 0.36, 1.8, m.dark, [0.55, 2.62, 0.16]);
  addCylinder(shell, 0.46, 0.31, 0.42, m.dark, [0.55, 3.73, 0.16]);
  addTube(details, [[-0.88, 0.7, 0.2], [-1.16, 1.0, 0.2], [-1.08, 1.68, 0.18]], 0.095, m.copper, 22);
}

function shellStorage(shell, details, m) {
  for (const x of [-0.56, 0.56]) {
    addCylinder(shell, 0.47, 0.5, 1.58, m.body, [x, 0.98, 0]);
    addDome(shell, 0.47, [1, 0.5, 1], m.body, [x, 1.78, 0]);
    addDome(shell, 0.46, [1, 0.28, 1], m.dark, [x, 0.18, 0]);
    addTorus(shell, 0.49, 0.045, m.accent, [x, 1.28, 0], [Math.PI / 2, 0, 0]);
  }
  addTube(shell, [[-0.56, 1.88, 0], [0, 2.15, 0], [0.56, 1.88, 0]], 0.075, m.frame, 22);
  addRounded(details, [1.28, 0.42, 0.08], m.screen, [0, 0.93, -0.53], [0, 0, 0], 0.07);
}

function shellAssembler(shell, details, m) {
  const core = addCylinder(shell, 0.72, 0.78, 1.5, m.body, [0, 1.08, 0], [0, 0, Math.PI / 2], 32);
  core.scale.z = 0.9;
  addDome(shell, 0.72, [0.48, 0.9, 0.9], m.body, [-0.75, 1.08, 0]);
  addDome(shell, 0.72, [0.48, 0.9, 0.9], m.body, [0.75, 1.08, 0]);
  for (const x of [-0.72, 0.72]) {
    addCylinder(shell, 0.3, 0.3, 0.52, m.dark, [x, 1.0, -0.66], [Math.PI / 2, 0, 0]);
    addTorus(shell, 0.31, 0.045, m.accent, [x, 1.0, -0.92], [Math.PI / 2, 0, 0]);
  }
  addTube(details, [[-0.68, 1.72, 0.42], [0, 2.22, 0.58], [0.68, 1.72, 0.42]], 0.075, m.copper, 24);
  addRounded(details, [0.9, 0.32, 0.08], m.screen, [0, 1.45, -0.75], [0, 0, 0], 0.06);
}

function shellPower(shell, details, m) {
  addCylinder(shell, 0.58, 0.64, 1.45, m.dark, [0, 1.02, 0], [Math.PI / 2, 0, 0]);
  addTorus(shell, 0.58, 0.07, m.copper, [0, 1.02, -0.74], [Math.PI / 2, 0, 0]);
  for (const x of [-0.7, 0.7]) {
    addCylinder(details, 0.12, 0.16, 1.7, m.frame, [x, 1.55, 0.42]);
    addDome(details, 0.18, [1, 0.7, 1], m.frame, [x, 2.42, 0.42]);
  }
}

function shellAutomation(shell, details, m) {
  addCylinder(shell, 0.82, 0.92, 0.58, m.frame, [0, 0.52, 0]);
  addDome(shell, 0.76, [1, 0.35, 1], m.body, [0, 0.88, 0]);
  addTorus(shell, 0.7, 0.065, m.screen, [0, 1.52, 0], [Math.PI / 2, 0, 0]);
  addCylinder(details, 0.08, 0.1, 1.0, m.frame, [0, 1.02, 0]);
}

function shellGeneric(shell, details, m) {
  addCylinder(shell, 0.78, 0.88, 1.35, m.body, [0, 0.9, 0]);
  addDome(shell, 0.77, [1, 0.4, 1], m.body, [0, 1.58, 0]);
  addRounded(details, [1.1, 0.3, 0.08], m.screen, [0, 1.12, -0.78], [0, 0, 0], 0.06);
}

function decorateBuilding(root, type, preview = false) {
  if (!root || root.userData?.[DECORATED_TAG]) return;
  root.userData[DECORATED_TAG] = true;

  restyleTree(root);
  hideLegacyShell(root, type);

  const m = palette(preview);
  const shell = createShellRoot(root, preview);
  const details = createDetailRoot(root);
  const key = String(type || '').toLowerCase();

  if (key === 'conveyor' || key.includes('conveyor')) shellConveyor(shell, details, m);
  else if (key === 'hopper' || key.includes('hopper')) shellHopper(shell, details, m);
  else if (key === 'seller' || key.includes('seller')) shellSeller(shell, details, m);
  else if (key === 'crusher' || key.includes('crusher')) shellCrusher(shell, details, m);
  else if (key === 'smelter' || key.includes('smelter') || key.includes('furnace')) shellSmelter(shell, details, m);
  else if (key === 'storage' || key.includes('industrial_storage') || key.includes('warehouse')) shellStorage(shell, details, m);
  else if (key.includes('assembler') || key.includes('fabricator')) shellAssembler(shell, details, m);
  else if (key.includes('generator') || key.includes('power') || key.includes('battery')) shellPower(shell, details, m);
  else if (key.includes('drone')) shellAutomation(shell, details, m);
  else shellGeneric(shell, details, m);

  markMeshes(shell, { castShadow: !preview, receiveShadow: !preview });
  markMeshes(details, { castShadow: !preview, receiveShadow: !preview });
}

function addWorldAccents(scene) {
  if (scene.userData?.sfVisualWorldAccents) return;
  scene.userData.sfVisualWorldAccents = true;

  const group = new THREE.Group();
  group.name = 'SF_VISUAL_WORLD_ACCENTS';
  group.userData[OPTIONAL_DETAIL_TAG] = true;

  const steel = material(0x344044, { metalness: 0.72, roughness: 0.46 });
  const copper = material(0x91634c, { metalness: 0.74, roughness: 0.36 });
  const lamp = material(0xe0e6df, { metalness: 0.08, roughness: 0.28, emissive: 0xffd88c, emissiveIntensity: 1.6 });

  addTube(group, [[23, 5.65, -6], [23, 7.15, 0], [23, 5.65, 6]], 0.12, steel, 44);
  addTube(group, [[23.28, 5.46, -6], [23.28, 6.8, 0], [23.28, 5.46, 6]], 0.065, copper, 44);
  for (const z of [-4, 0, 4]) addDome(group, 0.14, [1, 0.7, 1], lamp, [22.87, 6.35 - Math.abs(z) * 0.04, z]);

  addTube(group, [[-16, 4.7, -19.4], [-8, 5.2, -19.4], [0, 5.3, -19.4], [8, 5.15, -19.4], [16, 4.65, -19.4]], 0.1, steel, 50);
  addTube(group, [[-16, 4.45, -19.68], [-8, 4.85, -19.68], [0, 4.95, -19.68], [8, 4.8, -19.68], [16, 4.4, -19.68]], 0.06, copper, 50);

  markMeshes(group);
  scene.add(group);
}

function setOptionalDetailVisibility(scene, quality) {
  const visible = quality !== 'low';
  scene.traverse((node) => {
    if (node.userData?.[OPTIONAL_DETAIL_TAG]) node.visible = visible;
  });
}

function install() {
  const runtime = window.__scrapFactoryRuntime;
  const world = runtime?.world;
  if (!world?.scene || world.__sfVisualOverhaulInstalled) return false;
  world.__sfVisualOverhaulInstalled = true;

  restyleTree(world.scene);
  for (const root of world.buildingMeshes?.values?.() || []) {
    const type = root.userData?.entity?.type;
    if (type) decorateBuilding(root, type, false);
  }
  addWorldAccents(world.scene);

  const originalSceneAdd = world.scene.add.bind(world.scene);
  world.scene.add = (...objects) => {
    const result = originalSceneAdd(...objects);
    queueMicrotask(() => {
      for (const object of objects) {
        if (object?.userData?.[OPTIONAL_DETAIL_TAG] || object?.userData?.[STRUCTURAL_TAG]) continue;
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
      if (world.buildPreview) decorateBuilding(world.buildPreview, type, true);
      return result;
    };
  }

  if (typeof world.setQuality === 'function') {
    const originalSetQuality = world.setQuality.bind(world);
    world.setQuality = (quality) => {
      const result = originalSetQuality(quality);
      setOptionalDetailVisibility(world.scene, quality);
      return result;
    };
  }

  setOptionalDetailVisibility(world.scene, runtime.getGame?.()?.settings?.quality || 'high');
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
