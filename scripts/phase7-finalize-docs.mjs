import { readFile, writeFile } from 'node:fs/promises';

async function replaceRequired(path, from, to) {
  const source = await readFile(path, 'utf8');
  if (!source.includes(from)) throw new Error(`${path}: expected block not found`);
  await writeFile(path, source.replace(from, to));
}

async function insertBeforeOnce(path, marker, insertion, sentinel) {
  const source = await readFile(path, 'utf8');
  if (source.includes(sentinel)) return;
  if (!source.includes(marker)) throw new Error(`${path}: insertion marker not found`);
  await writeFile(path, source.replace(marker, `${insertion}\n\n${marker}`));
}

async function appendOnce(path, sentinel, block) {
  const source = await readFile(path, 'utf8');
  if (source.includes(sentinel)) return;
  await writeFile(path, `${source.trimEnd()}\n\n${block.trim()}\n`);
}

await replaceRequired(
  'README.md',
  `残っている主要作業:\n\n1. Factory Optimization / Challengeのlong-term content追加\n2. final Hybrid Asset / Lighting / VFX / LOD quality pass\n3. Mega FactoryのBrowser / Performance / Visual / Balance検証`,
  `Phase 7 Final Qualityは実装・Browser Reviewまで完了しています。今後の主な確認 / 拡張は次です:\n\n1. Factory Optimization / Challengeのlong-term content追加（任意拡張）\n2. 実GPU / 実機でMega Factory 45 FPS目安を確認\n3. 180秒安定稼働や最終生産BalanceのActual Playtest調整`,
);

await replaceRequired(
  'README.md',
  `Static CIでは実ブラウザPointer Lock、Main Clear overlay layout、Factory layout ergonomics、Build Preview、Advanced Drone / Experimental Powerの一人称Scale、Collider、WebGL FPS、180秒の実プレイBalance / 操作感、Firefox / Chromium実操作までは保証しません。`,
  `Chromium + WebGL/SwiftShaderのBrowser Reviewでは、Production Runtime起動、高度Machine Visual、Build Preview、設置後回転、264設備Stress、Performance Mode、page overflowを確認済みです。実GPUでの45 FPS目安、Firefox / Pointer Lockの実操作、Collider / Placement feel、180秒の実プレイBalanceまでは保証しません。`,
);

await insertBeforeOnce(
  'README.md',
  '## Home / Player Convenience (2026-09-06)',
  `## Phase 7 Final Visual / Performance Quality (2026-09-06)\n\nFinal Quality passでは、既存のPhase 5-B〜6-C高度Machine VisualをProduction Runtimeへ正式接続しました。Factory Simulation / Save / Rank / Logistics / Powerは変更せず、Rendering Layerだけを拡張しています。\n\n- Conveyor Mk.2 / Mk.3、Splitter / Merger / Smart Sorter / Priority / Overflow\n- Battery / Industrial Storage / Logistics Warehouse\n- Assembler variants / Fabricator / Autonomous Core Fabricator\n- Utility / Advanced Drone variants\n- Industrial Generator / Experimental Power System\n- 高度設備のBuild Previewと設置後Rotation\n- 距離ベースDetail / Shadow / Animation / Particle budget\n- 遠距離Machineのtype-batched \`THREE.InstancedMesh\` proxy\n- Transfer Packet上限と距離Budget\n- 稼働Machineのbounded Spark / Heat / Energy feedback\n- Performance ModeでShadow / Particle / Detail距離を追加削減\n\n同一Chromium/SwiftShader Stress fixture（264設備）で、旧Production baselineの6,054 draw calls / 134,084 trianglesから、Highで1,285 draw calls / 58,944 trianglesへ削減しました。Performance Modeは134 draw calls / 8,898 trianglesでした。SwiftShader値は実GPU FPSの代用ではなく、同一環境の相対比較Evidenceとして扱います。\n\nVisual Review #5（Run \`34035243298\`）ではHigh / Stress / Performance Mode screenshotを確認し、Performance ModeのCamera Far ClipでProcedural Skyが多角形化していた不具合も修正済みです。`,
  '## Phase 7 Final Visual / Performance Quality (2026-09-06)',
);

await replaceRequired('SPEC.md', 'Updated: 2026-09-05', 'Updated: 2026-09-06');

