import * as THREE from 'three';
import {
  BASE_LIMIT,
  BUILDINGS,
  GRID_SIZE,
  INTERACT_DISTANCE,
  ITEMS,
  SCRAP_SPAWNS,
  snapToGrid,
  positionKey,
} from './config.js';
import { buildIndustrialEnvironment, createIndustrialBuildingMesh } from './industrial-art.js';
import { addBox, addCylinder, addMesh, makeMaterial } from './visual-kit.js';

const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.42;
const WORLD_BOUNDS = { minX: -21.4, maxX: 92, minZ: -30.5, maxZ: 44.5 };

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(random) {
  const total = SCRAP_SPAWNS.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * total;
  for (const entry of SCRAP_SPAWNS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  return SCRAP_SPAWNS[0].item;
}

function cloneTransparent(root, opacity = 0.52) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.material = node.material.clone();
    node.material.transparent = true;
    node.material.opacity = opacity;
    node.material.depthWrite = false;
    if (node.material.color) node.userData.previewColor = node.material.color.getHex();
  });
}

function findEntity(object) {
  let current = object;
  while (current) {
    if (current.userData?.entity) return current.userData.entity;
    current = current.parent;
  }
  return null;
}

function disposeRoot(root) {
  root?.traverse?.((node) => {
    if (!node.isMesh) return;
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) material?.dispose?.();
  });
}

export class ScrapWorld {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(76, 1, 0.08, 190);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = INTERACT_DISTANCE;
    this.pointer = new THREE.Vector2(0, 0);

    this.player = { x: 0, y: PLAYER_HEIGHT, z: 8, yaw: 0, pitch: 0, vy: 0, grounded: true, walkPhase: 0 };
    this.keys = new Set();
    this.staticColliders = [];
    this.buildingColliders = new Map();
    this.interactives = [];
    this.buildingMeshes = new Map();
    this.scrapMeshes = new Map();
    this.respawnQueue = [];
    this.packets = [];
    this.currentTarget = null;
    this.currentArea = 'base';
    this.buildMode = null;
    this.buildPreview = null;
    this.buildRotation = 0;
    this.canPlacePreview = false;
    this.occupied = new Set();
    this.fps = 0;
    this.frameCounter = 0;
    this.fpsTimer = 0;
    this.started = false;
    this.elapsed = 0;
    this.visualFx = {};

