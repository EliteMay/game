# Game Hub

**Site:** https://elitemay.github.io/game/

完成度の高いブラウザゲームを1本ずつ追加していく個人Game Hubです。

現在のPlayable Game:

- **Scrap Factory** — 一人称3D / スクラップ回収 / 加工 / 販売 / 自由配置 / 方向付きコンベア自動化 / 工場管理 / Progression Rank / Research / Power Core

## 現在の状態

`Scrap Factory` のPlayable MVPを、Steam掲載相当を目標に継続改善しています。

現在は長期ロードマップの **Phase 2-A: Power Core** まで実装しています。Phase 1のRank 1 → 2 → 3進行を維持したまま、将来のRank 4 Factory向けにStarter Grid / Scrap Generator / Power Pole / Power Shortage・Recoveryのcoreを追加しました。

主要ループ:

```text
探索 → スクラップ回収 → 拠点へ帰還 → 加工 → 販売 → 設備購入 → コンベア自動化 → Rank Up / Research → 工場管理 → セーブ
```

Rank 4以降では次のループが加わります。

```text
Starter Grid → 電力需要増加 → 発電不足 → Scrap Generatorへ燃料供給 → Power Poleで給電範囲拡張 → Machine復旧
```

Hubではゲームごとの進行、所持金、累計売上、プレイ時間を表示します。未完成ゲームは起動導線を出さず `PLANNED` として扱います。

## Progression Rank / Research

HUD右上の `RANK` から進行画面を開けます。

- `progressionRank` はAchievement由来の称号と分離した本当のゲーム進行Rank。
- Rank Upは **必須目標 + 選択目標2つ** を基本とする。
- Rank 1 → 2: Hopper → Crusher → SellerのDirectional自動ラインが必須。
- Rank 2 → 3: Crusher → Smelterを含む鉄インゴット完全自動ラインが必須。
- Rank 2でSmelter / StorageとResearch Tier 2を解放。
- Research Dataを消費して技術を研究する。
- `Basic Fabrication`研究で鉄板の手作業Recipeを解放。
- Blueprint必須Researchは、Blueprint未発見では研究不可。
- 通常GameplayのRank Up上限は現在Rank 3。Rank 4への自然な到達条件は探索Phaseで接続予定。
- Rank 4状態ではPhase 2-AのPower Coreが有効になり、Generator / Power Poleが解放される。

Legacy Saveでは既に使っていたSmelter / Storage / 鉄板Craftを検出し、必要な最低Rank / Unlockを補完します。既存Factory LayoutやAchievementは削除しません。

## Phase 2-A: Power Core

PowerはRank 4から有効化されます。Rank 3以前の既存Factoryはこれまで通り電力不要で動作するため、旧Saveや現在のRank 1〜3進行を突然停止させません。

- **Starter Grid** — Factory Base中心から17.5m以内へ55 Powerを無償供給。Crusher 1台 + Smelter 1台の小規模工場はそのまま維持可能。
- **Scrap Generator** — Rank 4 / `$260`。鉄くず1個で24秒稼働し80 Powerを追加供給。
- **Power Pole** — Rank 4 / `$45`。Starter Grid / Generator / 接続済みPoleから12.5m以内で電力網へ接続し、周囲10mのMachineへ給電。
- **Machine需要** — Crusher 18 Power / Smelter 30 Power。Conveyor / Storage / SellerはPhase 2-AではPassive。
- **Power Shortage** — 供給不足または給電範囲外のMachineだけ停止。Input / Output / 処理途中Progressは破壊しない。
- **Recovery** — Generatorへ燃料が入り供給が戻ると停止Machineは自動復旧。
- **Deterministic Allocation** — 不足時の供給対象を安定した順序で決め、Reloadごとに挙動が揺れないようにする。

Phase 2の残りでSplitter / Merger / Conveyor Mk.2 / Throughput / Battery基盤 / Storage拡張 / 新Recipeを追加します。

## Scrap Factory 操作

| キー | 操作 |
| --- | --- |
| WASD | 移動 |
| Shift | ダッシュ |
| Space | ジャンプ |
| E | 拾う / 設備操作 / コンベア設定 |
| B | 建築メニュー |
| R | 建築中の90°回転 |
| F | 解体モード ON / OFF |
| Tab | インベントリ / 簡易クラフト |
| O | ゲーム内ガイド |
| P | Factory Management / 工場管理コンソール |
| 1〜5 | 粉砕機 / 精錬炉 / コンベア / 倉庫 / 販売機をクイック建築 |
| Esc | ポーズ / 建築終了 / 管理画面を閉じる |

