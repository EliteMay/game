# Work Report

Date: 2026-09-05

## Current Milestone

`Scrap Factory` は **Phase 6-B: Fabricator / Central Core / Experimental Technology** まで実装。

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

Phase 6-Bで5〜7を実装。

8〜10は未実装のまま残す。

---

## Implemented

### 1. Final Chapter Component Core

Created:
- `games/scrap-factory/final-chapter.js`

Final Component IDs:
- `ai_control_module`
- `experimental_frame`
- `experimental_power_module`

Factory stock判定:
- inventory
- building output buffer

除外:
- building input buffer

Central Core用部品をMachine input queueから横取りしない。

### 2. Phase 6-B Progression Layer

Created:
- `progression-phase6b.js`

Updated:
- `progression.js`

Research:

#### `experimental_fabrication`
- Rank 7
- Research Data 1
- Tri-Lab cargo由来Blueprint
- Fabricator解放

#### `experimental_technology`
- Rank 7
- Research Data 4
- Central Core Blueprint必須
- Final Experimental Tier入口

`PLAYABLE_MAX_RANK = 7`は変更していない。

### 3. Phase 6-A Save Compatibility

Normal flow:

```text
Special Cargo 3 / 3 normal return
→ tri_lab_fabrication_blueprint
```

Phase 6-Aですでに3/3 securedのSave:
- 新Blueprint fieldがなくても`experimental_fabrication`をResearch可能
- Research完了時にBlueprintをProgressionへ追加
- Three Labs再攻略不要

### 4. Fabricator

Added Building:

```text
id: fabricator
Rank: 7
Cost: $1250
Power: 110
Research: experimental_fabrication
```

Recipe:

```text
control_unit ×2
rare_alloy ×3
circuit ×2
iron_plate ×2
↓ 20 sec
ai_control_module ×1
experimental_frame ×1
experimental_power_module ×1
```

4 input typeでFinal Tier要件内。

既存`game.js` Generic Production Runtimeをそのまま利用するため、Fabricator専用Simulationは追加していない。

### 5. Dedicated Fabricator Visual

Updated:
- `world-runtime.js`

Silhouette:
- heavy base
- fabrication chamber
- twin field coils
- energy rings
- front console
- status light

Generic fallback boxではなくRank 7設備として識別可能にした。

### 6. Exploration Core v5

Created:
- `exploration-core-v5.js`

Updated:
- `exploration.js`

Additive state:

```text
areas.research.centralCore
├─ fabricationSetInstalled
├─ stabilizerOnline
├─ archiveRecovered
└─ rewardClaimed
```

Exploration Schemaは1のまま。

### 7. Atomic Central Core Install

Central Gate前提:
- Three Labs complete
- Special Cargo 3 / 3 Factory secured
- Final Component 3種が各1個以上

Component consume:
- 全3種存在確認後だけ実行
- 各1個消費
- 不足なら無変更
- Repeat interactionで二重消費しない

### 8. Central Core Objective

```text
Final Component Set Install
→ Central Core Open
→ Core Stabilizer
→ Experimental Archive
```

Archive reward:
- `central_core_experimental_blueprint`
- Research Data +4
- Research Facility `objective.completed = true`
- reward idempotent

Research Facility completionはMain Clearではない。

### 9. Research Facility Phase 6-B Runtime

Created:
- `exploration/research-phase6b.js`

Updated:
- `exploration/research.html`

Added:
- Central Core component gate
- Core Stabilizer console
- Experimental Archive terminal
- Central Core unstable hazard before Stabilizer
- Phase 6-B objective HUD
- Factory Fabrication不足表示
- current progress prompts

Existing:
- Access Relay
- Three Labs
- Special Cargo
- normal return
- HP / Abandon contract

を維持。

### 10. Transport / Progression UI

Updated Transport Terminal:
- CARGO RETURN REQUIRED
- FABRICATION REQUIRED
- CORE ACCESS READY
- CORE OPEN
- CORE STABLE
- CLEARED

