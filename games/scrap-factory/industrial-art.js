import * as THREE from 'three';
import { BUILDINGS } from './config.js';
import {
  addBox,
  addCylinder,
  addMesh,
  addPanelLabel,
  addPipeBetween,
  chainLinkTexture,
  concreteTexture,
  corrugatedTexture,
  createDust,
  createSky,
  dirtTexture,
  hazardTexture,
  makeMaterial,
} from './visual-kit.js';

function shadow(root, cast = true, receive = true) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = cast;
    node.receiveShadow = receive;
  });
  return root;
}

function addCollider(list, x, z, w, d, padding = 0) {
  list.push({
    minX: x - w / 2 - padding,
    maxX: x + w / 2 + padding,
    minZ: z - d / 2 - padding,
    maxZ: z + d / 2 + padding,
  });
}

function addFence(scene, staticColliders, a, b, { height = 2.35, collider = true } = {}) {
  const steel = makeMaterial(0x51595a, 0.72, 0.55);
  const meshTexture = chainLinkTexture();
  const meshMat = new THREE.MeshStandardMaterial({
    map: meshTexture,
    color: 0xb8bfbd,
    roughness: 0.72,
    metalness: 0.65,
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
  });
  const start = new THREE.Vector3(a[0], 0, a[1]);
  const end = new THREE.Vector3(b[0], 0, b[1]);
  const length = start.distanceTo(end);
  const angle = Math.atan2(end.z - start.z, end.x - start.x);
  const center = start.clone().add(end).multiplyScalar(0.5);
  const group = new THREE.Group();

  const panel = new THREE.Mesh(new THREE.PlaneGeometry(length, height), meshMat);
  panel.position.set(center.x, height / 2, center.z);
  panel.rotation.y = -angle + Math.PI / 2;
  group.add(panel);

  const segments = Math.max(1, Math.ceil(length / 3.2));
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const x = THREE.MathUtils.lerp(start.x, end.x, t);
    const z = THREE.MathUtils.lerp(start.z, end.z, t);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, height + 0.4, 8), steel);
    post.position.set(x, (height + 0.4) / 2, z);
    group.add(post);
  }
  scene.add(group);
  shadow(group);
  if (collider) {
    const w = Math.max(0.15, Math.abs(end.x - start.x));
    const d = Math.max(0.15, Math.abs(end.z - start.z));
    addCollider(staticColliders, center.x, center.z, w || 0.15, d || 0.15, 0.08);
  }
}

function createContainer(color = '#536b6b', label = 'SALVAGE', seed = 7) {
  const group = new THREE.Group();
  const texture = corrugatedTexture(color, seed);
  const body = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, metalness: 0.48 });
  const steel = makeMaterial(0x333a3b, 0.62, 0.72);
  addBox(group, [6.2, 2.55, 2.45], body, [0, 1.28, 0]);
  for (const x of [-2.92, 2.92]) addBox(group, [0.12, 2.65, 2.58], steel, [x, 1.3, 0]);
  for (const y of [0.18, 2.38]) addBox(group, [6.35, 0.12, 2.58], steel, [0, y, 0]);
  for (const z of [-1.23, 1.23]) addBox(group, [6.35, 2.65, 0.1], steel, [0, 1.3, z]);
  addPanelLabel(group, label, [0, 1.45, -1.285], [0, 0, 0], [2.7, 0.65], {
    background: '#252a2a', foreground: '#d6b84e', sub: 'RECOVERY LOGISTICS',
  });
  return shadow(group);
}

function createTireStack(count = 4) {
  const group = new THREE.Group();
  const rubber = makeMaterial(0x1f2222, 0.96, 0.03);
  for (let i = 0; i < count; i += 1) {
    const tire = addMesh(group, new THREE.TorusGeometry(0.48, 0.18, 8, 20), rubber, [0, 0.22 + i * 0.29, 0], [Math.PI / 2, 0, (i % 2) * 0.12]);
    tire.scale.set(1, 1, 0.92);
  }
  return shadow(group);
}

