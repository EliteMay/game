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

## Current Gameplay

- Three.js first-person 3D world
- Scrap Yard + Factory Base
- Scrap collection / respawn
- 12-slot backpack
- Direct selling
- Free building on 2.5m grid
- Hopper / Seller / Crusher / Smelter / Storage
- Conveyor Mk.1 / Conveyor Mk.2
- Splitter / Merger
- Rank 4 Power definitions: Scrap Generator / Power Pole
- Directional Logistics with explicit advanced-node ports
- Mk.1 / Mk.2 route throughput
- Splitter deterministic round-robin
- Conveyor / Logistics rotation and reverse after placement
- Safe dismantle mode with full build-cost refund
- Machine input/output buffers and processing cycles
- Hand crafting
- Cash / Revenue
- Tutorial contract / free-play transition
- Progression Rank 1 → 2 → 3
- Research Data / Research unlock
- Rank 4 Power / Logistics core for future progression connection
- Autosave / recovery / reset / JSON export
- Graphics / sensitivity / volume / FPS / shortcut settings
- In-game Field Manual / Codex

## Visual Foundation

- Gradient sky / cloud / fog
- Procedural concrete / dirt surfaces
- Oil stain / lane marking / hazard stripe
- Chain-link fence / gate / workshop / awning / floodlight
- Scrap-yard props: container / tire / barrel / spool / vehicle / crane / piles
- Distant silo / chimney / pipe bridge / industrial silhouette
- Dedicated collectible shapes
- Purpose-specific machine silhouettes for Phase 1 machines
- Dedicated runtime floor visuals for Conveyor Mk.2 / Splitter / Merger
- Interaction marker / head bob / sprint FOV
- Static scenery collision with build placement

Scrap Generator / Power PoleはCore先行で、専用Silhouetteは後続Visual pass。Generic fallback geometryのまま完成扱いしない。

## Directional Logistics / QoL

User playtest feedbackから導入した既存Contract:

- Conveyor can be dismantled with `F`
- Direction can be edited after placement with `E`
- Crusher output does not follow an input-side Conveyor backward
- Yellow arrow is actual output direction
- Build / dismantle contextual hints
- Static shortcut HUD
- Detailed machine description / recipe flow / processing time
- `O` re-openable field manual

Phase 2-BでもこのContractを維持した。

## Factory Management Pack

`P`で工場管理コンソールを開く。

主要機能:

- Factory summary
- material wait / output stall / logistics dead-end alerts
- Splitter underused branch alert
- Logistics node count / defined capacity analysis
- 8 challenges / achievements
- Challenge HUD pinning
- Factory Title
- Production Planner
- Searchable Codex
- Session event log
- HUD alert-count badge
- `1〜5` Quick Build

Quick Buildの既存割当はPhase 2-Bでも固定:

1. Crusher
2. Smelter
3. Conveyor Mk.1
4. Storage
5. Seller

Advanced LogisticsをBuild Menuへ追加したことで一度IndexずれRiskを検出したため、`BUILD_MENU_ORDER`の先頭5件をRegression Testで固定した。

## Phase 1 Progression Rank / Research — 2026-09-05

### Added

- `progressionRank` 1〜7保存構造
- Playable Rank Up: Rank 1 → 2 / Rank 2 → 3
- 必須目標 + 選択目標2つ方式
- Directional Routeを使う必須Line判定
- Rank 2: Smelter / Storage / Research Tier 2 / Research Data +1
- Rank 3: Research Data +2 / Exploration Research入口
- `Basic Fabrication` / `Scrap Yard Survey`
- Blueprint Gate
- HUD `RANK`
- Rank Goal / Research Panel
- Core + UI Build/Craft Guard
- Achievement由来称号を`FACTORY TITLE`へ分離

### Legacy Compatibility

- Smelter usage → Rank 2 minimum / Legacy Unlock
- Storage usage → Rank 2 minimum / Legacy Unlock
- Directional Iron Line → Rank 3 inference
- Iron Plate / Tool Kit Craft evidence → `Basic Fabrication` complete
- Existing Achievement / Layout / Economy / Inventoryを初期化しない

## Phase 2-A Power Core — 2026-09-05

