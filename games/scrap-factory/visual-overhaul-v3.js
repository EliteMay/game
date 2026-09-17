import * as THREE from 'three';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/geometries/RoundedBoxGeometry.js';

const TAG = 'sfVisualOverhaulV3';
const DETAIL = 'sfVisualOverhaulV3Detail';

function material(color, { metalness = 0.5, roughness = 0.5, emissive = 0x000000, emissiveIntensity = 0, preview = false } = {}) {
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

function addMesh(parent, geometry, mat, position = [0, 0, 0], rotation = [0, 0, 0], scale = null) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  if (scale) mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

function addRoundBox(parent, size, mat, position = [0, 0, 0], radius = 0.18, rotation = [0, 0, 0]) {
  const [w, h, d] = size;
  const r = Math.min(radius, Math.min(w, h, d) * 0.45);
  return addMesh(parent, new RoundedBoxGeometry(w, h, d, 4, r), mat, position, rotation);
}

function addCylinder(parent, top, bottom, height, mat, position = [0, 0, 0], rotation = [0, 0, 0], segments = 32) {
  return addMesh(parent, new THREE.CylinderGeometry(top, bottom, height, segments, 1, false), mat, position, rotation);
}

function addTorus(parent, radius, tube, mat, position = [0, 0, 0], rotation = [0, 0, 0]) {
  return addMesh(parent, new THREE.TorusGeometry(radius, tube, 14, 42), mat, position, rotation);
}

function addDome(parent, radius, mat, position = [0, 0, 0], scale = [1, 0.55, 1]) {
  return addMesh(parent, new THREE.SphereGeometry(radius, 32, 18), mat, position, [0, 0, 0], scale);
}

function addTube(parent, points, radius, mat, tubularSegments = 36) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return addMesh(parent, new THREE.TubeGeometry(curve, tubularSegments, radius, 12, false), mat);
}

function palette(preview) {
  return {
    frame: material(0x1a2225, { metalness: 0.82, roughness: 0.38, preview }),
    body: material(0x61747a, { metalness: 0.44, roughness: 0.5, preview }),
    bodyDark: material(0x34464b, { metalness: 0.55, roughness: 0.46, preview }),
    yellow: material(0xd8af42, { metalness: 0.34, roughness: 0.4, preview }),
    copper: material(0xad704d, { metalness: 0.76, roughness: 0.32, preview }),
    rubber: material(0x161b1d, { metalness: 0.03, roughness: 0.92, preview }),
    glass: material(0x608b96, { metalness: 0.16, roughness: 0.22, emissive: 0x18343a, emissiveIntensity: 0.55, preview }),
    hot: material(0x5b3227, { metalness: 0.18, roughness: 0.48, emissive: 0xff5a1f, emissiveIntensity: 1.7, preview }),
  };
}

function deEmphasizeBlockCore(root) {
  root.traverse((node) => {
    if (!node.isMesh || node.userData?.[DETAIL]) return;
    const type = node.geometry?.type;
    if (type !== 'BoxGeometry' && type !== 'RoundedBoxGeometry') return;
    if (!node.material?.isMeshStandardMaterial) return;
    node.material = node.material.clone();
    node.material.color.multiplyScalar(0.72);
    node.material.roughness = Math.min(0.9, Math.max(0.48, Number(node.material.roughness ?? 0.7)));
    node.material.metalness = Math.max(0.22, Number(node.material.metalness ?? 0.2));
  });
}

function conveyorShell(g, m) {
  addRoundBox(g, [2.46, 0.2, 1.36], m.frame, [0, 0.28, 0], 0.09);
  for (const x of [-0.92, -0.46, 0, 0.46, 0.92]) addCylinder(g, 0.105, 0.105, 0.98, m.bodyDark, [x, 0.51, 0], [Math.PI / 2, 0, 0], 28);
  for (const z of [-0.64, 0.64]) {
    addRoundBox(g, [2.48, 0.18, 0.16], m.yellow, [0, 0.64, z], 0.075);
    for (const x of [-0.98, 0.98]) addCylinder(g, 0.07, 0.085, 0.62, m.frame, [x, 0.25, z], [0, 0, 0], 24);
  }
}

function hopperShell(g, m) {
  addCylinder(g, 1.04, 0.4, 1.35, m.body, [0, 1.28, 0], [0, Math.PI / 8, 0], 32);
  addTorus(g, 1.05, 0.095, m.yellow, [0, 1.95, 0], [Math.PI / 2, 0, 0]);
  addCylinder(g, 0.45, 0.45, 0.44, m.bodyDark, [0, 0.52, 0], [0, 0, 0], 28);
  for (const [x, z] of [[-0.72, -0.72], [-0.72, 0.72], [0.72, -0.72], [0.72, 0.72]]) addCylinder(g, 0.07, 0.095, 1.18, m.frame, [x, 0.58, z]);
  addTube(g, [[0.45, 0.56, 0.35], [0.88, 0.74, 0.4], [1.08, 1.2, 0.3]], 0.095, m.copper, 22);
}