### コンベア

- 黄色い矢印が実際の搬送方向。
- 機械から出す最初のコンベアは、機械から離れる方向へ向ける。
- 途中のコンベアは向きを変えることで曲げられる。
- 設置後もコンベアを見て `E` → `90°回転` / `向きを反転` で修正可能。
- 粉砕機などの出力は、逆向きのコンベアへは流れない。

### 解体

`F`で解体モードへ入り、設備を狙って左クリック。

- Player-built設備は建築費100%返金。
- 設備内のアイテムもバッグへ戻す。
- バッグに収まらない場合はアイテム消失防止のため撤去しない。
- Starter Hopper / Starter Sellerは固定設備で撤去不可。

## Factory Management Pack

`P`で工場管理コンソールを開きます。

- **コンソール** — 資金 / 売上 / セッション売上毎分 / 設備数 / 稼働可能機械 / Buffer量 / 発見数 / Play時間
- **Factory Alerts** — 素材待ち、Machine出力滞留、Conveyor行き止まりを検出
- **チャレンジ / 実績** — 回収、加工、自動化、建築、売上、発見、Play時間の8項目
- **Factory Title** — Achievement解除数から作る称号。Progression Rankとは別物
- **HUD追跡** — 任意のChallengeを画面上へ固定
- **生産計画** — 欲しい毎分生産量から必要なCrusher / Smelter / Raw素材量を逆算
- **Codex** — Item価格 / Stack / Category、設備価格 / 用途 / Recipeを検索
- **Session Log** — 拾う、売る、建てる、撤去する等のGame通知をSession内で記録
- **Quick Build** — `1〜5`でBuild Menuを経由せず主要設備を選択

Factory Management側のChallenge追跡設定は `scrap-factory-management-v1` として別の軽量`localStorage`へ保存します。

## ゲーム内説明

- HUD下部に主要Shortcutを常時表示（設定で非表示可能）。
- Build Mode中は配置 / 回転 / 終了操作を動的表示。
- `O`でゲーム内ガイドを開き、基本ループ / 操作 / コンベア / 加工 / 解体を確認可能。
- Machine Panelには用途、Recipe、Input / Output、処理時間を表示。
- Rank 4 Power Machineでは発電量 / 消費量 / 給電範囲外 / 発電不足 / Generator残燃料を表示。
- Tutorial Contractは単語だけでなく「次に何をどう操作するか」を表示。
- `P`の管理コンソールでは、工場が大きくなった後の問題発見・計画を補助する。
- `RANK` HUDから現在Rankの必須 / 選択目標とResearch状態を確認可能。

## 保存

- 保存先: `localStorage`
- Root key: `elitemay-game-hub-v1`
- Root Schema Version: `1`
- Scrap Factory内に `progression.version: 1` を保持
- Generatorの燃焼途中はBuilding単位の`powerFuelSeconds`として保存
- 30秒ごとのオートセーブ
- 画面非表示・主要変更時にも保存
- Hub / ゲーム設定からJSON Export可能
- Import前に現在セーブのRecovery Backupを作成
- Root Schema Versionは変更せず、旧SaveはNormalize時にProgression / Power追加Fieldを安全に補完
- Directional Conveyor / Guide / Factory Managementの既存Contractを維持

詳細は [`SPEC.md`](SPEC.md) を正本とします。

## 技術

- HTML / CSS / JavaScript ES Modules
- Three.js `r185` (`three@0.185.0`) — jsDelivr CDN
- GitHub Pages
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
```

- `test:logistics` — Conveyor rotationと逆流Regression
- `test:management` — Factory alert / Challenge / Production plannerのPure Function Regression
- `test:progression` — Rank条件 / Directional Line / Research / Blueprint Gate / Legacy Migration Regression
- `test:power` — Starter Grid / Shortage / Generator燃料 / Recovery / Pole Coverage / Buffer非破壊 / Deterministic allocation Regression

加えてAccount共通のReusable Web Baselineを固定Commit SHAで利用します。

## Project Docs

- [`REQUIREMENTS.md`](REQUIREMENTS.md)
- [`SPEC.md`](SPEC.md)
- [`WORK_REPORT.md`](WORK_REPORT.md)
- [`PROJECT_LEARNINGS.md`](PROJECT_LEARNINGS.md)
- [`project-meta.json`](project-meta.json)

共通制作ルールのSource of Truth: [`EliteMay/web-project-guide`](https://github.com/EliteMay/web-project-guide)
