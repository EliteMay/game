import * as THREE from 'three';
import '../exploration-home-ui.js';
import { ITEMS, usedSlots } from '../config.js';
import {
  RESEARCH_AREA_ID,
  RESEARCH_COMPONENTS,
  abandonExpedition,
  advanceResearchObjective,
  collectExplorationLoot,
  collectResearchCargo,
  discoverExplorationZone,
  ensureExplorationState,
  researchComponentState,
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
const hazardNote = document.querySelector('#hazard-note');
const hazardBanner = document.querySelector('.research-hazard-note');
const objectiveTitle = document.querySelector('#objective-title');
const objectiveBody = document.querySelector('#objective-body');
const objectiveSteps = document.querySelector('#objective-steps');
const lootList = document.querySelector('#session-loot-list');
const specialCargoList = document.querySelector('#special-cargo-list');
const prompt = document.querySelector('#exploration-prompt');
const toastNode = document.querySelector('#exploration-toast');

let { root, game } = loadGameSave();
let exploration = ensureExplorationState(game);
if (!exploration.activeSession) {
  const result = startExpedition(game, RESEARCH_AREA_ID);
  if (result.changed) {
    exploration = ensureExplorationState(game);
    root = saveGameSave(root, game);
  }
}

const validSession = exploration.activeSession?.areaId === RESEARCH_AREA_ID;
if (!validSession) {
  enterButton.disabled = true;
  bootMessage.textContent = game.progression?.progressionRank >= 7
    ? '別の探索Sessionが進行中です。Transport Terminalから再開してください。'
    : 'RANK 7で解放されます。Factoryへ戻って進行してください。';
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071014);
scene.fog = new THREE.FogExp2(0x071014, 0.018);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 180);
camera.rotation.order = 'YXZ';

scene.add(new THREE.HemisphereLight(0x6c8790, 0x0b0e10, 0.48));
const keyLight = new THREE.DirectionalLight(0xb4c7ca, 0.75);
keyLight.position.set(-12, 22, 10);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const facility = new THREE.Group();
scene.add(facility);
const interactables = [];
const lootMeshes = new Map();
const hazardZones = [];
const keys = new Set();
const moveVector = new THREE.Vector3();
let started = false;
let yaw = Number(exploration.activeSession?.player?.yaw || 0);
let pitch = 0;
let lastTime = performance.now();
let saveAccumulator = 0;
let nearestInteractable = null;
let hazardTick = 0;
let failed = false;
let currentZone = '';

