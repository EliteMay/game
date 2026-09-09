# Game 03 Requirements — Farm Up

## Status

- Status: **Current Contract / Ready for implementation**
- Updated: 2026-09-09
- Target: Game Hub / Game 03
- Working title: **Farm Up**
- Profile: **GAME**
- Primary device: **Desktop / Keyboard + Mouse**
- Blocking Decisions: **None**
- Implementation has **not** started.
- `Farm Up` is a working title and may change without altering the Product Core.

This file is the Source of Truth for Game 03 product requirements. It does not replace the root `REQUIREMENTS.md`, which remains the Game 01 `Scrap Factory` contract, or `games/orbloom/REQUIREMENTS.md`, which remains the Game 02 `Orbloom` contract.

# 1. Product Core

## Purpose

小さな3D農場から始め、作物・家畜・加工・農業機械・従業員・自動化へ投資しながら、自分で設計した巨大な近代農場へ成長させる育成ゲームを作る。

中心体験は、単に数字が増えることではなく、**農場そのものの規模・見た目・作業方法が段階的に変化すること**とする。

## Core Experience

```text
育てる
→ 収穫する
→ 売る / 加工する
→ お金を稼ぐ
→ 土地 / 作物 / 家畜 / 設備 / 機械へ投資
→ 作業効率と生産規模が上がる
→ 新しい農業方式が解放
→ 自動化
→ さらに巨大な農場へ
```

主役は次の変化である。

```text
手作業
→ 良い農具
→ 農業機械
→ 従業員 / 半自動化
→ 大規模自動化
→ 巨大農場経営
```

## Intended Player Demand

- 軽い計画と投資判断。
- 次に何を解放・購入するかの選択。
- 作物 / 畜産 / 加工の比率を考える。
- 土地・設備・道路・農地を配置して自分の農場を作る。
- 機械化・自動化によって以前の反復作業を効率化する。
- 巨大化していく農場を3D世界で眺める。

高難度操作、厳しい時間管理、強い損失、複雑な会計は主要求にしない。

# 2. Audience / Runtime

- Primary user: Repository owner / desktop player.
- Platform: Browser game inside the existing Game Hub.
- Camera: **Third-person 3D**.
- Primary input: Keyboard + Mouse.
- Supporting surface: Full-screen Farm Management UI.
- Public delivery target may remain the existing Game Hub / GitHub Pages route unless implementation-time repository constraints require another compatible choice.
- Exact rendering library / engine is not fixed by this requirement. Implementation開始時にCurrent RepositoryとCurrent Guideから選定する。

# 3. Core Gameplay Loop

## Moment-to-Moment

```text
畑を耕す
→ 種を植える
→ 水をやる
→ 作物が成長する
→ 収穫する
→ 出荷 / 倉庫へ運ぶ
```

家畜では:

```text
家畜を飼う
→ 餌を与える
→ 生産物を回収
→ 売却 / 加工
```

## Core Loop

```text
生産
→ 収穫 / 回収
→ 売却 / 加工 / 注文
→ 収益
→ 投資
→ 土地・設備・作物・家畜を拡張
→ 生産能力UP
```

## Progression Loop

```text
小規模農場
→ 畜産
→ 水田 / 果樹園 / 温室
→ 機械化
→ 加工・経営
→ 自動化
→ 巨大農場
→ MASTER FARM / MAIN CLEAR
```

# 4. Progression / Unlock Contract

## Currency / Progression

基本通貨は **お金のみ** とする。

進行に使う補助軸:

- 農場Lv / XP
- 行動による熟練度
- 特殊アンロック条件 / Milestone

宝石、研究ポイント、季節コイン等の独立通貨を大量追加しない。

## Farm Level

農場Lvは約30段階を基準とし、レベルごとにできるだけ意味のあるUnlockを置く。

目安:

- Lv1–5: 基本農業 / 最初の土地拡張 / ニワトリ
- Lv6–10: 牧草 / サイロ / 牛 / 肥料 / 水田・米
- Lv11–15: 果樹園 / 果樹 / 温室 / いちご・トマト / 小型トラクター
- Lv16–20: 機械化 / 羊 / 製粉 / パン / コンバイン
- Lv21–25: 豚 / 乳製品加工 / 従業員 / 大型倉庫 / 高級加工
- Lv26–30: ヤギ / 畜産自動化 / 農業自動化 / 自動運転 / 最終大型農場設備

