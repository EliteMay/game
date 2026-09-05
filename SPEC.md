# Specification

Updated: 2026-09-05

この文書は現在実装されている `Scrap Factory` の技術仕様を記録する。将来要件は `REQUIREMENTS.md` をSource of Truthとし、未実装要件を実装済みとして扱わない。

## 1. Current Playable Scope

通常Gameplayは **Rank 1 → 7** まで接続済み。

```text
Factory / Scrap Yard
→ Rank 1-3 Production
→ Residential Exploration
→ Rank 4 Logistics / Power
→ Abandoned Factory / Advanced Assembly
→ Smart Sorting / Factory Diagnostics
→ Rank 6
→ Military Facility / Drone Control
→ Drone Port automated recovery
→ Conveyor Mk.3 / Priority / Overflow Logistics
→ Rank 7
```

現在は **Phase 5-B: Priority / Overflow Logistics**。

実装済みPhase 5要素:

- Rank 6 Military Facility
- Expedition HP / Security Turret threat
- guaranteed Drone Control Blueprint
- `military-alloy-cache`
- `rare_alloy`
- Drone Control Research
- Drone Port
- Rank 6 → 7 progression
- Conveyor Mk.3
- Priority Splitter
- Overflow Splitter
- dedicated Phase 5 logistics visuals

後続Phase:

- configurable multiple Drone routes
- Drone assignment UI
- Advanced / Industrial Generator
- Logistics Warehouse / in-place storage upgrade
- full weapon / patrol AI
- ruined research facility / Fabricator / Advanced Drone
- Final Hybrid Asset quality pass

---

## 2. Runtime Architecture

```text
Scrap Factory
├─ config.js
├─ logistics.js
├─ power.js
├─ storage-capacity.js
├─ storage.js
├─ game.js
├─ world.js
├─ world-runtime.js
├─ factory-management.js
│  └─ phase4b-management-ui.js
├─ feature-pack.js
├─ progression.js
│  ├─ progression-core.js
│  ├─ progression-phase4b.js
│  ├─ progression-phase5a.js
│  └─ progression-phase5b.js
├─ progression-ui.js
├─ exploration.js
│  └─ exploration-core-v3.js
└─ exploration-ui.js

Independent Exploration Scenes
├─ residential.html / .css / .js
├─ industrial.html / .css / .js
└─ military.html / .css / .js
```

Compatibility entrypoint `progression.js` / `exploration.js` は既存Import pathを維持する。

`world-runtime.js` はVisual Layerであり、Save / Production / LogisticsのSource of Truthにはしない。

---

## 3. Save Contract

```text
localStorage key: elitemay-game-hub-v1
Root Save Schema: 1
Progression Schema: 1
Exploration Schema: 1
```

Phase 5-BでもSchema変更なし。

Phase 5-Bで追加したLogistics Priorityは現在のRoute topologyから毎回導出し、Saveしない。

保存しないDerived Data:

- Directional route graph
- route throughput
- route priority
- Power snapshot
- Factory diagnostics
- Rank topology result
- Drone Port → Storage route result

既存Factory Layout / Building buffers / `logisticsCursor` は維持する。

---

## 4. Spatial / Compatibility Contract

- Build Grid: `2.5m`
- Factory座標系維持
- Existing LayoutをMigrationで削除しない
- Visual Logistics direction = Runtime direction
- Quick Build 1〜5順序を維持
- GitHub Pages Relative Path対応

---

## 5. Directional Logistics

Source of Truth: `logistics.js`

| Node | Throughput | Input | Output / Rule |
| --- | ---: | --- | --- |
| Conveyor Mk.1 | 1.5/s | basic | Forward |
| Conveyor Mk.2 | 3.0/s | basic | Forward |
| Conveyor Mk.3 | 6.0/s | basic | Forward |
| Splitter | 3.0/s | Rear | Forward / Left / Right Round-robin |
| Merger | 3.0/s | Rear / Left / Right | Forward |
| Smart Sorter | 3.0/s | Rear | Item categoryで1方向 |
| Priority Splitter | 6.0/s | Rear | Forward Priority / Left+Right Backup |
| Overflow Splitter | 6.0/s | Rear | Forward Main / Right Overflow |

### Smart Sorter

```text
advanced            → Forward
processed / product → Left
raw                 → Right
```

### Route Priority

Route探索時、各Branchは`priority`値を持つ。

- 通常Conveyor / Splitter / Merger / Smart Sorter: `0`
- Priority Splitter Forward: `0`
- Priority Splitter Left / Right: `+1`
- Overflow Splitter Forward: `0`
- Overflow Splitter Right: `+2`

複数Routerを通る場合はRoute上でPriority costを加算する。

`selectDirectionalRoute()` は:

1. 現在受入可能なRouteだけを対象にする
2. 最小PriorityのRoute群だけを選ぶ
3. 同Priority内は既存`logisticsCursor`でRound-robinする

これにより既存Splitterは従来挙動を維持する。

### Overflow Back Pressure Contract

Storage Full等でMain Targetが`canReceiveItem()`を満たさなくなると、そのRouteは候補から外れる。

