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

`Scrap Factory` は **Phase 5-B: Conveyor Mk.3 / Priority / Overflow Logistics** まで通常Gameplayへ接続しています。

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
| 6 → 7 | 軍事施設攻略 + Drone Control Research + Drone Port → Factory Storage自動回収Route |

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

Priority / Overflowの優先度は現在のFactory topologyから毎回導出し、Saveへ重複保存しません。

### Overflow販売Line例

```text
Production
→ Overflow Splitter
├─ Forward → Industrial Storage
└─ Right   → Seller
```

Storageに空きがある間はSellerへ流れず、Storageが受け取れなくなった時だけ余剰をSellerへ送ります。

## Exploration

### 廃住宅街 — Rank 3

```text
Fuse回収 → Substation復旧 → Survey Terminal → Blueprint → 正常帰還
```

### 廃工場 — Rank 5

```text
Generator復旧 → Control Room復旧 → Assembly Blueprint → 正常帰還
```

### 軍事施設 — Rank 6

```text
Security Access Card
→ Security Grid停止
→ Drone Control Bay再起動
→ Drone Control Blueprint回収
→ 正常帰還
```

- Expedition HP: 100
- Security Grid稼働中はTurret警戒区画でDamage
- Access Card取得後にTurret電源を停止できる非戦闘Routeあり
- HP 0 / AbandonではCurrent Session Lootのみ失う

Guaranteed reward:

- `military_drone_control_blueprint`
- Research Data +3
- `military-alloy-cache`

## Drone Automation

`drone_control_systems` Research完了後、**Drone Port**を建築できます。

```text
Secured Military Alloy Resource Point
→ Drone Port / 12秒 / 65 Power
→ 軍用レア合金 ×1
→ Directional Logistics
→ Factory Storage
```

Drone Portは既存Production Runtime / Power / Back Pressureを再利用します。

未実装:

- 複数Resource Pointを選択するDrone Route管理
- Drone assignment UI

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

## Power / Storage

PowerはRank 4から有効。

- Starter Grid — 55 Power
- Scrap Generator — 80 Power
- Battery — 960 Energy
- Crusher — 18 Power
- Smelter — 30 Power
- Assembler — 50 Power
- Drone Port — 65 Power

Storage:

- Small Storage — 120個
- Industrial Storage — 600個
- 満杯時はBack Pressureで上流を停止し、Itemを消失させない

未実装:

- Advanced / Industrial Generator
- Experimental Power
- Logistics Warehouse / in-place storage upgrade

## Save / Compatibility Contract

```text
localStorage key: elitemay-game-hub-v1
Root Save Schema: 1
Progression Schema: 1
Exploration Schema: 1
Build Grid: 2.5m
```

Phase 5-BでもSchema番号は変更していません。

維持するContract:

- 既存Factory Layoutを削除しない
- 2.5m Grid / Factory座標系を維持
- Directional LogisticsのVisual = Runtime方向
- Quick Build 1〜5の順序を維持
- Route graph / Throughput / Priority / DiagnosticsをSaveへ重複保存しない
- Storage Back PressureでItemを消失させない
- GitHub Pages Relative Pathを維持

## 操作

| キー | 操作 |
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
| 1〜5 | 基本設備Quick Build |
| Esc | Pause / Panelを閉じる |

## Validation

```bash
npm run validate
```

Validatorは既存Regressionに加え、Phase 5-Bで次を確認します。

- Conveyor Mk.3 = 6 items/sec
- Rank 6 unlock gate
- Existing Splitter round-robin維持
- Priority Forward route優先
- Priority backup route round-robin
- Overflow Main route優先
- Main route受入不可時のみOverflowへ切替
- Visual / Progression runtime marker

Static CIだけでは、Pointer Lock、Build Preview、Priority / Overflow矢印の一人称可読性、Collider、WebGL FPSまでは保証しません。