具体的なLv番号・価格・XP量はPlaytestで調整可能とする。

## XP

XPは売上だけでなく、農場活動全体から得る。

- 収穫
- 出荷
- 畜産物回収
- 加工
- 注文達成
- 土地購入
- 新しい設備 / 家畜 / 作物の初回利用

初めて触るContentにはFirst-time XP bonusを付け、単一作物だけの反復を最適解にしない。

## Milestone Unlocks

一部の上位設備はFarm Lvだけでなく、実際の行動条件を要求してよい。

例:

- 小麦大量出荷 → 大型サイロ
- 牛乳一定量出荷 → 上位搾乳設備
- 果物一定量出荷 → 高級果実加工
- 一定面積運営 → 大型農業機械

Main progression必須要素を低確率Random Dropへ依存させない。

# 5. Farming Systems

## Crop Types

最終版は通常作物18〜22種類程度を目安とし、単なる価格違いにしない。

代表候補:

- 小麦
- じゃがいも
- にんじん
- とうもろこし
- キャベツ
- トマト
- いちご
- 米
- 大豆
- かぼちゃ
- 玉ねぎ
- レタス
- スイカ
- メロン
- ぶどう
- コーヒー
- ひまわり
- その他高級作物

作物には必要に応じて次の役割差を持たせる。

- 単発収穫
- 再収穫
- 水田専用
- 温室向き
- 加工向き
- 大規模機械向き

## Crop Growth

```text
種
→ 芽
→ 小さい株
→ 成長した株
→ 収穫可能
```

- 水不足で枯死させない。成長停止 / 大幅低下とする。
- 収穫可能状態で放置しても原則消失しない。
- 成長段階は3D見た目で判別可能にする。
- 成長時間は「待つだけ」にならず、他の農作業中に進む長さを基準にする。

## Fruit Trees

果樹は6〜8種類程度を目安とする。

候補:

- リンゴ
- オレンジ
- 桃
- 梨
- レモン
- さくらんぼ
- その他高級果樹

特徴:

- 苗木購入コスト高め
- 成木まで時間がかかる
- 一度育つと繰り返し収穫
- 長期投資
- 加工価値が高い

## Rice Paddy

水田は通常畑とは別の農業方式とする。

- 水田区画
- 米
- 水田用機械
- 自動灌漑対応

細かな水量管理ゲームにはしない。

## Greenhouse

温室 / ビニールハウスは季節影響を抑える主要Unlockとする。

- 小型 → 中型 → 大型
- 栽培面積増加
- 自動散水 / 施肥 / 収穫へ拡張可能
- いちご・トマト等の高付加価値作物と相性を持たせる

## Fertilizer

肥料は簡易型。

- 成長肥料
- 収穫量肥料
- 品質肥料
- 上位複合肥料

細かなpH / NPK管理は導入しない。

# 6. Seasons / Time / Weather

## Seasons

春 / 夏 / 秋 / 冬の4季節。

- 適正季節: 成長 / 品質等にボーナス
- 季節外: 栽培可能だが効率低下
- Greenhouse: 季節Penaltyをほぼ無効化

季節による完全栽培禁止を基本にしない。

## Day / Night

昼夜Cycleあり。

- 強制就寝なし
- 夜間作業可能
- 気絶 / 時間切れなし

## Weather

最低限:

- 晴れ
- 曇り
- 雨
- 大雨
- 雪

役割例:

- 雨 → 屋外水やり不要
- 晴れ → 一部作物 / Solarに有利
- 雪 → 屋外作物効率低下 / Greenhouse価値UP

洪水や災害で農場資産を大きく破壊する設計にはしない。

# 7. Livestock

主要家畜は7種類前後を目安とする。

- ニワトリ → 卵
- アヒル → アヒル卵
- 牛 → 牛乳
- 羊 → 羊毛
- 豚 → 高価値畜産物
- ヤギ → ヤギ乳
- ハチ → はちみつ

## Livestock Loop

