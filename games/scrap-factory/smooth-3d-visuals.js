import * as THREE from 'three';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Phase7WorldPolish } from './phase7-world-polish.js';

// Presentation-only upgrade for the existing Stylized Industrial Realism direction.
// Keep simulation, colliders, build-grid coordinates, save data, and machine state untouched.
const DETAIL_DISTANCE = Object.freeze({ high: 42, medium: 26, low: 14 });
const TEXTURE_ANISOTROPY = Object.freeze({ high: 8, medium: 6, low: 4 });
const PATCH_KEY = Symbol.for('scrap-factory:smooth-3d-visuals:v1');

function qualityKey(value) {
  return value === 'low' ? 'low' : value === 'medium' ? 'medium' : 'high';
}

function upgradedPrimitiveGeometry(geometry) {
  if (!geometry?.parameters) return null;

  if (geometry.type === 'CylinderGeometry') {
    const p = geometry.parameters;
    const current = Math.max(3, Number(p.radialSegments) || 8);
    const target = current <= 4 ? 8 : current < 16 ? 16 : current;
    if (target === current) return null;
    return new THREE.CylinderGeometry(
      p.radiusTop,
      p.radiusBottom,
      p.height,
      target,
      p.heightSegments ?? 1,
      p.openEnded ?? false,
      p.thetaStart ?? 0,
      p.thetaLength ?? Math.PI * 2,
    );
  }

  if (geometry.type === 'TorusGeometry') {
    const p = geometry.parameters;
    const radialSegments = Math.max(12, Number(p.radialSegments) || 8);
    const tubularSegments = Math.max(24, Number(p.tubularSegments) || 16);
    if (radialSegments === p.radialSegments && tubularSegments === p.tubularSegments) return null;
    return new THREE.TorusGeometry(
      p.radius,
      p.tube,
      radialSegments,
      tubularSegments,
      p.arc ?? Math.PI * 2,
    );
  }

  return null;
}

function smoothPrimitiveGeometry(root) {
  if (!root?.traverse) return { cylinders: 0, toruses: 0 };

  const references = new Map();
  root.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    references.set(node.geometry, (references.get(node.geometry) || 0) + 1);
  });

  const stats = { cylinders: 0, toruses: 0 };
  root.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    const previous = node.geometry;
    const next = upgradedPrimitiveGeometry(previous);
    if (!next) return;

    node.geometry = next;
    next.computeBoundingBox?.();
    next.computeBoundingSphere?.();
    if ((references.get(previous) || 0) === 1) previous.dispose?.();
    if (previous.type === 'CylinderGeometry') stats.cylinders += 1;
    if (previous.type === 'TorusGeometry') stats.toruses += 1;
  });
  return stats;
}

function roundedProxyGeometry(bucketName, bucket) {
  const [width, height, depth] = bucket.size;
  if (bucketName === 'pole') {
    const radius = Math.max(width, depth) * 0.5;
    return new THREE.CylinderGeometry(radius, radius * 1.04, height, 12);
  }

  const minSide = Math.min(width, height, depth);
  const radiusScale = bucketName === 'logistics' ? 0.24 : 0.12;
  const radius = Math.min(0.16, Math.max(0.045, minSide * radiusScale));
  return new RoundedBoxGeometry(width, height, depth, 2, radius);
}

function upgradeProxyGeometry(batch) {
  if (!batch?.mesh || !batch?.bucket) return false;
  const previous = batch.mesh.geometry;
  const next = roundedProxyGeometry(batch.bucketName, batch.bucket);
  batch.mesh.geometry = next;
  previous?.dispose?.();
  next.computeBoundingBox?.();
  next.computeBoundingSphere?.();
  batch.mesh.computeBoundingBox?.();
  batch.mesh.computeBoundingSphere?.();
  return true;
}

function patchPhase7Polish() {
  const proto = Phase7WorldPolish.prototype;
  if (proto[PATCH_KEY]) return;
  Object.defineProperty(proto, PATCH_KEY, { value: true });

  const originalRebuild = proto.rebuild;
  proto.rebuild = function smoothRebuild(...args) {
    const result = originalRebuild.apply(this, args);
    for (const entry of this.entries || []) smoothPrimitiveGeometry(entry.root);
    for (const batch of this.batches || []) upgradeProxyGeometry(batch);
    return result;
  };

  const originalSetQuality = proto.setQuality;
  proto.setQuality = function smoothSetQuality(value) {
    const result = originalSetQuality.call(this, value);
    const quality = qualityKey(value);
    const targetDistance = DETAIL_DISTANCE[quality];
    if (this.budget?.detailDistance !== targetDistance) {
      this.budget = { ...this.budget, detailDistance: targetDistance };
      this.update(true);
    }
    return result;
  };
}

function forEachMaterial(root, callback) {
  root?.traverse?.((node) => {
    if (!node.isMesh || !node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) callback(material);
  });
}

function improveTextureSampling(world, quality) {
  const renderer = world?.renderer;
  const scene = world?.scene;
  if (!renderer || !scene) return 0;

  const maxSupported = Math.max(1, renderer.capabilities?.getMaxAnisotropy?.() || 1);
  const target = Math.min(maxSupported, TEXTURE_ANISOTROPY[qualityKey(quality)]);
  const textureKeys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap'];
  const touched = new Set();

  forEachMaterial(scene, (material) => {
    for (const key of textureKeys) {
      const texture = material?.[key];
      if (!texture || touched.has(texture) || texture.anisotropy >= target) continue;
      texture.anisotropy = target;
      texture.needsUpdate = true;
      touched.add(texture);
    }
  });
  return touched.size;
}

function installRuntimePolish() {
  const runtime = window.__scrapFactoryRuntime;
  const world = runtime?.world;
  if (!world?.scene || !world?.phase7Polish) return false;
  if (world.scene.userData?.smooth3dVisualsApplied) return true;

  const initialStats = smoothPrimitiveGeometry(world.scene);
  const initialQuality = qualityKey(world.phase7Polish.quality);
  const textures = improveTextureSampling(world, initialQuality);

  const originalStartBuild = world.startBuild.bind(world);
  world.startBuild = (type) => {
    const result = originalStartBuild(type);
    smoothPrimitiveGeometry(world.buildPreview);
    return result;
  };

  const originalSetQuality = world.setQuality.bind(world);
  world.setQuality = (quality) => {
    const result = originalSetQuality(quality);
    improveTextureSampling(world, qualityKey(quality));
    window.__scrapFactorySmoothVisuals = {
      ...window.__scrapFactorySmoothVisuals,
      quality: qualityKey(quality),
      detailDistance: world.phase7Polish?.budget?.detailDistance ?? null,
    };
    return result;
  };

  world.scene.userData.smooth3dVisualsApplied = true;
  window.__scrapFactorySmoothVisuals = {
    version: 1,
    quality: initialQuality,
    detailDistance: world.phase7Polish.budget?.detailDistance ?? null,
    upgradedCylinders: initialStats.cylinders,
    upgradedToruses: initialStats.toruses,
    upgradedTextures: textures,
  };
  return true;
}

patchPhase7Polish();

if (!installRuntimePolish()) {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (installRuntimePolish() || attempts >= 80) window.clearInterval(timer);
  }, 50);
}
