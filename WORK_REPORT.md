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
10. Phase 3-A Residential Exploration Progression

## Current Gameplay

- Three.js first-person Factory world
- Scrap Yard + Factory Base
- independent Residential Exploration Three.js scene
- Transport Terminal / Expedition Session / Transport Depot
- Scrap collection / respawn
- 12-slot Factory backpack + 12-slot Expedition Session pack
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
- Progression Rank 1 → 2 → 3 → 4 playable
- Research Data / Blueprint / Research unlock
- Residential Main Objective / persistent district discovery / Resource Point
- Autosave / Recovery / JSON Export
- Factory Management / Codex / Planner / Alerts

通常GameplayでRank 4まで自然に到達できる。Rank 4→5の進行条件は後続Phase。

## Visual Foundation

- Procedural sky / ground / industrial surfaces
- Factory fence / gate / workshop / floodlight
- Scrap-yard props / distant industrial background
- Purpose-specific Phase 1 machine silhouettes
- Conveyor Mk.2 / Splitter / Merger dedicated floor visuals
- Grid Battery dedicated cabinet / terminal / charge gauge visual
- Industrial Storage dedicated large-container visual
- Residential road / row houses / garage / substation / transport pad / distant silhouettes
- Interaction marker / head bob / sprint FOV

Scrap Generator / Power PoleはCore先行で専用Silhouette改善が残る。Residential内部空間・敵・Hazardも後続Visual / Gameplay pass対象。

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

Phase 3-AでもこのContractを変更していない。

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
- Rank Up: 1→2 / 2→3
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

### Grid Storage / Battery

- `grid_storage`: Rank4 / Research Data2 / Battery unlock
- Battery `$220`
- Capacity 960 Energy
- max charge 60 Power
- max discharge 80 Power
- Starter Grid / Connected Pole coverage内だけGrid参加
- `powerStored`だけ永続化
- `computePowerSnapshot()`はnon-mutating
- `tickPowerStorage()`だけが時間変化を反映

### Storage Capacity / Back Pressure

Small Storage:
- Capacity 120

Industrial Storage:
- Rank5
- `$240`
- Capacity 600

`storage-capacity.js`をPure Source of Truthとして追加。

- Manual Depositは残容量だけ移動
- Full StorageをFinal Target候補から除外
- Transfer直前もRemainingを再確認
- Target受入確認後にだけSource Outputを減らす
- Legacy over-capacity contentsは削除しない

### Factory Management / Visual

- Storage used / total capacity / Full count
- Full Storage warning
- Power generation / demand / reserve
- Battery stored / capacity
- Battery dedicated visual + charge gauge
- Industrial Storage dedicated large silhouette

## Phase 3-A Residential Exploration Progression — 2026-09-05

### Scope Decision

REQUIREMENTSを再確認し、Rank 3→4のMandatoryである **廃住宅街Main Objective** を最初の独立探索Areaとして実装。

Phase 3-Aでは以下を一つのVertical Sliceとして接続した。

```text
Rank 3
→ Transport Terminal
→ Residential independent scene
→ Fuse
→ Substation Power
→ Survey Terminal
→ Guaranteed Blueprint / Research Data / Resource Point
→ Normal Return
→ Rank 3 optionals
→ Rank 4
```

### Exploration State

新Pure module:

`games/scrap-factory/exploration.js`

Data:

- `exploration.version = 1`
- `areas.residential`
- `depot`
- `activeSession`

Residential persistent state:

- discovered zones
- fuse / power / survey objective state
- completed flag / completedAt
- resource points
- visits
- successful returns
- returned loot total
- reward claimed

Active Session:

- Expedition ID
- Area ID
- start timestamp
- Session loot
- collected loot IDs
- player x/y/z/yaw

Root Save Schema Versionは`1`のまま維持。

### Transport Terminal

新Browser module:

- `exploration-ui.js`
- `exploration-ui.css`

Factory HUDへ`T / TERMINAL`を追加。

表示:

- Rank
- danger
- Main Loot
- Main Objective
- Recommended state
- district discovery
- return stats
- Resource Point
- Transport Depot

Rank2以下はResidential launch不可。Rank3で出発可能。

Factory runtimeの未保存stateを失わないため、Terminalを開く前に既存`save-now` handlerを使ってFactory Saveを確定する。

### Independent Residential Scene

新規:

- `exploration/residential.html`
- `exploration/residential.css`
- `exploration/residential.js`

Factory Sceneを同時保持せず別Three.js Pageへ切替。

Procedural environment:

- service road / curbs
- row houses
- west garage
- substation enclosure / transformer equipment
- transport pad
- street lights
- debris
- distant district silhouettes

Gameplay:

- Pointer Lock
- WASD
- Shift Sprint
- Simple AABB collision
- 4 persistent discovery zones
- 12 deterministic loot nodes
- E interaction
- 5秒 Autosave
- Player position / yaw persistence

### Expedition Loot Contract

Factory Inventoryと探索Session Lootを分離。

- Session Pack: 12 slots
- Loot nodeはStable ID
- `collectedLootIds`で同Session再回収を禁止
- Full時はLootを消さず回収拒否
- Normal ReturnまでFactory Inventoryへ混ぜない