function material(color, metalness = 0.25, roughness = 0.76, emissive = 0x000000, emissiveIntensity = 0) {
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

const floorMat = material(0x20292c, 0.42, 0.88);
const wallMat = material(0x2d383c, 0.52, 0.78);
const frameMat = material(0x192124, 0.72, 0.56);
const darkMat = material(0x101719, 0.58, 0.68);
const neutralPanel = material(0x39545a, 0.34, 0.42, 0x376e75, 0.34);
const offlinePanel = material(0x5c3430, 0.38, 0.55, 0x6d241e, 0.34);
const onlinePanel = material(0x355c50, 0.34, 0.42, 0x4ba386, 0.6);
const roboticsMat = material(0x466270, 0.48, 0.52, 0x42758d, 0.18);
const materialsMat = material(0x6a5542, 0.42, 0.58, 0x8f6637, 0.15);
const energyMat = material(0x4d526d, 0.42, 0.48, 0x555db2, 0.28);
const warningMat = material(0xb99b43, 0.34, 0.52);

// Main shell: central atrium with three readable lab wings and a sealed Central Core axis.
addBox([36, 0.35, 66], [0, -0.2, -5], floorMat, { cast: false });
addBox([0.5, 7.5, 66], [-18, 3.5, -5], wallMat);
addBox([0.5, 7.5, 66], [18, 3.5, -5], wallMat);
addBox([36, 7.5, 0.5], [0, 3.5, -38], wallMat);
for (const z of [18, 7, -5, -17, -29]) {
  addBox([31, 0.08, 0.24], [0, 0.04, z], warningMat, { cast: false });
  for (const x of [-14.5, 14.5]) addBox([0.72, 7.2, 0.72], [x, 3.45, z], frameMat);
}

// Atrium / Access Relay.
addBox([11, 0.18, 8], [0, 0.02, 14], material(0x2a373b, 0.4, 0.68), { cast: false });
addBox([3.4, 1.5, 1.8], [0, 0.75, 8.8], frameMat);
const accessConsole = addBox([2.1, 0.28, 0.12], [0, 1.45, 7.85], offlinePanel);
for (const x of [-3.6, 3.6]) {
  addCylinder(0.28, 3.8, [x, 1.9, 11.5], frameMat);
  addBox([0.55, 0.16, 3.4], [x, 3.65, 11.5], neutralPanel);
}

// Robotics Lab, west wing.
const roboticsGroup = new THREE.Group();
roboticsGroup.position.set(-10, 0, -4);
facility.add(roboticsGroup);
addBox([11.5, 0.28, 12], [0, 0.04, 0], darkMat, { parent: roboticsGroup, cast: false });
for (const x of [-4.9, 4.9]) addBox([0.36, 5.4, 12], [x, 2.7, 0], wallMat, { parent: roboticsGroup });
for (const z of [-5.2, 5.2]) addBox([10, 5.4, 0.36], [0, 2.7, z], wallMat, { parent: roboticsGroup });
for (const z of [-3.3, 0, 3.3]) {
  const arm = new THREE.Group();
  arm.position.set(-1.7, 0, z);
  roboticsGroup.add(arm);
  addCylinder(0.46, 1.3, [0, 0.65, 0], frameMat, { parent: arm });
  addBox([0.46, 2.1, 0.46], [0.5, 1.55, 0], roboticsMat, { parent: arm });
  addBox([2.0, 0.34, 0.34], [1.2, 2.4, 0], roboticsMat, { parent: arm });
}
const roboticsConsole = addBox([1.7, 1.05, 0.16], [-10, 1.0, -9.0], offlinePanel);
const roboticsLight = new THREE.PointLight(0x4d99ba, 0.75, 9, 2);
roboticsLight.position.set(-10, 3.1, -4);
scene.add(roboticsLight);

// Materials Lab, east wing.
const materialsGroup = new THREE.Group();
materialsGroup.position.set(10, 0, -4);
facility.add(materialsGroup);
addBox([11.5, 0.28, 12], [0, 0.04, 0], darkMat, { parent: materialsGroup, cast: false });
for (const x of [-4.9, 4.9]) addBox([0.36, 5.4, 12], [x, 2.7, 0], wallMat, { parent: materialsGroup });
for (const z of [-5.2, 5.2]) addBox([10, 5.4, 0.36], [0, 2.7, z], wallMat, { parent: materialsGroup });
for (const x of [-2.4, 0, 2.4]) {
  addCylinder(0.78, 2.2, [x, 1.1, 0], materialsMat, { parent: materialsGroup, segments: 18 });
  addCylinder(0.92, 0.12, [x, 2.28, 0], warningMat, { parent: materialsGroup, segments: 18 });
}
const materialsConsole = addBox([1.7, 1.05, 0.16], [10, 1.0, -9.0], offlinePanel);
const materialsLight = new THREE.PointLight(0xd18a42, 0.72, 9, 2);
materialsLight.position.set(10, 3.1, -4);
scene.add(materialsLight);

// Energy Lab, north wing.
addBox([12, 0.28, 12], [0, 0.04, -18], darkMat, { cast: false });
for (const x of [-5.8, 5.8]) addBox([0.36, 5.8, 12], [x, 2.9, -18], wallMat);
addBox([12, 5.8, 0.36], [0, 2.9, -23.8], wallMat);
for (const x of [-3.0, 0, 3.0]) {
  addCylinder(0.62, 3.3, [x, 1.65, -18], energyMat, { segments: 20 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.08, 8, 24), warningMat);
  ring.position.set(x, 2.3, -18);
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;
  facility.add(ring);
}
const energyConsole = addBox([1.7, 1.05, 0.16], [0, 1.0, -22.7], offlinePanel);
const energyLight = new THREE.PointLight(0x6977e8, 0.85, 10, 2);
energyLight.position.set(0, 3.4, -18);
scene.add(energyLight);

// Central Core: visible destination but sealed until later Phase.
addBox([17, 0.4, 8], [0, 0.05, -32], frameMat, { cast: false });
addBox([17, 5.8, 0.5], [0, 2.9, -35.6], wallMat);
const centralDoor = addBox([9, 5.0, 0.55], [0, 2.5, -27.0], frameMat);
const centralPanel = addBox([2.4, 0.4, 0.12], [0, 3.4, -26.68], offlinePanel);
for (const x of [-5.8, 5.8]) addCylinder(0.42, 5.2, [x, 2.6, -31.5], energyMat);
const coreGlow = new THREE.PointLight(0x64bec4, 0.5, 12, 2);
coreGlow.position.set(0, 3.2, -32.5);
scene.add(coreGlow);

// Service shortcut marker. Phase 6-A can open it after all three labs are recovered.
const shortcutGate = addBox([0.5, 3.8, 5.2], [16.2, 1.9, 10], frameMat);
addBox([0.12, 3.2, 4.2], [15.9, 1.9, 10], warningMat);

function register(kind, id, position, label, mesh = null, data = null) {
  interactables.push({ kind, id, position: new THREE.Vector3(...position), label, mesh, data });
}

register('return', 'research-return-pad', [0, 1.2, 20], 'Factoryへ正常帰還');
register('objective', 'research-access-relay', [0, 1.2, 7.5], '中央Access Relayを復旧', accessConsole, { step: 'access' });
register('lab', 'robotics-console', [-10, 1.2, -8.6], 'Robotics Lab Recovery Console', roboticsConsole, { labId: 'robotics' });
register('lab', 'materials-console', [10, 1.2, -8.6], 'Materials Lab Recovery Console', materialsConsole, { labId: 'materials' });
register('lab', 'energy-console', [0, 1.2, -22.3], 'Energy Lab Recovery Console', energyConsole, { labId: 'energy' });
register('objective', 'research-shortcut', [15.5, 1.2, 10], 'Service Lift Override', shortcutGate, { step: 'shortcut' });
register('central', 'central-core-gate', [0, 1.4, -26.3], 'Central Core Security Gate', centralPanel);

const lootNodes = [
  ['research-loot-01', 'e_waste', 3, -4.0, 0.45, 12.5],
  ['research-loot-02', 'control_unit', 1, -13.0, 0.45, -1.0],
  ['research-loot-03', 'rare_alloy', 1, -7.2, 0.45, -6.0],
  ['research-loot-04', 'control_unit', 1, 12.8, 0.45, -1.0],
  ['research-loot-05', 'rare_alloy', 2, 7.0, 0.45, -6.5],
  ['research-loot-06', 'e_waste', 3, -4.0, 0.45, -17.5],
  ['research-loot-07', 'rare_alloy', 1, 4.0, 0.45, -19.5],
];
for (const [id, itemId, amount, x, y, z] of lootNodes) {
  if (exploration.activeSession?.collectedLootIds?.includes(id)) continue;
  const item = ITEMS[itemId];
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), material(item.color, 0.4, 0.5, item.color, 0.18));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  facility.add(mesh);
  lootMeshes.set(id, mesh);
  register('loot', id, [x, 1.05, z], `${item.name} ×${amount}`, mesh, { itemId, amount });
}