await replaceRequired(
  'SPEC.md',
  `未実装 / 後続:\n- clear-after optimization objectivesの拡張\n- final Hybrid Asset / Lighting / VFX / LOD quality pass\n- Mega Factory実測Performance / Browser / Visual Review`,
  `Phase 7 Final Qualityまで実装済み:\n- 高度Machine VisualのProduction接続\n- distance-based LOD / Culling / Shadow / Animation / VFX budget\n- type-batched Instanced proxy / bounded transfer packets\n- Chromium + WebGL/SwiftShaderで264設備Stress / Visual Review\n\n後続 / 未確認:\n- clear-after optimization objectivesの任意拡張\n- 実GPU / 実機で45 FPS目安の確認\n- Firefox / Pointer Lock / Collider / Placementの実操作\n- 180秒安定稼働と最終BalanceのActual Playtest`,
);

await replaceRequired(
  'SPEC.md',
  `├─ world-runtime-phase5b.js\n├─ world-runtime.js\n├─ progression.js`,
  `├─ world-runtime-phase5b.js\n├─ world-runtime.js\n├─ phase7-settings.js\n├─ phase7-world-polish.js\n├─ phase7-world-runtime.js\n├─ progression.js`,
);

await replaceRequired(
  'SPEC.md',
  `\`index.html\` は \`game.js\` / \`feature-pack.js\` / \`progression-ui.js\` をproduction runtimeとして読み込む。\`progression-ui.js\` は既存Automation ConsoleとFinal Phase UIをside-effect layerとして読み込み、Rank / Research UIは \`progression-ui-v4.js\` を維持する。`,
  `\`index.html\` は \`game.js\` / \`feature-pack.js\` / \`progression-ui.js\` をproduction runtimeとして読み込む。\`progression-ui.js\` は既存Automation Console / Final Phase UI / Home / adaptive UI / Phase 7 settings / Phase 7 visual runtimeをside-effect layerとして読み込み、Rank / Research UIは \`progression-ui-v4.js\` を維持する。`,
);

await replaceRequired(
  'SPEC.md',
  `## 13. Visual Layer\n\nVisual direction: \`Stylized Industrial Realism\`。\n\nExisting dedicated procedural visuals:\n- Advanced Drone variants\n- Experimental Power System\n- Assembler recipe variants\n- Autonomous Core Fabricator variant\n\nFinal Phase UIは既存Industrial UI languageへ合わせたHUD / progress / clear overlayの最小追加。\n\nFinal Hero Machine / Mega Factory startup visual、Hybrid Asset / Lighting / VFX / LODのfinal quality passは後続。\n\nVisual variant is not simulation source of truth.`,
  `## 13. Visual / Performance Layer\n\nVisual direction: \`Stylized Industrial Realism\`。Visual variant is not simulation source of truth.\n\nProductionでは \`phase7-world-runtime.js\` が既存 \`world-runtime-phase5b.js\` → \`world-runtime.js\` の高度Machine VisualをTemplateとして再利用し、\`game.js\` のFactory Simulationを置き換えず表示Meshだけを差し替える。\n\nDedicated visual coverage:\n- Conveyor Mk.2 / Mk.3\n- Splitter / Merger / Smart Sorter / Priority / Overflow\n- Battery / Industrial Storage / Logistics Warehouse\n- Assembler / recipe variants\n- Utility / Advanced Drone variants\n- Industrial Generator / Experimental Power System\n- Fabricator / Autonomous Core Fabricator\n\n\`phase7-world-polish.js\` はRendering-only budgetを担当する。\n\n- near: full machine detail / bounded shadow / animation / VFX\n- mid/far: type-batched \`THREE.InstancedMesh\` proxy\n- quality tierごとのdetail / shadow / animation / particle / cull distance\n- transfer packet distance + maximum count\n- bounded Spark / Heat / Energy point pools\n- Performance ModeはLow visual budgetを使用し、Simulation resultを変更しない\n\nPerformance ModeでもProcedural SkyをCamera Far Clipで切らない。Factory draw distance削減はCamera far planeではなくPhase 7 LOD / Culling budgetで行う。\n\nFinal Phase UIは既存Industrial UI languageへ合わせたHUD / progress / clear overlayを維持する。`,
);

