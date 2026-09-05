import * as THREE from 'three';
import { ScrapWorld as BaseScrapWorld } from './world.js?base=v2';

const FENCE_ALPHA_TEST = 0.12;
const GROUND_CLEARANCE = 0.025;
const ADVANCED_LOGISTICS = new Set([
  'conveyor_mk2',
  'conveyor_mk3',
  'splitter',
  'merger',
  'smart_sorter',
  'priority_splitter',
  'overflow_splitter',
]);
const INFRASTRUCTURE_VISUALS = new Set(['battery', 'industrial_storage']);
const ADVANCED_PRODUCTION_VISUALS = new Set(['assembler']);
const AUTOMATION_VISUALS = new Set(['drone_port']);

function isFencePanel(node) {
  if (!node?.isMesh || node.geometry?.type !== 'PlaneGeometry') return false;
  const { width = 0, height = 0 } = node.geometry.parameters || {};
  return Boolean(
    node.material?.transparent
    && Math.abs(Number(node.material.alphaTest || 0) - FENCE_ALPHA_TEST) < 0.001
    && width >= 10
    && height >= 2
    && height <= 3,
  );
}

function repairFencePanels(scene) {
  scene.traverse((node) => {
    if (!isFencePanel(node)) return;
    node.rotation.y -= Math.PI / 2;
    const { width, height } = node.geometry.parameters;
    const map = node.material?.map;
    if (map) {
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(Math.max(1, width / 2.4), Math.max(1, height / 1.7));
      map.needsUpdate = true;
    }
    node.castShadow = false;
    node.receiveShadow = false;
  });
}

function groundMesh(mesh) {
  if (!mesh) return;
  mesh.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(mesh);
  if (!Number.isFinite(bounds.min.y)) return;
  mesh.position.y += GROUND_CLEARANCE - bounds.min.y;
  mesh.updateMatrixWorld(true);
}

function material(color, { preview = false, metalness = 0.5, roughness = 0.7 } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    transparent: preview,
    opacity: preview ? 0.52 : 1,
    depthWrite: !preview,
  });
}

function statusMaterial(preview = false) {
  return new THREE.MeshStandardMaterial({
    color: 0x3c4849,
    emissive: new THREE.Color(0x31383a),
    emissiveIntensity: 0.55,
    metalness: 0.28,
    roughness: 0.42,
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

function addArrow(group, position, rotationZ, mat, scale = 1) {
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.14 * scale, 0.34 * scale, 3), mat);
  arrow.position.set(...position);
  arrow.rotation.z = rotationZ;
  group.add(arrow);
  return arrow;
}

function finalizeVisual(group, preview) {
  group.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = !preview;
    node.receiveShadow = !preview;
  });
}

function hideBaseVisual(root, preview) {
  if (preview) return;
  for (const child of root.children) child.visible = false;
}

