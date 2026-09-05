import * as THREE from 'three';
import '../exploration-home-ui.js';
import { ITEMS, usedSlots } from '../config.js';
import {
  MILITARY_AREA_ID,
  abandonExpedition,
  advanceMilitaryObjective,
  collectExplorationLoot,
  discoverExplorationZone,
  ensureExplorationState,
  returnFromExpedition,
  startExpedition,
  updateExplorationHealth,
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
const healthValue = document.querySelector('#health-value');
const securityNote = document.querySelector('#security-note');
const hazardNote = document.querySelector('.military-hazard-note');
const objectiveTitle = document.querySelector('#objective-title');
const objectiveBody = document.querySelector('#objective-body');
const objectiveSteps = document.querySelector('#objective-steps');
const lootList = document.querySelector('#session-loot-list');
const prompt = document.querySelector('#exploration-prompt');
const toastNode = document.querySelector('#exploration-toast');

let { root, game } = loadGameSave();
let exploration = ensureExplorationState(game);
if (!exploration.activeSession) {
  const result = startExpedition(game, MILITARY_AREA_ID);
  if (result.changed) {
    exploration = ensureExplorationState(game);
    root = saveGameSave(root, game);
  }
}

const validSession = exploration.activeSession?.areaId === MILITARY_AREA_ID;
if (!validSession) {
  enterButton.disabled = true;
  bootMessage.textContent = game.progression?.progressionRank >= 6
    ? '別の探索Sessionが進行中です。Transport Terminalから再開してください。'
    : 'RANK 6で解放されます。Factoryへ戻って進行してください。';
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1317);
scene.fog = new THREE.FogExp2(0x0d1317, 0.02);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 180);

scene.add(new THREE.HemisphereLight(0x738591, 0x111315, 0.5));
const keyLight = new THREE.DirectionalLight(0xb5c2ca, 0.92);
keyLight.position.set(-14, 24, 12);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const facility = new THREE.Group();
scene.add(facility);
const interactables = [];
const lootMeshes = new Map();
const turretHazards = [];
const keys = new Set();
const velocity = new THREE.Vector3();
const movement = new THREE.Vector3();
let started = false;
let yaw = Number(exploration.activeSession?.player?.yaw || 0);
let pitch = 0;
let lastTime = performance.now();
let saveAccumulator = 0;
let nearestInteractable = null;
let damageCooldown = 0;
let failed = false;

function material(color, metalness = 0.25, roughness = 0.78, emissive = 0x000000, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity });
}

function addBox(size, position, mat, { parent = facility, cast = true } = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(radius, height, position, mat, { parent = facility, segments = 16 } = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), mat);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const floorMat = material(0x252b2f, 0.45, 0.88);
const wallMat = material(0x30383d, 0.52, 0.78);
const armorMat = material(0x20272b, 0.76, 0.5);
const darkMat = material(0x121719, 0.62, 0.64);
const warningMat = material(0xb99b43, 0.34, 0.52);
const securityMat = material(0x57322f, 0.38, 0.62, 0x681d16, 0.34);
const onlineMat = material(0x35594f, 0.38, 0.46, 0x4a9e86, 0.45);
const dataMat = material(0x49636e, 0.3, 0.4, 0x6ea9bc, 0.55);

// Overall facility shell and strong central axis.
addBox([34, 0.35, 58], [0, -0.2, -4], floorMat, { cast: false });
addBox([0.5, 7.2, 58], [-17, 3.35, -4], wallMat);
addBox([0.5, 7.2, 58], [17, 3.35, -4], wallMat);
addBox([34, 7.2, 0.5], [0, 3.35, -33], wallMat);
for (const z of [19, 9, -1, -11, -21]) {
  addBox([29, 0.1, 0.3], [0, 0.04, z], warningMat, { cast: false });
  for (const x of [-13.5, 13.5]) addBox([0.9, 7, 0.9], [x, 3.25, z], armorMat);
}

// Entry checkpoint: low, dense, readable.
addBox([9.5, 0.2, 5.4], [0, 0.02, 20], material(0x344047, 0.4, 0.66), { cast: false });
addBox([4.2, 2.6, 2.8], [-8.5, 1.3, 15.5], armorMat);
addBox([3.4, 1.35, 0.12], [-8.5, 1.65, 14.05], dataMat);
addBox([4.2, 2.6, 2.8], [8.5, 1.3, 15.5], armorMat);