hazardZones.push(
  { id: 'robotics', x: -10, z: -4, radius: 4.2, damage: 7, label: 'ROBOTICS / 不安定Actuator' },
  { id: 'materials', x: 10, z: -4, radius: 3.8, damage: 5, label: 'MATERIALS / 高温Process Chamber' },
  { id: 'energy', x: 0, z: -18, radius: 4.2, damage: 8, label: 'ENERGY / 電気Arc Field' },
);

function areaState() {
  return game.exploration?.areas?.research || {};
}

function objectiveState() {
  return areaState().objective || {};
}

function labStatus(labId) {
  return researchComponentState(game, labId);
}

function updateWorldState() {
  const objective = objectiveState();
  accessConsole.material = objective.accessRelayOnline ? onlinePanel : offlinePanel;
  roboticsConsole.material = objective.roboticsRecovered ? onlinePanel : offlinePanel;
  materialsConsole.material = objective.materialsRecovered ? onlinePanel : offlinePanel;
  energyConsole.material = objective.energyRecovered ? onlinePanel : offlinePanel;
  shortcutGate.visible = !objective.shortcutOpened;
  centralDoor.material = objective.labsCompleted ? neutralPanel : frameMat;
  centralPanel.material = objective.labsCompleted ? neutralPanel : offlinePanel;
  coreGlow.intensity = objective.labsCompleted ? 1.05 : 0.5;
}

