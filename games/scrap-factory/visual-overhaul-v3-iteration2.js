const DETAIL_TAG = 'sfVisualOverhaulV3Detail';
const SUPPRESSED_TAG = 'sfVisualOverhaulV3LegacySuppressed';

function insideDetail(node) {
  let current = node;
  while (current) {
    if (current.userData?.[DETAIL_TAG]) return true;
    current = current.parent;
  }
  return false;
}

function dimensionsOf(geometry) {
  const p = geometry?.parameters || {};
  const width = Number(p.width);
  const height = Number(p.height);
  const depth = Number(p.depth);
  if (![width, height, depth].every(Number.isFinite)) return null;
  return { width, height, depth, volume: width * height * depth };
}

function suppressLegacyCore(root, type, preview = false) {
  if (!root || root.userData?.[SUPPRESSED_TAG]) return;
  root.userData[SUPPRESSED_TAG] = true;
  const key = String(type || '').toLowerCase();
  const preserve = new Set([
    root.userData?.statusLight,
    root.userData?.gauge,
    root.userData?.spinner,
  ].filter(Boolean));

  root.traverse((node) => {
    if (!node.isMesh || insideDetail(node) || preserve.has(node)) return;
    const geometry = node.geometry;
    const geometryType = geometry?.type;

    if (geometryType === 'BoxGeometry' || geometryType === 'RoundedBoxGeometry') {
      const d = dimensionsOf(geometry);
      if (!d) return;
      const broadCore = d.volume >= (key.includes('conveyor') ? 0.34 : 0.48)
        && Math.max(d.width, d.height, d.depth) >= 1.2;
      if (broadCore) node.visible = false;
      return;
    }

    if (geometryType === 'CylinderGeometry') {
      const p = geometry.parameters || {};
      const radialSegments = Number(p.radialSegments || 0);
      const maxRadius = Math.max(Number(p.radiusTop || 0), Number(p.radiusBottom || 0));
      const height = Number(p.height || 0);
      const lowPolyCore = radialSegments > 0 && radialSegments <= 8 && maxRadius >= 0.34 && height >= 0.65;
      if (lowPolyCore) node.visible = false;
    }
  });

  if (preview) {
    root.traverse((node) => {
      if (!node.isMesh || !insideDetail(node)) return;
      if (node.material) {
        node.material.transparent = true;
        node.material.opacity = 0.48;
        node.material.depthWrite = false;
      }
    });
  }
}

function applyToCurrentBuildings(world) {
  for (const root of world.buildingMeshes?.values?.() || []) {
    const type = root.userData?.entity?.type;
    if (type) suppressLegacyCore(root, type, false);
  }
}

function install() {
  const runtime = window.__scrapFactoryRuntime;
  const world = runtime?.world;
  if (!world?.scene || world.__sfVisualIteration2Installed) return false;
  world.__sfVisualIteration2Installed = true;

  applyToCurrentBuildings(world);

  if (typeof world.addBuilding === 'function') {
    const originalAddBuilding = world.addBuilding.bind(world);
    world.addBuilding = (building) => {
      const root = originalAddBuilding(building);
      if (root && building?.type) queueMicrotask(() => suppressLegacyCore(root, building.type, false));
      return root;
    };
  }

  if (typeof world.startBuild === 'function') {
    const originalStartBuild = world.startBuild.bind(world);
    world.startBuild = (type) => {
      const result = originalStartBuild(type);
      if (world.buildPreview) queueMicrotask(() => suppressLegacyCore(world.buildPreview, type, true));
      return result;
    };
  }

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