await replaceRequired(
  'SPEC.md',
  `→ scripts/final-phase.test.mjs\n\`\`\``,
  `→ scripts/final-phase.test.mjs\n→ scripts/home-system.test.mjs\n→ scripts/post-clear-optimization.test.mjs\n→ scripts/adaptive-ui.test.mjs\n→ scripts/phase7-settings.test.mjs\n→ scripts/phase7-visual.test.mjs\n\`\`\``,
);

await replaceRequired(
  'SPEC.md',
  `### Unverified by static CI\n\n- real browser Pointer Lock / Pause flow\n- Main Clear overlayのpointer-lock復帰\n- Progression / Automation / Final HUD actual layout / overflow\n- Route / Recipe reload interaction feel\n- Advanced Drone / Experimental Power first-person scale\n- Build Preview readability\n- Mega Factory layout ergonomics\n- collider / placement feel\n- WebGL FPS / 150〜250 machine scale performance\n- 180秒の実プレイBalance / pacing\n- final automated line gameplay feel\n- Firefox / Chromium real operation\n- final Visual Review / Screenshot Review`,
  `### Browser / Visual evidence and remaining real-device checks\n\nChromium + WebGL/SwiftShader Visual Review #5（Run \`34035243298\`）で確認済み:\n\n- Production Runtime / Phase 7 visual patch起動\n- Phase 5-B / Phase 6-C高度Machine visual\n- 高度設備Build Preview / transparency\n- 設置後Rotation\n- 264設備StressでHigh: 1,285 draw calls / 58,944 triangles\n- Performance Mode: 134 draw calls / 8,898 triangles\n- transfer packet visual上限\n- Performance ModeのShadow / VFX削減\n- 1440×900 screenshot / page-level horizontal overflowなし\n- Performance Mode sky clipping修正後のVisual Review\n\n未確認:\n\n- 実GPU / 実機で45 FPS目安を満たすか\n- real browser Pointer Lock / Pause / Main Clear overlay復帰の操作感\n- Route / Recipe reload interaction feel\n- collider / placement feel / Mega Factory layout ergonomics\n- 180秒の実プレイBalance / pacing\n- final automated line gameplay feel\n- Firefox実操作`,
);

await appendOnce(
  'WORK_REPORT.md',
  '## 2026-09-06 — Phase 7 Final Visual / Performance Quality Pass',
  `## 2026-09-06 — Phase 7 Final Visual / Performance Quality Pass\n\nEarlier \`Final Quality\` / \`Browser Performance / Visual Review\` remaining items in this report are superseded by this section.\n\n### Implemented\n\n- Phase 5-B〜6-Cで既に作られていた高度Machine VisualをProduction Runtimeへ正式接続\n- Conveyor Mk.2 / Mk.3、Splitter / Merger / Smart Sorter / Priority / Overflow\n- Battery / Industrial Storage / Logistics Warehouse\n- Assembler variants / Utility + Advanced Drone / Industrial Generator\n- Fabricator / Autonomous Core Fabricator / Experimental Power System\n- 高度設備のBuild Preview / transparency / post-placement rotation\n- type-batched \`THREE.InstancedMesh\` proxyによる遠距離LOD\n- 距離ベースShadow / Animation / Particle budget\n- bounded Spark / Heat / Energy feedback\n- transfer packet距離制限 + maximum count\n- Performance ModeのLow visual budget\n- Rendering layerはFactory Simulation / Logistics / Power / Save resultを変更しない\n\n### Baseline / Stress Evidence\n\n同一Chromium + SwiftShader fixture。絶対Frame timeは実GPU FPSとして扱わず、同一環境の相対比較だけに使う。\n\n| 264設備 | Draw calls | Triangles |\n| --- | ---: | ---: |\n| 旧Production baseline | 6,054 | 134,084 |\n| Phase 7 High | 1,285 | 58,944 |\n| Performance Mode | 134 | 8,898 |\n\nHighでは264設備中72をdetail、192をinstanced proxyへ移行。Performance Modeでは12 detail / 252 proxy。Visual transfer packetsはHighで最大140へbounded。\n\n### Browser / Visual Validation\n\nFinal successful visual run:\n\n\`\`\`text\nPhase 7 Visual Review #5\nRun: 34035243298\nHead: 0c09735ecd6f2b69935403f42f02270e89503cfe\nResult: success\n\`\`\`\n\n確認済み:\n\n- Production Runtime patch active\n- Phase 5-B visual count / Phase 6-C late visual count\n- enhanced Build Preview + transparency\n- post-placement rotation\n- 264設備Stress\n- Packet budget\n- Performance Mode: Low visual budget / shadows off / spark・heat・energy off\n- 1440×900 horizontal overflowなし\n- page errors 0\n- High / Stress / Performance Mode screenshot目視\n\nVisual Review #4のPerformance Mode screenshotでProcedural SkyがCamera Far Clipに切られ、大きな明るい多角形として見える問題を発見。Performance Modeのcamera farを145へ縮める方式をやめ、skyは190のfrustum内に維持し、Factory draw distanceは既存のLOD / Culling budgetで削減するよう修正した。Review #5 screenshotで崩れ解消を目視確認済み。\n\n### Static Regression\n\n- \`scripts/phase7-settings.test.mjs\`\n- \`scripts/phase7-visual.test.mjs\`\n- \`npm run validate\` へ統合\n- Phase 7 layerが \`RECIPES\` / Power snapshot / Progression state等のSimulation ownershipを持たないことをRegressionで固定\n\n### Preserved Contracts\n\n- Rank 1→7 / Main Clear / Post Clear Optimization\n- Save Schema v1\n- Existing Factory Layout / 2.5m Grid\n- Directional Logistics / Power / Storage Back Pressure\n- Home / Player Upgrade / Tutorial\n- Factory Simulation resultはGraphics Quality / Performance Modeで変化しない\n\n### Still Requires Real-device / Actual Playtest\n\n- 実GPU環境で通常60 FPS / Mega Factory約45 FPS目安を満たすか\n- Firefox / Chromium Pointer Lock実操作\n- Collider / Placement / Mega Factory layout ergonomics\n- 180秒stable-run pacing / final production balance\n\nCIのSwiftShader stress結果だけから実機45 FPS達成とは扱わない。`,
);