function persist(reason = 'research-expedition') {
  if (exploration.activeSession?.areaId === RESEARCH_AREA_ID) {
    updateExplorationPlayer(game, { x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw });
  }
  try {
    root = saveGameSave(root, game);
    console.debug(`[research-save] ${reason}`);
  } catch (error) {
    console.error('Research expedition save failed', error);
    showToast('セーブに失敗しました', 'hazard');
  }
}

function showToast(message, tone = '') {
  toastNode.textContent = message;
  toastNode.className = `exploration-toast${tone ? ` is-${tone}` : ''} is-visible`;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toastNode.classList.remove('is-visible'), 2600);
}

function normalLootText() {
  const entries = Object.entries(exploration.activeSession?.loot || {}).filter(([, amount]) => Number(amount) > 0);
  if (!entries.length) return '通常Loot 未回収';
  return entries.map(([id, amount]) => `${ITEMS[id]?.name || id} ×${amount}`).join('<br>');
}

function cargoStateText() {
  return Object.values(RESEARCH_COMPONENTS).map((component) => {
    const status = labStatus(component.labId);
    if (status.secured) return `<span class="is-secured">✓ ${component.name} — FACTORY SECURED</span>`;
    if (status.carried) return `<span class="is-carried">◆ ${component.name} — CARRYING</span>`;
    if (status.recovered) return `<span><strong>!</strong> ${component.name} — LABから再回収可能</span>`;
    return `<span>○ ${component.name} — 未回収</span>`;
  }).join('');
}

function objectiveStepHtml(label, done) {
  return `<div class="objective-step${done ? ' is-complete' : ''}"><strong>${done ? '✓' : '○'}</strong><span>${label}</span></div>`;
}

function renderObjective() {
  const o = objectiveState();
  const statuses = Object.values(RESEARCH_COMPONENTS).map((component) => labStatus(component.labId));
  const accounted = statuses.filter((status) => status.carried || status.secured).length;

  if (!o.accessRelayOnline) {
    objectiveTitle.textContent = '中央Access Relayを復旧';
    objectiveBody.textContent = 'Atrium奥のRelay Consoleを起動してRobotics / Materials / Energy LabのAccessを復元する。';
  } else if (!o.labsCompleted) {
    objectiveTitle.textContent = '3つの研究Labを攻略';
    objectiveBody.textContent = '順番は自由。各LabのRecovery Consoleから技術Dataを復旧し、特殊部品を回収する。';
  } else if (accounted < 3) {
    objectiveTitle.textContent = '特殊部品を回収';
    objectiveBody.textContent = '復旧済みLabに回収漏れがあります。3つのSpecial Cargoを確保して正常帰還する。';
  } else {
    objectiveTitle.textContent = 'Factoryへ正常帰還';
    objectiveBody.textContent = '3 Labの技術回収が完了。Central Coreは次Phaseで攻略するため、まず特殊部品をFactoryへ持ち帰る。';
  }

  objectiveSteps.innerHTML = [
    objectiveStepHtml('Access Relay', o.accessRelayOnline),
    objectiveStepHtml('Robotics Lab / AI制御コア', o.roboticsRecovered),
    objectiveStepHtml('Materials Lab / 実験合金', o.materialsRecovered),
    objectiveStepHtml('Energy Lab / Energy Cell', o.energyRecovered),
    objectiveStepHtml('Special Cargo 3 / 3', accounted >= 3),
  ].join('');
}