```text
購入
→ 小屋 / 牧場へ配置
→ 餌
→ 成長
→ 生産
→ 回収
→ 売却 / 加工
```

- 幼体 → 成長中 → 成体の軽い成長段階を持てる。
- 餌切れで死亡させない。生産停止 / 低下とする。
- 病気・遺伝・個体IV・複雑な性格管理はNon-goal。
- 施設Upgradeで収容数と自動化能力を拡張。
- 放牧は餌効率等の軽いBonusを持てるが、毎日の厳密な出し入れを要求しない。
- 繁殖を入れる場合は中盤以降の簡易Systemとし、繁殖だけが支配的にならないよう制限する。

## Feed / Compost Loop

```text
牧草
→ サイロ
→ 家畜の餌
```

```text
家畜
→ 堆肥
→ 肥料 / バイオマス
→ 畑 / 電力
```

糞掃除そのものを反復作業の主役にしない。

# 8. Machinery / Tools

## Hand Tools

- クワ
- じょうろ
- 鎌
- 肥料 / 散布系Tool

手作業は範囲拡張で成長し、その後機械へ置き換わる。

## Vehicles / Machinery

最終版は10〜15種類程度を目安。

- 小型 / 中型 / 大型トラクター
- 耕運アタッチメント
- 種まき機
- 肥料散布機
- 草刈り / 牧草回収
- コンバイン
- 稲作用機械
- 運搬車 / Trailer

車両は3D世界で実際に乗って操作できる。

上位Machine upgradeは主に:

- 作業幅
- 速度
- 燃料効率
- Attachments
- 自動運転対応

を変える。

車両事故で農場や作物を大損させる設計にはしない。

# 9. Land / Building / Layout

## Land Expansion

土地は隣接区画を購入して1つの巨大農場へ成長させる。

主要エリア候補:

- 初期農地
- 大平地
- 水辺 / 水田区画
- 牧草地
- 丘側 / 果樹園
- 温室区画
- 工業 / 加工区画
- 後半大型農場区画

土地拡張は面積追加だけでなく、新しい農業方式・設備・ContentのUnlockと結びつける。

## Build Mode

- Grid-based placementを基本とする。
- Previewで設置可 / 不可を明確に表示。
- 回転 / キャンセル / 移動 / 解体を可能にする。
- 配置ミスへのPenaltyは弱め。

## Field Creation

畑は固定サイズだけでなく範囲指定で作れる。

序盤は小区画、後半は大型区画へ拡張。

大規模化後はField単位で作物とAutomation設定を管理可能にする。

## Buildings

主要建物15〜20系統程度を目安。

- 倉庫 / 大型倉庫
- サイロ
- Greenhouse
- 鶏舎 / 牛舎 / 羊舎 / 豚舎 / ヤギ舎
- 養蜂設備
- 製粉所
- ベーカリー
- 乳製品加工
- 果実加工
- 出荷所
- 発電設備
- 従業員関連施設
- 管理センター

主要建物は可能な限り既存施設をUpgradeして見た目・容量・機能を成長させる。

## Roads / Travel

- 道路は車両 / 従業員移動効率を高める。
- 後半は主要地点へのFarm内Fast Travelを許可。
- 道路がないだけで機能停止させるほど厳しくしない。

# 10. Inventory / Storage / Selling

## Inventory

Playerは軽量なInventoryを持つ。

- 種
- 肥料
- 小型収穫物
- Tool

重量シミュレーションは行わない。

## Storage

- 作物
- 果実
- 畜産物
- 飼料
- 肥料
- 加工品
- 種

を倉庫 / サイロへ保存。

```text
小型倉庫
→ 農業倉庫
→ 大型倉庫
→ 物流センター
```

## Selling

序盤:

```text
収穫
→ 出荷箱
→ お金
```

中盤以降:

- 出荷所
- 大型物流設備
- 自動売却
- 最低在庫設定

自動売却で加工用在庫まで無条件に消費しない。

# 11. Economy / Orders / Processing

## Market

通常市場は大きく乱高下させない。

市場価格変動は軽く、特定商品を作らないと損するほど強くしない。

一種類の作物だけが常に最適解になるBalanceを避ける。

## Orders

- 通常注文
- 大口注文
- 高品質注文
- 複合注文
- 高級契約