function addAdvancedLogisticsVisual(root, type, preview = false) {
  if (!root || !ADVANCED_LOGISTICS.has(type) || root.userData.advancedLogisticsVisual) return;
  root.userData.advancedLogisticsVisual = true;
  hideBaseVisual(root, preview);

  const group = new THREE.Group();
  group.userData.advancedLogisticsArt = true;
  const frame = material(0x2d3436, { preview, metalness: 0.72, roughness: 0.58 });
  const belt = material(
    type === 'merger' ? 0x473d4d
      : type === 'splitter' ? 0x4c4a35
        : type === 'smart_sorter' ? 0x304b46
          : type === 'priority_splitter' ? 0x304832
            : type === 'overflow_splitter' ? 0x4b3b2e
              : type === 'conveyor_mk3' ? 0x203c42
                : 0x26383b,
    { preview, metalness: 0.42, roughness: 0.76 },
  );
  const rail = material(
    type === 'merger' ? 0x8f79a0
      : type === 'splitter' ? 0xb5a34c
        : type === 'smart_sorter' ? 0x5d9b87
          : type === 'priority_splitter' ? 0x78ad6d
            : type === 'overflow_splitter' ? 0xc08552
              : type === 'conveyor_mk3' ? 0x6ac0ce
                : 0x5aa0a8,
    { preview, metalness: 0.55, roughness: 0.5 },
  );
  const accent = material(0xd3b23e, { preview, metalness: 0.32, roughness: 0.48 });

  if (type === 'conveyor_mk2' || type === 'conveyor_mk3') {
    const fast = type === 'conveyor_mk3';
    addBox(group, [2.36, 0.18, 1.25], frame, [0, 0.29, 0]);
    addBox(group, [2.16, 0.09, 0.82], belt, [0, 0.49, 0]);
    for (const z of [-0.57, 0.57]) {
      addBox(group, [2.38, 0.11, 0.09], rail, [0, 0.58, z]);
      if (fast) addBox(group, [2.14, 0.055, 0.055], accent, [0, 0.68, z * 0.84]);
    }
    const arrowXs = fast ? [-0.82, -0.28, 0.28, 0.82] : [-0.65, 0, 0.65];
    for (const x of arrowXs) addArrow(group, [x, fast ? 0.69 : 0.63, 0], -Math.PI / 2, fast ? rail : accent, fast ? 1.0 : 0.9);
    for (const x of [-0.93, 0.93]) for (const z of [-0.54, 0.54]) addBox(group, [0.1, 0.52, 0.1], frame, [x, 0.22, z]);
  } else if (type === 'priority_splitter') {
    const backup = material(0xb6944b, { preview, metalness: 0.4, roughness: 0.5 });
    addBox(group, [1.3, 0.22, 1.3], frame, [0, 0.28, 0]);
    addBox(group, [2.25, 0.17, 0.72], frame, [0, 0.32, 0]);
    addBox(group, [0.72, 0.17, 2.25], frame, [0, 0.32, 0]);
    addBox(group, [2.05, 0.08, 0.48], belt, [0, 0.49, 0]);
    addBox(group, [0.48, 0.08, 2.05], belt, [0, 0.49, 0]);
    addBox(group, [0.48, 0.46, 0.48], rail, [0, 0.76, 0]);
    addArrow(group, [0.76, 0.68, 0], -Math.PI / 2, rail, 1.25);
    addArrow(group, [0, 0.62, -0.74], Math.PI, backup, 0.82);
    addArrow(group, [0, 0.62, 0.74], 0, backup, 0.82);
    addBox(group, [0.6, 0.08, 0.16], rail, [0.64, 0.58, 0]);
    addBox(group, [0.16, 0.07, 0.46], backup, [0, 0.57, -0.62]);
    addBox(group, [0.16, 0.07, 0.46], backup, [0, 0.57, 0.62]);
  } else if (type === 'overflow_splitter') {
    const overflow = material(0xe0924f, { preview, metalness: 0.34, roughness: 0.46 });
    addBox(group, [1.3, 0.22, 1.3], frame, [0, 0.28, 0]);
    addBox(group, [2.25, 0.17, 0.72], frame, [0, 0.32, 0]);
    addBox(group, [0.72, 0.17, 1.48], frame, [0, 0.32, 0.39]);
    addBox(group, [2.05, 0.08, 0.48], belt, [0, 0.49, 0]);
    addBox(group, [0.48, 0.08, 1.28], belt, [0, 0.49, 0.39]);
    addBox(group, [0.46, 0.42, 0.46], rail, [0, 0.74, 0]);
    addArrow(group, [0.76, 0.67, 0], -Math.PI / 2, rail, 1.12);
    addArrow(group, [0, 0.65, 0.76], 0, overflow, 1.15);
    addBox(group, [0.62, 0.08, 0.16], rail, [0.64, 0.58, 0]);
    addBox(group, [0.16, 0.08, 0.55], overflow, [0, 0.58, 0.6]);
  } else {
    addBox(group, [1.25, 0.22, 1.25], frame, [0, 0.28, 0]);
    addBox(group, [1.15, 0.11, 1.15], belt, [0, 0.48, 0]);
    addBox(group, [2.25, 0.17, 0.7], frame, [0, 0.32, 0]);
    addBox(group, [0.7, 0.17, 2.25], frame, [0, 0.32, 0]);
    addBox(group, [2.05, 0.08, 0.46], belt, [0, 0.49, 0]);
    addBox(group, [0.46, 0.08, 2.05], belt, [0, 0.49, 0]);
    if (type === 'splitter') {
      addArrow(group, [0.7, 0.62, 0], -Math.PI / 2, accent);
      addArrow(group, [0, 0.62, -0.7], Math.PI, accent);
      addArrow(group, [0, 0.62, 0.7], 0, accent);
      addBox(group, [0.35, 0.18, 0.35], rail, [0, 0.66, 0]);
    } else if (type === 'smart_sorter') {
      const advancedLane = material(0x5ab494, { preview, metalness: 0.38, roughness: 0.44 });
      const productLane = material(0x7797c0, { preview, metalness: 0.38, roughness: 0.44 });
      const rawLane = material(0xc08d58, { preview, metalness: 0.38, roughness: 0.44 });
      addBox(group, [0.58, 0.5, 0.58], rail, [0, 0.77, 0]);
      addBox(group, [0.42, 0.16, 0.42], frame, [0, 1.08, 0]);
      addArrow(group, [0.74, 0.64, 0], -Math.PI / 2, advancedLane, 1.05);
      addArrow(group, [0, 0.64, -0.74], Math.PI, productLane, 1.05);
      addArrow(group, [0, 0.64, 0.74], 0, rawLane, 1.05);
      addBox(group, [0.48, 0.08, 0.18], advancedLane, [0.64, 0.58, 0]);
      addBox(group, [0.18, 0.08, 0.48], productLane, [0, 0.58, -0.64]);
      addBox(group, [0.18, 0.08, 0.48], rawLane, [0, 0.58, 0.64]);
    } else {
      addArrow(group, [0.72, 0.62, 0], -Math.PI / 2, accent, 1.1);
      addArrow(group, [-0.68, 0.61, 0], -Math.PI / 2, rail, 0.75);
      addArrow(group, [0, 0.61, -0.68], 0, rail, 0.75);
      addArrow(group, [0, 0.61, 0.68], Math.PI, rail, 0.75);
      addBox(group, [0.43, 0.2, 0.43], rail, [0, 0.67, 0]);
    }
  }
  finalizeVisual(group, preview);
  root.add(group);
}

