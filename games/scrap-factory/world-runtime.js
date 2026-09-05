import * as THREE from 'three';
import { ScrapWorld as Phase5BWorld } from './world-runtime-phase5b.js?phase5c-base=v1';

const UTILITY_DRONE_VARIANTS = new Set(['drone_port_copper', 'drone_port_electronics']);
const ADVANCED_DRONE_VARIANTS = new Set([
  'advanced_drone_port',
  'advanced_drone_port_copper',
  'advanced_drone_port_plastic',
  'advanced_drone_port_electronics',
  'advanced_drone_port_scrap',
]);
const ASSEMBLER_VARIANTS = new Set(['assembler_plate', 'assembler_motor', 'assembler_circuit']);
const FABRICATOR_VARIANTS = new Set(['fabricator', 'fabricator_core']);
const CUSTOM_VISUALS = new Set([
  ...UTILITY_DRONE_VARIANTS,
  ...ADVANCED_DRONE_VARIANTS,
  ...ASSEMBLER_VARIANTS,
  ...FABRICATOR_VARIANTS,
  'industrial_generator',
  'logistics_warehouse',
  'experimental_power_system',
]);

function material(color, { preview = false, metalness = 0.5, roughness = 0.7 } = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, transparent: preview, opacity: preview ? 0.52 : 1, depthWrite: !preview });
}

function statusMaterial(preview = false, color = 0x6fa6a8) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.7,
    metalness: 0.25,
    roughness: 0.4,
    transparent: preview,
    opacity: preview ? 0.58 : 1,
    depthWrite: !preview,
  });
}

function addBox(group, size, mat, position) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function addCylinder(group, radiusTop, radiusBottom, height, segments, mat, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), mat);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  group.add(mesh);
  return mesh;
}

function finalize(group, preview) {
  group.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = !preview;
    node.receiveShadow = !preview;
  });
}

function hideBase(root) {
  for (const child of root?.children || []) child.visible = false;
}

function routeColor(type, advanced = false) {
  if (type.includes('copper')) return 0xb97a4f;
  if (type.includes('plastic')) return 0x608b94;
  if (type.includes('electronics')) return 0x6f9b79;
  if (type.includes('scrap')) return 0x879096;
  return advanced ? 0x7684c8 : 0x8fa0aa;
}

function addDroneRouteVisual(root, type, preview, advanced = false) {
  hideBase(root);
  const group = new THREE.Group();
  const frame = material(advanced ? 0x1d272c : 0x222b30, { preview, metalness: 0.78, roughness: 0.5 });
  const body = material(advanced ? 0x465d66 : 0x53646c, { preview, metalness: 0.52, roughness: 0.58 });
  const dark = material(0x151b1e, { preview, metalness: 0.64, roughness: 0.6 });
  const accentColor = routeColor(type, advanced);
  const route = material(accentColor, { preview, metalness: 0.38, roughness: 0.42 });
  const warning = material(0xc0a14b, { preview, metalness: 0.34, roughness: 0.48 });

  addBox(group, [2.25, 0.2, 2.05], frame, [0, 0.12, 0]);
  addBox(group, [1.85, advanced ? 0.38 : 0.28, 1.65], body, [0, advanced ? 0.39 : 0.34, 0]);
  addBox(group, [1.35, 0.08, 1.15], dark, [0, advanced ? 0.62 : 0.53, 0]);
  for (const x of [-0.68, 0.68]) for (const z of [-0.58, 0.58]) addCylinder(group, 0.11, 0.14, 0.32, 10, warning, [x, 0.69, z]);

  addBox(group, [advanced ? 0.54 : 0.42, advanced ? 1.5 : 1.2, 0.46], frame, [0.7, advanced ? 1.18 : 1.02, 0.5]);
  addBox(group, [0.62, 0.44, 0.16], route, [0.7, advanced ? 1.82 : 1.58, 0.25]);
  addCylinder(group, 0.06, 0.08, advanced ? 1.3 : 1.0, 10, route, [0.7, advanced ? 2.35 : 2.02, 0.5]);
  const radar = new THREE.Mesh(new THREE.TorusGeometry(advanced ? 0.48 : 0.34, 0.045, 8, 24), route);
  radar.position.set(0.7, advanced ? 2.93 : 2.46, 0.5);
  radar.rotation.x = Math.PI / 2;
  group.add(radar);
  root.userData.spinner = radar;
  root.userData.statusLight = addBox(group, [0.24, 0.16, 0.06], statusMaterial(preview, accentColor), [0.7, advanced ? 2.02 : 1.7, 0.16]);

  const drone = new THREE.Group();
  drone.position.set(-0.35, advanced ? 1.0 : 0.85, -0.1);
  group.add(drone);
  addBox(drone, advanced ? [0.72, 0.22, 0.5] : [0.58, 0.18, 0.42], dark, [0, 0, 0]);
  for (const [x, z] of [[-0.42, -0.3], [-0.42, 0.3], [0.42, -0.3], [0.42, 0.3]]) {
    const scale = advanced ? 1.15 : 1;
    addBox(drone, [0.42 * scale, 0.06, 0.08], frame, [x * 0.5 * scale, 0, z * 0.5 * scale]);
    addCylinder(drone, 0.18 * scale, 0.18 * scale, 0.025, 12, route, [x * scale, 0.04, z * scale]);
  }
  if (advanced) {
    addBox(drone, [0.24, 0.08, 0.72], route, [0, 0.14, 0]);
    for (const x of [-0.72, 0.72]) addCylinder(group, 0.07, 0.09, 1.0, 8, route, [x, 1.1, 0.62]);
  }
  addBox(group, [1.18, 0.07, 0.12], route, [-0.2, advanced ? 0.72 : 0.62, -0.72]);
  finalize(group, preview);
  root.add(group);
}

