import * as THREE from 'three';
import { ITEMS, usedSlots } from '../config.js';
import {
  EXPLORATION_MAX_SLOTS,
  RESIDENTIAL_AREA_ID,
  abandonExpedition,
  advanceResidentialObjective,
  collectExplorationLoot,
  discoverExplorationZone,
  explorationAreaState,
  residentialProgressSummary,
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
const zoneLabel = document.querySelector('#zone-label');
const sessionPack = document.querySelector('#session-pack');
const districtProgress = document.querySelector('#district-progress');
const objectiveTitle = document.querySelector('#objective-title');
const objectiveBody = document.querySelector('#objective-body');
const objectiveSteps = document.querySelector('#objective-steps');
const sessionLootList = document.querySelector('#session-loot-list');
const prompt = document.querySelector('#exploration-prompt');
const toastNode = document.querySelector('#exploration-toast');
const pause = document.querySelector('#exploration-pause');
const resumeButton = document.querySelector('#resume-expedition');
const abandonButton = document.querySelector('#abandon-expedition');

let { root, game } = loadGameSave();
let areaState = explorationAreaState(game, RESIDENTIAL_AREA_ID);
if (!areaState.unlocked) {
  enterButton.disabled = true;
  bootMessage.textContent = `LOCKED — RANK ${areaState.requiredRank} REQUIRED`;
} else if (!game.exploration?.activeSession) {
  startExpedition(game, RESIDENTIAL_AREA_ID);
  root = saveGameSave(root, game);
} else if (game.exploration.activeSession.areaId !== RESIDENTIAL_AREA_ID) {
  enterButton.disabled = true;
  bootMessage.textContent = 'ANOTHER EXPEDITION SESSION IS ACTIVE';
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4b5550);
scene.fog = new THREE.Fog(0x4b5550, 28, 86);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.08, 150);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene.add(new THREE.HemisphereLight(0xbfc8c1, 0x272b26, 1.45));
const sun = new THREE.DirectionalLight(0xd7d1bb, 1.85);
sun.position.set(-18, 30, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -45;
sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45;
sun.shadow.camera.bottom = -45;
scene.add(sun);

const colliders = [];
const interactions = [];
const lootMeshes = new Map();
let currentInteraction = null;
let started = false;
let yaw = Number(game.exploration?.activeSession?.player?.yaw || 0);
let pitch = 0;
let unsavedPlaySeconds = 0;
let saveAccumulator = 0;
let lastTime = performance.now();
let toastTimer = null;
const keys = new Set();

const startPlayer = game.exploration?.activeSession?.player || { x: 0, y: 1.7, z: 15, yaw: 0 };
camera.position.set(Number(startPlayer.x || 0), 1.7, Number(startPlayer.z || 15));

function material(color, metalness = 0.12, roughness = 0.88) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

const mats = {
  asphalt: material(0x2a302e, 0.05, 0.96),
  concrete: material(0x666b65, 0.03, 0.96),
  curb: material(0x8a877b, 0.02, 0.9),
  brick: material(0x69554a, 0.02, 0.94),
  brickDark: material(0x51463f, 0.02, 0.96),
  roof: material(0x3c4341, 0.18, 0.84),
  metal: material(0x4b5553, 0.58, 0.63),
  fence: material(0x59605d, 0.55, 0.72),
  yellow: material(0xb99a3e, 0.28, 0.66),
  terminal: material(0x465c5f, 0.48, 0.58),
  glass: new THREE.MeshStandardMaterial({ color: 0x8da1a0, transparent: true, opacity: 0.28, roughness: 0.3, metalness: 0.1 }),
};

function addBox({ x, y, z, w, h, d, mat = mats.concrete, collide = false, parent = scene, cast = true }) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  if (collide) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  return mesh;
}