function renderHud() {
  exploration = ensureExplorationState(game);
  const session = exploration.activeSession;
  const area = areaState();
  packLabel.textContent = `${usedSlots(session?.loot || {})} / 12`;
  districtProgress.textContent = `${area.discoveredZones?.length || 0} / 5`;
  healthValue.textContent = `${Math.max(0, Math.ceil(Number(session?.hp || 0)))} / 100`;
  lootList.innerHTML = normalLootText();
  specialCargoList.innerHTML = cargoStateText();
  renderObjective();
  updateWorldState();
}

function zoneForPosition(x, z) {
  if (z < -24) return { id: 'central_core', label: 'CENTRAL CORE / SEALED' };
  if (z < -11 && Math.abs(x) < 6.5) return { id: 'energy_lab', label: 'ENERGY LAB' };
  if (x < -5.0 && z < 5) return { id: 'robotics_lab', label: 'ROBOTICS LAB' };
  if (x > 5.0 && z < 5) return { id: 'materials_lab', label: 'MATERIALS LAB' };
  return { id: 'atrium', label: 'CENTRAL ATRIUM' };
}

function updateZone() {
  const zone = zoneForPosition(camera.position.x, camera.position.z);
  zoneLabel.textContent = zone.label;
  if (zone.id === currentZone) return;
  currentZone = zone.id;
  const result = discoverExplorationZone(game, zone.id);
  if (result.changed) {
    showToast(`AREA DISCOVERED: ${zone.label}`);
    persist('zone-discovered');
  }
}

function updateNearestInteractable() {
  const player = camera.position;
  let nearest = null;
  let best = 2.5;
  for (const entry of interactables) {
    if (entry.mesh && !entry.mesh.visible) continue;
    const distance = player.distanceTo(entry.position);
    if (distance < best) {
      best = distance;
      nearest = entry;
    }
  }
  nearestInteractable = nearest;
  if (!nearest) {
    prompt.hidden = true;
    return;
  }

  let label = nearest.label;
  if (nearest.kind === 'lab') {
    const status = labStatus(nearest.data.labId);
    if (status.secured) label = `${status.component.name} — Factory確保済み`;
    else if (status.carried) label = `${status.component.name} — 運搬中`;
    else if (status.recovered) label = `${status.component.name}を再回収`;
  }
  if (nearest.kind === 'central') label = objectiveState().labsCompleted ? 'Central Core — 次Phaseで解放' : 'Central Core — 3 Lab復旧が必要';
  prompt.textContent = `[E] ${label}`;
  prompt.hidden = false;
}

function handleLabInteraction(entry) {
  const labId = entry.data.labId;
  const before = labStatus(labId);
  if (!objectiveState().accessRelayOnline) {
    showToast('先に中央Access Relayを復旧してください', 'hazard');
    return;
  }

  if (!before.recovered) {
    const result = advanceResearchObjective(game, labId);
    if (!result.changed && result.reason !== 'done') {
      showToast('Lab Recoveryを開始できません', 'hazard');
      return;
    }
  }

  const component = RESEARCH_COMPONENTS[labId];
  const cargo = collectResearchCargo(game, component.id);
  if (cargo.changed) showToast(`${component.name}をSpecial Cargoへ格納`);
  else if (cargo.reason === 'secured') showToast(`${component.name}はFactory確保済み`);
  else if (cargo.reason === 'carried') showToast(`${component.name}は現在運搬中`);
  persist(`lab-${labId}`);
  renderHud();
}

