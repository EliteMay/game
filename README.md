# Game Hub

**Live Site:** https://elitemay.github.io/game/

完成度の高いブラウザゲームを1本ずつ追加していく個人Game Hubです。

現在のPlayable Game:

- **Scrap Factory** — 一人称3D / 探索 / 加工 / 工場自動化 / Directional Logistics / Power / Drone Automation / Progression / Research

## Source of Truth

- `REQUIREMENTS.md` — ゲーム内容・進行・探索・Visual方針の確定要件
- `SPEC.md` — 現在実装されている技術仕様とRuntime / Save Contract
- `WORK_REPORT.md` — 実装・検証・未確認事項
- `PROJECT_LEARNINGS.md` — 再利用価値のある実装上の学び

未実装要件を実装済みとして扱いません。

## 現在のPlayable状態

`Scrap Factory` は **Post Clear: Factory Optimization Objectives** まで通常Gameplayへ接続しています。

通常のRank Upは **Rank 1 → 7**。Rank 7からFinal Chapterへ入り、Rank 8は追加しません。

```text
Factory / Scrap Yard
→ Rank 1-3 基本加工 / Directional Logistics
→ 廃住宅街
→ Rank 4 Logistics / Power
→ 廃工場 / Advanced Assembly / Smart Sorter
→ Rank 6 軍事施設 / Drone Control
→ Conveyor Mk.3 / Priority / Overflow
→ 複数Drone Route / Industrial Generator / Logistics Warehouse
→ Rank 7
→ 崩壊した研究施設
→ Robotics / Materials / Energy Lab
→ Special Cargo 3種をFactoryへ確保
→ Tri-Lab Fabrication Research
→ Fabricator
→ Experimental部品 3種を製造
→ Central Core GateへInstall
→ Core Stabilizer
→ Experimental Archive
→ Experimental Technology Research
→ Advanced Drone / Experimental Power
→ Iron Plate / Motor / Circuit 自動Assembler
→ Experimental部品 Fabricator
→ Autonomous Industrial Core Fabricator
→ 最終製品をStorageまで完全自動化
→ Mega Factoryを180秒連続安定稼働
→ MAIN CLEAR
→ KでFactory Optimization
→ Post Clear Objectives 4種
→ OPTIMIZATION MASTERED
→ 同じSaveでFactory Optimization継続
```

`REQUIREMENTS.md` の **Rank 7 → Main Clear 手順1〜10** をMain progressionとして接続済みです。

Main Clear後も同じSaveで工場を拡張・最適化できます。

## Post Clear Factory Optimization

Main Clear確認後は **K** でFactory Optimization Panelを開けます。Rank 8や新通貨は追加しません。

- **POWER HEADROOM** — Power状態OK + 240以上の余力
- **BUFFER RESERVE** — Factory Storage 3,600容量 + 1,800以上の空き
- **LOGISTICS BACKBONE** — Conveyor Mk.3 18基 + Priority/Overflow 4基 + Logistics Warehouse 2基
- **REDUNDANT AUTOMATION** — Final Automation維持 + Experimental Power 2基 + Advanced Drone Port 6基

4 / 4達成で `OPTIMIZATION MASTERED` を履歴保存します。達成後にFactoryを組み替えても達成履歴は失われません。

Phase 7 Final Qualityは実装・Browser Reviewまで完了しています。今後の主な確認 / 拡張は次です:

1. Factory Optimization / Challengeのlong-term content追加（任意拡張）
2. 実GPU / 実機でMega Factory 45 FPS目安を確認
3. 180秒安定稼働や最終生産BalanceのActual Playtest調整

## Rank 7 Final Chapter

### 1. Three Labs / Central Core

崩壊した研究施設で以下を攻略します。

- Robotics Lab
- Materials Lab
- Energy Lab
- Central Core

Special Cargo:

- AI制御コア試作機
- 実験合金サンプル
- 高密度Energy Cell試作機

Special Cargo 3/3をFactoryへ正常帰還させると `実験部品製造技術` Researchへ進めます。

Fabricatorで3種類のExperimental部品を製造し、Central CoreへAtomic Installすると:

```text
Central Core Open
→ Core Stabilizer
→ Experimental Archive
→ Experimental Technology Research
```

