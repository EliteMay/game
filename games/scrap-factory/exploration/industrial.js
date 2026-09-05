import * as THREE from 'three';
import '../exploration-home-ui.js';
import { ITEMS, usedSlots } from '../config.js';
import {
  INDUSTRIAL_AREA_ID,
  abandonExpedition,
  advanceIndustrialObjective,
  collectExplorationLoot,
  discoverExplorationZone,
  ensureExplorationState,
  returnFromExpedition,
  startExpedition,
  updateExplorationPlayer,
} from '../exploration.js';
import { loadGameSave, saveGameSave } from '../storage.js';

const canvas = document.querySelector('#exploration-canvas');
const boot = document.querySelector('#expedition-boot');
const bootMessage = document.querySelector('#boot-message');
const enterButton = document.querySelector('#enter-expedition');
const hud = document.querySelector('#exploration-hud');
const pause = document.querySelector('#exploration-pause');
const resumeButton = document.querySelector('#resume-expedition');
const abandonButton = document.querySelector('#abandon-expedition');
const zoneLabel = document.querySelector('#zone-label');
const packLabel = document.querySelector('#session-pack');
const districtProgress = document.querySelector('#district-progress');
const objectiveTitle = document.querySelector('#objective-title');
const objectiveBody = document.querySelector('#objective-body');
const objectiveSteps = document.querySelector('#objective-steps');
const lootList = document.querySelector('#session-loot-list');
const prompt = document.querySelector('#exploration-prompt');
const toastNode = document.querySelector('#exploration-toast');

let { root, game } = loadGameSave();
let exploration = ensureExplorationState(game);
if (!exploration.activeSession) {
  const result = startExpedition(game, INDUSTRIAL_AREA_ID);
  if (result.changed) {
    exploration = ensureExplorationState(game);
    root = saveGameSave(root, game);
  }
}

const validSession = exploration.activeSession?.areaId === INDUSTRIAL_AREA_ID;
if (!validSession) {
  enterButton.disabled = true;
  bootMessage.textContent = game.progression?.progressionRank >= 5
    ? '別の探索Sessionが進行中です。Transport Terminalから再開してください。'
    : 'RANK 5で解放されます。Factoryへ戻って進行してください。';
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101719);
scene.fog = new THREE.FogExp2(0x101719, 0.022);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 160);

const hemi = new THREE.HemisphereLight(0x7c9292, 0x171512, 0.62);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0xb7c9c7, 1.1);
moon.position.set(-12, 22, 10);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
scene.add(moon);

const industrialGroup = new THREE.Group();
scene.add(industrialGroup);
const interactables = [];
const lootMeshes = new Map();
const hazardMeshes = [];
const keys = new Set();
const velocity = new THREE.Vector3();
const movement = new THREE.Vector3();
let started = false;
let yaw = Number(exploration.activeSession?.player?.yaw || 0);
let pitch = 0;
let lastTime = performance.now();
let saveAccumulator = 0;
let nearestInteractable = null;
let hazardCooldown = 0;

function material(color, metalness = 0.25, roughness = 0.78, emissive = 0x000000, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity });
}

function addBox(size, position, mat, { parent = industrialGroup, cast = true } = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(radius, height, position, mat, segments = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), mat);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  industrialGroup.add(mesh);
  return mesh;
}

const floorMat = material(0x2e3433, 0.35, 0.88);
const wallMat = material(0x363d3c, 0.42, 0.82);
const steelMat = material(0x252d2e, 0.7, 0.55);
const rustMat = material(0x5a4436, 0.5, 0.74);
const warningMat = material(0xc29b34, 0.28, 0.55);
const darkMat = material(0x171d1e, 0.65, 0.66);
const poweredMat = material(0x365b55, 0.38, 0.48, 0x4aa58f, 0.4);
const offlineMat = material(0x4a3530, 0.36, 0.7, 0x4a1812, 0.18);

addBox([32, 0.35, 52], [0, -0.2, -2], floorMat, { cast: false });
addBox([0.45, 6.5, 52], [-16, 3.05, -2], wallMat);
addBox([0.45, 6.5, 52], [16, 3.05, -2], wallMat);
addBox([32, 6.5, 0.45], [0, 3.05, -28], wallMat);

