# Game Hub

**Live Site:** https://elitemay.github.io/game/

完成度の高いブラウザゲームを1本ずつ追加していく個人Game Hubです。

現在のPlayable Game:

- **Scrap Factory** — 一人称3D / 探索 / 加工 / 工場自動化 / Directional Logistics / Power / Drone Automation / Progression Rank / Research

## Source of Truth

- `REQUIREMENTS.md` — ゲーム内容・進行・探索・Visual方針の確定要件
- `SPEC.md` — 現在実装されている技術仕様とRuntime / Save Contract
- `WORK_REPORT.md` — 実装・検証・未確認事項
- `PROJECT_LEARNINGS.md` — 再利用価値のある実装上の学び

要件と実装が食い違う場合、未実装要件を「実装済み」とは扱いません。

## 現在のPlayable状態

`Scrap Factory` は **Phase 5-C: Configurable Drone Routes / Industrial Generator / Logistics Warehouse** まで通常Gameplayへ接続しています。

通常進行は **Rank 1 → 7** です。

```text
Factory / Scrap Yard
→ 基本加工とDirectional Logistics
→ 廃住宅街
→ Splitter / Merger / Power
→ Rank 5
→ 廃工場 / Advanced Assembly / Smart Sorter
→ Rank 6
→ 軍事施設 / Drone Control
→ Drone Port自動回収Line
→ Conveyor Mk.3 / Priority / Overflow
→ 複数Drone Route / Industrial Generator / Logistics Warehouse
→ Rank 7
```

Rank 7が現在のPlayable Rank-Up上限です。崩壊した研究施設、Fabricator、Advanced Drone、Mega Factoryは後続Phaseです。

## Progression

| Rank | 必須進行 |
| --- | --- |
| 1 → 2 | Hopper → Crusher → Seller のDirectional自動ライン |
| 2 → 3 | Crusher → Smelterを含む鉄インゴット完全自動ライン |
| 3 → 4 | 廃住宅街Main Objective完了 |
| 4 → 5 | Splitter / Mergerを使う2製品ライン + 自前発電 |
| 5 → 6 | 廃工場復旧 + Advanced Assembly + Assembler自動ライン |
| 6 → 7 | 軍事施設攻略 + Drone Control Research + Military Alloy Drone Port → Factory Storage自動回収Route |

主なResearch:

- `Basic Fabrication` — 鉄板Hand Craft
- `Scrap Yard Survey` — 廃住宅街Blueprint由来
- `Grid Storage` — Battery
- `Recovered Assembly Control` — Assembler / Circuit / Motor
- `Recovered Drone Control` — Rank 6 / 軍事施設Blueprint由来 / Drone Port

## Directional Logistics

| 設備 | Rank | Throughput | Rule |
| --- | ---: | ---: | --- |
| Conveyor Mk.1 | 1 | 1.5/s | Forward |
| Conveyor Mk.2 | 4 | 3.0/s | Forward |
| Conveyor Mk.3 | 6 | 6.0/s | Forward |
| Splitter | 4 | 3.0/s | Forward / Left / RightをRound-robin |
| Merger | 4 | 3.0/s | Rear / Left / Right → Forward |
| Smart Sorter | 5 | 3.0/s | Item category別の固定Lane |
| Priority Splitter | 6 | 6.0/s | Forwardを最優先。詰まり時のみ左右Backup |
| Overflow Splitter | 6 | 6.0/s | Forward Main。受入不可時のみRight Overflow |

Smart Sorter:

```text
advanced            → Forward
processed / product → Left
raw                 → Right
```

Priority / Overflowの優先度はFactory topologyから毎回導出し、Saveへ重複保存しません。

### Overflow販売Line例

```text
Production
→ Overflow Splitter
├─ Forward → Industrial Storage / Logistics Warehouse
└─ Right   → Seller
```

Storageに空きがある間はSellerへ流れず、Storageが受け取れなくなった時だけ余剰をSellerへ送ります。

## Exploration / Resource Point

### 廃住宅街 — Rank 3

`Fuse回収 → Substation復旧 → Survey Terminal → Blueprint → 正常帰還`

Resource Point:
- `residential-copper-network`

### 廃工場 — Rank 5

`Generator復旧 → Control Room復旧 → Assembly Blueprint → 正常帰還`

Resource Point:
- `industrial-electronics-cache`

### 軍事施設 — Rank 6

`Security Access Card → Security Grid停止 → Drone Control Bay再起動 → Drone Control Blueprint → 正常帰還`

- Expedition HP: 100
- Security Grid稼働中はTurret警戒区画でDamage
- Access Card取得後にTurret電源を停止できる非戦闘Routeあり
- HP 0 / AbandonではCurrent Session Lootのみ失う

Guaranteed reward:
- `military_drone_control_blueprint`
- Research Data +3
- `military-alloy-cache`

