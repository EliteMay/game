import * as THREE from 'three';
import { CROPS } from './config.js';
import { getCropProgress, isTileUnlocked, parseTileId } from './core.js';

const TILE_SIZE = 2.18;
const FIELD_ORIGIN_X = -7.1;
const FIELD_ORIGIN_Z = -2.9;
const cropMap = new Map(CROPS.map((crop) => [crop.id, crop]));

function tileWorldPosition(id) {
  const { x, z } = parseTileId(id);
  return new THREE.Vector3(FIELD_ORIGIN_X + x * TILE_SIZE, 0.08, FIELD_ORIGIN_Z + z * TILE_SIZE);
}

function disposeObject(root) {
  root.traverse((object) => {
    object.geometry?.dispose?.();
    if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose?.());
  });
}

function createLabelSprite(text, background = '#173025') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, 506, 122);
  ctx.fillStyle = '#f4f7ef';
  ctx.font = '700 48px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(4.8, 1.2, 1);
  return sprite;
}

export class FarmWorld {
  constructor(canvas, state, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.keys = new Set();
    this.pointerLocked = false;
    this.enabled = false;
    this.yaw = Math.PI;
    this.pitch = -0.28;
    this.target = null;
    this.tileMeshes = new Map();
    this.cropGroups = new Map();
    this.tileSignatures = new Map();
    this.lastState = state;
    this.lastFrame = performance.now();
    this.movedDistance = 0;
    this.moveTutorialSent = false;
    this.settings = { ...state.settings };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fc6d6);
    this.scene.fog = new THREE.Fog(0x9fc6d6, 32, 78);
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 10;
    this.interactives = [];