function addInfrastructureVisual(root, type, preview = false) {
  if (!root || !INFRASTRUCTURE_VISUALS.has(type) || root.userData.infrastructureVisual) return;
  root.userData.infrastructureVisual = true;
  hideBaseVisual(root, preview);

  const group = new THREE.Group();
  group.userData.infrastructureArt = true;
  const frame = material(0x293234, { preview, metalness: 0.72, roughness: 0.56 });
  const body = material(type === 'battery' ? 0x52636f : 0x435660, { preview, metalness: 0.48, roughness: 0.7 });
  const dark = material(0x20282a, { preview, metalness: 0.58, roughness: 0.68 });
  const accent = material(0xd3b23e, { preview, metalness: 0.34, roughness: 0.48 });

  if (type === 'battery') {
    addBox(group, [1.75, 0.18, 1.55], frame, [0, 0.11, 0]);
    addBox(group, [1.48, 1.38, 1.18], body, [0, 0.88, 0]);
    for (const x of [-0.52, -0.17, 0.17, 0.52]) addBox(group, [0.22, 0.88, 1.23], dark, [x, 0.87, 0]);
    addBox(group, [1.58, 0.14, 1.28], frame, [0, 1.58, 0]);
    addCylinder(group, 0.12, 0.12, 0.28, 10, accent, [-0.42, 1.78, -0.28]);
    addCylinder(group, 0.12, 0.12, 0.28, 10, accent, [0.42, 1.78, -0.28]);
    addBox(group, [1.02, 0.14, 0.08], dark, [0, 1.28, -0.64]);
    const gauge = addBox(group, [0.92, 0.08, 0.04], accent, [0, 1.28, -0.69]);
    gauge.scale.x = 0.02;
    root.userData.gauge = gauge;
    root.userData.statusLight = addBox(group, [0.18, 0.18, 0.05], statusMaterial(preview), [0.58, 1.52, -0.65]);
  } else {
    addBox(group, [2.18, 0.18, 1.95], frame, [0, 0.12, 0]);
    addBox(group, [1.96, 1.92, 1.72], body, [0, 1.12, 0]);
    for (const x of [-0.78, -0.39, 0, 0.39, 0.78]) addBox(group, [0.08, 1.7, 1.78], frame, [x, 1.12, 0]);
    addBox(group, [2.04, 0.13, 1.82], frame, [0, 2.09, 0]);
    addBox(group, [1.52, 1.4, 0.08], dark, [0, 1.05, -0.9]);
    addBox(group, [0.1, 1.42, 0.05], accent, [-0.78, 1.05, -0.95]);
    addBox(group, [0.1, 1.42, 0.05], accent, [0.78, 1.05, -0.95]);
    addBox(group, [0.64, 0.16, 0.05], accent, [0, 1.82, -0.96]);
  }
  finalizeVisual(group, preview);
  root.add(group);
}