function createBarrel(color = 0x6f4936) {
  const group = new THREE.Group();
  const body = makeMaterial(color, 0.78, 0.5);
  const ring = makeMaterial(0x2e3435, 0.62, 0.72);
  addCylinder(group, 0.35, 0.35, 0.95, 16, body, [0, 0.48, 0]);
  for (const y of [0.13, 0.48, 0.83]) addCylinder(group, 0.365, 0.365, 0.05, 16, ring, [0, y, 0]);
  return shadow(group);
}

function createCableSpool() {
  const group = new THREE.Group();
  const wood = makeMaterial(0x72573d, 0.94, 0.03);
  const dark = makeMaterial(0x2c3132, 0.76, 0.4);
  addCylinder(group, 0.72, 0.72, 0.12, 18, wood, [0, 0.72, -0.48], [Math.PI / 2, 0, 0]);
  addCylinder(group, 0.72, 0.72, 0.12, 18, wood, [0, 0.72, 0.48], [Math.PI / 2, 0, 0]);
  addCylinder(group, 0.34, 0.34, 0.92, 16, dark, [0, 0.72, 0], [Math.PI / 2, 0, 0]);
  return shadow(group);
}

function createCrushedCar(color = 0x6f6654) {
  const group = new THREE.Group();
  const body = makeMaterial(color, 0.88, 0.38);
  const glass = makeMaterial(0x26363b, 0.35, 0.2, { transparent: true, opacity: 0.72 });
  const rubber = makeMaterial(0x1c2021, 0.96, 0.02);
  addBox(group, [2.7, 0.45, 1.35], body, [0, 0.43, 0]);
  addBox(group, [1.5, 0.45, 1.18], body, [0.15, 0.78, 0]);
  addBox(group, [0.58, 0.31, 1.05], glass, [-0.42, 0.82, 0]);
  for (const x of [-0.9, 0.92]) {
    for (const z of [-0.68, 0.68]) addCylinder(group, 0.3, 0.3, 0.18, 12, rubber, [x, 0.31, z], [Math.PI / 2, 0, 0]);
  }
  group.rotation.z = -0.05;
  return shadow(group);
}

function createScrapPile(seed = 12, scale = 1) {
  const group = new THREE.Group();
  const random = (() => {
    let s = seed >>> 0;
    return () => {
      s = Math.imul(1664525, s) + 1013904223 | 0;
      return (s >>> 0) / 4294967296;
    };
  })();
  const metals = [
    makeMaterial(0x5b5750, 0.92, 0.52),
    makeMaterial(0x725545, 0.94, 0.46),
    makeMaterial(0x505b5d, 0.9, 0.56),
    makeMaterial(0x6d665b, 0.94, 0.42),
  ];
  const rubber = makeMaterial(0x202323, 0.98, 0.01);
  for (let i = 0; i < 14; i += 1) {
    const material = metals[Math.floor(random() * metals.length)];
    const kind = Math.floor(random() * 4);
    const x = (random() - 0.5) * 3.8 * scale;
    const z = (random() - 0.5) * 3.2 * scale;
    const y = 0.16 + random() * 0.8 * scale;
    let mesh;
    if (kind === 0) mesh = addBox(group, [0.16 + random() * 0.22, 0.15 + random() * 0.22, 1.2 + random() * 2.1], material, [x, y, z]);
    else if (kind === 1) mesh = addCylinder(group, 0.08 + random() * 0.09, 0.08 + random() * 0.09, 1.2 + random() * 2.2, 8, material, [x, y, z], [Math.PI / 2, random() * Math.PI, random() * 0.5]);
    else if (kind === 2) mesh = addMesh(group, new THREE.TorusGeometry(0.28 + random() * 0.2, 0.1, 7, 16), rubber, [x, y, z], [Math.PI / 2, random(), random()]);
    else mesh = addBox(group, [0.7 + random() * 1.1, 0.06, 0.45 + random() * 0.8], material, [x, y, z], [random(), random(), random()]);
    mesh.rotation.y += random() * Math.PI;
  }
  return shadow(group);
}

