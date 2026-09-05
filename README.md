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

`Scrap Factory` は **Phase 6-C: Final Automation / Autonomous Industrial Core** まで通常Gameplayへ接続しています。

通常のRank Upは **Rank 1 → 7**。Rank 7はMain ClearではなくFinal Chapterの開始点です。

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
```

Phase 6-Cで `REQUIREMENTS.md` の **Rank 7 → Main Clear 手順8「最終製品の完全自動Line」** まで実装済みです。

**まだMain Clearではありません。** 残っている主要要件は:

1. Mega Factoryを一定時間安定稼働
2. Main Clear
3. Clear後Optimization
4. final Hybrid Asset / Lighting / VFX / LOD quality pass

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

Rankは7のまま維持し、Rank 8は追加していません。

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

Phase 6-Cの最終Lineは専用達成Flagを保存せず、現在のFactory graphから導出します。

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

Phase 6-CでもSchema番号は変更していません。

Additive inventory:

- `autonomous_industrial_core`

Advanced Drone route、Recipe mode、Generator fuel等は既存Building state / type contractへ追加的に接続します。

既存Factory Layout / Rank 1→7 / Three-Lab progress / Central Core state / Utility Drone routes / Power / Storage / Quick Build 1〜5を維持します。

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
| AUTOMATION | Drone Route / Recipe / Storage Upgrade / Final Automation status |
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
```

Phase 6-Cでは特に次を固定しています。

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

Static CIでは実ブラウザPointer Lock、Automation Console layout、Factory layout ergonomics、Build Preview、Advanced Drone / Experimental Powerの一人称Scale、Collider、WebGL FPS、最終LineのBalance /操作感までは保証しません。