function addAdvancedProductionVisual(root, type, preview = false) {
  if (!root || !ADVANCED_PRODUCTION_VISUALS.has(type) || root.userData.advancedProductionVisual) return;
  root.userData.advancedProductionVisual = true;
  hideBaseVisual(root, preview);

  const group = new THREE.Group();
  group.userData.advancedProductionArt = true;
  const frame = material(0x263132, { preview, metalness: 0.74, roughness: 0.54 });
  const body = material(0x526a66, { preview, metalness: 0.5, roughness: 0.62 });
  const dark = material(0x182021, { preview, metalness: 0.58, roughness: 0.64 });
  const accent = material(0xd0aa43, { preview, metalness: 0.36, roughness: 0.46 });
  const chamber = material(0x3c5d5a, { preview, metalness: 0.32, roughness: 0.38 });

  addBox(group, [2.22, 0.18, 2.0], frame, [0, 0.11, 0]);
  addBox(group, [1.85, 1.48, 1.55], body, [0, 0.91, 0]);
  addBox(group, [1.25, 0.78, 1.67], chamber, [0, 1.04, -0.02]);
  addBox(group, [1.45, 0.2, 1.76], frame, [0, 1.54, 0]);
  for (const z of [-0.62, 0.62]) addBox(group, [0.36, 0.7, 0.48], dark, [-0.94, 0.7, z]);
  addBox(group, [0.38, 1.14, 1.64], frame, [0.92, 0.86, 0]);
  addBox(group, [0.15, 0.82, 1.3], accent, [1.13, 0.92, 0]);
  const spinner = addCylinder(group, 0.38, 0.38, 0.22, 18, accent, [0, 1.08, -0.88], [Math.PI / 2, 0, 0]);
  spinner.userData.active = false;
  root.userData.spinner = spinner;
  root.userData.statusLight = addBox(group, [0.34, 0.18, 0.07], statusMaterial(preview), [0.62, 1.66, -0.84]);
  addBox(group, [0.7, 0.1, 0.06], dark, [-0.25, 1.66, -0.85]);

  finalizeVisual(group, preview);
  root.add(group);
}

