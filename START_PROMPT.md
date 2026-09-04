# Scrap Factory 制作開始

## 基本情報

サイト / アプリ名：
`Game Hub / Scrap Factory`

GitHub Repository：
`EliteMay/game`

ChatGPT Project：
`game`

## Project概要

完成度の高いブラウザゲームを1本ずつ追加していくGame Hub。現在の中心ゲームは一人称3D工場ゲーム `Scrap Factory`。

Scrap Factoryは、

```text
探索 → スクラップ回収 → 工場へ帰還 → 加工 → 自動化 → 工場成長 → 新しい探索エリア / 技術解放
```

を中心ループとする。

## 目的

探索と工場自動化の両方が最後まで必要になるブラウザゲームとしてScrap Factoryを継続完成させる。

## 想定利用者

- 主利用者: Repository Owner本人
- Primary Device: Desktop / Keyboard + Mouse
- 公開: GitHub Pages

## 要件の正本

Scrap Factoryのゲーム内容・進行・探索・自動化に関する詳細要件は `REQUIREMENTS.md` を正本とする。

この開始Promptでは詳細要件を重複して持たず、作業開始時に必要な入口と崩してはいけない方針だけを保持する。

現在の要件定義Statusも `REQUIREMENTS.md` を確認する。

## 確定している中心方針

- 工場ランクは7段階。
- Rank Upは必須目標 + 選択目標方式。
- Rankは大きな進行、ResearchはRank内の技術選択、探索は特殊技術・Blueprint・新資源発見を担当する。
- Factoryと現行Scrap Yardは同一Sceneを維持する。
- 廃住宅街 / 廃工場 / 軍事施設 / 崩壊した研究施設はTransport Terminalから移動する独立探索エリアとする。
- 探索マップは固定構造 + Loot・敵・小型ギミック等の一部ランダム。
- 探索は素材回収だけでなく、電源復旧・端末操作・区画解放・装置修理等の軽い攻略を持つ。
- 探索用BackpackはSlot + Weight制へ発展させる。
- 探索からの正常帰還は指定帰還地点方式。メニュー即時ワープにはしない。
- 探索失敗時はその探索中に新しく拾った通常Lootを失い、恒久進行・基本装備・Secure Case等は保持する。
- 軽い戦闘は導入するが、戦闘を主役にはしない。
- 後半でも探索を不要にせず、レア素材・新技術・特殊部品等は自分で探索して入手する。
- 発見済み通常資源の反復回収は後半にDroneで自動化できる。
- Rank 7後は崩壊した研究施設を攻略し、最終技術を工場へ持ち帰る。
- Mega Factoryで最終製品を完全自動生産し、安定稼働させることをMain Clearの中心とする。

詳細なRank条件、Research、Power、Logistics、Drone、Recipe、Economy、Factory Expansion、Build System、Save、Performance等は `REQUIREMENTS.md` を確認する。

## 主な機能

- 一人称3D探索
- Scrap回収 / Loot / Resource Point
- Backpack / Inventory / Secure Case
- Direct Selling / Economy / Optional Order
- Crusher / Smelter / Assembler / Fabricator
- Conveyor / Splitter / Merger / Smart Sorter / Priority / Overflow
- Grid Building / Safe Dismantle / Move / Upgrade
- Power / Generator / Battery
- Research / Blueprint
- Drone / 自動素材回収
- Factory Expansion / Elevated Logistics
- Factory Management Console / Alerts / Production Planner
- Tutorial / Field Manual / Codex
- Challenge / Achievement
- Save / Backup / Export / Import / Migration
- Rank 1〜7 / Research Facility / Mega Factory / Main Clear

## 重要仕様 / 崩してはいけないこと

- Scrap Factoryの主役は「探索 → 加工 → 自動化 → 成長」。
- 戦闘中心のFPSへ変えない。
- 後半で探索を完全に不要にしない。
- CashだけでRank Upできる構造にしない。
- 進行必須Itemを極端なRandom Dropだけに依存させない。
- 時間制限中心のExtraction Gameへ変えない。
- 複雑なPuzzle Gameへ変えない。
- 未完成ゲームをPlayable表示しない。
- Save Schema変更時に旧Dataを無断破棄しない。
- 既存Factory Layout / 2.5m Grid / Factory座標系を理由なく破壊しない。
- 既存Directional Conveyorの方向とVisual Arrowを一致させる。
- 現行Scrap Yardを理由なくFactoryから分離しない。
- GitHub PagesのRepository subpathで動く相対Pathを維持する。
- 既存Repository、`REQUIREMENTS.md`、`SPEC.md`、`README.md`、`PROJECT_LEARNINGS.md`、現行実装を無視して作り直さない。

## MVP

現在のPlayable MVPはすでに存在する。

制作Projectでは既存MVPを壊さず、`REQUIREMENTS.md` の長期要件へ段階的に拡張する。

現在MVPの主要成立条件：

- HubからScrap Factoryへ入れる。
- Factory東側Scrap Yardへ移動してScrapを回収できる。
- 売却して設備代を稼げる。
- 設備を自由配置できる。
- Directional Conveyor経由で機械間搬送が動く。
- 加工品が販売されCashへ反映される。
- 再読込後にSaveが復元される。

## 完成条件

Playable MVPとLong-term Main Clearの完成条件は `REQUIREMENTS.md` を正本として確認する。

長期的には最低限、

- Rank 1〜7の進行が成立する。
- 探索エリア解放と工場成長がつながる。
- Research / Power / Logistics / Droneが段階的に解放される。
- 後半でも探索と自動化の両方に意味が残る。
- Rank 7から研究施設攻略、最終技術、Mega Factoryまで到達できる。
- Main Clear後も同じSaveでFactory Optimization / Challenge等を継続できる。
- 既存Save互換性を必要に応じてMigrationし、無断破棄しない。
- Repository文書と現行実装が一致する。

状態を満たす。

## 制作開始時

Web / Electron制作に関係する作業では、最新の `EliteMay/web-project-guide` の `README.md` と `START_HERE.md` を最初に確認し、今回の作業に必要なOwner Docだけ読む。

対象Repository `EliteMay/game` は既に実装済みなので、現在のGitHub上の `README.md` / `REQUIREMENTS.md` / `SPEC.md` / `PROJECT_LEARNINGS.md` / `WORK_REPORT.md` / 実装 / Tests を作業内容に必要な範囲で確認してから変更する。

古い会話や以前のルールだけを現在状態として扱わない。
