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
11. Phase 3-B Rank 5 Production / Power Progression

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
- Progression Rank 1 → 2 → 3 → 4 → 5 playable
- Research Data / Blueprint / Research unlock
- Residential Main Objective / persistent district discovery / Resource Point
- Rank 4 Advanced Logistics + Own Power progression condition
- Autosave / Recovery / JSON Export
- Factory Management / Codex / Planner / Alerts

通常GameplayでRank 5まで自然に到達できる。Rank 5到達後はIndustrial Storageを利用可能。Rank 5→6の廃工場復旧 / Assemblerは後続Phase。

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

Phase 3-BでもこのContractを変更していない。

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

## Phase 3-B Rank 5 Production / Power Progression — 2026-09-05

### Scope Decision

REQUIREMENTSのRank 4→5 Mandatory:

> Splitter / Mergerを使った複数製品自動ラインを、自前電力で安定稼働させる。

を、既に実装済みの物流・Power Source of Truthへ直接接続した。

新しいSave counterや別のProgression graphを追加せず、現在のFactory stateからRank 5 eligibilityを導出する。

### Rank 4 Advanced Line Analysis

`progression.js`へ`analyzeRank4AdvancedLine(game)`を追加。

対象:

```text
Hopper
→ Splitter / Mk.2等
→ Crusher
→ Crushed Metal final route
+
Hopper
→ Splitter / Mk.2等
→ Crusher
→ Smelter
→ Iron Ingot final route
```

Final target:

- Seller
- Small Storage
- Industrial Storage

判定:

- 2加工Outputが成立
- Route bundleにSplitterを含む
- Route bundleにMergerを含む
- Mk.2利用有無を導出
- 全対象Routeのminimum throughputを導出

`findDirectionalRoutes()`をそのまま利用するため、Legacy corner / strict Splitter-Merger port contractをProgression側で複製しない。

### Rank 4 Own Power Analysis

`analyzeRank4Power(game)`を追加。

MandatoryのOwn Power:

- `computePowerSnapshot()`が正常
- 給電範囲外Consumerなし
- Active Scrap Generator容量だけでCovered Demand以上
- Starter Grid 55 PowerはOwn Generationへ加算しない
- Battery dischargeもOwn Generator capacityへ加算しない
- Demandを賄うGenerator群が最低30秒分のFuel Runwayを持つ

Fuel Runway:

```text
current powerFuelSeconds
+ generator.input.metal_scrap × 24秒
```

Generatorが停止中なら、InputにFuelがあってもActive own generationとは扱わない。

### Rank 4 → 5 Goals

Mandatory:

- Splitter + Mergerを使うCrushed Metal / Iron Ingot 2加工Output
- Stable Own Power 30秒以上

Optionalから2つ:

- Advanced lineにConveyor Mk.2
- effective throughput 3.0 items/sec
- Grid Storage research
- Generator fuel runway 120秒
- Own generation reserve 10 Power

Reward:

- Rank 5
- Industrial Storage

`PLAYABLE_MAX_RANK`を5へ更新。Progression save自体は従来通り1〜7を保持可能。

### Save / Compatibility

追加Persistent Fieldなし。

- Root Schema Version `1`
- Progression Version `1`
- Existing Building fieldsを利用
- Route graphを保存しない
- Power snapshotを保存しない
- Rank4→5専用Timerを保存しない

既存Rank 1→4、Legacy Migration、Exploration、Battery、Storage、Quick Build、Directional corner compatibilityを変更しない。

### Regression Coverage

`scripts/progression.test.mjs`へ追加:

- `PLAYABLE_MAX_RANK = 5`
- Splitter + Merger + Mk.2 topology
- 2加工Output detection
- throughput 3.0
- Own Generator 80 Power
- Covered Demand 66
- Own Reserve 14
- Fuel Runway 48秒
- Rank4 mandatory + optionals → Rank5
- Industrial Storage unlock
- Rank5 phase cap
- Merger removal → mandatory fail
- inactive generator → mandatory fail

PR #10 implementation head:

`6444578932c8520050b000c0e1c7605500f43ea3`

`Validate Web Game` run #56:

- completed
- conclusion: success
- reusable baseline included

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

Phase 3-BではSave fieldを増やしていない。

## Validation

### Automated

- JavaScript syntax baseline
- JSON parse baseline
- Local HTML reference validation including Residential scene
- Required files
- Directional Logistics regression
- Factory Management regression
- Progression Rank 1→5 regression
- Rank4→5 Advanced Logistics / Own Power regression
- Power / Battery regression
- Storage capacity regression
- Exploration / Return / Rank3→4 regression

### Browser / Visual — 未確認

- Progression HUD / Research reload / Pointer Lock
- Rank4→5用Advanced Lineの実建築操作
- Rank conditionのREADY切替
- Rank5昇格後のIndustrial Storage Build
- Generator燃料Runwayを維持した実稼働
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

- Rank5→6 Progression path
- abandoned factory restoration
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

次SliceはREQUIREMENTSを再確認し、**Rank5→6の廃工場 / Assembler foundation** と **Residential危険Gameplay拡張** の依存関係から選ぶ。

## Requirements Planning Update

`REQUIREMENTS.md` はゲーム内容・進行・探索・自動化の長期Source of Truth。

現行Root Schema Version 1、Directional Logistics、2.5m Factory Grid、Factory座標系、独立Exploration Scene方針を維持する。