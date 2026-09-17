import * as THREE from 'three';

const ROOT_NAME = 'sf-world-structure-pass';
const SURFACE_Y = 0.072;

function mat(color, {
  roughness = 0.86,
  metalness = 0.18,
  transparent = false,
  opacity = 1,
  emissive = 0x000000,
  emissiveIntensity = 0,
  depthWrite = true,
} = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent,
    opacity,
    emissive,
    emissiveIntensity,
    depthWrite,
  });
}

function addBox(parent, size, material, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, topRadius, bottomRadius, height, material, position, segments = 12, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(topRadius, bottomRadius, height, segments), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addBeam(parent, a, b, radius, material, segments = 10) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const delta = end.clone().sub(start);
  const length = delta.length();
  if (length < 0.001) return null;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  parent.add(mesh);
  return mesh;
}

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

function buildRoadNetwork(root) {
  const roads = new THREE.Group();
  roads.name = 'sf-world-structure-roads';

  const asphalt = mat(0x4f514b, { roughness: 0.98, metalness: 0.02 });
  const asphaltDark = mat(0x40443f, { roughness: 0.99, metalness: 0.01, transparent: true, opacity: 0.82 });
  const lane = mat(0xc3aa55, { roughness: 0.82, metalness: 0.04 });
  const edge = mat(0xb9b7a6, { roughness: 0.9, metalness: 0.02, transparent: true, opacity: 0.62 });
  const grate = mat(0x2f3535, { roughness: 0.72, metalness: 0.66 });

  const main = new THREE.Mesh(new THREE.PlaneGeometry(69, 7.8), asphalt);
  main.rotation.x = -Math.PI / 2;
  main.position.set(58.5, SURFACE_Y, -1.2);
  main.receiveShadow = true;
  roads.add(main);

  const cross = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 43), asphaltDark);
  cross.rotation.x = -Math.PI / 2;
  cross.position.set(58, SURFACE_Y + 0.002, 8.5);
  cross.receiveShadow = true;
  roads.add(cross);

  const spur = new THREE.Mesh(new THREE.PlaneGeometry(23, 4.8), asphaltDark);
  spur.rotation.x = -Math.PI / 2;
  spur.position.set(36, SURFACE_Y + 0.003, -16.6);
  spur.receiveShadow = true;
  roads.add(spur);

  const dashGeometry = new THREE.BoxGeometry(2.35, 0.012, 0.11);
  const dashMesh = new THREE.InstancedMesh(dashGeometry, lane, 12);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 12; i += 1) {
    dummy.position.set(29.5 + i * 5.25, SURFACE_Y + 0.012, -1.2);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    dashMesh.setMatrixAt(i, dummy.matrix);
  }
  dashMesh.instanceMatrix.needsUpdate = true;
  dashMesh.receiveShadow = true;
  roads.add(dashMesh);

  const edgeGeometry = new THREE.BoxGeometry(67, 0.01, 0.07);
  for (const z of [-4.72, 2.32]) {
    const line = new THREE.Mesh(edgeGeometry, edge);
    line.position.set(58.5, SURFACE_Y + 0.011, z);
    roads.add(line);
  }

  const crossDashGeometry = new THREE.BoxGeometry(0.1, 0.012, 2.1);
  const crossDashes = new THREE.InstancedMesh(crossDashGeometry, edge, 7);
  for (let i = 0; i < 7; i += 1) {
    dummy.position.set(58, SURFACE_Y + 0.012, -8 + i * 5.4);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    crossDashes.setMatrixAt(i, dummy.matrix);
  }
  crossDashes.instanceMatrix.needsUpdate = true;
  roads.add(crossDashes);

  const grateGeometry = new THREE.BoxGeometry(1.15, 0.035, 0.42);
  const grates = new THREE.InstancedMesh(grateGeometry, grate, 10);
  for (let i = 0; i < 10; i += 1) {
    const x = 31.5 + i * 6.1;
    const z = i % 2 === 0 ? -4.25 : 1.85;
    dummy.position.set(x, SURFACE_Y + 0.018, z);
    dummy.rotation.set(0, i % 2 === 0 ? 0.03 : -0.03, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    grates.setMatrixAt(i, dummy.matrix);
  }
  grates.instanceMatrix.needsUpdate = true;
  grates.receiveShadow = true;
  roads.add(grates);

  const patchMat = new THREE.MeshBasicMaterial({ color: 0x292e2d, transparent: true, opacity: 0.18, depthWrite: false });
  for (const [x, z, sx, sz] of [[39, -2.0, 4.8, 1.5], [70, -0.2, 5.4, 1.1], [82, -2.5, 3.6, 1.4], [57, 16.5, 1.8, 4.8]]) {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 20), patchMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, SURFACE_Y + 0.016, z);
    patch.scale.set(sx, sz, 1);
    roads.add(patch);
  }

  root.add(roads);
}

