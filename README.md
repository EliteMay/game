# Game Hub

**Site:** https://elitemay.github.io/game/

完成度の高いブラウザゲームを1本ずつ追加していく個人Game Hubです。

現在のPlayable Game:

- **Scrap Factory** — 一人称3D / スクラップ回収 / 独立探索エリア / 加工 / 販売 / 自由配置 / Directional Logistics / 工場管理 / Progression Rank / Research / Power

## 現在の状態

`Scrap Factory` のPlayable MVPを、Steam掲載相当を目標に継続改善しています。

現在は長期ロードマップの **Phase 3-A: Residential Exploration Progression** まで実装しています。Rank 1 → 2 → 3のFactory進行、Power / Advanced Logistics / Battery / Storage基盤を維持したまま、Transport Terminalから独立Sceneの廃住宅街へ出発し、Main Objectiveを完了してRank 4へ自然に進める最初の探索Progressionを接続しました。

主要ループ:

```text
Factory / Scrap Yard
→ 回収・加工・自動化
→ Rank Up / Research
→ Transport Terminal
→ 独立探索エリア
→ Objective / Loot / Resource Point
→ 正常帰還
→ Factory強化
```

Rank 4では次の工場要素が実際の通常Progressionから利用可能になります。

```text
Power構築 → Generator / Power Pole → Battery Research
+
Mk.2高速搬送 → Splitterで分岐 → Mergerで合流 → Storage Buffer → 複数ライン最適化
```

Hubではゲームごとの進行、所持金、累計売上、プレイ時間を表示します。未完成ゲームは起動導線を出さず `PLANNED` として扱います。

## Progression Rank / Research

HUD右上の `RANK` から進行画面を開けます。

- `progressionRank` はAchievement由来の称号と分離した本当のゲーム進行Rank。
- Rank Upは **必須目標 + 選択目標2つ** を基本とする。
- Rank 1 → 2: Hopper → Crusher → SellerのDirectional自動ラインが必須。
- Rank 2 → 3: Crusher → Smelterを含む鉄インゴット完全自動ラインが必須。
- Rank 3 → 4: **廃住宅街Main Objective完了**が必須。さらに探索区画・持帰りLoot・製品発見・売上等から2目標を達成する。
- Rank 2でSmelter / StorageとResearch Tier 2を解放。
- Rank 4でSplitter / Merger / Conveyor Mk.2 / Generator / Power Poleを解放。
- Research Dataを消費して技術を研究する。
- `Basic Fabrication`研究で鉄板の手作業Recipeを解放。
- 廃住宅街Main Objectiveで`Scrap Yard Survey`用BlueprintとResearch Dataを保証入手する。
- `Grid Storage`研究でBatteryを解放する。
- Industrial StorageはRank 5状態向けに先行実装済み。
- 通常GameplayのRank Up上限は現在Rank 4。Rank 4 → 5条件は後続Phaseで接続予定。

Legacy Saveでは既に使っていたSmelter / Storage / 鉄板Craftを検出し、必要な最低Rank / Unlockを補完します。既存Factory LayoutやAchievementは削除しません。

## Phase 2-A: Power Core

PowerはRank 4から有効化されます。Rank 3以前の既存Factoryはこれまで通り電力不要で動作するため、旧Saveや現在のRank 1〜3進行を突然停止させません。

- **Starter Grid** — Factory Base中心から17.5m以内へ55 Powerを無償供給。Crusher 1台 + Smelter 1台の小規模工場はそのまま維持可能。
- **Scrap Generator** — Rank 4 / `$260`。鉄くず1個で24秒稼働し80 Powerを追加供給。
- **Power Pole** — Rank 4 / `$45`。Starter Grid / Generator / 接続済みPoleから12.5m以内で電力網へ接続し、周囲10mのMachineへ給電。
- **Machine需要** — Crusher 18 Power / Smelter 30 Power。Logistics / Storage / Sellerは現段階ではPassive。
- **Power Shortage** — 供給不足または給電範囲外のMachineだけ停止。Input / Output / 処理途中Progressは破壊しない。
- **Recovery** — Generatorへ燃料が入り供給が戻ると停止Machineは自動復旧。
- **Deterministic Allocation** — 不足時の供給対象を安定した順序で決め、Reloadごとに挙動が揺れないようにする。

