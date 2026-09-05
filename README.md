# Game Hub

**Live Site:** https://elitemay.github.io/game/

完成度の高いブラウザゲームを1本ずつ追加していく個人Game Hubです。

現在のPlayable Game:

- **Scrap Factory** — 一人称3D / スクラップ回収 / 独立探索 / 加工 / 自動化 / Directional Logistics / Power / Factory Management / Progression Rank / Research

## Source of Truth

- `REQUIREMENTS.md` — ゲーム内容・進行・探索・Visual方針の確定要件
- `SPEC.md` — 現在実装されている技術仕様とRuntime / Save Contract
- `WORK_REPORT.md` — 今回までの実装・検証・未確認事項
- `PROJECT_LEARNINGS.md` — 再利用価値のある実装上の学び

要件と実装が食い違う場合、未実装要件を「実装済み」とは扱いません。

## 現在のPlayable状態

`Scrap Factory` は **Phase 4-B: Smart Sorting / Factory Diagnostics** まで通常Gameplayへ接続しています。

通常進行は **Rank 1 → 6** です。

```text
Factory / Scrap Yard
→ 基本加工とDirectional Logistics
→ 廃住宅街
→ Splitter / Merger / Power
→ Rank 5
→ 廃工場復旧
→ Advanced Assembly
→ Assembler自動ライン
→ Smart Sorter / Production Diagnostics
→ Rank 6
```

Rank 6が現在のPlayable Rank-Up上限です。軍事施設、Conveyor Mk.3、Priority / Overflow、Drone Researchなどは後続Phaseです。

## Progression

| Rank | 必須進行 |
| --- | --- |
| 1 → 2 | Hopper → Crusher → Seller のDirectional自動ライン |
| 2 → 3 | Crusher → Smelterを含む鉄インゴット完全自動ライン |
| 3 → 4 | 廃住宅街Main Objective完了 |
| 4 → 5 | Splitter / Mergerを使う2製品ライン + 自前発電 |
| 5 → 6 | 廃工場復旧 + Advanced Assembly研究 + Assembler自動ライン |

主なResearch:

- `Basic Fabrication` — 鉄板Hand Craft
- `Scrap Yard Survey` — 廃住宅街Blueprint由来
- `Grid Storage` — Battery
- `Recovered Assembly Control / 高度組立制御` — Assembler / Circuit / Motor

## Directional Logistics

- Conveyor Mk.1 — 1.5個/秒
- Conveyor Mk.2 — 3個/秒
- Splitter — 背面1入力 → 正面/左右へRound-robin
- Merger — 背面/左右3入力 → 正面1出力
- Smart Sorter — Rank 5 / 3個/秒 / 背面1入力
  - **正面:** `advanced`（Circuit / Motor / Control Unit）
  - **左:** `processed` / `product`
  - **右:** `raw`
- Route実効帯域は経路上で最も遅いLogistics Nodeで決定
- Visual方向とRuntime方向を一致させる

Smart Sorterは現時点では**カテゴリ固定の自動分類**です。任意Item Filter、Priority、Overflowはまだ実装していません。

## Factory Management / Diagnostics

`P / FACTORY` から工場管理コンソールを開けます。

Phase 4-Bでは既存Factory snapshotから次を導出して表示します。

- 理論生産能力 / 分
- 有効な出力Routeで処理できる生産量 / 分
- Machine稼働率
- Smart Sorter設置数
- Output滞留
- Storage満杯 / 容量逼迫
- Power shortage
- 物流行き止まり / Sorter分類先不足

これらは診断用Derived Dataであり、Saveへ重複保存しません。

## Advanced Production

```text
Motor ×1 + Circuit ×2 + Plastic ×1
→ Assembler / 8秒 / 50 Power
→ Control Unit ×1
```

Rank 5 → 6の必須判定は、廃工場Objective・Research・現在のDirectional Factory graphから導出します。

## Exploration

### 廃住宅街 — Rank 3

```text
Fuse回収
→ Substation復旧
→ Survey Terminal
→ Blueprint / Research Data
→ 正常帰還
```

### 廃工場 — Rank 5

```text
Generator Hall復旧
→ Control Room復旧
→ Blueprint回収
→ 任意でService Shortcut
→ 正常帰還
```

廃工場報酬:

- `abandoned_factory_assembly_blueprint`
- Research Data +2
- `industrial-electronics-cache`

## Power / Storage

PowerはRank 4から有効。

- Starter Grid — 55 Power
- Scrap Generator — 80 Power
- Battery — 960 Energy
- Crusher — 18 Power
- Smelter — 30 Power
- Assembler — 50 Power

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

Phase 4-BでもSchema番号は変更していません。

維持するContract:

- 既存Factory Layoutを削除しない
- 2.5m Grid / Factory座標系を維持
- Directional LogisticsのVisual = Runtime方向
- Quick Build 1〜5の順序を維持
- Route graph / Throughput / Factory diagnosticsをSaveへ重複保存しない
- GitHub Pagesで動くRelative Pathを維持

## 操作

| キー | 操作 |
| --- | --- |
| WASD | 移動 |
| Shift | ダッシュ |
| Space | ジャンプ（Factory） |
| E | 拾う / 設備操作 |
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

Validatorでは既存Regressionに加えてPhase 4-BのSmart Sorter routing / Rank Gate / Factory diagnosticsを確認します。

Static CIだけでは、実ブラウザのPointer Lock、3D collider、Smart Sorterの一人称可読性、WebGL FPSまでは保証しません。
