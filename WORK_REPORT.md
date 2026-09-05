# Work Report

Date: 2026-09-05

## Current Milestone

`Scrap Factory` は **Phase 6-C: Final Automation / Autonomous Industrial Core** まで実装。

Rank Upは **Rank 1 → 7**。Rank 7はFinal Chapter開始点でありMain Clearではない。

```text
Rank 7
→ Ruined Research Facility Three Labs
→ Special Cargo 3 / 3 Factory secured
→ Experimental Fabrication Research
→ Fabricator
→ AI Control Module / Experimental Frame / Experimental Power Module
→ Central Core Gate
→ Core Stabilizer
→ Experimental Archive
→ Experimental Technology Research
→ Advanced Drone / Experimental Power
→ Automated Plate / Motor / Circuit production
→ Experimental Component Fabricator
→ Autonomous Industrial Core Fabricator
→ Autonomous Industrial Core → Storage complete directional line
```

---

## Requirements Mapping

`REQUIREMENTS.md` のRank 7 → Main Clear順序:

1. Robotics Lab
2. Materials Lab
3. Energy Lab
4. 特殊部品をFactoryへ持ち帰る
5. Factoryで最終部品を製造
6. Central Core攻略
7. Experimental Technology Research
8. 最終製品完全自動Line
9. Mega Factory安定稼働
10. Main Clear

Phase 6-Aで1〜4を実装済み。

Phase 6-Bで5〜7を実装済み。

**Phase 6-Cで8を実装。**

9〜10は未実装のまま残す。

---

## Implemented

### 1. Phase 6-C Progression Layer

Created:
- `games/scrap-factory/progression-phase6c.js`

Updated:
- `games/scrap-factory/progression.js`

`experimental_technology` completionで以下を解放:

- `tier:experimental`
- `production:autonomous_core`
- `production:automated_components`
- `building:advanced_drone_port`
- `building:experimental_power_system`

`PLAYABLE_MAX_RANK = 7`は変更していない。

Phase 6-B Saveで既に `experimental_technology` 完了済みの場合も、新building gateを解放済みとして扱う。

### 2. Advanced Drone

Updated:
- `games/scrap-factory/drone-routes.js`
- `games/scrap-factory/config.js`

Drone tierを分離:
- Utility
- Advanced

Advanced Drone Resource Point:

| Resource | Item | Cycle |
| --- | --- | ---: |
| Industrial Scrap Reserve | Metal Scrap | 4s |
| Residential Copper Network | Copper Wire | 5s |
| Residential Polymer Stockpile | Plastic | 6s |
| Industrial Electronics Cache | E-Waste | 6s |
| Military Alloy Cache | Rare Alloy | 8s |

Advanced Drone Port:

```text
Cost: $1450
Power: 95
Rank: 7
Research: experimental_technology
```

Utility Drone compatibility:
- Copper 8s
- E-Waste 10s
- Rare Alloy 12s
- Plastic / Scrap Advanced-only pointsはUtility Portで選択不可
- Rank 6→7 Military Alloy mandatoryを維持

### 3. Automated Assembler Recipes

Added:

```text
Iron Plate:
iron_ingot ×2 → iron_plate ×1 / 4s

Motor:
iron_ingot ×2 + copper_wire ×2 → motor ×1 / 6s

Circuit:
copper_wire ×2 + e_waste ×1 + plastic ×1 → circuit ×1 / 6s
```

Existing Control Unit recipe:

```text
motor ×1 + circuit ×2 + plastic ×1
→ control_unit ×1 / 8s
```

Assembler recipe variants are internal building types, not separate direct-build menu items.

### 4. Production Recipe Routing

Created:
- `games/scrap-factory/production-recipes.js`

Families:
- Assembler
- Fabricator

Safe switch contract:
- Same family only
- Research gate required
- incompatible Input Bufferが残る場合は`buffer-conflict`
- Output Buffer preserved
- Building identity / location preserved
- Progress reset only
- Building type changes to recipe variant

### 5. Autonomous Industrial Core

Added item:
- `autonomous_industrial_core`

Final recipe:

```text
AI Control Module ×1
+ Experimental Frame ×1
+ Experimental Power Module ×1
+ Control Unit ×1
↓ 30 sec
Autonomous Industrial Core ×1
```

Recipe input typeは4種類以内。

FabricatorはPhase 6-Cから:
- Experimental Component Set
- Autonomous Industrial Core

をAutomation Consoleで切替可能。

### 6. Experimental Power System

Added Building:

```text
id: experimental_power_system
Cost: $1900
Power Generation: 480
Fuel: rare_alloy ×1
Fuel duration: 24 sec
Rank: 7
Research: experimental_technology
```

既存Generator Runtimeを再利用。

Final AutomationではAdvanced Rare Alloy RouteがExperimental Powerへ到達し、実際にGeneratorがactiveであることを要求する。

### 7. Final Automation Analyzer

Created:
- `games/scrap-factory/final-automation.js`

`analyzeFinalAutomation(game)` はFactory stateから次を導出:

- Experimental Technology
- Advanced Drone Scrap / Copper / Plastic / Electronics / Alloy
- Crusher → Smelter metallurgy
- Iron Plate automation
- Motor automation
- Circuit automation
- Control Unit automation
- Experimental Component automation
- Autonomous Industrial Core automation
- Final Storage route
- Experimental Power fuel route
- Experimental Power active state
- Final line powered state
- Product production evidence

専用completion flagはSaveしない。

Directional routeは既存 `findDirectionalRoutes()` を唯一のSource of Truthとして再利用。

### 8. Actual Product Evidence

TopologyだけでPhase 6-C完了とはしない。

`Autonomous Industrial Core` が:
- Factory inventory
- Building output buffer
- discoveredItems

のいずれかに存在して初めて `productProven = true`。

Final lineを並べただけでは`qualifies`にならない。

### 9. Unified Automation Console

Created / Updated:
- `games/scrap-factory/automation-ui.js`
- `games/scrap-factory/phase5c-automation-ui.js`

Console capabilities:
- Utility / Advanced Drone route assignment
- Assembler / Fabricator Recipe routing
- Industrial Storage → Logistics Warehouse upgrade
- Final Automation Contract status

Route / Recipe変更時はSave後reload。

理由:
- current `game.js` runtime stateはmodule-local
- Saveのみ変更して継続すると後続autosaveがstale stateで上書きするRiskがある

### 10. Rank 7 Progression UI

Created:
- `games/scrap-factory/progression-ui-v4.js`

Updated:
- `games/scrap-factory/progression-ui.js`

Rank 7 panel:
- Main Clear未達を維持
- Final Automation進行を表示
- Mega Factory / Main Clearを次段階として残す

### 11. Dedicated Phase 6-C Visuals

Updated:
- `games/scrap-factory/world-runtime.js`

Dedicated procedural markers / silhouettes:
- Advanced Drone variants
- Experimental Power System
- Assembler recipe variants
- Autonomous Core Fabricator variant

Simulation stateのSource of Truthにはしない。

### 12. Save Compatibility

Updated:
- `games/scrap-factory/storage.js`

Additive inventory:
- `autonomous_industrial_core: 0`

Preserved:
- `elitemay-game-hub-v1`
- Root Save Schema 1
- Game Schema 1
- Progression Schema 1
- Exploration Schema 1
- Rank 1→7
- Existing Factory Layout
- Phase 6-A Three-Lab state
- Phase 6-B Central Core state
- 2.5m Grid
- Directional Logistics
- Storage Back Pressure
- Utility Drone routing
- Quick Build 1〜5
- GitHub Pages relative paths

---

## Regression Coverage

Added:
- `scripts/phase6c-final-automation.test.mjs`
- `scripts/phase6c-bus.test.mjs`
- `scripts/phase6c.test.mjs`

Updated:
- `package.json`

`npm run validate`:

```text
scripts/validate.mjs
&& scripts/phase6b.test.mjs
&& scripts/phase6c.test.mjs
```

