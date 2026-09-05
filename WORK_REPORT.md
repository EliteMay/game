# Work Report

Date: 2026-09-05

## Current Milestone

`Scrap Factory` は **Phase 6-A: Ruined Research Facility / Three Labs** まで実装。

通常GameplayのRank Upは **Rank 1 → 7** まで接続済み。Rank 7はMain ClearではなくFinal Chapter開始点。

```text
Rank 7
→ Ruined Research Facility
→ Central Access Relay
→ Robotics / Materials / Energy Lab
→ Special Cargo 3種
→ Factoryへ正常帰還
→ Central Coreは次Phase
```

Phase 6-AではCentral Core / Fabricator / Experimental Tier / Main Clearを実装済み扱いにしない。

---

## Implemented

### 1. Rank 7 Ruined Research Facility

Transport Terminalへ4番目の独立探索Areaを追加。

- Area ID: `research`
- Required Rank: 7
- Danger: 4
- Zones: Atrium / Robotics Lab / Materials Lab / Energy Lab / Central Core
- Scene: `exploration/research.html`

旧3探索エリアと同じSession / Normal Return / Abandon Contractを利用する。

### 2. Access Relay + Three Labs

Phase 6-A objective:

```text
Access Relay復旧
→ Robotics Lab
→ Materials Lab
→ Energy Lab
```

- Access Relayが3 Labの前提
- Relay後のLab順序は自由
- Lab recoveryはPersistent
- 3 Lab recoveryで`labsCompleted = true`
- Research Facility全体`completed`はfalseのまま
- Central Core interactionは`phase-locked`

### 3. Special Cargo

通常Itemと分離したProgression Cargoを追加。

- Robotics → `robotics-control-core` / AI制御コア試作機
- Materials → `materials-alloy-sample` / 実験合金サンプル
- Energy → `energy-cell-prototype` / 高密度Energy Cell試作機

状態:

```text
Lab recovered
→ persistent objective

Cargo carried
→ activeSession.researchCargo[]

Factory secured
→ areas.research.securedComponents[]
```

### 4. Failure / Recollection Contract

Abandon / HP 0:
- current normal Lootを失う
- current Special Cargoを失う
- Lab recovery / Zone discoveryは維持

そのため、失敗後は復旧済みLabから未確定Special CargoをGuaranteed recollectできる。

これによりFinal Chapter progression-critical cargoをRare drop周回やsoft-lockへ依存させない。

### 5. Normal Return

正常帰還:
- normal loot → 既存Transport Depot
- Special Cargo → `securedComponents[]`
- duplicate secureは拒否

Transport Terminalは3 Cargo確定後に:

```text
LABS SECURED
LAB PHASE COMPLETE / CENTRAL CORE LOCKED
```

と表示する。

Research Facility全体を`CLEARED`とは表示しない。

### 6. Dedicated 3D Scene

`research.js`にPhase 6-A専用Sceneを追加。

Layout:
- Central Atrium = Navigation Anchor
- West = Robotics Lab
- East = Materials Lab
- North = Energy Lab
- Far North = sealed Central Core

Environment identity:
- Robotics: cool technical blue / actuator equipment
- Materials: warm amber / process chamber
- Energy: violet-blue / energy column
- Central Core: cyan locked destination

### 7. Environmental Hazard

Research FacilityではCombat AIより先に、既存要件の環境危険を統合。

- Robotics: unstable actuator
- Materials: hot process chamber
- Energy: electrical arc field

HP 100を既存Military-style exploration contractと共有し、HP 0は`abandonExpedition()`へ接続する。

### 8. Exploration Compatibility Core v4

Created:
- `exploration-core-v4.js`

Updated compatibility entrypoint:
- `exploration.js`

Exploration Schemaは**1のまま**。

旧Save normalize:
- Research Area不存在 → default research state追加
- active sessionに`researchCargo`不存在 → `[]`
- Residential / Industrial / Military progress維持

---

## Compatibility / Contracts Preserved

- `elitemay-game-hub-v1`
- Root Save Schema 1
- Progression Schema 1
- Exploration Schema 1
- Existing Factory Layout
- 2.5m Build Grid
- Rank 1→7 progression
- Residential / Industrial / Military exploration progress
- Normal Loot → Transport Depot
- Abandon current-session-loss contract
- Directional Logistics
- Drone Route / Rank 6→7 Military Mandatory
- Power / Storage / Back Pressure
- Quick Build 1〜5
- GitHub Pages relative paths

Phase 6-Aで追加する保存DataはAdditiveで、既存Saveを消すMigrationは行わない。

---

## Regression Coverage

Added:
- `scripts/phase6a.test.mjs`

Coverage:
- Rank 6 lock / Rank 7 unlock
- legacy Exploration Schema v1 normalization
- old-area state preservation
- Access Relay dependency
- 3 Lab recovery
- `labsCompleted`
- whole-area `completed` remains false
- Central Core phase-lock
- Special Cargo carried state
- Abandon cargo loss
- Lab state persistence after failure
- lost cargo guaranteed recollection
- normal return secure 3 / 3
- duplicate secure prevention
- normal Loot still enters Transport Depot
- research HTML / CSS / JS integration markers
- compatibility entrypoint uses Core v4

`package.json`:

```text
npm run validate
= existing scripts/validate.mjs
+ scripts/phase6a.test.mjs
```

Existing Rank 1→7 / Logistics / Factory Management / Power / Storage / Residential / Industrial / Military / Phase 4-B / Phase 5-A / Phase 5-B / Phase 5-C regressionsも継続する。

---

## CI During Implementation

Implementation + Phase 6-A regression head:

```text
afca8945951866214df3940a6846e40dc9df0098
Validate Web Game #103
result: success
```

Transport Terminal Phase 6-A state integration head:

```text
77219f5685a5a6fdc175f080f55c22c51adb8cc3
Validate Web Game #104
result: success
```

Documentation同期後の最終Headで再度CIを確認してからMergeする。

---

## Not Yet Verified

Static CIでは次を保証しない。

- 実ブラウザPointer Lock / Pause復帰
- Atriumから各Labへの導線の分かりやすさ
- Lab環境HazardのDamage / Radius balance
- Central Core gateの一人称Visual readability
- Research Facility geometry / collider feel
- Desktop Chromium / Firefoxでの実際のWebGL FPS
- Transport Terminalの4 Area表示時の実Layout

これらはBrowser / User Validation対象。

---

## Remaining Work

### Phase 6-B候補

- Factoryで3 Special CargoをExperimental Componentへ加工する入口
- Fabricator
- Central Core攻略
- Experimental Research unlock

### Later Final Chapter

- AI Control Module
- Experimental Frame
- Experimental Power Module
- Advanced Drone
- Experimental Power System
- Autonomous Industrial Core完全自動Line
- Mega Factory stable operation
- Main Clear

Phase 6-AはFinal Chapterの探索入口をPlayableにした段階であり、Research Facility全体やMain Clearを完了した扱いにはしない。