へ進みます。

### 2. Experimental Technology

`experimental_technology` ResearchでFinal Experimental Tierを解放します。

Unlock:

- Advanced Drone Port
- Experimental Power System
- Automated Component Recipes
- Autonomous Industrial Core Recipe

Rankは7のまま維持します。

## Advanced Drone Automation

Utility Droneは既存Rank 6 Contractを維持します。

| Utility Resource Point | Output | Cycle |
| --- | --- | ---: |
| Residential Copper Network | Copper Wire ×1 | 8s |
| Industrial Electronics Cache | E-Waste ×1 | 10s |
| Military Alloy Cache | Rare Alloy ×1 | 12s |

Experimental Technology後はAdvanced Droneで攻略済み地域の5資源を反復回収できます。

| Advanced Resource Point | Output | Cycle |
| --- | --- | ---: |
| Industrial Scrap Reserve | Metal Scrap ×1 | 4s |
| Residential Copper Network | Copper Wire ×1 | 5s |
| Residential Polymer Stockpile | Plastic ×1 | 6s |
| Industrial Electronics Cache | E-Waste ×1 | 6s |
| Military Alloy Cache | Rare Alloy ×1 | 8s |

Utility PortはAdvanced専用のPlastic / Scrap Resource Pointを選べません。

Rank 6 → 7 Mandatoryは引き続きUtility / Military Alloy Drone routeを要求します。

## Automated Production

Automation ConsoleからAssembler / FabricatorのRecipeを切り替えられます。

Assembler:

| Recipe | Input | Output | Cycle |
| --- | --- | --- | ---: |
| Control Unit | Motor ×1 + Circuit ×2 + Plastic ×1 | Control Unit ×1 | 8s |
| Iron Plate | Iron Ingot ×2 | Iron Plate ×1 | 4s |
| Motor | Iron Ingot ×2 + Copper Wire ×2 | Motor ×1 | 6s |
| Circuit | Copper Wire ×2 + E-Waste ×1 + Plastic ×1 | Circuit ×1 | 6s |

Fabricator:

```text
Control Unit ×2
+ Rare Alloy ×3
+ Circuit ×2
+ Iron Plate ×2
↓ 20秒
AI Control Module ×1
+ Experimental Frame ×1
+ Experimental Power Module ×1
```

Final Recipe:

```text
AI Control Module ×1
+ Experimental Frame ×1
+ Experimental Power Module ×1
+ Control Unit ×1
↓ 30秒
Autonomous Industrial Core ×1
```

Recipe変更時:

- Output Bufferは保持
- Progressは0へ戻す
- 新Recipeで受け付けないInputが残っている場合は切替を拒否
- Save後にFactoryをReloadしてRuntime stateを同期

## Experimental Power System

```text
Cost: $1900
Rank: 7
Research: experimental_technology
Fuel: Rare Alloy ×1
Fuel duration: 24 sec
Generation: 480 Power
```

既存Generator Runtimeを再利用しており、別Power Simulationは追加していません。

Final Automation Contractでは:

- Advanced Alloy DroneからExperimental Power SystemへDirectional Routeがある
- Experimental Power Systemが実際に稼働している
- Final production line上のPower使用設備が給電されている

ことを確認します。

## Final Automation Contract

最終Lineは専用達成Flagを保存せず、現在のFactory graphから導出します。

```text
Advanced Drone / Scrap
→ Crusher
→ Smelter
→ Iron Plate / Motor / Circuit Assembler

Advanced Drone / Copper / Plastic / Electronics
→ Assembler inputs

Advanced Drone / Rare Alloy
→ Experimental Fabricator inputs
→ Experimental Power fuel

Control Unit / Iron Plate / Circuit / Rare Alloy
→ Experimental Component Fabricator

Experimental Components + Control Unit
→ Autonomous Industrial Core Fabricator

Autonomous Industrial Core
→ Storage
```

`final-automation.js` は既存 `findDirectionalRoutes()` / Power snapshotを使って次を判定します。

- 5種類のAdvanced Drone source
- Crusher → Smelter
- Iron Plate / Motor / Circuit / Control Unit automation
- Experimental Component Fabricator
- Autonomous Industrial Core Fabricator
- Final Storage route
- Experimental Power fuel route / active generation
- Final lineへの給電
- Autonomous Industrial Coreを実際に1個以上生産

