import * as THREE from 'three';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/geometries/RoundedBoxGeometry.js';

const VISUAL_TAG = 'sfVisualOverhaulV3';
const SOFTENED_TAG = 'sfVisualOverhaulV3Softened';

function material(color, {
  metalness = 0.45,
  roughness = 0.56,
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

function palette(preview = false) {
  return {
    frame: material(0x20282b, { metalness: 0.8, roughness: 0.42, preview }),
    shell: material(0x55696d, { metalness: 0.46, roughness: 0.5, preview }),
    shell2: material(0x748083, { metalness: 0.34, roughness: 0.58, preview }),
    dark: material(0x161d20, { metalness: 0.7, roughness: 0.48, preview }),
    rubber: material(0x171b1d, { metalness: 0.02, roughness: 0.96, preview }),
    accent: material(0xd1a93d, { metalness: 0.28, roughness: 0.42, preview }),
    copper: material(0xa76b49, { metalness: 0.72, roughness: 0.34, preview }),
    info: material(0x72a7ad, {
      metalness: 0.2,
      roughness: 0.3,
      emissive: 0x315a60,
      emissiveIntensity: 0.9,
      preview,
    }),
    hot: material(0x5a3028, {
      metalness: 0.26,
      roughness: 0.48,
      emissive: 0xff6426,
      emissiveIntensity: 1.45,
      preview,
    }),
  };
}

function addMesh(parent, geometry, mat, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function rounded(parent, size, mat, position = [0, 0, 0], rotation = [0, 0, 0], radius = null) {
  const [w, h, d] = size;
  const r = Math.min(radius ?? Math.min(w, h, d) * 0.28, Math.min(w, h, d) * 0.44, 0.38);
  return addMesh(parent, new RoundedBoxGeometry(w, h, d, 4, Math.max(0.025, r)), mat, position, rotation);
}

function cylinder(parent, rt, rb, h, mat, position = [0, 0, 0], rotation = [0, 0, 0], segments = 32) {
  return addMesh(parent, new THREE.CylinderGeometry(rt, rb, h, segments), mat, position, rotation);
}

function sphere(parent, radius, scale, mat, position = [0, 0, 0]) {
  const mesh = addMesh(parent, new THREE.SphereGeometry(radius, 32, 18), mat, position);
  mesh.scale.set(...scale);
  return mesh;
}

function torus(parent, radius, tube, mat, position = [0, 0, 0], rotation = [0, 0, 0]) {
  return addMesh(parent, new THREE.TorusGeometry(radius, tube, 14, 40), mat, position, rotation);
}

function tube(parent, points, radius, mat) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  return addMesh(parent, new THREE.TubeGeometry(curve, 36, radius, 12, false), mat);
}

function status(root, group, m, position = [0.72, 1.62, -0.88]) {
  const lamp = sphere(group, 0.105, [1.15, 0.68, 0.62], material(0x303a3b, {
    metalness: 0.2,
    roughness: 0.36,
    emissive: 0x31383a,
    emissiveIntensity: 0.6,
    preview: Boolean(m.preview),
  }), position);
  const gauge = rounded(group, [0.9, 0.075, 0.075], material(0x7fbf83, {
    metalness: 0.08,
    roughness: 0.34,
    emissive: 0x3e7145,
    emissiveIntensity: 0.82,
    preview: Boolean(m.preview),
  }), [-0.42, 0.34, -0.96], [0, 0, 0], 0.035);
  gauge.geometry.translate(0.45, 0, 0);
  gauge.scale.x = 0.02;
  root.userData.statusLight = lamp;
  root.userData.gauge = gauge;
}

function buildConveyor(root, group, m) {
  rounded(group, [2.28, 0.16, 1.16], m.frame, [0, 0.25, 0], [0, 0, 0], 0.07);
  for (const x of [-0.92, -0.46, 0, 0.46, 0.92]) {
    const roller = cylinder(group, 0.105, 0.105, 0.88, m.shell2, [x, 0.48, 0], [Math.PI / 2, 0, 0]);
    if (x === -0.92) root.userData.spinner = roller;
  }
  for (const z of [-0.57, 0.57]) {
    tube(group, [[-1.05, 0.36, z], [-0.62, 0.18, z], [0.62, 0.18, z], [1.05, 0.36, z]], 0.07, m.frame);
  }
  for (const x of [-0.62, 0, 0.62]) addMesh(group, new THREE.ConeGeometry(0.14, 0.32, 4), m.accent, [x, 0.63, 0], [0, 0, -Math.PI / 2]);
}

function buildHopper(root, group, m) {
  const funnel = cylinder(group, 1.02, 0.36, 1.48, m.shell, [0, 1.33, 0], [0, 0, 0], 40);
  funnel.rotation.y = Math.PI / 8;
  torus(group, 1.01, 0.085, m.accent, [0, 2.05, 0], [Math.PI / 2, 0, 0]);
  cylinder(group, 0.37, 0.37, 0.54, m.dark, [0, 0.48, 0]);
  for (const [x, z] of [[-0.72, -0.72], [-0.72, 0.72], [0.72, -0.72], [0.72, 0.72]]) {
    cylinder(group, 0.07, 0.095, 1.15, m.frame, [x, 0.66, z]);
  }
  tube(group, [[0.7, 0.56, 0.15], [1.0, 0.75, 0.15], [1.12, 1.15, 0.15]], 0.085, m.copper);
  status(root, group, m, [0.7, 1.45, -0.86]);
}

function buildSeller(root, group, m) {
  rounded(group, [1.85, 1.55, 1.3], m.shell, [0, 1.06, 0], [0, 0, 0], 0.36);
  sphere(group, 0.9, [1.0, 0.36, 0.76], m.frame, [0, 2.0, 0]);
  rounded(group, [1.2, 0.62, 0.08], m.info, [0, 1.42, -0.68], [-0.08, 0, 0], 0.08);
  rounded(group, [0.92, 0.16, 0.5], m.dark, [0, 0.68, -0.6], [0, 0, 0], 0.08);
  for (const x of [-0.65, 0.65]) {
    cylinder(group, 0.085, 0.11, 1.1, m.accent, [x, 0.62, -0.82]);
    sphere(group, 0.14, [1, 0.7, 1], m.accent, [x, 1.18, -0.82]);
  }
  status(root, group, m, [0.62, 1.92, -0.64]);
}

function buildCrusher(root, group, m) {
  rounded(group, [2.1, 0.22, 1.82], m.frame, [0, 0.18, 0], [0, 0, 0], 0.1);
  for (const x of [-0.48, 0.48]) {
    const roll = cylinder(group, 0.42, 0.42, 1.42, m.dark, [x, 1.05, -0.04], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2;
      const tooth = rounded(group, [0.15, 0.18, 0.26], m.shell2, [x + Math.cos(angle) * 0.39, 1.05 + Math.sin(angle) * 0.39, -0.04], [0, 0, angle], 0.035);
      tooth.rotation.z = angle;
    }
    if (x < 0) root.userData.spinner = roll;
  }
  for (const x of [-0.48, 0.48]) {
    torus(group, 0.5, 0.07, m.accent, [x, 1.05, -0.78], [Math.PI / 2, 0, 0]);
  }
  sphere(group, 0.96, [1.0, 0.44, 0.86], m.shell, [0, 1.82, 0.08]);
  tube(group, [[0.9, 0.88, 0.48], [1.2, 1.28, 0.46], [0.98, 1.82, 0.36]], 0.09, m.copper);
  status(root, group, m, [0.72, 1.68, -0.82]);
}

function buildSmelter(root, group, m) {
  rounded(group, [2.2, 0.22, 2.0], m.frame, [0, 0.16, 0], [0, 0, 0], 0.1);
  cylinder(group, 0.98, 1.06, 1.72, m.shell, [0, 1.08, 0], [0, 0, 0], 40);
  sphere(group, 0.98, [1, 0.46, 1], m.shell, [0, 1.94, 0]);
  for (const y of [0.54, 1.25, 1.78]) torus(group, 1.0, 0.055, m.frame, [0, y, 0], [Math.PI / 2, 0, 0]);
  cylinder(group, 0.3, 0.34, 1.85, m.dark, [0.55, 2.72, 0.16]);
  cylinder(group, 0.46, 0.3, 0.42, m.dark, [0.55, 3.85, 0.16]);
  rounded(group, [0.76, 0.56, 0.1], m.hot, [0, 1.0, -1.0], [0, 0, 0], 0.08);
  tube(group, [[-0.88, 0.72, 0.2], [-1.18, 0.92, 0.2], [-1.18, 1.72, 0.2]], 0.095, m.copper);
  status(root, group, m, [0.64, 1.65, -0.88]);
}

function buildStorage(root, group, m) {
  rounded(group, [2.15, 0.2, 1.85], m.frame, [0, 0.16, 0], [0, 0, 0], 0.09);
  for (const x of [-0.56, 0.56]) {
    cylinder(group, 0.48, 0.48, 1.45, m.shell, [x, 1.03, 0], [0, 0, 0], 40);
    sphere(group, 0.48, [1, 0.52, 1], m.shell, [x, 1.76, 0]);
    sphere(group, 0.48, [1, 0.32, 1], m.shell, [x, 0.3, 0]);
    torus(group, 0.49, 0.05, m.accent, [x, 1.18, 0], [Math.PI / 2, 0, 0]);
  }
  tube(group, [[-0.56, 1.9, 0], [0, 2.16, 0], [0.56, 1.9, 0]], 0.07, m.frame);
  rounded(group, [1.0, 0.56, 0.08], m.info, [0, 0.85, -0.5], [0, 0, 0], 0.07);
  status(root, group, m, [0.72, 1.6, -0.72]);
}

function buildAssembler(root, group, m, advanced = false) {
  rounded(group, [2.15, 0.2, 1.85], m.frame, [0, 0.16, 0], [0, 0, 0], 0.09);
  cylinder(group, 0.62, 0.72, 1.32, m.shell, [0, 1.02, 0], [0, 0, 0], 36);
  sphere(group, 0.66, [1, 0.45, 1], m.shell2, [0, 1.7, 0]);
  for (const x of [-0.82, 0.82]) {
    cylinder(group, 0.27, 0.27, 0.64, m.dark, [x, 1.0, -0.5], [Math.PI / 2, 0, 0]);
    torus(group, 0.29, 0.045, m.accent, [x, 1.0, -0.83], [Math.PI / 2, 0, 0]);
    tube(group, [[x * 0.82, 1.2, -0.28], [x * 0.68, 1.55, -0.18], [x * 0.48, 1.7, 0.05]], 0.065, m.copper);
  }
  if (advanced) {
    torus(group, 0.68, 0.055, m.info, [0, 1.78, 0], [Math.PI / 2, 0, 0]);
    cylinder(group, 0.16, 0.2, 0.6, m.info, [0, 2.15, 0]);
  }
  root.userData.spinner = cylinder(group, 0.23, 0.23, 0.18, m.accent, [0, 1.02, -0.73], [Math.PI / 2, 0, 0]);
  status(root, group, m, [0.7, 1.64, -0.82]);
}

function buildPower(root, group, m, battery = false) {
  rounded(group, [2.1, 0.2, 1.82], m.frame, [0, 0.16, 0], [0, 0, 0], 0.09);
  if (battery) {
    for (const x of [-0.62, 0, 0.62]) {
      cylinder(group, 0.3, 0.3, 1.46, m.shell, [x, 1.02, 0], [0, 0, 0], 36);
      sphere(group, 0.3, [1, 0.5, 1], m.shell, [x, 1.76, 0]);
      torus(group, 0.31, 0.04, m.info, [x, 1.28, 0], [Math.PI / 2, 0, 0]);
    }
  } else {
    const rotor = cylinder(group, 0.58, 0.58, 1.52, m.dark, [0, 1.02, 0], [Math.PI / 2, 0, 0], 40);
    root.userData.spinner = rotor;
    for (const z of [-0.78, 0.78]) torus(group, 0.61, 0.07, m.copper, [0, 1.02, z], [Math.PI / 2, 0, 0]);
    sphere(group, 0.64, [1.1, 0.42, 0.72], m.shell, [0, 1.86, 0]);
  }
  for (const x of [-0.74, 0.74]) {
    cylinder(group, 0.1, 0.14, 1.4, m.frame, [x, 1.35, 0.54]);
    sphere(group, 0.16, [1, 0.68, 1], m.accent, [x, 2.06, 0.54]);
  }
  status(root, group, m, [0.7, 1.62, -0.8]);
}

function buildDronePort(root, group, m, advanced = false) {
  cylinder(group, 1.02, 1.12, 0.24, m.frame, [0, 0.18, 0], [0, 0, 0], 40);
  torus(group, 0.78, 0.08, advanced ? m.info : m.accent, [0, 0.38, 0], [Math.PI / 2, 0, 0]);
  cylinder(group, 0.32, 0.42, 0.8, m.shell, [0, 0.78, 0], [0, 0, 0], 36);
  cylinder(group, 0.08, 0.1, 1.15, m.frame, [0, 1.58, 0]);
  torus(group, 0.64, 0.055, m.info, [0, 2.08, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 4; i += 1) {
    const angle = i * Math.PI / 2;
    const x = Math.cos(angle) * 0.82;
    const z = Math.sin(angle) * 0.82;
    sphere(group, 0.12, [1, 0.55, 1], m.accent, [x, 0.56, z]);
  }
  status(root, group, m, [0.66, 1.45, -0.66]);
}

function buildJunction(root, group, m, key) {
  cylinder(group, 0.62, 0.68, 0.26, m.frame, [0, 0.28, 0], [0, 0, 0], 36);
  torus(group, 0.54, 0.06, m.accent, [0, 0.45, 0], [Math.PI / 2, 0, 0]);
  const arms = key.includes('merger') ? 3 : key.includes('splitter') ? 3 : 4;
  for (let i = 0; i < arms; i += 1) {
    const angle = (i / arms) * Math.PI * 2;
    const x = Math.cos(angle) * 0.78;
    const z = Math.sin(angle) * 0.78;
    const arm = rounded(group, [0.86, 0.16, 0.46], m.shell, [x, 0.42, z], [0, -angle, 0], 0.07);
    arm.rotation.y = -angle;
  }
  status(root, group, m, [0.46, 0.78, -0.52]);
}

function buildGeneric(root, group, m) {
  rounded(group, [2.05, 0.22, 1.82], m.frame, [0, 0.16, 0], [0, 0, 0], 0.09);
  cylinder(group, 0.68, 0.76, 1.22, m.shell, [0, 0.95, 0], [0, 0, 0], 36);
  sphere(group, 0.7, [1, 0.42, 1], m.shell2, [0, 1.58, 0]);
  tube(group, [[-0.68, 0.72, 0.24], [-0.94, 1.08, 0.22], [-0.78, 1.54, 0.14]], 0.075, m.copper);
  rounded(group, [0.9, 0.48, 0.08], m.info, [0, 1.08, -0.72], [0, 0, 0], 0.06);
  status(root, group, m, [0.7, 1.56, -0.78]);
}

function rootIsPreview(root) {
  let preview = false;
  root.traverse((node) => {
    if (!node.isMesh || preview) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    if (mats.some((mat) => mat?.transparent && Number(mat.opacity) < 0.9)) preview = true;
  });
  return preview;
}

function hideLegacyVisuals(root) {
  for (const child of root.children) {
    if (child.userData?.[VISUAL_TAG]) continue;
    child.traverse((node) => {
      if (node.isMesh) node.visible = false;
    });
  }
}

function buildReplacement(root, type) {
  if (!root || root.userData?.[VISUAL_TAG]) return root;
  const preview = rootIsPreview(root);
  hideLegacyVisuals(root);

  const group = new THREE.Group();
  group.name = 'scrap-factory-visual-v3';
  group.userData[VISUAL_TAG] = true;
  root.add(group);
  root.userData[VISUAL_TAG] = true;

  const m = palette(preview);
  m.preview = preview;
  const key = String(type || '').toLowerCase();

  if (key.includes('conveyor')) buildConveyor(root, group, m);
  else if (key === 'hopper') buildHopper(root, group, m);
  else if (key === 'seller') buildSeller(root, group, m);
  else if (key === 'crusher') buildCrusher(root, group, m);
  else if (key === 'smelter') buildSmelter(root, group, m);
  else if (key === 'storage' || key.includes('industrial_storage')) buildStorage(root, group, m);
  else if (key.includes('assembler') || key.includes('fabricator')) buildAssembler(root, group, m, key.includes('fabricator'));
  else if (key.includes('generator')) buildPower(root, group, m, false);
  else if (key.includes('battery')) buildPower(root, group, m, true);
  else if (key.includes('drone_port')) buildDronePort(root, group, m, key.includes('advanced'));
  else if (key.includes('splitter') || key.includes('merger') || key.includes('sorter')) buildJunction(root, group, m, key);
  else buildGeneric(root, group, m);

  group.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });
  return root;
}

function softenEnvironment(scene) {
  scene.traverse((node) => {
    if (!node.isMesh || node.userData?.[SOFTENED_TAG] || node.userData?.[VISUAL_TAG]) return;
    node.userData[SOFTENED_TAG] = true;
    const geometry = node.geometry;
    if (!geometry || geometry.type !== 'BoxGeometry') return;
    const p = geometry.parameters || {};
    const w = Number(p.width);
    const h = Number(p.height);
    const d = Number(p.depth);
    if (![w, h, d].every(Number.isFinite)) return;
    const minSide = Math.min(w, h, d);
    const maxSide = Math.max(w, h, d);
    if (minSide < 0.12 || maxSide / Math.max(minSide, 0.001) > 18) return;
    const radius = Math.min(0.42, minSide * 0.34);
    node.geometry = new RoundedBoxGeometry(w, h, d, 3, radius);
  });
}

function install(world) {
  if (!world || world.__sfVisualV3Installed) return;
  world.__sfVisualV3Installed = true;

  softenEnvironment(world.scene);
  for (const mesh of world.buildingMeshes?.values?.() || []) {
    buildReplacement(mesh, mesh.userData?.entity?.type);
  }

  if (typeof world.addBuilding === 'function') {
    const originalAddBuilding = world.addBuilding.bind(world);
    world.addBuilding = (building) => {
      const mesh = originalAddBuilding(building);
      if (mesh) buildReplacement(mesh, building?.type);
      return mesh;
    };
  }

  if (typeof world.startBuild === 'function') {
    const originalStartBuild = world.startBuild.bind(world);
    world.startBuild = (type) => {
      const result = originalStartBuild(type);
      if (world.buildPreview) buildReplacement(world.buildPreview, type);
      return result;
    };
  }
}

function attach() {
  const runtime = window.__scrapFactoryRuntime;
  if (!runtime?.world) return false;
  install(runtime.world);
  return true;
}

if (!attach()) {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (attach() || attempts >= 120) window.clearInterval(timer);
  }, 100);
}