function makeInstancedPieces(parent, transforms, geometry, material, name) {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  mesh.name = name;
  const dummy = new THREE.Object3D();
  transforms.forEach((transform, index) => {
    dummy.position.set(...transform.position);
    dummy.rotation.set(...transform.rotation);
    dummy.scale.set(...transform.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}

function buildScrapRidges(root) {
  const group = new THREE.Group();
  group.name = 'sf-world-structure-scrap-ridges';
  const random = seededRandom(771904);
  const heapCenters = [
    { x: -30.0, z: -10, radius: 6.8, height: 3.4 },
    { x: 100.0, z: -7, radius: 6.2, height: 3.8 },
    { x: 65, z: -37.0, radius: 5.8, height: 3.2 },
    { x: 70, z: 50.5, radius: 5.4, height: 3.0 },
  ];

  const rockTransforms = [];
  const darkTransforms = [];
  const beamTransforms = [];

  for (const heap of heapCenters) {
    for (let i = 0; i < 26; i += 1) {
      const angle = random() * Math.PI * 2;
      const radial = Math.sqrt(random()) * heap.radius;
      const x = heap.x + Math.cos(angle) * radial;
      const z = heap.z + Math.sin(angle) * radial;
      const normalized = Math.min(1, radial / heap.radius);
      const rise = (1 - normalized) * heap.height;
      const s = 0.42 + random() * 0.82;
      const transform = {
        position: [x, 0.16 + rise * (0.42 + random() * 0.4), z],
        rotation: [random() * 0.9, random() * Math.PI, random() * 0.7],
        scale: [s * (0.65 + random() * 1.1), s * (0.5 + random() * 0.8), s * (0.65 + random() * 1.1)],
      };
      (i % 4 === 0 ? darkTransforms : rockTransforms).push(transform);
    }

    for (let i = 0; i < 13; i += 1) {
      const angle = random() * Math.PI * 2;
      const radial = random() * heap.radius * 0.9;
      const length = 1.2 + random() * 2.9;
      beamTransforms.push({
        position: [heap.x + Math.cos(angle) * radial, 0.4 + random() * heap.height * 0.62, heap.z + Math.sin(angle) * radial],
        rotation: [(random() - 0.5) * 0.9, random() * Math.PI, (random() - 0.5) * 0.8],
        scale: [length, 0.12 + random() * 0.12, 0.18 + random() * 0.22],
      });
    }
  }

  makeInstancedPieces(group, rockTransforms, new THREE.DodecahedronGeometry(1, 0), mat(0x6b6357, { roughness: 0.96, metalness: 0.12 }), 'sf-scrap-ridge-light');
  makeInstancedPieces(group, darkTransforms, new THREE.DodecahedronGeometry(1, 0), mat(0x444a48, { roughness: 0.9, metalness: 0.34 }), 'sf-scrap-ridge-dark');
  makeInstancedPieces(group, beamTransforms, new THREE.BoxGeometry(1, 1, 1), mat(0x744c39, { roughness: 0.86, metalness: 0.5 }), 'sf-scrap-ridge-beams');

  root.add(group);
}

function buildTerrainRelief(root) {
  const group = new THREE.Group();
  group.name = 'sf-world-structure-relief';
  const transforms = [];
  const random = seededRandom(418047);
  const anchors = [
    [-55, -50, 15, 7, 12], [-25, -58, 18, 9, 13], [18, -66, 22, 11, 15], [104, -58, 19, 9, 13],
    [-60, 58, 17, 8, 14], [-16, 70, 20, 10, 15], [112, 68, 24, 12, 17], [146, 18, 18, 10, 14],
  ];
  for (const [x, z, sx, sy, sz] of anchors) {
    for (let i = 0; i < 2; i += 1) {
      transforms.push({
        position: [x + (random() - 0.5) * 8, sy * 0.33 - 1.2, z + (random() - 0.5) * 8],
        rotation: [(random() - 0.5) * 0.18, random() * Math.PI, (random() - 0.5) * 0.14],
        scale: [sx * (0.75 + random() * 0.4), sy * (0.8 + random() * 0.35), sz * (0.78 + random() * 0.4)],
      });
    }
  }
  makeInstancedPieces(group, transforms, new THREE.IcosahedronGeometry(1, 1), mat(0x777061, { roughness: 1, metalness: 0.01 }), 'sf-world-relief-masses');
  root.add(group);
}

function createLabelTexture(title, sub) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#202526';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#c6a347';
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.fillStyle = '#e8dcae';
  ctx.font = '700 72px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, 112);
  ctx.fillStyle = '#aeb7b2';
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.fillText(sub, canvas.width / 2, 184);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function buildReclaimerLandmark(root) {
  const landmarks = new THREE.Group();
  landmarks.name = 'sf-world-structure-landmarks';
  const steel = mat(0x343d3e, { roughness: 0.72, metalness: 0.66 });
  const rust = mat(0x80533a, { roughness: 0.82, metalness: 0.5 });
  const yellow = mat(0xb69135, { roughness: 0.7, metalness: 0.36 });
  const beaconMat = mat(0xe0a84b, { roughness: 0.38, metalness: 0.18, emissive: 0xb26220, emissiveIntensity: 2.2 });

  const reclaimer = new THREE.Group();
  reclaimer.position.set(99.5, 0, 17);
  reclaimer.rotation.y = -0.08;
  for (const x of [-3.8, 3.8]) {
    addBox(reclaimer, [0.62, 11.2, 0.62], steel, [x, 5.6, 0]);
    addBox(reclaimer, [1.5, 0.35, 1.8], yellow, [x, 0.18, 0]);
  }
  addBox(reclaimer, [8.3, 0.6, 0.62], steel, [0, 10.75, 0]);
  addBeam(reclaimer, [-3.5, 2.2, 0], [3.4, 9.9, 0], 0.17, yellow);
  addBeam(reclaimer, [3.5, 2.2, 0], [-3.4, 9.9, 0], 0.17, yellow);

  const wheel = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.28, 14, 48), rust);
  wheel.position.set(0, 7.15, -1.1);
  wheel.rotation.y = Math.PI / 2;
  reclaimer.add(wheel);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    addBeam(reclaimer, [0, 7.15, -1.1], [0, 7.15 + Math.sin(angle) * 3.0, -1.1 + Math.cos(angle) * 3.0], 0.075, steel, 8);
  }
  addBeam(reclaimer, [0, 10.6, -0.1], [-10.5, 5.8, -1.3], 0.24, steel, 12);
  addBeam(reclaimer, [-10.5, 5.8, -1.3], [-15.8, 1.7, -1.6], 0.2, rust, 12);

  const beacon = addCylinder(reclaimer, 0.22, 0.3, 0.42, beaconMat, [0, 11.35, 0], 14);
  beacon.rotation.z = 0;

  const signTexture = createLabelTexture('RECLAMATION YARD', 'SORTING LINE 04');
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6), new THREE.MeshBasicMaterial({ map: signTexture, side: THREE.DoubleSide }));
  sign.position.set(-0.2, 8.75, -0.5);
  sign.rotation.y = Math.PI / 2;
  reclaimer.add(sign);
  landmarks.add(reclaimer);

  const westStack = new THREE.Group();
  westStack.position.set(-25.5, 0, 34);
  addCylinder(westStack, 1.1, 1.35, 12.5, rust, [0, 6.25, 0], 18);
  addCylinder(westStack, 1.5, 1.5, 0.32, steel, [0, 2.4, 0], 18);
  addCylinder(westStack, 1.5, 1.5, 0.32, steel, [0, 6.4, 0], 18);
  addCylinder(westStack, 1.5, 1.5, 0.32, steel, [0, 10.1, 0], 18);
  addBeam(westStack, [-4.5, 2.2, 0], [4.2, 7.8, 0], 0.16, steel, 10);
  addBeam(westStack, [-4.2, 8.3, 0], [4.0, 3.0, 0], 0.16, steel, 10);
  landmarks.add(westStack);

  landmarks.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = true;
  });
  root.add(landmarks);
}

