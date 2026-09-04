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

const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.42;
const WORLD_BOUNDS = { minX: -24, maxX: 92, minZ: -34, maxZ: 34 };

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

function makeMaterial(color, roughness = 0.78, metalness = 0.2) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function cloneTransparent(root, opacity = 0.48) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.material = node.material.clone();
    node.material.transparent = true;
    node.material.opacity = opacity;
    node.material.depthWrite = false;
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

export class ScrapWorld {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xb6c5cc);
    this.scene.fog = new THREE.Fog(0xb6c5cc, 45, 125);

    this.camera = new THREE.PerspectiveCamera(76, 1, 0.08, 180);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = INTERACT_DISTANCE;
    this.pointer = new THREE.Vector2(0, 0);

    this.player = { x: 0, y: PLAYER_HEIGHT, z: 8, yaw: 0, pitch: 0, vy: 0, grounded: true };
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

    this.#bindEvents();
    this.#buildEnvironment();
    this.resize();
  }

  #bindEvents() {
    this.onResize = () => this.resize();
    this.onKeyDown = (event) => {
      if (event.repeat && ['KeyE', 'KeyB', 'KeyR'].includes(event.code)) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Space', 'Tab'].includes(event.code)) {
        event.preventDefault();
      }
      this.keys.add(event.code);
      if (event.code === 'Space' && this.player.grounded && document.pointerLockElement === this.canvas) {
        this.player.vy = 5.8;
        this.player.grounded = false;
      }
      if (event.code === 'KeyR' && this.buildMode) {
        this.buildRotation = (this.buildRotation + Math.PI / 2) % (Math.PI * 2);
      }
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
        } else {
          this.callbacks.onBuildInvalid?.();
        }
        return;
      }
      if (event.button === 2 && this.buildMode) {
        event.preventDefault();
        this.cancelBuild();
        return;
      }
      if (event.button === 0 && document.pointerLockElement !== this.canvas && !this.callbacks.isOverlayOpen?.()) {
        this.lockPointer();
      }
    };
    this.onContextMenu = (event) => {
      if (this.buildMode) event.preventDefault();
    };

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
    this.renderer.dispose();
  }

  #buildEnvironment() {
    const hemi = new THREE.HemisphereLight(0xeaf5ff, 0x5f6158, 2.25);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff4d8, 3.2);
    sun.position.set(24, 42, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -55;
    sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 55;
    sun.shadow.camera.bottom = -55;
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(130, 80),
      new THREE.MeshStandardMaterial({ color: 0x777a70, roughness: 1, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.x = 34;
    ground.receiveShadow = true;
    ground.userData.ground = true;
    this.scene.add(ground);
    this.ground = ground;

    const basePad = new THREE.Mesh(
      new THREE.PlaneGeometry(44, 44),
      new THREE.MeshStandardMaterial({ color: 0x5e625f, roughness: 0.92 }),
    );
    basePad.rotation.x = -Math.PI / 2;
    basePad.position.set(0, 0.012, 0);
    basePad.receiveShadow = true;
    this.scene.add(basePad);

    const grid = new THREE.GridHelper(40, 16, 0xc6b45c, 0x777b76);
    grid.position.y = 0.03;
    this.scene.add(grid);

    this.#buildBasePerimeter();
    this.#buildScrapyard();
    this.#buildSkyline();
  }

  #buildBasePerimeter() {
    const steel = makeMaterial(0x495057, 0.86, 0.28);
    const yellow = makeMaterial(0xc6a43d, 0.72, 0.18);

    const wallParts = [
      [-22, 0, 1, 3, 44],
      [0, -22, 44, 3, 1],
      [0, 22, 44, 3, 1],
      [22, -14, 1, 3, 16],
      [22, 14, 1, 3, 16],
    ];
    for (const [x, z, w, h, d] of wallParts) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), steel);
      wall.position.set(x, h / 2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
      this.staticColliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    }

    for (const z of [-5.8, 5.8]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.2, 0.8), yellow);
      post.position.set(23, 2.6, z);
      post.castShadow = true;
      this.scene.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1, 0.7, 12.4), yellow);
    beam.position.set(23, 5.0, 0);
    this.scene.add(beam);

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = '#202426';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#e5c95f';
    ctx.font = '700 46px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCRAP YARD →', 256, 64);
    const texture = new THREE.CanvasTexture(signCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.9), new THREE.MeshBasicMaterial({ map: texture }));
    sign.position.set(22.55, 4.8, 0);
    sign.rotation.y = -Math.PI / 2;
    this.scene.add(sign);
  }

  #buildScrapyard() {
    const random = seededRandom(9152026);
    const rust = [0x66574b, 0x6c6259, 0x795f4d, 0x4f5759, 0x5c514a];
    for (let i = 0; i < 48; i += 1) {
      const x = 30 + random() * 55;
      const z = -29 + random() * 58;
      const w = 1.4 + random() * 4.2;
      const h = 0.6 + random() * 2.2;
      const d = 1.2 + random() * 3.6;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), makeMaterial(rust[Math.floor(random() * rust.length)], 0.92, 0.34));
      mesh.position.set(x, h / 2, z);
      mesh.rotation.y = (random() - 0.5) * 1.2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      if (i < 26) {
        this.staticColliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }

    for (let i = 0; i < 6; i += 1) {
      const x = 38 + i * 8.4;
      const z = i % 2 === 0 ? -24 : 24;
      const container = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.7, 2.5), makeMaterial(i % 2 ? 0x485e61 : 0x76533f, 0.86, 0.32));
      container.position.set(x, 1.35, z);
      container.castShadow = true;
      container.receiveShadow = true;
      this.scene.add(container);
      this.staticColliders.push({ minX: x - 3.2, maxX: x + 3.2, minZ: z - 1.25, maxZ: z + 1.25 });
    }

    for (let i = 0; i < 42; i += 1) {
      const x = 31 + random() * 55;
      const z = -28 + random() * 56;
      this.spawnScrap(pickWeighted(random), x, z, `scrap-${i}`);
    }
  }

  #buildSkyline() {
    const material = makeMaterial(0x59605f, 0.96, 0.12);
    for (let i = 0; i < 9; i += 1) {
      const width = 5 + (i % 3) * 2.4;
      const height = 4 + (i % 4) * 2.2;
      const depth = 5 + ((i + 1) % 3) * 2;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      mesh.position.set(98 + i * 8, height / 2, -25 + (i % 4) * 16);
      this.scene.add(mesh);
    }
    for (const z of [-16, 12]) {
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 14, 12), makeMaterial(0x53585a, 0.9, 0.24));
      chimney.position.set(91, 7, z);
      this.scene.add(chimney);
    }
  }

  setPlayerState(player) {
    if (!player) return;
    this.player.x = Number.isFinite(Number(player.x)) ? Number(player.x) : this.player.x;
    this.player.y = PLAYER_HEIGHT;
    this.player.z = Number.isFinite(Number(player.z)) ? Number(player.z) : this.player.z;
    this.player.yaw = Number.isFinite(Number(player.yaw)) ? Number(player.yaw) : 0;
  }

  getPlayerState() {
    return { x: this.player.x, y: PLAYER_HEIGHT, z: this.player.z, yaw: this.player.yaw };
  }

  lockPointer() {
    if (this.callbacks.isOverlayOpen?.()) return;
    this.canvas.requestPointerLock?.();
  }

  unlockPointer() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
  }

  setQuality(quality) {
    const ratio = quality === 'low' ? 1 : quality === 'medium' ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(ratio);
    this.renderer.shadowMap.enabled = quality !== 'low';
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
    for (const mesh of this.buildingMeshes.values()) this.scene.remove(mesh);
    this.buildingMeshes.clear();
    this.buildingColliders.clear();
    this.occupied.clear();
    this.interactives = this.interactives.filter((mesh) => findEntity(mesh)?.kind !== 'building');
    for (const building of buildings) this.addBuilding(building);
  }

  addBuilding(building) {
    const mesh = this.#createBuildingMesh(building.type);
    mesh.position.set(building.x, 0, building.z);
    mesh.rotation.y = building.rotation || 0;
    mesh.userData.entity = { kind: 'building', id: building.id, type: building.type };
    mesh.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    this.scene.add(mesh);
    this.buildingMeshes.set(building.id, mesh);
    this.interactives.push(mesh);
    this.occupied.add(positionKey(building.x, building.z));
    if (building.type !== 'conveyor') {
      this.buildingColliders.set(building.id, {
        minX: building.x - GRID_SIZE * 0.38,
        maxX: building.x + GRID_SIZE * 0.38,
        minZ: building.z - GRID_SIZE * 0.38,
        maxZ: building.z + GRID_SIZE * 0.38,
      });
    }
    return mesh;
  }

  updateBuildingState(id, { active = false, progress = 0 } = {}) {
    const mesh = this.buildingMeshes.get(id);
    if (!mesh) return;
    const light = mesh.userData.statusLight;
    if (light?.material?.emissive) {
      light.material.emissive.setHex(active ? 0x6ecf86 : 0x31383a);
      light.material.emissiveIntensity = active ? 2.5 : 0.6;
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
  }

  #createBuildingMesh(type) {
    const def = BUILDINGS[type];
    const group = new THREE.Group();
    const dark = makeMaterial(0x2d3437, 0.72, 0.48);
    const body = makeMaterial(def?.color ?? 0x667077, 0.74, 0.38);
    const accent = makeMaterial(0xc5a943, 0.64, 0.24);

    const add = (geometry, material, x, y, z) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    };

    if (type === 'conveyor') {
      add(new THREE.BoxGeometry(2.35, 0.18, 1.15), dark, 0, 0.34, 0);
      const belt = add(new THREE.BoxGeometry(2.15, 0.08, 0.82), makeMaterial(0x384044, 0.96, 0.18), 0, 0.49, 0);
      for (const x of [-0.72, 0, 0.72]) {
        const arrow = add(new THREE.ConeGeometry(0.16, 0.36, 3), accent, x, 0.57, 0);
        arrow.rotation.z = -Math.PI / 2;
      }
      group.userData.spinner = belt;
      return group;
    }

    if (type === 'hopper') {
      add(new THREE.BoxGeometry(2.05, 0.5, 2.05), dark, 0, 0.25, 0);
      const hopper = add(new THREE.CylinderGeometry(1.05, 0.45, 1.45, 4, 1, false), body, 0, 1.15, 0);
      hopper.rotation.y = Math.PI / 4;
      add(new THREE.BoxGeometry(0.7, 0.25, 0.7), accent, 0, 1.95, 0);
    } else if (type === 'seller') {
      add(new THREE.BoxGeometry(2.0, 2.15, 1.45), body, 0, 1.08, 0);
      add(new THREE.BoxGeometry(1.45, 0.75, 0.08), new THREE.MeshStandardMaterial({ color: 0x182126, emissive: 0x2d7c78, emissiveIntensity: 1.7 }), 0, 1.35, -0.76);
      add(new THREE.BoxGeometry(1.15, 0.14, 0.7), accent, 0, 0.62, -0.68);
    } else if (type === 'crusher') {
      add(new THREE.BoxGeometry(2.1, 0.45, 1.9), dark, 0, 0.23, 0);
      add(new THREE.BoxGeometry(1.8, 1.1, 1.6), body, 0, 1.0, 0);
      const spinner = add(new THREE.CylinderGeometry(0.4, 0.4, 1.9, 12), dark, 0, 1.15, -0.86);
      spinner.rotation.z = Math.PI / 2;
      group.userData.spinner = spinner;
    } else if (type === 'smelter') {
      add(new THREE.CylinderGeometry(0.95, 1.12, 1.7, 14), body, 0, 0.95, 0);
      add(new THREE.CylinderGeometry(0.36, 0.44, 1.55, 12), dark, 0.48, 2.32, 0.2);
      add(new THREE.BoxGeometry(0.85, 0.72, 0.08), new THREE.MeshStandardMaterial({ color: 0x42352f, emissive: 0xff7a28, emissiveIntensity: 1.3 }), 0, 0.95, -1.0);
    } else if (type === 'storage') {
      add(new THREE.BoxGeometry(2.1, 1.75, 1.9), body, 0, 0.9, 0);
      add(new THREE.BoxGeometry(1.6, 0.12, 1.94), accent, 0, 1.4, 0);
      add(new THREE.BoxGeometry(1.6, 0.12, 1.94), accent, 0, 0.55, 0);
    }

    if (type !== 'hopper') {
      const light = add(new THREE.BoxGeometry(0.38, 0.16, 0.08), new THREE.MeshStandardMaterial({ color: 0x34403b, emissive: 0x31383a, emissiveIntensity: 0.6 }), 0.72, 1.78, -0.78);
      group.userData.statusLight = light;
    }
    const gauge = add(new THREE.BoxGeometry(1.1, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: 0x8ecb8a, emissive: 0x487148, emissiveIntensity: 0.8 }), -0.28, 0.42, -0.98);
    gauge.geometry.translate(0.55, 0, 0);
    gauge.scale.x = 0.02;
    group.userData.gauge = gauge;

    return group;
  }

  startBuild(type) {
    if (!BUILDINGS[type]?.buildable) return;
    this.cancelBuild();
    this.buildMode = type;
    this.buildRotation = 0;
    this.buildPreview = this.#createBuildingMesh(type);
    cloneTransparent(this.buildPreview);
    this.scene.add(this.buildPreview);
    this.callbacks.onBuildModeChange?.(type);
    this.#updateBuildPreview();
    this.lockPointer();
  }

  cancelBuild() {
    if (this.buildPreview) this.scene.remove(this.buildPreview);
    this.buildPreview = null;
    this.buildMode = null;
    this.canPlacePreview = false;
    this.callbacks.onBuildModeChange?.(null);
  }

  #updateBuildPreview() {
    if (!this.buildPreview || !this.buildMode) return;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const distance = Math.min(8, 5.5 / Math.max(0.2, Math.abs(direction.y) + 0.45));
    const targetX = this.player.x + direction.x * distance;
    const targetZ = this.player.z + direction.z * distance;
    const x = snapToGrid(targetX);
    const z = snapToGrid(targetZ);
    this.buildPreview.position.set(x, 0, z);
    this.buildPreview.rotation.y = this.buildRotation;
    const inBase = Math.abs(x) <= BASE_LIMIT && Math.abs(z) <= BASE_LIMIT;
    const occupied = this.occupied.has(positionKey(x, z));
    const notOnPlayer = Math.hypot(x - this.player.x, z - this.player.z) > 1.7;
    this.canPlacePreview = inBase && !occupied && notOnPlayer;
    this.buildPreview.traverse((node) => {
      if (!node.isMesh) return;
      if (node.material?.color) {
        const baseColor = node.userData.baseColor ?? node.material.color.getHex();
        node.userData.baseColor = baseColor;
        node.material.color.setHex(this.canPlacePreview ? baseColor : 0x8f3e3e);
      }
    });
    this.callbacks.onBuildPreview?.({ type: this.buildMode, x, z, rotation: this.buildRotation, valid: this.canPlacePreview });
  }

  spawnScrap(itemId, x, z, id = `scrap-${Math.random().toString(36).slice(2)}`) {
    const def = ITEMS[itemId];
    if (!def) return;
    const group = new THREE.Group();
    const material = makeMaterial(def.color, 0.86, itemId === 'plastic' ? 0.05 : 0.56);
    const shape = itemId === 'copper_wire'
      ? new THREE.TorusGeometry(0.28, 0.07, 8, 18)
      : itemId === 'e_waste'
        ? new THREE.BoxGeometry(0.58, 0.18, 0.42)
        : itemId === 'plastic'
          ? new THREE.CylinderGeometry(0.18, 0.24, 0.55, 8)
          : new THREE.BoxGeometry(0.55, 0.25, 0.36);
    const main = new THREE.Mesh(shape, material);
    main.rotation.set(Math.random(), Math.random(), Math.random());
    main.castShadow = true;
    group.add(main);
    if (itemId === 'e_waste') {
      const chip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.16), makeMaterial(0x243e31, 0.7, 0.18));
      chip.position.y = 0.13;
      group.add(chip);
    }
    group.position.set(x, 0.38, z);
    group.userData.entity = { kind: 'scrap', id, itemId };
    this.scene.add(group);
    this.scrapMeshes.set(id, group);
    this.interactives.push(group);
  }

  collectScrap(id) {
    const mesh = this.scrapMeshes.get(id);
    if (!mesh) return null;
    const entity = mesh.userData.entity;
    this.scene.remove(mesh);
    this.scrapMeshes.delete(id);
    this.interactives = this.interactives.filter((item) => item !== mesh);
    this.respawnQueue.push({ itemId: entity.itemId, x: mesh.position.x, z: mesh.position.z, at: performance.now() + 22000 + Math.random() * 16000 });
    return entity.itemId;
  }

  animateTransfer(path, itemId) {
    if (!Array.isArray(path) || path.length < 2) return;
    const def = ITEMS[itemId] ?? ITEMS.metal_scrap;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.7, metalness: 0.4 }));
    mesh.castShadow = true;
    mesh.position.set(path[0].x, 0.88, path[0].z);
    this.scene.add(mesh);
    this.packets.push({ mesh, path: path.map((p) => new THREE.Vector3(p.x, 0.88, p.z)), index: 1, speed: 5.8 });
  }

  interact() {
    if (!this.currentTarget) return;
    this.callbacks.onInteract?.(this.currentTarget);
  }

  #updateTarget() {
    if (this.buildMode) {
      if (this.currentTarget) {
        this.currentTarget = null;
        this.callbacks.onTargetChange?.(null);
      }
      return;
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactives, true);
    let entity = null;
    for (const hit of hits) {
      if (hit.distance > INTERACT_DISTANCE) continue;
      const found = findEntity(hit.object);
      if (found) {
        entity = found;
        break;
      }
    }
    const changed = JSON.stringify(entity) !== JSON.stringify(this.currentTarget);
    if (changed) {
      this.currentTarget = entity;
      this.callbacks.onTargetChange?.(entity);
    }
  }

  #collides(x, z) {
    const boxes = [...this.staticColliders, ...this.buildingColliders.values()];
    return boxes.some((box) => x + PLAYER_RADIUS > box.minX && x - PLAYER_RADIUS < box.maxX && z + PLAYER_RADIUS > box.minZ && z - PLAYER_RADIUS < box.maxZ);
  }

  #updatePlayer(delta) {
    if (document.pointerLockElement !== this.canvas || this.callbacks.isOverlayOpen?.()) return;
    const forward = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    const strafe = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = sprint ? 8.0 : 5.2;
    if (forward !== 0 || strafe !== 0) {
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
    }

    this.player.vy -= 15.5 * delta;
    this.player.y += this.player.vy * delta;
    if (this.player.y <= PLAYER_HEIGHT) {
      this.player.y = PLAYER_HEIGHT;
      this.player.vy = 0;
      this.player.grounded = true;
    }

    this.camera.position.set(this.player.x, this.player.y, this.player.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.player.yaw;
    this.camera.rotation.x = this.player.pitch;

    const nextArea = this.player.x > 28 ? 'scrapyard' : 'base';
    if (nextArea !== this.currentArea) {
      this.currentArea = nextArea;
      this.callbacks.onAreaChange?.(nextArea);
    }
  }

  #updateRespawns(now) {
    const ready = this.respawnQueue.filter((entry) => entry.at <= now);
    this.respawnQueue = this.respawnQueue.filter((entry) => entry.at > now);
    for (const entry of ready) this.spawnScrap(entry.itemId, entry.x, entry.z);
  }

  #updatePackets(delta) {
    for (let i = this.packets.length - 1; i >= 0; i -= 1) {
      const packet = this.packets[i];
      const target = packet.path[packet.index];
      if (!target) {
        this.scene.remove(packet.mesh);
        this.packets.splice(i, 1);
        continue;
      }
      const distance = packet.mesh.position.distanceTo(target);
      if (distance < 0.12) {
        packet.index += 1;
        continue;
      }
      const direction = target.clone().sub(packet.mesh.position).normalize();
      packet.mesh.position.addScaledVector(direction, Math.min(packet.speed * delta, distance));
      packet.mesh.rotation.y += delta * 4;
    }
  }

  #updateMachines(delta) {
    for (const mesh of this.buildingMeshes.values()) {
      const spinner = mesh.userData.spinner;
      if (spinner?.userData.active) spinner.rotation.x += delta * 3.2;
    }
  }

  step() {
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const now = performance.now();
    this.#updatePlayer(delta);
    this.#updateTarget();
    if (this.buildMode) this.#updateBuildPreview();
    this.#updateRespawns(now);
    this.#updatePackets(delta);
    this.#updateMachines(delta);

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