注文は通常売却より高い報酬 / XPを提供し、普段使わないContentを触る理由を作る。

厳しい期限をMain Progressionへ要求しない。

## Processing

加工品は20〜30種類程度を上限目安とする。

代表ルート:

```text
小麦 → 小麦粉 → パン
牛乳 → チーズ / バター
いちご → ジャム
リンゴ → ジュース
ヤギ乳 → 高級チーズ
```

Recipeは基本1〜2素材程度。

5〜10素材を組み合わせる複雑なFactory recipe treeにはしない。

加工設備は:

```text
手動投入
→ Batch処理
→ 自動搬入 / 搬出
→ 自動加工
```

へ成長する。

加工が常に圧倒的最適解にならないよう、設備費・時間・維持費・土地等とのTrade-offを作る。

# 12. Employees / Automation / Power

## Employees

農場拡大後に従業員を雇える。

担当例:

- 畑
- 畜産
- 機械
- 加工
- 物流

基本:

```text
雇う
→ 担当エリアを指定
→ 給料を払う
→ その作業を自動化 / 補助
```

複雑な性格・幸福度・個別Skill Tree管理は行わない。

## Automation

主要Automation:

- 自動灌漑
- 自動施肥
- 自動種まき
- 自動収穫
- 自動給餌
- 自動採卵
- 自動搾乳
- 自動倉庫搬送
- 自動加工連携
- 自動出荷
- 車両自動運転

Automationはゲーム終了ではなく、**より大きな農場を管理可能にするProgression**として扱う。

停止時は原因を表示する。

例:

```text
AUTO HARVEST停止
原因: 中央倉庫が満杯
```

## Power

農場全体共有の簡易電力System。

- 外部電力契約
- 契約容量Upgrade
- Solar
- Wind
- Biomass

設備ごとの複雑な配線は要求しない。

電力不足時は破損させず、効率低下 / 一部停止 + 明確なWarningとする。

## Costs

後半は:

- 給料
- 電気
- 燃料
- 設備維持費

を持つ。

ただし細かな会計Simulationにはしない。

# 13. Save / Offline / Data Contract

## Data Authority

- 初期完成版は **Local-only canonical save** を基本とする。
- Login / Cloud Sync / Multi-device Syncを初期完成条件にしない。
- Cloud機能を将来追加する場合も、Authority / Conflict / Migrationを別Requirementとして定義してから導入する。
- Cache / derived runtime stateをCanonical Saveと混同しない。

## Save

長期育成GameのためAutosaveを必須とする。

保存対象には最低限:

- Money
- Farm Lv / XP
- Purchased land
- Field layout / crop state
- Fruit trees
- Livestock
- Buildings / upgrades
- Vehicles
- Employees
- Inventory / storage / silo
- Processing
- Power
- Automation settings
- Orders
- Unlocks
- Main Clear history
- Last played timestamp

を含む。

Manual Saveを提供する。

Backup Export / Restoreを正式に提供し、Backupは作成できるだけでなく**Restoreして同じ農場へ戻せること**をCompletion条件とする。

既存Saveを壊すSchema変更ではMigration / Backup / Recoveryを必須検討とし、保存済み農場を理由なくResetしない。

## Offline Progression

原則として**自動化済みの部分だけ**Offline進行する。

- 自動化なし → 進行なし / ごく限定的
- 自動化済み畑 → 条件を満たせば成長・収穫・再植付
- 自動給餌 / 回収済み畜産 → 生産
- 原料 / 電力 / Storage条件を満たす加工 → 生産

Offline処理はLoad時に経過時間からまとめて計算し、大量Entityを逐次Simulationしない。

基本上限は8〜12時間程度を候補とし、後半Upgradeで24時間程度まで拡張可能。具体値はPlaytestで調整する。

Return時はOffline Reportを表示する。

# 14. Player Skill / Collection

## Mastery

軽い熟練度:

- 農作業
- 畜産
- 機械操作
- 加工
- 建築 / 管理

行動で自然に上昇し、小さな効率Bonusを提供する。

Farm Lvが主要機能Unlock、熟練度は「その作業が少し上手くなる」役割とする。

全熟練度MAXをMain Clear条件にしない。

