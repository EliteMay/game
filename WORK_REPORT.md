# Work Report

Date: 2026-09-05

## Current Milestone

`Scrap Factory` は **Phase 5-C: Configurable Drone Routes / Industrial Generator / Logistics Warehouse** まで実装。

通常GameplayのRank Upは **Rank 1 → 7** まで接続済み。

Phase 5-CはRank 6の横拡張で、Rank 6→7 Mandatory自体は変更していない。

```text
Rank 6
→ Military Facility / Drone Control
→ Drone Port
→ Conveyor Mk.3 / Priority / Overflow
→ Automation Console
→ 複数Resource Point Drone Route
→ Industrial Generator
→ Logistics Warehouse / in-place Upgrade
→ Rank 7
```

---

## Implemented

### 1. Configurable Drone Resource Point Routes

既存探索報酬のResource Pointを利用:

- `residential-copper-network`
- `industrial-electronics-cache`
- `military-alloy-cache`

Route definition:

| Resource Point | Output | Cycle | Capacity/min | Distance | Danger |
| --- | --- | ---: | ---: | ---: | ---: |
| Residential Copper Network | Copper Wire ×1 | 8s | 7.5 | 620m | 1 |
| Industrial Electronics Cache | E-Waste ×1 | 10s | 6 | 890m | 2 |
| Military Alloy Cache | Rare Alloy ×1 | 12s | 5 | 1180m | 3 |

Playerが攻略済みのResource Pointだけ選択できる。

### 2. Automation Console

`phase5c-automation-ui.js` を追加。

機能:

- Drone Port一覧
- PortごとのResource Point選択
- Output / Cycle / Capacity / Distance / Danger表示
- Industrial Storage一覧
- Logistics Warehouse Upgrade

Route変更時:

- `resourcePointId` 更新
- compatibility runtime type更新
- partial cycleだけ0へ戻す
- existing output buffer保持
- Save APIで保存
- 即ReloadでMemory stateと再同期

### 3. Legacy Drone Port Compatibility

Phase 5-Aの既存Drone Portは`resourcePointId`を持たない。

旧PortはMilitary Resource Pointが確保済みなら自動的に:

```text
military-alloy-cache
→ 12s
→ Rare Alloy
```

として解釈する。

Save Schemaは1のまま維持。

### 4. Rank 6→7 Mandatory Preservation

Copper / E-Waste Routeへ変更したPortだけでは、既存Rank 6→7 Mandatoryを満たさない。

Military Alloy Resource Pointへ割り当てられたDrone PortからFactory StorageへのDirectional Routeが必要。

Target Storageは:

- Small Storage
- Industrial Storage
- Logistics Warehouse

### 5. Industrial Generator

追加Building:

- `industrial_generator`
- Rank 6
- Cost `$680`
- 180 Power
- Metal Scrap ×1 / 24秒

既存Generator Runtimeを一般化し、別Power Simulationは作っていない。

### 6. Logistics Warehouse

追加Building:

- `logistics_warehouse`
- Rank 6
- Cost `$620`
- Capacity `1800`

既存Storage / Back Pressure helperを利用。

### 7. In-place Storage Upgrade

Industrial Storage → Logistics Warehouse:

```text
Upgrade Cost = $620 - $240 = $380
```

維持:

- Building ID
- x / z / rotation
- input / output
- existing items

撤去 / 再建を要求しない。

### 8. Visual Compatibility Layer

Phase 5-Bの検証済み`world-runtime.js`を:

- `world-runtime-phase5b.js`

として固定。

新`world-runtime.js`はPhase 5-C Wrapperとして次だけ追加:

- Copper Route Drone Port
- Electronics Route Drone Port
- Industrial Generator
- Logistics Warehouse

既存Mk.3 / Priority / Overflow / Drone Port VisualはBase側をそのまま利用する。

---

## Compatibility / Contracts Preserved

- `elitemay-game-hub-v1`
- Root Save Schema 1
- Progression Schema 1
- Exploration Schema 1
- Existing Factory Layout
- 2.5m Build Grid
- Factory coordinate system
- Quick Build 1〜5
- Rank 1→7
- Rank 6→7 Military Rare Alloy Mandatory
- Conveyor Mk.1 / Mk.2 / Mk.3
- Splitter Round-robin
- Priority / Overflow
- Smart Sorter
- Drone Control Research Gate
- Storage Back Pressure / no item loss
- Power shortage state preservation
- GitHub Pages relative paths

Additive Save field:

```text
building.resourcePointId
```

Resource Point performance metadataはSaveへ複製しない。

---

## Regression Coverage

追加:

- `scripts/phase5c.test.mjs`

確認内容:

- Quick Build 1〜5維持
- 3 secured Resource Point取得
- Legacy Drone Port → Military fallback
- Copper Route → 8秒 / Copper Wire
- Electronics Route → 10秒 / E-Waste
- Military Route → 12秒 / Rare Alloy
- Route変更時partial progress reset
- Route変更時existing output保持
- non-Military PortだけではRank 6→7 mandatory不成立
- Military Port追加でRank 6→7 route成立
- Industrial Generator Rank 6 Gate
- Logistics Warehouse Rank 6 Gate
- Logistics Warehouse capacity 1800
- Industrial Generator 180 Power
- Generator fuel consume / 24秒

既存Regressionも継続実行する。

---

## CI

最初のPhase 5-C Draft Head:

```text
04eba40e39f0cf9a26d0a078371a4e26858b5348
Validate Web Game #96
result: success
```

このCIにはPhase 5-Cだけでなく、既存Directional Logistics / Factory Management / Rank 1→7 / Power / Storage / Residential / Industrial / Military / Phase 4-B / Phase 5-A / Phase 5-B Regressionが含まれる。

一時Checkpoint削除・Documentation同期後の最終Headで再度CIを確認する。

---

## Not Yet Verified

Static CIでは次を保証できない。

- Automation Consoleの実ブラウザLayout
- Factory Management buttonとの位置関係
- Pointer Lock handoff / close時復帰
- Route変更 / Storage Upgrade後のReload UX
- Copper / Electronics Drone Portの一人称Visual
- Industrial Generator / Logistics Warehouse Build Preview
- Phase 5-C設備のCollider / placement feel
- WebGL FPS

これらはBrowser / User Validation対象。

---

## Known UX Limitation

Automation Consoleは現状`game.js`のModule-local Memory stateへ直接mutationできない。

Saveだけ変更したままPlayを継続するとAutosaveが古いMemory stateで上書きするRiskがあるため、Route変更 / Upgrade適用時に即Reloadして同期する。

これは機能上のData loss防止策であり、将来Runtime mutation APIを公開すればReloadなしへ改善可能。

---

## Remaining Work

### Phase 5 / Rank 6 horizontal

- Runtime API経由のreload-free Drone Route変更
- Advanced Generator / later Power tier
- Drone route count / assignment upgrade
- Factory Expansion / multi-floor logistics

### Rank 7 / Final Chapter

- 崩壊した研究施設
- Robotics / Materials / Energy Lab
- Fabricator
- Advanced Drone
- Experimental Power
- Autonomous Industrial Core
- Mega Factory / Main Clear

Phase 5-CでRank 6 horizontal systemsは大きく拡張したが、Rank 7 Final ChapterやMain Clearまで完了した扱いにはしない。