## Phase 2-B: Logistics Expansion

物流は暗黙の4方向探索へ戻さず、設備ごとに明示されたInput / Output PortをSource of Truthにします。

- **Conveyor Mk.1** — `$12` / 1.5個/秒 / 1入力 → 1出力。
- **Conveyor Mk.2** — Rank 4 / `$28` / 3個/秒。Mk.1の2倍の帯域。
- **Splitter** — Rank 4 / `$85`。背面1入力 → 正面・左・右の有効な搬送先へRound-robin分配。最大3個/秒。
- **Merger** — Rank 4 / `$85`。背面・左・右の3入力 → 正面1出力。最大3個/秒。
- **Route Throughput** — 1つの搬送Route上で最も遅い物流設備が実効帯域になる。Mk.2の途中にMk.1があれば1.5個/秒へ制限される。
- **Directional Contract** — Visual上の方向と実際のInput / Output Portを一致させる。逆向きNodeへ暗黙搬送しない。
- **Stable Distribution** — Splitterの分配位置はBuilding単位の`logisticsCursor`で維持し、Save / Reload後も順序が不定にならない。
- **Factory Alerts** — 新物流Nodeの行き止まりと、Splitterの分岐先が1本しかない状態を検出する。
- **Visual** — Mk.2 / Splitter / Mergerは専用の床置きProcedural形状を持ち、搬送方向を黄色いMarkingで示す。

## Phase 2-C: Power Buffer & Storage

Phase 2-Cでは「発電が一瞬足りない」「倉庫が満杯でItemが消える」といった大規模化前の問題を扱います。

- **Grid Storage Research** — Rank 4 / Research Data 2。BatteryのBuild UnlockをResearchへ分離。
- **Grid Battery** — `$220` / 960 Energy。余剰電力を最大60 Powerで自動充電し、不足時は最大80 Powerで自動放電。
- **Battery Coverage** — Starter Gridまたは接続済みPower Poleの給電範囲内だけGridへ参加する。未接続Batteryは充放電しない。
- **Battery Persistence** — 保存するのはBuilding単位の`powerStored`だけ。発電量・需要・充放電量・Shortage状態は毎Frame導出する。
- **Small Storage** — 最大120個。満杯時は新しいItemを受け取らず、上流へBack Pressureをかける。
- **Industrial Storage** — Rank 5 / `$240` / 最大600個。将来のRank 5 Factory向け大容量Buffer。
- **No Item Loss** — 手動投入・自動搬送とも残容量を超えて投入せず、旧Saveに容量超過Storageがあっても既存Itemを削除しない。
- **Factory Management** — Storage使用量 / 容量 / 満杯Alert、Power供給/需要、Battery残量をコンソールへ表示。
- **Visual** — BatteryとIndustrial Storageに専用Procedural Silhouetteを追加。Batteryは残量GaugeがRuntime stateへ連動する。

## Phase 3-A: Residential Exploration Progression

Rank 3からTransport Terminalで最初の独立探索エリア **廃住宅街** へ出発できます。

### Transport Terminal

Factory HUDの `T / TERMINAL` から開きます。

表示内容:

- エリア危険度
- Main Loot
- Main Objective
- 推奨状態
- 区画発見率
- Resource Point状態
- 成功帰還回数 / 持帰りLoot数
- Transport Depot

Factory Sceneと探索Sceneを同時にフルロードせず、探索開始時に独立ページへ遷移します。

### 廃住宅街

Main Objective:

```text
西側ガレージで予備ヒューズを回収
→ SUBSTATIONの変電盤を復旧
→ 調査Terminalを起動
→ Blueprint / Research Dataを確保
→ 入口Transport Terminalへ正常帰還
```

- 4つの永続区画: Entry Point / Row Houses / West Garage / Substation
- 銅線 / 廃プラスチック / 電子ジャンクを探索Lootとして回収
- 探索用12 Slot Session PackをFactory Backpackと分離
- Main Objective進行と発見区画は探索を中断・放棄しても保持
- Main Objective報酬はRandom Dropではなく保証取得
- Objective完了で`Scrap Yard Survey Blueprint`、Research Data +1、住宅街のCopper Resource Pointを記録
- 正常帰還で今回LootをTransport Depotへ確定
- DepotからFactory Backpackの空き分だけ受取可能
- Game Hubへ戻ってもActive Expedition Sessionを保持
- `Abandon Expedition`では今回拾った通常Lootだけ失い、永続探索Progressは維持

