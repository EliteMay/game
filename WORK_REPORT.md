# Work Report

Date: 2026-09-05

## Current Milestone

`Scrap Factory` は **Phase 4-A: Abandoned Factory / Advanced Assembly** まで実装。

通常GameplayのRank Upは現在 **Rank 1 → 6** まで接続済み。

今回の作業開始前はPhase 3-B / Rank 5 capだった。`REQUIREMENTS.md` のPhase 4要件を確認し、破壊的変更を避けるため、Phase 4全体を一括実装せず次のVertical Sliceへ分割した。

```text
Rank 5
→ 廃工場探索
→ Generator復旧
→ Control Room復旧
→ Assembly Blueprint回収
→ Advanced Assembly研究
→ Circuit / Motor製作
→ Assembler自動ライン
→ Rank 6
```

Smart Sorter / Production Statistics拡張 / Bottleneck Detection拡張はPhase 4-B以降へ残す。

---

## Implemented

### 1. Save-compatible Advanced Items

追加:

- `circuit`
- `motor`
- `control_unit`

Root Save / Progression / ExplorationのSchema番号は変更していない。

旧SaveではNormalize時に新Itemを0、新Industrial Areaを未進行として補完する。

### 2. Multi-area Exploration Core

既存Import pathを壊さないため:

- `exploration.js` → compatibility entrypoint
- `exploration-core.js` → shared persistent/session logic
- `exploration-ui.js` → compatibility entrypoint
- `exploration-ui-v2.js` → multi-area Transport Terminal UI

Residentialの既存Objective / reward / return / abandon contractは維持。

### 3. Abandoned Factory

追加Page:

- `exploration/industrial.html`
- `exploration/industrial.css`
- `exploration/industrial.js`

構成:

- Arrival Bay
- Generator Hall
- Assembly Floor
- Control Room
- Service Shortcut
- Electrical Arc Hazard
- Industrial Loot
- Transport return pad

Main Objective:

```text
Generator Restore
→ Control Room Online
→ Blueprint Recovery
```

Service ShortcutはControl Room復旧後のOptional。

Guaranteed completion reward:

- `abandoned_factory_assembly_blueprint`
- Research Data +2
- `industrial-electronics-cache`

Objective rewardは1回のみ。Abandonしても設備復旧 / 区画発見は保持し、今回拾った通常Lootだけ失う。

### 4. Advanced Assembly

追加Research:

- `advanced_assembly`
- Rank 5
- Research Data 2
- Abandoned Factory Blueprint必須

Unlock:

- Assembler
- Circuit Hand Craft
- Motor Hand Craft

追加Recipe:

```text
Motor ×1 + Circuit ×2 + Plastic ×1
→ Assembler / 8 sec
→ Control Unit ×1
```

Assembler:

- Cost `$420`
- Power 50
- Generic Production Runtimeを再利用

### 5. Rank 5 → 6

`PLAYABLE_MAX_RANK`を6へ拡張。

Mandatory:

- Industrial Main Objective complete
- Advanced Assembly researched
- Assembler automated line complete

Assembler line判定は既存Directional Logistics graphから導出する。

Recipeの全InputについてSource → Assembler Routeを要求し、Assembler → final Storage/SellerのControl Unit Routeも要求する。

Optionalから2つ:

- Motor発見
- Circuit発見
- Industrial StorageをBuffer利用
- Service Shortcut
- Assembler throughput 3.0

Progression専用Topology cacheは保存しない。

### 6. Visual Pass

Domain research後、新しい廃工場をResidentialの単純な色替えにせず、大きなランドマークで進路を作る構成にした。

Visual state:

- Generator offline / online
- Control Room offline / online
- Shortcut gate closed / opened
- Blueprint present / recovered
- Electrical Arc hazard

Assemblerには専用Procedural silhouetteを追加:

- industrial frame
- assembly chamber
- side module
- yellow operational marking
- status light
- active spinner

Save / Production logicからVisual Layerを分離したまま実装している。

---

## Compatibility / Contracts Preserved

- Root Save Schema 1
- Progression Schema 1
- Exploration Schema 1
- `elitemay-game-hub-v1`
- Existing Factory Layout
- 2.5m Build Grid
- Factory coordinate system
- Visual Conveyor direction = Runtime direction
- Existing Rank 1 → 5 behavior
- Residential Exploration behavior
- Quick Build 1〜5 order
- Storage Back Pressure / no item loss
- Power shortage state preservation
- GitHub Pages relative paths

---

## Regression Coverage

更新:

- `scripts/progression.test.mjs`

追加:

- `scripts/industrial-exploration.test.mjs`

ValidatorへIndustrial page / runtime / testを追加。

Coverage:

- Rank 1 → 6
- Rank 5でAssemblerをResearchなしでBuild不可
- Assembly Blueprint requirement
- Advanced Assembly unlock
- Assembler topology
- Rank 6 cap
- Industrial Rank gate
- Generator → Control dependency
- Blueprint reward exactly once
- Industrial normal return
- Industrial abandon
- Persistent facility progress
- Existing Residential regression
- Existing Logistics / Power / Storage / Factory Management regression

---

## CI

PR #11上でPhase 4-A実装Commit `f6806c502499990406c52c0bea07a4b8e65dec0b` に対する:

```text
Validate Web Game / run #70
result: success
```

Documentation更新後の最終CommitについてもMerge前に再検証する。

---

## Not Yet Verified

Static CIでは次を保証できない。

- 実ブラウザPointer Lock
- WASD / Interactionの操作感
- Industrial Area内の全Objectiveへの実到達性
- Electrical Arcの一人称可読性
- Generator Hall / Assembly Floor / Control Roomのランドマーク可読性
- Assemblerの実Build Preview / collider / first-person scale
- WebGL FPS / draw cost

これらはBrowser Validationが残る。

---

## Remaining Phase 4 / Next Work

`REQUIREMENTS.md` に残る主な未実装Phase 4要件:

- Smart Sorter
- Production Statistics拡張
- Bottleneck Detection拡張
- より高度なIndustrial Loot / Hazard / Visual density
- Hybrid Asset Foundationの継続

Rank 6以降:

- 軍事施設
- Conveyor Mk.3
- Priority / Overflow
- Advanced Power
- Military Research
- Drone Research entry

今回のPRを「Phase 4全部完了」とは扱わない。
