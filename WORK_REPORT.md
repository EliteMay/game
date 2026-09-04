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

## Current Gameplay

- Three.js first-person 3D world
- Scrap Yard + Factory Base
- Scrap collection / respawn
- 12-slot backpack
- Direct selling
- Free building on 2.5m grid
- Hopper / Seller / Crusher / Smelter / Conveyor / Storage
- Directional conveyor transport
- Conveyor rotation / reverse after placement
- Safe dismantle mode with full build-cost refund
- Machine input/output buffers and processing cycles
- Hand crafting
- Cash / Revenue
- Tutorial contract / free-play transition
- Progression Rank 1 → 2 → 3
- Research Data / Research unlock
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
- Purpose-specific machine silhouettes
- Interaction marker / head bob / sprint FOV
- Static scenery collision with build placement

## Directional Logistics / QoL

User playtest feedback addressed:

- Conveyor can be dismantled with `F` dismantle mode
- Conveyor direction can be edited after placement with `E`
- Crusher output no longer follows an input-side conveyor backward
- Yellow conveyor arrow is the actual logistics direction
- Build / dismantle contextual hints
- Static shortcut HUD
- Detailed machine description / recipe flow / processing time
- `O` re-openable field manual

Regression test: `scripts/logistics.test.mjs`.

## Factory Management Pack

Factory-game management conventions were researched from current official Satisfactory / Factorio documentation and transferred as task patterns, not copied UI/assets.

### Added

- `P` Factory Management console
- `1〜5` quick-build shortcuts
- Factory summary:
  - cash
  - lifetime revenue
  - session revenue/minute
  - total/player-built equipment
  - active/waiting machines
  - items in machine buffers
  - discovered items
  - play time
- Factory Alerts:
  - machine material wait
  - machine output stall with no route
  - conveyor dead-end
- 8 challenges / achievements
- Challenge HUD pinning
- Factory Title derived from achievements
- Production Planner:
  - choose recipe output
  - set target units/minute
  - back-calculate machine count and raw-material rate
- Searchable Codex:
  - item value / stack / category
  - building price / purpose / recipe
- Session event log from game toasts
- HUD alert-count badge

### Architecture

```text
games/scrap-factory/
├─ factory-management.js   : Pure analysis / challenge / planner logic
├─ feature-pack.js          : Browser integration / management UI / quick-build
└─ factory-management.css  : Management UI styles

scripts/
└─ factory-management.test.mjs
```

The pack intentionally does not replace `game.js` production/economy logic.

## Phase 1 Progression Rank / Research — 2026-09-05

### Added

- `progressionRank` 1〜7を保存できるProgression Data構造
- Phase 1のPlayable Rank Up:
  - Rank 1 → 2
  - Rank 2 → 3
- 必須目標 + 選択目標2つ方式
- Directional Conveyor Routeを使った必須Line判定
- Rank 2 Unlock:
  - Smelter
  - Storage
  - Research Tier 2
  - Research Data +1
- Rank 3 Reward:
  - Research Data +2
  - Exploration Research入口
- Research:
  - `Basic Fabrication` — Rank 2 / Data 1 / Iron Plate Hand Craft unlock
  - `Scrap Yard Survey` — Rank 3 / Blueprint必須のSpecial Research入口
- Blueprint未発見Researchの拒否
- HUD右上`RANK`表示
- Rank Goal / Research専用Panel
- Rank未到達Build option / Quick BuildのGuard
- Research未完了Iron Plate CraftのGuard
- Achievement由来`FACTORY RANK`表示をUI上`FACTORY TITLE`へ分離

### Legacy Save Compatibility

旧Saveに`progression`がない場合は現在Dataから最低進行を推定する。

- Smelter使用Evidence → Rank 2相当 / Smelter Legacy Unlock
- Storage使用Evidence → Rank 2相当 / Storage Legacy Unlock
- Directional Iron Line成立 → Rank 3相当
- Iron Plate / Tool Kit Craft使用Evidence → `Basic Fabrication`完了扱い
- Existing Achievementは削除せず、Progression Rankとは分離
- Existing Factory Layout / Building ID / Economy / Inventoryを初期化しない