for (const z of [18, 8, -2, -12, -22]) {
  for (const x of [-12, 12]) {
    addBox([0.8, 6.4, 0.8], [x, 3.0, z], steelMat);
    addBox([4.5, 0.45, 0.65], [x > 0 ? 10 : -10, 5.8, z], steelMat);
  }
}
for (const z of [12, 2, -8, -18]) {
  addBox([24, 0.12, 0.28], [0, 0.04, z], warningMat, { cast: false });
}

// Arrival bay / transport pad.
const padMat = material(0x3b4e4c, 0.35, 0.6, 0x356a62, 0.18);
addBox([7.5, 0.16, 5.5], [0, 0.02, 18], padMat, { cast: false });
for (const x of [-3.2, 3.2]) addBox([0.25, 0.08, 4.9], [x, 0.14, 18], warningMat, { cast: false });

// Generator Hall landmark.
const generatorGroup = new THREE.Group();
generatorGroup.position.set(-8.5, 0, 5);
industrialGroup.add(generatorGroup);
addBox([5.8, 0.4, 5.2], [0, 0.15, 0], darkMat, { parent: generatorGroup });
addBox([4.6, 2.6, 3.6], [0, 1.45, 0], rustMat, { parent: generatorGroup });
for (const x of [-1.6, 0, 1.6]) {
  const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.6, 16), steelMat);
  coil.rotation.z = Math.PI / 2;
  coil.position.set(x, 2.15, -1.95);
  coil.castShadow = true;
  generatorGroup.add(coil);
}
const generatorStatus = addBox([1.5, 0.34, 0.12], [-8.5, 2.55, 3.13], offlineMat);
const generatorLamp = new THREE.PointLight(0x8b372b, 0.5, 7, 2);
generatorLamp.position.set(-8.5, 2.8, 3.2);
scene.add(generatorLamp);

// Assembly floor machinery creates a readable central lane.
for (const [x, z] of [[-9, -5], [-3, -5], [3, -5], [9, -5], [-9, -11], [-3, -11], [3, -11], [9, -11]]) {
  addBox([3.6, 1.4, 2.8], [x, 0.72, z], material(0x3e4947, 0.55, 0.65));
  addBox([2.8, 0.18, 0.12], [x, 1.48, z - 1.47], darkMat);
}
addBox([22, 0.45, 1.2], [0, 0.35, -8], steelMat);

// Elevated Control Room.
addBox([11, 0.65, 8], [7.5, 4.0, -20], steelMat);
addBox([11, 4.8, 0.32], [7.5, 6.1, -24], wallMat);
addBox([0.32, 4.8, 8], [2.1, 6.1, -20], wallMat);
addBox([0.32, 4.8, 8], [12.9, 6.1, -20], wallMat);
const controlWindow = material(0x29454b, 0.25, 0.32, 0x245c66, 0.2);
addBox([8.6, 1.9, 0.15], [7.5, 6.3, -15.92], controlWindow);
// Ground-level control console is intentionally reachable without stair simulation.
addBox([2.2, 1.4, 1.1], [8.5, 0.72, -16], darkMat);
const controlStatus = addBox([1.45, 0.22, 0.08], [8.5, 1.25, -15.42], offlineMat);
const controlLight = new THREE.PointLight(0x74332b, 0.35, 6, 2);
controlLight.position.set(8.5, 1.8, -15.2);
scene.add(controlLight);

// Shortcut service gate on the east wall.
const shortcutGate = addBox([0.55, 3.4, 4.5], [14.5, 1.7, -3], rustMat);
addBox([0.08, 2.8, 3.5], [14.18, 1.7, -3], warningMat);

// Interaction markers.
function register(kind, id, position, label, mesh = null, itemId = null, amount = 1) {
  interactables.push({ kind, id, position: new THREE.Vector3(...position), label, mesh, itemId, amount });
}
register('return', 'transport-pad', [0, 1.2, 18], 'Factoryへ正常帰還');
register('objective', 'generator-panel', [-8.5, 1.2, 2.7], '補助Generator Service Panel', generatorStatus);
register('objective', 'control-console', [8.5, 1.2, -15], 'Control Room Main Console', controlStatus);
register('objective', 'shortcut-gate', [13.5, 1.2, -3], 'Service Shortcut Gate', shortcutGate);