Normal Return:

- Session Loot → Transport Depot
- successful return +1
- returned loot total加算
- Active Session終了
- Factoryへ戻る

Transport Depot:

- 帰還Lootの安全な一時保管
- Factory Backpackへ入る分だけClaim
- Backpack overflowでItemを消さない

Hub Exit:

- Active Session保持

Abandon:

- Current Session Lootだけ喪失
- Zone / Objective / Resource Point progressは保持

### Residential Main Objective

順序:

1. West GarageでFuse回収
2. SubstationへFuseを取り付けPower Restore
3. Survey Terminal起動

Survey完了時のGuaranteed Reward:

- `scrap_yard_survey_blueprint`
- Research Data +1
- `residential-copper-network` Resource Point

`rewardClaimed`で重複付与を防止。

### Rank 3 → 4

Mandatory:

- Residential Main Objective complete

Optionalから2つ:

- 4区画中3区画発見
- ResidentialからLoot累計10個正常帰還
- Cable Bundle discovery
- Lifetime Revenue $1,200
- Item discovery 6種類

Reward:

- Splitter
- Merger
- Conveyor Mk.2
- Scrap Generator
- Power Pole
- Research Data +1

これにより既に実装済みだったPhase 2-A / 2-B / 2-CのRank4 Factory systemsへ通常Gameplayから到達可能になった。

### CI #49 Failure / Fix

PR #9最初のValidation run #49は`Exploration` regressionで失敗。

Failure:

- duplicate Loot IDが`collected`として判定されなかった
- `collectExplorationLoot()`内で参照していたActive Sessionが、容量確認用の`ensureExplorationState()`再実行で差し替えられていた
- そのため古いSession objectへ書き込んだLoot / IDがAuthoritative stateへ残らなかった

Fix:

- Session objectだけを受け取るPure `canAddSessionLoot()`へ容量判定を分離
- `collectExplorationLoot()`内でNormalizeを再実行しない
- Testを弱めずImplementationを修正
- 新規SessionのYawもResidential奥へ向く`0`へ修正

修正後 `Validate Web Game` run #50:

- project-contract: success
- `npm run validate`: success
- reusable baseline: success

### Regression Coverage

新規 `scripts/exploration.test.mjs`:

- Rank2 Area lock / Rank3 unlock
- exploration normalize
- expedition start / duplicate start
- zone discovery / idempotence
- session loot / duplicate prevention
- Fuse dependency
- Power dependency
- Survey completion
- guaranteed Blueprint
- Research Data reward once
- normal return → depot
- return statistics
- Rank3 + optionals → Rank4
- Rank4 building unlocks
- Depot → Backpack
- Abandon current loot loss
- Zone / Objective persistence after abandon

Validator:

- Residential HTML local reference validation
- Exploration required files
- Residential runtime integration markers
- Exploration regression execution

## Save / Compatibility

Core Save:

- Root key: `elitemay-game-hub-v1`
- Root Schema Version: `1`
- Progression Version: `1`
- Exploration Version: `1`
- Optional Building fields:
  - `powerFuelSeconds`
  - `powerStored`
  - `logisticsCursor`

Exploration additive fields:

- `areas`
- `depot`
- `activeSession`

Factory Management preference key:

- `scrap-factory-management-v1`

## Validation

### Automated

- JavaScript syntax baseline
- JSON parse baseline
- Local HTML reference validation including Residential scene
- Required files
- Directional Logistics regression
- Factory Management regression
- Progression regression
- Power / Battery regression
- Storage capacity regression
- Exploration / Return / Rank3→4 regression

### Browser / Visual — 未確認

- Progression HUD / Research reload / Pointer Lock
- Transport Terminal open/close + pointer-lock transition
- Residential start orientation
- Residential movement / collision
- Fuse / Breaker / Survey interaction reachability
- Zone boundaries / discovery feedback
- Session Pack HUD
- Normal Return navigation
- Hub Exit session resume
- Abandon navigation
- Residential environment readability / FPS
- Generator fuel → shortage → recovery
- Power Pole placement readability
- Splitter / Merger port readability
- Mk.1 / Mk.2 perceived speed
- Battery live charge / discharge
- Storage live Back Pressure

Static CI成功をBrowser / Visual Validationへ読み替えない。

## Known Limits / Next Large Features

Not yet implemented / connected:

- natural Rank4→5 Progression path
- deeper Residential building interiors
- Residential enemies / HP / environmental hazards
- additional independent exploration areas
- Assembler / advanced recipes
- Smart Sorter / Priority / Overflow
- per-segment physical belt occupancy / queue
- multiple independent Power Network components
- Scrap Generator / Power Pole final dedicated visuals
- Combat / weapons / enemies
- authored external 3D assets

次SliceはREQUIREMENTSを再確認し、**Rank4→5 Production/Power Progression**、**Residential探索の危険/内部空間拡張**、**Assembler前段**の依存関係から選ぶ。

## Requirements Planning Update

`REQUIREMENTS.md` はゲーム内容・進行・探索・自動化の長期Source of Truth。

現行Root Schema Version 1、Directional Logistics、2.5m Factory Grid、Factory座標系、独立Exploration Scene方針を維持する。