## Collection / Achievements

- 作物
- 果樹
- 家畜
- 加工品
- 機械
- 建物

の図鑑 / Collectionを持てる。

Achievement報酬はXP・少額Money・装飾・称号程度を中心とし、Main Progression必須設備をAchievement限定にしない。

# 15. UI / Interaction / Accessibility Contract

## HUD Principle

```text
通常農作業
→ HUD最小

対象を見る
→ Contextual情報

車両
→ Vehicle HUD

建築
→ Build UI

農場全体を考える
→ Management UI
```

1つのHUDへ全情報を詰め込まない。

## Regular HUD

常時表示候補:

- Money
- Farm Lv / XP
- Season
- Time
- Weather
- Selected tool / seed / fertilizer

## Contextual UI

畑・家畜・設備へ照準 / 接近したときだけ必要情報を表示。

## Vehicle HUD

車両搭乗時のみ:

- Speed
- Fuel
- Attachment
- Work state
- Load / tank
- Current field / operation

## Build UI

- Category
- Selected building
- Price / capacity / power
- Placement preview
- Rotate / Confirm / Cancel

## Farm Management

Full-screen management surfaceを持つ。

主要情報:

- Overview
- Fields
- Livestock
- Processing
- Storage
- Employees
- Vehicles
- Automation
- Orders
- Finance
- Farm Map

Overviewを開けば、農場の問題と次の対応が分かること。

## Menu

Title:

- Continue
- New Game
- Load Game
- Settings
- Credits

Pause:

- Resume
- Save
- Settings
- Controls
- Help
- Return to Title

複数Save slotを許可する。

## Accessibility / Comfort

最低限:

- 主要Gameplay key bindingを変更可能にする。
- Keyboard focusを失わず、Menu / Management surfaceの主要操作をKeyboardでも到達可能にする。
- Focus stateを見分けられるようにする。
- Text / important UIはBlockingなContrast不足を残さない。
- Warning / status / placement可否を**色だけ**で表現しない。
- Motion BlurをOFF可能にする。
- Camera ShakeをOFFまたは大幅軽減可能にする。
- Camera sensitivity / distanceを調整可能にする。
- Mini-map / tutorial hint / contextual hint等、画面情報量を必要に応じて調整可能にする。

# 16. Tutorial / Returning Player

最初の10〜15分で:

```text
耕す
→ 植える
→ 水やり
→ 成長
→ 収穫
→ 出荷
→ 最初のUpgrade / 土地拡張
```

を一周させる。

説明文を大量に読ませず、今やるActionを1つずつ案内する。

最初の30〜60分では、作物複数種・土地拡張・農具強化・Sprinkler・最初の畜産・注文まで到達可能なテンポを目標にする。

Returning PlayerにはOffline Reportと重要な問題を簡潔に表示する。

# 17. Visual Direction

## Target Direction

**Stylized Modern Farming**

- 現代的な農場
- 実在感のある農業機械
- 少しデフォルメされた作物・家畜
- 明るく読みやすい色
- 終盤の巨大農場には重量感とScale感

Visualの中心報酬は、UI演出だけでなく**3D世界そのものが成長すること**。

```text
小さな畑
→ 複数農地
→ 水田 / 果樹園 / 牧場 / 温室
→ 大型倉庫 / サイロ
→ 大型農機
→ 加工区画
→ 自動化された巨大近代農場
```

## Crops / Animals / Machines

- 作物は遠くからでも種類・収穫可否を判別しやすくする。
- 家畜は現実寄りの形 + 少し親しみやすいデフォルメ。
- 農業機械は可愛くしすぎず、大きさ・重量・用途が分かる。
- 建物は用途を外観で判別しやすくする。

## UI Visual

Worldは温かい農場感、UIは現代的で整理された管理UI。

木目・紙・ロープ等を全面に使う古典的Farm UIへ寄せすぎない。

Avoid:

- 超写実的で暗いTone
- 極端なSD / Toy感
- 大量の常時HUD
- 過剰Bloom / Motion Blur
- 背景と同化する作物 / 設備

Visual researchの根拠は `games/farm-up/DESIGN_RESEARCH.md` を参照する。

# 18. Feedback / Audio