const blueprintMesh = addBox([1.05, 0.12, 0.74], [8.5, 1.12, -19], material(0x7b8f85, 0.32, 0.44, 0x6fae9e, 0.55));
register('objective', 'assembly-blueprint', [8.5, 1.2, -19], '組立制御Blueprint', blueprintMesh);

const lootNodes = [
  ['ind-loot-01', 'e_waste', 2, -11, 0.45, 11],
  ['ind-loot-02', 'copper_wire', 3, 10, 0.45, 7],
  ['ind-loot-03', 'iron_plate', 1, -4, 0.45, 1],
  ['ind-loot-04', 'e_waste', 2, 6, 0.45, -2],
  ['ind-loot-05', 'copper_wire', 2, -12, 0.45, -8],
  ['ind-loot-06', 'iron_plate', 2, 11, 0.45, -12],
  ['ind-loot-07', 'e_waste', 3, -6, 0.45, -18],
  ['ind-loot-08', 'copper_wire', 3, 3, 0.45, -22],
];
for (const [id, itemId, amount, x, y, z] of lootNodes) {
  if (exploration.activeSession?.collectedLootIds?.includes(id)) continue;
  const item = ITEMS[itemId];
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), material(item.color, 0.34, 0.58, item.color, 0.22));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  industrialGroup.add(mesh);
  lootMeshes.set(id, mesh);
  register('loot', id, [x, 1.1, z], `${item.name} ×${amount}`, mesh, itemId, amount);
}

// Environmental hazards. They are readable, localized blockers rather than combat damage.
function addArcHazard(x, z, radius = 2.2) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  industrialGroup.add(group);
  for (let i = 0; i < 5; i += 1) {
    const beamMat = material(0x7db8c1, 0.18, 0.32, 0x64d5ed, 1.4);
    const beam = addBox([0.08, 1.4 + i * 0.18, 0.08], [(i - 2) * 0.45, 0.8, Math.sin(i) * 0.35], beamMat, { parent: group, cast: false });
    beam.rotation.z = (i - 2) * 0.18;
  }
  const light = new THREE.PointLight(0x69d8ef, 1.8, 6, 2);
  light.position.set(0, 1.4, 0);
  group.add(light);
  hazardMeshes.push({ group, x, z, radius });
}
addArcHazard(3, -1.5, 2.1);
addArcHazard(-9.5, -15.5, 2.3);

function updateWorldState() {
  const objective = game.exploration?.areas?.industrial?.objective || {};
  generatorStatus.material = objective.generatorRestored ? poweredMat : offlineMat;
  generatorLamp.color.set(objective.generatorRestored ? 0x4bb78f : 0x8b372b);
  generatorLamp.intensity = objective.generatorRestored ? 1.25 : 0.5;
  controlStatus.material = objective.controlRoomOnline ? poweredMat : offlineMat;
  controlLight.color.set(objective.controlRoomOnline ? 0x5dc8b2 : 0x74332b);
  controlLight.intensity = objective.controlRoomOnline ? 1.1 : 0.35;
  shortcutGate.visible = !objective.shortcutOpened;
  blueprintMesh.visible = !objective.blueprintRecovered;
  hazardMeshes[1].group.visible = !objective.controlRoomOnline;
}

function session() { return game.exploration?.activeSession; }

function persist() {
  const player = camera.position;
  updateExplorationPlayer(game, { x: player.x, y: 1.7, z: player.z, yaw });
  root = saveGameSave(root, game);
}

function toast(message, tone = '') {
  toastNode.textContent = message;
  toastNode.className = `exploration-toast is-visible${tone ? ` is-${tone}` : ''}`;
  window.clearTimeout(toastNode._hideTimer);
  toastNode._hideTimer = window.setTimeout(() => { toastNode.className = 'exploration-toast'; }, 2400);
}

function currentZone() {
  const z = camera.position.z;
  if (z > 10) return ['arrival', 'ARRIVAL BAY'];
  if (z > 1.5) return ['generator_hall', 'GENERATOR HALL'];
  if (z > -12.5) return ['assembly_floor', 'ASSEMBLY FLOOR'];
  return ['control_room', 'CONTROL ROOM'];
}

