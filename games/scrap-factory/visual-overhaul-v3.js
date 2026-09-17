import * as THREE from 'three';

const TAG = 'sfVisualOverhaulV3';
const HIDDEN_TAG = 'sfVisualOverhaulV3HiddenBase';

function mat(color, { metalness = 0.45, roughness = 0.5, emissive = 0x000000, emissiveIntensity = 0, preview = false } = {}) {
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

function addCylinder(parent, radiusTop, radiusBottom, height, material, position = [0, 0, 0], rotation = [0, 0, 0], segments = 32) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addSphere(parent, radius, scale, material, position = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 18), material);
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addTorus(parent, radius, tube, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 14, 40), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addTube(parent, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, radius, 12, false), material);
  parent.add(mesh);
  return mesh;
}

function palette(preview) {
  return {
    frame: mat(0x22292b, { metalness: 0.78, roughness: 0.42, preview }),
    body: mat(0x53676b, { metalness: 0.46, roughness: 0.48, preview }),
    body2: mat(0x65777a, { metalness: 0.38, roughness: 0.5, preview }),
    dark: mat(0x151b1d, { metalness: 0.72, roughness: 0.46, preview }),
    accent: mat(0xd1aa3e, { metalness: 0.35, roughness: 0.38, preview }),
    copper: mat(0xa86a45, { metalness: 0.78, roughness: 0.32, preview }),
    screen: mat(0x5f98a0, { metalness: 0.2, roughness: 0.3, emissive: 0x21494d, emissiveIntensity: 1.15, preview }),
  };
}

function isInsidePreviousDetail(node, root) {
  let current = node.parent;
  while (current && current !== root) {
    if (current.name === 'sfVisualOverhaulV2Detail' || current.userData?.sfVisualOverhaulV2Detail) return true;
    current = current.parent;
  }
  return false;
}

function suppressDominantBoxes(root, type) {
  if (type === 'conveyor' || String(type).includes('conveyor') || type === 'smelter') return;
  const protectedNodes = new Set([
    root.userData?.statusLight,
    root.userData?.spinner,
    root.userData?.gauge,
  ].filter(Boolean));

  root.traverse((node) => {
    if (!node.isMesh || node.userData?.[HIDDEN_TAG] || protectedNodes.has(node)) return;
    if (isInsidePreviousDetail(node, root)) return;
    const geometry = node.geometry;
    if (!geometry || (geometry.type !== 'BoxGeometry' && geometry.type !== 'RoundedBoxGeometry')) return;
    const p = geometry.parameters || {};
    const w = Number(p.width || 0);
    const h = Number(p.height || 0);
    const d = Number(p.depth || 0);
    if (![w, h, d].every(Number.isFinite)) return;
    const minSide = Math.min(w, h, d);
    const volume = w * h * d;
    if (minSide < 0.22 || volume < 0.55) return;
    node.visible = false;
    node.userData[HIDDEN_TAG] = true;
  });
}

function decorateCrusher(g, m) {
  addCylinder(g, 0.9, 0.9, 1.48, m.body, [0, 1.22, 0], [Math.PI / 2, 0, 0]);
  addTorus(g, 0.91, 0.09, m.frame, [0, 1.22, -0.75], [Math.PI / 2, 0, 0]);
  addTorus(g, 0.91, 0.09, m.frame, [0, 1.22, 0.75], [Math.PI / 2, 0, 0]);
  for (const x of [-0.45, 0.45]) addCylinder(g, 0.3, 0.3, 1.62, m.dark, [x, 1.2, 0], [Math.PI / 2, 0, 0]);
  addSphere(g, 0.78, [1.15, 0.42, 1], m.body2, [0, 2.02, 0.08]);
  addTube(g, [[0.72, 1.0, 0.52], [1.15, 1.35, 0.58], [1.02, 1.82, 0.48]], 0.1, m.copper);
}

function decorateHopper(g, m) {
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.03, 0.38, 1.4, 32, 1, false), m.body);
  funnel.position.set(0, 1.28, 0);
  g.add(funnel);
  addTorus(g, 1.04, 0.1, m.accent, [0, 1.98, 0], [Math.PI / 2, 0, 0]);
  addCylinder(g, 0.42, 0.42, 0.42, m.dark, [0, 0.55, 0]);
  addTube(g, [[0.7, 0.62, 0.18], [1.08, 0.82, 0.18], [1.18, 1.18, 0.18]], 0.09, m.copper);
}

function decorateSeller(g, m) {
  addCylinder(g, 0.78, 0.9, 1.7, m.body, [0, 1.1, 0]);
  addSphere(g, 0.82, [1, 0.38, 1], m.body2, [0, 1.95, 0]);
  addTorus(g, 0.8, 0.08, m.accent, [0, 1.72, 0], [Math.PI / 2, 0, 0]);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.48), m.screen);
  screen.position.set(0, 1.28, -0.82);
  screen.rotation.x = -0.08;
  g.add(screen);
  for (const x of [-0.62, 0.62]) addCylinder(g, 0.08, 0.11, 1.15, m.accent, [x, 0.72, -0.72]);
}

function decorateStorage(g, m) {
  for (const x of [-0.58, 0.58]) {
    addCylinder(g, 0.48, 0.48, 1.65, m.body, [x, 1.05, 0]);
    addSphere(g, 0.48, [1, 0.48, 1], m.body2, [x, 1.88, 0]);
    addTorus(g, 0.49, 0.055, m.accent, [x, 1.28, 0], [Math.PI / 2, 0, 0]);
  }
  addTube(g, [[-0.58, 1.92, 0], [0, 2.22, 0], [0.58, 1.92, 0]], 0.075, m.frame);
}

function decorateGeneric(g, m, type) {
  addCylinder(g, 0.78, 0.9, 1.45, m.body, [0, 1.0, 0]);
  addSphere(g, 0.8, [1, 0.42, 1], m.body2, [0, 1.72, 0]);
  addTorus(g, 0.8, 0.075, m.accent, [0, 1.52, 0], [Math.PI / 2, 0, 0]);
  addTube(g, [[-0.72, 0.78, 0.35], [-1.02, 1.08, 0.42], [-0.82, 1.5, 0.4]], 0.08, type.includes('power') || type.includes('battery') ? m.copper : m.frame);
}

function decorate(root, type, preview) {
  if (!root || root.userData?.[TAG]) return;
  root.userData[TAG] = true;
  suppressDominantBoxes(root, type);

  const g = new THREE.Group();
  g.name = TAG;
  g.userData[TAG] = true;
  root.add(g);
  const m = palette(preview);
  const key = String(type || '').toLowerCase();

  if (key === 'crusher' || key.includes('crusher')) decorateCrusher(g, m);
  else if (key === 'hopper' || key.includes('hopper')) decorateHopper(g, m);
  else if (key === 'seller' || key.includes('seller')) decorateSeller(g, m);
  else if (key === 'storage' || key.includes('storage')) decorateStorage(g, m);
  else if (key === 'smelter' || key.includes('smelter') || key.includes('conveyor')) return;
  else decorateGeneric(g, m, key);

  g.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = !preview;
    node.receiveShadow = !preview;
  });
}

function scan() {
  const world = window.__scrapFactoryRuntime?.world;
  if (!world) return;
  for (const root of world.buildingMeshes?.values?.() || []) {
    const type = root.userData?.entity?.type;
    if (type) decorate(root, type, false);
  }
  if (world.buildPreview && world.buildMode) decorate(world.buildPreview, world.buildMode, true);
}

scan();
const timer = window.setInterval(scan, 500);
window.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
