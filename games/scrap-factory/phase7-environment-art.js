import * as THREE from 'three';

const ENV_TAG = 'phase7EnvironmentArtV2';
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function seeded(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makeGroundTexture(seed = 91) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const random = seeded(seed);

  ctx.fillStyle = '#7b7461';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 700; i += 1) {
    const value = 80 + Math.floor(random() * 65);
    const alpha = 0.025 + random() * 0.08;
    ctx.fillStyle = `rgba(${value}, ${Math.max(62, value - 9)}, ${Math.max(48, value - 24)}, ${alpha})`;
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 0.5 + random() * 2.6;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 22; i += 1) {
    ctx.strokeStyle = `rgba(45, 42, 36, ${0.05 + random() * 0.08})`;
    ctx.lineWidth = 0.8 + random() * 1.6;
    ctx.beginPath();
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 48, y + (random() - 0.5) * 48);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addOuterGround(root) {
  const texture = makeGroundTexture();
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0x807866,
    roughness: 1,
    metalness: 0,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(310, 190), material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(36, -0.055, 0);
  ground.receiveShadow = false;
  ground.userData[ENV_TAG] = true;
  root.add(ground);
  return ground;
}

function addServiceRoads(root) {
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x474943, roughness: 0.98, metalness: 0.01 });
  const shoulder = new THREE.MeshStandardMaterial({ color: 0x665f50, roughness: 1, metalness: 0 });
  const paint = new THREE.MeshBasicMaterial({ color: 0xc1ad63 });

  const roadNorth = new THREE.Mesh(new THREE.PlaneGeometry(210, 8.5), asphalt);
  roadNorth.rotation.x = -Math.PI / 2;
  roadNorth.position.set(38, 0.012, -34);
  root.add(roadNorth);

  const roadSouth = roadNorth.clone();
  roadSouth.material = asphalt;
  roadSouth.position.z = 34;
  root.add(roadSouth);

  for (const z of [-39, -29, 29, 39]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(210, 1.4), shoulder);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(38, 0.006, z);
    root.add(strip);
  }

  const dashGeometry = new THREE.BoxGeometry(3.4, 0.025, 0.12);
  const dashMesh = new THREE.InstancedMesh(dashGeometry, paint, 52);
  let index = 0;
  for (const z of [-34, 34]) {
    for (let x = -58; x <= 132; x += 8) {
      _dummy.position.set(x, 0.04, z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      dashMesh.setMatrixAt(index, _dummy.matrix);
      index += 1;
    }
  }
  dashMesh.count = index;
  dashMesh.instanceMatrix.needsUpdate = true;
  root.add(dashMesh);
}

function addRailCorridor(root) {
  const railMat = new THREE.MeshStandardMaterial({ color: 0x323839, roughness: 0.54, metalness: 0.78 });
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x4a4035, roughness: 0.96, metalness: 0.04 });

  for (const z of [-45.5, -43.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(205, 0.11, 0.1), railMat);
    rail.position.set(39, 0.09, z);
    root.add(rail);
  }

  const sleeperGeometry = new THREE.BoxGeometry(0.24, 0.09, 3.1);
  const sleepers = new THREE.InstancedMesh(sleeperGeometry, sleeperMat, 105);
  let index = 0;
  for (let x = -61; x <= 140; x += 2.05) {
    _dummy.position.set(x, 0.045, -44.45);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    sleepers.setMatrixAt(index, _dummy.matrix);
    index += 1;
  }
  sleepers.count = index;
  sleepers.instanceMatrix.needsUpdate = true;
  root.add(sleepers);
}