このPhaseでは探索基盤とRank 4への進行を優先しています。廃住宅街の本格的な建物内部、敵、HP、環境Hazardは後続Exploration拡張として残しています。

## Scrap Factory 操作

| キー | 操作 |
| --- | --- |
| WASD | 移動 |
| Shift | ダッシュ |
| Space | ジャンプ（Factory） |
| E | 拾う / 設備操作 / 探索Objective操作 |
| B | 建築メニュー |
| R | 建築中の90°回転 |
| F | 解体モード ON / OFF |
| Tab | インベントリ / 簡易クラフト |
| O | ゲーム内ガイド |
| P | Factory Management / 工場管理コンソール |
| T | Transport Terminal / 独立探索エリア |
| 1〜5 | 粉砕機 / 精錬炉 / Mk.1コンベア / 倉庫 / 販売機をクイック建築 |
| Esc | ポーズ / 建築終了 / 管理画面を閉じる |

### Directional Logistics

- 黄色い矢印・Markingが実際の搬送方向。
- Mk.1 / Mk.2は背面から入り、正面へ出る。
- Splitterは背面から入り、正面 + 左右へ分岐する。
- Mergerは背面 + 左右から入り、正面へ合流する。
- 設置後も物流設備を見て `E` → `90°回転` / `向きを反転` で修正可能。
- 粉砕機などの出力は、Input Portが接続していない逆向き物流Nodeへは流れない。
- Rank必須Automation判定も同じDirectional Route Logicを使用する。

### Storage / Back Pressure

- Small Storageは120個、Industrial Storageは600個まで保管する。
- Storageが満杯になると、そのStorageを最終搬送先とするRouteは一時的に使用不可になる。
- Splitterに別の有効な搬送先があればそちらを利用できる。
- 手動投入も残容量だけを移動し、バッグ側の超過Itemは残す。

### 解体

`F`で解体モードへ入り、設備を狙って左クリック。

- Player-built設備は建築費100%返金。
- 設備内のアイテムもバッグへ戻す。
- バッグに収まらない場合はアイテム消失防止のため撤去しない。
- Starter Hopper / Starter Sellerは固定設備で撤去不可。

## Factory Management Pack

`P`で工場管理コンソールを開きます。

- **コンソール** — 資金 / 売上 / セッション売上毎分 / 設備数 / 稼働可能機械 / Buffer量 / Storage容量 / Power / Battery / 発見数 / Play時間
- **Factory Alerts** — 素材待ち、Machine出力滞留、物流Node行き止まり、Splitter分岐不足、Storage満杯を検出
- **物流分析** — Logistics Node数と定義上の総帯域をPure Analysis結果として集計
- **Power分析** — 供給 / 需要 / 余力 / 給電範囲外 / Battery残量をPure Power Snapshotから表示
- **チャレンジ / 実績** — 回収、加工、自動化、建築、売上、発見、Play時間の8項目
- **Factory Title** — Achievement解除数から作る称号。Progression Rankとは別物
- **HUD追跡** — 任意のChallengeを画面上へ固定
- **生産計画** — 欲しい毎分生産量から必要なCrusher / Smelter / Raw素材量を逆算
- **Codex** — Item価格 / Stack / Category、設備価格 / 用途 / Recipeを検索
- **Session Log** — 拾う、売る、建てる、撤去する等のGame通知をSession内で記録
- **Quick Build** — `1〜5`は既存割当を維持し、Build Menuを経由せず主要設備を選択

Factory Management側のChallenge追跡設定は `scrap-factory-management-v1` として別の軽量`localStorage`へ保存します。

## ゲーム内説明

- HUD下部に主要Shortcutを常時表示（設定で非表示可能）。
- Build Mode中は配置 / 回転 / 終了操作と物流Port方向を動的表示。
- `O`でゲーム内ガイドを開き、基本ループ / 操作 / 物流 / 加工 / 解体を確認可能。
- `T`のTransport Terminalから探索エリアの目的・Loot・進捗を確認可能。
- Machine Panelには用途、Recipe、Input / Output、処理時間を表示。
- Logistics Panelでは向き / Port構成 / Throughputを表示。
- Power Machineでは発電量 / 消費量 / 給電範囲外 / 発電不足 / Generator残燃料 / Battery残量を表示。
- Storage Panelでは現在量 / 最大容量 / 満杯状態を表示。
- Tutorial Contractは単語だけでなく「次に何をどう操作するか」を表示。
- `P`の管理コンソールでは、工場が大きくなった後の問題発見・計画を補助する。
- `RANK` HUDから現在Rankの必須 / 選択目標とResearch状態を確認可能。

