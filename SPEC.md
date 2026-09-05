# Specification

Updated: 2026-09-05

この文書は現在実装されている `Scrap Factory` の技術仕様を記録する。将来要件は `REQUIREMENTS.md` をSource of Truthとし、この文書では未実装要件を実装済みとして扱わない。

## 1. Current Playable Scope

通常Gameplayは現在 **Rank 1 → 6** まで接続済み。

```text
Factory / Scrap Yard
→ Rank 1-3 Production
→ Residential Exploration
→ Rank 4 Advanced Logistics / Power
→ Rank 5
→ Abandoned Factory Exploration
→ Advanced Assembly Research
→ Assembler automated line
→ Rank 6
```

Rank 6が現在のPlayable Rank-Up cap。

Phase 4全体要件のうち、現実装は **Phase 4-A vertical slice** とする。

実装済み:

- 廃工場独立探索Area
- Generator復旧
- Control Room復旧
- Service Shortcut
- Industrial Loot
- Guaranteed Assembly Blueprint
- Environment Hazard
- Circuit / Motor / Control Unit
- Advanced Assembly Research
- Assembler
- Rank 5 → 6 progression

未実装で後続Phase:

- Smart Sorter
- Production StatisticsのPhase 4拡張
- Bottleneck DetectionのPhase 4拡張
- Priority / Overflow
- Conveyor Mk.3
- 軍事施設以降のRank 6+ gameplay

---

## 2. Runtime Architecture

```text
Hub UI
└─ shared save adapter
   └─ localStorage: elitemay-game-hub-v1

Scrap Factory / Factory Scene
├─ config.js
├─ logistics.js
├─ power.js
├─ storage-capacity.js
├─ storage.js
├─ factory-management.js
├─ feature-pack.js
├─ game.js
├─ world.js
├─ world-runtime.js
├─ progression.js
│  └─ progression-core.js
├─ progression-ui.js
│  └─ progression-ui-v2.js
├─ exploration.js
│  └─ exploration-core.js
└─ exploration-ui.js
   └─ exploration-ui-v2.js

Independent Exploration Scenes
└─ exploration/
   ├─ residential.html / .css / .js
   └─ industrial.html / .css / .js
```

Compatibility entrypointの `progression.js` / `exploration.js` / 各UI entryは既存Import pathを維持し、拡張実装をCore/V2へ委譲する。

Factoryと探索Areaは別Page / Three.js Sceneとして扱い、複数Worldを同時にフルロードしない。

`world-runtime.js`はVisual Layerを担当し、Save / Economy / Production logicのSource of Truthにはしない。

---

## 3. Save Contract

Root Save:

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "updatedAt": "ISO-8601",
  "profile": {},
  "games": {
    "scrap-factory": {}
  }
}
```

固定Contract:

- localStorage key: `elitemay-game-hub-v1`
- Root Save Schema: `1`
- Progression Schema: `1`
- Exploration Schema: `1`

Phase 4-AではSchema番号を変更しない。

旧Saveに存在しない新DataはNormalize時にAdditiveに補完する。

新Inventory key:

- `circuit`
- `motor`
- `control_unit`

Explorationは既存Residential stateを保持したまま `industrial` area stateを追加する。

保存しないDerived state:

- Directional route graph
- route throughput
- Power generation / demand / shortage snapshot
- Rank 5 → 6 mandatory達成cache
- Assembler topology達成cache

これらは現在の `buildings[]` / progression / exploration stateから導出する。

Building単位で永続化が必要なRuntime state:

- `input`
- `output`
- `progress`
- `rotation`
- `powerFuelSeconds`
- `powerStored`
- `logisticsCursor`

---

## 4. Factory Spatial Contract

- Grid: `2.5m`
- Factory座標系: 既存座標を維持
- 既存LayoutをMigrationで削除しない
- Visual Conveyor direction = Runtime output direction
- Quick Build 1〜5の既存順序を維持
- Relative PathでGitHub Pagesから動作する

---

## 5. Directional Logistics

Source of Truth: `logistics.js`

- Conveyor Mk.1: 1.5 items/sec
- Conveyor Mk.2: 3 items/sec
- Splitter: Rear 1 input → Forward / Left / Right outputs
- Merger: Rear / Left / Right inputs → Forward 1 output
- Route throughput = Route上で最も遅いLogistics Node
- Splitter distributionはStable route order + `logisticsCursor`
- Advanced Nodeは明示Portを厳密適用
- Legacy Conveyor corner互換は維持

Rank判定も同じDirectional Route APIを使用し、Progression専用の別Graphを作らない。

---

## 6. Power

PowerはRank 4から有効。

| Device | Value |
| --- | --- |
| Starter Grid | 55 Power / radius 17.5m |
| Scrap Generator | 80 Power / metal scrap 1 = 24 sec |
| Battery | 960 Energy / charge 60 / discharge 80 |
| Crusher | 18 Power |
| Smelter | 30 Power |
| Assembler | 50 Power |

不足時:

- 給電対象Machineだけ停止
- Input / Outputを削除しない
- 処理途中`progress`を保持
- LogisticsはPassiveのため停止させない
- 復電時にMachineは自動復旧

---

## 7. Storage / Back Pressure

- Small Storage: 120 items
- Industrial Storage: 600 items
- Capacity超過時に既存Itemを削除しない
- Full Targetへ新Itemを移送しない
- Target受入確認前にSource Outputを減らさない
- Route候補がFullなら上流へBack Pressure

---

## 8. Production Definitions

### Existing

```text
Metal Scrap
→ Crusher / 2.2 sec
→ Crushed Metal
→ Smelter / 3.0 sec
→ Iron Ingot
```

### Advanced Hand Craft

`advanced_assembly` Research完了後:

```text
Copper Wire ×2 + E-Waste ×1 + Plastic ×1
→ Circuit ×1