function sellerShell(g, m) {
  addRoundBox(g, [1.92, 1.9, 1.38], m.body, [0, 1.12, 0], 0.32);
  addRoundBox(g, [1.5, 0.7, 0.1], m.glass, [0, 1.42, -0.72], 0.08, [-0.06, 0, 0]);
  addDome(g, 1.02, m.frame, [0, 2.02, 0], [1, 0.24, 0.72]);
  for (const x of [-0.72, 0.72]) addCylinder(g, 0.1, 0.13, 1.3, m.yellow, [x, 0.7, -0.78]);
}

function crusherShell(g, m) {
  addRoundBox(g, [2.26, 0.36, 2.02], m.frame, [0, 0.22, 0], 0.16);
  for (const x of [-0.5, 0.5]) {
    addCylinder(g, 0.46, 0.46, 1.6, m.bodyDark, [x, 1.18, 0], [Math.PI / 2, 0, 0], 34);
    addTorus(g, 0.47, 0.065, m.yellow, [x, 1.18, -0.82], [Math.PI / 2, 0, 0]);
  }
  addCylinder(g, 0.96, 0.58, 0.92, m.body, [0, 2.02, 0.08], [0, Math.PI / 8, 0], 28);
  addTube(g, [[0.9, 0.72, 0.55], [1.22, 1.18, 0.58], [1.05, 1.78, 0.42]], 0.1, m.copper, 24);
}

function smelterShell(g, m) {
  addCylinder(g, 1.08, 1.16, 1.92, m.body, [0, 1.1, 0], [0, 0, 0], 36);
  addDome(g, 1.08, m.body, [0, 2.06, 0], [1, 0.48, 1]);
  for (const y of [0.5, 1.25, 1.88]) addTorus(g, 1.095, 0.055, m.frame, [0, y, 0], [Math.PI / 2, 0, 0]);
  addRoundBox(g, [0.9, 0.66, 0.12], m.hot, [0, 1.0, -1.08], 0.09);
  addCylinder(g, 0.33, 0.38, 1.92, m.bodyDark, [0.62, 2.85, 0.12], [0, 0, 0], 30);
  addDome(g, 0.44, m.bodyDark, [0.62, 3.84, 0.12], [1, 0.32, 1]);
}

function storageShell(g, m) {
  for (const x of [-0.63, 0.63]) {
    addCylinder(g, 0.51, 0.51, 1.58, m.body, [x, 1.02, 0], [0, 0, 0], 34);
    addDome(g, 0.51, m.body, [x, 1.82, 0]);
    addTorus(g, 0.52, 0.055, m.yellow, [x, 1.28, 0], [Math.PI / 2, 0, 0]);
  }
  addTube(g, [[-0.63, 1.9, 0], [0, 2.2, 0], [0.63, 1.9, 0]], 0.075, m.frame, 24);
  addRoundBox(g, [1.72, 0.4, 0.28], m.frame, [0, 0.35, -0.78], 0.12);
}

function powerShell(g, m) {
  addCylinder(g, 0.64, 0.64, 1.42, m.bodyDark, [0, 1.02, -0.3], [Math.PI / 2, 0, 0], 36);
  addTorus(g, 0.66, 0.085, m.copper, [0, 1.02, -1.02], [Math.PI / 2, 0, 0]);
  addDome(g, 0.58, m.body, [0, 1.02, 0.43], [1, 1, 0.35]);
  for (const x of [-0.8, 0.8]) {
    addCylinder(g, 0.12, 0.15, 1.62, m.frame, [x, 1.65, 0.5]);
    addDome(g, 0.18, m.yellow, [x, 2.5, 0.5], [1, 0.7, 1]);
  }
}

function assemblerShell(g, m) {
  addRoundBox(g, [2.05, 0.4, 1.78], m.frame, [0, 0.24, 0], 0.16);
  addCylinder(g, 0.72, 0.72, 1.45, m.body, [0, 1.18, 0], [Math.PI / 2, 0, 0], 34);
  addTorus(g, 0.73, 0.07, m.yellow, [0, 1.18, -0.73], [Math.PI / 2, 0, 0]);
  for (const x of [-0.78, 0.78]) addCylinder(g, 0.28, 0.28, 0.5, m.bodyDark, [x, 1.12, -0.62], [Math.PI / 2, 0, 0], 30);
  addTube(g, [[-0.75, 1.82, 0.4], [0, 2.32, 0.56], [0.75, 1.82, 0.4]], 0.08, m.copper, 26);
}

function genericShell(g, m) {
  addCylinder(g, 0.82, 0.92, 1.45, m.body, [0, 1.0, 0], [0, 0, 0], 32);
  addDome(g, 0.82, m.body, [0, 1.74, 0]);
  addRoundBox(g, [1.8, 0.28, 1.66], m.frame, [0, 0.2, 0], 0.12);
}

