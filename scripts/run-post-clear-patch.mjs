import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sourcePath = path.resolve('scripts/apply-post-clear.mjs');
let source = fs.readFileSync(sourcePath, 'utf8');

const replacements = [
  [
    "        detail: `${healthy ? 'GRID OK' : 'POWER ALERT'} / 余力 ${Math.floor(reserve)} / 240`,",
    "        detail: (healthy ? 'GRID OK' : 'POWER ALERT') + ' / 余力 ' + Math.floor(reserve) + ' / 240',",
  ],
  [
    "        detail: `容量 ${Math.floor(capacity)} / 3600 ・ 空き ${Math.floor(remaining)} / 1800`,",
    "        detail: '容量 ' + Math.floor(capacity) + ' / 3600 ・ 空き ' + Math.floor(remaining) + ' / 1800',",
  ],
  [
    "        detail: `Mk.3 ${mk3}/18 ・ Priority/Overflow ${splitters}/4 ・ Warehouse ${warehouses}/2`,",
    "        detail: 'Mk.3 ' + mk3 + '/18 ・ Priority/Overflow ' + splitters + '/4 ・ Warehouse ' + warehouses + '/2',",
  ],
  [
    "      detail: `${finalAutomation ? 'FINAL LINE OK' : 'FINAL LINE BREAK'} ・ Experimental Power ${powerSystems}/2 ・ Advanced Drone ${dronePorts}/6`,",
    "      detail: (finalAutomation ? 'FINAL LINE OK' : 'FINAL LINE BREAK') + ' ・ Experimental Power ' + powerSystems + '/2 ・ Advanced Drone ' + dronePorts + '/6',",
  ],
];

for (const [from, to] of replacements) {
  if (!source.includes(from)) throw new Error(`Expected generator line not found: ${from}`);
  source = source.replace(from, to);
}

const workReport = [
  '## 2026-09-06 — Post Clear Factory Optimization',
  '',
  '### Implemented',
  '',
  '- Main Clear後のみ解放されるFactory Optimization Objectiveを4種追加',
  '  - Power Headroom',
  '  - Buffer Reserve',
  '  - Logistics Backbone',
  '  - Redundant Automation',
  '- Rank 8 / 新通貨 / Main Clear再判定は追加せず、既存Power / Storage / Logistics / Final Automationを再利用',
  '- 現在条件はFactory stateからderiveし、達成履歴だけ `postClearOptimization` にadditive保存',
  '- Objective達成後にFactoryを組み替えても履歴は取り消さない',
  '- 4 / 4達成で `OPTIMIZATION MASTERED` を記録',
  '- Main Clear後HUDから専用Optimization Panelを開ける',
  '- `post-clear-optimization.test.mjs` を通常Validationへ追加',
  '',
  '### Preserved Contracts',
  '',
  '- Rank 1〜7 / No Rank 8',
  '- Main Clearは歴史的Milestoneのまま',
  '- Directional Logistics / 2.5m Grid / Factory Layout',
  '- Root / Game / Progression / Exploration Save Schema v1',
  '- Home / Player Upgrade / Tutorial / slot-based Backpack',
  '',
  '### Verification',
  '',
  'Implementation branchの`npm run validate`で既存RegressionとPost Clear unit/contract testsを実行する。Browser / Visual確認はFinal commitのVerification Stateへ別途記録する。',
].join('\n');

const learning = [
  '### Post-clear optimization should derive current factory quality and persist only historical milestones',
  '',
  'Factory OptimizationのPower余力、Storage空き、物流構成、Final Automation成立は現在のFactory graphから再計算できるため、Saveへ二重snapshotを持たせない。一方で「一度達成したOptional Objective」は現在状態だけでは復元できないため、Objective IDと達成時刻だけを履歴としてadditive保存する。',
  '',
  '```text',
  'current optimization condition',
  '→ derive from Factory state',
  '',
  'objective completion / mastered timestamp',
  '→ persist minimal history',
  '```',
  '',
  'これによりClear後にFactoryを自由に組み替えられ、既存Save Contractを膨らませずEndgame Challengeを継続できる。',
].join('\n');

const tailStart = source.indexOf("appendOnce('WORK_REPORT.md'");
const tailEnd = source.indexOf("console.log('Post-clear optimization patch applied.');");
if (tailStart < 0 || tailEnd < 0 || tailEnd <= tailStart) throw new Error('Documentation generator tail was not found');
const safeTail = [
  "appendOnce('WORK_REPORT.md', '## 2026-09-06 — Post Clear Factory Optimization', " + JSON.stringify(workReport) + ');',
  '',
  "appendOnce('PROJECT_LEARNINGS.md', '### Post-clear optimization should derive current factory quality and persist only historical milestones', " + JSON.stringify(learning) + ');',
  '',
].join('\n');
source = source.slice(0, tailStart) + safeTail + source.slice(tailEnd);

const tempPath = path.join(os.tmpdir(), `apply-post-clear-fixed-${Date.now()}.mjs`);
fs.writeFileSync(tempPath, source);
await import(pathToFileURL(tempPath).href);

// Temporary implementation-branch wrapper; removed before PR merge.