function addUtilityLine(root) {
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x444b4b, roughness: 0.68, metalness: 0.62 });
  const insulatorMaterial = new THREE.MeshStandardMaterial({ color: 0x786957, roughness: 0.55, metalness: 0.2 });
  const poleGeometry = new THREE.CylinderGeometry(0.11, 0.15, 7.4, 10);
  const crossGeometry = new THREE.BoxGeometry(2.25, 0.14, 0.18);
  const insulatorGeometry = new THREE.CylinderGeometry(0.09, 0.11, 0.22, 10);
  const poleCount = 13;
  const poles = new THREE.InstancedMesh(poleGeometry, poleMaterial, poleCount);
  const crossbars = new THREE.InstancedMesh(crossGeometry, poleMaterial, poleCount);
  const insulators = new THREE.InstancedMesh(insulatorGeometry, insulatorMaterial, poleCount * 2);
  const cablePoints = [];

  for (let i = 0; i < poleCount; i += 1) {
    const x = -45 + i * 14.5;
    const z = 48 + Math.sin(i * 0.72) * 1.2;

    _dummy.position.set(x, 3.7, z);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    poles.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(x, 7.08, z);
    _dummy.updateMatrix();
    crossbars.setMatrixAt(i, _dummy.matrix);

    for (let side = 0; side < 2; side += 1) {
      _dummy.position.set(x + (side === 0 ? -0.72 : 0.72), 7.28, z);
      _dummy.updateMatrix();
      insulators.setMatrixAt(i * 2 + side, _dummy.matrix);
    }

    if (i > 0) {
      const previousX = -45 + (i - 1) * 14.5;
      const previousZ = 48 + Math.sin((i - 1) * 0.72) * 1.2;
      for (const side of [-0.72, 0.72]) {
        cablePoints.push(
          previousX + side, 7.42, previousZ,
          x + side, 7.42, z,
        );
      }
    }
  }

  poles.instanceMatrix.needsUpdate = true;
  crossbars.instanceMatrix.needsUpdate = true;
  insulators.instanceMatrix.needsUpdate = true;
  root.add(poles, crossbars, insulators);

  const cableGeometry = new THREE.BufferGeometry();
  cableGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cablePoints, 3));
  const cables = new THREE.LineSegments(cableGeometry, new THREE.LineBasicMaterial({ color: 0x22292a, transparent: true, opacity: 0.72 }));
  root.add(cables);
}

function addMidgroundClutter(root) {
  const random = seeded(308);
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x665e50, roughness: 1, metalness: 0.02 });
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, 46);

  for (let i = 0; i < 46; i += 1) {
    const side = i % 2 === 0 ? 1 : -1;
    let x = -48 + random() * 184;
    let z = side * (25 + random() * 27);
    if (i % 7 === 0) x = -38 + random() * 18;
    const scale = 0.28 + random() * 0.72;
    _dummy.position.set(x, scale * 0.35, z);
    _dummy.rotation.set(random() * 0.25, random() * Math.PI, random() * 0.2);
    _dummy.scale.set(scale * (0.8 + random() * 0.8), scale * (0.55 + random() * 0.5), scale * (0.9 + random() * 0.8));
    _dummy.updateMatrix();
    rocks.setMatrixAt(i, _dummy.matrix);
  }
  rocks.instanceMatrix.needsUpdate = true;
  root.add(rocks);

  const scrubGeometry = new THREE.ConeGeometry(0.18, 0.7, 5);
  const scrubMaterial = new THREE.MeshStandardMaterial({ color: 0x77704d, roughness: 1, metalness: 0 });
  const scrub = new THREE.InstancedMesh(scrubGeometry, scrubMaterial, 58);
  for (let i = 0; i < 58; i += 1) {
    const side = i % 2 === 0 ? 1 : -1;
    const x = -52 + random() * 196;
    const z = side * (24 + random() * 31);
    const scale = 0.55 + random() * 0.9;
    _dummy.position.set(x, 0.22 * scale, z);
    _dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.24);
    _dummy.scale.set(scale, scale, scale);
    _dummy.updateMatrix();
    scrub.setMatrixAt(i, _dummy.matrix);
  }
  scrub.instanceMatrix.needsUpdate = true;
  root.add(scrub);
}