// Security yard: barriers create two avoidance lanes around turret coverage.
for (const x of [-10, -4, 4, 10]) {
  addBox([3.2, 1.1, 1.0], [x, 0.55, 7.5], armorMat);
  addBox([2.4, 0.14, 0.08], [x, 1.15, 6.96], warningMat);
}
addBox([3.0, 1.5, 1.1], [-11, 0.75, 2.5], darkMat);
const securityConsole = addBox([1.6, 0.25, 0.08], [-11, 1.15, 1.91], securityMat);

// Drone Control Bay landmark: large ring + docking blocks.
const droneBay = new THREE.Group();
droneBay.position.set(7.5, 0, -8);
facility.add(droneBay);
addBox([8.5, 0.35, 7.5], [0, 0.08, 0], darkMat, { parent: droneBay });
for (const x of [-2.8, 0, 2.8]) {
  addBox([1.8, 1.1, 3.8], [x, 0.55, 0], armorMat, { parent: droneBay });
  addBox([1.2, 0.12, 3.15], [x, 1.14, 0], dataMat, { parent: droneBay });
}
const ring = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.28, 12, 40), armorMat);
ring.position.set(0, 3.2, -1.7);
ring.rotation.x = Math.PI / 2;
ring.castShadow = true;
droneBay.add(ring);
const droneStatus = addBox([1.6, 0.25, 0.1], [7.5, 1.35, -4.35], securityMat);
const droneLight = new THREE.PointLight(0x82372f, 0.5, 8, 2);
droneLight.position.set(7.5, 2.2, -4.1);
scene.add(droneLight);

// Command bunker: visually heavier and narrower.
addBox([20, 0.55, 9], [0, 0.1, -25], armorMat);
addBox([20, 5.5, 0.55], [0, 2.65, -29.2], wallMat);
addBox([0.55, 5.5, 9], [-10, 2.65, -25], wallMat);
addBox([0.55, 5.5, 9], [10, 2.65, -25], wallMat);
for (const x of [-6, 0, 6]) addBox([4.2, 0.22, 0.18], [x, 3.8, -20.55], dataMat);

// East service gate is a persistent shortcut marker.
const shortcutGate = addBox([0.6, 3.8, 4.8], [15.0, 1.9, -3.5], armorMat);
addBox([0.1, 3.1, 3.8], [14.65, 1.9, -3.5], warningMat);

function register(kind, id, position, label, mesh = null, itemId = null, amount = 1) {
  interactables.push({ kind, id, position: new THREE.Vector3(...position), label, mesh, itemId, amount });
}

register('return', 'military-return-pad', [0, 1.2, 20], 'Factoryへ正常帰還');
const accessCard = addBox([0.8, 0.08, 0.5], [-8.5, 1.15, 13.7], material(0x8499a4, 0.32, 0.38, 0x72b5ca, 0.6));
register('objective', 'access-card', [-8.5, 1.2, 13.6], 'Security Access Cardを回収', accessCard);
register('objective', 'security-console', [-11, 1.2, 1.5], 'Security Grid Control', securityConsole);
register('objective', 'drone-console', [7.5, 1.2, -4.0], 'Drone Control Bay Console', droneStatus);
register('objective', 'military-shortcut', [14.2, 1.2, -3.5], 'Service Gate Override', shortcutGate);
const blueprintMesh = addBox([1.08, 0.12, 0.78], [0, 1.15, -25], dataMat);
register('objective', 'drone-blueprint', [0, 1.2, -25], 'Drone Control Blueprint', blueprintMesh);

const lootNodes = [
  ['mil-loot-01', 'e_waste', 3, -12, 0.45, 11],
  ['mil-loot-02', 'control_unit', 1, 11, 0.45, 10],
  ['mil-loot-03', 'e_waste', 2, -7, 0.45, 3],
  ['mil-loot-04', 'rare_alloy', 1, 10, 0.45, -1],
  ['mil-loot-05', 'control_unit', 1, -11, 0.45, -10],
  ['mil-loot-06', 'e_waste', 3, 12, 0.45, -15],
  ['mil-loot-07', 'rare_alloy', 2, -6, 0.45, -24],
];
for (const [id, itemId, amount, x, y, z] of lootNodes) {
  if (exploration.activeSession?.collectedLootIds?.includes(id)) continue;
  const item = ITEMS[itemId];
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), material(item.color, 0.4, 0.52, item.color, 0.2));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  facility.add(mesh);
  lootMeshes.set(id, mesh);
  register('loot', id, [x, 1.05, z], `${item.name} ×${amount}`, mesh, itemId, amount);
}