function addIndustrialGeneratorVisual(root, preview) {
  hideBase(root);
  const group = new THREE.Group();
  const frame = material(0x252c2c, { preview, metalness: 0.78, roughness: 0.54 });
  const body = material(0x5f6448, { preview, metalness: 0.5, roughness: 0.68 });
  const dark = material(0x1c2222, { preview, metalness: 0.64, roughness: 0.62 });
  const copper = material(0xa87950, { preview, metalness: 0.68, roughness: 0.42 });
  const warning = material(0xd0aa43, { preview, metalness: 0.34, roughness: 0.48 });
  addBox(group, [2.25, 0.2, 2.0], frame, [0, 0.12, 0]);
  addBox(group, [1.85, 1.25, 1.55], body, [0, 0.83, 0]);
  addBox(group, [1.6, 0.65, 1.66], dark, [0, 1.0, -0.02]);
  const rotor = addCylinder(group, 0.48, 0.48, 1.45, 18, copper, [0, 1.05, -0.88], [Math.PI / 2, 0, 0]);
  root.userData.spinner = rotor;
  for (const x of [-0.68, 0.68]) addCylinder(group, 0.17, 0.22, 1.65, 12, dark, [x, 2.0, 0.38]);
  for (const x of [-0.68, 0.68]) addCylinder(group, 0.28, 0.17, 0.32, 12, dark, [x, 2.96, 0.38]);
  addBox(group, [1.55, 0.11, 0.08], warning, [0, 0.43, -0.84]);
  root.userData.statusLight = addBox(group, [0.3, 0.18, 0.06], statusMaterial(preview, 0xd0aa43), [0.65, 1.58, -0.8]);
  finalize(group, preview);
  root.add(group);
}