    this.#bindEvents();
    buildIndustrialEnvironment(this);
    this.#spawnInitialScrap();
    this.#createInteractionMarker();
    this.resize();
  }

  #bindEvents() {
    this.onResize = () => this.resize();
    this.onKeyDown = (event) => {
      if (event.repeat && ['KeyE', 'KeyB', 'KeyR'].includes(event.code)) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Space', 'Tab'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
      if (event.code === 'Space' && this.player.grounded && document.pointerLockElement === this.canvas) {
        this.player.vy = 5.8;
        this.player.grounded = false;
      }
      if (event.code === 'KeyR' && this.buildMode) this.buildRotation = (this.buildRotation + Math.PI / 2) % (Math.PI * 2);
      if (event.code === 'Escape' && this.buildMode) this.cancelBuild();
      this.callbacks.onKeyDown?.(event.code);
    };
    this.onKeyUp = (event) => this.keys.delete(event.code);
    this.onMouseMove = (event) => {
      if (document.pointerLockElement !== this.canvas) return;
      const sensitivity = this.callbacks.getSensitivity?.() ?? 0.0022;
      this.player.yaw -= event.movementX * sensitivity;
      this.player.pitch -= event.movementY * sensitivity;
      this.player.pitch = THREE.MathUtils.clamp(this.player.pitch, -1.48, 1.48);
    };
    this.onPointerLock = () => this.callbacks.onPointerLockChange?.(document.pointerLockElement === this.canvas);
    this.onMouseDown = (event) => {
      if (event.button === 0 && this.buildMode && document.pointerLockElement === this.canvas) {
        if (this.canPlacePreview && this.buildPreview) {
          const { x, z } = this.buildPreview.position;
          const placed = this.callbacks.onBuildPlace?.({ type: this.buildMode, x, z, rotation: this.buildRotation });
          if (placed !== false) this.#updateBuildPreview();
        } else this.callbacks.onBuildInvalid?.();
        return;
      }
      if (event.button === 2 && this.buildMode) {
        event.preventDefault();
        this.cancelBuild();
        return;
      }
      if (event.button === 0 && document.pointerLockElement !== this.canvas && !this.callbacks.isOverlayOpen?.()) this.lockPointer();
    };
    this.onContextMenu = (event) => { if (this.buildMode) event.preventDefault(); };

    window.addEventListener('resize', this.onResize);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLock);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLock);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }

  #createInteractionMarker() {
    const material = new THREE.MeshBasicMaterial({ color: 0xf0cc55, transparent: true, opacity: 0.88, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.055, 0.09, 20), material);
    ring.visible = false;
    ring.renderOrder = 20;
    this.scene.add(ring);
    this.interactionMarker = ring;
  }

  #spawnInitialScrap() {
    const random = seededRandom(9152026);
    let spawned = 0;
    let attempts = 0;
    while (spawned < 48 && attempts < 280) {
      attempts += 1;
      const x = 30.5 + random() * 56;
      const z = -27.5 + random() * 55;
      if (this.#pointInsideStatic(x, z, 0.55)) continue;
      this.spawnScrap(pickWeighted(random), x, z, `scrap-${spawned}`);
      spawned += 1;
    }
  }

  setPlayerState(player) {
    if (!player) return;
    const px = Number(player.x);
    const pz = Number(player.z);
    const yaw = Number(player.yaw);
    this.player.x = Number.isFinite(px) ? THREE.MathUtils.clamp(px, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX) : this.player.x;
    this.player.y = PLAYER_HEIGHT;
    this.player.z = Number.isFinite(pz) ? THREE.MathUtils.clamp(pz, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ) : this.player.z;
    this.player.yaw = Number.isFinite(yaw) ? yaw : 0;
  }

  getPlayerState() { return { x: this.player.x, y: PLAYER_HEIGHT, z: this.player.z, yaw: this.player.yaw }; }
  lockPointer() { if (!this.callbacks.isOverlayOpen?.()) this.canvas.requestPointerLock?.(); }
  unlockPointer() { if (document.pointerLockElement === this.canvas) document.exitPointerLock?.(); }

  setQuality(quality) {
    const dpr = window.devicePixelRatio || 1;
    const ratio = quality === 'low' ? 1 : quality === 'medium' ? Math.min(dpr, 1.35) : Math.min(dpr, 1.8);
    this.renderer.setPixelRatio(ratio);
    this.renderer.shadowMap.enabled = quality !== 'low';
    if (this.visualFx.dust) {
      this.visualFx.dust.visible = quality !== 'low';
      this.visualFx.dust.material.opacity = quality === 'high' ? 0.32 : 0.2;
    }
    this.resize();
  }

  resize() {
    const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  loadBuildings(buildings) {
    for (const mesh of this.buildingMeshes.values()) {
      this.scene.remove(mesh);
      disposeRoot(mesh);
    }
    this.buildingMeshes.clear();
    this.buildingColliders.clear();
    this.occupied.clear();
    this.interactives = this.interactives.filter((mesh) => findEntity(mesh)?.kind !== 'building');
    for (const building of buildings || []) this.addBuilding(building);
  }

  addBuilding(building) {
    if (!building || !BUILDINGS[building.type]) return null;
    const mesh = createIndustrialBuildingMesh(building.type);
    mesh.position.set(Number(building.x) || 0, 0, Number(building.z) || 0);
    mesh.rotation.y = Number(building.rotation) || 0;
    mesh.userData.entity = { kind: 'building', id: building.id, type: building.type };
    mesh.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    this.scene.add(mesh);
    this.buildingMeshes.set(building.id, mesh);
    this.interactives.push(mesh);
    this.occupied.add(positionKey(building.x, building.z));
    if (building.type !== 'conveyor') {
      this.buildingColliders.set(building.id, { minX: building.x - GRID_SIZE * 0.39, maxX: building.x + GRID_SIZE * 0.39, minZ: building.z - GRID_SIZE * 0.39, maxZ: building.z + GRID_SIZE * 0.39 });
    }
    return mesh;
  }

  updateBuildingState(id, { active = false, progress = 0 } = {}) {
    const mesh = this.buildingMeshes.get(id);
    if (!mesh) return;
    const light = mesh.userData.statusLight;
    if (light?.material?.emissive) {
      light.material.emissive.setHex(active ? 0x61d28a : 0x31383a);
      light.material.emissiveIntensity = active ? 2.2 : 0.55;
    }
    const spinner = mesh.userData.spinner;
    if (spinner) spinner.userData.active = active;
    const gauge = mesh.userData.gauge;
    if (gauge) gauge.scale.x = THREE.MathUtils.clamp(progress, 0.02, 1);
  }

  removeBuilding(id) {
    const mesh = this.buildingMeshes.get(id);
    if (!mesh) return;
    this.scene.remove(mesh);
    this.buildingMeshes.delete(id);
    this.buildingColliders.delete(id);
    this.occupied.delete(positionKey(mesh.position.x, mesh.position.z));
    this.interactives = this.interactives.filter((item) => item !== mesh);
    disposeRoot(mesh);
  }

  startBuild(type) {
    if (!BUILDINGS[type]?.buildable) return;
    this.cancelBuild();
    this.buildMode = type;
    this.buildRotation = 0;
    this.buildPreview = createIndustrialBuildingMesh(type);
    cloneTransparent(this.buildPreview);
    this.scene.add(this.buildPreview);
    this.callbacks.onBuildModeChange?.(type);
    this.#updateBuildPreview();
    this.lockPointer();
  }

  cancelBuild() {
    if (this.buildPreview) {
      this.scene.remove(this.buildPreview);
      disposeRoot(this.buildPreview);
    }
    this.buildPreview = null;
    this.buildMode = null;
    this.canPlacePreview = false;
    this.callbacks.onBuildModeChange?.(null);
  }

  #placementHitsStatic(x, z, type) {
    const half = type === 'conveyor' ? 0.5 : 0.92;
    return this.staticColliders.some((box) => x + half > box.minX && x - half < box.maxX && z + half > box.minZ && z - half < box.maxZ);
  }

  #updateBuildPreview() {
    if (!this.buildPreview || !this.buildMode) return;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const distance = Math.min(8, 5.5 / Math.max(0.2, Math.abs(direction.y) + 0.45));
    const x = snapToGrid(this.player.x + direction.x * distance);
    const z = snapToGrid(this.player.z + direction.z * distance);
    this.buildPreview.position.set(x, 0, z);
    this.buildPreview.rotation.y = this.buildRotation;
    const inBase = Math.abs(x) <= BASE_LIMIT && Math.abs(z) <= BASE_LIMIT;
    const occupied = this.occupied.has(positionKey(x, z));
    const staticHit = this.#placementHitsStatic(x, z, this.buildMode);
    const notOnPlayer = Math.hypot(x - this.player.x, z - this.player.z) > 1.8;
    this.canPlacePreview = inBase && !occupied && !staticHit && notOnPlayer;
    this.buildPreview.traverse((node) => {
      if (!node.isMesh || !node.material?.color) return;
      const original = node.userData.previewColor ?? node.material.color.getHex();
      node.userData.previewColor = original;
      node.material.color.setHex(original).lerp(new THREE.Color(this.canPlacePreview ? 0x78b985 : 0xb33f3f), this.canPlacePreview ? 0.08 : 0.68);
    });
    this.callbacks.onBuildPreview?.({ type: this.buildMode, x, z, rotation: this.buildRotation, valid: this.canPlacePreview });
  }

  spawnScrap(itemId, x, z, id = `scrap-${Math.random().toString(36).slice(2)}`) {
    const def = ITEMS[itemId];
    if (!def) return;
    const group = new THREE.Group();
    if (itemId === 'metal_scrap') {
      const metalA = makeMaterial(0x6f7472, 0.88, 0.64);
      const rust = makeMaterial(0x76513f, 0.94, 0.5);
      addBox(group, [0.62, 0.12, 0.2], metalA, [0, 0.05, 0], [0.3, 0.4, 0.1]);
      addBox(group, [0.12, 0.14, 0.64], rust, [0.08, 0.12, 0], [-0.25, -0.2, 0.35]);
      addCylinder(group, 0.07, 0.07, 0.48, 8, metalA, [-0.18, 0.1, 0.08], [Math.PI / 2, 0.2, 0.2]);
    } else if (itemId === 'copper_wire') {
      const copper = makeMaterial(def.color, 0.66, 0.72);
      for (let i = 0; i < 3; i += 1) addMesh(group, new THREE.TorusGeometry(0.22 + i * 0.035, 0.035, 8, 20), copper, [0, i * 0.055, 0], [Math.PI / 2, 0.15 * i, 0]);
      addCylinder(group, 0.08, 0.08, 0.42, 8, makeMaterial(0x343a3a, 0.86, 0.4), [0, 0.09, 0], [Math.PI / 2, 0, 0]);
    } else if (itemId === 'plastic') {
      const plastic = makeMaterial(def.color, 0.78, 0.04);
      addBox(group, [0.46, 0.54, 0.28], plastic, [0, 0.22, 0]);
      addBox(group, [0.22, 0.14, 0.1], plastic, [0, 0.55, 0]);
      addCylinder(group, 0.08, 0.09, 0.12, 8, makeMaterial(0x30393b, 0.85, 0.1), [0, 0.68, 0]);
      const handle = addMesh(group, new THREE.TorusGeometry(0.11, 0.035, 6, 12, Math.PI), plastic, [0.12, 0.48, 0], [0, Math.PI / 2, 0]);
      handle.rotation.z = Math.PI / 2;
    } else {
      const board = makeMaterial(0x315844, 0.72, 0.18);
      const dark = makeMaterial(0x242929, 0.68, 0.5);
      addBox(group, [0.62, 0.07, 0.42], board, [0, 0.05, 0]);
      for (const [cx, cz, s] of [[-0.16, -0.08, 0.14], [0.12, 0.08, 0.18], [0.22, -0.1, 0.09]]) addBox(group, [s, 0.09, s], dark, [cx, 0.13, cz]);
      for (let i = -2; i <= 2; i += 1) addCylinder(group, 0.015, 0.015, 0.17, 6, makeMaterial(0xb98a43, 0.5, 0.8), [i * 0.09, 0.05, 0.25], [Math.PI / 2, 0, 0]);
    }
    group.rotation.set(0.08 + Math.random() * 0.2, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.2);
    group.position.set(x, 0.32, z);
    group.scale.setScalar(1.05);
    group.userData.entity = { kind: 'scrap', id, itemId };
    group.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    this.scene.add(group);
    this.scrapMeshes.set(id, group);
    this.interactives.push(group);
  }

  collectScrap(id) {
    const mesh = this.scrapMeshes.get(id);
    if (!mesh) return null;
    const entity = mesh.userData.entity;
    const x = mesh.position.x;
    const z = mesh.position.z;
    this.scene.remove(mesh);
    this.scrapMeshes.delete(id);
    this.interactives = this.interactives.filter((item) => item !== mesh);
    disposeRoot(mesh);
    this.respawnQueue.push({ itemId: entity.itemId, x, z, at: performance.now() + 22000 + Math.random() * 16000 });
    return entity.itemId;
  }

  animateTransfer(path, itemId) {
    if (!Array.isArray(path) || path.length < 2) return;
    const def = ITEMS[itemId] ?? ITEMS.metal_scrap;
    const group = new THREE.Group();
    addBox(group, [0.3, 0.22, 0.34], makeMaterial(def.color, 0.65, itemId === 'plastic' ? 0.08 : 0.5), [0, 0, 0]);
    addBox(group, [0.16, 0.05, 0.36], makeMaterial(0x262c2d, 0.75, 0.48), [0, 0.14, 0]);
    group.position.set(path[0].x, 0.82, path[0].z);
    this.scene.add(group);
    this.packets.push({ mesh: group, path: path.map((p) => new THREE.Vector3(p.x, 0.82, p.z)), index: 1, speed: 5.8 });
  }

  interact() { if (this.currentTarget) this.callbacks.onInteract?.(this.currentTarget); }

  #updateTarget() {
    if (this.buildMode) {
      if (this.currentTarget) { this.currentTarget = null; this.callbacks.onTargetChange?.(null); }
      if (this.interactionMarker) this.interactionMarker.visible = false;
      return;
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactives, true);
    let entity = null;
    let chosenHit = null;
    for (const hit of hits) {
      if (hit.distance > INTERACT_DISTANCE) continue;
      const found = findEntity(hit.object);
      if (found) { entity = found; chosenHit = hit; break; }
    }
    if (chosenHit && this.interactionMarker) {
      this.interactionMarker.visible = true;
      this.interactionMarker.position.copy(chosenHit.point);
      const towardCamera = this.camera.position.clone().sub(chosenHit.point).normalize();
      this.interactionMarker.position.addScaledVector(towardCamera, 0.025);
      this.interactionMarker.lookAt(this.camera.position);
      const pulse = 1 + Math.sin(this.elapsed * 5) * 0.08;
      this.interactionMarker.scale.setScalar(pulse);
    } else if (this.interactionMarker) this.interactionMarker.visible = false;
    const changed = JSON.stringify(entity) !== JSON.stringify(this.currentTarget);
    if (changed) { this.currentTarget = entity; this.callbacks.onTargetChange?.(entity); }
  }

  #pointInsideStatic(x, z, padding = 0) {
    return this.staticColliders.some((box) => x + padding > box.minX && x - padding < box.maxX && z + padding > box.minZ && z - padding < box.maxZ);
  }

  #collides(x, z) {
    const boxes = [...this.staticColliders, ...this.buildingColliders.values()];
    return boxes.some((box) => x + PLAYER_RADIUS > box.minX && x - PLAYER_RADIUS < box.maxX && z + PLAYER_RADIUS > box.minZ && z - PLAYER_RADIUS < box.maxZ);
  }

  #updatePlayer(delta) {
    const locked = document.pointerLockElement === this.canvas && !this.callbacks.isOverlayOpen?.();
    const forward = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    const strafe = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    const moving = locked && (forward !== 0 || strafe !== 0);
    const sprint = moving && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'));
    const speed = (sprint ? 8.0 : 5.2) * (this.callbacks.getSprintMultiplier?.() ?? 1);
    if (moving) {
      const len = Math.hypot(forward, strafe) || 1;
      const f = forward / len;
      const s = strafe / len;
      const sin = Math.sin(this.player.yaw);
      const cos = Math.cos(this.player.yaw);
      const dx = (-sin * f + cos * s) * speed * delta;
      const dz = (-cos * f - sin * s) * speed * delta;
      const nextX = THREE.MathUtils.clamp(this.player.x + dx, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
      const nextZ = THREE.MathUtils.clamp(this.player.z + dz, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);
      if (!this.#collides(nextX, this.player.z)) this.player.x = nextX;
      if (!this.#collides(this.player.x, nextZ)) this.player.z = nextZ;
      this.player.walkPhase += delta * (sprint ? 12.5 : 9.2);
    }
    this.player.vy -= 15.5 * delta;
    this.player.y += this.player.vy * delta;
    if (this.player.y <= PLAYER_HEIGHT) { this.player.y = PLAYER_HEIGHT; this.player.vy = 0; this.player.grounded = true; }
    const bob = moving && this.player.grounded ? Math.sin(this.player.walkPhase) * (sprint ? 0.035 : 0.022) : 0;
    const sway = moving && this.player.grounded ? Math.cos(this.player.walkPhase * 0.5) * 0.009 : 0;
    this.camera.position.set(this.player.x, this.player.y + bob, this.player.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.player.yaw + sway;
    this.camera.rotation.x = this.player.pitch;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, sprint ? 80.5 : 76, 9, delta);
    this.camera.updateProjectionMatrix();
    const nextArea = this.player.x > 28 ? 'scrapyard' : 'base';
    if (nextArea !== this.currentArea) { this.currentArea = nextArea; this.callbacks.onAreaChange?.(nextArea); }
  }

  #updateRespawns(now) {
    const ready = this.respawnQueue.filter((entry) => entry.at <= now);
    this.respawnQueue = this.respawnQueue.filter((entry) => entry.at > now);
    for (const entry of ready) if (!this.#pointInsideStatic(entry.x, entry.z, 0.5)) this.spawnScrap(entry.itemId, entry.x, entry.z);
  }

  #updatePackets(delta) {
    for (let i = this.packets.length - 1; i >= 0; i -= 1) {
      const packet = this.packets[i];
      const target = packet.path[packet.index];
      if (!target) {
        this.scene.remove(packet.mesh);
        disposeRoot(packet.mesh);
        this.packets.splice(i, 1);
        continue;
      }
      const distance = packet.mesh.position.distanceTo(target);
      if (distance < 0.1) { packet.index += 1; continue; }
      const direction = target.clone().sub(packet.mesh.position).normalize();
      packet.mesh.position.addScaledVector(direction, Math.min(packet.speed * delta, distance));
      packet.mesh.rotation.y += delta * 3.3;
    }
  }

  #updateMachines(delta) {
    for (const mesh of this.buildingMeshes.values()) {
      const spinner = mesh.userData.spinner;
      const conveyor = mesh.userData.entity?.type === 'conveyor';
      if (spinner && (spinner.userData.active || conveyor)) {
        spinner.rotation.z += delta * 5.2;
        spinner.rotation.y += delta * 1.2;
      }
    }
  }

  #updateVisualFx(delta) {
    const dust = this.visualFx.dust;
    if (dust?.visible) {
      dust.rotation.y += delta * 0.004;
      dust.position.x = Math.sin(this.elapsed * 0.07) * 0.8;
    }
  }

  step() {
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const now = performance.now();
    this.elapsed += delta;
    this.#updatePlayer(delta);
    this.#updateTarget();
    if (this.buildMode) this.#updateBuildPreview();
    this.#updateRespawns(now);
    this.#updatePackets(delta);
    this.#updateMachines(delta);
    this.#updateVisualFx(delta);
    this.frameCounter += 1;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.frameCounter / this.fpsTimer);
      this.frameCounter = 0;
      this.fpsTimer = 0;
      this.callbacks.onFps?.(this.fps);
    }
    this.renderer.render(this.scene, this.camera);
    this.callbacks.onFrame?.(delta);
  }

  run() {
    if (this.started) return;
    this.started = true;
    this.renderer.setAnimationLoop(() => this.step());
  }
}