Phase 6-C checks:
- Rank 7 cap unchanged
- Quick Build 1〜5 unchanged
- Autonomous Industrial Core item
- Autonomous Core <=4-input recipe
- Experimental Technology new unlocks
- legacy Research compatibility
- Advanced Drone all 5 resources
- Utility Drone cannot use Advanced-only points
- Drone route switch output preservation / progress reset
- Assembler / Fabricator safe recipe switching
- incompatible input buffer rejection
- Save / Exploration schema v1
- Experimental Power 480 / Rare Alloy fuel
- full directional final automation topology
- final Storage route
- Experimental Power fuel route
- Experimental Power active state
- final production line powered state
- actual Autonomous Industrial Core production
- current progression / automation / world runtime markers

Existing tests through Phase 6-B continue to run first.

---

## Main-bus Regression Fix

### Problem

最初のPhase 6-C E2E fixtureは、空きGridをBFSで自動探索して各Machineを接続していた。

Factoryが密になるにつれ:
- input routeがoutput branchを塞ぐ
- output branchがinput portを塞ぐ
- repeated source branchの予約順で結果が変わる
- test fixtureのrouting順序がGameplay contractより複雑になる

状態になった。

既存Regressionはすべて通っており、Production / Logistics本体ではなくFixture設計が不安定だった。

### Final approach

Testを弱めず、明示的なbuildable topologyへ変更:

```text
Advanced Sources
→ Merger
→ Conveyor Mk.3 Main Bus
→ Splitter
→ Machine
→ Merger
→ Main Bus
→ ...
→ Final Storage
```

これにより:
- actual Directional Logistics ruleを通る
- Splitter / Merger behaviorを含む
- 5 source + multi-input productionを1本の明示構成で検証
- test construction orderへの依存を除去

できた。

Analyzerの正式stage名とTest assertionのずれも修正した。

---

## CI Evidence During Implementation

Phase 6-C final implementation head before docs:

```text
1e3a2bae14c1f9861b25e7d14c88190f486faa3a
Validate Web Game #135
result: success
```

このrunでは:
- project-contract: success
- reusable baseline: success
- existing regression through Phase 6-A: success
- Phase 6-B: success
- Phase 6-C main-bus test: success

を確認。

**Completionはdocumentation-inclusive final headとmerge後mainのCI / Pagesを再確認して判断する。**

---

## Reusable Learning

### End-to-end game tests should use explicit representative layouts

自由配置ゲームのE2E Testで「Test自身が自動的に良いLayoutを設計する」仕組みを作ると、Product ruleの検証よりFixture routing algorithmのdebugへ時間を使いやすい。

Final automationのような代表lineは:

```text
explicit representative layout
→ actual production routing function
→ regression assertion
```

を優先する。

Test fixtureを単純化しても、Product runtimeを迂回しない限りRegressionを弱めることにはならない。

### Final progression state should be derived from actual factory state

Final Automation用に`finalAutomationComplete = true`のようなSave flagを追加しない。

- Drone assignment
- Directional route
- Machine type / recipe
- Power state
- produced item evidence

から毎回導出することで、PlayerがFactoryを壊した場合も状態が正しく戻る。

### A final-line topology check should require production evidence

MachineとBeltが接続されているだけでは「完成した工場」とは言えない。

Final productを実際に1個以上生産した証拠を要求し、Topology-only false positiveを防ぐ。

---

## Not Yet Verified

Static CIでは次を保証しない。

- 実ブラウザでのFactory操作
- Automation Console actual layout / overflow
- Recipe dropdown / Apply / reloadの操作感
- Advanced Drone route switch / reloadの操作感
- Experimental PowerへのRare Alloy供給の実プレイ感
- Advanced Drone first-person silhouette / scale
- Experimental Power first-person silhouette / scale
- Assembler / Fabricator variant Build Preview readability
- Collider / Placement feel
- Pointer Lock / Pause復帰
- Final line layout ergonomics
- WebGL FPS
- Firefox / Chromiumでの実操作
- Final production balance / throughput tuning

Browser / User Validation対象として残す。

---

## Remaining Work

Requirements上の次段階:

### Final Phase
- Mega Factory stable-operation objective
- Main Clear

### Post Clear / Quality
- clear-after Optimization objectives
- final Hybrid Asset / Lighting / VFX / LOD quality pass
- browser playtest / balance pass

Phase 6-Cではこれらを実装済み扱いにしない。