function handleInteraction() {
  const entry = nearestInteractable;
  if (!entry) return;

  if (entry.kind === 'return') {
    const result = returnFromExpedition(game);
    persist('normal-return');
    if (result.secured > 0) showToast(`Special Cargo ${result.secured}件をFactoryへ確保`);
    window.setTimeout(() => { window.location.href = '../index.html'; }, 120);
    return;
  }

  if (entry.kind === 'loot') {
    const result = collectExplorationLoot(game, entry.id, entry.data.itemId, entry.data.amount);
    if (!result.changed) {
      showToast(result.reason === 'full' ? 'Expedition Packに空きがありません' : '回収できません', 'hazard');
      return;
    }
    entry.mesh?.removeFromParent();
    if (entry.mesh) entry.mesh.visible = false;
    showToast(`${ITEMS[entry.data.itemId]?.name || entry.data.itemId} ×${entry.data.amount} 回収`);
    persist('loot');
    renderHud();
    return;
  }

  if (entry.kind === 'lab') {
    handleLabInteraction(entry);
    return;
  }

  if (entry.kind === 'central') {
    showToast(objectiveState().labsCompleted
      ? 'Central CoreはPhase 6-Bで解放されます。先に3 Labの技術をFactoryへ持ち帰ってください。'
      : 'Central Core Securityは3 Labの復旧前は解除できません。');
    return;
  }

  if (entry.kind === 'objective') {
    const result = advanceResearchObjective(game, entry.data.step);
    if (!result.changed) {
      const reasonText = {
        done: 'すでに完了しています',
        'needs-labs': 'Robotics / Materials / Energy Labをすべて復旧してください',
        'needs-access': 'Access Relayの復旧が必要です',
        'phase-locked': 'このObjectiveは次Phaseで解放されます',
      }[result.reason] || 'まだ操作できません';
      showToast(reasonText, result.reason === 'done' ? '' : 'hazard');
      return;
    }
    showToast(entry.data.step === 'access' ? 'LAB ACCESS NETWORK ONLINE' : 'SERVICE LIFT UNLOCKED');
    persist(`objective-${entry.data.step}`);
    renderHud();
  }
}

function activeHazard() {
  for (const hazard of hazardZones) {
    const dx = camera.position.x - hazard.x;
    const dz = camera.position.z - hazard.z;
    if (Math.hypot(dx, dz) <= hazard.radius) return hazard;
  }
  return null;
}

function updateHazards(delta) {
  const hazard = activeHazard();
  hazardBanner?.classList.toggle('is-danger', Boolean(hazard));
  hazardBanner?.classList.toggle('is-ready', Boolean(objectiveState().labsCompleted && !hazard));
  if (!hazard) {
    hazardNote.textContent = objectiveState().labsCompleted
      ? '3 Lab Recovery完了。Special Cargoを確認してFactoryへ正常帰還してください。'
      : 'Lab内部の環境Hazardに注意。回収後も正常帰還するまでSpecial Cargoは未確定です。';
    hazardTick = 0;
    return;
  }

  hazardNote.textContent = `${hazard.label} / Hazard範囲から離れてください。`;
  hazardTick += delta;
  if (hazardTick < 0.75) return;
  hazardTick = 0;
  const session = ensureExplorationState(game).activeSession;
  if (!session || failed) return;
  const nextHp = Math.max(0, Number(session.hp || 0) - hazard.damage);
  updateExplorationHealth(game, nextHp);
  showToast(`${hazard.label} -${hazard.damage} HP`, 'hazard');
  if (nextHp <= 0) failExpedition();
  renderHud();
}