function createWorkshop() {
  const group = new THREE.Group();
  const wallTex = corrugatedTexture('#485554', 31);
  const wall = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.88, metalness: 0.4 });
  const frame = makeMaterial(0x292f30, 0.64, 0.65);
  const roof = makeMaterial(0x3c4343, 0.86, 0.45);
  addBox(group, [11.5, 5.6, 8.2], wall, [0, 2.8, 0]);
  addBox(group, [12.1, 0.28, 8.8], roof, [0, 5.85, 0], [0, 0, 0.03]);
  for (const x of [-5.55, 5.55]) for (const z of [-3.95, 3.95]) addBox(group, [0.24, 5.8, 0.24], frame, [x, 2.9, z]);
  const door = makeMaterial(0x202627, 0.82, 0.52);
  addBox(group, [0.16, 3.6, 4.3], door, [5.83, 2.05, 0]);
  for (let z = -1.8; z <= 1.8; z += 0.9) addBox(group, [0.18, 0.08, 0.72], makeMaterial(0xd0ad3b, 0.65, 0.25), [5.93, 0.28, z]);
  addPanelLabel(group, 'WORKSHOP 01', [5.94, 4.65, 0], [0, Math.PI / 2, 0], [3.7, 0.95], {
    background: '#202526', foreground: '#e1c85a', sub: 'SALVAGE / FABRICATION',
  });
  const ventMat = makeMaterial(0x343a3b, 0.68, 0.7);
  for (const z of [-2.3, 2.2]) {
    addCylinder(group, 0.38, 0.48, 2.4, 10, ventMat, [-3.7, 7.0, z]);
    addCylinder(group, 0.58, 0.38, 0.5, 10, ventMat, [-3.7, 8.35, z]);
  }
  return shadow(group);
}

function createGantry() {
  const group = new THREE.Group();
  const steel = makeMaterial(0x333a3b, 0.64, 0.72);
  const yellow = makeMaterial(0xc9a534, 0.7, 0.38);
  for (const z of [-6.1, 6.1]) {
    addBox(group, [0.4, 5.8, 0.4], steel, [0, 2.9, z]);
    addBox(group, [0.65, 0.3, 0.65], yellow, [0, 0.2, z]);
  }
  addBox(group, [0.4, 0.4, 12.6], steel, [0, 5.65, 0]);
  addBox(group, [0.18, 0.18, 12.2], yellow, [0.24, 5.92, 0]);
  for (let z = -5.6; z <= 5.6; z += 1.4) {
    const brace = addBox(group, [0.14, 1.5, 0.14], yellow, [0.14, 4.95, z], [0, 0, z % 2 ? 0.55 : -0.55]);
    brace.rotation.x = z % 2 ? 0.3 : -0.3;
  }
  addPanelLabel(group, 'SCRAP YARD', [0.24, 4.45, 0], [0, Math.PI / 2, 0], [4.9, 1.1], {
    background: '#1f2425', foreground: '#e3c75c', sub: 'AUTHORIZED SALVAGE AREA →',
  });
  return shadow(group);
}

function createCrane() {
  const group = new THREE.Group();
  const yellow = makeMaterial(0xb88e2f, 0.75, 0.55);
  const dark = makeMaterial(0x303637, 0.66, 0.72);
  addBox(group, [1.15, 9.5, 1.15], dark, [0, 4.75, 0]);
  addBox(group, [13.5, 0.55, 0.55], yellow, [5.9, 9.2, 0]);
  addBox(group, [4.0, 0.55, 0.55], dark, [-2.2, 9.2, 0]);
  addBox(group, [2.4, 1.65, 1.75], dark, [-1.0, 7.7, 0]);
  addPipeBetween(group, [11.5, 9.0, 0], [11.5, 2.4, 0], 0.05, dark, 6);
  addBox(group, [0.9, 0.7, 0.28], dark, [11.5, 2.1, 0]);
  for (let y = 1.3; y < 8.6; y += 1.2) addBox(group, [1.25, 0.12, 0.12], yellow, [0, y, 0]);
  return shadow(group);
}