Iron Ingot ×2 + Copper Wire ×2
→ Motor ×1
```

### Assembler

```text
Motor ×1 + Circuit ×2 + Plastic ×1
→ Assembler / 8.0 sec / 50 Power
→ Control Unit ×1
```

Assembler:

- Build cost: `$420`
- Required Rank: 5
- Required Research: `advanced_assembly`
- Input accepted: `motor`, `circuit`, `plastic`
- Output: `control_unit`

Production executionは既存 `game.js` のGeneric Recipe Runtimeを利用する。

---

## 9. Progression / Research

### Current cap

`PLAYABLE_MAX_RANK = 6`

### Advanced Assembly Research

```text
id: advanced_assembly
requiredRank: 5
researchDataCost: 2
requiredBlueprint: abandoned_factory_assembly_blueprint
```

Unlock:

- `building:assembler`
- `handcraft:circuit`
- `handcraft:motor`

Rank 5になっただけではAssemblerをBuildできない。廃工場ObjectiveからBlueprintを回収し、Researchを完了する必要がある。

### Rank 5 → 6 Mandatory

次をすべて満たす。

1. 廃工場Main Objective完了
2. `advanced_assembly` Research完了
3. Assembler自動ライン成立

Assembler line判定:

- `hopper` / `storage` / `industrial_storage` を入力Source候補とする
- Recipeの全入力ItemについてSource → AssemblerのDirectional Routeが必要
- Assembler → `seller` / `storage` / `industrial_storage` の`control_unit` Directional Routeが必要
- 実効Throughputは使用Routeの最小Throughputから導出

Optional Goalsから2つ:

- Motor発見
- Circuit発見
- Industrial Storageを生産Bufferとして使用
- Industrial Service Shortcut開通
- Assembler route throughput 3.0 items/sec

Rank 6到達後はPhase cap。

---

## 10. Exploration Contract

### Shared

- Factory InventoryとExpedition Session Packを分離
- Session Pack: 12 slots
- Normal ReturnまでLootをFactory Inventoryへ確定しない
- Normal Return → Transport Depot
- Abandon → Current Session Lootだけ失う
- Discovered Zones / Main Objective progressは保持
- Mandatory Blueprint rewardはRandom Dropにしない
- Rewardは`rewardClaimed`でidempotent
- 同時にActive Expeditionを複数持たない

### Residential

Rank 3で解放。

Objective:

```text
Fuse → Power → Survey
```

既存Residential behaviorをPhase 4-Aでも維持する。

### Abandoned Factory / Industrial

Rank 5で解放。

Persistent Zones:

- `arrival`
- `generator_hall`
- `assembly_floor`
- `control_room`

Objective dependency:

```text
Generator Restore
→ Control Room Online
→ Blueprint Recovery
```

Service ShortcutはControl Room online後のOptional interaction。

Completion reward:

- `abandoned_factory_assembly_blueprint`
- Research Data +2
- `industrial-electronics-cache` Resource Point

Environment Hazard:

- 青白いElectrical Arc zone
- 接近時に安全距離へ押し戻す
- Combat damage systemとは分離
- Control Room復旧で一部Hazard stateを変更

---

## 11. Visual Layer

Visual directionは `REQUIREMENTS.md` のStylized Industrial Realism / Hybrid Asset方針に従う。

Phase 4-Aの最低Visual Gate:

- 廃工場をResidentialの色替えにしない
- Generator Hall / Assembly Floor / Control Roomを大きなランドマークとして区別
- Objective stateを照明 / 発光 / Gate visibilityへ反映
- Hazardを通常背景から視覚的に区別
- AssemblerはGeneric Box fallbackではなく専用Silhouetteを持つ
- Status light / moving partは既存Machine state updateに接続

現在の廃工場 / AssemblerはProcedural実装。外部Hybrid Asset導入の最終品質Passは未完了。

---

## 12. Validation Contract

`npm run validate`

Static CIで確認:

- 全JS/MJS syntax
- required files
- JSON parse
- local HTML refs
- Directional Logistics regression
- Factory Management regression
- Rank 1 → 6 Progression regression
- Power regression
- Storage / Back Pressure regression
- Residential Exploration regression
- Industrial Exploration regression
- required runtime integration markers
- local-only path / API key pattern

Static CIだけでは保証しない:

- Pointer Lock操作感
- WebGL FPS
- 3D collider / visual一致
- 廃工場の実際の到達性
- Landmark readability
- Hazard visibility
- Assembler Build Preview / first-person silhouette

これらはBrowser Validation対象。