function addContainerStacks(root) {
  const geometry = new THREE.BoxGeometry(5.8, 2.45, 2.35);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0.42 });
  const data = [
    [-35, -29, 0, 0x4f6465], [-29, -29, 0.03, 0x6a5647], [-32, -29, 0.01, 0x525b49],
    [108, 31, -0.03, 0x52666b], [114, 31, 0.02, 0x6a5e49], [120, 31, -0.01, 0x5d5147],
    [88, -31, 0.02, 0x4f5c62], [94, -31, -0.04, 0x6d5948],
  ];
  const mesh = new THREE.InstancedMesh(geometry, material, data.length);
  data.forEach(([x, z, rotation, color], index) => {
    _dummy.position.set(x, 1.23 + (index === 2 || index === 5 ? 2.48 : 0), z);
    _dummy.rotation.set(0, rotation, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    mesh.setMatrixAt(index, _dummy.matrix);
    mesh.setColorAt(index, _color.setHex(color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  root.add(mesh);
}

function addFarTerrain(root) {
  const random = seeded(711);
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const material = new THREE.MeshStandardMaterial({ color: 0x6d746b, roughness: 1, metalness: 0, flatShading: false });
  const count = 34;
  const hills = new THREE.InstancedMesh(geometry, material, count);

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + random() * 0.12;
    const radius = 86 + random() * 54;
    const x = 30 + Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.66;
    const sx = 8 + random() * 17;
    const sy = 4 + random() * 11;
    const sz = 8 + random() * 18;
    _dummy.position.set(x, sy * 0.18 - 2.6, z);
    _dummy.rotation.set(0, random() * Math.PI, 0);
    _dummy.scale.set(sx, sy, sz);
    _dummy.updateMatrix();
    hills.setMatrixAt(i, _dummy.matrix);
  }
  hills.instanceMatrix.needsUpdate = true;
  root.add(hills);
}

function addFarIndustrial(root) {
  const random = seeded(1221);
  const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);
  const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x4d5859, roughness: 0.9, metalness: 0.22 });
  const buildings = new THREE.InstancedMesh(buildingGeometry, buildingMaterial, 28);

  for (let i = 0; i < 28; i += 1) {
    const north = i < 14;
    const x = -22 + (i % 14) * 11.5 + (random() - 0.5) * 4;
    const z = north ? -61 - random() * 12 : 61 + random() * 12;
    const w = 4 + random() * 8;
    const h = 5 + random() * 14;
    const d = 4 + random() * 9;
    _dummy.position.set(x, h / 2, z);
    _dummy.rotation.set(0, (random() - 0.5) * 0.15, 0);
    _dummy.scale.set(w, h, d);
    _dummy.updateMatrix();
    buildings.setMatrixAt(i, _dummy.matrix);
  }
  buildings.instanceMatrix.needsUpdate = true;
  root.add(buildings);

  const stackGeometry = new THREE.CylinderGeometry(0.62, 0.9, 1, 14);
  const stackMaterial = new THREE.MeshStandardMaterial({ color: 0x384143, roughness: 0.72, metalness: 0.56 });
  const stacks = new THREE.InstancedMesh(stackGeometry, stackMaterial, 12);
  const stackTopPositions = [];
  for (let i = 0; i < 12; i += 1) {
    const north = i % 2 === 0;
    const x = -10 + i * 12.5;
    const z = north ? -69 - random() * 5 : 69 + random() * 5;
    const height = 13 + random() * 13;
    _dummy.position.set(x, height / 2, z);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, height, 1);
    _dummy.updateMatrix();
    stacks.setMatrixAt(i, _dummy.matrix);
    stackTopPositions.push([x, height + 0.4, z]);
  }
  stacks.instanceMatrix.needsUpdate = true;
  root.add(stacks);

  return stackTopPositions;
}

function addAtmosphere(root, stackTops) {
  const random = seeded(1811);
  const positions = [];
  for (const [x, y, z] of stackTops) {
    const puffs = 7;
    for (let i = 0; i < puffs; i += 1) {
      positions.push(
        x + (random() - 0.5) * (0.4 + i * 0.28),
        y + i * 1.6 + random() * 0.8,
        z + (random() - 0.5) * (0.4 + i * 0.24),
      );
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x8f9794,
    size: 2.9,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const smoke = new THREE.Points(geometry, material);
  smoke.frustumCulled = false;
  root.add(smoke);
}

export function buildPhase7Environment(world) {
  if (!world?.scene) return null;
  world.userData ??= {};
  if (world.userData[ENV_TAG]) return world.userData[ENV_TAG];

  const root = new THREE.Group();
  root.name = ENV_TAG;
  root.userData[ENV_TAG] = true;
  world.scene.add(root);

  addOuterGround(root);
  addServiceRoads(root);
  addRailCorridor(root);
  addUtilityLine(root);
  addMidgroundClutter(root);
  addContainerStacks(root);

  const farTerrain = new THREE.Group();
  farTerrain.name = `${ENV_TAG}-terrain`;
  root.add(farTerrain);
  addFarTerrain(farTerrain);

  const skyline = new THREE.Group();
  skyline.name = `${ENV_TAG}-skyline`;
  root.add(skyline);
  const stackTops = addFarIndustrial(skyline);

  const atmosphere = new THREE.Group();
  atmosphere.name = `${ENV_TAG}-atmosphere`;
  root.add(atmosphere);
  addAtmosphere(atmosphere, stackTops);

  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
  });

  world.visualFx = {
    ...(world.visualFx || {}),
    environmentRoot: root,
    environmentTerrain: farTerrain,
    skyline,
    cloudGroup: atmosphere,
  };
  world.userData[ENV_TAG] = root;
  return root;
}
