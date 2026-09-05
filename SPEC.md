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
```

現在は **Phase 6-B: Fabricator / Central Core / Experimental Technology**。

未実装:
- Advanced Drone
- Experimental Power System
- Autonomous Industrial Core complete production line
- Mega Factory stable-operation objective
- Main Clear
- final Hybrid Asset quality pass

---

## 2. Runtime Architecture

```text
Scrap Factory
├─ config.js
├─ final-chapter.js
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
│  └─ progression-phase6b.js
├─ progression-ui.js
│  ├─ progression-ui-v3.js
│  └─ phase5c-automation-ui.js
├─ exploration.js
│  ├─ exploration-core-v4.js
│  └─ exploration-core-v5.js
├─ exploration-ui.js
│  └─ exploration-ui-v2.js
└─ exploration/
   ├─ residential.*
   ├─ industrial.*
   ├─ military.*
   └─ research.html / research.css / research-phase6b.js
```

Compatibility entrypoints `progression.js` / `exploration.js` / `progression-ui.js` を維持する。

Phase 6-Bでも巨大な`game.js`へ新しいFabricator専用Simulationは追加しない。`config.js`のRecipe / Building定義を既存Generic Production Runtimeへ接続する。

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

Phase 6-BでもSchema Version変更なし。

### Additive Research Area state

```text
areas.research.centralCore = {
  fabricationSetInstalled: boolean,
  stabilizerOnline: boolean,
  archiveRecovered: boolean,
  rewardClaimed: boolean
}
```

Existing `areas.research.objective.centralCoreUnlocked` / `completed` と組み合わせる。

Normalize:
- Phase 6-A Saveに`centralCore`がない場合は全falseを補完
- `archiveRecovered=true`ならCore install / Stabilizer / Objective completionを整合させる
- Residential / Industrial / Military / Three-Lab stateを維持

### Final Component inventory

Default inventoryへAdditive key:
- `ai_control_module`
- `experimental_frame`
- `experimental_power_module`

既存Saveは0で補完。

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

Blueprint normal flow:
```text
Three Labs recovered
→ Special Cargo 3 / 3正常帰還
→ tri_lab_fabrication_blueprint
```

Legacy Phase 6-A compatibility:
- 既に`securedComponents` 3/3のSaveはBlueprint fieldがなくてもResearch gateを満たす
- Research完了時にBlueprintをProgressionへmaterializeする
- 再探索を要求しない

### `experimental_technology`

```text
Rank: 7
Cost: Research Data 4
Blueprint: central_core_experimental_blueprint
Unlocks:
- tier:experimental
- production:autonomous_core
```

Central Core Archive回収でBlueprint + Research Data 4を保証する。

Phase 6-Bではunlock markerだけを追加し、Autonomous Industrial Core Recipe / Advanced Drone / Experimental Powerを実装済みとは扱わない。

---

## 5. Fabricator

Building:

```text
id: fabricator
Rank: 7
Research: experimental_fabrication
Cost: $1250
Power Use: 110
Category: production
```

FabricatorはAssemblerの単純高速上位互換ではなくExperimental Tier専用Machine。

### Phase 6-B batch recipe

```text
fabricator_experimental_set

Input:
- control_unit ×2
- rare_alloy ×3
- circuit ×2
- iron_plate ×2

20.0 sec

Output:
- ai_control_module ×1
- experimental_frame ×1
- experimental_power_module ×1
```

Input種類は要件のFinal Tier原則4種類以内を満たす。

既存Generic Runtimeを再利用:
- Power
- Input Buffer
- Progress
- Output Buffer
- Directional Logistics
- Back Pressure先のStorage / logistics
- Save
- discoveredItems

Recipe変更UIはPhase 6-Bでは不要。現在FabricatorはこのExperimental batch専用。

---

## 6. Final Component Set Contract

Source: `final-chapter.js`

Final Component ID:
- `ai_control_module`
- `experimental_frame`
- `experimental_power_module`

Central Core install stockとして数える場所:
- Factory `inventory`
- Building `output` buffer

数えない場所:
- Machine `input` queue

理由:
- 他Recipeへ投入済みの予約素材をProgression側が横取りしない

### Atomic consume

`consumeFinalComponentSet(game)`:

```text
3種すべて1個以上存在確認
↓
不足 → no mutation
↓
揃っている → 各1個をInventory → Building Output順で消費
```

一部だけ消費してGate解放失敗する状態を作らない。

---

## 7. Research Facility / Central Core

Area ID: `research`
Required Rank: 7
Danger: 4

Zones:
- Central Atrium
- Robotics Lab
- Materials Lab
- Energy Lab
- Central Core

### Phase 6-B Main sequence

```text
Access Relay
→ Three Labs
→ Special Cargo 3 / 3 Factory secured
→ Factory Fabricator final components
→ Central Core Gate install
→ Core Stabilizer
→ Experimental Archive
→ Research Facility completed
```

### Central Gate prerequisites

1. `labsCompleted = true`
2. `securedComponents.length >= 3`
3. Final Component Set ready

成功時:
- Final ComponentsをAtomic consume
- `centralCore.fabricationSetInstalled = true`
- `objective.centralCoreUnlocked = true`

Repeat interaction:
- `done`
- componentsを二重消費しない

### Core Stabilizer

前提:
- Central Core unlocked
- fabrication set installed

成功:
- `centralCore.stabilizerOnline = true`
- Central Core environmental field停止

### Experimental Archive

前提:
- Stabilizer online

成功:
- `centralCore.archiveRecovered = true`
- `objective.completed = true`
- Research Facility `completedAt`
- `central_core_experimental_blueprint`
- Research Data +4
- reward idempotent

Research Facility completionは**Main Clearではない**。

---

## 8. Special Cargo Contract

Phase 6-A contract維持:

```text
Lab recovered
→ persistent objective