function createSilo(radius = 2.2, height = 8.5) {
  const group = new THREE.Group();
  const metal = makeMaterial(0x65706f, 0.72, 0.62);
  const dark = makeMaterial(0x343a3b, 0.66, 0.7);
  addCylinder(group, radius, radius, height, 18, metal, [0, height / 2, 0]);
  addCylinder(group, 0.35, radius, 1.4, 18, metal, [0, height + 0.7, 0]);
  for (const y of [1.3, 3.8, 6.3]) addCylinder(group, radius + 0.08, radius + 0.08, 0.12, 18, dark, [0, y, 0]);
  addPipeBetween(group, [radius + 0.4, 0.4, 0], [radius + 0.4, height * 0.8, 0], 0.12, dark);
  return shadow(group);
}

function createFloodlight() {
  const group = new THREE.Group();
  const steel = makeMaterial(0x3e4546, 0.66, 0.7);
  addCylinder(group, 0.09, 0.13, 6.3, 8, steel, [0, 3.15, 0]);
  addBox(group, [1.5, 0.22, 0.32], steel, [0, 6.1, 0]);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xbfc7c5, emissive: 0xffe4a8, emissiveIntensity: 1.1 });
  for (const x of [-0.5, 0.5]) addBox(group, [0.48, 0.28, 0.18], lampMat, [x, 6.0, -0.15], [-0.2, 0, 0]);
  return shadow(group);
}

