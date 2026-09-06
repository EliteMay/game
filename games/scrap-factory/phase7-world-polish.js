import * as THREE from 'three';
import { BUILDINGS } from './config.js';

const LOGISTICS_TYPES = new Set([
  'conveyor', 'conveyor_mk2', 'conveyor_mk3', 'splitter', 'merger',
  'smart_sorter', 'priority_splitter', 'overflow_splitter',
]);
const TALL_TYPES = new Set([
  'logistics_warehouse', 'industrial_generator', 'experimental_power_system',
  'drone_port', 'drone_port_copper', 'drone_port_electronics',
  'advanced_drone_port', 'advanced_drone_port_copper', 'advanced_drone_port_plastic',
  'advanced_drone_port_electronics', 'advanced_drone_port_scrap',
  'fabricator', 'fabricator_core',
]);
const POLE_TYPES = new Set(['power_pole']);
const SPARK_TYPES = new Set(['crusher', 'assembler', 'assembler_plate', 'assembler_motor', 'assembler_circuit', 'fabricator', 'fabricator_core']);
const HEAT_TYPES = new Set(['smelter', 'generator', 'industrial_generator']);
const ENERGY_TYPES = new Set([
  'experimental_power_system', 'drone_port', 'drone_port_copper', 'drone_port_electronics',
  'advanced_drone_port', 'advanced_drone_port_copper', 'advanced_drone_port_plastic',
  'advanced_drone_port_electronics', 'advanced_drone_port_scrap',
]);

const BUDGETS = Object.freeze({
  high: Object.freeze({
    detailDistance: 14,
    shadowDistance: 10,
    animationDistance: 14,
    particleDistance: 12,
    cullDistance: 82,
    packetDistance: 34,
    maxPackets: 140,
    particleCap: 48,
    updateSeconds: 0.18,
  }),
  medium: Object.freeze({
    detailDistance: 11,
    shadowDistance: 7,
    animationDistance: 11,
    particleDistance: 9,
    cullDistance: 68,
    packetDistance: 28,
    maxPackets: 90,
    particleCap: 28,
    updateSeconds: 0.22,
  }),
  low: Object.freeze({
    detailDistance: 8,
    shadowDistance: 0,
    animationDistance: 8,
    particleDistance: 0,
    cullDistance: 52,
    packetDistance: 20,
    maxPackets: 48,
    particleCap: 0,
    updateSeconds: 0.28,
  }),
});

const BUCKETS = Object.freeze({
  logistics: Object.freeze({ size: [2.1, 0.26, 0.92], y: 0.34, roughness: 0.78, metalness: 0.36 }),
  machine: Object.freeze({ size: [1.78, 1.48, 1.56], y: 0.74, roughness: 0.72, metalness: 0.4 }),
  tall: Object.freeze({ size: [1.82, 2.42, 1.64], y: 1.21, roughness: 0.68, metalness: 0.44 }),
  pole: Object.freeze({ size: [0.28, 3.2, 0.28], y: 1.6, roughness: 0.7, metalness: 0.58 }),
});

const FLOW_MARKER_SIZE = [0.52, 0.07, 0.18];
const _dummy = new THREE.Object3D();
const _offset = new THREE.Vector3();
const _color = new THREE.Color();

function qualityKey(value) {
  return value === 'low' ? 'low' : value === 'medium' ? 'medium' : 'high';
}

function bucketFor(type) {
  if (LOGISTICS_TYPES.has(type)) return 'logistics';
  if (POLE_TYPES.has(type)) return 'pole';
  if (TALL_TYPES.has(type)) return 'tall';
  return 'machine';
}

function buildingColor(type) {
  return Number(BUILDINGS[type]?.color ?? 0x687273);
}