function addHouse(x, z, width = 7, depth = 7, accent = 0x6a5549) {
  const group = new THREE.Group();
  scene.add(group);
  addBox({ x, y: 2.8, z, w: width, h: 5.6, d: depth, mat: material(accent, 0.02, 0.96), collide: true, parent: group });
  addBox({ x, y: 5.9, z, w: width + 0.4, h: 0.38, d: depth + 0.4, mat: mats.roof, parent: group });
  const frontZ = z + depth / 2 + 0.02;
  for (const wx of [-width * 0.24, width * 0.24]) {
    const windowMesh = addBox({ x: x + wx, y: 3.2, z: frontZ, w: 1.35, h: 1.55, d: 0.08, mat: mats.glass, parent: group, cast: false });
    windowMesh.receiveShadow = false;
  }
  addBox({ x, y: 1.3, z: frontZ + 0.03, w: 1.25, h: 2.6, d: 0.1, mat: mats.brickDark, parent: group });
  return group;
}

function addStreetLight(x, z) {
  const group = new THREE.Group();
  scene.add(group);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 8), mats.metal);
  pole.position.set(x, 2.6, z);
  pole.castShadow = true;
  group.add(pole);
  addBox({ x: x + 0.45, y: 5.05, z, w: 0.9, h: 0.12, d: 0.12, mat: mats.metal, parent: group });
  const lamp = addBox({ x: x + 0.82, y: 4.96, z, w: 0.28, h: 0.16, d: 0.3, mat: mats.yellow, parent: group });
  lamp.castShadow = false;
}

function buildEnvironment() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), material(0x4f554c, 0.02, 1));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  addBox({ x: 0, y: 0.035, z: -2, w: 11, h: 0.07, d: 54, mat: mats.asphalt, cast: false });
  addBox({ x: 0, y: 0.075, z: 15, w: 16, h: 0.15, d: 7, mat: mats.concrete, cast: false });
  for (const x of [-6, 6]) addBox({ x, y: 0.11, z: -2, w: 0.34, h: 0.22, d: 54, mat: mats.curb, cast: false });

  addHouse(-11, 6, 7, 8, 0x685247);
  addHouse(11, 5, 7.5, 8, 0x5f564d);
  addHouse(-11, -3, 7, 7, 0x66574e);
  addHouse(11, -4, 7.5, 7, 0x5c5048);

  // Open garage shell with a clear entrance on the east side.
  addBox({ x: -16, y: 2.3, z: -14, w: 8, h: 4.6, d: 0.35, mat: mats.brickDark, collide: true });
  addBox({ x: -19.8, y: 2.3, z: -10.2, w: 0.35, h: 4.6, d: 8, mat: mats.brickDark, collide: true });
  addBox({ x: -16, y: 4.65, z: -10.2, w: 8, h: 0.28, d: 8, mat: mats.roof });
  addBox({ x: -16.4, y: 0.65, z: -11.2, w: 3.8, h: 1.3, d: 1.8, mat: mats.metal, collide: true });
  addBox({ x: -14.2, y: 0.5, z: -7.8, w: 1.2, h: 1, d: 0.8, mat: mats.yellow, collide: true });

  // Substation enclosure and equipment. Opening faces the road.
  for (const z of [-17.5, -9.5]) addBox({ x: 15.5, y: 1.05, z, w: 12, h: 2.1, d: 0.12, mat: mats.fence, collide: true });
  addBox({ x: 21.45, y: 1.05, z: -13.5, w: 0.12, h: 2.1, d: 8, mat: mats.fence, collide: true });
  addBox({ x: 9.55, y: 1.05, z: -15.5, w: 0.12, h: 2.1, d: 4, mat: mats.fence, collide: true });
  addBox({ x: 9.55, y: 1.05, z: -10.2, w: 0.12, h: 2.1, d: 1.4, mat: mats.fence, collide: true });
  addBox({ x: 15.5, y: 1, z: -13.4, w: 3.8, h: 2, d: 2.4, mat: mats.metal, collide: true });
  for (const x of [13.9, 17.1]) {
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 2.2, 10), mats.metal);
    coil.position.set(x, 2.7, -13.4);
    coil.castShadow = true;
    scene.add(coil);
  }

  // Entrance transport pad.
  addBox({ x: 0, y: 0.18, z: 17.5, w: 5.5, h: 0.36, d: 3.2, mat: mats.metal, cast: false });
  addBox({ x: -2.35, y: 0.72, z: 17.5, w: 0.18, h: 1.1, d: 3, mat: mats.yellow });
  addBox({ x: 2.35, y: 0.72, z: 17.5, w: 0.18, h: 1.1, d: 3, mat: mats.yellow });

  for (const [x, z] of [[-5, 11], [5, 3], [-5, -7], [5, -15]]) addStreetLight(x, z);

  // Scattered street debris.
  const debrisMat = material(0x5c625e, 0.45, 0.8);
  for (const [x, z, s] of [[-4, 8, 0.8], [4, 1, 0.55], [-3, -9, 0.65], [3, -18, 0.7], [7, 10, 0.5]]) {
    const debris = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), debrisMat);
    debris.position.set(x, s * 0.55, z);
    debris.rotation.set(0.3, x * 0.17, 0.2);
    debris.castShadow = true;
    scene.add(debris);
  }

  // Distant silhouettes keep the district from ending at the play boundary.
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    const radius = 46 + (i % 3) * 5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const h = 7 + (i % 5) * 2.4;
    addBox({ x, y: h / 2, z, w: 8 + (i % 2) * 4, h, d: 7, mat: material(0x39403d, 0.02, 1), cast: false });
  }
}

