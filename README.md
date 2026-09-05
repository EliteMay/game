# Game Hub

**Site:** https://elitemay.github.io/game/

完成度の高いブラウザゲームを1本ずつ追加していく個人Game Hubです。

現在のPlayable Game:

- **Scrap Factory** — 一人称3D / スクラップ回収 / 独立探索エリア / 加工 / 販売 / 自由配置 / Directional Logistics / 工場管理 / Progression Rank / Research / Power

## Source of Truth

このRepositoryでは役割を分けています。

- `REQUIREMENTS.md` — ゲーム内容・進行・探索・Visual方針を含む確定要件
- `SPEC.md` — 現在実装されている技術仕様と保存・Runtime Contract
- `WORK_REPORT.md` — 実装履歴と検証結果
- `PROJECT_LEARNINGS.md` — 再利用価値のある実装上の学び
- `README.md` — 現在のPlayable状態と利用入口

要件と実装が食い違う場合、未実装要件を「実装済み」とは扱いません。

## 現在の状態

`Scrap Factory` は現在 **Phase 4-A: Abandoned Factory / Advanced Assembly** まで通常Gameplayへ接続しています。

通常進行は **Rank 1 → 6** です。

```text
Factory / Scrap Yard
→ 回収・加工・自動化
→ Rank Up / Research
→ 廃住宅街
→ Advanced Logistics / Power
→ Rank 5
→ 廃工場
→ Generator / Control Room復旧
→ Assembly Blueprint回収
→ Advanced Assembly研究
→ Motor / Circuit製作
→ Assembler自動ライン
→ Rank 6
```

Rank 6が現在のPlayable Rank-Up上限です。Rank 6以降の軍事施設、Conveyor Mk.3、Priority / Overflow、Drone Researchなどは後続Phaseです。

## Progression Rank / Research

HUD右上の `RANK` から進行画面を開けます。Rank Upは原則 **必須目標 + 選択目標2つ** です。

| Rank | 必須進行 |
| --- | --- |
| 1 → 2 | Hopper → Crusher → Seller のDirectional自動ライン |
| 2 → 3 | Crusher → Smelterを含む鉄インゴット完全自動ライン |
| 3 → 4 | 廃住宅街Main Objective完了 |
| 4 → 5 | Splitter / Mergerを使う2製品ライン + 自前発電30秒以上 |
| 5 → 6 | 廃工場の主要設備復旧 + 回収技術の研究 + Assembler自動ライン |

主なResearch:

- `Basic Fabrication` — 鉄板Hand Craft
- `Scrap Yard Survey` — 廃住宅街Blueprint由来の探索研究
- `Grid Storage` — Battery
- `Recovered Assembly Control / 高度組立制御` — 廃工場Blueprint由来。Assembler / 制御回路 / 産業モーターを解放

Legacy Saveでは既に利用していたSmelter / Storage / 鉄板Craftを検出して最低限のUnlockを補完します。

## Phase 2: Logistics / Power / Storage

### Directional Logistics

- Conveyor Mk.1 — 1.5個/秒
- Conveyor Mk.2 — 3個/秒
- Splitter — 背面1入力 → 正面/左右へRound-robin
- Merger — 背面/左右3入力 → 正面1出力
- Routeの実効帯域は経路上で最も遅いLogistics Nodeで決まる
- Visualの矢印・Markingと実Input / Output Portを一致させる
- Splitterの分配位置は`logisticsCursor`として保存する

### Power

Rank 4からPower管理が有効になります。

- Starter Grid — 55 Power / Factory中心17.5m
- Scrap Generator — 80 Power / 鉄くず1個で24秒
- Power Pole — Grid延長
- Battery — 960 Energy / 最大60充電 / 最大80放電
- Crusher — 18 Power
- Smelter — 30 Power
- Assembler — 50 Power

Power不足では対象Machineだけ停止し、Input / Output / 処理途中Progressを破壊しません。

### Storage

