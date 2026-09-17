import * as THREE from 'three';

const ROOT_TAG = 'scrapFactoryWorldEnvironmentOverhaul';

function material(color, {
  roughness = 0.82,
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

function addBox(parent, size, mat, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, rt, rb, height, mat, position, segments = 16, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, height, segments), mat);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addPipe(parent, a, b, radius, mat, segments = 12) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const delta = end.clone().sub(start);
  const length = delta.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), mat);
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

function addSiloCluster(parent, x, z, scale, mats) {
  const count = scale > 1.05 ? 3 : 2;
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * 4.1 * scale;
    const radius = (1.35 + (i % 2) * 0.28) * scale;
    const height = (7 + i * 1.4) * scale;
    addCylinder(parent, radius, radius, height, mats.silo, [x + offset, height / 2, z], 20);
    addCylinder(parent, 0.22 * scale, radius, 1.15 * scale, mats.silo, [x + offset, height + 0.57 * scale, z], 20);
    for (const y of [1.7, 4.1, 6.5].map((v) => v * scale).filter((v) => v < height)) {
      addCylinder(parent, radius + 0.08 * scale, radius + 0.08 * scale, 0.1 * scale, mats.dark, [x + offset, y, z], 20);
    }
  }
}

function addFactoryBlock(parent, x, z, scale, mats, variant = 0) {
  const w = (9 + variant * 1.7) * scale;
  const h = (5.2 + variant * 1.35) * scale;
  const d = (7 + (variant % 2) * 1.4) * scale;
  addBox(parent, [w, h, d], mats.factory, [x, h / 2, z]);
  addBox(parent, [w * 0.72, 0.32 * scale, d * 1.04], mats.dark, [x, h + 0.16 * scale, z]);
  for (const dx of [-w * 0.28, w * 0.25]) {
    const stackH = h * (1.6 + (dx > 0 ? 0.18 : 0));
    addCylinder(parent, 0.55 * scale, 0.72 * scale, stackH, mats.stack, [x + dx, stackH / 2, z + d * 0.16], 14);
    addCylinder(parent, 0.78 * scale, 0.5 * scale, 0.7 * scale, mats.stack, [x + dx, stackH + 0.35 * scale, z + d * 0.16], 14);
  }
}

function addGantry(parent, x, z, width, height, mats, rotation = 0) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) addBox(g, [0.38, height, 0.38], mats.dark, [sx * width / 2, height / 2, 0]);
  addBox(g, [width + 0.8, 0.38, 0.38], mats.steel, [0, height, 0]);
  addBox(g, [width + 0.35, 0.12, 0.12], mats.accent, [0, height + 0.3, 0]);
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  parent.add(g);
  return g;
}

function buildDistantIndustry(world, root) {
  const mats = {
    factory: material(0x50595a, { roughness: 0.96, metalness: 0.18 }),
    silo: material(0x626c6c, { roughness: 0.84, metalness: 0.36 }),
    dark: material(0x343b3c, { roughness: 0.88, metalness: 0.4 }),
    stack: material(0x3d4545, { roughness: 0.92, metalness: 0.34 }),
    steel: material(0x4c5657, { roughness: 0.78, metalness: 0.55 }),
    accent: material(0xa98a36, { roughness: 0.72, metalness: 0.28 }),
  };
  const skyline = new THREE.Group();
  skyline.name = 'sf-world-overhaul-skyline';

  addFactoryBlock(skyline, -4, -61, 0.9, mats, 1);
  addSiloCluster(skyline, 18, -58, 0.8, mats);
  addFactoryBlock(skyline, 44, -66, 1.05, mats, 2);
  addGantry(skyline, 72, -54, 13, 8.5, mats, 0.06);
  addSiloCluster(skyline, 91, -62, 0.92, mats);

  addSiloCluster(skyline, -10, 69, 0.78, mats);
  addFactoryBlock(skyline, 14, 72, 0.88, mats, 0);
  addGantry(skyline, 42, 63, 16, 9.5, mats, -0.08);
  addFactoryBlock(skyline, 69, 74, 1.0, mats, 1);
  addSiloCluster(skyline, 97, 67, 0.86, mats);

  addFactoryBlock(skyline, -55, -18, 0.95, mats, 1);
  addSiloCluster(skyline, -61, 4, 0.82, mats);
  addFactoryBlock(skyline, -57, 28, 0.84, mats, 0);
  addGantry(skyline, -48, 45, 11, 7.5, mats, Math.PI / 2);

  addGantry(skyline, 117, -39, 17, 10, mats, 0.03);
  addFactoryBlock(skyline, 132, 37, 0.95, mats, 2);
  addSiloCluster(skyline, 139, -2, 0.84, mats);

  const pipeMat = material(0x5b554d, { roughness: 0.8, metalness: 0.46 });
  addPipe(skyline, [-42, 6.4, -46], [104, 6.4, -46], 0.22, pipeMat, 12);
  addPipe(skyline, [-38, 5.2, 55], [112, 5.2, 55], 0.2, pipeMat, 12);

  skyline.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
  });
  root.add(skyline);
  world.visualFx ??= {};
  world.visualFx.skyline = skyline;
}