function addInteraction(mesh, data) {
  interactions.push({ mesh, ...data });
  return mesh;
}

function buildObjectives() {
  const fuse = addBox({ x: -15.2, y: 1.15, z: -11.2, w: 0.46, h: 0.7, d: 0.24, mat: mats.yellow });
  addInteraction(fuse, { kind: 'objective', step: 'fuse', label: '予備ヒューズを回収' });

  const breaker = addBox({ x: 10.25, y: 1.15, z: -12.5, w: 0.35, h: 1.6, d: 1.1, mat: mats.terminal });
  addInteraction(breaker, { kind: 'objective', step: 'power', label: '変電盤へヒューズを取り付ける' });

  const terminal = addBox({ x: 19.2, y: 1.2, z: -12.8, w: 0.7, h: 1.8, d: 1.25, mat: mats.terminal });
  const screen = addBox({ x: 18.82, y: 1.55, z: -12.8, w: 0.05, h: 0.62, d: 0.72, mat: mats.yellow, cast: false });
  screen.receiveShadow = false;
  addInteraction(terminal, { kind: 'objective', step: 'survey', label: '調査Terminalを起動' });

  const returnTerminal = addBox({ x: 0, y: 1.12, z: 16.25, w: 1.7, h: 1.8, d: 0.7, mat: mats.terminal });
  addInteraction(returnTerminal, { kind: 'return', label: 'Factoryへ正常帰還' });
}

const LOOT = [
  ['res-copper-01', 'copper_wire', 2, -7.2, 5.8],
  ['res-plastic-01', 'plastic', 2, 7.4, 6.6],
  ['res-copper-02', 'copper_wire', 2, -7.6, -1.8],
  ['res-plastic-02', 'plastic', 2, 7.3, -2.5],
  ['res-ewaste-01', 'e_waste', 1, -5.5, -5.7],
  ['res-copper-03', 'copper_wire', 2, -13.6, -7.3],
  ['res-plastic-03', 'plastic', 2, -18.0, -7.3],
  ['res-ewaste-02', 'e_waste', 1, -17.6, -12.1],
  ['res-copper-04', 'copper_wire', 2, 10.8, -9.0],
  ['res-plastic-04', 'plastic', 2, 8.1, -7.8],
  ['res-ewaste-03', 'e_waste', 1, 18.2, -9.0],
  ['res-copper-05', 'copper_wire', 2, 20.0, -16.2],
];

