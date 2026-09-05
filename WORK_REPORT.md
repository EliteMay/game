# Work Report

Date: 2026-09-05

## Current Milestone

`Scrap Factory` は **Phase 4-B: Smart Sorting / Factory Diagnostics** まで実装。

通常GameplayのRank Upは **Rank 1 → 6** まで接続済み。

Phase 4-Aで廃工場・Advanced Assembly・Assemblerまで接続した後、Phase 4-Bでは既存Directional LogisticsとFactory Managementを壊さず、Rank 5の工場最適化機能を追加した。

```text
Rank 5
→ 廃工場 / Advanced Assembly
→ Assembler自動ライン
→ Smart Sorterによるカテゴリ分類
→ Production Statistics / Bottleneck Detection
→ Rank 6
```

Priority / OverflowとConveyor Mk.3はRank 6以降の要件なので今回のSliceには含めない。

---

## Implemented

### 1. Smart Sorter

追加Building:

- `smart_sorter`
- Rank 5
- Cost `$180`
- Throughput `3 items/sec`
- Rear 1 input

固定分類:

```text
advanced            → Forward
processed / product → Left
raw                 → Right
```

現在は任意Item Filterを設定するProgrammable Sorterではない。

### 2. Item-aware Directional Routing

`logistics.js` の同じDirectional Route graphを拡張し、`findDirectionalRoutes()` が現在運ぶ `itemId` をSmart SorterのPort選択へ渡す。

既存Contract:

- Conveyor Mk.1 / Mk.2 direction
- Legacy Conveyor corner
- Splitter Round-robin
- Merger Port
- Route throughput

は維持している。

Smart Sorter用に別物流Graphは作っていない。

### 3. Rank 5 Unlock Gate

`progression-phase4b.js` を追加。

- Smart Sorter required Rank = 5
- Research requirementなし
- 既存 `progression.js` Import pathを維持
- 既存Rank 1→6の定義は変更しない

Requirements上のSmart Sorter LineはRank 5 Optional候補だが、既にPlayableなRank 5 Optional setを今回勝手に置換しない。

### 4. Production Statistics

`analyzeFactory()` にDerived production snapshotを追加。

- 理論生産能力 / 分
- 有効Routeで処理できる生産量 / 分
- Machine稼働率
- Smart Sorter設置数
- Bottleneck count

これらは現在のRecipe / Building / Routeから毎回導出し、Saveへ保存しない。

### 5. Bottleneck Detection

追加Detection:

- Output 2個以上滞留 + 搬送先なし
- Route transport rate < Machine theoretical rate
- Storage full
- Storage 85%以上の容量逼迫
- Power shortage
- Logistics output missing
- Smart Sorter分類Lane不足

Storage full / Output stall / Power shortageを明確なBottleneckとして扱う。

現行Recipeは単体Machineの生産速度がConveyor Mk.1より遅いため、純粋なBelt帯域不足は将来の高速Recipe拡張で意味が大きくなる。

### 6. Factory Management UI

`phase4b-management-ui.js` を追加し、既存Factory Management consoleへ:

- 理論生産能力
- 搬送対応能力
- Machine稼働率
- Smart Sorter数
- 生産統計・ボトルネック一覧

を追加。

既存 `feature-pack.js` の大規模書き換えを避け、Factory Managementの既存UIを保持したまま拡張している。

### 7. Smart Sorter Visual

`world-runtime.js` に専用Procedural visualを追加。

- Center scanner body
- 3-direction cross lane
- category別Lane marker
- Forward / Left / Right arrow

Splitter / Mergerの見た目をそのまま流用しない。

---

## Compatibility / Contracts Preserved

- Root Save Schema 1
- Progression Schema 1
- Exploration Schema 1
- `elitemay-game-hub-v1`
- Existing Factory Layout
- 2.5m Build Grid
- Factory coordinate system
- Visual Logistics direction = Runtime direction
- Quick Build 1〜5 order
- Existing Rank 1 → 6 behavior
- Splitter / Merger behavior
- Storage Back Pressure / no item loss
- Power shortage state preservation
- GitHub Pages relative paths

Smart Sorterには保存が必要なFilter stateを追加していないためSchema変更なし。

---

## Regression Coverage

追加:

- `scripts/phase4b.test.mjs`

確認内容:

- Smart Sorter throughput = 3
- Advanced → Forward
- Processed / Product → Left
- Raw → Right
- 3方向Networkで実際に正しいSellerへRoute解決
- Rank 4ではSmart Sorter locked
- Rank 5でunlocked
- Production statistics生成
- Smart Sorter count
- Full Storage bottleneck detection

`npm run validate` にPhase 4-B regressionを組み込んだ。

---

## CI

実装Head:

```text
f588480dd94fe27bfd38417d4427231efa5cc446
Validate Web Game / run #78
result: success
```

この結果には既存Regressionと新しいPhase 4-B testが含まれる。

Documentation更新後の最終Headでも再度CIを確認する。

---

## Not Yet Verified

Static CIでは次を保証できない。

- 実ブラウザPointer Lock
- Smart Sorter Build Previewの見え方
- 3色Lane marker / arrowの一人称可読性
- Smart Sorter collider / placement feel
- Factory Management追加Cardsの実ブラウザ表示タイミング
- WebGL FPS / draw cost

これらはBrowser Validation対象。

---

## Remaining Work

### Phase 4 Visual / Polish

- Hybrid Asset Foundation継続
- Industrial Area visual density / hazard polish
- Browser visual / FPS review

### Rank 6+

- 軍事施設
- Conveyor Mk.3
- Priority / Overflow Logistics
- Advanced Power
- Military Research
- Drone Research / automated resource collection

Phase 4-BでSmart Sorter / Production Statistics / Bottleneck Detectionは実装したが、Rank 6以降のAdvanced Logisticsまで完了した扱いにはしない。
