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
探索 → スクラップ回収 → 工場へ帰還 → 加工 → 自動化 → 工場成長 → 新しい探索エリア解放
```

を中心ループとする。

## 目的

探索と工場自動化の両方が最後まで必要になるブラウザゲームとしてScrap Factoryを継続完成させる。

## 想定利用者

- 主利用者: Repository Owner本人
- Primary Device: Desktop / Keyboard + Mouse
- 公開: GitHub Pages

## 確定要件

- 工場ランクは7段階。
- ランクアップは売上だけでなく、生産・設備・自動化・探索等の複数条件を使う。
- 1枚の巨大オープンワールドではなく、工場を拠点とするエリア選択式。
- 想定探索エリアは Scrap Yard / 廃住宅街 / 廃工場 / 軍事施設 / 崩壊した研究施設。
- 探索マップは固定構造 + 素材・鍵・小型ギミック等の一部ランダム。
- 探索は素材回収だけでなく、電源復旧・端末操作・区画解放・装置修理等の軽い攻略要素を持つ。
- 探索用バックパックは将来スロット数 + 最大重量制へ拡張する。
- バックパック強化はお金 + 素材方式。
- 探索からの帰還は指定帰還地点方式。メニュー即時ワープにはしない。
- 探索失敗時は、その探索中に新しく拾った素材・アイテムのみ失う。
- 恒久進行、工場設備、所持金、バックパック強化、基本装備は原則失わない。
- 探索失敗の表現は死亡ではなく気絶・行動不能。
- 軽い戦闘は導入するが、戦闘を主役にはしない。
- 武器は護身用・危険排除用を中心とし、敵を避ける選択肢も残す。
- 後半でも探索を不要にせず、レア素材・新技術・特殊部品等は探索で入手する。
- Rank 7後の最終探索エリアは「崩壊した研究施設」。
- 最上位技術を持ち帰り、大規模な自動工場を完成させることをエンドゲームの中心とする。

## 主な機能

- 一人称3D探索
- Scrap回収 / Respawn
- Backpack / Inventory
- Direct Selling
- Crusher / Smelter / Conveyor / Storage / Seller
- Grid Building
- Directional Conveyor Logistics
- Safe Dismantle
- Hand Crafting
- Cash / Revenue
- Tutorial / Field Manual / Codex
- Factory Management Console
- Factory Alerts
- Challenge / Achievement
- Production Planner
- Save / Export / Import
- 将来: 新探索エリア、電力、物流拡張、ドローン、研究、高度自動化

## 重要仕様 / 崩してはいけないこと

- Scrap Factoryの主役は「探索 → 加工 → 自動化 → 成長」。
- 戦闘中心のFPSへ変えない。
- 未完成ゲームをPlayable表示しない。
- Save Schema変更時に旧Dataを無断破棄しない。
- 既存Directional Conveyorの方向とVisual Arrowを一致させる。
- GitHub PagesのRepository subpathで動く相対Pathを維持する。
- 既存Repository、`REQUIREMENTS.md`、`SPEC.md`、`README.md`、`PROJECT_LEARNINGS.md`、現行実装を無視して作り直さない。

## 禁止事項

- 探索を後半で完全に不要にする設計。
- お金だけでRankが上がる設計。
- 時間制限中心の脱出ゲーム化。
- 複雑なパズルゲーム化。
- 戦闘を主要進行条件にすること。
- 既存Saveや工場レイアウトを理由なく破壊する変更。

## MVP

現在のPlayable MVPはすでに存在する。

制作Projectでは既存MVPを壊さず、長期要件へ段階的に拡張する。

現在MVPの主要成立条件：

- HubからScrap Factoryへ入れる。
- 探索してScrapを回収できる。
- 売却して設備代を稼げる。
- 設備を自由配置できる。
- コンベア経由で機械間搬送が動く。
- 加工品が販売されCashへ反映される。
- 再読込後にSaveが復元される。

## 将来候補

- Rank 1〜7の詳細実装
- 廃住宅街 / 廃工場 / 軍事施設 / 崩壊した研究施設
- HP / 回復 / 環境ダメージ
- 護身用武器 / 敵AI
- 電力
- Splitter / Merger / 高速Conveyor
- ドローン / 自動素材回収
- 研究システム
- 新素材 / 新レシピ / 高度加工設備
- クリア後コンテンツ

## 完成条件

- 確定済みの基本ループが一貫して成立する。
- Rank進行と探索エリア解放がつながる。
- 工場成長が探索能力向上へつながる。
- 後半でも探索と自動化の両方に意味が残る。
- Rank 7から崩壊した研究施設、最終技術、大規模自動工場まで到達できる。
- 既存Save互換性を必要に応じてMigrationし、無断破棄しない。
- Repository文書と現行実装が一致する。

## 未確定事項

以下は制作段階で、確定済みの中心方針を変えない範囲で詳細化してよい。

- HPの具体方式と数値
- 回復方法
- 武器種類 / 弾薬
- 敵種類 / AI / 出現密度
- 環境ダメージ
- Rank 1〜7の正確な昇格条件
- 各ランクの設備・素材・レシピの最終一覧
- 電力システム
- 物流設備の詳細
- ドローン / 自動素材回収
- 研究システム
- Economy balance
- Rank 7後の追加コンテンツ

## 制作開始時

このChatGPT Projectでは、GitHub Repository `EliteMay/web-project-workflow` の最新 `DEVELOPMENT_PROJECT.md` を共通Project設定の正本として扱う。

Web制作ルールは `EliteMay/web-project-guide` の最新版をSource of Truthとする。

対象Repository `EliteMay/game` は既に実装済みなので、現在のGitHub上の `README.md` / `REQUIREMENTS.md` / `SPEC.md` / `PROJECT_LEARNINGS.md` / `WORK_REPORT.md` / 実装 / Tests を作業内容に必要な範囲で確認してから変更する。

古い会話や以前のルールだけを現在状態として扱わない。