Test fixtureもDirectional Logisticsを迂回せず、**Main Bus + Splitter + Merger** の実構成でEnd-to-End routeを証明します。

## Mega Factory Stability / Main Clear

Final Automation完成後はMega Factoryの連続安定稼働へ進みます。

現在の実装値:

```text
180秒 continuous stable operation
```

安定条件:

- Final Automation Contractが現在も成立
- Factory全体でPower Shortageなし
- Final Storageに空き容量あり
- Final route throughputあり

どれか1つでも崩れると現在の連続時間は0へ戻ります。

Background / hidden Tabの時間や大きなFrame delayをまとめて加算しません。

180秒達成時:

```text
MAIN CLEAR
→ Clear時刻をSave
→ 同じSaveでFactory Optimizationを続行
```

Main Clearは一度達成した歴史的Milestoneとして保持し、Clear後にFactoryを組み替えても取り消しません。

## Exploration

| Area | Rank | Main Role |
| --- | ---: | --- |
| 廃住宅街 | 3 | 銅 / プラスチック / Resource Point |
| 廃工場 | 5 | Advanced Assembly / Industrial tech |
| 軍事施設 | 6 | Drone Control / Rare Alloy / HP threat |
| 崩壊した研究施設 | 7 | Three Labs / Fabricator parts / Central Core |

探索共通Contract:

- 通常Lootは正常帰還まで未確定
- Abandon / HP 0ではCurrent Session Lootを失う
- 永続Objective / Zone / Shortcutは保持
- 進行必須報酬を低確率Dropへ依存させない

## Directional Logistics

| 設備 | Rank | Throughput | Rule |
| --- | ---: | ---: | --- |
| Conveyor Mk.1 | 1 | 1.5/s | Forward |
| Conveyor Mk.2 | 4 | 3.0/s | Forward |
| Conveyor Mk.3 | 6 | 6.0/s | Forward |
| Splitter | 4 | 3.0/s | Forward / Left / Right Round-robin |
| Merger | 4 | 3.0/s | Rear / Left / Right → Forward |
| Smart Sorter | 5 | 3.0/s | category固定Lane |
| Priority Splitter | 6 | 6.0/s | Forward優先 / backup |
| Overflow Splitter | 6 | 6.0/s | Forward Main / Right Overflow |

Visual ArrowとRuntime方向は同じContractを使います。

## Power / Storage

Power:

- Starter Grid — 55 Power
- Scrap Generator — 80 Power
- Industrial Generator — 180 Power
- Experimental Power System — 480 Power
- Battery — 960 Energy
- Assembler — 50 Power use
- Fabricator — 110 Power use
- Advanced Drone Port — 95 Power use

Storage:

- Small Storage — 120
- Industrial Storage — 600
- Logistics Warehouse — 1800
- Storage Full時はBack PressureでItem lossを防止

## Save / Compatibility

```text
localStorage key: elitemay-game-hub-v1
Root Save Schema: 1
Game Schema: 1
Progression Schema: 1
Exploration Schema: 1
Build Grid: 2.5m
```

Final PhaseでもSchema番号は変更していません。

Additive inventory:

- `autonomous_industrial_core`

Additive Final Chapter history:

```text
finalChapter.megaFactoryStableSeconds
finalChapter.megaFactoryBestSeconds
finalChapter.mainClearedAt
finalChapter.clearAcknowledgedAt
```

Factory topology / Power / Final Automation completionそのものは保存せず現在stateから導出します。

既存Factory Layout / Rank 1→7 / Three-Lab progress / Central Core state / Utility / Advanced Drone routes / Power / Storage / Quick Build 1〜5を維持します。

## 操作

| Key / UI | 操作 |
| --- | --- |
| WASD | 移動 |
| Shift | ダッシュ |
| E | 拾う / 設備 / 探索Objective操作 |
| B | 建築 |
| R | 建築中90°回転 |
| F | 解体 |
| Tab | Inventory / Hand Craft |
| O | Guide |
| P | Factory Management |
| T | Transport Terminal |
| AUTOMATION | Drone Route / Recipe / Storage Upgrade / Final Automation / Mega Factory status |
| 1〜5 | 基本設備Quick Build |
| Esc | Pause / Panelを閉じる |

