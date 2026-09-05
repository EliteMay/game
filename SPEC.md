# Specification

Updated: 2026-09-05

この文書は現在実装されている `Scrap Factory` の技術仕様を記録する。将来要件は `REQUIREMENTS.md` をSource of Truthとし、未実装要件を実装済みとして扱わない。

## 1. Current Playable Scope

通常Gameplayは **Rank 1 → 7 → Main Clear** まで接続済み。Rank 7はFinal Chapter開始点であり、Rank 8は追加しない。

```text
Factory / Scrap Yard
→ Residential Exploration
→ Rank 4 Logistics / Power
→ Abandoned Factory / Advanced Assembly
→ Rank 6 Military / Drone Automation
→ Conveyor Mk.3 / Priority / Overflow
→ Configurable Drone Routes / Industrial Generator / Logistics Warehouse
→ Rank 7
→ Ruined Research Facility
→ Robotics / Materials / Energy Lab
→ Special Cargo 3 / 3 normal return
→ Experimental Fabrication Research
→ Fabricator
→ Final Component Set
→ Central Core Gate
→ Core Stabilizer
→ Experimental Archive
→ Experimental Technology Research
→ Advanced Drone / Experimental Power
→ automated Plate / Motor / Circuit production
→ Experimental Component Fabricator
→ Autonomous Industrial Core Fabricator
→ Autonomous Industrial Core → Storage directional route
→ Mega Factory 180秒連続安定稼働
→ MAIN CLEAR
→ same SaveでFactory Optimization継続
```

現在は **Final Phase: Mega Factory Stability / Main Clear** まで実装済み。

`REQUIREMENTS.md` の Rank 7 → Main Clear 手順8「最終製品の完全自動Line」、手順9「Mega Factoryを一定時間安定稼働」、手順10「Main Clear」を通常Gameplayへ接続している。

未実装 / 後続:
- clear-after optimization objectivesの拡張
- final Hybrid Asset / Lighting / VFX / LOD quality pass
- Mega Factory実測Performance / Browser / Visual Review

---

## 2. Runtime Architecture

```text
Scrap Factory
├─ config.js
├─ final-chapter.js
├─ final-automation.js
├─ final-phase.js
├─ final-phase-ui.js
├─ production-recipes.js
├─ logistics.js
├─ power.js
├─ storage-capacity.js
├─ storage.js
├─ drone-routes.js
├─ game.js
├─ world.js
├─ world-runtime-phase5b.js
├─ world-runtime.js
├─ progression.js
│  ├─ progression-core.js
│  ├─ progression-phase4b.js
│  ├─ progression-phase5a.js
│  ├─ progression-phase5b.js
│  ├─ progression-phase5c.js
│  ├─ progression-phase6b.js
│  └─ progression-phase6c.js
├─ progression-ui.js
│  ├─ progression-ui-v4.js
│  ├─ automation-ui.js
│  └─ final-phase-ui.js
├─ exploration.js
│  ├─ exploration-core-v4.js
│  └─ exploration-core-v5.js
└─ exploration/
   ├─ residential.*
   ├─ industrial.*
   ├─ military.*
   └─ research.html / research.css / research-phase6b.js
```

Compatibility entrypoints `progression.js` / `exploration.js` / `progression-ui.js` を維持する。

`index.html` は `game.js` / `feature-pack.js` / `progression-ui.js` をproduction runtimeとして読み込む。`progression-ui.js` は既存Automation ConsoleとFinal Phase UIをside-effect layerとして読み込み、Rank / Research UIは `progression-ui-v4.js` を維持する。

Final Phaseでも `game.js` に専用物流 / 専用Power / 専用Production Simulationを追加しない。既存Generic Production / Drone / Generator / Directional Logistics Runtimeと、Phase 6-Cのderived analyzerへ接続する。

---

## 3. Save Contract

```text
localStorage key: elitemay-game-hub-v1
Root Save Schema: 1
Game Schema: 1
Progression Schema: 1
Exploration Schema: 1
Build Grid: 2.5m
```

Final PhaseでもSchema Version変更なし。

### Additive Research Area state

```text
areas.research.centralCore = {
  fabricationSetInstalled: boolean,
  stabilizerOnline: boolean,
  archiveRecovered: boolean,
  rewardClaimed: boolean
}
```

### Additive inventory

- `ai_control_module`
- `experimental_frame`
- `experimental_power_module`
- `autonomous_industrial_core`