function buildLoot() {
  const collected = new Set(game.exploration?.activeSession?.collectedLootIds || []);
  for (const [id, itemId, amount, x, z] of LOOT) {
    const def = ITEMS[itemId];
    const group = new THREE.Group();
    group.position.set(x, 0.35, z);
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.36), material(def.color, 0.35, 0.72));
    core.rotation.set(0.18, 0.4, 0.12);
    core.castShadow = true;
    group.add(core);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.4), mats.yellow);
    band.rotation.copy(core.rotation);
    group.add(band);
    scene.add(group);
    group.visible = !collected.has(id);
    lootMeshes.set(id, group);
    addInteraction(group, { kind: 'loot', id, itemId, amount, label: `${def.name} ×${amount} を回収` });
  }
}

buildEnvironment();
buildObjectives();
buildLoot();

const ZONES = [
  { id: 'entrance', label: 'ENTRY POINT', test: (x, z) => z > 9 },
  { id: 'row_houses', label: 'ROW HOUSES', test: (x, z) => z <= 9 && z > -7 && Math.abs(x) < 16 },
  { id: 'garage', label: 'WEST GARAGE', test: (x, z) => x < -7 && z <= -7 },
  { id: 'substation', label: 'SUBSTATION', test: (x, z) => x > 7 && z <= -7 },
];

function playerZone() {
  return ZONES.find((zone) => zone.test(camera.position.x, camera.position.z)) || { id: 'street', label: 'SERVICE ROAD' };
}

function discoverCurrentZone() {
  const zone = playerZone();
  zoneLabel.textContent = zone.label;
  if (!zone.id || zone.id === 'street') return;
  const result = discoverExplorationZone(game, zone.id);
  if (result.changed) {
    toast(`AREA DISCOVERED: ${zone.label}`);
    persist('区画発見');
  }
}

function sessionLootText() {
  const loot = game.exploration?.activeSession?.loot || {};
  const entries = Object.entries(loot).filter(([, amount]) => Number(amount) > 0);
  return entries.length
    ? entries.map(([id, amount]) => `${ITEMS[id]?.name || id} ×${amount}`).join(' / ')
    : '未回収';
}

function renderHud() {
  const session = game.exploration?.activeSession;
  const summary = residentialProgressSummary(game);
  sessionPack.textContent = `${usedSlots(session?.loot || {})} / ${EXPLORATION_MAX_SLOTS}`;
  districtProgress.textContent = `${summary.discovered} / ${summary.zoneTotal}`;
  sessionLootList.textContent = sessionLootText();
  const objective = game.exploration?.areas?.residential?.objective || {};

  if (!objective.fuseRecovered) {
    objectiveTitle.textContent = '1. 予備ヒューズを回収';
    objectiveBody.textContent = '西側ガレージへ入り、作業台付近の黄色い予備ヒューズを探す。';
  } else if (!objective.powerRestored) {
    objectiveTitle.textContent = '2. 変電盤を復旧';
    objectiveBody.textContent = '道路東側のSUBSTATIONへ移動し、変電盤へヒューズを取り付ける。';
  } else if (!objective.surveyUploaded) {
    objectiveTitle.textContent = '3. 調査Terminalを起動';
    objectiveBody.textContent = '復旧したSUBSTATION内の調査Terminalから住宅街Networkを解析する。';
  } else {
    objectiveTitle.textContent = 'Main Objective完了 — 正常帰還';
    objectiveBody.textContent = 'BlueprintとResearch Dataを確保済み。入口Transport Terminalへ戻る。';
  }

  const rows = [
    ['fuseRecovered', 'ガレージで予備ヒューズを回収'],
    ['powerRestored', 'SUBSTATIONの電源を復旧'],
    ['surveyUploaded', '調査TerminalからNetworkを解析'],
  ];
  objectiveSteps.innerHTML = rows.map(([key, label]) => `<div class="${objective[key] ? 'is-done' : ''}"><strong>${objective[key] ? '✓' : '○'}</strong><span>${label}</span></div>`).join('');
}

function toast(message) {
  toastNode.textContent = message;
  toastNode.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastNode.classList.remove('is-visible'), 2400);
}