## Validation

```bash
npm run validate
```

実行順:

```text
scripts/validate.mjs
→ regressions through Phase 6-A
→ scripts/phase6b.test.mjs
→ scripts/phase6c.test.mjs
  → scripts/phase6c-bus.test.mjs
→ scripts/final-phase.test.mjs
```

Final progression regressionでは特に次を固定しています。

- Rank 7 cap / Quick Build 1〜5維持
- Experimental Technology gate
- Advanced Drone 5 resource routes
- Utility / Advanced Drone tier compatibility
- Assembler / Fabricator safe Recipe switching
- Autonomous Industrial Core recipeが4 input以内
- Experimental Power 480 / Rare Alloy fuel
- Save Schema v1維持
- full directional final automation topology
- Main Bus + Splitter + Merger regression
- Experimental Power route / active state
- final line power state
- actual Autonomous Industrial Core production requirement
- Mega Factory stable conditions
- interruption時のcontinuous timer reset
- 180秒Main Clear
- Main Clear historical persistence
- production HTMLからProgression / Automation / Final Phase UIが読み込まれること

Chromium + WebGL/SwiftShaderのBrowser Reviewでは、Production Runtime起動、高度Machine Visual、Build Preview、設置後回転、264設備Stress、Performance Mode、page overflowを確認済みです。実GPUでの45 FPS目安、Firefox / Pointer Lockの実操作、Collider / Placement feel、180秒の実プレイBalanceまでは保証しません。

## Phase 7 Final Visual / Performance Quality (2026-09-06)

Final Quality passでは、既存のPhase 5-B〜6-C高度Machine VisualをProduction Runtimeへ正式接続しました。Factory Simulation / Save / Rank / Logistics / Powerは変更せず、Rendering Layerだけを拡張しています。

- Conveyor Mk.2 / Mk.3、Splitter / Merger / Smart Sorter / Priority / Overflow
- Battery / Industrial Storage / Logistics Warehouse
- Assembler variants / Fabricator / Autonomous Core Fabricator
- Utility / Advanced Drone variants
- Industrial Generator / Experimental Power System
- 高度設備のBuild Previewと設置後Rotation
- 距離ベースDetail / Shadow / Animation / Particle budget
- 遠距離Machineのtype-batched `THREE.InstancedMesh` proxy
- Transfer Packet上限と距離Budget
- 稼働Machineのbounded Spark / Heat / Energy feedback
- Performance ModeでShadow / Particle / Detail距離を追加削減

同一Chromium/SwiftShader Stress fixture（264設備）で、旧Production baselineの6,054 draw calls / 134,084 trianglesから、Highで1,285 draw calls / 58,944 trianglesへ削減しました。Performance Modeは134 draw calls / 8,898 trianglesでした。SwiftShader値は実GPU FPSの代用ではなく、同一環境の相対比較Evidenceとして扱います。

Visual Review #5（Run `34035243298`）ではHigh / Stress / Performance Mode screenshotを確認し、Performance ModeのCamera Far ClipでProcedural Skyが多角形化していた不具合も修正済みです。

## Home / Player Convenience (2026-09-06)

Scrap FactoryのFactory北側に固定Home区画を追加しました。HomeはFactoryの2.5m建築Grid外で、Factory Layoutを消費しません。

- Bed: Manual Save / Home Respawn。既存SaveはBedを一度使うまで従来位置を維持します。
- PC: Player Upgrade / Material Tracking / Tutorial Library / Player Progress。Factory Researchとは別系統です。
- Home Storage / Exploration Workbench: 手動移動、Quick Deposit、Loadout Preset、Secure Caseを管理します。
- Backpackは従来どおりSlot制です。重量制・重量Penaltyは導入していません。
- TutorialはHomeから始まる実操作ベースへ更新し、O GuideとPC Libraryで同じ説明Sourceを参照します。
- System DiagnosticsはMachine / Logistics / Power / Storage / Drone / Final Phaseの原因候補と確認先を表示します。自動修正は行いません。