function buildPerimeterInfrastructure(root) {
  const steel = material(0x3d4647, { roughness: 0.72, metalness: 0.6 });
  const pipe = material(0x706153, { roughness: 0.76, metalness: 0.52 });
  const cable = material(0x202627, { roughness: 0.9, metalness: 0.2 });
  const lamp = material(0xc9b25b, { roughness: 0.42, metalness: 0.28, emissive: 0x5a431c, emissiveIntensity: 0.75 });
  const infra = new THREE.Group();
  infra.name = 'sf-world-overhaul-perimeter';

  for (let x = 28; x <= 88; x += 10) {
    for (const z of [-29.2, 31.4]) {
      addCylinder(infra, 0.11, 0.14, 3.4, steel, [x, 1.7, z], 10);
      addBox(infra, [2.2, 0.13, 0.13], steel, [x, 3.28, z]);
    }
  }
  addPipe(infra, [28, 3.55, -29.2], [88, 3.55, -29.2], 0.13, pipe, 12);
  addPipe(infra, [28, 3.25, -29.2], [88, 3.25, -29.2], 0.09, steel, 10);
  addPipe(infra, [28, 3.55, 31.4], [88, 3.55, 31.4], 0.13, pipe, 12);

  const northPoles = [];
  for (let x = -15; x <= 88; x += 17) {
    const z = -27.2 + Math.sin(x * 0.13) * 1.1;
    addCylinder(infra, 0.1, 0.15, 5.2, steel, [x, 2.6, z], 10);
    addBox(infra, [1.8, 0.12, 0.12], steel, [x, 4.78, z]);
    addBox(infra, [0.24, 0.14, 0.1], lamp, [x + 0.62, 4.55, z - 0.08]);
    northPoles.push([x, 4.7, z]);
  }
  for (let i = 1; i < northPoles.length; i += 1) addPipe(infra, northPoles[i - 1], northPoles[i], 0.022, cable, 6);

  infra.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = true;
  });
  root.add(infra);
}

