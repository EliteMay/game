import * as THREE from 'three';
import { ScrapWorld as EnhancedScrapWorld } from './world-runtime.js?phase7-template=v1';
import { Phase7WorldPolish } from './phase7-world-polish.js';

const ENHANCED_TYPES = new Set([
  'conveyor_mk2', 'conveyor_mk3', 'splitter', 'merger', 'smart_sorter', 'priority_splitter', 'overflow_splitter',
  'battery', 'industrial_storage', 'assembler',
  'drone_port', 'drone_port_copper', 'drone_port_electronics',
  'industrial_generator', 'logistics_warehouse',
  'assembler_plate', 'assembler_motor', 'assembler_circuit',
  'advanced_drone_port', 'advanced_drone_port_copper', 'advanced_drone_port_plastic',
  'advanced_drone_port_electronics', 'advanced_drone_port_scrap',
  'fabricator', 'fabricator_core', 'experimental_power_system',
]);

const NON_BLOCKING_LOGISTICS = new Set([
  'conveyor', 'conveyor_mk2', 'conveyor_mk3', 'splitter', 'merger', 'smart_sorter', 'priority_splitter', 'overflow_splitter',
]);

function makeTemplateHost() {
  return {
    scene: new THREE.Scene(),
    buildingMeshes: new Map(),
    buildingColliders: new Map(),
    interactives: [],
    occupied: new Set(),
  };
}

function buildEnhancedMesh(building) {
  const host = makeTemplateHost();
  const mesh = EnhancedScrapWorld.prototype.addBuilding.call(host, building);
  if (!mesh) return null;
  host.scene.remove(mesh);
  return mesh;
}

function disposeRoot(root) {
  root?.traverse?.((node) => {
    if (!node.isMesh) return;
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) material?.dispose?.();
  });
}

function makePreview(root, opacity = 0.52) {
  root.userData.entity = null;
  root.traverse((node) => {
    if (!node.isMesh) return;
    const list = Array.isArray(node.material) ? node.material : [node.material];
    const cloned = list.map((material) => {
      const next = material.clone();
      next.transparent = true;
      next.opacity = opacity;
      next.depthWrite = false;
      if (next.color) node.userData.previewColor = next.color.getHex();
      return next;
    });
    node.material = Array.isArray(node.material) ? cloned : cloned[0];
    node.castShadow = false;
    node.receiveShadow = false;
  });
  return root;
}

function replaceBuildingVisual(world, building) {
  if (!building || !ENHANCED_TYPES.has(building.type)) return world.buildingMeshes?.get(building?.id) || null;
  const oldRoot = world.buildingMeshes?.get(building.id);
  if (!oldRoot) return null;
  const nextRoot = buildEnhancedMesh(building);
  if (!nextRoot) return oldRoot;

  nextRoot.position.copy(oldRoot.position);
  nextRoot.rotation.copy(oldRoot.rotation);
  nextRoot.userData.phase7Active = oldRoot.userData.phase7Active;
  nextRoot.userData.phase7Progress = oldRoot.userData.phase7Progress;

  world.scene.remove(oldRoot);
  world.scene.add(nextRoot);
  world.buildingMeshes.set(building.id, nextRoot);
  world.interactives = (world.interactives || []).map((entry) => entry === oldRoot ? nextRoot : entry);
  if (NON_BLOCKING_LOGISTICS.has(building.type)) world.buildingColliders?.delete(building.id);
  disposeRoot(oldRoot);
  return nextRoot;
}

function replaceBuildPreview(world, type) {
  const oldPreview = world.buildPreview;
  if (!oldPreview || !ENHANCED_TYPES.has(type)) return;
  const nextPreview = buildEnhancedMesh({
    id: 'phase7-build-preview',
    type,
    x: oldPreview.position.x,
    z: oldPreview.position.z,
    rotation: oldPreview.rotation.y,
    input: {},
    output: {},
    progress: 0,
  });
  if (!nextPreview) return;
  nextPreview.position.copy(oldPreview.position);
  nextPreview.rotation.copy(oldPreview.rotation);
  makePreview(nextPreview);
  world.scene.remove(oldPreview);
  disposeRoot(oldPreview);
  world.scene.add(nextPreview);
  world.buildPreview = nextPreview;
}

function patchProductionWorld(runtime) {
  const world = runtime?.world;
  const game = runtime?.getGame?.();
  if (!world || !game || world.userData?.phase7ProductionPatched) return false;
  world.userData ??= {};
  world.userData.phase7ProductionPatched = true;

  let bulkLoading = false;
  const originalAddBuilding = world.addBuilding.bind(world);
  const originalLoadBuildings = world.loadBuildings.bind(world);
  const originalRemoveBuilding = world.removeBuilding.bind(world);
  const originalStartBuild = world.startBuild.bind(world);
  const originalUpdateBuildingState = world.updateBuildingState.bind(world);
  const originalAnimateTransfer = world.animateTransfer.bind(world);
  const originalSetQuality = world.setQuality.bind(world);
  const originalStep = world.step.bind(world);

  world.phase7Polish = new Phase7WorldPolish(world);

  world.addBuilding = (building) => {
    const baseMesh = originalAddBuilding(building);
    if (!baseMesh) return baseMesh;
    const mesh = replaceBuildingVisual(world, building) || baseMesh;
    if (!bulkLoading) world.phase7Polish.rebuild();
    return mesh;
  };

  world.loadBuildings = (buildings) => {
    bulkLoading = true;
    try {
      originalLoadBuildings(buildings);
    } finally {
      bulkLoading = false;
    }
    world.phase7Polish.rebuild();
  };

  world.removeBuilding = (id) => {
    originalRemoveBuilding(id);
    if (!bulkLoading) world.phase7Polish.rebuild();
  };

  world.startBuild = (type) => {
    originalStartBuild(type);
    replaceBuildPreview(world, type);
  };

  world.updateBuildingState = (id, state) => {
    originalUpdateBuildingState(id, state);
    world.phase7Polish.buildingState(id, state);
  };

  world.animateTransfer = (path, itemId, speed = 5.8) => {
    if (!world.phase7Polish.shouldVisualizeTransfer(path)) return;
    const before = world.packets?.length || 0;
    originalAnimateTransfer(path, itemId);
    if ((world.packets?.length || 0) > before) {
      const packet = world.packets[world.packets.length - 1];
      packet.speed = Math.max(1, Number(speed) || 5.8);
    }
  };

  world.setBuildingRotation = (id, rotation) => {
    const mesh = world.buildingMeshes?.get(id);
    if (!mesh) return false;
    mesh.rotation.y = Number(rotation) || 0;
    mesh.updateMatrixWorld(true);
    world.phase7Polish.update(true);
    return true;
  };

  world.setQuality = (quality) => {
    originalSetQuality(quality);
    world.phase7Polish.setQuality(quality);
  };

  world.step = () => {
    world.phase7Polish.update();
    originalStep();
  };

  world.getVisualPerformanceSnapshot = () => world.phase7Polish.snapshot();

  for (const building of game.buildings || []) replaceBuildingVisual(world, building);
  world.phase7Polish.rebuild();
  const visualQuality = game.settings?.performanceMode
    ? 'low'
    : game.settings?.quality === 'medium'
      ? 'medium'
      : game.settings?.quality === 'low'
        ? 'low'
        : 'high';
  world.phase7Polish.setQuality(visualQuality);
  return true;
}

function initialize() {
  return patchProductionWorld(window.__scrapFactoryRuntime);
}

if (!initialize()) {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (initialize() || attempts >= 80) window.clearInterval(timer);
  }, 50);
}
