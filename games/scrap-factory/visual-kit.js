import * as THREE from 'three';

export function makeMaterial(color, roughness = 0.78, metalness = 0.2, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

export function canvasTexture(size, draw, { srgb = true, repeat = null } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  texture.anisotropy = 4;
  return texture;
}

function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function concreteTexture(seed = 1, repeat = [7, 4]) {
  const random = seeded(seed);
  return canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#777871';
    ctx.fillRect(0, 0, size, size);
    const image = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < image.data.length; i += 4) {
      const noise = Math.floor((random() - 0.5) * 26);
      image.data[i] = Math.max(0, Math.min(255, image.data[i] + noise));
      image.data[i + 1] = Math.max(0, Math.min(255, image.data[i + 1] + noise));
      image.data[i + 2] = Math.max(0, Math.min(255, image.data[i + 2] + noise));
    }
    ctx.putImageData(image, 0, 0);

    for (let i = 0; i < 22; i += 1) {
      const x = random() * size;
      const y = random() * size;
      const r = 7 + random() * 30;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, `rgba(42,38,33,${0.08 + random() * 0.08})`);
      gradient.addColorStop(1, 'rgba(42,38,33,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    ctx.strokeStyle = 'rgba(38,40,39,0.22)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i += 1) {
      let x = random() * size;
      let y = random() * size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const segments = 2 + Math.floor(random() * 4);
      for (let j = 0; j < segments; j += 1) {
        x += (random() - 0.5) * 80;
        y += (random() - 0.5) * 80;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, { repeat });
}

export function dirtTexture(seed = 2, repeat = [8, 5]) {
  const random = seeded(seed);
  return canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#716b59';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 9000; i += 1) {
      const v = Math.floor(65 + random() * 70);
      const a = 0.03 + random() * 0.12;
      ctx.fillStyle = `rgba(${v},${Math.floor(v * 0.92)},${Math.floor(v * 0.72)},${a})`;
      const s = random() < 0.92 ? 1 : 2 + random() * 3;
      ctx.fillRect(random() * size, random() * size, s, s);
    }
    for (let i = 0; i < 35; i += 1) {
      const x = random() * size;
      const y = random() * size;
      const rx = 10 + random() * 35;
      const ry = 6 + random() * 20;
      ctx.fillStyle = `rgba(52,49,39,${0.05 + random() * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat });
}

export function corrugatedTexture(color = '#5d6666', seed = 3) {
  const random = seeded(seed);
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 16) {
      ctx.fillStyle = x % 32 === 0 ? 'rgba(255,255,255,.065)' : 'rgba(0,0,0,.09)';
      ctx.fillRect(x, 0, 7, size);
    }
    for (let i = 0; i < 80; i += 1) {
      const x = random() * size;
      const y = random() * size;
      const r = 1 + random() * 6;
      ctx.fillStyle = `rgba(91,47,28,${0.05 + random() * 0.18})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat: [2, 1] });
}

export function hazardTexture() {
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#d1ad35';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#202426';
    ctx.lineWidth = 44;
    for (let x = -size; x < size * 2; x += 88) {
      ctx.beginPath();
      ctx.moveTo(x, size);
      ctx.lineTo(x + size, 0);
      ctx.stroke();
    }
  }, { repeat: [3, 1] });
}

export function chainLinkTexture() {
  return canvasTexture(256, (ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(188,195,194,.7)';
    ctx.lineWidth = 2;
    const spacing = 22;
    for (let x = -size; x < size * 2; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + size, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, size);
      ctx.lineTo(x + size, 0);
      ctx.stroke();
    }
  }, { srgb: true, repeat: [2, 1] });
}

export function labelTexture(text, { width = 512, height = 128, background = '#202426', foreground = '#e4c85e', sub = '' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = foreground;
  ctx.font = `800 ${Math.round(height * 0.38)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, sub ? height * 0.42 : height / 2);
  if (sub) {
    ctx.fillStyle = '#cbd0ce';
    ctx.font = `600 ${Math.round(height * 0.16)}px system-ui`;
    ctx.fillText(sub, width / 2, height * 0.76);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function cloudTexture(seed = 4) {
  const random = seeded(seed);
  return canvasTexture(256, (ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    for (let i = 0; i < 18; i += 1) {
      const x = size * (0.2 + random() * 0.6);
      const y = size * (0.35 + random() * 0.3);
      const r = size * (0.06 + random() * 0.13);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,.38)');
      g.addColorStop(0.6, 'rgba(255,255,255,.18)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

export function addMesh(parent, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

export function addBox(parent, size, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  return addMesh(parent, new THREE.BoxGeometry(...size), material, position, rotation);
}

export function addCylinder(parent, radiusTop, radiusBottom, height, segments, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  return addMesh(parent, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material, position, rotation);
}

export function addPipeBetween(parent, a, b, radius, material, segments = 10) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const length = start.distanceTo(end);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material);
  mesh.position.copy(mid);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
  parent.add(mesh);
  return mesh;
}

export function addPanelLabel(parent, text, position, rotation, size = [3.2, 0.9], options = {}) {
  const texture = labelTexture(text, options);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

export function createSky(scene) {
  const geometry = new THREE.SphereGeometry(165, 24, 14);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x5f92aa) },
      horizonColor: { value: new THREE.Color(0xc2c8bf) },
      bottomColor: { value: new THREE.Color(0x8d897a) },
      sunDirection: { value: new THREE.Vector3(-0.3, 0.68, 0.45).normalize() },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = normalize(world.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorld;
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      uniform vec3 sunDirection;
      void main() {
        float h = clamp(vWorld.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 base = mix(bottomColor, horizonColor, smoothstep(0.0, 0.48, h));
        base = mix(base, topColor, smoothstep(0.48, 1.0, h));
        float sun = pow(max(dot(vWorld, sunDirection), 0.0), 180.0);
        base += vec3(1.0, 0.72, 0.38) * sun * 1.7;
        gl_FragColor = vec4(base, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geometry, material);
  scene.add(sky);

  const cloudMat = new THREE.MeshBasicMaterial({
    map: cloudTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const cloudGroup = new THREE.Group();
  const positions = [
    [25, 38, -55, 34, 12],
    [75, 31, 18, 28, 10],
    [-35, 29, 45, 24, 9],
    [108, 36, -28, 32, 11],
  ];
  for (const [x, y, z, w, h] of positions) {
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cloudMat);
    cloud.position.set(x, y, z);
    cloud.rotation.x = -Math.PI / 2.25;
    cloud.rotation.z = 0.15;
    cloudGroup.add(cloud);
  }
  scene.add(cloudGroup);
  return { sky, cloudGroup };
}

export function createDust(scene, count = 140) {
  const positions = new Float32Array(count * 3);
  const random = seeded(99);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = -18 + random() * 112;
    positions[i * 3 + 1] = 0.4 + random() * 7;
    positions[i * 3 + 2] = -31 + random() * 62;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xd9c99d,
    size: 0.06,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return points;
}