function decorateBuilding(root, type, preview = false) {
  if (!root || root.userData?.[TAG]) return;
  root.userData[TAG] = true;
  if (!preview) deEmphasizeBlockCore(root);
  const g = new THREE.Group();
  g.name = 'SF_VISUAL_OVERHAUL_V3_MACHINE';
  g.userData[DETAIL] = true;
  root.add(g);
  const m = palette(preview);
  const key = String(type || '').toLowerCase();
  if (key.includes('conveyor')) conveyorShell(g, m);
  else if (key.includes('hopper')) hopperShell(g, m);
  else if (key.includes('seller')) sellerShell(g, m);
  else if (key.includes('crusher')) crusherShell(g, m);
  else if (key.includes('smelter') || key.includes('furnace')) smelterShell(g, m);
  else if (key.includes('storage') || key.includes('warehouse')) storageShell(g, m);
  else if (key.includes('generator') || key.includes('battery') || key.includes('power')) powerShell(g, m);
  else if (key.includes('assembler') || key.includes('fabricator')) assemblerShell(g, m);
  else genericShell(g, m);
  g.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = !preview;
    node.receiveShadow = !preview;
  });
}

function addEnvironmentSilhouette(scene) {
  if (scene.userData?.[TAG]) return;
  scene.userData[TAG] = true;
  const g = new THREE.Group();
  g.name = 'SF_VISUAL_OVERHAUL_V3_WORLD';
  g.userData[DETAIL] = true;
  const steel = material(0x334247, { metalness: 0.72, roughness: 0.44 });
  const roof = material(0x536166, { metalness: 0.52, roughness: 0.58 });
  const yellow = material(0xd0aa43, { metalness: 0.36, roughness: 0.42 });
  const copper = material(0x956047, { metalness: 0.74, roughness: 0.36 });

  const hangarRoof = new THREE.CylinderGeometry(4.45, 4.45, 11.9, 42, 1, true, 0, Math.PI);
  addMesh(g, hangarRoof, roof, [-28.4, 5.72, -11.5], [0, 0, Math.PI / 2]);
  addTorus(g, 4.45, 0.11, steel, [-34.3, 5.72, -11.5], [0, Math.PI / 2, 0]);
  addTorus(g, 4.45, 0.11, steel, [-22.5, 5.72, -11.5], [0, Math.PI / 2, 0]);

  addTube(g, [[-21.0, 0.5, 14.1], [-21.0, 3.0, 14.1], [-18.3, 4.7, 14.1], [-14.5, 4.7, 14.1]], 0.14, steel, 34);
  addTube(g, [[-20.6, 0.5, 13.6], [-20.6, 2.7, 13.6], [-18.0, 4.35, 13.6], [-14.4, 4.35, 13.6]], 0.075, copper, 34);
  for (const x of [-18.3, -14.8]) addTorus(g, 0.2, 0.045, yellow, [x, 4.7, 14.1], [Math.PI / 2, 0, 0]);

  const tankPositions = [[92, -14, 1.3, 5.0], [96, -6, 1.0, 4.0], [94, 8, 1.5, 5.5]];
  for (const [x, z, r, h] of tankPositions) {
    addCylinder(g, r, r, h, roof, [x, h / 2, z], [0, 0, 0], 36);
    addDome(g, r, roof, [x, h, z], [1, 0.38, 1]);
    addTorus(g, r + 0.02, 0.055, yellow, [x, h * 0.68, z], [Math.PI / 2, 0, 0]);
  }
  addTube(g, [[92, 3.4, -14], [94, 4.0, -10], [96, 3.1, -6]], 0.12, steel, 30);

  g.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });
  scene.add(g);
}

function setDetailVisibility(scene, quality) {
  const visible = quality !== 'low';
  scene.traverse((node) => {
    if (node.userData?.[DETAIL]) node.visible = visible;
  });
}

function install() {
  const runtime = window.__scrapFactoryRuntime;
  const world = runtime?.world;
  if (!world?.scene || world.__sfVisualOverhaulV3Installed) return false;
  world.__sfVisualOverhaulV3Installed = true;

  for (const root of world.buildingMeshes?.values?.() || []) {
    const type = root.userData?.entity?.type;
    if (type) decorateBuilding(root, type, false);
  }
  addEnvironmentSilhouette(world.scene);

  const originalAdd = world.scene.add.bind(world.scene);
  world.scene.add = (...objects) => {
    const result = originalAdd(...objects);
    queueMicrotask(() => {
      for (const object of objects) {
        if (object?.userData?.[DETAIL]) continue;
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
      setDetailVisibility(world.scene, quality);
      return result;
    };
  }

  setDetailVisibility(world.scene, runtime.getGame?.()?.settings?.quality || 'high');
  return true;
}

let attempts = 0;
function boot() {
  attempts += 1;
  if (install() || attempts > 100) return;
  window.setTimeout(boot, 50);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(() => requestAnimationFrame(boot)), { once: true });
} else {
  requestAnimationFrame(() => requestAnimationFrame(boot));
}