```text
Production
→ Overflow Splitter
├─ Forward → Storage
└─ Right   → Seller
```

Storage受入可能中はForwardだけを使用し、満杯時のみSeller Routeが選ばれる。

Source OutputはTarget受入確認後のみ減らすため、Item lossを発生させない。

### Throughput

Route throughputは経路上の最小Logistics throughput。

例:

- Mk.3のみのRoute: `6.0/s`
- Mk.3 + Mk.2混在: `3.0/s`
- Mk.3 + Mk.1混在: `1.5/s`

---

## 6. Building Unlocks

Phase 5-B:

```text
conveyor_mk3      → Rank 6
priority_splitter → Rank 6
overflow_splitter → Rank 6
```

追加Researchは要求しない。

`progression-phase5b.js` がPhase 5-AのProgressionを包み、既存Rank / Drone Research Gateを維持したまま新Building Gateだけを追加する。

`PLAYABLE_MAX_RANK = 7` は維持。

---

## 7. Power

PowerはRank 4から有効。

| Device | Power |
| --- | ---: |
| Starter Grid | 55 supply |
| Scrap Generator | 80 supply |
| Crusher | 18 use |
| Smelter | 30 use |
| Assembler | 50 use |
| Drone Port | 65 use |

Battery: 960 Energy / charge 60 / discharge 80。

通常Conveyor / Splitter / Priority / Overflowは電力不要。

Advanced / Industrial Generatorは未実装。

---

## 8. Storage / Back Pressure

- Small Storage: 120
- Industrial Storage: 600
- Full Targetへ新Itemを移送しない
- Target受入確認後のみSource Outputを減らす
- Legacy over-capacity stateの既存Itemを削除しない
- Priority / Overflow Routeも同じBack Pressure helperを利用する

---

## 9. Production / Drone Automation

Existing:

```text
Metal Scrap → Crusher / 2.2s → Crushed Metal
Crushed Metal → Smelter / 3.0s → Iron Ingot
Motor + Circuit + Plastic → Assembler / 8.0s → Control Unit
```

Drone:

```text
secured military-alloy-cache
→ Drone Port / 12.0s / 65 Power
→ Rare Alloy ×1
```

Drone Portは既存Generic Recipe Runtimeを再利用する。

現段階ではResource Point選択はMilitary Alloyへ固定。複数Resource Point / Route assignmentは未実装。

---

## 10. Progression / Research

`PLAYABLE_MAX_RANK = 7`

### Drone Control Research

```text
id: drone_control_systems
requiredRank: 6
researchDataCost: 3
requiredBlueprint: military_drone_control_blueprint
unlock: building:drone_port
```

### Rank 6 → 7 Mandatory

1. Military Facility Main Objective complete
2. Drone Control Research complete
3. `military-alloy-cache` secured
4. Drone Port → Small / Industrial Storage Rare Alloy Route成立

Phase 5-B LogisticsはRank 6の横拡張であり、既存Rank 6→7 Mandatoryを破壊的に変更しない。

---

## 11. Exploration Contract

Shared:

- Expedition Pack 12 slots
- Normal Returnまで通常LootをFactoryへ確定しない
- Normal Return → Transport Depot
- Abandon / HP 0 → Current Session Lootのみ失う
- Discovered Zones / Objective / Shortcut / Resource Pointは保持
- Progression Blueprintはguaranteed reward
- rewardはidempotent

Residential: `Fuse → Power → Survey`

Industrial: `Generator → Control Room → Assembly Blueprint`

Military:

```text
Access Card
→ Security Grid OFFLINE
→ Drone Control Bay ONLINE
→ Drone Control Blueprint
```

Military completion reward:

- `military_drone_control_blueprint`
- Research Data +3
- `military-alloy-cache`

---

## 12. Visual Layer

Visual direction: `Stylized Industrial Realism`。

Phase 5-B visual:

- Conveyor Mk.3: Mk.2より強いRail / 4 arrowで高帯域を区別
- Priority Splitter: Forward Priority laneをGreen系で強調、左右Backupを副表示
- Overflow Splitter: Forward Main + Right Overflowのみを表示
- Visual Arrowと`logisticsOutputKeys()`の方向を一致させる

Procedural visualはGameplay-readable implementationであり、Final Hybrid Asset passではない。

---

## 13. Validation

`npm run validate`

Static CI:

- all JS/MJS syntax
- JSON parse
- local HTML refs
- existing Directional Logistics regression
- existing Splitter round-robin
- Factory Management / Phase 4-B
- Progression Rank 1→7
- Power / Storage / Back Pressure
- Residential / Industrial / Military Exploration
- Drone Research / Drone Route
- Conveyor Mk.3 throughput `6.0/s`
- Phase 5-B Rank 6 unlock gates
- Priority Forward route selection
- Priority backup round-robin
- Overflow Main route selection
- Main unavailable → Overflow fallback
- Phase 5-B visual / progression runtime markers

Static CIで保証しない:

- Pointer Lock操作感
- Phase 5-B Build Preview
- Priority / Overflow arrowの一人称可読性
- collider / placement feel
- WebGL FPS