既存Saveは不足keyをDefaultで補完する。

### Additive Final Chapter telemetry

```text
finalChapter = {
  version: 1,
  megaFactoryStableSeconds: number,
  megaFactoryBestSeconds: number,
  mainClearedAt: string | null,
  clearAcknowledgedAt: string | null
}
```

Final Automation completion専用のpersistent flagは保存しない。Topology / Power / product evidenceは現在のFactory stateから導出する。

一方、Mega Factoryの「一定時間連続稼働」は過去時間を持たないと再現できないため、**履歴として必要な連続秒数 / best / Main Clear時刻だけ**を保存する。Factory graphやPower snapshotを二重保存しない。

Main Clearは一度達成した歴史的Milestoneとして保持し、Clear後にFactoryを組み替えても取り消さない。

Final Phase UIは `game.js` が保持するlive runtime game objectを参照し、15秒bucket / interruption reset / clear時に追加保存する。Back/hidden中の時間は進行へ加算しない。

---

## 4. Rank / Research

`PLAYABLE_MAX_RANK = 7` 維持。

Rank 7以降はRank 8へ上げず、Final Chapter Objective / Research / Mega Factory Stabilityで進む。

### `experimental_fabrication`

```text
Rank: 7
Cost: Research Data 1
Blueprint: tri_lab_fabrication_blueprint
Unlock: building:fabricator
```

### `experimental_technology`

```text
Rank: 7
Cost: Research Data 4
Blueprint: central_core_experimental_blueprint
Unlocks:
- tier:experimental
- production:autonomous_core
- production:automated_components
- building:advanced_drone_port
- building:experimental_power_system
```

Phase 6-Bの既存 `completedResearch` 互換を維持する。旧Saveで `experimental_technology` 完了済みなら、Phase 6-C以降のbuilding gateにもResearch完了として扱う。

---

## 5. Production Recipe Families

Source: `production-recipes.js`

### Assembler family

Building types:
- `assembler`
- `assembler_plate`
- `assembler_motor`
- `assembler_circuit`

Recipes:

```text
assembler_control_unit
motor ×1 + circuit ×2 + plastic ×1
→ control_unit ×1 / 8 sec
```

```text
assembler_iron_plate
iron_ingot ×2
→ iron_plate ×1 / 4 sec
```

```text
assembler_motor
iron_ingot ×2 + copper_wire ×2
→ motor ×1 / 6 sec
```

```text
assembler_circuit
copper_wire ×2 + e_waste ×1 + plastic ×1
→ circuit ×1 / 6 sec
```

Assembler variants are internal recipe-state building types and are not separate direct-build entries.

### Fabricator family

Building types:
- `fabricator`
- `fabricator_core`

Experimental set:

```text
control_unit ×2
+ rare_alloy ×3
+ circuit ×2
+ iron_plate ×2
→ ai_control_module ×1
 + experimental_frame ×1
 + experimental_power_module ×1
/ 20 sec
```

Autonomous Core:

```text
ai_control_module ×1
+ experimental_frame ×1
+ experimental_power_module ×1
+ control_unit ×1
→ autonomous_industrial_core ×1
/ 30 sec
```

Final recipeは4 input type以内。

### Safe recipe switching

`assignProductionRecipe()`:

- 同一family内だけ切替可能
- required Researchを確認
- 新Recipeで受け付けないItemがInput Bufferに残る場合 `buffer-conflict` で拒否
- Output Bufferは保持
- Building ID / position / rotation等は保持
- `progress = 0`
- building `type` を対応variantへ変更

Automation Consoleからsave後reloadして、module-local runtime stateとの不一致を避ける。

---

## 6. Advanced Drone Contract

Source: `drone-routes.js`

Drone tier:
- `utility`
- `advanced`

Utility compatibility:

| Resource Point | Item | Cycle |
| --- | --- | ---: |
| residential-copper-network | copper_wire | 8s |
| industrial-electronics-cache | e_waste | 10s |
| military-alloy-cache | rare_alloy | 12s |

Advanced:

| Resource Point | Item | Cycle | Capacity/min |
| --- | --- | ---: | ---: |
| industrial-scrap-reserve | metal_scrap | 4s | 15 |
| residential-copper-network | copper_wire | 5s | 12 |
| residential-polymer-stockpile | plastic | 6s | 10 |
| industrial-electronics-cache | e_waste | 6s | 10 |
| military-alloy-cache | rare_alloy | 8s | 7.5 |

