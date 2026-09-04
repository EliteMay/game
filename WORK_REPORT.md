# Work Report

Date: 2026-09-04

## Scope

`EliteMay/game` のGame HubとGame 01 `Scrap Factory`を、Playable MVPからSteam掲載相当を目標に継続改善。

現在までの主要段階:

1. Playable MVP
2. Visual Foundation V2
3. Runtime visual regression fix
4. Directional logistics / 操作説明改善
5. Factory Management Pack

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
- Factory rank derived from achievements
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

New files:

```text
games/scrap-factory/
├─ factory-management.js   : Pure analysis / challenge / planner logic
├─ feature-pack.js          : Browser integration / management UI / quick-build
└─ factory-management.css  : Management UI styles

scripts/
└─ factory-management.test.mjs
```

The pack intentionally does not replace `game.js` production/economy logic.

## Save / Compatibility

Core game save remains:

- Root key: `elitemay-game-hub-v1`
- Schema Version: `1`

Factory Management preferences are stored separately:

- key: `scrap-factory-management-v1`
- challenge unlock IDs
- pinned challenge ID
- planner target/rate

No existing factory layout, building ID, inventory, economy or player data is migrated for this pack.

## Validation

### Automated

- JavaScript syntax baseline
- JSON parse baseline
- Local HTML ref validation
- Required project files
- Directional logistics regression tests
- Factory management regression tests
  - challenge completion
  - dead-end conveyor alert
  - blocked machine-output alert
  - production-plan back calculation

PR #4 CI:

- `project-contract`: Pass
- reusable `baseline / baseline`: Pass

### Browser / Visual

- Existing published game has prior user playtest evidence.
- Factory Management Pack browser/pointer-lock/layout confirmation is pending the merged GitHub Pages build.
- Static CI success is not treated as browser validation.

## Known Limits / Next Large Features

Not yet implemented:

- Research / technology tree with gameplay unlocks
- Power generation / power demand
- Splitter / merger
- Conveyor throughput tiers
- More automated recipes / assembler
- New exploration areas
- Combat / weapons / enemies
- Authored external 3D assets

Next large gameplay phase should prioritize **Research + Power + new production chain**, while preserving the current save and directional-logistics contracts.

## Requirements Planning Update — 2026-09-05

`Scrap Factory` の長期要件を詳細化し、`REQUIREMENTS.md` をゲーム内容・進行・探索・自動化に関する正本として拡張した。

今回確定 / 詳細化した主な内容:

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

この更新は**要件定義のみ**であり、上記の長期機能が実装済みになったことを意味しない。

現行実装のPlayable MVP、Save Schema Version 1、Directional Conveyor Contract、2.5m Grid、Factory座標系は変更していない。