## Drone Automation / Automation Console

`drone_control_systems` Research完了後、**Drone Port**を建築できます。

攻略済みResource PointだけをAutomation ConsoleからPortごとに選択できます。

| Resource Point | Output | Cycle | 目安能力 | Danger |
| --- | --- | ---: | ---: | ---: |
| 住宅街 銅配線網 | Copper Wire ×1 | 8s | 7.5/min | 1 |
| 廃工場 電子部品庫 | E-Waste ×1 | 10s | 6/min | 2 |
| 軍事施設 合金備蓄庫 | Rare Alloy ×1 | 12s | 5/min | 3 |

Drone Port:
- 65 Power
- Directional Logistics / Back Pressureを既存Runtimeから再利用
- Route変更では既存Output Bufferを消さない
- 途中Cycleのみリセット
- 旧SaveのRoute未指定Portは従来どおりMilitary Alloy RouteへFallback

現在のAutomation Consoleは保存競合を避けるため、Route変更またはStorage Upgradeを適用するとFactoryを再読込します。

Rank 6 → 7の必須条件は従来どおり **Military Alloy Resource Pointを使うDrone Route** が必要です。Copper / E-Waste Routeだけでは代替できません。

## Power / Storage

PowerはRank 4から有効。

### Power

- Starter Grid — 55 Power
- Scrap Generator — 80 Power / 鉄くず1個・24秒
- **Industrial Generator — 180 Power / 鉄くず1個・24秒 / Rank 6**
- Battery — 960 Energy
- Crusher — 18 Power
- Smelter — 30 Power
- Assembler — 50 Power
- Drone Port — 65 Power

Industrial Generatorは既存Generator Runtimeを共通化して利用し、別Simulationを作りません。

### Storage

- Small Storage — 120個
- Industrial Storage — 600個
- **Logistics Warehouse — 1800個 / Rank 6**
- 満杯時はBack Pressureで上流を停止し、Itemを消失させない

Automation ConsoleからIndustrial StorageをLogistics Warehouseへその場Upgradeできます。

Upgrade時に維持:
- Building ID
- x / z / rotation
- input / output Buffer
- 既存Item

Upgrade costは `$380`（Warehouse $620 − Industrial Storage $240）。

## Factory Management / Diagnostics

`P / FACTORY`:

- 理論生産能力 / 分
- 搬送対応能力 / 分
- Machine稼働率
- Smart Sorter数
- Output滞留
- Storage満杯 / 容量逼迫
- Power shortage
- 物流行き止まり

診断値はDerived Dataで、Saveへ重複保存しません。

## Save / Compatibility Contract

```text
localStorage key: elitemay-game-hub-v1
Root Save Schema: 1
Progression Schema: 1
Exploration Schema: 1
Build Grid: 2.5m
```

Phase 5-CでもSchema番号は変更していません。

Additive field:
- Drone Port `resourcePointId`

維持するContract:
- 既存Factory Layoutを削除しない
- 2.5m Grid / Factory座標系を維持
- Directional LogisticsのVisual = Runtime方向
- Quick Build 1〜5の順序を維持
- Route graph / Throughput / Priority / DiagnosticsをSaveへ重複保存しない
- Resource Point性能はCode definitionを正本としSaveへ複製しない
- Storage Back PressureでItemを消失させない
- GitHub Pages Relative Pathを維持

## 操作

| キー / UI | 操作 |
| --- | --- |
| WASD | 移動 |
| Shift | ダッシュ |
| Space | ジャンプ（Factory） |
| E | 拾う / 設備・探索Objective操作 |
| B | 建築メニュー |
| R | 建築中の90°回転 |
| F | 解体モード |
| Tab | Inventory / Hand Craft |
| O | Guide |
| P | Factory Management |
| T | Transport Terminal |
| AUTOMATION | Drone Route / Storage Upgrade管理 |
| 1〜5 | 基本設備Quick Build |
| Esc | Pause / Panelを閉じる |

## Validation

```bash
npm run validate
```

ValidatorはRank 1→7と既存Regressionに加え、Phase 5-Cで次を確認します。

- 3 Resource PointのDrone Route解決
- 旧Drone Port → Military Route fallback
- Copper / Electronics / Military Recipe切替
- Route変更時のOutput Buffer保持
- non-Military RouteだけではRank 6→7 mandatoryを満たさない
- Industrial Generator Rank 6 Gate / 180 Power
- Logistics Warehouse Rank 6 Gate / 1800 capacity
- Quick Build 1〜5維持
- Phase 5-B Visual Runtime互換Base + Phase 5-C Visual Wrapper

Static CIだけでは、Automation Consoleの配置、Pointer Lock復帰、Route変更時のReload体験、Phase 5-C設備の一人称サイズ・Collider、WebGL FPSまでは保証しません。