function buildTerrainFrame(root) {
  const terrain = new THREE.Group();
  terrain.name = 'sf-world-overhaul-terrain';
  const rockGeometry = new THREE.DodecahedronGeometry(1, 1);
  const rockMaterial = material(0x665f53, { roughness: 0.98, metalness: 0.02 });
  const rockMaterialDark = material(0x514d45, { roughness: 0.99, metalness: 0.01 });
  const random = seededRandom(442109);
  const placements = [];

  for (let x = -18; x <= 96; x += 8.5) {
    placements.push([x, -35.5 - random() * 4, 4.5 + random() * 4.5, 1.8 + random() * 2.7, 3.8 + random() * 4.0]);
    placements.push([x + 2.5, 48.5 + random() * 5, 4.0 + random() * 4.0, 1.7 + random() * 2.5, 3.3 + random() * 4.2]);
  }
  for (let z = -24; z <= 39; z += 9.5) {
    placements.push([-29.5 - random() * 5, z, 4.0 + random() * 4.0, 1.9 + random() * 2.6, 3.6 + random() * 4.1]);
    placements.push([99.5 + random() * 6, z + 2, 4.3 + random() * 4.3, 2.0 + random() * 2.8, 3.8 + random() * 4.2]);
  }

  const darkCount = placements.filter((_, index) => index % 3 === 0).length;
  const lightCount = placements.length - darkCount;
  const darkRocks = new THREE.InstancedMesh(rockGeometry, rockMaterialDark, darkCount);
  const lightRocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, lightCount);
  const dummy = new THREE.Object3D();
  let darkIndex = 0;
  let lightIndex = 0;

  placements.forEach(([x, z, sx, sy, sz], index) => {
    dummy.position.set(x, sy * 0.36 - 0.2, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set((random() - 0.5) * 0.32, random() * Math.PI, (random() - 0.5) * 0.24);
    dummy.updateMatrix();
    const target = index % 3 === 0 ? darkRocks : lightRocks;
    const targetIndex = index % 3 === 0 ? darkIndex++ : lightIndex++;
    target.setMatrixAt(targetIndex, dummy.matrix);
  });

  for (const rocks of [darkRocks, lightRocks]) {
    rocks.instanceMatrix.needsUpdate = true;
    rocks.castShadow = false;
    rocks.receiveShadow = true;
    rocks.computeBoundingSphere();
    terrain.add(rocks);
  }

  const dirtMat = material(0x716956, { roughness: 1, metalness: 0 });
  for (const [x, z, w, d, rot] of [
    [18, -32.2, 34, 7, 0.03], [67, -33.0, 39, 8, -0.02],
    [17, 46.5, 39, 7, -0.02], [67, 47.2, 45, 8, 0.025],
    [-24.0, 8, 8, 56, 0.01], [96.4, 8, 9, 60, -0.015],
  ]) {
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), dirtMat);
    mound.scale.set(w / 2, 1.7, d / 2);
    mound.position.set(x, -1.22, z);
    mound.rotation.y = rot;
    mound.castShadow = false;
    mound.receiveShadow = true;
    terrain.add(mound);
  }

  root.add(terrain);
}

function buildAbandonedFacilities(root) {
  const ruins = new THREE.Group();
  ruins.name = 'sf-world-overhaul-ruins';
  const steel = material(0x3c4444, { roughness: 0.82, metalness: 0.58 });
  const rust = material(0x704d3b, { roughness: 0.9, metalness: 0.38 });
  const concrete = material(0x686b65, { roughness: 0.98, metalness: 0.02 });
  const warning = material(0xb08b32, { roughness: 0.7, metalness: 0.24 });

  const west = new THREE.Group();
  west.position.set(-30.8, 0, 20);
  west.rotation.y = 0.1;
  addBox(west, [8.5, 0.45, 5.4], concrete, [0, 0.22, 0]);
  for (const x of [-3.6, 0, 3.6]) addCylinder(west, 0.17, 0.22, 5.8, steel, [x, 2.9, -2.2], 10);
  addBox(west, [7.8, 0.28, 0.28], steel, [0, 5.65, -2.2], [0, 0, -0.06]);
  addBox(west, [4.2, 2.6, 0.22], rust, [-1.7, 1.5, 2.3], [0.08, 0.04, 0.05]);
  addBox(west, [2.2, 1.9, 0.2], concrete, [2.4, 1.0, 2.35], [-0.12, -0.05, 0.08]);
  addBox(west, [2.6, 0.18, 0.18], warning, [1.6, 3.7, -2.05], [0, 0, -0.08]);
  ruins.add(west);

  const east = new THREE.Group();
  east.position.set(96.5, 0, 30);
  east.rotation.y = -0.18;
  addBox(east, [9.2, 0.5, 5.8], concrete, [0, 0.24, 0]);
  for (const z of [-2.2, 2.2]) {
    addCylinder(east, 0.2, 0.25, 6.3, steel, [-3.7, 3.15, z], 10, [0, 0, z > 0 ? 0.08 : -0.04]);
    addCylinder(east, 0.2, 0.25, 4.8, rust, [3.6, 2.4, z], 10, [0, 0, z > 0 ? -0.16 : 0.12]);
  }
  addBox(east, [7.6, 0.32, 0.32], steel, [-0.2, 5.95, -2.2], [0, 0.02, -0.09]);
  addBox(east, [5.8, 0.28, 0.28], rust, [0.6, 4.45, 2.2], [0, -0.03, 0.16]);
  addPipe(east, [-3.5, 3.7, 0], [3.2, 3.0, 0], 0.17, rust, 10);
  ruins.add(east);

  const north = new THREE.Group();
  north.position.set(53, 0, -34.5);
  addGantry(north, 0, 0, 15, 7.2, { dark: steel, steel, accent: warning }, 0);
  addBox(north, [5.2, 2.4, 3.4], rust, [-4.5, 1.3, -2.5], [0, -0.08, -0.06]);
  addBox(north, [3.4, 1.8, 2.8], concrete, [4.7, 0.95, 2.2], [0, 0.11, 0.04]);
  ruins.add(north);

  ruins.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = true;
  });
  root.add(ruins);
}