Root Save Schema Versionは`1`を維持し、Scrap Factory内部へ`progression.version: 1`を追加した。

### Runtime Integration

既存`game.js`のProduction / Conveyor Loopへ大規模変更を入れないため、Progressionは独立Moduleとして追加した。

```text
games/scrap-factory/
├─ progression.js       : Pure Rank / Research / Legacy logic
├─ progression-ui.js    : HUD / Panel / Build-Craft unlock guards
└─ progression.css      : UI styles

scripts/
└─ progression.test.mjs
```

Rank Up / Research確定時はProgressionだけRoot Saveへ書き込み、Page Reload前に既存`game.js`の最後のSave後へProgressionを再Mergeする。Reload後は通常Saveとして読み込む。

### Regression Coverage

`scripts/progression.test.mjs`:

- Rank 1 Directional Line判定
- RevenueだけではRank Up不可
- Mandatory + Optional 2件でRank 2
- Full Iron LineでRank 3
- Research Data Reward
- Basic Fabrication Research
- Blueprint Gate
- Legacy Smelter / Storage / Craft migration

`npm run validate`にもProgression Testを追加した。

## Save / Compatibility

Core game save:

- Root key: `elitemay-game-hub-v1`
- Root Schema Version: `1`
- Progression internal Version: `1`

Factory Management preferences:

- key: `scrap-factory-management-v1`
- challenge unlock IDs
- pinned challenge ID
- planner target/rate

Phase 1ではRoot Schema Versionを上げず、旧SaveをNormalizeして不足Progressionを補完する。

## Validation

### Automated

- JavaScript syntax baseline
- JSON parse baseline
- Local HTML ref validation
- Required project files
- Directional logistics regression tests
- Factory management regression tests
- Progression regression tests

PR / CI結果は最終Merge前に確認する。

### Browser / Visual

未確認:

- Progression HUDの実ブラウザ位置
- Rank / Research PanelのPointer Lock復帰
- Rank Locked Build optionの実クリック
- Research後Reloadを含む一連の操作
- Legacy Save実データでのMigration

Static CI成功をBrowser Validationへ読み替えない。

## Known Limits / Next Large Features

Not yet implemented:

- Rank 4以降のProgression
- Blueprint取得元になる独立探索Area
- Power generation / power demand
- Splitter / merger
- Conveyor throughput tiers
- More automated recipes / assembler
- New exploration areas
- Combat / weapons / enemies
- Authored external 3D assets

次の大規模Gameplay Phaseは **Phase 2: Power / Logistics / Production Expansion**。現在のSave / Directional Conveyor / Progression Rank Contractを維持して進める。

## Requirements Planning Update — 2026-09-05

`Scrap Factory` の長期要件を詳細化し、`REQUIREMENTS.md` をゲーム内容・進行・探索・自動化に関する正本として拡張した。

主な確定内容:

- Rank 1〜7を必須目標 + 選択目標方式で進行
- Rank / Research / Explorationの役割分担
- Factoryと現行Scrap Yardは同一Sceneを維持
- 廃住宅街 / 廃工場 / 軍事施設 / 崩壊した研究施設は独立探索Scene
- Slot + Weight Backpack / Secure Case
- 軽い戦闘 / HP / 探索失敗Contract
- Research / Blueprint / Research Data
- Power / Generator / Battery
- Splitter / Merger / Smart Sorter / Priority / Overflow / Conveyor Tier
- Assembler / Fabricator / Recipe階層
- Droneによる発見済み通常Resource Pointの自動回収
- Economy / Optional Order / Factory Expansion
- Build Move / Upgrade / Quick Build / Elevated Logistics / 小規模Blueprint
- Factory Management / Alerts / Planner / Bottleneck確認
- Challenge / Achievement
- Tutorial / UI / Difficulty / Accessibility
- Save / Exploration Session / Backup / Migration
- Mega Factory / Main Clear / Clear後Optimization
- Browser向けPerformance / Scale Target

現行実装のPlayable MVP、Root Save Schema Version 1、Directional Conveyor Contract、2.5m Grid、Factory座標系は変更していない。
