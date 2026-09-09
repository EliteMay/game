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
    if (object.material) {
      (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose?.());
    }
  });
}

function seeded(index, salt = 0) {
  const value = Math.sin(index * 91.731 + salt * 37.117) * 43758.5453;
  return value - Math.floor(value);
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

function mesh(geometry, material, { x = 0, y = 0, z = 0, cast = true, receive = false } = {}) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = cast;
  object.receiveShadow = receive;
  return object;
}

export class FarmWorld {
  constructor(canvas, state, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.keys = new Set();
    this.enabled = false;
    this.cameraDragging = false;
    this.yaw = 0;
    this.pitch = -0.52;
    this.target = null;
    this.tileMeshes = new Map();
    this.cropGroups = new Map();
    this.furrowGroups = new Map();
    this.tileSignatures = new Map();
    this.lastState = state;
    this.lastFrame = performance.now();
    this.movedDistance = 0;
    this.moveTutorialSent = false;
    this.walkPhase = 0;
    this.isMoving = false;
    this.settings = { ...state.settings };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa9cfdb);
    this.scene.fog = new THREE.Fog(0xa9cfdb, 38, 88);
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 130);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 11;
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
    this.canvas.style.cursor = 'grab';
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xd5eef6, 0x53643e, 1.72);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff1cc, 2.55);
    this.sun.position.set(-18, 26, 14);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1536, 1536);
    this.sun.shadow.camera.left = -30;
    this.sun.shadow.camera.right = 30;
    this.sun.shadow.camera.top = 30;
    this.sun.shadow.camera.bottom = -30;
    this.sun.shadow.bias = -0.00015;
    this.scene.add(this.sun);

    const fill = new THREE.DirectionalLight(0xc8ddc8, 0.38);
    fill.position.set(18, 10, -16);
    this.scene.add(fill);
  }

  buildTerrain() {
    this.groundMaterial = new THREE.MeshStandardMaterial({ color: 0x719e58, roughness: 0.96 });
    const ground = mesh(new THREE.PlaneGeometry(96, 76), this.groundMaterial, { receive: true });
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    const apron = mesh(
      new THREE.PlaneGeometry(18.4, 11.8),
      new THREE.MeshStandardMaterial({ color: 0x78985a, roughness: 1 }),
      { x: -0.6, y: 0.012, z: 0.4, cast: false, receive: true },
    );
    apron.rotation.x = -Math.PI / 2;
    this.scene.add(apron);

    const road = mesh(
      new THREE.PlaneGeometry(8, 76),
      new THREE.MeshStandardMaterial({ color: 0x958c76, roughness: 1 }),
      { x: 15.8, y: 0.016, receive: true },
    );
    road.rotation.x = -Math.PI / 2;
    this.scene.add(road);

    this.buildPaths();
    this.buildFence();
    this.buildGroundDetails();
    this.buildTreeLine();
  }

  buildPaths() {
    const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xb39b73, roughness: 1 });
    const pathA = mesh(new THREE.PlaneGeometry(3.1, 16), pathMaterial, { x: 3.1, y: 0.025, z: 5.1, cast: false, receive: true });
    pathA.rotation.x = -Math.PI / 2;
    pathA.rotation.z = -0.08;
    this.scene.add(pathA);

    const pathB = mesh(new THREE.PlaneGeometry(12, 2.2), pathMaterial, { x: 8.8, y: 0.027, z: 8.5, cast: false, receive: true });
    pathB.rotation.x = -Math.PI / 2;
    this.scene.add(pathB);

    const pebbleMaterial = new THREE.MeshStandardMaterial({ color: 0x807866, roughness: 1 });
    for (let i = 0; i < 34; i += 1) {
      const radius = 0.09 + seeded(i, 4) * 0.14;
      const pebble = mesh(new THREE.CylinderGeometry(radius, radius * 1.15, 0.035, 7), pebbleMaterial, {
        x: 2.4 + (seeded(i, 5) - 0.5) * 2.4,
        y: 0.055,
        z: -1.8 + seeded(i, 6) * 14.5,
        cast: false,
      });
      pebble.rotation.y = seeded(i, 7) * Math.PI;
      this.scene.add(pebble);
    }
  }

  buildFence() {
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a623f, roughness: 0.92 });
    const postGeometry = new THREE.BoxGeometry(0.18, 1.35, 0.18);
    const railXGeometry = new THREE.BoxGeometry(2.2, 0.12, 0.12);
    const railZGeometry = new THREE.BoxGeometry(0.12, 0.12, 2.2);

    const minX = FIELD_ORIGIN_X - 1.25;
    const maxX = FIELD_ORIGIN_X + 6 * TILE_SIZE + 1.25;
    const minZ = FIELD_ORIGIN_Z - 1.25;
    const maxZ = FIELD_ORIGIN_Z + 3 * TILE_SIZE + 1.25;

    for (let x = minX; x <= maxX + 0.01; x += 2.2) {
      for (const z of [minZ, maxZ]) {
        const post = mesh(postGeometry, wood, { x, y: 0.68, z });
        this.scene.add(post);
        if (x + 2.2 <= maxX + 0.5) {
          for (const y of [0.48, 0.92]) {
            this.scene.add(mesh(railXGeometry, wood, { x: x + 1.1, y, z }));
          }
        }
      }
    }

    for (let z = minZ + 2.2; z < maxZ - 0.2; z += 2.2) {
      for (const x of [minX, maxX]) {
        this.scene.add(mesh(postGeometry, wood, { x, y: 0.68, z }));
        for (const y of [0.48, 0.92]) {
          this.scene.add(mesh(railZGeometry, wood, { x, y, z: z - 1.1 }));
        }
      }
    }
  }

  buildGroundDetails() {
    const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x5d8e49, roughness: 0.94 });
    const dryGrassMaterial = new THREE.MeshStandardMaterial({ color: 0x9cad62, roughness: 0.96 });
    const bladeGeometry = new THREE.ConeGeometry(0.12, 0.72, 4);
    const clumps = new THREE.Group();

    for (let i = 0; i < 125; i += 1) {
      const x = -23 + seeded(i, 11) * 45;
      const z = -20 + seeded(i, 12) * 39;
      const nearField = x > -10 && x < 7.5 && z > -6.5 && z < 6.2;
      const nearRoad = x > 11.2;
      if (nearField || nearRoad) continue;

      const blade = mesh(bladeGeometry, i % 4 === 0 ? dryGrassMaterial : grassMaterial, {
        x,
        y: 0.33,
        z,
        cast: false,
      });
      blade.scale.set(0.7 + seeded(i, 13) * 0.7, 0.75 + seeded(i, 14) * 0.8, 0.7 + seeded(i, 15) * 0.7);
      blade.rotation.y = seeded(i, 16) * Math.PI;
      clumps.add(blade);
    }
    this.scene.add(clumps);

    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x777c6d, roughness: 0.98 });
    for (let i = 0; i < 16; i += 1) {
      const rock = mesh(new THREE.DodecahedronGeometry(0.28 + seeded(i, 20) * 0.26, 0), rockMaterial, {
        x: -21 + seeded(i, 21) * 42,
        y: 0.2,
        z: -19 + seeded(i, 22) * 37,
      });
      rock.scale.y = 0.55 + seeded(i, 23) * 0.35;
      rock.rotation.y = seeded(i, 24) * Math.PI;
      this.scene.add(rock);
    }
  }

  buildTreeLine() {
    const treeLine = new THREE.Group();
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6c4f34, roughness: 0.95 });
    const foliageA = new THREE.MeshStandardMaterial({ color: 0x4e7f45, roughness: 0.9 });
    const foliageB = new THREE.MeshStandardMaterial({ color: 0x608d4e, roughness: 0.9 });

    for (let i = 0; i < 20; i += 1) {
      const tree = new THREE.Group();
      const height = 1.6 + seeded(i, 30) * 0.7;
      const trunk = mesh(new THREE.CylinderGeometry(0.16, 0.27, height, 7), trunkMaterial, { y: height / 2 });
      const crownMaterial = i % 2 ? foliageA : foliageB;
      const crownA = mesh(new THREE.IcosahedronGeometry(0.85 + seeded(i, 31) * 0.22, 1), crownMaterial, { x: -0.28, y: height + 0.55, z: 0.04 });
      const crownB = mesh(new THREE.IcosahedronGeometry(0.78 + seeded(i, 32) * 0.2, 1), crownMaterial, { x: 0.34, y: height + 0.62, z: -0.08 });
      const crownC = mesh(new THREE.IcosahedronGeometry(0.7 + seeded(i, 33) * 0.18, 1), crownMaterial, { y: height + 1.08, z: 0.08 });
      tree.add(trunk, crownA, crownB, crownC);

      const angle = (i / 20) * Math.PI * 2;
      tree.position.set(Math.cos(angle) * 33, 0, Math.sin(angle) * 26);
      tree.rotation.y = seeded(i, 34) * Math.PI;
      treeLine.add(tree);
    }
    this.scene.add(treeLine);
  }

  buildFarmStructures() {
    const red = new THREE.MeshStandardMaterial({ color: 0xb84d3f, roughness: 0.82 });
    const redDark = new THREE.MeshStandardMaterial({ color: 0x7d322d, roughness: 0.88 });
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x3d4540, roughness: 0.86 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xe1ddc9, roughness: 0.82 });

    const barn = new THREE.Group();
    const foundation = mesh(new THREE.BoxGeometry(7.4, 0.3, 5.9), new THREE.MeshStandardMaterial({ color: 0x777269, roughness: 1 }), { y: 0.15, receive: true });
    const body = mesh(new THREE.BoxGeometry(7, 4.2, 5.5), red, { y: 2.25, receive: true });
    const roof = mesh(new THREE.ConeGeometry(5.15, 2.35, 4), roofMaterial, { y: 5.4 });
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.78;

    const leftDoor = mesh(new THREE.BoxGeometry(1.55, 2.85, 0.16), redDark, { x: -0.82, y: 1.55, z: 2.84 });
    const rightDoor = mesh(new THREE.BoxGeometry(1.55, 2.85, 0.16), redDark, { x: 0.82, y: 1.55, z: 2.84 });
    const doorCrossA = mesh(new THREE.BoxGeometry(1.9, 0.11, 0.08), trim, { x: -0.82, y: 1.55, z: 2.94 });
    doorCrossA.rotation.z = Math.PI / 4;
    const doorCrossB = mesh(new THREE.BoxGeometry(1.9, 0.11, 0.08), trim, { x: -0.82, y: 1.55, z: 2.94 });
    doorCrossB.rotation.z = -Math.PI / 4;
    const doorCrossC = doorCrossA.clone();
    doorCrossC.position.x = 0.82;
    const doorCrossD = doorCrossB.clone();
    doorCrossD.position.x = 0.82;

    const loftWindow = mesh(new THREE.CircleGeometry(0.54, 18), new THREE.MeshStandardMaterial({ color: 0x75959a, roughness: 0.35 }), { y: 4.2, z: 2.87, cast: false });
    const loftTrim = mesh(new THREE.RingGeometry(0.57, 0.68, 20), trim, { y: 4.2, z: 2.9, cast: false });
    barn.add(foundation, body, roof, leftDoor, rightDoor, doorCrossA, doorCrossB, doorCrossC, doorCrossD, loftWindow, loftTrim);

    for (const x of [-3.47, 3.47]) {
      const corner = mesh(new THREE.BoxGeometry(0.18, 4.1, 0.18), trim, { x, y: 2.28, z: 2.74 });
      barn.add(corner);
    }

    barn.position.set(-10.7, 0, -11.5);
    this.scene.add(barn);

    const silo = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0xc2c7c0, metalness: 0.18, roughness: 0.63 });
    const metalDark = new THREE.MeshStandardMaterial({ color: 0x6f7770, metalness: 0.16, roughness: 0.7 });
    const tank = mesh(new THREE.CylinderGeometry(1.6, 1.6, 6.7, 18), metal, { y: 3.35 });
    const cap = mesh(new THREE.ConeGeometry(1.75, 1.3, 18), metalDark, { y: 7.35 });
    silo.add(tank, cap);
    for (const y of [1.1, 2.4, 3.7, 5, 6.15]) {
      const ring = mesh(new THREE.TorusGeometry(1.63, 0.055, 6, 20), metalDark, { y, cast: false });
      ring.rotation.x = Math.PI / 2;
      silo.add(ring);
    }
    const ladderRailA = mesh(new THREE.BoxGeometry(0.06, 5.6, 0.06), metalDark, { x: 1.54, y: 3.1, z: 0.22 });
    const ladderRailB = ladderRailA.clone();
    ladderRailB.position.z = -0.22;
    silo.add(ladderRailA, ladderRailB);
    for (let y = 0.65; y < 5.75; y += 0.42) {
      silo.add(mesh(new THREE.BoxGeometry(0.06, 0.05, 0.48), metalDark, { x: 1.58, y, cast: false }));
    }
    silo.position.set(-4.6, 0, -12.5);
    this.scene.add(silo);

    this.shippingGroup = new THREE.Group();
    const bin = mesh(new THREE.BoxGeometry(2.6, 1.8, 2.2), new THREE.MeshStandardMaterial({ color: 0xa34436, roughness: 0.78 }), { y: 0.9 });
    bin.userData = { type: 'shipping' };
    const lid = mesh(new THREE.BoxGeometry(2.8, 0.18, 2.35), new THREE.MeshStandardMaterial({ color: 0x532c27, roughness: 0.8 }), { y: 1.88 });
    lid.userData = { type: 'shipping' };
    const sign = createLabelSprite('SHIP / 出荷');
    sign.position.set(0, 3.25, 0);
    this.shippingGroup.add(bin, lid, sign);

    const crateMaterial = new THREE.MeshStandardMaterial({ color: 0x9d7248, roughness: 0.92 });
    for (const [x, y, z, scale] of [[-2.15, 0.4, 0.6, 0.8], [-2.2, 0.35, -0.55, 0.7], [2, 0.35, -0.35, 0.72]]) {
      const crate = mesh(new THREE.BoxGeometry(1, 1, 1), crateMaterial, { x, y, z });
      crate.scale.setScalar(scale);
      this.shippingGroup.add(crate);
    }
    this.shippingGroup.position.set(4.8, 0, 8.4);
    this.scene.add(this.shippingGroup);
    this.interactives.push(bin, lid);

    const waterTank = new THREE.Group();
    const tankMaterial = new THREE.MeshStandardMaterial({ color: 0x6f949b, metalness: 0.1, roughness: 0.68 });
    const waterBody = mesh(new THREE.CylinderGeometry(1.18, 1.18, 2.95, 14), tankMaterial, { y: 2.25 });
    const tankCap = mesh(new THREE.CylinderGeometry(1.23, 1.23, 0.16, 14), metalDark, { y: 3.76 });
    const waterSign = createLabelSprite('WATER', '#385d63');
    waterSign.position.y = 4.6;
    waterTank.add(waterBody, tankCap, waterSign);
    for (const x of [-0.72, 0.72]) {
      for (const z of [-0.58, 0.58]) {
        waterTank.add(mesh(new THREE.BoxGeometry(0.12, 1.55, 0.12), metalDark, { x, y: 0.78, z }));
      }
    }
    const pipe = mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 8), metalDark, { x: 1.12, y: 1.15, z: 0.35 });
    pipe.rotation.z = Math.PI / 2;
    waterTank.add(pipe);
    waterTank.position.set(9.2, 0, -9.2);
    this.scene.add(waterTank);

    this.buildYardProps();
  }

  buildYardProps() {
    const hayMaterial = new THREE.MeshStandardMaterial({ color: 0xd5b85e, roughness: 0.95 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x8d6541, roughness: 0.92 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3f443f, roughness: 0.86 });

    for (const [x, z, rot] of [[-14.8, -7.5, 0.15], [-13.5, -7.2, -0.12], [-12.2, -7.7, 0.05]]) {
      const bale = mesh(new THREE.BoxGeometry(1.6, 0.85, 0.9), hayMaterial, { x, y: 0.43, z });
      bale.rotation.y = rot;
      this.scene.add(bale);
    }

    const cart = new THREE.Group();
    const bed = mesh(new THREE.BoxGeometry(2.5, 0.32, 1.35), wood, { y: 0.9 });
    cart.add(bed);
    for (const x of [-1.05, 1.05]) {
      for (const z of [-0.72, 0.72]) {
        const wheel = mesh(new THREE.TorusGeometry(0.34, 0.09, 8, 16), dark, { x, y: 0.56, z });
        wheel.rotation.y = Math.PI / 2;
        cart.add(wheel);
      }
    }
    const handle = mesh(new THREE.BoxGeometry(1.8, 0.1, 0.1), wood, { x: 2.0, y: 0.95 });
    handle.rotation.z = -0.08;
    cart.add(handle);
    cart.position.set(8.3, 0, 5.4);
    cart.rotation.y = -0.35;
    this.scene.add(cart);
  }

  buildPlayer() {
    this.player = new THREE.Group();
    this.playerModel = new THREE.Group();
    this.player.add(this.playerModel);

    const skin = new THREE.MeshStandardMaterial({ color: 0xd3a47d, roughness: 0.88 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0xd3e1c2, roughness: 0.86 });
    const overalls = new THREE.MeshStandardMaterial({ color: 0x365c60, roughness: 0.82 });
    const denimDark = new THREE.MeshStandardMaterial({ color: 0x294448, roughness: 0.84 });
    const boots = new THREE.MeshStandardMaterial({ color: 0x42352b, roughness: 0.94 });
    const straw = new THREE.MeshStandardMaterial({ color: 0xd4ae63, roughness: 0.9 });

    const torso = mesh(new THREE.CapsuleGeometry(0.4, 0.66, 4, 8), shirt, { y: 1.35 });
    const bib = mesh(new THREE.BoxGeometry(0.52, 0.66, 0.1), overalls, { y: 1.38, z: -0.37 });
    const head = mesh(new THREE.SphereGeometry(0.34, 12, 9), skin, { y: 2.25 });
    head.scale.y = 1.08;

    const hatTop = mesh(new THREE.CylinderGeometry(0.43, 0.49, 0.2, 16), straw, { y: 2.58 });
    const hatBrim = mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.075, 20), straw, { y: 2.49 });

    this.leftArm = new THREE.Group();
    this.rightArm = new THREE.Group();
    const armGeometry = new THREE.CapsuleGeometry(0.105, 0.56, 3, 6);
    const armLeft = mesh(armGeometry, skin, { y: -0.36 });
    const armRight = mesh(armGeometry, skin, { y: -0.36 });
    this.leftArm.position.set(-0.49, 1.7, 0);
    this.rightArm.position.set(0.49, 1.7, 0);
    this.leftArm.add(armLeft);
    this.rightArm.add(armRight);

    this.leftLeg = new THREE.Group();
    this.rightLeg = new THREE.Group();
    const legGeometry = new THREE.CapsuleGeometry(0.14, 0.62, 3, 6);
    const legLeft = mesh(legGeometry, denimDark, { y: -0.42 });
    const legRight = mesh(legGeometry, denimDark, { y: -0.42 });
    const bootLeft = mesh(new THREE.BoxGeometry(0.3, 0.22, 0.5), boots, { y: -0.9, z: -0.08 });
    const bootRight = mesh(new THREE.BoxGeometry(0.3, 0.22, 0.5), boots, { y: -0.9, z: -0.08 });
    this.leftLeg.position.set(-0.22, 0.92, 0);
    this.rightLeg.position.set(0.22, 0.92, 0);
    this.leftLeg.add(legLeft, bootLeft);
    this.rightLeg.add(legRight, bootRight);

    this.playerModel.add(torso, bib, head, hatTop, hatBrim, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
    this.player.position.set(0, 0, 9.6);
    this.scene.add(this.player);
  }

  buildFields(state) {
    const baseGeometry = new THREE.BoxGeometry(TILE_SIZE - 0.12, 0.2, TILE_SIZE - 0.12);
    const furrowMaterial = new THREE.MeshStandardMaterial({ color: 0x7a5737, roughness: 1 });
    const furrowGeometry = new THREE.BoxGeometry(TILE_SIZE - 0.3, 0.06, 0.14);

    for (const id of Object.keys(state.tiles)) {
      const material = new THREE.MeshStandardMaterial({ color: 0x6f9852, roughness: 0.98, emissive: 0x000000 });
      const tile = new THREE.Mesh(baseGeometry.clone(), material);
      tile.position.copy(tileWorldPosition(id));
      tile.receiveShadow = true;
      tile.userData = { type: 'tile', id };
      this.scene.add(tile);
      this.tileMeshes.set(id, tile);
      this.interactives.push(tile);

      const furrows = new THREE.Group();
      furrows.position.copy(tileWorldPosition(id));
      furrows.position.y = 0.205;
      for (const offset of [-0.72, -0.24, 0.24, 0.72]) {
        const row = mesh(furrowGeometry, furrowMaterial, { z: offset, cast: false, receive: true });
        furrows.add(row);
      }
      furrows.visible = false;
      this.scene.add(furrows);
      this.furrowGroups.set(id, furrows);

      const cropGroup = new THREE.Group();
      cropGroup.position.copy(tileWorldPosition(id));
      cropGroup.position.y = 0.24;
      this.scene.add(cropGroup);
      this.cropGroups.set(id, cropGroup);
    }
  }

  buildRain() {
    const positions = new Float32Array(480 * 3);
    for (let i = 0; i < 480; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 34;
      positions[i * 3 + 1] = Math.random() * 18 + 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 34;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0xd8edf7, size: 0.075, transparent: true, opacity: 0.72 }),
    );
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (event) => {
      if (['INPUT', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) return;
      this.keys.add(event.code);
      if (event.code === 'KeyE' && !event.repeat) this.interact();
      if (event.code === 'KeyC' && !event.repeat) this.resetCamera();
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.endCameraDrag();
    });

    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    this.canvas.addEventListener('pointerdown', (event) => {
      if (!this.enabled || event.button !== 2) return;
      event.preventDefault();
      this.cameraDragging = true;
      this.canvas.style.cursor = 'grabbing';
      this.canvas.setPointerCapture?.(event.pointerId);
    });
    this.canvas.addEventListener('pointermove', (event) => {
      if (!this.cameraDragging) return;
      const sensitivity = Number(this.settings.sensitivity || 0.75) * 0.003;
      this.yaw -= event.movementX * sensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch - event.movementY * sensitivity, -1.05, -0.12);
    });
    this.canvas.addEventListener('pointerup', (event) => {
      if (event.button === 2) this.endCameraDrag(event.pointerId);
    });
    this.canvas.addEventListener('pointercancel', (event) => this.endCameraDrag(event.pointerId));
    this.canvas.addEventListener('wheel', (event) => {
      if (!this.enabled) return;
      event.preventDefault();
      const current = Number(this.settings.cameraDistance || 7.5);
      const next = THREE.MathUtils.clamp(current + event.deltaY * 0.008, 5.2, 11.5);
      this.settings.cameraDistance = next;
      if (this.lastState?.settings) this.lastState.settings.cameraDistance = next;
    }, { passive: false });
  }

  endCameraDrag(pointerId) {
    if (!this.cameraDragging) return;
    this.cameraDragging = false;
    this.canvas.style.cursor = this.enabled ? 'grab' : 'default';
    if (pointerId !== undefined && this.canvas.hasPointerCapture?.(pointerId)) {
      this.canvas.releasePointerCapture?.(pointerId);
    }
  }

  resetCamera() {
    this.pitch = -0.52;
    this.yaw = this.player.rotation.y - Math.PI;
    if (Math.abs(this.yaw) > Math.PI * 2) this.yaw %= Math.PI * 2;
  }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  setSettings(settings) {
    this.settings = { ...this.settings, ...settings };
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.canvas.style.cursor = this.enabled ? 'grab' : 'default';
    if (!this.enabled) {
      this.keys.clear();
      this.endCameraDrag();
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
    this.isMoving = Boolean(inputX || inputZ);
    if (!this.isMoving) return;

    const direction = new THREE.Vector3(inputX, 0, -inputZ)
      .normalize()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
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

  updatePlayerAnimation(dt) {
    const targetAmount = this.isMoving ? 0.6 : 0;
    if (this.isMoving) this.walkPhase += dt * (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 12 : 9);
    const swing = Math.sin(this.walkPhase) * targetAmount;
    this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, swing, 0.22);
    this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, -swing, 0.22);
    this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, -swing * 0.75, 0.22);
    this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, swing * 0.75, 0.22);
    this.playerModel.position.y = THREE.MathUtils.lerp(this.playerModel.position.y, this.isMoving ? Math.abs(Math.sin(this.walkPhase * 2)) * 0.035 : 0, 0.2);
  }

  updateCamera(dt) {
    const distance = Number(this.settings.cameraDistance || 7.5);
    const horizontal = Math.cos(this.pitch) * distance;
    const desired = this.player.position.clone().add(new THREE.Vector3(
      Math.sin(this.yaw) * horizontal,
      2.45 - Math.sin(this.pitch) * distance,
      Math.cos(this.yaw) * horizontal,
    ));
    const follow = this.settings.reducedMotion ? 1 : 1 - Math.pow(0.0018, dt);
    this.camera.position.lerp(desired, follow);
    this.camera.lookAt(this.player.position.clone().add(new THREE.Vector3(0, 1.25, 0)));
  }

  updateTarget() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    let next = null;

    for (const hit of this.raycaster.intersectObjects(this.interactives, false)) {
      const data = hit.object.userData;
      if (data.type === 'tile' && isTileUnlocked(this.lastState, data.id)) {
        next = { type: 'tile', id: data.id, distance: hit.distance };
        break;
      }
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
    if (this.target?.type === 'tile') this.tileMeshes.get(this.target.id)?.material.emissive.setHex(0x2e2a12);
    this.callbacks.onTarget?.(this.target);
  }

  updateAtmosphere(state, dt) {
    const time = (state.timeMinutes || 0) / 1440;
    const daylight = THREE.MathUtils.clamp(Math.sin((time - 0.23) * Math.PI * 2) * 0.55 + 0.62, 0.18, 1);
    this.hemi.intensity = 0.6 + daylight * 1.18;
    this.sun.intensity = 0.4 + daylight * 2.4;

    const sunAngle = (time - 0.25) * Math.PI * 2;
    this.sun.position.set(Math.cos(sunAngle) * 28, Math.max(5, Math.sin(sunAngle) * 30), 16);

    const clearSky = state.weatherId === 'sunny' ? 0xb1d9e3 : state.weatherId === 'cloudy' ? 0x9eb6b7 : 0x879fa8;
    const sky = new THREE.Color(0x182942).lerp(new THREE.Color(clearSky), daylight);
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);

    const raining = state.weatherId === 'rain' || state.weatherId === 'heavy-rain';
    this.rain.visible = raining;
    this.renderer.toneMappingExposure = raining ? 0.94 : 1.06 + daylight * 0.06;
    if (!raining) return;

    const positions = this.rain.geometry.attributes.position;
    const speed = state.weatherId === 'heavy-rain' ? 18 : 12;
    for (let i = 0; i < positions.count; i += 1) {
      let y = positions.getY(i) - dt * speed;
      if (y < 0.5) y = 17 + Math.random() * 4;
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
    this.rain.position.x = this.player.position.x;
    this.rain.position.z = this.player.position.z;
  }

  refresh(state, force = false) {
    this.lastState = state;
    for (const [id, tile] of Object.entries(state.tiles)) {
      const tileMesh = this.tileMeshes.get(id);
      if (!tileMesh) continue;

      const unlocked = isTileUnlocked(state, id);
      tileMesh.visible = unlocked;
      const furrows = this.furrowGroups.get(id);
      if (furrows) furrows.visible = unlocked && tile.soil === 'tilled';

      const wet = tile.watered || state.weatherId === 'rain' || state.weatherId === 'heavy-rain';
      tileMesh.material.color.setHex(tile.soil === 'tilled' ? (wet ? 0x4b3423 : 0x68472f) : 0x6f9852);
      if (furrows) {
        furrows.children.forEach((row) => row.material.color.setHex(wet ? 0x5b3e28 : 0x795536));
      }

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

    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      disposeObject(child);
    }

    if (!cropId || stage <= 0) return;
    const crop = cropMap.get(cropId);
    if (!crop) return;

    const scale = [0, 0.33, 0.56, 0.8, 1][stage] || 1;
    const offsets = [
      [-0.68, -0.68], [0, -0.68], [0.68, -0.68],
      [-0.68, 0], [0, 0], [0.68, 0],
      [-0.68, 0.68], [0, 0.68], [0.68, 0.68],
    ];

    offsets.forEach(([x, z], index) => {
      const plant = this.createPlant(cropId, crop.color, scale, stage, index);
      plant.position.set(x, 0, z);
      group.add(plant);
    });
  }

  createPlant(cropId, color, scale, stage, index) {
    const plant = new THREE.Group();
    const green = new THREE.MeshStandardMaterial({ color: 0x4c8145, roughness: 0.84 });
    const greenLight = new THREE.MeshStandardMaterial({ color: 0x6e9b4c, roughness: 0.84 });

    if (cropId === 'wheat') {
      const stalkMaterial = new THREE.MeshStandardMaterial({ color: stage >= 4 ? 0xc4a947 : 0x718c42, roughness: 0.84 });
      const grainMaterial = new THREE.MeshStandardMaterial({ color: 0xe0c35b, roughness: 0.8 });
      for (let stemIndex = 0; stemIndex < 3; stemIndex += 1) {
        const x = (stemIndex - 1) * 0.08;
        const stalk = mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.25 * scale, 5), stalkMaterial, { x, y: 0.62 * scale });
        const head = mesh(new THREE.ConeGeometry(0.1, 0.38 * scale, 5), grainMaterial, { x, y: 1.25 * scale });
        head.rotation.z = (stemIndex - 1) * 0.08;
        plant.add(stalk, head);
      }
    } else if (cropId === 'corn') {
      const stalk = mesh(new THREE.CylinderGeometry(0.055, 0.085, 1.75 * scale, 6), green, { y: 0.88 * scale });
      plant.add(stalk);
      for (const side of [-1, 1]) {
        const leaf = mesh(new THREE.ConeGeometry(0.11, 0.72 * scale, 4), greenLight, { x: side * 0.18, y: 0.72 * scale });
        leaf.rotation.z = side * 0.9;
        plant.add(leaf);
      }
      if (stage >= 3) {
        const cob = mesh(new THREE.CapsuleGeometry(0.1, 0.26 * scale, 3, 6), new THREE.MeshStandardMaterial({ color, roughness: 0.82 }), { x: 0.15, y: 1.0 * scale });
        cob.rotation.z = Math.PI / 2.7;
        plant.add(cob);
      }
    } else if (cropId === 'carrot') {
      if (stage >= 3) {
        const root = mesh(new THREE.ConeGeometry(0.12 * scale, 0.55 * scale, 7), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }), { y: 0.11 });
        root.rotation.x = Math.PI;
        plant.add(root);
      }
      for (let leafIndex = 0; leafIndex < 3; leafIndex += 1) {
        const leaf = mesh(new THREE.ConeGeometry(0.08 * scale, 0.58 * scale, 5), leafIndex % 2 ? green : greenLight, {
          x: (leafIndex - 1) * 0.09,
          y: 0.38 * scale,
        });
        leaf.rotation.z = (leafIndex - 1) * 0.25;
        plant.add(leaf);
      }
    } else {
      const leafOffsets = [[-0.12, 0], [0.12, 0], [0, 0.12], [0, -0.12]];
      leafOffsets.forEach(([x, z], leafIndex) => {
        const leaf = mesh(new THREE.SphereGeometry(0.18 * scale, 7, 5), leafIndex % 2 ? green : greenLight, { x, y: 0.24 * scale, z });
        leaf.scale.set(1.35, 0.42, 0.8);
        plant.add(leaf);
      });
      if (stage >= 3) {
        const fruitCount = stage >= 4 ? 3 : 1;
        for (let fruitIndex = 0; fruitIndex < fruitCount; fruitIndex += 1) {
          const fruit = mesh(new THREE.SphereGeometry(0.09 * scale, 8, 6), new THREE.MeshStandardMaterial({ color, roughness: 0.74 }), {
            x: (fruitIndex - 1) * 0.12,
            y: 0.3 * scale,
            z: fruitIndex % 2 ? 0.08 : -0.03,
          });
          fruit.scale.y = 0.82;
          plant.add(fruit);
        }
      }
    }

    plant.scale.setScalar(0.94 + (index % 3) * 0.04);
    plant.rotation.y = (index % 3) * 0.18 - 0.18;
    plant.traverse((object) => {
      if (object.isMesh) object.castShadow = true;
    });
    return plant;
  }

  loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;

    if (this.enabled) {
      this.updateMovement(dt);
      this.updateTarget();
    } else {
      this.isMoving = false;
    }

    this.updatePlayerAnimation(dt);
    this.updateCamera(dt);
    this.updateAtmosphere(this.lastState, dt);
    this.callbacks.onFrame?.(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  }
}
