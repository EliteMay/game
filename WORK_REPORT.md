# Work Report

Date: 2026-09-05

## Scope

`EliteMay/game` のGame HubとGame 01 `Scrap Factory`を、Playable MVPからSteam掲載相当を目標に継続改善。

現在までの主要段階:

1. Playable MVP
2. Visual Foundation V2
3. Runtime visual regression fix
4. Directional logistics / 操作説明改善
5. Factory Management Pack
6. Phase 1 Progression Rank / Research
7. Phase 2-A Power Core
8. Phase 2-B Logistics Expansion
9. Phase 2-C Power Buffer & Storage

## Current Gameplay

- Three.js first-person 3D world
- Scrap Yard + Factory Base
- Scrap collection / respawn
- 12-slot backpack
- Direct selling
- Free building on 2.5m grid
- Hopper / Seller / Crusher / Smelter
- Small Storage / Industrial Storage
- Conveyor Mk.1 / Mk.2 / Splitter / Merger
- Scrap Generator / Power Pole / Grid Battery
- Directional Logistics / Route Throughput
- Splitter deterministic round-robin
- Storage finite capacity / Back Pressure
- Battery automatic charge / discharge
- Safe dismantle / full build-cost refund
- Machine buffers / processing cycles
- Hand crafting
- Tutorial / Free Play
- Progression Rank 1 → 2 → 3 playable
- Rank 4〜5 future-state systems
- Research Data / Research unlock
- Autosave / Recovery / JSON Export
- Factory Management / Codex / Planner / Alerts

通常Gameplayの自然なRank UpはまだRank 3まで。Rank 4〜5機能はProgression Save state上で実装済みだが、探索Objective経由の自然な到達は後続Phase。

## Visual Foundation

- Procedural sky / ground / industrial surfaces
- Factory fence / gate / workshop / floodlight
- Scrap-yard props / distant industrial background
- Purpose-specific Phase 1 machine silhouettes
- Conveyor Mk.2 / Splitter / Merger dedicated floor visuals
- Grid Battery dedicated cabinet / terminal / charge gauge visual
- Industrial Storage dedicated large-container visual
- Interaction marker / head bob / sprint FOV

Scrap Generator / Power PoleはCore先行で専用Silhouette改善が残る。

## Existing Directional Logistics Contract

User playtest由来の既存Contract:

- `F`で設備解体
- `E`で設置後の物流方向編集
- Visual Arrow = Runtime Output direction
- Crusher outputはInput側へ逆走しない
- Source→First ConveyorはRear接続を確認
- Line途中のMk.1 / Mk.2はLegacy corner互換でSide entry許可
- Splitter / Mergerは明示Portを厳密適用
- Tutorial / Progression / Factory Managementも同じRoute Source of Truthを使用

Phase 2-CではこのContractを変更していない。

## Factory Management Pack

`P`で工場管理コンソールを開く。

現在の主な分析:

- Cash / Revenue / session revenue per minute
- equipment / active-waiting machine / buffers
- logistics node / defined throughput capacity
- storage used / total capacity / full storage count
- power generation / demand / reserve / coverage
- battery stored / total capacity
- material wait / output stall / logistics dead end / underused splitter / full storage alerts
- Challenges / Factory Title / HUD tracking
- Production Planner / Codex / Session Log
- `1〜5` Quick Build

Quick Build Public Contract:

1. Crusher
2. Smelter
3. Conveyor Mk.1
4. Small Storage
5. Seller

Advanced設備を追加してもこの順番は変更しない。

## Phase 1 Progression Rank / Research

### Added

- `progressionRank` 1〜7保存構造
- Playable Rank Up: 1→2 / 2→3
- Mandatory + Optional goals
- Directional Routeを使う必須Line判定
- Rank2 Smelter / Storage / Research
- Basic Fabrication / Scrap Yard Survey
- Blueprint Gate
- HUD Rank / Research panel
- Core + UI Build/Craft Guard
- Achievement由来称号をFactory Titleへ分離