function hashUnit(seed) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function createPointPool(scene, { color, size, opacity, max = 64 }) {
  const positions = new Float32Array(max * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 2;
  scene.add(points);
  return { points, geometry, material, positions, max };
}

function disposeInstanced(mesh) {
  if (!mesh) return;
  mesh.parent?.remove(mesh);
  mesh.geometry?.dispose?.();
  mesh.material?.dispose?.();
}

function setInstanceMatrix(mesh, index, root, bucket, visible, localOffsetX = 0, localY = null) {
  _dummy.position.copy(root.position);
  _dummy.quaternion.setFromEuler(new THREE.Euler(0, root.rotation.y || 0, 0));
  _dummy.scale.setScalar(visible ? 1 : 0.00001);
  if (localOffsetX) {
    _offset.set(localOffsetX, 0, 0).applyQuaternion(_dummy.quaternion);
    _dummy.position.add(_offset);
  }
  _dummy.position.y = localY ?? bucket.y;
  _dummy.updateMatrix();
  mesh.setMatrixAt(index, _dummy.matrix);
}

export class Phase7WorldPolish {
  constructor(world) {
    this.world = world;
    this.quality = 'high';
    this.budget = BUDGETS.high;
    this.entries = [];
    this.batches = [];
    this.updateSerial = 0;
    this.counts = { detail: 0, proxy: 0, culled: 0 };
    this.sparkPool = createPointPool(world.scene, { color: 0xe5bd63, size: 0.065, opacity: 0.72, max: 64 });
    this.heatPool = createPointPool(world.scene, { color: 0x8e7d6d, size: 0.105, opacity: 0.3, max: 48 });
    this.energyPool = createPointPool(world.scene, { color: 0x75bac0, size: 0.075, opacity: 0.64, max: 48 });
  }

  setQuality(value) {
    this.quality = qualityKey(value);
    this.budget = BUDGETS[this.quality];
    this.#applyEnvironmentBudget();
    this.update(true);
  }

  rebuild() {
    for (const batch of this.batches) {
      disposeInstanced(batch.mesh);
      disposeInstanced(batch.flowMesh);
    }
    this.batches = [];
    this.entries = [];

    const grouped = new Map(Object.keys(BUCKETS).map((key) => [key, []]));
    for (const [id, root] of this.world.buildingMeshes || []) {
      if (!root) continue;
      const type = root.userData?.entity?.type;
      if (!type) continue;
      if (!root.userData.phase7DetailChildren) {
        root.userData.phase7DetailChildren = root.children.filter((child) => child.visible !== false);
      }
      if (!Object.prototype.hasOwnProperty.call(root.userData, 'phase7OriginalSpinner')) {
        root.userData.phase7OriginalSpinner = root.userData.spinner || null;
      }
      const entry = { id, type, root, bucket: bucketFor(type), batch: null, index: -1, flowIndex: -1, lod: null, shadow: null };
      grouped.get(entry.bucket).push(entry);
      this.entries.push(entry);
    }

    for (const [bucketName, entries] of grouped) {
      if (!entries.length) continue;
      const bucket = BUCKETS[bucketName];
      const geometry = new THREE.BoxGeometry(...bucket.size);
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: bucket.roughness,
        metalness: bucket.metalness,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
      mesh.name = `phase7-proxy-${bucketName}`;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.userData.phase7Proxy = true;
      this.world.scene.add(mesh);

      let flowMesh = null;
      if (bucketName === 'logistics') {
        flowMesh = new THREE.InstancedMesh(
          new THREE.BoxGeometry(...FLOW_MARKER_SIZE),
          new THREE.MeshBasicMaterial({ color: 0xd6b84b }),
          entries.length,
        );
        flowMesh.name = 'phase7-proxy-logistics-flow';
        flowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        flowMesh.castShadow = false;
        flowMesh.receiveShadow = false;
        flowMesh.userData.phase7Proxy = true;
        this.world.scene.add(flowMesh);
      }

      entries.forEach((entry, index) => {
        entry.batch = { mesh, flowMesh, bucket, bucketName };
        entry.index = index;
        entry.flowIndex = flowMesh ? index : -1;
        setInstanceMatrix(mesh, index, entry.root, bucket, true);
        mesh.setColorAt(index, _color.setHex(buildingColor(entry.type)));
        if (flowMesh) setInstanceMatrix(flowMesh, index, entry.root, bucket, true, 0.72, 0.58);
      });
      mesh.instanceColor.needsUpdate = true;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      if (flowMesh) {
        flowMesh.instanceMatrix.needsUpdate = true;
        flowMesh.computeBoundingSphere();
      }
      this.batches.push({ mesh, flowMesh, entries, bucket, bucketName });
    }

    this.update(true);
  }

  removeBuilding() {
    this.rebuild();
  }

  buildingState(id, { active = false, progress = 0 } = {}) {
    const root = this.world.buildingMeshes?.get(id);
    if (!root) return;
    root.userData.phase7Active = Boolean(active);
    root.userData.phase7Progress = Number(progress) || 0;
  }

  shouldVisualizeTransfer(path) {
    if (!Array.isArray(path) || path.length < 2) return false;
    if ((this.world.packets?.length || 0) >= this.budget.maxPackets) return false;
    const px = Number(this.world.player?.x || 0);
    const pz = Number(this.world.player?.z || 0);
    let nearest = Infinity;
    for (const point of path) {
      const dx = Number(point?.x || 0) - px;
      const dz = Number(point?.z || 0) - pz;
      nearest = Math.min(nearest, Math.hypot(dx, dz));
    }
    return nearest <= this.budget.packetDistance;
  }

  update(force = false) {
    const now = performance.now() / 1000;
    if (!force && now - this.updateSerial < this.budget.updateSeconds) return;
    this.updateSerial = now;

    const px = Number(this.world.player?.x || 0);
    const pz = Number(this.world.player?.z || 0);
    const shadowEnabled = Boolean(this.world.renderer?.shadowMap?.enabled) && this.budget.shadowDistance > 0;
    const counts = { detail: 0, proxy: 0, culled: 0 };
    const sparkCandidates = [];
    const heatCandidates = [];
    const energyCandidates = [];
    const touched = new Set();

    for (const entry of this.entries) {
      const root = entry.root;
      if (!root?.parent) continue;
      const dx = root.position.x - px;
      const dz = root.position.z - pz;
      const distance = Math.hypot(dx, dz);
      const targetId = this.world.currentTarget?.kind === 'building' ? this.world.currentTarget.id : null;
      const keepDetail = entry.id === targetId || distance <= this.budget.detailDistance;
      const visible = distance <= this.budget.cullDistance;
      const lod = !visible ? 'culled' : keepDetail ? 'detail' : 'proxy';
      const castShadow = lod === 'detail' && shadowEnabled && distance <= this.budget.shadowDistance;
      counts[lod] += 1;

      if (entry.lod !== lod) {
        const showDetail = lod === 'detail';
        for (const child of root.userData.phase7DetailChildren || []) child.visible = showDetail;
        entry.lod = lod;
      }

      if (entry.shadow !== castShadow && lod === 'detail') {
        for (const child of root.userData.phase7DetailChildren || []) {
          child.traverse?.((node) => {
            if (!node.isMesh) return;
            node.castShadow = castShadow;
            node.receiveShadow = true;
          });
        }
        entry.shadow = castShadow;
      }

      const animate = lod === 'detail' && distance <= this.budget.animationDistance;
      root.userData.spinner = animate ? root.userData.phase7OriginalSpinner : null;

      if (entry.batch) {
        const proxyVisible = lod === 'proxy';
        setInstanceMatrix(entry.batch.mesh, entry.index, root, entry.batch.bucket, proxyVisible);
        touched.add(entry.batch.mesh);
        if (entry.batch.flowMesh) {
          setInstanceMatrix(entry.batch.flowMesh, entry.flowIndex, root, entry.batch.bucket, proxyVisible, 0.72, 0.58);
          touched.add(entry.batch.flowMesh);
        }
      }

      if (!root.userData.phase7Active || lod !== 'detail' || distance > this.budget.particleDistance) continue;
      if (SPARK_TYPES.has(entry.type)) sparkCandidates.push(entry);
      if (HEAT_TYPES.has(entry.type)) heatCandidates.push(entry);
      if (ENERGY_TYPES.has(entry.type)) energyCandidates.push(entry);
    }

    for (const mesh of touched) mesh.instanceMatrix.needsUpdate = true;
    this.counts = counts;
    this.#updateVfx(sparkCandidates, heatCandidates, energyCandidates, now);
  }

  snapshot() {
    const render = this.world.renderer?.info?.render || {};
    return {
      quality: this.quality,
      budgets: { ...this.budget },
      buildings: this.entries.length,
      detail: this.counts.detail,
      proxy: this.counts.proxy,
      culled: this.counts.culled,
      packets: this.world.packets?.length || 0,
      drawCalls: Number(render.calls || 0),
      triangles: Number(render.triangles || 0),
      pixelRatio: this.world.renderer?.getPixelRatio?.() || 1,
    };
  }

  #applyEnvironmentBudget() {
    const low = this.quality === 'low';
    if (this.world.visualFx?.cloudGroup) this.world.visualFx.cloudGroup.visible = !low;
    if (this.world.visualFx?.skyline) this.world.visualFx.skyline.visible = !low;
    if (this.world.renderer?.shadowMap) this.world.renderer.shadowMap.autoUpdate = this.quality === 'high';
    if (this.quality !== 'high' && this.world.renderer?.shadowMap) this.world.renderer.shadowMap.needsUpdate = true;
  }

  #updateVfx(sparks, heat, energy, time) {
    const cap = this.budget.particleCap;
    this.#fillPool(this.sparkPool, sparks, cap, time, 'spark');
    this.#fillPool(this.heatPool, heat, Math.floor(cap * 0.72), time, 'heat');
    this.#fillPool(this.energyPool, energy, Math.floor(cap * 0.72), time, 'energy');
  }

  #fillPool(pool, candidates, cap, time, kind) {
    const max = Math.min(pool.max, cap);
    if (max <= 0 || !candidates.length) {
      pool.geometry.setDrawRange(0, 0);
      pool.points.visible = false;
      return;
    }
    pool.points.visible = true;
    const perMachine = this.quality === 'high' ? 2 : 1;
    let cursor = 0;
    for (let i = 0; i < candidates.length && cursor < max; i += 1) {
      const entry = candidates[i];
      for (let j = 0; j < perMachine && cursor < max; j += 1) {
        const base = cursor * 3;
        const seed = (i + 1) * 17 + j * 11 + Math.floor(time * 9);
        const jitterX = (hashUnit(seed) - 0.5) * (kind === 'heat' ? 0.75 : 0.9);
        const jitterZ = (hashUnit(seed + 3) - 0.5) * 0.8;
        let y = kind === 'heat' ? 2.0 + hashUnit(seed + 7) * 1.35 : 1.0 + hashUnit(seed + 5) * 1.05;
        if (kind === 'energy') y = 1.2 + hashUnit(seed + 8) * 1.45;
        pool.positions[base] = entry.root.position.x + jitterX;
        pool.positions[base + 1] = y;
        pool.positions[base + 2] = entry.root.position.z + jitterZ;
        cursor += 1;
      }
    }
    pool.geometry.attributes.position.needsUpdate = true;
    pool.geometry.setDrawRange(0, cursor);
  }
}
