# Work Report

Date: 2026-09-05

## Current Milestone

`Scrap Factory` は **Phase 5-B: Conveyor Mk.3 / Priority / Overflow Logistics** まで実装。

通常GameplayのRank Upは **Rank 1 → 7** まで接続済み。

Phase 5-Aで軍事施設・Drone Control・Drone Port自動回収を接続した後、Phase 5-BではRank 6の正式解放要件である高速物流と優先分岐を既存Directional Logisticsへ追加した。

```text
Rank 6
→ Conveyor Mk.3
→ Priority Splitter
→ Overflow Splitter
→ Storage優先 / 余剰販売Line
→ Drone / Advanced Productionの高帯域物流へ利用
→ Rank 7
```

複数Drone Route / Advanced Power / Logistics Warehouseは今回のSliceには含めない。

---

## Implemented

### 1. Conveyor Mk.3

追加Building:

- `conveyor_mk3`
- Rank 6
- Cost `$55`
- Throughput `6 items/sec`
- 通常Conveyorと同じDirectional Forward搬送
- 電力不要

Mk.1 / Mk.2と同じ既存Directional Contractを使い、Route throughputは経路上の最小値で決まる。

### 2. Priority Splitter

追加Building:

- `priority_splitter`
- Rank 6
- Cost `$260`
- Throughput `6 items/sec`
- Rear 1 input
- Forward = Priority
- Left / Right = Backup

挙動:

```text
Forward Routeが受入可能
→ Forwardだけ使用

Forward Routeが詰まる / Targetが受入不可
→ Left / Right Backupへ切替
→ Backup同士は従来どおりRound-robin
```

### 3. Overflow Splitter

追加Building:

- `overflow_splitter`
- Rank 6
- Cost `$240`
- Throughput `6 items/sec`
- Rear 1 input
- Forward = Main
- Right = Overflow
- Left outputなし

代表的な用途:

```text
Production
→ Overflow Splitter
├─ Forward → Industrial Storage
└─ Right   → Seller
```

Storageに空きがある間はSellerへ流さず、Storageが満杯等で受入不可になった場合のみRight Overflowへ送る。

### 4. Priority-aware Directional Routing

`logistics.js` の既存Route graphを拡張した。

各RouteにDerived `priority` costを追加:

- 通常Logistics: `0`
- Priority Forward: `0`
- Priority Left / Right: `+1`
- Overflow Forward: `0`
- Overflow Right: `+2`

複数Routerを通るRouteではcostを加算する。

`selectDirectionalRoute()` は最小Priorityの現在利用可能Routeだけを選び、その同Priority集合の中で既存`logisticsCursor`を使ってRound-robinする。

このため通常Splitterの3方向Round-robinは変更していない。

### 5. Back Pressure / No Item Loss

Priority / Overflowも既存`canReceiveItem()` / Storage capacity判定を利用する。

Targetが受入不可ならRoute候補から外れ、別Priority Routeへfallbackする。

既存Contractどおり:

- Target受入確認前にSource Outputを減らさない
- Storage Full時にItemを消失させない
- Legacy over-capacity Storageの既存Itemを削除しない

### 6. Rank 6 Unlock Gate

`progression-phase5b.js` を追加。

```text
conveyor_mk3      → Rank 6
priority_splitter → Rank 6
overflow_splitter → Rank 6
```

追加Researchは要求しない。

既存Phase 5-A Progressionを包む形にし、Drone PortのResearch GateやRank 1→7定義を保持した。

### 7. Dedicated Visuals

`world-runtime.js` にPhase 5-B専用Visualを追加。

Conveyor Mk.3:

- Mk.2より強い二重Rail表現
- 4つのForward arrow
- 高帯域Tierを識別しやすいaccent

Priority Splitter:

- Forward Priority laneを強調
- Left / Right Backupを副表示

Overflow Splitter:

- Forward Main
- Right Overflow
- Left laneを描かない

Visual port方向とRuntime `logisticsOutputKeys()` を一致させている。

---

## Compatibility / Contracts Preserved

- `elitemay-game-hub-v1`
- Root Save Schema 1
- Progression Schema 1
- Exploration Schema 1
- Existing Factory Layout
- 2.5m Build Grid
- Factory coordinate system
- Quick Build 1〜5 order
- Existing Rank 1 → 7 behavior
- Conveyor Mk.1 / Mk.2 behavior
- Existing Splitter Round-robin
- Merger behavior
- Smart Sorter category routing
- Drone Port Research Gate
- Storage Back Pressure / no item loss
- Power shortage state preservation
- GitHub Pages relative paths

Phase 5-BのRoute Priorityは現在Topologyから毎回導出し、Saveへ新しい設定値を追加していないためSchema変更なし。

---

## Regression Coverage

追加:

- `scripts/phase5b.test.mjs`

確認内容:

- Conveyor Mk.3 throughput = 6
- Priority Splitter throughput = 6
- Overflow Splitter throughput = 6
- Rank 5では3設備Lock
- Rank 6で3設備Unlock
- Mk.3のみのRoute = 6 items/sec
- Priority Forward routeが常に優先
- Forward unavailable時にBackupへfallback
- Backup同Priority RouteはRound-robin
- OverflowはForward + Rightだけ
- Main Storage受入可能中はOverflow Sellerへ送らない
- Main Storage受入不可時だけOverflow Sellerへ切替

既存Regressionも同じValidatorで継続実行する。

---

## CI

実装・Visual・Regression Head:

```text
f818e8fbab7420f06abb18ecb8f31549a940af8b
Validate Web Game / run #91
result: success
```

この結果には既存Directional Logistics / Factory Management / Rank 1→7 / Power / Storage / Residential / Industrial / Military / Phase 4-B / Phase 5-Aと、新しいPhase 5-B testが含まれる。

Documentation同期後の最終Headでも再度CIを確認する。

---

## Not Yet Verified

Static CIでは次を保証できない。

- 実ブラウザPointer Lock
- Conveyor Mk.3 Build Previewの見え方
- Priority / Overflow arrowの一人称可読性
- Priority / Overflow設備のplacement / collider feel
- 高帯域Packet増加時のWebGL FPS
- Machine Panelの新Router説明はConfig / Visualより簡略表示になっているため、実利用時の説明量

これらはBrowser / User Validation対象。

---

## Remaining Work

### Phase 5-C候補

- 複数Resource PointのDrone Route設定
- Drone assignment / route management UI
- Advanced / Industrial Generator
- Power Tier拡張
- Logistics Warehouse
- Storage in-place upgrade

### Rank 7 / Final Chapter

- 崩壊した研究施設
- Robotics / Materials / Energy Lab
- Fabricator
- Advanced Drone
- Experimental Power
- Autonomous Industrial Core
- Mega Factory / Main Clear

Phase 5-BでRank 6 Logisticsの主要3機能は実装したが、Phase 5全体やRank 7 Final Chapterまで完了した扱いにはしない。