function addExperimentalPowerVisual(root, preview) {
  hideBase(root);
  const group = new THREE.Group();
  const frame = material(0x20272e, { preview, metalness: 0.82, roughness: 0.46 });
  const body = material(0x4f586e, { preview, metalness: 0.58, roughness: 0.52 });
  const dark = material(0x12171d, { preview, metalness: 0.7, roughness: 0.5 });
  const energy = material(0x7887df, { preview, metalness: 0.34, roughness: 0.3 });
  const cyan = material(0x6fb9ba, { preview, metalness: 0.32, roughness: 0.34 });
  addBox(group, [2.3, 0.2, 2.0], frame, [0, 0.12, 0]);
  addBox(group, [1.9, 0.65, 1.65], body, [0, 0.5, 0]);
  addCylinder(group, 0.62, 0.72, 2.0, 24, dark, [0, 1.55, 0]);
  for (const y of [0.95, 1.55, 2.15]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.08, 10, 30), energy);
    ring.position.set(0, y, 0);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    if (y === 2.15) root.userData.spinner = ring;
  }
  for (const x of [-0.78, 0.78]) addCylinder(group, 0.12, 0.16, 2.1, 12, cyan, [x, 1.45, 0.2]);
  addBox(group, [1.25, 0.38, 0.16], frame, [0, 1.05, -0.86]);
  addBox(group, [0.78, 0.18, 0.05], cyan, [0, 1.1, -0.96]);
  root.userData.statusLight = addBox(group, [0.28, 0.16, 0.05], statusMaterial(preview, 0x7887df), [0.58, 1.25, -0.96]);
  finalize(group, preview);
  root.add(group);
}

function addWarehouseVisual(root, preview) {
  hideBase(root);
  const group = new THREE.Group();
  const frame = material(0x283133, { preview, metalness: 0.72, roughness: 0.58 });
  const body = material(0x3d5159, { preview, metalness: 0.5, roughness: 0.7 });
  const dark = material(0x1d2527, { preview, metalness: 0.58, roughness: 0.68 });
  const accent = material(0x71aeb3, { preview, metalness: 0.36, roughness: 0.46 });
  addBox(group, [2.25, 0.2, 2.05], frame, [0, 0.12, 0]);
  addBox(group, [2.0, 2.55, 1.78], body, [0, 1.4, 0]);
  for (const x of [-0.82, -0.41, 0, 0.41, 0.82]) addBox(group, [0.07, 2.28, 1.84], frame, [x, 1.4, 0]);
  for (const y of [0.48, 1.14, 1.8, 2.46]) addBox(group, [1.88, 0.08, 1.86], dark, [0, y, 0]);
  addBox(group, [1.45, 1.75, 0.07], dark, [0, 1.35, -0.93]);
  for (const x of [-0.72, 0.72]) addBox(group, [0.08, 1.92, 0.05], accent, [x, 1.35, -0.98]);
  addBox(group, [1.2, 0.12, 0.05], accent, [0, 2.38, -0.98]);
  root.userData.statusLight = addBox(group, [0.22, 0.16, 0.05], statusMaterial(preview, 0x71aeb3), [0.7, 2.55, -0.98]);
  finalize(group, preview);
  root.add(group);
}

function addAssemblerVariantVisual(root, type, preview) {
  hideBase(root);
  const group = new THREE.Group();
  const frame = material(0x242d2e, { preview, metalness: 0.72, roughness: 0.58 });
  const body = material(0x526a66, { preview, metalness: 0.5, roughness: 0.62 });
  const dark = material(0x182021, { preview, metalness: 0.62, roughness: 0.62 });
  const accentColor = type === 'assembler_plate' ? 0x9aa4aa : type === 'assembler_motor' ? 0xb48c68 : 0x6fa68c;
  const accent = material(accentColor, { preview, metalness: 0.38, roughness: 0.42 });
  addBox(group, [2.2, 0.2, 2.0], frame, [0, 0.12, 0]);
  addBox(group, [1.82, 1.35, 1.55], body, [0, 0.9, 0]);
  addBox(group, [1.45, 0.65, 1.66], dark, [0, 1.0, -0.02]);
  for (const x of [-0.58, 0.58]) {
    addCylinder(group, 0.18, 0.22, 1.28, 12, frame, [x, 1.78, 0]);
    addBox(group, [0.42, 0.18, 0.18], accent, [x, 2.36, -0.04]);
  }
  addBox(group, [1.35, 0.35, 0.13], frame, [0, 1.18, -0.85]);
  addBox(group, [0.82, 0.16, 0.05], accent, [0, 1.2, -0.95]);
  root.userData.statusLight = addBox(group, [0.24, 0.14, 0.05], statusMaterial(preview, accentColor), [0.57, 1.4, -0.95]);
  finalize(group, preview);
  root.add(group);
}