### Added

- `games/scrap-factory/power.js`
- Power activation: `progressionRank >= 4`
- Rank 1〜3 no-power compatibility
- Starter Grid 55 Power / 17.5m
- Scrap Generator: Rank 4 / `$260` / Scrap 1 / 24秒 / +80 Power
- Power Pole: Rank 4 / `$45` / 12.5m link / 10m coverage
- Crusher 18 Power / Smelter 30 Power
- Shortage stop / automatic recovery
- Buffer / processing progress preservation
- Manual + logistics Generator fuel supply
- `building.powerFuelSeconds` persistence
- Deterministic power allocation

### Power Regression

`scripts/power.test.mjs`:

- Rank 3以前 Power disabled
- Starter Grid
- shortage
- generator fuel / recovery
- coverage / pole chain
- buffer non-mutation
- deterministic allocation

## Phase 2-B Logistics Expansion — 2026-09-05

### Added Buildings

- Conveyor Mk.2
  - Rank 4
  - `$28`
  - 3 items/sec
- Splitter
  - Rank 4
  - `$85`
  - Rear 1 Input
  - Forward / Left / Right 3 Output
  - deterministic round-robin
- Merger
  - Rank 4
  - `$85`
  - Rear / Left / Right 3 Input
  - Forward 1 Output

Conveyor Mk.1は`$12` / 1.5 items/secとして既存互換を維持。

### Routing Architecture

`games/scrap-factory/logistics.js`をDirectional Conveyor専用helperから、明示的Logistics NodeのSource of Truthへ拡張した。

追加Pure Logic:

- `isLogisticsNode`
- `logisticsThroughput`
- `logisticsInputKeys`
- `logisticsOutputKeys`
- `logisticsAcceptsFrom`
- `findDirectionalRoutes`
- `selectDirectionalRoute`

Contract:

- Sourceから最初のConveyor / Mk.2はRear側接続が必要
- 既存Conveyor / Mk.2はLine途中のSide entryを許可し、従来の曲がりLineを維持
- Splitter / Mergerは途中でも明示Input Portを厳密適用
- Splitterは暗黙の多方向探索ではなく明示3 Output
- Mergerは明示3 Input / 1 Output
- CycleをRoute単位で防止
- Progression / Tutorial / Factory Managementも同じRoute Source of Truthを使用

### Throughput

以前の固定約0.65秒Transport Tickから、`delta × route throughput`のTransport Creditへ変更。

- Mk.1: 1.5 items/sec
- Mk.2 / Splitter / Merger: 3 items/sec
- Route throughput = Route上の最小Node throughput
- Mixed `Mk.2 → Mk.1`は1.5へClamp
- 1 frame当たりのSource移動回数に上限を設定
- Packet animationも高速Routeで速度を上げる

現段階はRoute-level modelで、per-segment physical occupancy / queue / Back Pressureまでは未実装。

### Save Compatibility

- Root key: `elitemay-game-hub-v1`
- Root Schema Version: `1`
- additive building field: `logisticsCursor`
- missing cursorは`0`へNormalize
- route graph / throughputはSaveせずBuilding layoutから導出
- direction変更時はcursorを0へReset

### Visual

`world-runtime.js`へAdvanced Logisticsの明示的Visual extensionを追加。

- Conveyor Mk.2: high-speed belt / distinct rail / arrows
- Splitter: branching floor silhouette / 3 output markers
- Merger: merging floor silhouette / one output marker
- Advanced LogisticsはPlayer collisionを持たない
- Build PreviewにもAdvanced shapeを追加

実ブラウザでのPort readability確認は未実施。

### Factory Management

- Advanced Logistics dead-end detection
- Splitter one-branch-only info alert
- `logisticsNodes`
- `logisticsCapacity`
- new Route logicをMachine output-stall detectionでも使用

### CIで検出した互換Bug

PR #7の最初の`project-contract` CIは失敗した。

Failure:

- `scripts/logistics.test.mjs`
- `east then north route should resolve`

原因:

- Phase 2-B初版で新しい明示Input Port制約をConveyor Mk.1にもLine途中で適用した。
- 既存Contractでは「最初のConveyor接続はRear確認、途中Conveyorは横から入って曲がれる」ため、既存の直進→北カーブを破壊していた。

