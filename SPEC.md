# Specification

Updated: 2026-09-05

この文書は現在実装されている `Scrap Factory` の技術仕様を記録する。将来要件は `REQUIREMENTS.md` をSource of Truthとし、未実装要件を実装済みとして扱わない。

## 1. Current Playable Scope

通常Gameplayは **Rank 1 → 7** まで接続済み。Rank 7はMain ClearではなくFinal Chapter開始点。

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
```

現在は **Phase 6-C: Final Automation / Autonomous Industrial Core**。

`REQUIREMENTS.md` の Rank 7 → Main Clear 手順8まで実装済み。

未実装:
- Mega Factory stable-operation objective
- Main Clear
- clear-after optimization objectives
- final Hybrid Asset / Lighting / VFX / LOD quality pass

---

## 2. Runtime Architecture

```text
Scrap Factory
├─ config.js
├─ final-chapter.js
├─ final-automation.js
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
│  └─ automation-ui.js
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

Phase 6-Cでも `game.js` にAdvanced Drone / Fabricator / Experimental Power専用Simulationを増やさず、既存Generic Production / Drone / Generator / Directional Logistics Runtimeへ接続する。

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

Phase 6-CでもSchema Version変更なし。

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

既存Saveは不足keyを0で補完する。

Final Automation completion専用のpersistent flagは保存しない。Topology / Power / product evidenceは現在のFactory stateから導出する。

---

## 4. Rank / Research

`PLAYABLE_MAX_RANK = 7` 維持。

Rank 7以降はRank 8へ上げず、Final Chapter Objective / Researchで進む。

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

Phase 6-Bの既存 `completedResearch` 互換を維持する。旧Saveで `experimental_technology` 完了済みなら、新しいPhase 6-C building gateにもResearch完了として扱う。

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

## 9. Research Facility / Central Core

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

## 10. Automation Console / Progression UI

Current UI entry:
- `automation-ui.js`
- `progression-ui-v4.js`

Automation Console:
- Utility / Advanced Drone route assignment
- Assembler / Fabricator recipe selection
- Logistics Warehouse in-place upgrade
- Final Automation Contract status

Route / Recipe changeはsave後reloadする。

Reason:
- current `game.js` runtime stateがmodule-local
- Saveだけを書き換えてplay続行すると後続autosaveでstale runtime stateが上書きする可能性がある

将来public runtime mutation APIを用意できればreload dependencyを外せる。

Rank 7 UIは:
- Rank-Up capを維持
- Main Clear未達を明示
- Final Automation progressを表示
- Mega Factory / Main Clearを後続Objectiveとして扱う

---

## 11. Existing Systems Preserved

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

## 12. Visual Layer

Visual direction: `Stylized Industrial Realism`。

Phase 6-C dedicated procedural visuals:
- Advanced Drone variants
- Experimental Power System
- Assembler recipe variants
- Autonomous Core Fabricator variant

Visual variant is not simulation source of truth.

Existing Phase 5-B / 5-C / 6-B visual runtime remains compatibility base where applicable.

---

## 13. Validation

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

This fixture was chosen after free-form auto-routing test setup became order-sensitive. The production rule was not weakened; the regression fixture was changed to an explicit, buildable topology.

### CI evidence

Final implementation head before documentation:

```text
1e3a2bae14c1f9861b25e7d14c88190f486faa3a
Validate Web Game #135
result: success
```

Documentation-inclusive final head must be revalidated before merge.

### Unverified by static CI

- real browser Pointer Lock / Pause flow
- Automation Console actual layout / overflow
- Route / Recipe reload interaction feel
- Advanced Drone / Experimental Power first-person scale
- Build Preview readability
- final factory layout ergonomics
- collider / placement feel
- WebGL FPS
- final automated line gameplay balance
- Firefox / Chromium real operation
