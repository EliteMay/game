import * as THREE from 'three';
import { PLANET_STAGES, SPECIES } from './config.js';

const seeded = (index, salt = 1) => {
  const x = Math.sin((index + 1) * 9283.31 + salt * 331.17) * 43758.5453;
  return x - Math.floor(x);
};

function pointOnSphere(index, radius = 1, salt = 1) {
  const u = seeded(index, salt);
  const v = seeded(index, salt + 17);
  const theta = Math.PI * 2 * u;
  const phi = Math.acos(2 * v - 1);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export class OrbloomWorld {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = options;
    this.stage = 0;
    this.reducedMotion = false;
    this.dragging = false;
    this.moved = false;
    this.lastPointer = { x: 0, y: 0 };
    this.raf = 0;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x071018, 0.032);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(0, 0.2, 4.15);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x071018, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.planet = new THREE.Group();
    this.scene.add(this.planet);

    this.landMaterial = new THREE.MeshStandardMaterial({ color: 0x625d5b, roughness: 0.92, metalness: 0.02 });
    this.land = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 48), this.landMaterial);
    this.land.rotation.z = -0.13;
    this.planet.add(this.land);

    this.oceanMaterial = new THREE.MeshPhysicalMaterial({ color: 0x23425a, roughness: 0.28, metalness: 0.02, transparent: true, opacity: 0, transmission: 0.04 });
    this.ocean = new THREE.Mesh(new THREE.SphereGeometry(1.014, 64, 40), this.oceanMaterial);
    this.planet.add(this.ocean);

    this.atmosphereMaterial = new THREE.MeshBasicMaterial({ color: 0x5c9dc6, transparent: true, opacity: 0, side: THREE.BackSide, blending: THREE.AdditiveBlending });
    this.atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.105, 56, 36), this.atmosphereMaterial);
    this.planet.add(this.atmosphere);

    this.glowMaterial = new THREE.MeshBasicMaterial({ color: 0x69a7cd, transparent: true, opacity: 0.055, side: THREE.BackSide, blending: THREE.AdditiveBlending });
    this.glow = new THREE.Mesh(new THREE.SphereGeometry(1.22, 48, 32), this.glowMaterial);
    this.planet.add(this.glow);

    this.cloudGroup = new THREE.Group();
    this.forestGroup = new THREE.Group();
    this.crystalGroup = new THREE.Group();
    this.speciesGroup = new THREE.Group();
    this.planet.add(this.cloudGroup, this.forestGroup, this.crystalGroup, this.speciesGroup);
    this.buildDecorations();
    this.buildStars();

    this.scene.add(new THREE.HemisphereLight(0x88bce0, 0x201916, 1.45));
    const key = new THREE.DirectionalLight(0xffedcf, 3.8);
    key.position.set(4.5, 2.5, 5.5);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7d63d9, 2.1);
    rim.position.set(-4, -1, -3);
    this.scene.add(rim);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement || canvas);
    this.bindInput();
    this.resize();
    this.animate();
  }

  buildStars() {
    const positions = [];
    for (let i = 0; i < 900; i += 1) {
      const point = pointOnSphere(i, 28 + seeded(i, 49) * 34, 70);
      positions.push(point.x, point.y, point.z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.stars = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xc9d8ee, size: 0.035, sizeAttenuation: true, transparent: true, opacity: 0.78 }));
    this.scene.add(this.stars);
  }

  buildDecorations() {
    const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xeaf7ff, roughness: 1, transparent: true, opacity: 0.34 });
    for (let i = 0; i < 18; i += 1) {
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.055 + seeded(i, 4) * 0.045, 10, 8), cloudMaterial);
      cloud.position.copy(pointOnSphere(i, 1.055, 12));
      cloud.scale.set(1.8, 0.5, 1);
      cloud.lookAt(0, 0, 0);
      this.cloudGroup.add(cloud);
    }

    const forestMaterial = new THREE.MeshStandardMaterial({ color: 0x49a66b, roughness: 0.88 });
    const forestGeometry = new THREE.ConeGeometry(0.026, 0.105, 6);
    for (let i = 0; i < 54; i += 1) {
      const tree = new THREE.Mesh(forestGeometry, forestMaterial);
      const p = pointOnSphere(i, 1.035, 34);
      if (p.y < -0.36) p.y = Math.abs(p.y) * 0.65;
      tree.position.copy(p);
      tree.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize());
      this.forestGroup.add(tree);
    }

    const crystalMaterial = new THREE.MeshStandardMaterial({ color: 0xc78cff, emissive: 0x6f349e, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.16 });
    const crystalGeometry = new THREE.OctahedronGeometry(0.045, 0);
    for (let i = 0; i < 28; i += 1) {
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
      const p = pointOnSphere(i, 1.045, 93);
      if (p.x < 0.05) p.x = Math.abs(p.x) + 0.12;
      crystal.position.copy(p);
      crystal.scale.y = 1.8 + seeded(i, 87);
      crystal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize());
      this.crystalGroup.add(crystal);
    }
  }

  bindInput() {
    this.onPointerDown = (event) => {
      this.dragging = true;
      this.moved = false;
      this.lastPointer.x = event.clientX;
      this.lastPointer.y = event.clientY;
      this.canvas.setPointerCapture?.(event.pointerId);
    };
    this.onPointerMove = (event) => {
      if (!this.dragging) return;
      const dx = event.clientX - this.lastPointer.x;
      const dy = event.clientY - this.lastPointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) this.moved = true;
      this.planet.rotation.y += dx * 0.006;
      this.planet.rotation.x = THREE.MathUtils.clamp(this.planet.rotation.x + dy * 0.004, -0.65, 0.65);
      this.lastPointer.x = event.clientX;
      this.lastPointer.y = event.clientY;
    };
    this.onPointerUp = (event) => {
      if (!this.dragging) return;
      this.dragging = false;
      if (!this.moved) this.pickBiome(event);
    };
    this.onWheel = (event) => {
      event.preventDefault();
      this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z + Math.sign(event.deltaY) * 0.25, 3.0, 5.4);
    };
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  pickBiome(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.land, false)[0];
    if (!hit) return;
    const local = this.planet.worldToLocal(hit.point.clone()).normalize();
    let biomeId = 'rocky';
    if (this.stage >= 3 && local.x > 0.44) biomeId = 'crystal';
    else if (this.stage >= 2 && local.y > 0.17) biomeId = 'forest';
    else if (this.stage >= 1 && local.y < -0.18) biomeId = 'ocean';
    this.options.onBiomeSelect?.(biomeId);
  }

  setState(state) {
    this.stage = Number(state.planetStage || 0);
    const stage = PLANET_STAGES[this.stage] || PLANET_STAGES[0];
    const palette = stage.palette;
    this.landMaterial.color.setHex(palette.land);
    this.landMaterial.emissive?.setHex?.(this.stage >= 5 ? 0x0c261e : 0x000000);
    this.landMaterial.emissiveIntensity = this.stage >= 5 ? 0.18 : 0;
    this.oceanMaterial.color.setHex(palette.ocean);
    this.oceanMaterial.opacity = this.stage >= 1 ? Math.min(0.76, 0.26 + Number(state.biomes?.ocean?.level || 0) * 0.018) : 0;
    this.atmosphereMaterial.color.setHex(palette.atmosphere);
    this.atmosphereMaterial.opacity = this.stage >= 2 ? Math.min(0.19, 0.055 + this.stage * 0.018) : 0;
    this.glowMaterial.color.setHex(palette.atmosphere);
    this.glowMaterial.opacity = this.stage >= 2 ? 0.05 + this.stage * 0.012 : 0.025;
    this.cloudGroup.visible = this.stage >= 2;
    const forestCount = Math.min(this.forestGroup.children.length, Math.floor(Number(state.biomes?.forest?.level || 0) * 2.8));
    this.forestGroup.children.forEach((child, i) => { child.visible = this.stage >= 2 && i < forestCount; });
    const crystalCount = Math.min(this.crystalGroup.children.length, Math.floor(Number(state.biomes?.crystal?.level || 0) * 2));
    this.crystalGroup.children.forEach((child, i) => { child.visible = this.stage >= 3 && i < crystalCount; });
    this.updateSpecies(state);
  }

  updateSpecies(state) {
    while (this.speciesGroup.children.length) {
      const child = this.speciesGroup.children.pop();
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    }
    const placed = SPECIES.filter((entry) => state.species?.[entry.id]?.discovered && state.species?.[entry.id]?.biomeId);
    placed.slice(0, 18).forEach((entry, index) => {
      const slot = state.species[entry.id];
      const color = slot.mutation === 'golden' ? 0xffd36d : slot.mutation === 'crystal' ? 0xdc9cff : 0xb6e0c0;
      const geometry = slot.evolved ? new THREE.OctahedronGeometry(0.055, 0) : new THREE.SphereGeometry(0.035, 8, 6);
      const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: slot.evolved ? 0.35 : 0.08, roughness: 0.5 });
      const mesh = new THREE.Mesh(geometry, material);
      let p = pointOnSphere(index, 1.07, 150);
      if (entry.preferredBiome === 'forest') p.y = Math.abs(p.y) * 0.8 + 0.16;
      if (entry.preferredBiome === 'ocean') p.y = -Math.abs(p.y) * 0.65 - 0.15;
      if (entry.preferredBiome === 'crystal') p.x = Math.abs(p.x) + 0.12;
      p.normalize().multiplyScalar(1.07);
      mesh.position.copy(p);
      this.speciesGroup.add(mesh);
    });
  }

  setReducedMotion(value) { this.reducedMotion = Boolean(value); }

  setQuality(value) {
    const high = value !== 'low';
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, high ? 2 : 1.1));
    if (this.stars) this.stars.material.opacity = high ? 0.78 : 0.52;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  animate = () => {
    this.raf = requestAnimationFrame(this.animate);
    if (!this.dragging && !this.reducedMotion) {
      this.planet.rotation.y += 0.00055;
      this.cloudGroup.rotation.y += 0.00032;
    }
    if (this.stars && !this.reducedMotion) this.stars.rotation.y -= 0.00004;
    this.renderer.render(this.scene, this.camera);
  };

  destroy() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.scene.traverse((obj) => {
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
      else obj.material?.dispose?.();
    });
    this.renderer.dispose();
  }
}