- Small Storage — 120個
- Industrial Storage — 600個
- 満杯時はBack Pressureで上流を止め、Itemを消失させない
- 旧Saveが容量超過でも既存Itemを削除しない

## Phase 3: Residential Exploration

Rank 3から `T / TERMINAL` で **廃住宅街** へ出発できます。

Main Objective:

```text
West Garageで予備Fuse回収
→ Substation復旧
→ Survey Terminal起動
→ Blueprint / Research Data獲得
→ 正常帰還
```

- 4永続区画
- 銅線 / 廃プラスチック / 電子ジャンク
- Factory Inventoryとは別の12 Slot Expedition Pack
- Objective進行・区画発見は放棄しても保持
- 正常帰還したLootだけTransport Depotへ確定
- Objective報酬はRandomではなく保証取得

## Phase 4-A: Abandoned Factory / Advanced Assembly

Rank 5からTransport Terminalで **廃工場** が解放されます。

Main Objective:

```text
Generator Hallで補助Generatorを復旧
→ Assembly Floorを通過
→ Control Roomを再起動
→ 任意でService Shortcutを開通
→ 組立制御Blueprintを回収
→ 正常帰還
```

廃工場は住宅街の色替えではなく、Generator Hall / Assembly Floor / Control Roomの大きなランドマークで構成しています。電気アーク区画は接近すると安全距離へ押し戻すEnvironment Hazardとして機能し、Control Room復旧で一部Hazardと設備Visual stateが変化します。

Objective完了報酬:

- `abandoned_factory_assembly_blueprint`
- Research Data +2
- `industrial-electronics-cache` Resource Point記録

Blueprint回収後に `高度組立制御` を研究すると次を解放します。

- Assembler
- 制御回路Hand Craft
- 産業モーターHand Craft

Advanced Production:

```text
Motor ×1 + Circuit ×2 + Plastic ×1
→ Assembler / 8秒 / 50 Power
→ Control Unit ×1
```

Rank 5 → 6の必須判定では、廃工場Objective、Advanced Assembly研究、Assemblerへの全入力RouteとAssemblerから最終Storage/SellerへのDirectional Routeを現在のFactory graphから導出します。達成状態専用の保存カウンターは追加していません。

## Save / Compatibility Contract

Root Save:

```text
localStorage key: elitemay-game-hub-v1
Root Save Schema: 1
Exploration Schema: 1
Progression Schema: 1
```

Phase 4-AでもSchema番号は変更していません。新しいItem / Industrial AreaはNormalize時にAdditiveに補完します。

変更時に守るもの:

- 既存Factory Layoutを削除しない
- 2.5m Gridを維持する
- Factory座標系を維持する
- Directional ConveyorのVisual = Runtime方向Contractを維持する
- Derived graph / Power / Rank判定値をSaveへ重複保存しない
- Pagesで動くRelative Pathを維持する

## 操作

| キー | 操作 |
| --- | --- |
| WASD | 移動 |
| Shift | ダッシュ |
| Space | ジャンプ（Factory） |
| E | 拾う / 設備操作 / 探索Objective操作 |
| B | 建築メニュー |
| R | 建築中の90°回転 |
| F | 解体モード ON / OFF |
| Tab | Inventory / Hand Craft |
| O | ゲーム内Guide |
| P | Factory Management |
| T | Transport Terminal |
| 1〜5 | 基本設備Quick Build |
| Esc | Pause / Build終了 / Panelを閉じる |

## Validation

```bash
npm run validate
```

Validatorでは以下を確認します。

- JavaScript syntax
- local HTML reference
- Directional Logistics regression
- Factory Management regression
- Progression Rank 1 → 6 regression
- Power regression
- Storage / Back Pressure regression
- Residential Exploration regression
- Abandoned Factory Exploration regression
- 必須Runtime integration marker
- local-only path / API key pattern

ブラウザ上の最終Visual / Pointer Lock / WebGL挙動はStatic CIとは別の確認項目です。