function renderObjective() {
  const area = game.exploration?.areas?.industrial;
  const o = area?.objective || {};
  const steps = [
    ['Generator', o.generatorRestored],
    ['Control Room', o.controlRoomOnline],
    ['Shortcut', o.shortcutOpened],
    ['Blueprint', o.blueprintRecovered],
  ];
  objectiveSteps.innerHTML = steps.map(([label, done]) => `<span class="${done ? 'is-done' : ''}">${done ? '✓' : '○'} ${label}</span>`).join('');
  if (!o.generatorRestored) {
    objectiveTitle.textContent = '補助Generatorを復旧';
    objectiveBody.textContent = 'Generator Hallの黄色いService Panelを操作する。';
  } else if (!o.controlRoomOnline) {
    objectiveTitle.textContent = 'Control Roomを再起動';
    objectiveBody.textContent = 'Assembly Floorを抜け、奥のMain Consoleを起動する。';
  } else if (!o.blueprintRecovered) {
    objectiveTitle.textContent = '組立制御Blueprintを回収';
    objectiveBody.textContent = 'Control Room奥の発光するData Slateを回収する。Service Shortcutも任意で開通できる。';
  } else {
    objectiveTitle.textContent = 'MAIN OBJECTIVE COMPLETE';
    objectiveBody.textContent = 'Transport Padへ戻って正常帰還し、BlueprintをFactoryへ持ち帰る。';
  }
}

function renderHud() {
  const s = session();
  const area = game.exploration?.areas?.industrial;
  packLabel.textContent = `${usedSlots(s?.loot || {})} / 12`;
  districtProgress.textContent = `${area?.discoveredZones?.length || 0} / 4`;
  lootList.textContent = Object.entries(s?.loot || {}).filter(([, amount]) => amount > 0)
    .map(([id, amount]) => `${ITEMS[id]?.name || id} ×${amount}`).join(' / ') || '未回収';
  renderObjective();
}

function handleInteraction(target) {
  if (!target) return;
  if (target.kind === 'loot') {
    const result = collectExplorationLoot(game, target.id, target.itemId, target.amount);
    if (!result.changed) {
      toast(result.reason === 'full' ? 'Session Packがいっぱいです' : '回収できません');
      return;
    }
    target.mesh?.removeFromParent();
    lootMeshes.delete(target.id);
    const index = interactables.indexOf(target);
    if (index >= 0) interactables.splice(index, 1);
    toast(`${ITEMS[target.itemId]?.name || target.itemId} +${target.amount}`);
    persist();
    renderHud();
    return;
  }

  if (target.kind === 'return') {
    const result = returnFromExpedition(game);
    if (!result.changed) return;
    persist();
    window.location.href = '../index.html';
    return;
  }

  const objective = game.exploration?.areas?.industrial?.objective || {};
  let result = null;
  if (target.id === 'generator-panel') result = advanceIndustrialObjective(game, 'generator');
  else if (target.id === 'control-console') result = advanceIndustrialObjective(game, 'control');
  else if (target.id === 'shortcut-gate') result = advanceIndustrialObjective(game, 'shortcut');
  else if (target.id === 'assembly-blueprint') result = advanceIndustrialObjective(game, 'blueprint');
  if (!result) return;
  if (!result.changed) {
    const reasons = {
      'needs-generator': '先に補助Generatorを復旧する必要があります',
      'needs-control': '先にControl Roomを再起動する必要があります',
      done: 'すでに完了しています',
    };
    toast(reasons[result.reason] || 'まだ操作できません');
    return;
  }
  updateWorldState();
  renderHud();
  persist();
  if (target.id === 'generator-panel') toast('補助Generator復旧。工場奥への電力が戻りました');
  if (target.id === 'control-console') toast('Control Room ONLINE。Blueprint保管区画を解錠');
  if (target.id === 'shortcut-gate') toast('Service Shortcutを開通しました');
  if (target.id === 'assembly-blueprint') toast('組立制御Blueprintを回収 / Research Data +2');
}

function updateNearestInteractable() {
  let nearest = null;
  let distance = Infinity;
  for (const target of interactables) {
    if (target.mesh && !target.mesh.visible) continue;
    if (target.id === 'shortcut-gate' && game.exploration?.areas?.industrial?.objective?.shortcutOpened) continue;
    const d = camera.position.distanceTo(target.position);
    if (d < distance) { nearest = target; distance = d; }
  }
  nearestInteractable = distance <= 3.25 ? nearest : null;
  prompt.hidden = !nearestInteractable;
  prompt.textContent = nearestInteractable ? `[E] ${nearestInteractable.label}` : '';
}