function addTurret(x, z, radius = 4.8) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  facility.add(group);
  addCylinder(0.55, 0.8, [0, 0.4, 0], armorMat, { parent: group });
  addBox([1.35, 0.45, 0.65], [0, 1.05, 0], securityMat, { parent: group });
  addBox([0.18, 0.18, 2.1], [0, 1.05, -1.2], securityMat, { parent: group });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.48, 6.5, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xb5463d, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
  cone.rotation.x = -Math.PI / 2;
  cone.position.set(0, 0.5, -3.3);
  group.add(cone);
  const light = new THREE.PointLight(0xd44e43, 1.2, 7, 2);
  light.position.set(0, 1.25, -0.8);
  group.add(light);
  turretHazards.push({ group, x, z, radius, light });
}
addTurret(-2.5, 8, 4.6);
addTurret(5, 1.0, 4.8);

function objectiveState() {
  return game.exploration?.areas?.military?.objective || {};
}

function updateWorldState() {
  const o = objectiveState();
  accessCard.visible = !o.accessCardRecovered;
  securityConsole.material = o.securityGridOffline ? onlineMat : securityMat;
  droneStatus.material = o.droneBayOnline ? onlineMat : securityMat;
  droneLight.color.set(o.droneBayOnline ? 0x4fa88d : 0x82372f);
  droneLight.intensity = o.droneBayOnline ? 1.2 : 0.5;
  shortcutGate.visible = !o.shortcutOpened;
  blueprintMesh.visible = !o.blueprintRecovered;
  for (const turret of turretHazards) turret.group.visible = !o.securityGridOffline;
  hazardNote?.classList.toggle('is-safe', Boolean(o.securityGridOffline));
  if (securityNote) securityNote.textContent = o.securityGridOffline
    ? 'Security Grid OFFLINE。Turret警戒区画は停止しました。'
    : '赤いTurret警戒区画では継続Damage。Access CardでSecurity Gridを停止できます。';
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
  if (z > 12) return ['checkpoint', 'CHECKPOINT'];
  if (z > 1) return ['security_yard', 'SECURITY YARD'];
  if (z > -17) return ['drone_bay', 'DRONE CONTROL BAY'];
  return ['command_bunker', 'COMMAND BUNKER'];
}

function renderObjective() {
  const o = objectiveState();
  const steps = [
    ['Access Card', o.accessCardRecovered],
    ['Security Grid', o.securityGridOffline],
    ['Drone Bay', o.droneBayOnline],
    ['Shortcut', o.shortcutOpened],
    ['Blueprint', o.blueprintRecovered],
  ];
  objectiveSteps.innerHTML = steps.map(([label, done]) => `<span class="${done ? 'is-done' : ''}">${done ? '✓' : '○'} ${label}</span>`).join('');
  if (!o.accessCardRecovered) {
    objectiveTitle.textContent = 'Access Cardを回収';
    objectiveBody.textContent = 'CheckpointのGuard Consoleに残されたSecurity Access Cardを確保する。';
  } else if (!o.securityGridOffline) {
    objectiveTitle.textContent = 'Security Gridを停止';
    objectiveBody.textContent = 'Security Yard西側のControl ConsoleでTurret電源を遮断する。';
  } else if (!o.droneBayOnline) {
    objectiveTitle.textContent = 'Drone Control Bayを復旧';
    objectiveBody.textContent = '中央施設のDrone Control Consoleを再起動する。';
  } else if (!o.blueprintRecovered) {
    objectiveTitle.textContent = 'Drone Control Blueprintを回収';
    objectiveBody.textContent = 'Command BunkerでBlueprintを回収する。Service Gateも任意で開通できる。';
  } else {
    objectiveTitle.textContent = 'MAIN OBJECTIVE COMPLETE';
    objectiveBody.textContent = '入口Checkpointへ戻って正常帰還し、Drone技術をFactoryへ持ち帰る。';
  }
}