export function buildIndustrialEnvironment(world) {
  const { scene, staticColliders } = world;
  scene.background = new THREE.Color(0x9cafb4);
  scene.fog = new THREE.FogExp2(0xa8b1ae, 0.0085);
  createSky(scene);

  const hemi = new THREE.HemisphereLight(0xcfe5f2, 0x4a4439, 1.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe5b4, 3.75);
  sun.position.set(-32, 46, 24);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -62;
  sun.shadow.camera.right = 62;
  sun.shadow.camera.top = 52;
  sun.shadow.camera.bottom = -52;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.00025;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xaad1de, 0.58);
  fill.position.set(45, 18, -35);
  scene.add(fill);

  const groundTexture = dirtTexture(17, [12, 7]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(132, 82), new THREE.MeshStandardMaterial({ map: groundTexture, color: 0x8a846f, roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(34, 0, 0);
  ground.receiveShadow = true;
  ground.userData.ground = true;
  scene.add(ground);
  world.ground = ground;

  const concrete = concreteTexture(29, [8, 8]);
  const basePad = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), new THREE.MeshStandardMaterial({ map: concrete, color: 0x888a84, roughness: 0.94, metalness: 0.04 }));
  basePad.rotation.x = -Math.PI / 2;
  basePad.position.set(0, 0.025, 0);
  basePad.receiveShadow = true;
  scene.add(basePad);

  const safety = new THREE.MeshBasicMaterial({ map: hazardTexture() });
  const laneMat = makeMaterial(0xd1b642, 0.82, 0.05);
  for (const z of [-20.7, 20.7]) addBox(scene, [42, 0.028, 0.23], laneMat, [0, 0.055, z]);
  for (const x of [-20.7, 20.7]) addBox(scene, [0.23, 0.028, 42], laneMat, [x, 0.055, 0]);
  const hazardStrip = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 12.5), safety);
  hazardStrip.rotation.x = -Math.PI / 2;
  hazardStrip.position.set(21.35, 0.062, 0);
  scene.add(hazardStrip);

  for (let z = -17.5; z <= 17.5; z += 5) {
    const mark = addBox(scene, [4.1, 0.025, 0.1], makeMaterial(0xd6d6c8, 0.9, 0.02), [-15.8, 0.058, z], [0, 0.12, 0]);
    mark.receiveShadow = true;
  }

  const workshop = createWorkshop();
  workshop.position.set(-28.4, 0, -11.5);
  workshop.rotation.y = 0.05;
  scene.add(workshop);
  addCollider(staticColliders, -28.4, -11.5, 11.5, 8.2, 0.15);

  const workshopAwning = new THREE.Group();
  const steel = makeMaterial(0x343a3b, 0.68, 0.7);
  addBox(workshopAwning, [6.4, 0.2, 3.2], makeMaterial(0x5d6260, 0.82, 0.45), [0, 3.4, 0]);
  for (const x of [-2.9, 2.9]) for (const z of [-1.35, 1.35]) addBox(workshopAwning, [0.14, 3.4, 0.14], steel, [x, 1.7, z]);
  workshopAwning.position.set(-20.5, 0, 12.2);
  scene.add(shadow(workshopAwning));
  addCollider(staticColliders, -20.5, 12.2, 6.2, 3.0, 0.05);

  const gantry = createGantry();
  gantry.position.set(23.0, 0, 0);
  scene.add(gantry);

  addFence(scene, staticColliders, [-22, -22], [20.5, -22]);
  addFence(scene, staticColliders, [-22, 22], [-13, 22]);
  addFence(scene, staticColliders, [-7, 22], [20.5, 22]);
  addFence(scene, staticColliders, [-22, -22], [-22, 22]);
  addFence(scene, staticColliders, [22.5, -22], [22.5, -6.5]);
  addFence(scene, staticColliders, [22.5, 6.5], [22.5, 22]);

  for (const [x, z] of [[-16, -17], [-10, -17], [-16, 16], [-8, 16]]) {
    const barrel = createBarrel(x % 3 ? 0x5a623f : 0x7b4e37);
    barrel.position.set(x, 0, z);
    scene.add(barrel);
  }
  const spool = createCableSpool();
  spool.position.set(-17, 0, 10);
  spool.rotation.y = 0.5;
  scene.add(spool);
  const tires = createTireStack(4);
  tires.position.set(-18.2, 0, 6.7);
  scene.add(tires);

  for (const [x, z] of [[-17, -18], [17, -18], [-17, 18], [17, 18]]) {
    const light = createFloodlight();
    light.position.set(x, 0, z);
    light.rotation.y = x > 0 ? Math.PI : 0;
    scene.add(light);
  }

  const yardTex = dirtTexture(73, [14, 7]);
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(66, 62), new THREE.MeshStandardMaterial({ map: yardTex, color: 0x756e5c, roughness: 1, metalness: 0 }));
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(61, 0.018, 0);
  yard.receiveShadow = true;
  scene.add(yard);

  const oilMat = new THREE.MeshStandardMaterial({ color: 0x252827, roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.75 });
  const puddlePositions = [[34, -10, 4.2, 2.2], [58, 15, 3.4, 1.8], [73, -13, 5.2, 2.4], [44, 22, 2.8, 1.5]];
  for (const [x, z, w, h] of puddlePositions) {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 22), oilMat);
    puddle.scale.set(w, h, 1);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(x, 0.045, z);
    scene.add(puddle);
  }

  const containerData = [[38, -24, 0.05, '#526969', 'YARD 03'], [46.5, 24, -0.08, '#76513f', 'METAL'], [59, -24, 0.03, '#545e4c', 'PARTS'], [69, 24, 0.08, '#6a6046', 'TOOLS'], [80, -23.5, -0.05, '#485c62', 'EXPORT']];
  for (let i = 0; i < containerData.length; i += 1) {
    const [x, z, rot, color, label] = containerData[i];
    const container = createContainer(color, label, 20 + i);
    container.position.set(x, 0, z);
    container.rotation.y = rot;
    scene.add(container);
    addCollider(staticColliders, x, z, 6.3, 2.6, 0.05);
  }

  const carData = [[35, 11, -0.3, 0x696255], [49, -8, 0.6, 0x654d40], [66, 9, -0.4, 0x4f6462], [82, 13, 0.25, 0x74634b]];
  for (const [x, z, rot, color] of carData) {
    const car = createCrushedCar(color);
    car.position.set(x, 0, z);
    car.rotation.y = rot;
    scene.add(car);
    addCollider(staticColliders, x, z, 2.8, 1.5);
  }

  const pileData = [[31.5, -17, 18, 1.1], [39, 2, 19, 1.0], [51, 14, 20, 1.15], [59, -11, 21, 1.2], [71, 3, 22, 1.0], [80, -8, 23, 1.2], [86, 20, 24, 1.0]];
  for (const [x, z, seed, scale] of pileData) {
    const pile = createScrapPile(seed, scale);
    pile.position.set(x, 0, z);
    scene.add(pile);
    addCollider(staticColliders, x, z, 2.6 * scale, 2.4 * scale, 0.15);
  }

  for (const [x, z, count] of [[42, 15, 5], [62, -18, 4], [76, 18, 6]]) {
    const stack = createTireStack(count);
    stack.position.set(x, 0, z);
    scene.add(stack);
  }
  for (const [x, z] of [[32, 19], [55, 20], [72, -19], [84, 3]]) {
    const barrel = createBarrel(x % 2 ? 0x6b5c3f : 0x734737);
    barrel.position.set(x, 0, z);
    barrel.rotation.z = x % 3 === 0 ? Math.PI / 2 : 0;
    scene.add(barrel);
  }
  for (const [x, z, rot] of [[45, -17, 0.4], [68, 17, -0.6]]) {
    const s = createCableSpool();
    s.position.set(x, 0, z);
    s.rotation.y = rot;
    scene.add(s);
  }

  const crane = createCrane();
  crane.position.set(88, 0, -2);
  crane.rotation.y = Math.PI / 2;
  scene.add(crane);
  addCollider(staticColliders, 88, -2, 2.1, 2.1, 0.2);

  const office = createContainer('#4c5c5d', 'YARD OFFICE', 71);
  office.scale.set(0.82, 0.9, 0.92);
  office.position.set(91, 0, 20);
  office.rotation.y = Math.PI / 2;
  scene.add(office);
  addCollider(staticColliders, 91, 20, 2.6, 5.2, 0.1);

  const skyline = new THREE.Group();
  const distant = makeMaterial(0x56605f, 0.96, 0.2);
  const dark = makeMaterial(0x3a4141, 0.9, 0.42);
  for (const [x, z, w, h, d] of [[104, -24, 14, 8, 11], [112, -6, 9, 14, 9], [106, 15, 16, 6, 12], [122, 25, 10, 11, 9]]) addBox(skyline, [w, h, d], distant, [x, h / 2, z]);
  for (const [x, z, r, h] of [[101, 3, 2.6, 9], [116, 9, 2.2, 11], [124, -18, 2.8, 10]]) {
    const silo = createSilo(r, h);
    silo.position.set(x, 0, z);
    skyline.add(silo);
  }
  for (const [x, z, h] of [[98, -13, 18], [116, -26, 22], [129, 5, 17]]) {
    addCylinder(skyline, 0.8, 1.1, h, 12, dark, [x, h / 2, z]);
    addCylinder(skyline, 1.2, 0.75, 1.2, 12, dark, [x, h + 0.6, z]);
  }
  addPipeBetween(skyline, [98, 5.2, -14], [124, 5.2, -14], 0.32, makeMaterial(0x6c5f4e, 0.82, 0.58), 12);
  addPipeBetween(skyline, [108, 8.0, 18], [130, 8.0, 18], 0.26, makeMaterial(0x4f5e62, 0.82, 0.58), 12);
  scene.add(shadow(skyline, false, false));

  const dust = createDust(scene, 165);
  world.visualFx = { dust };
}