### Legacy Compatibility

- Smelter / Storage usage evidenceから最低Rank補完
- Directional Iron LineからRank3推定
- Iron Plate / Tool Kit evidenceからBasic Fabrication補完
- Existing Layout / Economy / Inventory / Achievementを初期化しない

## Phase 2-A Power Core

### Added

- `power.js`
- Rank4 activation / Rank1〜3 no-power compatibility
- Starter Grid: 55 Power / radius17.5m
- Scrap Generator: Rank4 / `$260` / Scrap1 / 24秒 / +80 Power
- Power Pole: Rank4 / `$45` / link12.5m / coverage10m
- Crusher18 / Smelter30 Power
- Shortage stop / recovery
- Buffer / progress preservation
- `powerFuelSeconds` persistence
- deterministic allocation

## Phase 2-B Logistics Expansion

### Added

- Conveyor Mk.2: Rank4 / `$28` / 3 items/sec
- Splitter: Rank4 / `$85` / 1 Input → 3 Output / round-robin
- Merger: Rank4 / `$85` / 3 Input → 1 Output
- Route throughput = minimum Node throughput
- `delta × throughput` Transport Credit
- `logisticsCursor` persistence
- Advanced Logistics visuals
- Factory Management logistics analysis

### CIで検出した重要Regression

PR #7初版では新Port制約を途中Conveyorにも厳密適用し、既存の直進→90°カーブLineを破壊した。

CI failure:

- `scripts/logistics.test.mjs`
- `east then north route should resolve`

Testを弱めず実装を修正し、Mk.1 / Mk.2のLegacy corner entryを維持、Splitter / MergerだけStrict Portにした。

## Phase 2-C Power Buffer & Storage — 2026-09-05

### Scope Decision

REQUIREMENTS再確認後、Phase 2-Bの次SliceをBattery / Storageへ決定。

理由:

- BatteryはRank4→5の中間目標候補としてRequirementsに存在
- Industrial StorageはRank5 Unlock
- 既存Power / Logistics基盤へ追加できる
- Rank3→4探索Progressionを無理に同Sliceへ混ぜず責務を分離できる

### Grid Storage Research

新Research:

- ID: `grid_storage`
- Name: 電力蓄電技術
- Category: Power
- Rank4
- Research Data 2
- Unlock: `building:battery`

BatteryはRank4だけではBuild不可。`buildingUnlockState()`でRank lock / Research lockを分離した。

### Grid Battery

Building:

- ID: `battery`
- Cost: `$220`
- Capacity: 960 Energy
- Max charge: 60 Power
- Max discharge: 80 Power

Runtime:

- Starter GridまたはConnected Power Pole coverage内でのみGrid参加
- surplus = `baseGeneration - coveredDemand`
- surplusだけを自動充電
- shortfallだけを自動放電
- stored energy / rate / current deltaで供給可能量をClamp
- Batteryが不足を埋め切れなければ既存Power allocationへShortageを残す
- Disconnected Batteryは充放電しない

Persistence:

- additive `building.powerStored`
- Snapshot自体はSaveしない
- `computePowerSnapshot()`はnon-mutating
- `tickPowerStorage()`だけがRuntime時間経過で残量を変更

### Storage Capacity / Back Pressure

Small Storage:

- Capacity 120

Industrial Storage:

- Rank5
- Cost `$240`
- Capacity 600

新Pure module:

`games/scrap-factory/storage-capacity.js`

- `storageCapacity`
- `storageAmount`
- `storageRemaining`
- `storageFillRatio`
- `storageCanReceive`
- `storageTransferAmount`

Manual Deposit:

- 残容量だけ移動
- 超過分はInventoryへ残す
- Full時は0移動

Automatic Transport:

- Full StorageをFinal Target候補から除外
- Transfer直前もRemainingを再確認
- Target受入確認後にだけSource Outputを減らす
- 有効RouteがなければSource BufferへItemを保持
- Splitterに別の有効Routeがあれば再Route selection可能

Legacy Save:

- Over-capacity contentsを削除しない
- Remaining 0として新規Inputだけ拒否
- Player回収でCapacity以下に戻れば通常動作

### Factory Management

追加:

- Storage used / total capacity
- Full Storage count
- Full Storage warning
- Power generation / demand / reserve
- Battery stored / capacity
- uncovered consumer count

### Visual

`world-runtime.js`に専用Visual追加:

Grid Battery:
- Cell cabinet
- terminals
- charge gauge
- status light

Industrial Storage:
- Small Storageより大型のcontainer silhouette
- frame
- front door
- safety markings

Battery Gaugeは`world.updateBuildingState()`のprogressへ接続する。

### Save Compatibility

Root:

- key: `elitemay-game-hub-v1`
- Schema Version: `1`

Optional Building fields:

- `powerFuelSeconds`
- `powerStored`
- `logisticsCursor`

Derived stateはSaveしない。

### Regression Coverage

`scripts/power.test.mjs`:

- existing Starter Grid / Generator / Pole regression
- Battery exact-shortfall output
- pure snapshot non-mutation
- discharge energy consumption
- surplus charging
- capacity clamp
- disconnected battery
- low-energy sustainable discharge

`scripts/storage-capacity.test.mjs`:

- Small Storage capacity
- Industrial Storage capacity
- used / remaining / fill ratio
- transfer clamp
- Full Back Pressure
- Legacy over-capacity preservation

`scripts/progression.test.mjs`:

- Battery Rank4 + Research Gate
- Grid Storage completion unlock
- Industrial Storage Rank5 Gate

`scripts/factory-management.test.mjs`:

- Storage aggregation
- Full alert
- Battery / Power metrics

`npm run validate`へStorage testと`tickPowerStorage` / `storageRemaining` integration markerを追加。

### Initial PR CI

PR #8 implementation-only headで`Validate Web Game` run #43: **success**。

Documentation同期後に最新Headで再Validationする。

## Save / Compatibility

Core Save:

- Root key: `elitemay-game-hub-v1`
- Root Schema Version: `1`
- Progression Version: `1`
- Optional Building fields:
  - `powerFuelSeconds`
  - `powerStored`
  - `logisticsCursor`

Factory Management preference key:

- `scrap-factory-management-v1`

## Validation

### Automated

- JavaScript syntax baseline
- JSON parse baseline
- Local HTML reference validation
- Required files
- Directional Logistics regression
- Factory Management regression
- Progression regression
- Power / Battery regression
- Storage capacity regression

### Browser / Visual — 未確認

- Progression HUD / Research reload / Pointer Lock
- Generator fuel → shortage → recovery
- Power Pole placement readability
- Splitter / Merger port readability
- Mk.1 / Mk.2 perceived speed
- Battery live surplus charge → shortage discharge → empty
- Battery charge gauge readability
- Storage fill → Full → upstream Back Pressure
- Industrial Storage scale / collision / readability
- Nested Splitter distribution at large scale

Static CI成功をBrowser / Visual Validationへ読み替えない。

## Known Limits / Next Large Features

Not yet implemented / connected:

- natural Rank3→4 Progression path
- independent exploration area / Blueprint acquisition
- natural Rank4→5 Progression path
- Assembler / Phase 2 advanced recipes
- Smart Sorter / Priority / Overflow
- per-segment physical belt occupancy / queue
- multiple independent Power Network components
- Power persistent dashboard beyond current console metrics
- Scrap Generator / Power Pole final dedicated visuals
- Combat / weapons / enemies
- authored external 3D assets

次SliceはREQUIREMENTSを再確認し、**ExplorationによるRank3→4接続** または **Production Recipe / Assembler前段** のうち、依存関係が自然な方を選ぶ。

## Requirements Planning Update

`REQUIREMENTS.md` はゲーム内容・進行・探索・自動化の長期Source of Truth。

現行Playable MVP、Root Schema Version 1、Directional Logistics、2.5m Grid、Factory座標系を維持する。