function updateHazards(delta) {
  hazardCooldown = Math.max(0, hazardCooldown - delta);
  for (const hazard of hazardMeshes) {
    if (!hazard.group.visible) continue;
    hazard.group.rotation.y += delta * 1.7;
    const dx = camera.position.x - hazard.x;
    const dz = camera.position.z - hazard.z;
    const distance = Math.hypot(dx, dz);
    if (distance >= hazard.radius || hazardCooldown > 0) continue;
    const scale = distance > 0.01 ? 2.8 / distance : 2.8;
    camera.position.x += dx * scale;
    camera.position.z += dz * scale;
    hazardCooldown = 1.15;
    toast('電気アーク！ 安全距離まで押し戻されました', 'hazard');
  }
}

function updateMovement(delta) {
  movement.set(0, 0, 0);
  if (keys.has('KeyW')) movement.z -= 1;
  if (keys.has('KeyS')) movement.z += 1;
  if (keys.has('KeyA')) movement.x -= 1;
  if (keys.has('KeyD')) movement.x += 1;
  if (movement.lengthSq() > 0) movement.normalize();
  const baseSpeed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 8.0 : 5.2;
  const speed = baseSpeed * (window.__scrapPlayerConvenience?.sprintMultiplier?.() ?? 1);
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  velocity.x = (movement.x * cos - movement.z * sin) * speed;
  velocity.z = (movement.z * cos + movement.x * sin) * speed;
  camera.position.x = THREE.MathUtils.clamp(camera.position.x + velocity.x * delta, -14.6, 14.6);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z + velocity.z * delta, -26.4, 21.5);
  camera.position.y = 1.7;
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function updateZoneDiscovery() {
  const [zoneId, label] = currentZone();
  zoneLabel.textContent = label;
  const result = discoverExplorationZone(game, zoneId);
  if (result.changed) {
    toast(`区画発見: ${label}`);
    persist();
    renderHud();
  }
}

function frame(now) {
  const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  if (started && document.pointerLockElement === canvas) {
    updateMovement(delta);
    updateHazards(delta);
    updateZoneDiscovery();
    updateNearestInteractable();
    saveAccumulator += delta;
    if (saveAccumulator >= 5) { saveAccumulator = 0; persist(); }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function startPlay() {
  if (!validSession) return;
  started = true;
  boot.hidden = true;
  pause.hidden = true;
  hud.hidden = false;
  canvas.requestPointerLock();
  renderHud();
}

enterButton.addEventListener('click', startPlay);
resumeButton.addEventListener('click', () => { pause.hidden = true; canvas.requestPointerLock(); });
abandonButton.addEventListener('click', () => {
  const result = abandonExpedition(game);
  if (!result.changed) return;
  persist();
  window.location.href = '../index.html';
});

document.addEventListener('pointerlockchange', () => {
  if (!started) return;
  const locked = document.pointerLockElement === canvas;
  pause.hidden = locked;
  if (!locked) keys.clear();
});

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== canvas) return;
  const sensitivity = Number(game.settings?.mouseSensitivity || 0.0022);
  yaw -= event.movementX * sensitivity;
  pitch = THREE.MathUtils.clamp(pitch - event.movementY * sensitivity, -1.35, 1.35);
});

document.addEventListener('keydown', (event) => {
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(event.code)) keys.add(event.code);
  if (event.code === 'KeyE' && document.pointerLockElement === canvas && nearestInteractable) handleInteraction(nearestInteractable);
});
document.addEventListener('keyup', (event) => keys.delete(event.code));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});
window.addEventListener('beforeunload', () => { if (validSession) persist(); });

if (validSession) {
  camera.position.set(
    Number(exploration.activeSession.player?.x || 0),
    1.7,
    Number(exploration.activeSession.player?.z || 18),
  );
} else camera.position.set(0, 1.7, 18);

updateWorldState();
renderHud();
requestAnimationFrame(frame);

window.__scrapExplorationRuntime = {
  getGame: () => game,
  persist,
  scene,
  camera,
  lootMeshes: typeof lootMeshes !== 'undefined' ? lootMeshes : new Map(),
};