function persist(reason = 'exploration-autosave') {
  if (game.exploration?.activeSession) updateExplorationPlayer(game, { x: camera.position.x, y: 1.7, z: camera.position.z, yaw });
  if (unsavedPlaySeconds > 0) {
    const whole = Math.floor(unsavedPlaySeconds);
    if (whole > 0) {
      game.playTimeSeconds = Number(game.playTimeSeconds || 0) + whole;
      root.profile.totalPlayTimeSeconds = Number(root.profile.totalPlayTimeSeconds || 0) + whole;
      unsavedPlaySeconds -= whole;
    }
  }
  game.lastPlayedAt = new Date().toISOString();
  root = saveGameSave(root, game);
  console.debug(`[exploration save] ${reason}`);
}

function objectiveInteractionLabel(step) {
  const objective = game.exploration?.areas?.residential?.objective || {};
  if (step === 'fuse') return objective.fuseRecovered ? 'ヒューズ回収済み' : '予備ヒューズを回収';
  if (step === 'power') {
    if (objective.powerRestored) return '変電盤は復旧済み';
    return objective.fuseRecovered ? '変電盤へヒューズを取り付ける' : 'ヒューズが必要';
  }
  if (step === 'survey') {
    if (objective.surveyUploaded) return '調査済みTerminal';
    return objective.powerRestored ? '調査Terminalを起動' : '電源が必要';
  }
  return '操作';
}

function updateObjectiveVisibility() {
  const objective = game.exploration?.areas?.residential?.objective || {};
  for (const interaction of interactions) {
    if (interaction.kind !== 'objective') continue;
    if (interaction.step === 'fuse') interaction.mesh.visible = !objective.fuseRecovered;
  }
}

function findInteraction() {
  const cameraForward = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation).normalize();
  const origin = camera.position;
  let best = null;
  let bestScore = Infinity;
  for (const interaction of interactions) {
    if (!interaction.mesh.visible) continue;
    const position = new THREE.Vector3();
    interaction.mesh.getWorldPosition(position);
    const delta = position.clone().sub(origin);
    const distance = delta.length();
    if (distance > 3.7 || distance < 0.01) continue;
    const dot = delta.normalize().dot(cameraForward);
    if (dot < 0.68) continue;
    const score = distance - dot * 0.8;
    if (score < bestScore) {
      best = interaction;
      bestScore = score;
    }
  }
  return best;
}

function renderPrompt() {
  currentInteraction = findInteraction();
  if (!currentInteraction) {
    prompt.hidden = true;
    return;
  }
  let label = currentInteraction.label;
  if (currentInteraction.kind === 'objective') label = objectiveInteractionLabel(currentInteraction.step);
  if (currentInteraction.kind === 'return') {
    const count = Object.values(game.exploration?.activeSession?.loot || {}).reduce((sum, amount) => sum + Number(amount || 0), 0);
    label = `Factoryへ正常帰還 — Session Loot ${count}個をDepotへ送る`;
  }
  prompt.textContent = `[E] ${label}`;
  prompt.hidden = false;
}

function interact() {
  if (!currentInteraction) return;
  if (currentInteraction.kind === 'loot') {
    const result = collectExplorationLoot(game, currentInteraction.id, currentInteraction.itemId, currentInteraction.amount);
    if (result.changed) {
      currentInteraction.mesh.visible = false;
      toast(`${ITEMS[result.itemId]?.name || result.itemId} +${result.amount}`);
      persist('探索Loot回収');
    } else if (result.reason === 'full') toast('探索バッグがいっぱいです');
    renderHud();
    return;
  }

  if (currentInteraction.kind === 'objective') {
    const result = advanceResidentialObjective(game, currentInteraction.step);
    if (result.changed) {
      if (currentInteraction.step === 'fuse') toast('予備ヒューズを回収');
      if (currentInteraction.step === 'power') toast('SUBSTATION POWER RESTORED');
      if (currentInteraction.step === 'survey') toast('MAIN OBJECTIVE COMPLETE — Blueprint + Research Data');
      updateObjectiveVisibility();
      persist('探索Objective');
    } else if (result.reason === 'needs-fuse') toast('先にガレージでヒューズを回収してください');
    else if (result.reason === 'needs-power') toast('先に変電盤を復旧してください');
    renderHud();
    return;
  }

  if (currentInteraction.kind === 'return') {
    const result = returnFromExpedition(game);
    if (!result.changed) return;
    persist('正常帰還');
    window.location.href = '../index.html?returned=residential';
  }
}