function failExpedition() {
  if (failed) return;
  failed = true;
  const result = abandonExpedition(game);
  persist('hp-zero');
  document.exitPointerLock?.();
  showToast(`行動不能。今回のLoot / Special Cargo ${result.lost || 0}件を失いました。`, 'hazard');
  window.setTimeout(() => { window.location.href = '../index.html'; }, 900);
}

function updateMovement(delta) {
  if (!started || document.pointerLockElement !== canvas || pause.hidden === false) return;
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  moveVector.set(0, 0, 0);
  if (keys.has('KeyW')) moveVector.add(forward);
  if (keys.has('KeyS')) moveVector.sub(forward);
  if (keys.has('KeyD')) moveVector.add(right);
  if (keys.has('KeyA')) moveVector.sub(right);
  if (moveVector.lengthSq() > 0) moveVector.normalize();
  const baseSpeed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 6.5 : 4.2;
  const speed = baseSpeed * (window.__scrapPlayerConvenience?.sprintMultiplier?.() ?? 1);
  camera.position.addScaledVector(moveVector, speed * delta);
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -16.5, 16.5);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -36.0, 21.5);
  if (!objectiveState().centralCoreUnlocked && camera.position.z < -25.4 && Math.abs(camera.position.x) < 7.2) camera.position.z = -25.4;
  camera.position.y = 1.7;
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function render(time) {
  const delta = Math.min(0.05, Math.max(0, (time - lastTime) / 1000));
  lastTime = time;
  if (validSession && started) {
    updateMovement(delta);
    updateZone();
    updateNearestInteractable();
    updateHazards(delta);
    saveAccumulator += delta;
    if (saveAccumulator >= 10) {
      saveAccumulator = 0;
      persist('autosave');
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function resumePointer() {
  pause.hidden = true;
  canvas.requestPointerLock?.();
}

enterButton.addEventListener('click', () => {
  if (!validSession) return;
  exploration = ensureExplorationState(game);
  const player = exploration.activeSession.player;
  camera.position.set(player.x, player.y, player.z);
  yaw = Number(player.yaw || 0);
  pitch = 0;
  boot.hidden = true;
  hud.hidden = false;
  started = true;
  renderHud();
  updateZone();
  canvas.requestPointerLock?.();
});

resumeButton.addEventListener('click', resumePointer);
abandonButton.addEventListener('click', () => {
  const result = abandonExpedition(game);
  persist('abandon');
  showToast(`探索を放棄。今回のLoot / Special Cargo ${result.lost || 0}件を失いました。`, 'hazard');
  window.setTimeout(() => { window.location.href = '../index.html'; }, 120);
});

window.addEventListener('keydown', (event) => {
  keys.add(event.code);
  if (event.code === 'KeyE' && !event.repeat && started && pause.hidden && document.pointerLockElement === canvas) handleInteraction();
  if (event.code === 'Escape' && started && !boot.hidden) pause.hidden = false;
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('mousemove', (event) => {
  if (!started || document.pointerLockElement !== canvas || !pause.hidden) return;
  yaw -= event.movementX * 0.0022;
  pitch -= event.movementY * 0.0022;
  pitch = THREE.MathUtils.clamp(pitch, -1.45, 1.45);
});
document.addEventListener('pointerlockchange', () => {
  if (!started || failed) return;
  if (document.pointerLockElement !== canvas && pause.hidden) pause.hidden = false;
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && started) persist('background');
});
window.addEventListener('beforeunload', () => {
  if (started && exploration.activeSession?.areaId === RESEARCH_AREA_ID) persist('page-exit');
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

updateWorldState();
requestAnimationFrame(render);

window.__scrapExplorationRuntime = {
  getGame: () => game,
  persist,
  scene,
  camera,
  lootMeshes: typeof lootMeshes !== 'undefined' ? lootMeshes : new Map(),
};
