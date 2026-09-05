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
→ Conveyor Mk.3 / Priority / Overflow
→ Configurable Drone Routes / Industrial Generator / Logistics Warehouse
→ Rank 7
```

現在は **Phase 5-C**。

実装済みPhase 5要素:

- Military Facility / HP / Security Turret
- Drone Control Blueprint / Research
- Drone Port / Rank 6→7
- Conveyor Mk.3 / Priority / Overflow
- 3 secured Resource Point Drone routes
- Automation Console
- Industrial Generator
- Logistics Warehouse
- Industrial Storage → Logistics Warehouse in-place upgrade
- Phase 5-C dedicated visual wrapper

後続Phase:

- Runtime API経由のReloadなしRoute切替
- Advanced / Experimental Power tier
- full weapon / patrol AI
- ruined research facility / Fabricator / Advanced Drone
- Mega Factory / Main Clear
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
├─ drone-routes.js
├─ game.js
├─ world.js
├─ world-runtime-phase5b.js   # validated Phase 5-B visual base
├─ world-runtime.js           # Phase 5-C visual wrapper
├─ factory-management.js
│  └─ phase4b-management-ui.js
├─ feature-pack.js
├─ progression.js
│  ├─ progression-core.js
│  ├─ progression-phase4b.js
│  ├─ progression-phase5a.js
│  ├─ progression-phase5b.js
│  └─ progression-phase5c.js
├─ progression-ui.js
│  └─ phase5c-automation-ui.js
├─ exploration.js
│  └─ exploration-core-v3.js
└─ exploration-ui.js
```

Compatibility entrypoint `progression.js` / `exploration.js` は既存Import pathを維持する。

Phase 5-Cでは大きい`game.js`へ新Simulationを追加せず、既存Recipe / Power / Storage Runtimeを再利用する。

---

## 3. Save Contract

```text
localStorage key: elitemay-game-hub-v1
Root Save Schema: 1
Progression Schema: 1
Exploration Schema: 1
```

Phase 5-CでもSchema変更なし。

Additive building field:

```text
resourcePointId: string | null
```

用途:
- Drone PortのUser-selected Resource Point IDのみ保存する

保存しないDrone Route定義:
- output item
- cycle seconds
- capacity/min
- distance
- danger
- droneAllowed

これらは `drone-routes.js` が正本。

旧Save:
- `resourcePointId` がない / null → Military Alloy Resource Pointが確保済みなら従来RouteへFallback

保存しないDerived Data:
- Directional route graph
- route throughput / priority
- Power snapshot
- Factory diagnostics
- Rank topology result
- Resource Point performance metadata

---

## 4. Spatial / Compatibility Contract

- Build Grid: `2.5m`
- Factory座標系維持
- Existing LayoutをMigrationで削除しない
- Visual Logistics direction = Runtime direction
- Quick Build 1〜5順序を維持
- GitHub Pages Relative Path対応
- Storage Tier UpgradeでBuilding ID / x / z / rotationを維持

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
| Smart Sorter | 3.0/s | Rear | category固定Lane |
| Priority Splitter | 6.0/s | Rear | Forward Priority / Left+Right Backup |
| Overflow Splitter | 6.0/s | Rear | Forward Main / Right Overflow |

Route throughput = 経路上の最小Logistics throughput。

PriorityはRoute探索時のDerived DataでSaveしない。

---

## 6. Drone Resource Point Routing

Source of Truth: `drone-routes.js`

| ID | Area | Output | Cycle | Capacity/min | Distance | Danger | Runtime type |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| `residential-copper-network` | residential | copper_wire ×1 | 8s | 7.5 | 620m | 1 | `drone_port_copper` |
| `industrial-electronics-cache` | industrial | e_waste ×1 | 10s | 6 | 890m | 2 | `drone_port_electronics` |
| `military-alloy-cache` | military | rare_alloy ×1 | 12s | 5 | 1180m | 3 | `drone_port` |

Playerが各AreaでResource Pointを攻略済みの場合のみAutomation Consoleの選択肢に出す。

Drone Route変更:

```text
resourcePointId更新
→ compatibility runtime type更新
→ partial progress = 0
→ input / output bufferは維持
→ Save APIで保存
→ ReloadしてMemory stateと再同期
```

`drone_port_copper` / `drone_port_electronics` はBuild Menuへ直接出さない内部Compatibility type。新規建築は常に`drone_port`から開始する。

### Rank 6 → 7 compatibility

既存MandatoryはMilitary Alloyの自動回収を要求するため、`analyzeRank6DroneLine()`はMilitary-assigned Portだけを対象にする。

Copper / E-Waste RouteのみではMandatoryを満たさない。

Target Storage:
- Small Storage
- Industrial Storage
- Logistics Warehouse

---

## 7. Building Unlocks

Phase 5-B:

```text
conveyor_mk3      → Rank 6
priority_splitter → Rank 6
overflow_splitter → Rank 6
```