const PLAYER_RADIUS = 0.36;
function canStand(x, z) {
  if (Math.abs(x) > 28 || z < -26 || z > 21) return false;
  return !colliders.some((box) => (
    x + PLAYER_RADIUS > box.minX
    && x - PLAYER_RADIUS < box.maxX
    && z + PLAYER_RADIUS > box.minZ
    && z - PLAYER_RADIUS < box.maxZ
  ));
}

function movePlayer(delta) {
  if (document.pointerLockElement !== canvas || pause.hidden === false) return;
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const direction = new THREE.Vector3();
  if (keys.has('KeyW')) direction.add(forward);
  if (keys.has('KeyS')) direction.sub(forward);
  if (keys.has('KeyD')) direction.add(right);
  if (keys.has('KeyA')) direction.sub(right);
  if (direction.lengthSq() === 0) return;
  direction.normalize();
  const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 6.7 : 4.3;
  const step = speed * delta;
  const nextX = camera.position.x + direction.x * step;
  const nextZ = camera.position.z + direction.z * step;
  if (canStand(nextX, camera.position.z)) camera.position.x = nextX;
  if (canStand(camera.position.x, nextZ)) camera.position.z = nextZ;
}

function updateCameraRotation() {
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function openPause() {
  if (!started) return;
  pause.hidden = false;
}

function closePause() {
  pause.hidden = true;
  canvas.requestPointerLock();
}

enterButton.addEventListener('click', () => {
  if (enterButton.disabled) return;
  started = true;
  boot.hidden = true;
  hud.hidden = false;
  pause.hidden = true;
  renderHud();
  updateObjectiveVisibility();
  canvas.requestPointerLock();
  toast('入口Terminalが正常帰還地点です。まず西側ガレージを探索してください。');
});

resumeButton.addEventListener('click', closePause);
abandonButton.addEventListener('click', () => {
  const ok = window.confirm('今回の探索Lootを失ってFactoryへ戻ります。発見区画とMain Objective進行は保持されます。');
  if (!ok) return;
  const result = abandonExpedition(game);
  if (result.changed) {
    root = saveGameSave(root, game);
    window.location.href = '../index.html?abandoned=residential';
  }
});

canvas.addEventListener('click', () => {
  if (started && pause.hidden && document.pointerLockElement !== canvas) canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  if (started && document.pointerLockElement !== canvas && pause.hidden) openPause();
});

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== canvas) return;
  const sensitivity = Number(game.settings?.mouseSensitivity || 0.0022);
  yaw -= event.movementX * sensitivity;
  pitch -= event.movementY * sensitivity;
  pitch = Math.max(-1.38, Math.min(1.38, pitch));
  updateCameraRotation();
});

document.addEventListener('keydown', (event) => {
  keys.add(event.code);
  if (event.code === 'KeyE' && document.pointerLockElement === canvas) interact();
  if (event.code === 'Escape' && started) openPause();
});

document.addEventListener('keyup', (event) => keys.delete(event.code));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

window.addEventListener('beforeunload', () => {
  try { if (game.exploration?.activeSession) persist('ページ終了'); } catch { /* best effort */ }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && game.exploration?.activeSession) {
    try { persist('バックグラウンド移行'); } catch { /* best effort */ }
  }
});

function animate(now) {
  const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  if (started) {
    unsavedPlaySeconds += delta;
    saveAccumulator += delta;
    movePlayer(delta);
    discoverCurrentZone();
    renderPrompt();
    renderHud();
    if (saveAccumulator >= 5) {
      saveAccumulator = 0;
      persist('探索オートセーブ');
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateCameraRotation();
updateObjectiveVisibility();
renderHud();
requestAnimationFrame(animate);