await appendOnce(
  'PROJECT_LEARNINGS.md',
  '## 2026-09-06 / Phase 7 Production Visual Wiring & Stress Budget',
  `## 2026-09-06 / Phase 7 Production Visual Wiring & Stress Budget\n\n### Evidence\n\n- 高度Machine専用Visual実装はRepository内に存在していたが、Productionの \`game.js\` は基底 \`world.js\` を直接使用しており、作成済みVisualが実プレイへ接続されていなかった。\n- 264設備の旧Production stressは6,054 draw calls / 134,084 triangles。Phase 7 LOD後はHighで1,285 / 58,944、Performance Modeで134 / 8,898。\n- Performance Modeでcamera farを145へ縮めたところ、半径165のProcedural Sky sphereがFar Clipに切られ、Screenshot上で大きな明るい多角形になった。\n\n### Keep\n\n- 「実装ファイルが存在する」ではなく、Production entrypointから実際に使われることをBrowser Runtimeで確認する。Dormant implementationは未実装と同じ扱いにする。\n- Game Rule / SimulationとRendering optimizationを分離する。遠距離Machineをproxy化してもProduction / Logistics / Power resultは変えない。\n- 大量の同系統Objectはtype-batched Instancing、距離LOD、Shadow / Animation / Particle budgetを組み合わせる。単一の最適化だけへ依存しない。\n- SwiftShaderの絶対FPSは実GPU性能の証明に使わず、同じfixture・同じ環境のbefore / after比較Evidenceとして使う。\n- Performance ModeでDraw Distanceを落とす場合、Camera Far ClipでSky / Background Geometryまで切るのではなく、対象Object側のLOD / Cullingを優先する。\n\n### Watch\n\n- Static testとrenderer countersが通っても、clip / z-fighting / silhouette崩れ等のVisual defectは残り得る。最終Screenshot目視を別Gateにする。\n- Instanced proxyは主要Silhouette /物流方向を壊さない範囲に留める。近距離Interaction targetはfull detailを維持する。\n- Hidden base geometryを残すとdraw callは減ってもGPU resource / memory debtが残るため、差し替え後に不要Geometry / Materialをdisposeする。`,
);

console.log('Phase 7 documentation sync prepared.');