Advanced Drone Port:

```text
Rank: 7
Research: experimental_technology
Cost: $1450
Power Use: 95
```

`residential-polymer-stockpile` / `industrial-scrap-reserve` はAdvanced-only route。Utility Droneへ割り当てようとすると `tier-unavailable`。

既存Utility Drone compatibilityとRank 6→7 Military Alloy mandatoryを維持する。

---

## 7. Experimental Power System

Building:

```text
id: experimental_power_system
Rank: 7
Research: experimental_technology
Cost: $1900
Fuel: rare_alloy ×1
Fuel duration: 24 sec
Generation: 480 Power
```

既存 `power.js` Generator contractを再利用する。

Final Automationでは:
- Advanced Rare Alloy sourceからDirectional routeが存在
- Fuel systemがactive
- final production line上のPower consumerがpowered

を要求する。

---

## 8. Final Automation Analyzer

Source: `final-automation.js`

`analyzeFinalAutomation(game)` はpure derived analysisとして、現在のFactory graphを解析する。

Stage:

- `experimentalTechnology`
- `advancedScrap`
- `advancedCopper`
- `advancedPlastic`
- `advancedElectronics`
- `advancedAlloy`
- `metallurgy`
- `plateAutomation`
- `motorAutomation`
- `circuitAutomation`
- `controlAutomation`
- `experimentalSetAutomation`
- `autonomousCoreAutomation`
- `finalStorageRoute`
- `experimentalPowerRouted`
- `experimentalPowerActive`
- `poweredLine`
- `productProven`

### Route source of truth

全stageは既存 `findDirectionalRoutes()` を利用する。

新しいFinal専用Graph / cached completion routeは作らない。

### Candidate chaining

各中間Machine stageは:

```text
upstream candidate
→ directional route
→ target machine
→ next candidate
```

としてIDとroute throughputを引き継ぐ。

複数入力Recipeでは各required itemに対するrouteが成立したTargetだけcandidateになる。

### Throughput

Stage candidate throughputは:

```text
min(upstream throughput, route throughput)
```

で導出する。

### Power

Final line building IDsを `computePowerSnapshot()` と照合し、Power use > 0の設備がpoweredであることを要求する。

### Product evidence

`autonomous_industrial_core` が:
- Factory inventory
- building output buffer
- `discoveredItems`

のいずれかに存在した場合 `productProven`。

TopologyだけではPhase 6-C completion扱いにせず、実際に最終製品を1個以上生産したEvidenceを要求する。

### Completion state

`topologyReady`:
- final storage route
- experimental power route

`qualifies`:
- 全stage true

Completion flagはSaveしない。

---

## 9. Mega Factory Stability / Main Clear

Source:
- `final-phase.js`
- `final-phase-ui.js`

### Stability duration

Implementation target:

```text
MEGA_FACTORY_STABLE_SECONDS = 180
```

`REQUIREMENTS.md` は「一定時間」を要件としており、180秒は現在のGameplay実装値。Balance調整時はこの定数とRegressionを同時更新する。

### Stable-operation conditions

`analyzeMegaFactory(game)` は現在状態から次を毎回導出する。

- Phase 6-C `analyzeFinalAutomation(game).qualifies === true`
- Factory全体の `computePowerSnapshot(game).status === 'ok'`
- Final Storageが存在し、空き容量 > 0
- Final route throughput > 0

専用の `megaFactoryReady` / `powerStable` 等のcached flagは保存しない。

### Continuous timer

`advanceMegaFactoryStability()`:

- stable中だけ連続秒数を進める
- 1 tickで加算できるdeltaは最大1秒
- Background / hidden / boot中はUI runtime側で加算しない
- stable条件が1つでも崩れたらCurrent streakを0へ戻す
- `megaFactoryBestSeconds` はbest historyとして保持
- 180秒到達時に `mainClearedAt` を1回だけ記録

大きなFrame delay / Tab復帰 / offline時間を一括加算してClearしない。

### Main Clear

Main Clearは歴史的Milestone。

- Clear後にFactoryを組み替えても `mainClearedAt` を取り消さない
- Clear overlayを表示
- acknowledgement後も同じSaveで工場開発を継続
- Rankは7のまま
- Save Reset以外でMain Clear状態を失わない

### Final Phase UI

