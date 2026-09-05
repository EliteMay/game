# Specification

Updated: 2026-09-05

この文書は現在実装されている `Scrap Factory` の技術仕様を記録する。将来要件は `REQUIREMENTS.md` をSource of Truthとし、未実装要件を実装済みとして扱わない。

## 1. Current Playable Scope

通常Gameplayは **Rank 1 → 7** まで接続済み。Rank 7はMain ClearではなくFinal Chapter開始点。

```text
Factory / Scrap Yard
→ Residential / Rank 4 Logistics & Power
→ Abandoned Factory / Advanced Assembly
→ Military Facility / Drone Control
→ Rank 6 Advanced Logistics / Drone Routes / Industrial Power & Storage
→ Rank 7
→ Ruined Research Facility
→ Access Relay
→ Robotics / Materials / Energy Lab
→ Special Cargo normal return
```

現在は **Phase 6-A: Ruined Research Facility / Three Labs**。

Phase 6-A実装済み:
- Rank 7 Research Facility Transport Terminal entry
- Central Atrium / Access Relay
- Robotics Lab
- Materials Lab
- Energy Lab
- 3種類のSpecial Cargo
- Lab別environment hazard
- Lab recoveryの永続化
- failed expedition後のSpecial Cargo再回収
- normal returnでFactory側へCargo確定
- Phase 6-A専用3D Scene / UI

未実装:
- Central Core攻略
- Fabricator
- Experimental Research / Experimental Power
- AI Control Module / Experimental Frame / Experimental Power Module recipe
- Advanced Drone
- Autonomous Industrial Core
- Mega Factory / Main Clear

---

## 2. Runtime Architecture

```text
Scrap Factory
├─ config.js
├─ logistics.js
├─ power.js
├─ storage-capacity.js
├─ storage.js
├─ drone-routes.js
├─ game.js
├─ world.js
├─ world-runtime-phase5b.js
├─ world-runtime.js
├─ factory-management.js
├─ feature-pack.js
├─ progression.js
│  ├─ progression-core.js
│  ├─ progression-phase4b.js
│  ├─ progression-phase5a.js
│  ├─ progression-phase5b.js
│  └─ progression-phase5c.js
├─ progression-ui.js
│  └─ phase5c-automation-ui.js
├─ exploration.js                 # compatibility entrypoint
│  └─ exploration-core-v4.js      # Rank 1-7 exploration state
├─ exploration-ui.js
│  └─ exploration-ui-v2.js        # Transport Terminal
└─ exploration/
   ├─ residential.*
   ├─ industrial.*
   ├─ military.*
   └─ research.html / research.css / research.js
```

`exploration.js`のImport pathは維持し、内部Coreだけv4へ更新する。

Phase 6-AはFactory `game.js`へFinal Chapter専用Simulationを増やさず、探索SceneとExploration stateへ閉じ込める。

---

## 3. Save / Compatibility Contract

```text
localStorage key: elitemay-game-hub-v1
Root Save Schema: 1
Progression Schema: 1
Exploration Schema: 1
Build Grid: 2.5m
```

Phase 6-AでもSchema番号は変更しない。

Phase 6-A additive exploration state:

```text
exploration.areas.research
exploration.areas.research.objective.accessRelayOnline
exploration.areas.research.objective.roboticsRecovered
exploration.areas.research.objective.materialsRecovered
exploration.areas.research.objective.energyRecovered
exploration.areas.research.objective.labsCompleted
exploration.areas.research.objective.shortcutOpened
exploration.areas.research.objective.centralCoreUnlocked
exploration.areas.research.objective.completed
exploration.areas.research.securedComponents[]
exploration.activeSession.researchCargo[]
```

Legacy Save normalize:
- Research Areaが無い → default research state追加
- `researchCargo`が無いactive session → `[]`
- Residential / Industrial / Military stateは既存値を維持
- unknown research component IDは除外

`centralCoreUnlocked` / Research Facility `completed` はPhase 6-Aでは常に進行でtrueにしない。

既存Phase 5-C additive field:
- Drone Port `resourcePointId`

保存しないDerived Data:
- Directional route graph / throughput / priority
- Power snapshot
- Factory diagnostics
- Resource Point performance metadata
- Lab UI表示状態

---

## 4. Research Facility State Contract

Area ID:

```text
research
```

Unlock:
- Progression Rank 7

Zones:
1. `atrium`
2. `robotics_lab`
3. `materials_lab`
4. `energy_lab`
5. `central_core`

Main Phase 6-A flow:

```text
Access Relay
→ Robotics / Materials / Energy Lab（任意順）
→ 各LabのSpecial Cargo回収
→ Normal Return
→ securedComponents 3 / 3
```

Lab dependency:
- Access Relay前は3 Lab recovery不可
- 3 LabはRelay後なら任意順
- 全Lab recovery → `labsCompleted = true`
- Central Core interaction → `phase-locked`
- Lab phase完了だけではArea `completed = false`

Optional Service Lift:
- 3 Lab recovery後に開通可能
- Phase 6-AではPersistent shortcut stateだけ保存

---

## 5. Special Cargo Contract

Special Cargoは通常`ITEMS` / Backpack itemではなく、Final ChapterのProgression Cargoとして独立管理する。