function addFabricatorVisual(root, preview, coreMode = false) {
  hideBase(root);
  const group = new THREE.Group();
  const frame = material(0x20282c, { preview, metalness: 0.82, roughness: 0.46 });
  const body = material(coreMode ? 0x4c6066 : 0x596b72, { preview, metalness: 0.56, roughness: 0.56 });
  const dark = material(0x11171a, { preview, metalness: 0.68, roughness: 0.58 });
  const fieldColor = coreMode ? 0x75b7b2 : 0x6da8b5;
  const field = material(fieldColor, { preview, metalness: 0.36, roughness: 0.34 });
  const energy = material(coreMode ? 0x8a91e4 : 0x777fd0, { preview, metalness: 0.38, roughness: 0.34 });
  const warning = material(0xc1a34d, { preview, metalness: 0.3, roughness: 0.5 });
  addBox(group, [2.3, 0.2, 2.1], frame, [0, 0.12, 0]);
  addBox(group, [2.05, 0.52, 1.85], body, [0, 0.45, 0]);
  addBox(group, [1.72, 1.65, 1.4], dark, [0, 1.45, 0.08]);
  const chamber = addCylinder(group, 0.62, 0.75, 1.55, 24, field, [0, 1.5, 0.05]);
  chamber.material.transparent = true;
  chamber.material.opacity = preview ? 0.35 : 0.58;
  for (const y of [0.92, 2.08]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(coreMode && y > 2 ? 0.96 : 0.82, 0.09, 10, 30), energy);
    ring.position.set(0, y, 0.05);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    if (y > 2) root.userData.spinner = ring;
  }
  for (const x of [-0.88, 0.88]) {
    addBox(group, [0.24, 1.62, 0.34], frame, [x, 1.45, 0.05]);
    addCylinder(group, 0.13, 0.13, 1.12, 12, energy, [x, 1.52, 0.05]);
  }
  addBox(group, [1.55, 0.42, 0.18], body, [0, 1.2, -0.84]);
  addBox(group, [0.9, 0.24, 0.05], field, [0, 1.26, -0.95]);
  addBox(group, [1.48, 0.09, 0.08], warning, [0, 0.64, -0.91]);
  if (coreMode) addBox(group, [0.32, 0.32, 0.32], energy, [0, 1.54, 0.05]);
  root.userData.statusLight = addBox(group, [0.26, 0.16, 0.05], statusMaterial(preview, fieldColor), [0.62, 1.4, -0.95]);
  finalize(group, preview);
  root.add(group);
}

function addCustomVisual(root, type, preview = false) {
  if (!root || !CUSTOM_VISUALS.has(type) || root.userData.phase6cVisual) return;
  root.userData.phase6cVisual = true;
  if (UTILITY_DRONE_VARIANTS.has(type)) addDroneRouteVisual(root, type, preview, false);
  else if (ADVANCED_DRONE_VARIANTS.has(type)) addDroneRouteVisual(root, type, preview, true);
  else if (type === 'industrial_generator') addIndustrialGeneratorVisual(root, preview);
  else if (type === 'experimental_power_system') addExperimentalPowerVisual(root, preview);
  else if (type === 'logistics_warehouse') addWarehouseVisual(root, preview);
  else if (ASSEMBLER_VARIANTS.has(type)) addAssemblerVariantVisual(root, type, preview);
  else if (FABRICATOR_VARIANTS.has(type)) addFabricatorVisual(root, preview, type === 'fabricator_core');
}

export class ScrapWorld extends Phase5BWorld {
  addBuilding(building) {
    const mesh = super.addBuilding(building);
    if (mesh && CUSTOM_VISUALS.has(building?.type)) addCustomVisual(mesh, building.type, false);
    return mesh;
  }

  startBuild(type) {
    super.startBuild(type);
    if (CUSTOM_VISUALS.has(type)) addCustomVisual(this.buildPreview, type, true);
  }
}
