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

const tempPath = path.join(os.tmpdir(), `apply-post-clear-fixed-${Date.now()}.mjs`);
fs.writeFileSync(tempPath, source);
await import(pathToFileURL(tempPath).href);