| Lab | Cargo ID | Display Name |
| --- | --- | --- |
| Robotics | `robotics-control-core` | AI制御コア試作機 |
| Materials | `materials-alloy-sample` | 実験合金サンプル |
| Energy | `energy-cell-prototype` | 高密度Energy Cell試作機 |

状態を3段階に分ける:

```text
Lab recovered
→ persistent objective flag

Cargo carried
→ activeSession.researchCargo[]

Factory secured
→ areas.research.securedComponents[]
```

Failure:
- Abandon / HP 0で`researchCargo`は失う
- Lab recoveryは失わない
- 復旧済みLabから未確定Cargoを次回Guaranteed recollect可能

Normal Return:
- normal loot → existing Transport Depot
- new Special Cargo → `securedComponents[]`
- duplicate secureは拒否

この分離により「失敗でLab攻略まで巻き戻す」と「Cargo消失で進行不能になる」の両方を避ける。

---

## 6. Research Facility Runtime / Hazard

Browser runtime: `exploration/research.js`

Scene:
- Central AtriumをNavigation anchorにする
- West = Robotics Lab
- East = Materials Lab
- North = Energy Lab
- Far North = sealed Central Core

Hazard:
- Robotics: unstable actuator zone
- Materials: hot process chamber
- Energy: electrical arc field

Shared exploration contract:
- HP baseline 100
- HP 0 → `abandonExpedition()`
- Abandon / HP 0 → current normal loot + unreturned Special Cargo loss
- discovered zones / Lab recoveryは保持
- player/session state autosave
- normal return pointへ到達して初めてCargo確定

Phase 6-AではCombat AIは追加しない。Research Facilityは既存の探索・電源・環境Hazard統合を先にPlayableにする。

---

## 7. Transport Terminal

`exploration-ui-v2.js`は`EXPLORATION_AREAS`から4エリアを表示する。

Research Facility:
- Rank 7未満 → LOCKED
- active session → SESSION ACTIVE
- 3 Lab + Special Cargo 3/3 secured → `LABS SECURED`
- whole-area `completed`はfalseのため`CLEARED`とは表示しない

Phase 6-A完了表示:

```text
LAB PHASE COMPLETE / CENTRAL CORE LOCKED
Special Cargo 3 / 3 / Central Coreは次Phase
```

---

## 8. Existing Rank 1-6 Systems Preserved

### Directional Logistics

| Node | Throughput | Rule |
| --- | ---: | --- |
| Conveyor Mk.1 | 1.5/s | Forward |
| Conveyor Mk.2 | 3.0/s | Forward |
| Conveyor Mk.3 | 6.0/s | Forward |
| Splitter | 3.0/s | Forward / Left / Right Round-robin |
| Merger | 3.0/s | Rear / Left / Right → Forward |
| Smart Sorter | 3.0/s | category fixed lane |
| Priority Splitter | 6.0/s | Forward Priority / backup |
| Overflow Splitter | 6.0/s | Forward Main / Right Overflow |

### Drone Routes

| Area | Output | Cycle |
| --- | --- | ---: |
| Residential | Copper Wire | 8s |
| Industrial | E-Waste | 10s |
| Military | Rare Alloy | 12s |

Rank 6→7 MandatoryはMilitary Alloy assigned Drone Portを引き続き要求する。

### Power
- Starter Grid 55
- Scrap Generator 80
- Industrial Generator 180
- Battery 960 Energy

### Storage
- Small Storage 120
- Industrial Storage 600
- Logistics Warehouse 1800
- Back Pressure / no item loss維持

---

## 9. Visual Layer

Factory visual directionは引き続き`Stylized Industrial Realism`。

Research Facilityは人工照明主体のFinal Chapter Scene:
- cool cyan/steel Atrium
- Robotics = cool technical blue
- Materials = warm amber process equipment
- Energy = violet/blue energy equipment
- Central Coreは遠方のlocked destinationとして見せる

Procedural visualでGameplay readabilityを優先しており、Final Hybrid Asset quality passではない。

---

## 10. Validation

`npm run validate`

`package.json`のvalidateは:

```text
existing scripts/validate.mjs
+
scripts/phase6a.test.mjs
```

Phase 6-A regression:
- Rank 6 research facility locked
- Rank 7 unlock
- Exploration Schema v1 legacy normalization
- old area state preservation
- Access Relay dependency
- 3 Lab recovery
- `labsCompleted` true
- whole Research Facility `completed` false
- Central Core phase-lock
- Special Cargo collection
- Abandon loss
- Lab state persistence after failure
- guaranteed cargo recollection
- normal return secure
- duplicate secure prevention
- normal loot Transport Depot preservation
- Research HTML / CSS / JS integration markers
- exploration compatibility entrypoint → v4

Existing validator continues:
- JS/MJS syntax
- JSON parse
- local HTML refs for existing scenes
- Rank 1→7 progression
- Directional Logistics
- Factory Management
- Power / Storage
- Residential / Industrial / Military
- Phase 4-B / Phase 5-A / 5-B / 5-C

Static CIで保証しない:
- Research Facility Pointer Lock / pause feel
- first-person navigation readability
- Hazard damage balance
- Lab / Central Core visual scale
- collider / route feel
- WebGL FPS