主要Actionは結果が即座に分かるFeedbackを持つ。

- 耕作 → 土の見た目変化
- 水やり → 濡れた土 / Water effect
- 収穫 → Crop visual + item gain
- 売却 → Money gain
- Level Up → Unlock内容を明示
- Land purchase → 新区画を見せる
- Building upgrade → 3D外観を変える
- Machine purchase → 車庫等へ実物を出す
- Automation complete → 実際に農場が動き始める

Audio:

- Calm BGM
- Wind / birds / livestock / rain
- Machinery sound
- Harvest / tool / UI feedback

VolumeはMaster / Music / SFX / Environment / Vehicle等に分離可能にする。

# 19. Non-goals

Farm Upを次のGameへ変えない。

- 恋愛 / 結婚 / NPC好感度中心の生活Simulation
- Survival / Hunger / Sleep / HP管理
- 厳密な土壌pH / NPK / 農薬Simulation
- 家畜病気 / 死亡 / 遺伝Simulation
- 車両故障や事故損失中心のSimulator
- 複雑なFactory conveyor puzzle
- 多数素材Recipe tree
- Offline数字だけを見る放置Game
- 強い作物枯死 / 家畜Loss / 災害Penalty
- 強制就寝 / 厳しい時間制限
- Main ProgressionをRandom Dropへ依存
- 大量の独立通貨
- 数値+5%だけを何十回も続けるProgression
- 大規模Town / NPC生活Simulation
- Multiplayerを初期完成条件にする

# 20. Phased Delivery

## Vertical Slice

最初に完成させるFlow:

```text
小さな農場
→ 小麦を植える
→ 水をやる
→ 成長
→ 収穫
→ 出荷
→ お金
→ 土地を1回拡張
```

ここで操作・成長速度・収穫・売却・Upgradeの気持ちよさをActual Playtestする。

## Playable MVP

MVP必須:

- Third-person movement
- Small farm
- Field creation
- Hoe / watering
- Planting / growth / harvest
- Selling
- Money
- Farm Lv / XP
- Land expansion
- Tool upgrade
- 3〜5 crops
- Basic day/night + weather
- Autosave / Load
- Minimal HUD
- Initial tutorial

MVPでは畜産・水田・果樹・大型機械・加工・従業員・電力・高度自動化を一度に必須にしない。

## Later Phases

1. Core farming / field expansion
2. Crop variety / fertilizer / orders / storage
3. Livestock
4. Rice / orchard / greenhouse
5. Machinery
6. Processing / employees / economy
7. Automation / power / offline progression
8. Mega farm / Main Clear

Core Before Varietyを守り、代表Contentが面白く安定する前に種類だけ大量追加しない。

# 21. Primary Completion Condition

Main ClearはFarm Lv30到達だけでは成立しない。

代表条件:

- 主要土地を取得
- 水田 / 果樹園 / Greenhouse / Livestockを運営
- 主要家畜を解放
- 主要農業機械を所有
- 加工施設を稼働
- 作物側Automationを一定以上達成
- 畜産側Automationを一定以上達成
- 目標Farm Value / Production scaleへ到達

達成時:

```text
MASTER FARM
MAIN CLEAR
```

Main Clear後も同じSaveで継続し、Clear履歴は農場を組み替えても失わない。

Post ClearではCollection completion、Automation最適化、最高品質量産、Farm Value更新、Layout改善等を継続できる。

# 22. Performance / Scale Contract

最終農場は、序盤と明確に違う巨大Scaleを見せる。

目安:

- 大型畑複数
- 水田複数
- 果樹園
- 温室群
- 各種家畜
- 複数倉庫 / サイロ
- 加工区画
- 複数農業機械
- 従業員
- 発電設備
- Automation

数百〜数千頭の家畜を常時Full simulationすることを目的にしない。

遠距離 / Off-screen Contentは必要に応じて簡易Simulationとし、巨大農場を実用的なPerformanceで維持する。

Performance completionでは最低限:

- Cold LoadからPrimary Task開始までを確認する。
- Initial loadだけでなく、長時間Play SessionでRuntimeが不安定化しないことを確認する。
- Repeated build / harvest / vehicle / management操作で明確なMemory / responsiveness劣化を残さない。
- Main Clear相当のStress Farmで移動・収穫・車両・Automation・Management UI・Save / Loadを確認する。
- 遠距離Entity / off-screen simulationの軽量化が、Saveや生産結果と重大に矛盾しないことを確認する。