function renderHud() {
  const s = session();
  const area = game.exploration?.areas?.military;
  packLabel.textContent = `${usedSlots(s?.loot || {})} / 12`;
  districtProgress.textContent = `${area?.discoveredZones?.length || 0} / 4`;
  healthValue.textContent = `${Math.round(Number(s?.hp ?? 100))} / 100`;
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

  let result = null;
  if (target.id === 'access-card') result = advanceMilitaryObjective(game, 'access');
  else if (target.id === 'security-console') result = advanceMilitaryObjective(game, 'security');
  else if (target.id === 'drone-console') result = advanceMilitaryObjective(game, 'drone');
  else if (target.id === 'military-shortcut') result = advanceMilitaryObjective(game, 'shortcut');
  else if (target.id === 'drone-blueprint') result = advanceMilitaryObjective(game, 'blueprint');
  if (!result) return;
  if (!result.changed) {
    const reasons = {
      'needs-access': '先にCheckpointでSecurity Access Cardを回収してください',
      'needs-security': '先にSecurity Gridを停止してください',
      'needs-drone': '先にDrone Control Bayを復旧してください',
      done: 'すでに完了しています',
    };
    toast(reasons[result.reason] || 'まだ操作できません');
    return;
  }

  updateWorldState();
  renderHud();
  persist();
  if (target.id === 'access-card') toast('Security Access Cardを回収');
  if (target.id === 'security-console') toast('Security Grid OFFLINE。Turret電源を遮断');
  if (target.id === 'drone-console') toast('Drone Control Bay ONLINE');
  if (target.id === 'military-shortcut') toast('Service Gateを開通しました');
  if (target.id === 'drone-blueprint') toast('Drone Control Blueprint回収 / Research Data +3');
}

function updateNearestInteractable() {
  let nearest = null;
  let distance = Infinity;
  for (const target of interactables) {
    if (target.mesh && !target.mesh.visible) continue;
    if (target.id === 'military-shortcut' && objectiveState().shortcutOpened) continue;
    const d = camera.position.distanceTo(target.position);
    if (d < distance) { nearest = target; distance = d; }
  }
  nearestInteractable = distance <= 3.25 ? nearest : null;
  prompt.hidden = !nearestInteractable;
  prompt.textContent = nearestInteractable ? `[E] ${nearestInteractable.label}` : '';
}

function failExpedition() {
  if (failed) return;
  failed = true;
  updateExplorationHealth(game, 0);
  abandonExpedition(game);
  root = saveGameSave(root, game);
  window.location.href = '../index.html';
}

function updateSecurityThreat(delta) {
  damageCooldown = Math.max(0, damageCooldown - delta);
  if (objectiveState().securityGridOffline) return;
  for (const turret of turretHazards) {
    if (!turret.group.visible) continue;
    turret.group.rotation.y += delta * 0.8;
    const distance = Math.hypot(camera.position.x - turret.x, camera.position.z - turret.z);
    if (distance > turret.radius || damageCooldown > 0) continue;
    const currentHp = Number(session()?.hp ?? 100);
    const nextHp = Math.max(0, currentHp - 22);
    updateExplorationHealth(game, nextHp);
    damageCooldown = 0.85;
    toast(`Security Turret被弾 / HP ${Math.round(nextHp)}`, 'hazard');
    renderHud();
    if (nextHp <= 0) failExpedition();
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
  camera.position.x = THREE.MathUtils.clamp(camera.position.x + velocity.x * delta, -15.8, 15.8);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z + velocity.z * delta, -31.2, 23.2);
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
  if (started && document.pointerLockElement === canvas && !failed) {
    updateMovement(delta);
    updateSecurityThreat(delta);
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
  root = saveGameSave(root, game);
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
window.addEventListener('beforeunload', () => { if (validSession && !failed) persist(); });

if (validSession) {
  camera.position.set(
    Number(exploration.activeSession.player?.x || 0),
    1.7,
    Number(exploration.activeSession.player?.z || 20),
  );
} else camera.position.set(0, 1.7, 20);

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