function machineMaterials(type) {
  const def = BUILDINGS[type];
  return {
    frame: makeMaterial(0x272d2e, 0.58, 0.78),
    dark: makeMaterial(0x353c3d, 0.74, 0.58),
    body: makeMaterial(def?.color ?? 0x667077, 0.72, 0.48),
    body2: makeMaterial(0x69706c, 0.82, 0.42),
    accent: makeMaterial(0xc8a334, 0.62, 0.42),
    rubber: makeMaterial(0x1f2222, 0.96, 0.03),
    copper: makeMaterial(0x9a6547, 0.64, 0.72),
  };
}

function addStatus(group, m, x = 0.72, y = 1.78, z = -0.78) {
  const light = addBox(group, [0.36, 0.15, 0.07], new THREE.MeshStandardMaterial({ color: 0x303837, emissive: 0x303837, emissiveIntensity: 0.6 }), [x, y, z]);
  group.userData.statusLight = light;
  const gauge = addBox(group, [1.05, 0.07, 0.07], new THREE.MeshStandardMaterial({ color: 0x8ecb8a, emissive: 0x487148, emissiveIntensity: 0.8 }), [-0.25, 0.39, -0.98]);
  gauge.geometry.translate(0.525, 0, 0);
  gauge.scale.x = 0.02;
  group.userData.gauge = gauge;
}

