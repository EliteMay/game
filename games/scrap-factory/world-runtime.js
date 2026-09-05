import * as THREE from 'three';
import { ScrapWorld as BaseScrapWorld } from './world.js?base=v2';

const FENCE_ALPHA_TEST = 0.12;
const GROUND_CLEARANCE = 0.025;
const ADVANCED_LOGISTICS = new Set(['conveyor_mk2', 'splitter', 'merger']);

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

function addBox(group, size, mat, position) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
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

function addAdvancedLogisticsVisual(root, type, preview = false) {
  if (!root || !ADVANCED_LOGISTICS.has(type) || root.userData.advancedLogisticsVisual) return;
  root.userData.advancedLogisticsVisual = true;

  if (!preview) {
    for (const child of root.children) child.visible = false;
  }

  const group = new THREE.Group();
  group.userData.advancedLogisticsArt = true;
  const frame = material(0x2d3436, { preview, metalness: 0.72, roughness: 0.58 });
  const belt = material(type === 'merger' ? 0x473d4d : type === 'splitter' ? 0x4c4a35 : 0x26383b, { preview, metalness: 0.42, roughness: 0.76 });
  const rail = material(type === 'merger' ? 0x8f79a0 : type === 'splitter' ? 0xb5a34c : 0x5aa0a8, { preview, metalness: 0.55, roughness: 0.5 });
  const accent = material(0xd3b23e, { preview, metalness: 0.32, roughness: 0.48 });

  if (type === 'conveyor_mk2') {
    addBox(group, [2.36, 0.18, 1.25], frame, [0, 0.29, 0]);
    addBox(group, [2.16, 0.09, 0.82], belt, [0, 0.49, 0]);
    for (const z of [-0.57, 0.57]) addBox(group, [2.38, 0.11, 0.09], rail, [0, 0.58, z]);
    for (const x of [-0.65, 0, 0.65]) addArrow(group, [x, 0.63, 0], -Math.PI / 2, accent, 0.9);
    for (const x of [-0.93, 0.93]) for (const z of [-0.54, 0.54]) addBox(group, [0.1, 0.52, 0.1], frame, [x, 0.22, z]);
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
    } else {
      addArrow(group, [0.72, 0.62, 0], -Math.PI / 2, accent, 1.1);
      addArrow(group, [-0.68, 0.61, 0], -Math.PI / 2, rail, 0.75);
      addArrow(group, [0, 0.61, -0.68], 0, rail, 0.75);
      addArrow(group, [0, 0.61, 0.68], Math.PI, rail, 0.75);
      addBox(group, [0.43, 0.2, 0.43], rail, [0, 0.67, 0]);
    }
  }

  group.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = !preview;
    node.receiveShadow = !preview;
  });
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
        if (!before.has(id)) {
          spawned = mesh;
          break;
        }
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
    return mesh;
  }

  startBuild(type) {
    super.startBuild(type);
    if (ADVANCED_LOGISTICS.has(type)) addAdvancedLogisticsVisual(this.buildPreview, type, true);
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