## 保存

- 保存先: `localStorage`
- Root key: `elitemay-game-hub-v1`
- Root Schema Version: `1`
- Scrap Factory内に `progression.version: 1` / `exploration.version: 1` を保持
- Explorationは`areas / depot / activeSession`をAdditive Dataとして保存
- 発見済み区画 / Main Objective / Resource Point / 帰還統計は永続化
- Active ExpeditionではSession Loot / 回収済みLoot ID / Player位置を保存
- 正常帰還までSession LootをFactory Inventoryへ混ぜない
- Generatorの燃焼途中はBuilding単位の`powerFuelSeconds`として保存
- Battery残量はBuilding単位の`powerStored`として保存
- Splitter等の安定した分配位置はBuilding単位の`logisticsCursor`として保存
- Power Snapshot / Storage残容量は保存せず、Building Dataから導出
- Factoryは30秒、Residential Expeditionは5秒ごとにオートセーブ
- 画面非表示・主要変更時にも保存
- Hub / ゲーム設定からJSON Export可能
- Import前に現在セーブのRecovery Backupを作成
- Root Schema Versionは変更せず、旧SaveはNormalize時にProgression / Exploration / Power / Logistics追加Fieldを安全に補完
- 旧Saveの容量超過Storageは中身を削除せず保持し、新規投入だけ停止
- Directional Logistics / Guide / Factory Managementの既存Contractを維持

詳細は [`SPEC.md`](SPEC.md) を正本とします。

## 技術

- HTML / CSS / JavaScript ES Modules
- Three.js `r185` (`three@0.185.0`) — jsDelivr CDN
- GitHub Pages
- Factoryと独立探索エリアを別Three.js Scene / Pageとして分離
- 外部画像・3Dモデル・フォントなし。ゲーム内VisualはThree.js Geometry / CSSで生成

Three.jsはMIT Licenseです。詳細は [`CREDITS.md`](CREDITS.md) を参照してください。

## GitHub Pages

Workflow: [`.github/workflows/pages.yml`](.github/workflows/pages.yml)

初回だけRepository Settings → Pages → Build and deployment → Source を **GitHub Actions** に設定する必要があります。以降は`main`へのpushで自動Deployします。

## Validation

```bash
npm run validate
npm run test:logistics
npm run test:management
npm run test:progression
npm run test:power
npm run test:storage
npm run test:exploration
```

- `test:logistics` — Directional Port / 逆流 / Splitter / Merger / Round-robin / Mk.1-Mk.2 Throughput Regression
- `test:management` — Factory alert / Logistics / Storage / Power analysis / Quick Build ordering / Challenge / Production planner Regression
- `test:progression` — Rank条件 / Directional Line / Rank 4〜5 Building Gate / Research Gate / Blueprint Gate / Legacy Migration Regression
- `test:power` — Starter Grid / Shortage / Generator / Pole / Battery充放電 / 未接続Battery / Buffer非破壊 / Deterministic allocation Regression
- `test:storage` — Storage容量 / 残容量 / Full Back Pressure / Legacy over-capacity preservation Regression
- `test:exploration` — Rank 3 Area Gate / Session Loot / Zone persistence / Objective順序 / Guaranteed reward / Return / Abandon / Depot / Rank 3→4 Regression

加えてAccount共通のReusable Web Baselineを固定Commit SHAで利用します。

## Project Docs

- [`REQUIREMENTS.md`](REQUIREMENTS.md)
- [`SPEC.md`](SPEC.md)
- [`WORK_REPORT.md`](WORK_REPORT.md)
- [`PROJECT_LEARNINGS.md`](PROJECT_LEARNINGS.md)
- [`project-meta.json`](project-meta.json)

共通制作ルールのSource of Truth: [`EliteMay/web-project-guide`](https://github.com/EliteMay/web-project-guide)
