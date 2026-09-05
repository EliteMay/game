# Specification

Updated: 2026-09-05

この文書は現在実装されている `Scrap Factory` の技術仕様を記録する。将来要件は `REQUIREMENTS.md` をSource of Truthとし、未実装要件を実装済みとして扱わない。

## 1. Current Playable Scope

通常Gameplayは **Rank 1 → 6** まで接続済み。

```text
Factory / Scrap Yard
→ Rank 1-3 Production
→ Residential Exploration
→ Rank 4 Advanced Logistics / Power
→ Rank 5
→ Abandoned Factory Exploration
→ Advanced Assembly
→ Assembler automated line
→ Smart Sorter / Factory Diagnostics
→ Rank 6
```

現在は **Phase 4-B**。

実装済みPhase 4要素:

- 廃工場独立探索Area
- Generator / Control Room復旧
- Service Shortcut
- Guaranteed Assembly Blueprint
- Electrical Environment Hazard
- Circuit / Motor / Control Unit
- Advanced Assembly Research
- Assembler
- Rank 5 → 6 progression
- Smart Sorter
- Production Statistics拡張
- Bottleneck Detection拡張

未実装:

- Priority / Overflow
- Conveyor Mk.3
- Advanced Power
- 軍事施設以降のRank 6+ gameplay
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
├─ feature-pack.js
├─ progression.js
│  ├─ progression-core.js
│  └─ progression-phase4b.js
├─ progression-ui.js
│  └─ progression-ui-v2.js
├─ exploration.js
│  └─ exploration-core.js
└─ exploration-ui.js
   └─ exploration-ui-v2.js