修正:

- Conveyor Mk.1 / Mk.2はSource ConnectionだけRear側を要求
- Line途中のConveyorはLegacy corner entryを維持
- Splitter / Mergerだけ明示Input Portを厳密適用
- Factory Managementの接続判定も同じ`logisticsAcceptsFrom`を使用

互換修正後のPR CIは成功した。

### Regression Coverage

`scripts/logistics.test.mjs`:

- old rotation mapping
- old corner route
- reverse-flow rejection
- Splitter ports / 3 target routes
- deterministic round-robin
- Merger 3 input / 1 output
- Merger output-side rejection
- Mk.2 throughput
- mixed-tier bottleneck

`scripts/factory-management.test.mjs`:

- existing alerts/challenges/planner
- advanced logistics metrics
- Splitter underuse alert
- Quick Build 1〜5 ordering

`scripts/progression.test.mjs`:

- existing Rank / Research / migration
- Rank 4 Advanced Logistics / Power building gates

`scripts/power.test.mjs`を継続し、Phase 2-A回帰も同時に確認する。

## Save / Compatibility

Core save:

- Root key: `elitemay-game-hub-v1`
- Root Schema Version: `1`
- Progression internal Version: `1`
- Optional building fields:
  - `powerFuelSeconds`
  - `logisticsCursor`

Factory Management preferences:

- key: `scrap-factory-management-v1`
- challenge unlock IDs
- pinned challenge ID
- planner target/rate

## Validation

### Automated

- JavaScript syntax baseline
- JSON parse baseline
- Local HTML ref validation
- Required project files
- Directional Logistics regression
- Factory Management regression
- Progression regression
- Power regression

PR #7 branch validation after legacy-corner compatibility fix: success.

### Browser / Visual — 未確認

- Progression HUD位置 / Pointer Lock
- Rank / Research Reload flow
- Legacy Save実データMigration
- Generator fuel → shortage → recovery
- Power Pole placement readability
- Splitter / MergerのInput / Output方向の見分けやすさ
- Mk.1 / Mk.2の体感速度差
- Logistics Rotate / Reverse後のPointer Lock flow
- Nested Splitterの大規模Factory distribution

Static CI成功をBrowser / Visual Validationへ読み替えない。

## Known Limits / Next Large Features

Not yet implemented:

- Rank 4への自然なProgression path
- Blueprint取得元になる独立探索Area
- Battery基盤
- Storage拡張
- Phase 2新Recipe / Assembler
- Smart Sorter / Priority / Overflow
- Per-segment belt occupancy / queue / Back Pressure
- Factory Management Power専用Dashboard / persistent Alert
- Scrap Generator / Power Pole dedicated visual
- New exploration areas
- Combat / weapons / enemies
- Authored external 3D assets

Phase 2の次Sliceでは **Battery / Storage Expansion / Production Recipe拡張** を候補とし、REQUIREMENTSの順序と現在実装を再確認して決める。

## Requirements Planning Update — 2026-09-05

`REQUIREMENTS.md` はゲーム内容・進行・探索・自動化の長期Source of Truth。

確定済みの主な方向:

- Rank 1〜7
- Rank / Research / Explorationの役割分担
- Factory + current Scrap Yard same Scene
- independent exploration Scenes
- Slot + Weight Backpack / Secure Case
- combat / HP / exploration failure contract
- Research / Blueprint / Research Data
- Power / Generator / Battery
- Splitter / Merger / Smart Sorter / Priority / Overflow / Conveyor Tier
- Assembler / Fabricator / Recipe hierarchy
- Drone resource collection
- Economy / Optional Order / Factory Expansion
- Move / Upgrade / Quick Build / Elevated Logistics / small Blueprint
- Factory Management / Alerts / Planner / Bottleneck
- Challenge / Achievement
- Tutorial / UI / Difficulty / Accessibility
- Save / Exploration Session / Backup / Migration
- Mega Factory / Main Clear / post-clear optimization
- Browser performance / scale target

現行Playable MVP、Root Save Schema Version 1、2.5m Grid、Factory座標系は維持する。