- Rank 7 HUDへMega Factory stable-run statusを表示
- Progression Final Chapter sectionへStep 9 → 10 progressを追加
- Automation ConsoleへMega Factory stability statusを追加
- Main Clear時にoverlayを表示
- Clear後はOptimization継続可能と表示

Final Phase UIは1秒pollingで更新し、self-triggering `MutationObserver` を使わない。

---

## 10. Research Facility / Central Core

Phase 6-B contract維持。

```text
Access Relay
→ Three Labs
→ Special Cargo 3 / 3 Factory secured
→ Factory Fabricator final components
→ Central Core Gate install
→ Core Stabilizer
→ Experimental Archive
→ Research Facility completed
→ Experimental Technology
```

Central Core component consumeはAtomic。

Research Facility completionはMain Clearではない。

---

## 11. Automation Console / Progression UI

Current UI entry:
- `progression-ui.js`
- `automation-ui.js`
- `progression-ui-v4.js`
- `final-phase-ui.js`

Production HTMLは `progression-ui.js` を読み込む。

Automation Console:
- Utility / Advanced Drone route assignment
- Assembler / Fabricator recipe selection
- Logistics Warehouse in-place upgrade
- Final Automation Contract status
- Mega Factory stability status

Route / Recipe changeはsave後reloadする。

Reason:
- current `game.js` runtime stateがmodule-local
- Saveだけを書き換えてplay続行すると後続autosaveでstale runtime stateが上書きする可能性がある

将来public runtime mutation APIを用意できればreload dependencyを外せる。

Rank 7 UIは:
- Rank-Up capを維持
- Final Automation progressを表示
- Step 9安定稼働の連続時間を表示
- Step 10 Main Clear後はOptimization継続を表示

---

## 12. Existing Systems Preserved

### Logistics

| Node | Throughput | Rule |
| --- | ---: | --- |
| Conveyor Mk.1 | 1.5/s | Forward |
| Conveyor Mk.2 | 3.0/s | Forward |
| Conveyor Mk.3 | 6.0/s | Forward |
| Splitter | 3.0/s | Round-robin |
| Merger | 3.0/s | 3 input → forward |
| Smart Sorter | 3.0/s | category lane |
| Priority | 6.0/s | forward priority |
| Overflow | 6.0/s | forward main / right overflow |

### Power
- Starter Grid 55
- Scrap Generator 80
- Industrial Generator 180
- Experimental Power System 480
- Battery 960 Energy

### Storage
- Small 120
- Industrial 600
- Logistics Warehouse 1800
- Back Pressure / no item loss維持

### Spatial / UX contract
- 2.5m Grid
- Factory coordinate system維持
- Quick Build 1〜5維持

---

## 13. Visual Layer

Visual direction: `Stylized Industrial Realism`。

Existing dedicated procedural visuals:
- Advanced Drone variants
- Experimental Power System
- Assembler recipe variants
- Autonomous Core Fabricator variant

Final Phase UIは既存Industrial UI languageへ合わせたHUD / progress / clear overlayの最小追加。

Final Hero Machine / Mega Factory startup visual、Hybrid Asset / Lighting / VFX / LODのfinal quality passは後続。

Visual variant is not simulation source of truth.

---

## 14. Validation

Canonical command:

```bash
npm run validate
```

Execution:

```text
scripts/validate.mjs
→ existing regressions through Phase 6-A
→ scripts/phase6b.test.mjs
→ scripts/phase6c.test.mjs
  → scripts/phase6c-bus.test.mjs
→ scripts/final-phase.test.mjs
```

Phase 6-C regression covers:

- Rank 7 cap unchanged
- Quick Build 1〜5 unchanged
- Autonomous Industrial Core item / recipe
- final recipe <=4 input types
- Experimental Technology new unlocks
- legacy completed Research compatibility
- Advanced Drone five resource availability
- Utility Drone blocked from Advanced-only Resource Point
- route switch keeps output and resets progress
- safe Assembler / Fabricator recipe switching
- incompatible input buffer rejection
- Exploration / Save Schema v1 preservation
- Experimental Power 480 / Rare Alloy fuel
- full final directional topology
- Advanced Drone → processing → Assembler → Fabricator → Storage chain
- Advanced Alloy → Experimental Power route
- Experimental Power active state
- final line powered state
- actual Autonomous Industrial Core production evidence
- current progression / UI / world runtime markers

Final Phase regression additionally covers:

- `MEGA_FACTORY_STABLE_SECONDS = 180`
- delayed frame deltaは最大1秒だけ加算
- representative Phase 6-C Main BusがMega Factory stable判定へ接続
- full Factory Power OK
- Final Storage空き容量条件
- Final route throughput条件
- 連続稼働30秒後のStorage満杯でCurrent streakを0へreset
- best streak保持
- 180秒連続安定稼働でMain Clear
- Main Clear timestamp exactly once
- Clear後のFactory変更でMain Clearを取り消さない
- acknowledgement idempotence
- Additive `finalChapter` default / Schema v1維持
- production HTMLが `progression-ui.js` を読み込む
- `progression-ui.js` が `final-phase-ui.js` を読み込む
- Final Phase UIにself-triggering MutationObserverを使わない

### Main-bus regression

Final E2E fixture uses actual logistics nodes rather than bypassing route logic:

```text
Advanced sources
→ Merger
→ Conveyor Mk.3 main bus
→ Splitter machine taps
→ machines
→ downstream Merger
→ main bus
→ final Storage
```

Production ruleを迂回せず、Final Phase testも同じbuildable topologyでMega Factory判定まで通す。

### CI evidence

Final Phase implementation before documentation:

```text
PR #19 head: 2f63912fc0c84b57c94b167ad4e99f262efb265b
Validate Web Game #141
project-contract: success
baseline: success
```

Documentation-inclusive final head / merge commit must be revalidated before完成扱いにする。

### Unverified by static CI

- real browser Pointer Lock / Pause flow
- Main Clear overlayのpointer-lock復帰
- Progression / Automation / Final HUD actual layout / overflow
- Route / Recipe reload interaction feel
- Advanced Drone / Experimental Power first-person scale
- Build Preview readability
- Mega Factory layout ergonomics
- collider / placement feel
- WebGL FPS / 150〜250 machine scale performance
- 180秒の実プレイBalance / pacing
- final automated line gameplay feel
- Firefox / Chromium real operation
- final Visual Review / Screenshot Review

## 2026-09-06 Home / Player Upgrade / Tutorial Runtime

### Home Contract

- 固定HomeはFactory北側・Factory建築範囲外に配置し、既存の2.5m Grid、Factory Layout、Directional Logisticsを変更しない。
- Bed / PC / Home Storage / Exploration Workbenchは固定設備で、Factory設備として建築・解体・Conveyor接続しない。
- New GameはHome Bed付近から開始する。既存SaveはMigration時にPlayer座標を保持し、Bed使用後だけHome Respawnを有効化する。
- Bed Manual Saveは既存Auto Saveを置換しない。

### Player Convenience State

既存Root/Game Save Schema v1を維持し、game.home.version=1を加算する。主な永続状態はPlayer Upgrade、Home Storage、Secure Case、Loadout Preset、Material Tracking、Tutorial Library既読/進行、Home Respawn登録である。

BackpackはSlot制を唯一の容量Contractとして維持する。Base 12 Slot、Backpack I=16、II=20、III=24。旧Saveに既存Backpack容量/Unlockがある場合は対応UpgradeへMigrationし、容量を減らさず再購入も要求しない。

PC Upgrade購入はRank/前提/Cash/素材を検証した後、まとめて消費してUnlockしSaveする。Factory Network Link取得前はBackpack+Home Storage、取得後のみFactory StorageをCost参照対象へ追加する。PC UpgradeはRank 1〜7のMain Progression条件にはしない。

Secure Caseは探索Session LootからPlayerが明示選択した通常Lootだけを保護する。Main Objective CargoとFinal系Itemは保護対象外。失敗時もCase内容は永続する。

### Tutorial / Diagnostics

Basic TutorialはHome Bed → 移動 → PC → Door → Scrap Yard → 回収 → Backpack → Factory Return → 手動販売 → Build → Hopper → Conveyor → Crusher → Seller接続 → crushed_metalの実自動販売で完了する。Scanner購入はTutorial必須条件ではない。既存SaveにはBasic Tutorialを強制しない。

Tutorial Objectives / Contextual Hints / Stuck Help / Next GoalはSettingsで個別制御できる。PC Tutorial LibraryとO Guideは同じTutorial定義を使用する。

DiagnosticsはMachine Input/Output、Directional Logistics、Power、Storage/Backpressure、Drone、Home/Player、Final Automation/Mega Factoryを既存Runtime stateから派生表示し、自動修正・自動建築は行わない。