export function createIndustrialBuildingMesh(type) {
  const m = machineMaterials(type);
  const group = new THREE.Group();

  if (type === 'conveyor') {
    addBox(group, [2.35, 0.16, 1.25], m.frame, [0, 0.3, 0]);
    addBox(group, [2.18, 0.08, 0.82], m.rubber, [0, 0.48, 0]);
    for (const x of [-0.78, -0.26, 0.26, 0.78]) {
      const roller = addCylinder(group, 0.08, 0.08, 0.88, 10, m.body2, [x, 0.5, 0], [Math.PI / 2, 0, 0]);
      if (x === -0.78) group.userData.spinner = roller;
    }
    for (const z of [-0.57, 0.57]) {
      addBox(group, [2.36, 0.12, 0.09], m.accent, [0, 0.58, z]);
      for (const x of [-0.95, 0.95]) addBox(group, [0.1, 0.6, 0.1], m.frame, [x, 0.24, z]);
    }
    for (const x of [-0.62, 0, 0.62]) {
      const arrow = addMesh(group, new THREE.ConeGeometry(0.13, 0.3, 3), m.accent, [x, 0.6, 0], [0, 0, -Math.PI / 2]);
      arrow.rotation.z = -Math.PI / 2;
    }
    return shadow(group);
  }

  if (type === 'hopper') {
    for (const x of [-0.7, 0.7]) for (const z of [-0.7, 0.7]) addBox(group, [0.13, 1.15, 0.13], m.frame, [x, 0.58, z]);
    addBox(group, [1.9, 0.25, 1.9], m.frame, [0, 0.2, 0]);
    const funnel = addMesh(group, new THREE.CylinderGeometry(1.05, 0.42, 1.3, 4, 1, false), m.body, [0, 1.25, 0], [0, Math.PI / 4, 0]);
    funnel.rotation.y = Math.PI / 4;
    addBox(group, [0.6, 0.55, 0.6], m.dark, [0.62, 0.55, 0]);
    addBox(group, [0.5, 0.18, 0.5], m.accent, [0.62, 0.88, 0]);
    addPipeBetween(group, [0.62, 0.55, 0], [1.25, 0.55, 0], 0.13, m.dark);
    return shadow(group);
  }

  if (type === 'seller') {
    addBox(group, [1.85, 0.24, 1.35], m.frame, [0, 0.16, 0]);
    addBox(group, [1.65, 1.72, 1.22], m.body, [0, 1.12, 0]);
    addBox(group, [1.84, 0.18, 1.45], m.accent, [0, 2.05, 0], [0, 0, -0.03]);
    addBox(group, [1.15, 0.58, 0.06], new THREE.MeshStandardMaterial({ color: 0x172124, emissive: 0x2b8780, emissiveIntensity: 1.75 }), [0, 1.42, -0.64], [-0.1, 0, 0]);
    addBox(group, [0.9, 0.14, 0.54], m.dark, [0, 0.75, -0.58]);
    for (const x of [-0.65, 0.65]) addCylinder(group, 0.09, 0.11, 1.15, 8, m.accent, [x, 0.58, -0.9]);
    addStatus(group, m, 0.62, 1.96, -0.62);
    return shadow(group);
  }

  if (type === 'crusher') {
    addBox(group, [2.15, 0.28, 1.92], m.frame, [0, 0.18, 0]);
    for (const x of [-0.85, 0.85]) for (const z of [-0.72, 0.72]) addBox(group, [0.14, 1.45, 0.14], m.frame, [x, 0.78, z]);
    addBox(group, [1.8, 0.42, 1.62], m.body, [0, 0.62, 0]);
    const leftRoll = addCylinder(group, 0.34, 0.34, 1.45, 14, m.dark, [-0.42, 1.15, -0.05], [Math.PI / 2, 0, 0]);
    const rightRoll = addCylinder(group, 0.34, 0.34, 1.45, 14, m.dark, [0.42, 1.15, -0.05], [Math.PI / 2, 0, 0]);
    for (const roll of [leftRoll, rightRoll]) {
      for (let i = 0; i < 8; i += 1) {
        const tooth = addBox(roll, [0.12, 0.16, 0.2], m.body2, [0, 0.35, (i - 3.5) * 0.18]);
        tooth.rotation.z = (i / 8) * Math.PI * 2;
      }
    }
    group.userData.spinner = leftRoll;
    addCylinder(group, 0.38, 0.38, 0.72, 14, m.copper, [0.96, 1.15, 0.45], [0, 0, Math.PI / 2]);
    addPipeBetween(group, [0.72, 1.15, 0.45], [0.4, 1.15, 0.45], 0.11, m.dark);
    const chute = addMesh(group, new THREE.CylinderGeometry(0.72, 0.42, 0.86, 4), m.body, [0, 1.9, 0.1], [0, Math.PI / 4, 0]);
    chute.rotation.y = Math.PI / 4;
    addStatus(group, m, 0.7, 1.83, -0.83);
    return shadow(group);
  }

  if (type === 'smelter') {
    addBox(group, [2.2, 0.24, 2.0], m.frame, [0, 0.15, 0]);
    addCylinder(group, 0.98, 1.08, 1.85, 18, m.body, [0, 1.08, 0]);
    for (const y of [0.55, 1.25, 1.82]) addCylinder(group, 1.02, 1.02, 0.1, 18, m.frame, [0, y, 0]);
    addCylinder(group, 0.31, 0.36, 1.85, 12, m.dark, [0.55, 2.65, 0.16]);
    addCylinder(group, 0.46, 0.31, 0.42, 12, m.dark, [0.55, 3.77, 0.16]);
    addBox(group, [0.82, 0.62, 0.08], new THREE.MeshStandardMaterial({ color: 0x3b2d28, emissive: 0xff6a24, emissiveIntensity: 1.6 }), [0, 1.0, -1.02]);
    addPipeBetween(group, [-0.9, 0.72, 0.2], [-1.18, 0.72, 0.2], 0.12, m.copper);
    addPipeBetween(group, [-1.18, 0.72, 0.2], [-1.18, 1.75, 0.2], 0.12, m.copper);
    addStatus(group, m, 0.65, 1.7, -0.86);
    return shadow(group);
  }

  if (type === 'storage') {
    const texture = corrugatedTexture('#596969', 105);
    const body = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.82, metalness: 0.46 });
    addBox(group, [2.18, 1.75, 1.9], body, [0, 0.9, 0]);
    for (const x of [-1.02, 1.02]) addBox(group, [0.12, 1.88, 2.0], m.frame, [x, 0.94, 0]);
    for (const y of [0.12, 1.76]) addBox(group, [2.25, 0.12, 2.0], m.frame, [0, y, 0]);
    addBox(group, [1.48, 1.28, 0.08], m.dark, [0, 0.88, -0.98]);
    for (const x of [-0.48, 0.48]) addBox(group, [0.08, 1.14, 0.06], m.accent, [x, 0.88, -1.04]);
    addStatus(group, m, 0.7, 1.62, -0.95);
    return shadow(group);
  }

  addBox(group, [2, 1.5, 2], m.body, [0, 0.75, 0]);
  addStatus(group, m);
  return shadow(group);
}
