import * as THREE from 'three';

const V3_TAG = 'sfVisualOverhaulV3';
const V4_TAG = 'sfVisualRefinementV4';
const textureCache = new Map();

function seeded(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function finishTexture(seed = 1) {
  const key = String(seed);
  if (textureCache.has(key)) return textureCache.get(key);
  const random = seeded(seed);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(256, 256);
  for (let i = 0; i < image.data.length; i += 4) {
    const broad = Math.sin((i / 4 % 256) * 0.16) * 7;
    const noise = (random() - 0.5) * 30;
    const value = Math.max(72, Math.min(196, 134 + broad + noise));
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = '#777';
  ctx.lineWidth = 1;
  for (let i = 0; i < 90; i += 1) {
    const y = random() * 256;
    const x = random() * 256;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(Math.min(256, x + 10 + random() * 50), y + (random() - 0.5) * 2);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.5, 3.5);
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

function decalTexture(title, code) {
  const key = `decal:${title}:${code}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#151a1b';
  ctx.fillRect(0, 0, 512, 192);
  ctx.fillStyle = '#d0a83d';
  ctx.fillRect(0, 0, 18, 192);
  ctx.fillStyle = '#e4e7e4';
  ctx.font = '800 54px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 46, 78);
  ctx.fillStyle = '#8e9a9b';
  ctx.font = '650 26px system-ui, sans-serif';
  ctx.fillText(code, 48, 138);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

function addMesh(parent, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData[V4_TAG] = true;
  parent.add(mesh);
  return mesh;
}

function metal(color, metalness = 0.7, roughness = 0.38) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function enforceOwnership(root) {
  const v3 = root?.children?.find((child) => child.userData?.[V3_TAG]);
  if (!v3) return null;
  for (const child of root.children) {
    if (child === v3 || child.userData?.[V4_TAG]) continue;
    child.visible = false;
    child.traverse((node) => {
      if (node.isMesh) node.visible = false;
    });
  }
  return v3;
}

function applySurfaceFinish(v3, seed) {
  const finish = finishTexture(seed);
  v3.traverse((node) => {
    if (!node.isMesh || !node.material?.isMeshStandardMaterial || node.userData?.[V4_TAG]) return;
    const mat = node.material;
    if (mat.transparent || Number(mat.emissiveIntensity || 0) > 0.7) return;
    mat.bumpMap = finish;
    mat.bumpScale = 0.018;
    mat.roughnessMap = finish;
    mat.roughness = THREE.MathUtils.clamp(Number(mat.roughness ?? 0.55) * 0.9, 0.24, 0.86);
    mat.envMapIntensity = 0.9;
    mat.needsUpdate = true;
  });
}

function addFastenerRing(group, radius, y, count, material, { z = -0.78, scale = 1 } = {}) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    addMesh(
      group,
      new THREE.CylinderGeometry(0.035 * scale, 0.035 * scale, 0.035, 12),
      material,
      [Math.cos(angle) * radius, y + Math.sin(angle) * radius, z],
      [Math.PI / 2, 0, 0],
    );
  }
}

function addBaseFasteners(group, material) {
  for (const x of [-0.82, 0.82]) {
    for (const z of [-0.68, 0.68]) {
      addMesh(group, new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12), material, [x, 0.30, z]);
    }
  }
}

function addContactShadow(group, size = [1.05, 0.8]) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(0,0,0,.34)');
  gradient.addColorStop(0.58, 'rgba(0,0,0,.18)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const mesh = addMesh(group, new THREE.PlaneGeometry(size[0] * 2.4, size[1] * 2.4), material, [0, 0.028, 0], [-Math.PI / 2, 0, 0]);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 1;
}

function addDecal(group, type, position = [0, 1.0, -1.02], size = [0.9, 0.34]) {
  const labels = {
    crusher: ['CRUSHER', 'M-CR 01'],
    smelter: ['SMELTER', 'THERMAL 02'],
    storage: ['STORAGE', 'BUFFER 03'],
    industrial_storage: ['STORAGE', 'BUFFER 03'],
    assembler: ['ASSEMBLER', 'AUTO CELL 04'],
    fabricator: ['FABRICATOR', 'EXPERIMENTAL'],
    drone_port: ['DRONE PORT', 'LOGISTICS 05'],
    generator: ['GENERATOR', 'POWER 06'],
    battery: ['BATTERY', 'GRID 07'],
    hopper: ['HOPPER', 'INPUT 00'],
    seller: ['SELLER', 'EXPORT 09'],
  };
  const [title, code] = labels[type] || ['MACHINE', String(type || 'UNIT').toUpperCase()];
  const material = new THREE.MeshBasicMaterial({ map: decalTexture(title, code), transparent: true });
  const mesh = addMesh(group, new THREE.PlaneGeometry(...size), material, position, [0, 0, 0]);
  mesh.castShadow = false;
  return mesh;
}

function addTypeDetails(group, type) {
  const steel = metal(0x22292b, 0.84, 0.34);
  const bright = metal(0x879397, 0.72, 0.3);
  const yellow = metal(0xd0a83c, 0.38, 0.4);
  const copper = metal(0xa86a48, 0.76, 0.3);

  addBaseFasteners(group, bright);
  addContactShadow(group);

  if (type === 'crusher') {
    addFastenerRing(group, 0.45, 1.05, 10, bright, { z: -0.79 });
    for (const x of [-0.48, 0.48]) {
      addMesh(group, new THREE.CylinderGeometry(0.12, 0.12, 0.18, 20), copper, [x, 1.05, -0.87], [Math.PI / 2, 0, 0]);
    }
    addDecal(group, type, [0, 0.47, -0.96], [0.9, 0.3]);
  } else if (type === 'smelter') {
    for (const x of [-0.52, 0, 0.52]) addMesh(group, new THREE.BoxGeometry(0.055, 1.15, 0.055), steel, [x, 1.16, -0.94]);
    addMesh(group, new THREE.TorusGeometry(0.72, 0.035, 12, 40), yellow, [0, 1.52, -0.7], [Math.PI / 2, 0, 0]);
    addDecal(group, type, [0, 0.57, -1.03], [0.82, 0.28]);
  } else if (type === 'storage' || type === 'industrial_storage') {
    for (const x of [-0.56, 0.56]) {
      for (const y of [0.62, 1.15, 1.62]) addMesh(group, new THREE.TorusGeometry(0.49, 0.025, 10, 36), steel, [x, y, 0], [Math.PI / 2, 0, 0]);
      addMesh(group, new THREE.CylinderGeometry(0.08, 0.08, 0.22, 18), bright, [x, 2.04, 0]);
    }
    addDecal(group, type, [0, 0.72, -0.51], [0.82, 0.28]);
  } else if (type.includes('assembler') || type.includes('fabricator')) {
    for (const side of [-1, 1]) {
      addMesh(group, new THREE.TorusGeometry(0.27, 0.028, 10, 32), yellow, [side * 0.82, 1.0, -0.84], [Math.PI / 2, 0, 0]);
      addMesh(group, new THREE.CylinderGeometry(0.045, 0.045, 0.52, 16), copper, [side * 0.68, 1.46, -0.26], [0.18 * side, 0, 0.16 * side]);
    }
    addDecal(group, type.includes('fabricator') ? 'fabricator' : 'assembler', [0, 0.63, -0.75], [0.86, 0.29]);
  } else if (type.includes('drone_port')) {
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      addMesh(group, new THREE.CylinderGeometry(0.038, 0.038, 0.05, 10), bright, [Math.cos(angle) * 0.92, 0.39, Math.sin(angle) * 0.92]);
    }
    addDecal(group, 'drone_port', [0, 0.73, -0.43], [0.72, 0.24]);
  } else if (type.includes('generator') || type.includes('battery')) {
    addDecal(group, type.includes('battery') ? 'battery' : 'generator', [0, 0.58, -0.78], [0.82, 0.28]);
  } else if (type === 'hopper' || type === 'seller') {
    addDecal(group, type, [0, 0.66, -0.87], [0.82, 0.28]);
  }
}

function refineRoot(root) {
  if (!root?.userData?.[V3_TAG]) return false;
  const v3 = enforceOwnership(root);
  if (!v3) return false;
  const type = String(root.userData?.entity?.type || '').toLowerCase();
  if (!v3.userData?.[V4_TAG]) {
    v3.userData[V4_TAG] = true;
    applySurfaceFinish(v3, [...type].reduce((sum, char) => sum + char.charCodeAt(0), 17));
    addTypeDetails(v3, type);
  }
  return true;
}

function install(world) {
  if (!world || world.__sfVisualV4Installed) return;
  world.__sfVisualV4Installed = true;

  const refineAll = () => {
    for (const root of world.buildingMeshes?.values?.() || []) refineRoot(root);
    if (world.buildPreview) refineRoot(world.buildPreview);
  };

  refineAll();

  const originalAddBuilding = typeof world.addBuilding === 'function' ? world.addBuilding.bind(world) : null;
  if (originalAddBuilding) {
    world.addBuilding = (building) => {
      const root = originalAddBuilding(building);
      if (root) {
        refineRoot(root);
        window.setTimeout(() => refineRoot(root), 0);
        window.setTimeout(() => refineRoot(root), 120);
      }
      return root;
    };
  }

  const originalStartBuild = typeof world.startBuild === 'function' ? world.startBuild.bind(world) : null;
  if (originalStartBuild) {
    world.startBuild = (type) => {
      const result = originalStartBuild(type);
      if (world.buildPreview) refineRoot(world.buildPreview);
      return result;
    };
  }

  // Older runtime visual patches can attach after a machine is created. Keep a
  // low-frequency ownership guard so the v3/v4 machine remains the only visible
  // machine body without touching gameplay state or collision.
  world.__sfVisualV4OwnershipTimer = window.setInterval(refineAll, 700);
}

function attach() {
  const world = window.__scrapFactoryRuntime?.world;
  if (!world) return false;
  install(world);
  return true;
}

if (!attach()) {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (attach() || attempts >= 120) window.clearInterval(timer);
  }, 100);
}