Phase 5-C:

```text
industrial_generator → Rank 6
logistics_warehouse  → Rank 6
```

Drone Port:
- Rank 6
- `drone_control_systems` Research必須

`PLAYABLE_MAX_RANK = 7` 維持。

---

## 8. Power

PowerはRank 4から有効。

| Device | Supply / Use |
| --- | ---: |
| Starter Grid | +55 |
| Scrap Generator | +80 |
| Industrial Generator | +180 |
| Crusher | -18 |
| Smelter | -30 |
| Assembler | -50 |
| Drone Port | -65 |

Generator fuel definition:

```text
Scrap Generator:
metal_scrap ×1 / 24s / 80 Power

Industrial Generator:
metal_scrap ×1 / 24s / 180 Power
```

`power.js` はGeneratorごとに:
- `powerFuelItem`
- `powerFuelSeconds`
- `powerGeneration`
を読む。

既存Scrap Generatorの24秒Contractを維持する。

Battery:
- 960 Energy
- charge 60
- discharge 80

---

## 9. Storage / In-place Upgrade

| Storage | Capacity | Rank |
| --- | ---: | ---: |
| Small Storage | 120 | early |
| Industrial Storage | 600 | 5 |
| Logistics Warehouse | 1800 | 6 |

Back Pressure:
- Full TargetへItemを移送しない
- Target受入確認後のみSource Outputを減らす
- Legacy over-capacity stateの既存Itemを削除しない

### Industrial Storage → Logistics Warehouse

Cost:

```text
620 - 240 = 380
```

UpgradeはBuilding objectの`type`を変更する。

維持:
- ID
- x / z / rotation
- input
- output
- existing items

撤去→再建を要求しない。

---

## 10. Production / Generic Runtime

Existing:

```text
Metal Scrap → Crusher / 2.2s → Crushed Metal
Crushed Metal → Smelter / 3.0s → Iron Ingot
Motor + Circuit + Plastic → Assembler / 8.0s → Control Unit
```

Drone variantsも既存Generic Recipe Runtimeを利用:

```text
Copper route      → 8s  → Copper Wire
Electronics route → 10s → E-Waste
Military route    → 12s → Rare Alloy
```

Power / Output Buffer / Back Pressure / Directional LogisticsをDrone専用Simulationへ複製しない。

---

## 11. Automation Console

Browser module: `phase5c-automation-ui.js`

機能:
- Drone Port一覧
- Portごとのsecured Resource Point選択
- Output / cycle / capacity / distance / danger表示
- Industrial Storage一覧
- Logistics WarehouseへのUpgrade

現在は`game.js`のMemory stateがModule localであるため、Saveだけ変更した後のAutosave競合を避ける目的で変更適用後にReloadする。

将来Runtime mutation APIを公開した場合はReload依存を除去できる。

---

## 12. Progression / Exploration

Exploration shared contract:
- Normal Returnまで通常Loot未確定
- Abandon / HP 0ではCurrent Session Lootのみ失う
- Objective / Shortcut / Resource Pointは永続
- Progression BlueprintはGuaranteed / Idempotent

Secured Resource Points:
- Residential: `residential-copper-network`
- Industrial: `industrial-electronics-cache`
- Military: `military-alloy-cache`

Rank 6 → 7 Mandatory自体はPhase 5-Aから変更しない。

---

## 13. Visual Layer

Visual direction: `Stylized Industrial Realism`。

Phase 5-B Visual Runtimeを`world-runtime-phase5b.js`としてCompatibility Base化。

Phase 5-C `world-runtime.js`はそのSubclass Wrapperとして次だけ追加:
- Copper Drone Port: warm copper Route identity
- Electronics Drone Port: green electronics Route identity
- Industrial Generator: large engine block / twin exhaust / rotor
- Logistics Warehouse: tall rack silhouette / high-density storage facade

Simulation source of truthにはしない。

---

## 14. Validation

`npm run validate`

Static CI:
- JS/MJS syntax
- JSON parse
- local HTML refs
- existing Directional Logistics / Phase 5-B regressions
- Rank 1→7 Progression
- Power / Storage / Back Pressure
- Residential / Industrial / Military Exploration
- old Drone Port fallback
- 3 secured Drone Route definitions
- route recipe/type switching
- output Buffer preservation on route switch
- non-Military route rejection for Rank 6→7 mandatory
- Industrial Generator Rank gate / 180 Power
- Logistics Warehouse Rank gate / 1800 capacity
- Quick Build 1〜5
- Phase 5-B visual compatibility base marker
- Phase 5-C visual wrapper / Automation Console marker

Static CIで保証しない:
- Automation Consoleの実Layout
- Pointer Lock handoff / close時復帰
- Route変更・Upgrade後Reloadの体感
- Phase 5-C設備のBuild Preview / Collider / first-person scale
- WebGL FPS
