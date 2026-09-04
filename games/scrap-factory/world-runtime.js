import * as THREE from 'three';
import { ScrapWorld as BaseScrapWorld } from './world.js?base=v2';

const FENCE_ALPHA_TEST = 0.12;
const GROUND_CLEARANCE = 0.025;

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

    // V2 originally rotated the chain-link PlaneGeometry 90° away from its posts.
    // The collider followed the posts, so the visual panel crossed playable space
    // while the player could walk straight through it.
    node.rotation.y -= Math.PI / 2;

    const { width, height } = node.geometry.parameters;
    const map = node.material?.map;
    if (map) {
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(Math.max(1, width / 2.4), Math.max(1, height / 1.7));
      map.needsUpdate = true;
    }

    // Dense alpha-tested mesh shadows created large moiré-like bands on the floor.
    // Posts still cast normal shadows, so disabling the mesh shadow improves clarity.
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
}