```

Compatibility entrypointは既存Import pathを維持する。

`world-runtime.js` はVisual Layerであり、Save / Production / LogisticsのSource of Truthにはしない。

---

## 3. Save Contract

```text
localStorage key: elitemay-game-hub-v1
Root Save Schema: 1
Progression Schema: 1
Exploration Schema: 1
```

Phase 4-BでもSchema変更なし。

保存する必要があるBuilding Runtime state:

- `input`
- `output`
- `progress`
- `rotation`
- `powerFuelSeconds`
- `powerStored`
- `logisticsCursor`

保存しないDerived Data:

- Directional route graph
- route throughput
- Power snapshot
- Factory production statistics
- Bottleneck alert snapshot
- Rank topology result

Smart Sorterは固定カテゴリルールのため専用Filter設定を保存しない。

---

## 4. Spatial / Compatibility Contract

- Build Grid: `2.5m`
- Factory座標系を維持
- 既存LayoutをMigrationで削除しない
- Visual Logistics direction = Runtime direction
- Quick Build 1〜5の既存順序を維持
- Relative PathでGitHub Pagesから動作

---

## 5. Directional Logistics

Source of Truth: `logistics.js`

| Node | Throughput | Input | Output |
| --- | ---: | --- | --- |
| Conveyor Mk.1 | 1.5/s | 基本1 | Forward |
| Conveyor Mk.2 | 3.0/s | 基本1 | Forward |
| Splitter | 3.0/s | Rear | Forward / Left / Right |
| Merger | 3.0/s | Rear / Left / Right | Forward |
| Smart Sorter | 3.0/s | Rear | Item categoryで1方向 |

### Smart Sorter

Rank 5でBuild可能。

Facing方向を基準に:

```text
advanced            → Forward
processed / product → Left
raw                 → Right
```

現在はProgrammable Filterではない。

`findDirectionalRoutes()` は探索中の `itemId` を各Logistics Nodeへ渡し、Smart SorterだけItem categoryに応じて出力Portを1本へ制限する。

Route throughputは経路上の最小Logistics throughput。

SplitterのRound-robinと既存Conveyor corner compatibilityは維持する。

---

## 6. Power

PowerはRank 4から有効。

| Device | Value |
| --- | --- |
| Starter Grid | 55 Power |
| Scrap Generator | 80 Power |
| Battery | 960 Energy / charge 60 / discharge 80 |
| Crusher | 18 Power |
| Smelter | 30 Power |
| Assembler | 50 Power |

不足時はMachine Input / Output / Progressを破壊しない。

---

## 7. Storage / Back Pressure

- Small Storage: 120
- Industrial Storage: 600
- Full Targetへ新Itemを移送しない
- Target受入確認前にSource Outputを減らさない
- Legacy over-capacity stateの既存Itemを削除しない

---

## 8. Production

```text
Metal Scrap
→ Crusher / 2.2 sec
→ Crushed Metal
→ Smelter / 3.0 sec
→ Iron Ingot
```

Advanced Hand Craft after `advanced_assembly`:

```text
Copper Wire ×2 + E-Waste ×1 + Plastic ×1 → Circuit ×1
Iron Ingot ×2 + Copper Wire ×2 → Motor ×1
```

Assembler:

```text
Motor ×1 + Circuit ×2 + Plastic ×1
→ 8 sec / 50 Power
→ Control Unit ×1
```

---

## 9. Factory Diagnostics

Source: `factory-management.js`

`analyzeFactory(game)` は現在のFactory stateから毎回導出する。

Production snapshot:

- `theoreticalPerMinute`
  - 各Recipeの `output amount × 60 / seconds` 合計
- `routeSupportedPerMinute`
  - Machine outputに有効Routeがある場合、Machine theoretical rateとRoute transport rateの小さい方を合計
- `utilization`
  - ready / processing Machine ÷ production Machine count
- `bottleneckCount`
- `smartSorters`

Bottleneck / Capacity alerts:

- Machine outputが2個以上滞留し、有効Routeなし
- Route transport rateがMachine theoretical output rate未満
- Storage full
- Storage 85%以上はcapacity pressure info
- Power shortage
- Logistics output missing
- Smart Sorterの3分類Lane不足はconfiguration info

現行Recipe速度ではConveyor Mk.1でも単体Machineより速いケースが多いため、物流帯域不足Alertは将来の高速Recipe / 多段拡張向けでもある。Belt segment occupancyや物理Queue Simulationはまだ実装しない。

### Management UI

`phase4b-management-ui.js` が既存Factory Management consoleへ次を追加する。

- 理論生産能力
- 搬送対応能力
- Machine稼働率
- Smart Sorter数
- Bottleneck一覧

診断値はSaveへ保存しない。

---

## 10. Progression / Research

`PLAYABLE_MAX_RANK = 6`

Smart Sorter:

- required Rank: 5
- Research requirement: なし
- `progression-phase4b.js` が既存Progression entrypointを壊さず追加Gateを提供

Advanced Assembly:

```text
requiredRank: 5
researchDataCost: 2
requiredBlueprint: abandoned_factory_assembly_blueprint
```

Rank 5 → 6 Mandatory:

1. Industrial Main Objective complete
2. Advanced Assembly researched
3. Assembler automated line complete

Smart Sorterは現在のRank 5→6 Mandatoryには追加しない。`REQUIREMENTS.md` 上ではOptional候補であり、既存Optional setを破壊的に変更しない。

---

## 11. Exploration

### Residential — Rank 3

- 12-slot Expedition Pack
- Fuse → Power → Survey
- Normal ReturnでDepot確定
- AbandonでCurrent Session Lootのみ失う

### Industrial — Rank 5

```text
Generator Restore
→ Control Room Online
→ Blueprint Recovery
```

Optional Service Shortcut。

Completion reward:

- `abandoned_factory_assembly_blueprint`
- Research Data +2
- `industrial-electronics-cache`

---

## 12. Visual Layer

Visual directionは `REQUIREMENTS.md` の Stylized Industrial Realism / Hybrid Asset方針に従う。

Phase 4-B:

- Smart SorterはSplitter / Mergerの単純流用ではなく専用Center scannerと3色Lane markerを持つ
- Forward / Left / Rightの3方向をVisual arrowで表示
- VisualはGameplay routing ruleの向きと一致させる

Procedural visualは現段階のGameplay-readable implementationであり、Final Hybrid Asset Foundationではない。

---

## 13. Validation

`npm run validate`

Static CI:

- JS/MJS syntax
- JSON parse
- local HTML refs
- Directional Logistics regression
- Factory Management regression
- Progression Rank 1→6
- Power
- Storage / Back Pressure
- Residential / Industrial Exploration
- Phase 4-B Smart Sorter category routing
- Smart Sorter Rank 5 Gate
- Production statistics / bottleneck regression
- required runtime markers

Static CIで保証しない:

- Pointer Lock操作感
- WebGL FPS
- Collider / visual一致
- Smart SorterのBuild Preview / 一人称可読性
- Factory Management追加UIの実ブラウザ表示タイミング