# 23. Validation / Completion Contract

## Core Loop Playtest

最低限確認:

- 耕す / 植える / 水やりが面倒すぎない
- 成長待ちが長すぎない
- 収穫が気持ちいい
- 売却から次Upgradeまでの距離が適切
- 同じ作業の反復だけにならない

## Early / Mid / Late Playtest

Early:

- 30〜60分以内にCore Loop / 最初の拡張 / 次Contentへ到達可能
- 次に何をすべきか理解できる

Mid:

- 水田 / 果樹 / 温室 / 畜産 / Machinery / Processingが同じSystemの色違いになっていない
- Machinery導入で操作が実際に変わる

Late:

- Automation後も新しい規模・経営判断が残る
- Management UIに意味がある
- Power / Storage / Feed / Processingの問題原因を理解できる

## Economy

Avoid:

- 単一Cropだけが常時最適
- Processingだけが圧倒的最適
- Employee最大雇用が無条件最適
- 何時間も意味ある購入ができない停滞

## Save / Data Integrity

最低限:

- New Save → Autosave / Manual Save → Reloadで主要Game Stateを保持する。
- Save処理中に追加State変更が発生しても、古い保存結果が新しいStateを上書きしない。
- Storage write failureをSavedとして表示しない。
- Corrupt / invalid saveを検知した場合、正常SaveやBackupまで無条件Resetしない。
- 旧Schema → Migration → ReloadでCurrent Stateを保持できる。
- Migration途中失敗 / 再実行で二重変換や消失を起こさない。
- Backup Export → Current Data変更 / 削除 → Restore → ReloadのRound-tripを通す。

## Offline

Offline処理で:

- 二重生産しない
- Item消失しない
- Storage / Feed / Power等の停止条件を尊重する
- Offline上限を超えた時間を無制限に報酬化しない
- Offline Reportが実際の計算結果と一致する

## UI / Accessibility / Visual

- Main Task / Primary Action / Management navigationのHierarchyが理解できる。
- Keyboard focus / key remap / contrast / non-color-only stateを確認する。
- Motion Blur / Camera Shake OFFが実際に反映される。
- Main gameplay / Vehicle / Build / Managementの各StateでHUDが必要以上に画面を覆わない。
- First View / Main Task / Navigation / overflow / clipping / interactive statesを実BrowserでVisual確認する。

## Main Clear

Fresh Startから通常GameplayだけでMain Clearまで到達可能であること。

Developer commandやSave編集をMain progressionの前提にしない。

Main Clear後も同じSaveで継続でき、Clear履歴は保持される。

# 24. Important Assumptions / Open Tuning

次はBlocking Decisionではなく、Prototype / Playtest / implementation-time evidenceで調整する。

- 最終タイトル
- 各Crop / Livestock / Processingの具体数値
- Farm Lvごとの正確なUnlock番号
- 成長時間
- XP curve
- Land / Machine価格
- Market fluctuation幅
- Offline上限
- Main Clear threshold
- 最終Map size / Field max size
- Exact graphics stack / 3D library
- Exact save schema implementation

これらを理由にCore ExperienceやNon-goalsを変更しない。

# 25. Implementation Handoff

- Status: **Ready for implementation**
- Requirements updated: 2026-09-09
- Blocking Decisions: **None**
- Working title: Farm Up
- Target path: `games/farm-up/`
- Implementation conversation: `game（実装）`

Implementation開始時は、Current `EliteMay/web-project-guide`、Current Repository、`games/farm-up/REQUIREMENTS.md`、`games/farm-up/DESIGN_RESEARCH.md`を確認し、古いConversation summaryだけをSource of Truthにしない。

## Requirements Completion

Requirements definition is complete when this Current Contract is stored in the Repository and re-fetch verification confirms:

- Product Core / Non-goalsが保持されている。
- Save / Offline / Accessibility / Performance / Validation contractが存在する。
- Blocking Decisionが残っていない。
- ImplementationがCurrent Requirementsから開始可能である。