function buildYardLightPools(root) {
  const lights = new THREE.Group();
  lights.name = 'sf-world-structure-lights';
  const positions = [[32, 4.7, -26.5], [51, 4.7, -27.1], [70, 4.7, -26.4], [87, 4.7, -27.0]];
  for (const [x, y, z] of positions) {
    const light = new THREE.PointLight(0xffc27b, 1.45, 16, 2);
    light.position.set(x, y, z);
    light.castShadow = false;
    lights.add(light);
  }
  root.add(lights);
}

function applyQuality(world, quality) {
  const key = quality === 'low' ? 'low' : quality === 'medium' ? 'medium' : 'high';
  const root = world.scene.getObjectByName(ROOT_NAME);
  if (!root) return;
  const scrapRidges = root.getObjectByName('sf-world-structure-scrap-ridges');
  const relief = root.getObjectByName('sf-world-structure-relief');
  const landmarks = root.getObjectByName('sf-world-structure-landmarks');
  const lights = root.getObjectByName('sf-world-structure-lights');
  if (scrapRidges) scrapRidges.visible = key !== 'low';
  if (relief) relief.visible = key !== 'low';
  if (landmarks) landmarks.visible = true;
  if (lights) lights.visible = key === 'high';
}

function install(world) {
  if (!world?.scene || world.scene.getObjectByName(ROOT_NAME)) return Boolean(world?.scene);
  const root = new THREE.Group();
  root.name = ROOT_NAME;
  world.scene.add(root);

  buildRoadNetwork(root);
  buildScrapRidges(root);
  buildTerrainRelief(root);
  buildReclaimerLandmark(root);
  buildYardLightPools(root);

  const runtime = window.__scrapFactoryRuntime;
  const game = runtime?.getGame?.();
  const initialQuality = game?.settings?.performanceMode
    ? 'low'
    : game?.settings?.quality === 'medium'
      ? 'medium'
      : game?.settings?.quality === 'low'
        ? 'low'
        : 'high';
  applyQuality(world, initialQuality);

  const originalSetQuality = world.setQuality?.bind(world);
  world.userData ??= {};
  if (originalSetQuality && !world.userData.worldStructurePassQualityPatched) {
    world.userData.worldStructurePassQualityPatched = true;
    world.setQuality = (quality) => {
      originalSetQuality(quality);
      applyQuality(world, quality);
    };
  }
  return true;
}

function initialize() {
  return install(window.__scrapFactoryRuntime?.world);
}

if (!initialize()) {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (initialize() || attempts >= 100) window.clearInterval(timer);
  }, 50);
}