    this.buildLights();
    this.buildTerrain();
    this.buildFarmStructures();
    this.buildPlayer();
    this.buildFields(state);
    this.buildRain();
    this.bindEvents();
    this.resize();
    this.refresh(state, true);
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xcbe8f3, 0x5f633e, 1.65);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0c9, 2.4);
    this.sun.position.set(-18, 26, 14);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -28;
    this.sun.shadow.camera.right = 28;
    this.sun.shadow.camera.top = 28;
    this.sun.shadow.camera.bottom = -28;
    this.scene.add(this.sun);
  }

  buildTerrain() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), new THREE.MeshStandardMaterial({ color: 0x6f9b57, roughness: 0.96 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 70), new THREE.MeshStandardMaterial({ color: 0x8c846f, roughness: 1 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(15.8, 0.015, 0);
    road.receiveShadow = true;
    this.scene.add(road);
    const hills = new THREE.Group();
    for (let i = 0; i < 16; i += 1) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.6, 7), new THREE.MeshStandardMaterial({ color: 0x6d5037 }));
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.9 + (i % 3) * 0.12, 8, 7), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x4f7f46 : 0x5d8c4f }));
      trunk.position.y = 0.8;
      crown.position.y = 2.05;
      tree.add(trunk, crown);
      const angle = (i / 16) * Math.PI * 2;
      tree.position.set(Math.cos(angle) * 31, 0, Math.sin(angle) * 24);
      hills.add(tree);
    }
    this.scene.add(hills);
  }

  buildFarmStructures() {
    const barn = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(7, 4.2, 5.5), new THREE.MeshStandardMaterial({ color: 0xb64b3f, roughness: 0.82 }));
    body.position.y = 2.1;
    body.castShadow = body.receiveShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.15, 2.35, 4), new THREE.MeshStandardMaterial({ color: 0x3d443f, roughness: 0.88 }));
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.78;
    roof.position.y = 5.25;
    roof.castShadow = true;
    barn.add(body, roof);
    barn.position.set(-10.7, 0, -11.5);
    this.scene.add(barn);

    const silo = new THREE.Group();
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 6.7, 16), new THREE.MeshStandardMaterial({ color: 0xbcc1b8, metalness: 0.12, roughness: 0.68 }));
    tank.position.y = 3.35;
    tank.castShadow = true;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.3, 16), new THREE.MeshStandardMaterial({ color: 0x6a706a, roughness: 0.72 }));
    cap.position.y = 7.35;
    silo.add(tank, cap);
    silo.position.set(-4.6, 0, -12.5);
    this.scene.add(silo);

    this.shippingGroup = new THREE.Group();
    const bin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 2.2), new THREE.MeshStandardMaterial({ color: 0xa34436, roughness: 0.78 }));
    bin.position.y = 0.9;
    bin.castShadow = true;
    bin.userData = { type: 'shipping' };
    const lid = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 2.35), new THREE.MeshStandardMaterial({ color: 0x532c27, roughness: 0.8 }));
    lid.position.y = 1.88;
    lid.userData = { type: 'shipping' };
    const sign = createLabelSprite('SHIP / 出荷');
    sign.position.set(0, 3.2, 0);
    this.shippingGroup.add(bin, lid, sign);
    this.shippingGroup.position.set(4.8, 0, 8.4);
    this.scene.add(this.shippingGroup);
    this.interactives.push(bin, lid);

    const waterTank = new THREE.Group();
    const waterBody = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.8, 12), new THREE.MeshStandardMaterial({ color: 0x6e8f95, metalness: 0.08, roughness: 0.7 }));
    waterBody.position.y = 1.4;
    const waterSign = createLabelSprite('WATER', '#385d63');
    waterSign.position.y = 3.6;
    waterTank.add(waterBody, waterSign);
    waterTank.position.set(9.2, 0, -9.2);
    this.scene.add(waterTank);
  }

  buildPlayer() {
    this.player = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.9, 4, 8), new THREE.MeshStandardMaterial({ color: 0x263b35, roughness: 0.78 }));
    body.position.y = 1.08;
    body.castShadow = true;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0xd7b36f }));
    cap.position.y = 2.15;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 20), new THREE.MeshStandardMaterial({ color: 0xc89d55 }));
    brim.position.y = 2.04;
    this.player.add(body, cap, brim);
    this.player.position.set(0, 0, 9.6);
    this.scene.add(this.player);
  }

  buildFields(state) {
    const baseGeometry = new THREE.BoxGeometry(TILE_SIZE - 0.12, 0.18, TILE_SIZE - 0.12);
    for (const id of Object.keys(state.tiles)) {
      const material = new THREE.MeshStandardMaterial({ color: 0x6b8d4f, roughness: 0.98, emissive: 0x000000 });
      const mesh = new THREE.Mesh(baseGeometry.clone(), material);
      mesh.position.copy(tileWorldPosition(id));
      mesh.receiveShadow = true;
      mesh.userData = { type: 'tile', id };
      this.scene.add(mesh);
      this.tileMeshes.set(id, mesh);
      this.interactives.push(mesh);
      const cropGroup = new THREE.Group();
      cropGroup.position.copy(tileWorldPosition(id));
      cropGroup.position.y = 0.19;
      this.scene.add(cropGroup);
      this.cropGroups.set(id, cropGroup);
    }
  }

  buildRain() {
    const positions = new Float32Array(360 * 3);
    for (let i = 0; i < 360; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 16 + 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xcfe8f5, size: 0.07, transparent: true, opacity: 0.7 }));
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (event) => {
      if (['INPUT', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) return;
      this.keys.add(event.code);
      if (event.code === 'KeyE' && !event.repeat) this.interact();
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      this.callbacks.onPointerLock?.(this.pointerLocked);
    });
    document.addEventListener('mousemove', (event) => {
      if (!this.pointerLocked) return;
      const sensitivity = Number(this.settings.sensitivity || 0.75) * 0.0021;
      this.yaw -= event.movementX * sensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch - event.movementY * sensitivity, -0.9, 0.18);
    });
    this.canvas.addEventListener('click', () => {
      if (this.enabled && !this.pointerLocked) this.canvas.requestPointerLock?.();
    });
  }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  setSettings(settings) { this.settings = { ...this.settings, ...settings }; }
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.keys.clear();
      this.target = null;
      this.callbacks.onTarget?.(null);
    }
  }

  interact() {
    if (!this.enabled) return;
    if (!this.target) return this.callbacks.onMessage?.('照準を畑や出荷箱へ合わせてください');
    this.callbacks.onInteract?.(this.target);
  }

  updateMovement(dt) {
    const inputX = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const inputZ = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    if (!inputX && !inputZ) return;
    const direction = new THREE.Vector3(inputX, 0, -inputZ).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 7.2 : 4.6;
    const before = this.player.position.clone();
    this.player.position.addScaledVector(direction, speed * dt);
    this.player.position.x = THREE.MathUtils.clamp(this.player.position.x, -20, 22);
    this.player.position.z = THREE.MathUtils.clamp(this.player.position.z, -18, 19);
    this.player.rotation.y = Math.atan2(direction.x, direction.z);
    this.movedDistance += before.distanceTo(this.player.position);
    if (!this.moveTutorialSent && this.movedDistance > 1.25) {
      this.moveTutorialSent = true;
      this.callbacks.onMove?.();
    }
  }

  updateCamera(dt) {
    const distance = Number(this.settings.cameraDistance || 7.5);
    const horizontal = Math.cos(this.pitch) * distance;
    const desired = this.player.position.clone().add(new THREE.Vector3(Math.sin(this.yaw) * horizontal, 2.5 - Math.sin(this.pitch) * distance, Math.cos(this.yaw) * horizontal));
    this.camera.position.lerp(desired, this.settings.reducedMotion ? 1 : 1 - Math.pow(0.0008, dt));
    this.camera.lookAt(this.player.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
  }

  updateTarget() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    let next = null;
    for (const hit of this.raycaster.intersectObjects(this.interactives, false)) {
      const data = hit.object.userData;
      if (data.type === 'tile' && isTileUnlocked(this.lastState, data.id)) { next = { type: 'tile', id: data.id, distance: hit.distance }; break; }
      if (data.type === 'shipping') {
        const distance = this.player.position.distanceTo(this.shippingGroup.position);
        if (distance <= 4.2) next = { type: 'shipping', distance };
        break;
      }
    }
    const shippingDistance = this.player.position.distanceTo(this.shippingGroup.position);
    if (!next && shippingDistance <= 2.9) next = { type: 'shipping', distance: shippingDistance };
    if (this.target?.type === 'tile') this.tileMeshes.get(this.target.id)?.material.emissive.setHex(0x000000);
    this.target = next;
    if (this.target?.type === 'tile') this.tileMeshes.get(this.target.id)?.material.emissive.setHex(0x25220e);
    this.callbacks.onTarget?.(this.target);
  }

  updateAtmosphere(state, dt) {
    const time = (state.timeMinutes || 0) / 1440;
    const daylight = THREE.MathUtils.clamp(Math.sin((time - 0.23) * Math.PI * 2) * 0.55 + 0.62, 0.18, 1);
    this.hemi.intensity = 0.55 + daylight * 1.1;
    this.sun.intensity = 0.35 + daylight * 2.2;
    const sky = new THREE.Color(0x17273a).lerp(new THREE.Color(state.weatherId === 'sunny' ? 0xaacddb : 0x93aeb4), daylight);
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    const raining = state.weatherId === 'rain' || state.weatherId === 'heavy-rain';
    this.rain.visible = raining;
    if (!raining) return;
    const positions = this.rain.geometry.attributes.position;
    const speed = state.weatherId === 'heavy-rain' ? 16 : 11;
    for (let i = 0; i < positions.count; i += 1) {
      let y = positions.getY(i) - dt * speed;
      if (y < 0.5) y = 16 + Math.random() * 4;
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
    this.rain.position.x = this.player.position.x;
    this.rain.position.z = this.player.position.z;
  }

  refresh(state, force = false) {
    this.lastState = state;
    for (const [id, tile] of Object.entries(state.tiles)) {
      const mesh = this.tileMeshes.get(id);
      if (!mesh) continue;
      const unlocked = isTileUnlocked(state, id);
      mesh.visible = unlocked;
      const wet = tile.watered || state.weatherId === 'rain' || state.weatherId === 'heavy-rain';
      mesh.material.color.setHex(tile.soil === 'tilled' ? (wet ? 0x4a3423 : 0x6a4930) : 0x6d9450);
      const progress = getCropProgress(state, id);
      const signature = unlocked ? `${tile.cropId || '-'}:${progress.stage}:${wet ? 1 : 0}` : 'locked';
      if (force || this.tileSignatures.get(id) !== signature) {
        this.tileSignatures.set(id, signature);
        this.rebuildCrop(id, tile.cropId, progress.stage);
      }
    }
  }

  rebuildCrop(id, cropId, stage) {
    const group = this.cropGroups.get(id);
    if (!group) return;
    while (group.children.length) disposeObject(group.children.pop());
    if (!cropId || stage <= 0) return;
    const crop = cropMap.get(cropId);
    if (!crop) return;
    const scale = [0, 0.35, 0.58, 0.82, 1][stage] || 1;
    const offsets = [[-0.62,-0.62],[0,-0.62],[0.62,-0.62],[-0.62,0],[0,0],[0.62,0],[-0.62,0.62],[0,0.62],[0.62,0.62]];
    offsets.forEach(([x, z], index) => {
      const plant = this.createPlant(cropId, crop.color, scale, stage, index);
      plant.position.set(x, 0, z);
      group.add(plant);
    });
  }

  createPlant(cropId, color, scale, stage, index) {
    const plant = new THREE.Group();
    const leafMaterial = new THREE.MeshStandardMaterial({ color: cropId === 'wheat' ? 0x9c9c49 : 0x4b7d43, roughness: 0.86 });
    if (cropId === 'wheat') {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.25 * scale, 5), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
      stalk.position.y = 0.62 * scale;
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42 * scale, 5), new THREE.MeshStandardMaterial({ color: 0xe1c95d, roughness: 0.82 }));
      head.position.y = 1.23 * scale;
      plant.add(stalk, head);
    } else if (cropId === 'corn') {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 1.7 * scale, 6), leafMaterial);
      stalk.position.y = 0.85 * scale;
      const cob = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.25 * scale, 3, 6), new THREE.MeshStandardMaterial({ color, roughness: 0.82 }));
      cob.rotation.z = Math.PI / 2.6;
      cob.position.set(0.14, scale, 0);
      plant.add(stalk, cob);
    } else if (cropId === 'carrot') {
      const root = new THREE.Mesh(new THREE.ConeGeometry(0.12 * scale, 0.55 * scale, 7), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
      root.rotation.x = Math.PI;
      root.position.y = 0.12;
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.22 * scale, 0.62 * scale, 6), leafMaterial);
      leaves.position.y = 0.48 * scale;
      plant.add(root, leaves);
    } else {
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.26 * scale, 7, 5), leafMaterial);
      leaves.scale.y = 0.55;
      leaves.position.y = 0.25 * scale;
      plant.add(leaves);
      if (stage >= 3 && index % 2 === 0) {
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.09 * scale, 7, 5), new THREE.MeshStandardMaterial({ color, roughness: 0.78 }));
        fruit.position.set(0.12, 0.26 * scale, 0.05);
        plant.add(fruit);
      }
    }
    plant.scale.setScalar(0.95 + (index % 3) * 0.04);
    plant.traverse((object) => { if (object.isMesh) object.castShadow = true; });
    return plant;
  }

  loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    if (this.enabled) {
      this.updateMovement(dt);
      this.updateTarget();
    }
    this.updateCamera(dt);
    this.updateAtmosphere(this.lastState, dt);
    this.callbacks.onFrame?.(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  }
}