function addAutomationVisual(root, type, preview = false) {
  if (!root || !AUTOMATION_VISUALS.has(type) || root.userData.automationVisual) return;
  root.userData.automationVisual = true;
  hideBaseVisual(root, preview);

  const group = new THREE.Group();
  group.userData.automationArt = true;
  const frame = material(0x222b30, { preview, metalness: 0.78, roughness: 0.5 });
  const body = material(0x53646c, { preview, metalness: 0.52, roughness: 0.58 });
  const dark = material(0x151b1e, { preview, metalness: 0.64, roughness: 0.6 });
  const accent = material(0x7ea9b7, { preview, metalness: 0.36, roughness: 0.4 });
  const warning = material(0xc0a14b, { preview, metalness: 0.34, roughness: 0.48 });

  addBox(group, [2.25, 0.2, 2.05], frame, [0, 0.12, 0]);
  addBox(group, [1.85, 0.28, 1.65], body, [0, 0.34, 0]);
  addBox(group, [1.35, 0.08, 1.15], dark, [0, 0.53, 0]);
  for (const x of [-0.68, 0.68]) for (const z of [-0.58, 0.58]) {
    addCylinder(group, 0.11, 0.14, 0.32, 10, warning, [x, 0.69, z]);
  }
  addBox(group, [0.42, 1.2, 0.46], frame, [0.7, 1.02, 0.5]);
  addBox(group, [0.62, 0.44, 0.16], accent, [0.7, 1.58, 0.25]);
  const antenna = addCylinder(group, 0.06, 0.08, 1.0, 10, accent, [0.7, 2.02, 0.5]);
  antenna.userData.active = false;
  const radar = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 8, 24), accent);
  radar.position.set(0.7, 2.46, 0.5);
  radar.rotation.x = Math.PI / 2;
  group.add(radar);
  root.userData.spinner = radar;
  root.userData.statusLight = addBox(group, [0.24, 0.16, 0.06], statusMaterial(preview), [0.7, 1.7, 0.16]);

  const drone = new THREE.Group();
  drone.position.set(-0.35, 0.85, -0.1);
  group.add(drone);
  addBox(drone, [0.58, 0.18, 0.42], dark, [0, 0, 0]);
  for (const [x, z] of [[-0.42, -0.3], [-0.42, 0.3], [0.42, -0.3], [0.42, 0.3]]) {
    addBox(drone, [0.42, 0.06, 0.08], frame, [x * 0.5, 0, z * 0.5]);
    addCylinder(drone, 0.18, 0.18, 0.025, 12, accent, [x, 0.04, z]);
  }

  finalizeVisual(group, preview);
  root.add(group);
}

export class ScrapWorld extends BaseScrapWorld {
  constructor(...args) {
    super(...args);
    repairFencePanels(this.scene);
    for (const mesh of this.scrapMeshes.values()) groundMesh(mesh);
  }

  spawnScrap(...args) {
    const before = new Set(this.scrapMeshes?.keys?.() || []);
    const result = super.spawnScrap(...args);
    const explicitId = args[3];
    let spawned = explicitId ? this.scrapMeshes.get(explicitId) : null;
    if (!spawned) {
      for (const [id, mesh] of this.scrapMeshes) {
        if (!before.has(id)) { spawned = mesh; break; }
      }
    }
    groundMesh(spawned);
    return result;
  }

  addBuilding(building) {
    const mesh = super.addBuilding(building);
    if (!mesh) return mesh;
    if (ADVANCED_LOGISTICS.has(building?.type)) {
      addAdvancedLogisticsVisual(mesh, building.type, false);
      this.buildingColliders?.delete(building.id);
    }
    if (INFRASTRUCTURE_VISUALS.has(building?.type)) addInfrastructureVisual(mesh, building.type, false);
    if (ADVANCED_PRODUCTION_VISUALS.has(building?.type)) addAdvancedProductionVisual(mesh, building.type, false);
    if (AUTOMATION_VISUALS.has(building?.type)) addAutomationVisual(mesh, building.type, false);
    return mesh;
  }

  startBuild(type) {
    super.startBuild(type);
    if (ADVANCED_LOGISTICS.has(type)) addAdvancedLogisticsVisual(this.buildPreview, type, true);
    if (INFRASTRUCTURE_VISUALS.has(type)) addInfrastructureVisual(this.buildPreview, type, true);
    if (ADVANCED_PRODUCTION_VISUALS.has(type)) addAdvancedProductionVisual(this.buildPreview, type, true);
    if (AUTOMATION_VISUALS.has(type)) addAutomationVisual(this.buildPreview, type, true);
  }

  animateTransfer(path, itemId, speed = 5.8) {
    const before = this.packets?.length || 0;
    super.animateTransfer(path, itemId);
    if ((this.packets?.length || 0) > before) {
      const packet = this.packets[this.packets.length - 1];
      packet.speed = Math.max(1, Number(speed) || 5.8);
    }
  }

  setBuildingRotation(id, rotation) {
    const mesh = this.buildingMeshes?.get(id);
    if (!mesh) return false;
    mesh.rotation.y = Number(rotation) || 0;
    mesh.updateMatrixWorld(true);
    return true;
  }
}