Cargo carried
→ activeSession.researchCargo[]

Factory secured
→ areas.research.securedComponents[]
```

Abandon / HP 0:
- normal Loot loss
- current Special Cargo loss
- Lab recovery persists
- lost cargo can be guaranteed-recollected

Normal Return:
- normal Loot → Transport Depot
- Special Cargo → securedComponents
- 3/3到達時Fabrication Blueprintを保証

---

## 9. Research Facility Browser Runtime

Current runtime:
- `exploration/research-phase6b.js`

Scene layout:
- Atrium / Access Relay
- west Robotics
- east Materials
- north Energy
- far north Central Core

Environmental hazards:
- Robotics actuator
- Materials heat
- Energy electrical field
- Central Core unstable field until Stabilizer

HP:
- baseline 100
- HP 0 → `abandonExpedition()`

Persistent stateとVisual stateを同じObjective / Central stateから反映する。

Static CIでは実際のCollider / distance / Pointer Lock / threat feelは保証しない。

---

## 10. Transport Terminal / Progression UI

Transport Terminal Research Facility status:
- Labs recovered but cargo未確定 → `CARGO RETURN REQUIRED`
- Cargo 3/3 → `FABRICATION REQUIRED`
- 3 Final Components ready → `CORE ACCESS READY`
- Core opened → `CORE OPEN`
- Stabilizer → `CORE STABLE`
- completed → `CLEARED`

Rank 7 Progression UI:
- Rank 7をRank-Up capとして表示
- Main Clearではない旨を表示
- Three Labs → Fabricator → Central Core → Experimental Technologyを案内
- Research listは`RESEARCH`定義から自動表示

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

### Drone
- Residential Copper: 8s
- Industrial E-Waste: 10s
- Military Rare Alloy: 12s

Rank 6→7 Mandatory still requires Military Alloy Drone route.

### Power
- Starter Grid 55
- Scrap Generator 80
- Industrial Generator 180
- Battery 960 Energy
- Fabricator consumes 110

### Storage
- Small 120
- Industrial 600
- Logistics Warehouse 1800
- Back Pressure / no item loss維持

### Spatial
- 2.5m Grid
- Factory coordinate system維持
- Quick Build 1〜5維持

---

## 12. Visual Layer

Visual direction: `Stylized Industrial Realism`。

Fabricator dedicated silhouette:
- heavy experimental base
- central fabrication chamber
- twin field coils
- energy rings
- front control panel
- status light

Generic production box fallbackではなくRank 7 rewardとして識別可能にする。

Simulation source of truthにはしない。

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
```

Phase 6-B regression covers:
- Rank 7 cap unchanged
- Quick Build 1〜5
- Fabricator config / 110 Power / Research gate
- final recipe <=4 input types
- exact 3 output component IDs
- Exploration Schema v1
- Phase 6-A state normalization
- current / legacy 3/3 Cargo Fabrication gate
- Fabrication Research unlock
- input queue excluded from Final Component stock
- atomic component consume
- Central needs cargo / needs components
- Central install idempotence
- Stabilizer dependency
- Archive dependency
- Research Facility completion
- Central reward +4 exactly once
- Experimental Technology Research
- current exploration/progression entrypoint markers
- current Research Facility runtime

Existing regressions continue to cover Rank 1→7, Directional Logistics, Factory Management, Power, Storage, Residential, Industrial, Military, Drone, Phase 4-B, Phase 5-A/B/C, Phase 6-A.

### Unverified by static CI

- real browser Pointer Lock / Pause flow
- Three-Lab / Central Core actual reachability
- Central Gate and Fabricator collider / first-person scale
- Fabricator Build Preview readability
- Central Hazard balance
- Transport / Progression panel actual layout
- WebGL FPS
