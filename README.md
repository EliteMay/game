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

`Scrap Factory` は **Phase 5-A: Military Facility / Drone Automation** まで通常Gameplayへ接続しています。

通常進行は **Rank 1 → 7** です。

```text
Factory / Scrap Yard
→ 基本加工とDirectional Logistics
→ 廃住宅街
→ Splitter / Merger / Power
→ Rank 5
→ 廃工場 / Advanced Assembly / Smart Sorter
→ Rank 6
→ 軍事施設
→ Security Grid停止
→ Drone Control Blueprint回収
→ Drone Control Research
→ Drone Port自動回収Line
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

Danger 3の高Security施設です。

```text
CheckpointでSecurity Access Card回収
→ Security YardでSecurity Grid停止
→ Drone Control Bay再起動
→ Command BunkerでDrone Control Blueprint回収
→ 正常帰還
```

- Expedition Session HP: 100
- Security Grid稼働中はTurret警戒区画でDamage
- Access Card取得後、Turret電源を停止できる非戦闘Routeあり
- 区画発見・Security停止・Shortcut・Blueprint進行は放棄後も保持
- HP 0 / 放棄では今回の通常Lootだけ失う

Guaranteed reward:

- `military_drone_control_blueprint`
- Research Data +3
- `military-alloy-cache` Resource Point

## Drone Automation

`drone_control_systems` Research完了後、**Drone Port**を建築できます。

```text
Secured Military Alloy Resource Point
→ Drone Port / 12秒 / 65 Power
→ 軍用レア合金 ×1
→ Directional Logistics
→ Small / Industrial Storage
```

Drone Port:

- Cost: `$760`
- Rank 6 + Drone Control Research必須
- 65 Power
- 12秒ごとに軍用レア合金を1個回収
- 既存Production Runtime / Power / Back Pressureを再利用
- 専用Launch Deck / Control Mast / Docked Utility Drone Visual

Rank 6 → 7の必須判定では、軍事施設Objective・Research・`military-alloy-cache`確保・Drone PortからStorageへのDirectional Routeを現在のFactory graphから導出します。

## Directional Logistics

- Conveyor Mk.1 — 1.5個/秒
- Conveyor Mk.2 — 3個/秒
- Splitter — 1入力 → 3方向Round-robin
- Merger — 3入力 → 1出力
- Smart Sorter — 3個/秒
  - Forward: `advanced`
  - Left: `processed / product`
  - Right: `raw`
- Route実効帯域は経路上で最も遅いLogistics Nodeで決定

未実装:

- Conveyor Mk.3
- Priority / Overflow
- 複数Resource Pointを選択するDrone Route管理

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

## Save / Compatibility Contract

```text
localStorage key: elitemay-game-hub-v1
Root Save Schema: 1
Progression Schema: 1
Exploration Schema: 1
Build Grid: 2.5m
```

Phase 5-AでもSchema番号は変更していません。

旧SaveにはAdditiveに次を補完します。

- Military Exploration state
- Expedition HP
- Rare Alloy inventory key

維持するContract:

- 既存Factory Layoutを削除しない
- 2.5m Grid / Factory座標系を維持
- Directional LogisticsのVisual = Runtime方向
- Quick Build 1〜5の順序を維持
- Route graph / Throughput / DiagnosticsをSaveへ重複保存しない
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

ValidatorはRank 1→7、既存物流 / Power / Storage / Residential / Industrialに加え、Military Exploration・HP・Drone Research・Drone Port Route・Rank 6→7をRegression確認します。

Static CIだけでは、Pointer Lock、軍事施設内の実到達性、Turret警戒範囲の一人称可読性、Collider、Drone Port Build Preview、WebGL FPSまでは保証しません。