function buildNearClutter(root) {
  const clutter = new THREE.Group();
  clutter.name = 'sf-world-overhaul-near-clutter';
  const random = seededRandom(912044);
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = material(0x5c584e, { roughness: 0.98, metalness: 0.02 });
  const rockMesh = new THREE.InstancedMesh(rockGeometry, rockMat, 42);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < 42; i += 1) {
    const side = i % 3;
    let x;
    let z;
    if (side === 0) {
      x = 28 + random() * 62;
      z = random() > 0.5 ? 25.5 + random() * 2.3 : -25.5 - random() * 2.0;
    } else if (side === 1) {
      x = 25 + random() * 65;
      z = random() > 0.5 ? 19 + random() * 5 : -19 - random() * 5;
    } else {
      x = 30 + random() * 60;
      z = -22 + random() * 44;
    }
    const s = 0.12 + random() * 0.24;
    dummy.position.set(x, s * 0.38 + 0.02, z);
    dummy.rotation.set(random() * 0.6, random() * Math.PI, random() * 0.5);
    dummy.scale.set(s * (0.8 + random()), s * (0.45 + random() * 0.55), s * (0.8 + random()));
    dummy.updateMatrix();
    rockMesh.setMatrixAt(i, dummy.matrix);
  }
  rockMesh.instanceMatrix.needsUpdate = true;
  rockMesh.castShadow = false;
  rockMesh.receiveShadow = true;
  clutter.add(rockMesh);

  const scrapMat = material(0x666a65, { roughness: 0.86, metalness: 0.5 });
  const scrapRust = material(0x774d38, { roughness: 0.88, metalness: 0.42 });
  for (let i = 0; i < 24; i += 1) {
    const x = 30 + random() * 59;
    const z = -25 + random() * 50;
    const width = 0.18 + random() * 0.46;
    const depth = 0.1 + random() * 0.32;
    const piece = addBox(clutter, [width, 0.018 + random() * 0.018, depth], i % 4 === 0 ? scrapRust : scrapMat, [x, 0.075, z]);
    piece.rotation.y = random() * Math.PI;
    piece.rotation.z = (random() - 0.5) * 0.12;
    piece.castShadow = false;
  }

  root.add(clutter);
}

function buildGroundStory(root) {
  const random = seededRandom(170926);
  const stains = new THREE.Group();
  stains.name = 'sf-world-overhaul-ground-details';

  const oil = new THREE.MeshBasicMaterial({ color: 0x2c312f, transparent: true, opacity: 0.25, depthWrite: false });
  const rust = new THREE.MeshBasicMaterial({ color: 0x76503d, transparent: true, opacity: 0.2, depthWrite: false });
  const dust = new THREE.MeshBasicMaterial({ color: 0xaaa089, transparent: true, opacity: 0.15, depthWrite: false });

  for (let i = 0; i < 34; i += 1) {
    const x = 25 + random() * 67;
    const z = -27 + random() * 54;
    const radius = 0.7 + random() * 2.7;
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 20), i % 3 === 0 ? rust : i % 4 === 0 ? dust : oil);
    mesh.scale.set(radius, radius * (0.45 + random() * 0.55), 1);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = random() * Math.PI;
    mesh.position.set(x, 0.049 + (i % 3) * 0.001, z);
    stains.add(mesh);
  }

  const trackMat = new THREE.MeshBasicMaterial({ color: 0x353936, transparent: true, opacity: 0.18, depthWrite: false });
  for (const z of [-4.4, -3.35]) {
    const track = new THREE.Mesh(new THREE.PlaneGeometry(61, 0.46), trackMat);
    track.rotation.x = -Math.PI / 2;
    track.rotation.z = 0.035;
    track.position.set(59, 0.052, z);
    stains.add(track);
  }
  for (const z of [15.0, 16.0]) {
    const track = new THREE.Mesh(new THREE.PlaneGeometry(43, 0.34), trackMat);
    track.rotation.x = -Math.PI / 2;
    track.rotation.z = -0.08;
    track.position.set(62, 0.053, z);
    stains.add(track);
  }

  const plateMat = material(0x575c59, { roughness: 0.88, metalness: 0.48 });
  for (let i = 0; i < 18; i += 1) {
    const x = 27 + random() * 63;
    const z = -26 + random() * 52;
    const w = 0.35 + random() * 0.85;
    const d = 0.22 + random() * 0.55;
    addBox(stains, [w, 0.025, d], plateMat, [x, 0.065, z], [0, random() * Math.PI, (random() - 0.5) * 0.08]);
  }

  root.add(stains);
}

