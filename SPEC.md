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
→ Phase 4-B Smart Sorting / Diagnostics
→ Rank 6
→ Military Facility
→ Drone Control Research
→ Drone Port automated recovery route
→ Rank 7
```

現在は **Phase 5-A: Military Facility / Drone Automation**。

実装済み:

- Rank 6 Military Facility independent exploration
- Security Access Card / Security Grid / Drone Control Bay / Command Bunker
- Expedition HP 100
- Security Turret damage + non-combat shutdown route
- guaranteed Drone Control Blueprint
- `military-alloy-cache` Resource Point
- `rare_alloy`
- `drone_control_systems` Research
- Drone Port
- Rank 6 → 7 progression
- dedicated Drone Port visual

後続Phase:

- Conveyor Mk.3
- Priority / Overflow
- configurable multiple Drone routes
- full weapon / patrol AI system
- Advanced Power
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
├─ progression.js
│  ├─ progression-core.js
│  ├─ progression-phase4b.js
│  └─ progression-phase5a.js
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

Phase 5-AでもSchema変更なし。

Additive normalization:

- Inventory: `rare_alloy`
- Exploration Area: `military`
- Active Expedition: `hp` default 100

旧Residential / Industrial state、Factory Layout、Building buffersは維持する。

保存しないDerived Data:

- Directional route graph / throughput
- Power snapshot
- Factory diagnostics
- Rank topology result
- Drone Port → Storage route result

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

| Node | Throughput | Input | Output |
| --- | ---: | --- | --- |
| Conveyor Mk.1 | 1.5/s | basic | Forward |
| Conveyor Mk.2 | 3.0/s | basic | Forward |
| Splitter | 3.0/s | Rear | Forward / Left / Right |
| Merger | 3.0/s | Rear / Left / Right | Forward |
| Smart Sorter | 3.0/s | Rear | Item categoryで1方向 |

Smart Sorter fixed category rule:

```text
advanced            → Forward
processed / product → Left
raw                 → Right
```

Route throughputは経路上の最小Logistics throughput。

Phase 5-AのDrone Route判定も同じ `findDirectionalRoutes()` を使用し、Progression専用Graphを作らない。

---

## 6. Power

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

Power shortageではInput / Output / Progressを破壊しない。

---

## 7. Storage / Back Pressure

- Small Storage: 120
- Industrial Storage: 600
- Full Targetへ新Itemを移送しない
- Target受入確認後のみSource Outputを減らす
- Legacy over-capacity stateの既存Itemを削除しない

Drone Port outputも同じBack Pressure contractを使用する。

---

## 8. Production / Drone Automation

Existing:

```text
Metal Scrap → Crusher / 2.2s → Crushed Metal
Crushed Metal → Smelter / 3.0s → Iron Ingot
Motor + Circuit + Plastic → Assembler / 8.0s → Control Unit
```

Phase 5-A:

```text
secured military-alloy-cache
→ Drone Port / 12.0s / 65 Power
→ Rare Alloy ×1
```

Drone Port definition:

- Building id: `drone_port`
- Cost: `$760`
- Required Rank: 6
- Required Research: `drone_control_systems`
- Recipe: `drone_military_alloy`
- Input: empty
- Output: `rare_alloy ×1`
- Cycle: 12 seconds
- Power: 65

実Productionは既存Generic Recipe Runtimeを再利用する。

通常進行ではDrone Port ResearchにMilitary Blueprintが必須であり、そのBlueprint取得時に `military-alloy-cache` も確保される。Rank 6→7 topology判定ではResource Point存在を別途必須確認する。

現段階ではDrone Portは最初のMilitary Alloy Resource Pointへ固定。複数Resource Point選択 / route assignment UIは後続。

---

## 9. Factory Diagnostics

Phase 4-Bを維持:

- theoretical production / minute
- route-supported production / minute
- Machine utilization
- output stall
- storage full / capacity pressure
- power shortage
- logistics dead end
- Smart Sorter configuration info

Derived DataはSaveしない。

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

すべて必要:

1. Military Facility Main Objective complete
2. `drone_control_systems` Research complete
3. `military-alloy-cache` Resource Point secured
4. Drone Port → Small / Industrial Storage のRare Alloy Directional Route成立

Optional 2つ:

- Military 4区画中3区画発見
- Service Gate shortcut開通
- Rare Alloy発見
- Drone Port 2台設置
- Drone Route throughput 3.0/s

Rank 7到達後は現在のPhase cap。

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

### Residential — Rank 3

`Fuse → Power → Survey`

### Industrial — Rank 5

`Generator → Control Room → Assembly Blueprint`

### Military — Rank 6

Persistent Zones:

- `checkpoint`
- `security_yard`
- `drone_bay`
- `command_bunker`

Objective dependency:

```text
Access Card
→ Security Grid OFFLINE
→ Drone Control Bay ONLINE
→ Drone Control Blueprint
```

Service GateはSecurity Grid停止後のOptional shortcut。

Completion reward:

- `military_drone_control_blueprint`
- Research Data +3
- `military-alloy-cache`

Session HP:

- start / default: 100
- normalized range: 0–100
- Security Turret hazard: 22 damage per hit interval while grid active
- HP 0: expedition failure / current loot loss
- no permanent progression rollback

このThreatは軽戦闘導入の前段階。Weapon system / patrol AIは未実装。

---

## 12. Visual Layer

Visual direction: `Stylized Industrial Realism`。

Military Facilityは既存Areaの色替えにせず、次のLandmarkでNavigationを作る。

- Checkpoint
- Security Yard
- Drone Control Bay
- Command Bunker
- Service Gate

Security state:

- Security Grid active: red Turret threat visuals
- Grid offline: Turret threat inactive
- Drone Bay offline / online state changes lighting
- Blueprint recovered state changes object visibility

Drone Port dedicated procedural silhouette:

- launch deck
- control mast
- antenna / radar ring
- docked utility drone
- status light / active moving part

Final Hybrid Asset passは未完了。

---

## 13. Validation

`npm run validate`

Static CI:

- all JS/MJS syntax
- JSON parse
- local HTML refs
- Directional Logistics
- Factory Management / Phase 4-B
- Progression Rank 1→7
- Power
- Storage / Back Pressure
- Residential / Industrial / Military Exploration
- Military HP normalization
- guaranteed Blueprint / reward idempotency
- Drone Research Gate
- Drone Port Rank / Research Gate
- Drone Port → Storage route
- Rank 6→7 eligibility / Rank7 cap
- required Runtime integration markers

Static CIで保証しない:

- Pointer Lock操作感
- Military Facility内の実到達性 / prop collider
- Security Turret警戒範囲の一人称可読性
- Drone Port Build Preview / first-person scale
- WebGL FPS
