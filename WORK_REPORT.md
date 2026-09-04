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

## Current Gameplay

- Three.js first-person 3D world
- Scrap Yard + Factory Base
- Scrap collection / respawn
- 12-slot backpack
- Direct selling
- Free building on 2.5m grid
- Hopper / Seller / Crusher / Smelter / Conveyor / Storage
- Rank 4 Power definitions: Scrap Generator / Power Pole
- Directional conveyor transport
- Conveyor rotation / reverse after placement
- Safe dismantle mode with full build-cost refund
- Machine input/output buffers and processing cycles
- Hand crafting
- Cash / Revenue
- Tutorial contract / free-play transition
- Progression Rank 1 → 2 → 3
- Research Data / Research unlock
- Rank 4 Power Core for future progression connection
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
- Purpose-specific machine silhouettes for existing Phase 1 machines
- Interaction marker / head bob / sprint FOV
- Static scenery collision with build placement

Phase 2-AのScrap Generator / Power PoleはCore先行で、専用Silhouetteは後続Visual pass。Generic fallback geometryのまま完成扱いしない。

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
- Production Planner
- Searchable Codex
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
- Phase 1のPlayable Rank Up: Rank 1 → 2 / Rank 2 → 3
- 必須目標 + 選択目標2つ方式
- Directional Conveyor Routeを使った必須Line判定
- Rank 2 Unlock: Smelter / Storage / Research Tier 2 / Research Data +1
- Rank 3 Reward: Research Data +2 / Exploration Research入口
- Research: `Basic Fabrication` / `Scrap Yard Survey`
- Blueprint未発見Researchの拒否
- HUD右上`RANK`表示
- Rank Goal / Research専用Panel
- Rank未到達Build option / Quick BuildのGuard
- Research未完了Iron Plate CraftのGuard
- Achievement由来`FACTORY RANK`表示をUI上`FACTORY TITLE`へ分離

### Legacy Save Compatibility

- Smelter使用Evidence → Rank 2相当 / Smelter Legacy Unlock
- Storage使用Evidence → Rank 2相当 / Storage Legacy Unlock
- Directional Iron Line成立 → Rank 3相当
- Iron Plate / Tool Kit Craft使用Evidence → `Basic Fabrication`完了扱い
- Existing Achievementは削除せず、Progression Rankとは分離
- Existing Factory Layout / Building ID / Economy / Inventoryを初期化しない

Root Save Schema Versionは`1`を維持し、Scrap Factory内部へ`progression.version: 1`を追加した。

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

## Phase 2-A Power Core — 2026-09-05

### Added

- `games/scrap-factory/power.js`
- Power activation: `progressionRank >= 4`
- Rank 1〜3 legacy no-power compatibility
- Starter Grid:
  - 55 Power
  - Factory中心から17.5m coverage
- Scrap Generator:
  - Rank 4 unlock
  - `$260`
  - 鉄くず1個 / 24秒
  - +80 Power
- Power Pole:
  - Rank 4 unlock
  - `$45`
  - 12.5m link range
  - 10m consumer coverage
- Crusher 18 Power / Smelter 30 Power
- Shortage時は給電不足Machineだけ停止
- 停止中もInput / Output / processing progressを保持
- Fuel供給でPower回復後に自動再開
- Machine PanelでGeneration / Demand / Fuel / Coverage / Shortage reasonを表示
- Power status transition toast
- Generator燃焼途中を`building.powerFuelSeconds`へ保存
- Build / Craft unlockを`game.js` coreでも再検証
- GeneratorへManual deposit / Directional Conveyor fuel supplyの両方を許可

### Compatibility

- Root Save key: `elitemay-game-hub-v1`
- Root Schema Version: `1`
- 旧Buildingに`powerFuelSeconds`がなくても`0`へNormalize
- Power snapshot自体はSaveしない
- Rank 1〜3の既存ProductionはPower導入前と同じ挙動
- Conveyor / Storage / SellerはPhase 2-AではPassive

### Regression Coverage

`scripts/power.test.mjs`:

- Rank 3以前はPower無効
- Rank 4 small factoryはStarter Gridで維持
- Demand超過でShortage
- FuelなしGeneratorは発電なし
- Generator fuel consumption / Recovery
- 遠隔Machine coverage判定
- Pole chain coverage extension
- Power calculationによるBuffer非破壊
- Deterministic allocation

`npm run validate`へPower testとRuntime integration markerを追加。

### Phase 2-A Remaining Browser / Visual Validation

未確認:

- Rank 4 SaveでGenerator / Power Poleを実際に建築する操作
- Generatorへ鉄くず投入 → 発電 → Fuel消費 → 自動再給油
- Power shortage → Machine停止 → Recoveryの実時間挙動
- Power Poleの配置距離とMachine Panel表示の理解しやすさ
- Pointer Lock復帰
- Generator / Power Pole専用Visual（まだ未実装）

Static CI成功をBrowser ValidationやVisual完成へ読み替えない。

## Save / Compatibility

Core game save:

- Root key: `elitemay-game-hub-v1`
- Root Schema Version: `1`
- Progression internal Version: `1`
- Optional building field: `powerFuelSeconds`

Factory Management preferences:

- key: `scrap-factory-management-v1`
- challenge unlock IDs
- pinned challenge ID
- planner target/rate

Phase 1 / Phase 2-AではRoot Schema Versionを上げず、旧SaveをNormalizeして不足Fieldを補完する。

## Validation

### Automated

- JavaScript syntax baseline
- JSON parse baseline
- Local HTML ref validation
- Required project files
- Directional logistics regression tests
- Factory management regression tests
- Progression regression tests
- Power regression tests

PR / CI結果は最終Merge前に確認する。

### Browser / Visual

継続未確認:

- Progression HUDの実ブラウザ位置
- Rank / Research PanelのPointer Lock復帰
- Rank Locked Build optionの実クリック
- Research後Reloadを含む一連の操作
- Legacy Save実データでのMigration
- Power Coreの実時間操作項目

## Known Limits / Next Large Features

Not yet implemented:

- Rank 4への自然なProgression path
- Blueprint取得元になる独立探索Area
- Splitter / Merger
- Conveyor Mk.2 / throughput tiers
- Battery基盤
- Storage拡張
- Phase 2新Recipe / Assembler
- Factory Management Power専用Dashboard / persistent Alert
- Scrap Generator / Power Pole dedicated visual
- New exploration areas
- Combat / weapons / enemies
- Authored external 3D assets

次の実装Sliceは **Phase 2-B: Logistics Expansion** を基本とし、Splitter / Merger / Conveyor Mk.2 / Throughputを既存Directional Conveyor Contractの上へ追加する。

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