function buildSkyLayer(world, root) {
  const sky = new THREE.Group();
  sky.name = 'sf-world-overhaul-sky';

  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x6f8992) },
      horizonColor: { value: new THREE.Color(0xb8b2a2) },
      bottomColor: { value: new THREE.Color(0x8f9791) },
    },
    vertexShader: `
      varying float vHeight;
      void main() {
        vHeight = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vHeight;
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      void main() {
        float upper = smoothstep(-0.02, 0.62, vHeight);
        float lower = smoothstep(-0.75, 0.0, vHeight);
        vec3 lowBand = mix(bottomColor, horizonColor, lower);
        vec3 color = mix(lowBand, topColor, upper);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(165, 36, 20), skyMaterial);
  dome.position.set(34, 18, 7);
  dome.renderOrder = -10;
  sky.add(dome);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(4.6, 20, 12),
    new THREE.MeshBasicMaterial({ color: 0xf3d39a, transparent: true, opacity: 0.82, depthWrite: false }),
  );
  sun.position.set(-84, 58, -118);
  sky.add(sun);

  const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xc7cdca, transparent: true, opacity: 0.075, depthWrite: false });
  const cloudGeometry = new THREE.SphereGeometry(1, 12, 8);
  const cloudMesh = new THREE.InstancedMesh(cloudGeometry, cloudMaterial, 22);
  const random = seededRandom(209716);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 22; i += 1) {
    const angle = (i / 22) * Math.PI * 2 + random() * 0.2;
    const radius = 78 + random() * 35;
    dummy.position.set(34 + Math.cos(angle) * radius, 27 + random() * 15, 7 + Math.sin(angle) * radius);
    dummy.scale.set(8 + random() * 13, 1.4 + random() * 2.6, 3.5 + random() * 8);
    dummy.rotation.y = random() * Math.PI;
    dummy.updateMatrix();
    cloudMesh.setMatrixAt(i, dummy.matrix);
  }
  cloudMesh.instanceMatrix.needsUpdate = true;
  cloudMesh.frustumCulled = false;
  sky.add(cloudMesh);

  root.add(sky);
  world.visualFx ??= {};
  world.visualFx.environmentSky = sky;
}

function buildIndustrialSmoke(world, root) {
  const smoke = new THREE.Group();
  smoke.name = 'sf-world-overhaul-smoke';
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0x7b8280, transparent: true, opacity: 0.085, depthWrite: false });
  const geometry = new THREE.SphereGeometry(1, 12, 8);
  const sources = [[-3, 13, -61], [44, 17, -66], [69, 13, 74], [-55, 15, -18], [132, 17, 37]];
  for (const [x, y, z] of sources) {
    for (let i = 0; i < 5; i += 1) {
      const puff = new THREE.Mesh(geometry, smokeMat);
      puff.position.set(x + i * 0.45, y + i * 2.2, z + Math.sin(i) * 0.7);
      const scale = 1.2 + i * 0.65;
      puff.scale.set(scale * 1.25, scale, scale);
      smoke.add(puff);
    }
  }
  root.add(smoke);
  world.visualFx ??= {};
  world.visualFx.environmentSmoke = smoke;
}

function buildHorizonHaze(world, root) {
  const haze = new THREE.Group();
  haze.name = 'sf-world-overhaul-haze';
  const hazeMat = new THREE.MeshBasicMaterial({
    color: 0xaeb8b6,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const positions = [
    [34, 17, -83, 150, 34, 0],
    [34, 16, 92, 150, 32, 0],
    [-78, 16, 8, 145, 32, Math.PI / 2],
    [157, 18, 8, 145, 36, Math.PI / 2],
  ];
  for (const [x, y, z, w, h, ry] of positions) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), hazeMat);
    plane.position.set(x, y, z);
    plane.rotation.y = ry;
    haze.add(plane);
  }
  root.add(haze);
  world.visualFx ??= {};
  world.visualFx.cloudGroup = haze;
}

function tuneAtmosphere(world) {
  const { scene, renderer } = world;
  scene.background = new THREE.Color(0x93a3a6);
  scene.fog = new THREE.FogExp2(0x9fa9a6, 0.0094);
  renderer.toneMappingExposure = 1.05;

  const ambientLift = new THREE.HemisphereLight(0xc9dde2, 0x51473c, 0.24);
  ambientLift.name = 'sf-world-overhaul-hemi';
  scene.add(ambientLift);
  const warmRim = new THREE.DirectionalLight(0xf0bd82, 0.32);
  warmRim.name = 'sf-world-overhaul-rim';
  warmRim.position.set(-45, 28, -32);
  warmRim.castShadow = false;
  scene.add(warmRim);
}

function applyEnvironmentQuality(world, quality) {
  const key = quality === 'low' ? 'low' : quality === 'medium' ? 'medium' : 'high';
  const root = world.scene.getObjectByName(ROOT_TAG);
  const groundDetails = root?.getObjectByName('sf-world-overhaul-ground-details');
  const perimeter = root?.getObjectByName('sf-world-overhaul-perimeter');
  const terrain = root?.getObjectByName('sf-world-overhaul-terrain');
  const ruins = root?.getObjectByName('sf-world-overhaul-ruins');
  const clutter = root?.getObjectByName('sf-world-overhaul-near-clutter');
  const smoke = root?.getObjectByName('sf-world-overhaul-smoke');
  const sky = root?.getObjectByName('sf-world-overhaul-sky');
  if (world.visualFx?.skyline) world.visualFx.skyline.visible = key !== 'low';
  if (world.visualFx?.cloudGroup) world.visualFx.cloudGroup.visible = key !== 'low';
  if (groundDetails) groundDetails.visible = key !== 'low';
  if (perimeter) perimeter.visible = true;
  if (terrain) terrain.visible = true;
  if (ruins) ruins.visible = key !== 'low';
  if (clutter) clutter.visible = key === 'high';
  if (smoke) smoke.visible = key === 'high';
  if (sky) sky.visible = true;
}

function install(world) {
  if (!world?.scene || world.scene.userData?.[ROOT_TAG]) return false;
  world.scene.userData[ROOT_TAG] = true;

  tuneAtmosphere(world);
  const root = new THREE.Group();
  root.name = ROOT_TAG;
  root.userData[ROOT_TAG] = true;
  world.scene.add(root);

  buildSkyLayer(world, root);
  buildDistantIndustry(world, root);
  buildTerrainFrame(root);
  buildAbandonedFacilities(root);
  buildPerimeterInfrastructure(root);
  buildNearClutter(root);
  buildGroundStory(root);
  buildIndustrialSmoke(world, root);
  buildHorizonHaze(world, root);

  const runtime = window.__scrapFactoryRuntime;
  const game = runtime?.getGame?.();
  const initialQuality = game?.settings?.performanceMode
    ? 'low'
    : game?.settings?.quality === 'medium'
      ? 'medium'
      : game?.settings?.quality === 'low'
        ? 'low'
        : 'high';
  applyEnvironmentQuality(world, initialQuality);

  const originalSetQuality = world.setQuality?.bind(world);
  if (originalSetQuality && !world.userData?.worldEnvironmentQualityPatched) {
    world.userData ??= {};
    world.userData.worldEnvironmentQualityPatched = true;
    world.setQuality = (quality) => {
      originalSetQuality(quality);
      applyEnvironmentQuality(world, quality);
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