Created:
- `progression-ui-v3.js`

Rank 7 cap panelをFinal Chapter内容へ更新。

旧「次PhaseでMilitaryを実装」のstale textを削除。

---

## Compatibility / Contracts Preserved

- `elitemay-game-hub-v1`
- Root Save Schema 1
- Game Schema 1
- Progression Schema 1
- Exploration Schema 1
- Rank 1→7
- Phase 6-A Three-Lab state
- Existing Factory Layout
- 2.5m Grid
- Factory coordinate system
- Directional Logistics
- Storage Back Pressure
- Drone routing
- Rank 6→7 Military Alloy mandatory
- Quick Build 1〜5
- GitHub Pages relative paths

---

## Regression Coverage

Added:
- `scripts/phase6b.test.mjs`

Updated:
- `scripts/phase6a.test.mjs`
- `package.json`

`npm run validate` runs:

```text
existing scripts/validate.mjs
&&
scripts/phase6b.test.mjs
```

Phase 6-B checks:
- Rank 7 cap unchanged
- Quick Build 1〜5
- Fabricator config
- final recipe 4-input limit
- exact three component outputs
- Exploration Schema v1
- Phase 6-A save normalization
- fresh 3/3 cargo Blueprint grant
- legacy 3/3 cargo compatibility
- Fabricator Research gate
- final part stock ignores Machine inputs
- atomic component consume
- Central needs-cargo / needs-components gates
- Central install idempotence
- Stabilizer dependency
- Archive dependency
- Central reward idempotence
- Experimental Technology availability / completion
- current runtime / entrypoint markers

Existing tests through Phase 6-A continue to run first.

---

## CI Evidence During Implementation

Core implementation head:

```text
410e883f43238ddcfc32735f6133786ce6d47e85
Validate Web Game #113
result: success
```

UI / current Research objective synchronization head:

```text
483c99061116764a20382261c7c4a859be1c0dc3
Validate Web Game #117
result: success
```

Completion uses a later documentation-inclusive final head and its CI rather than these intermediate runs.

---

## Reusable Learning

### Preserve requirements order with separate technology gates

Final Chapterでは次を1つのResearchへ潰さない。

```text
Three-Lab knowledge
→ Fabricator unlock
→ Factory manufactured parts
→ Central Core
→ post-Core Experimental Technology
```

Central Core ResearchでFabricatorを解放すると、要件の「Factoryで最終部品を製造してからCentral Core攻略」の順序を逆転させる。

そのため:
- Pre-Core = `experimental_fabrication`
- Post-Core = `experimental_technology`

に分離した。

### Progression-critical manufactured parts are consumed atomically

複数部品が必要な永続Gateでは:

```text
all present?
→ no: no mutation
→ yes: consume all + unlock persistent objective
```

とし、一部だけ消費された中間失敗状態を作らない。

### Do not count Machine input queues as general Factory stock

Machine inputは別工程へ予約済みのItemとして扱う。
Progression Gateはinventory + outputだけを対象にし、Input queueを横取りしない。

---

## Not Yet Verified

Static CIでは次を保証しない。

- Research Facilityの実ブラウザNavigation
- Central Core Gate / Stabilizer / Archiveへの実到達性
- Central Core collider / door visual alignment
- Central hazard radius / damage feel
- Fabricator build preview / first-person scale
- Fabricator field coil visual animation
- Pointer Lock / Pause復帰
- Transport Terminal / Progression panel layout
- WebGL FPS
- Firefox / Chromiumでの実操作

Browser / User Validation対象として残す。

---

## Remaining Work

Requirements上の次段階:

### Phase 6-C候補
- Advanced Drone
- Experimental Power System
- Autonomous Industrial Core Recipe / Production
- Final product完全自動Line

### Final Phase
- Mega Factory stable operation objective
- Main Clear
- clear後Optimization
- final Hybrid Asset / Lighting / VFX / LOD quality pass

Phase 6-Bではこれらを実装済み扱いにしない。
