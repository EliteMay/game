# Requirements

## 要件定義ステータス

- Status: **詳細要件整理中**
- Last Updated: 2026-09-05
- 対象: Game Hub / Game 01 `Scrap Factory`
- このファイルを Scrap Factory のゲーム内容・進行・探索・自動化に関する要件の正本とする。
- 実装詳細は現行 `SPEC.md`、現行挙動はRepository上の実装を照合する。
- 既存Save / Directional Conveyor / GitHub Pages対応等の確定済みContractを、詳細化のために無断変更しない。

## 目的

完成度の高いブラウザゲームを1本ずつ追加できるGame Hubを作る。大量の未完成ミニゲームを並べず、各ゲームは主要ループ・保存・設定・UIまで通してからPlayable扱いにする。

Scrap Factoryは、探索と工場自動化の両方が最後まで必要になる一人称3D工場ゲームとする。

## 利用者

- 主利用者: Repository Owner本人
- 公開形態: Public GitHub Repository / GitHub Pages
- Primary Device: Desktop / Keyboard + Mouse

## Project Profiles

`STATIC + MEDIA + TOOL + PUBLIC-CONTENT`

# Game 01: Scrap Factory

## 中心ループ

長期的な中心ループは次とする。

```text
探索
→ スクラップ回収
→ 工場へ帰還
→ 加工
→ 自動化
→ 工場成長
→ 新しい探索エリア / 技術解放
→ 再び探索
```

戦闘を主役にはせず、探索・素材回収・加工・工場建築・コンベア物流・自動化・成長を中心にする。

## Playable MVP

### 必須

- 一人称3D移動
- Factory東側Scrap Yardの探索
- スクラップ回収
- 12 Slot Backpack
- 拠点への帰還
- 直接売却
- 粉砕機 / 精錬炉 / コンベア / 倉庫 / 販売設備
- 2.5m Gridで自由配置
- コンベア接続による自動搬送
- 鉄くず → 破砕金属 → 鉄インゴット
- 簡易クラフトによる製品化
- 所持金 / 累計売上
- 目標進行
- オートセーブ / 手動セーブ相当
- 設定
- Hubへ戻れる

### MVP後の長期拡張

- 軽い戦闘 / 護身用武器
- 廃住宅街 / 廃工場 / 軍事施設 / 崩壊した研究施設
- 電力
- Splitter / Merger / Smart Sorter / 高速Conveyor
- 高度加工 / Assembler / Fabricator
- 研究
- Drone / 自動素材回収
- 工場拡張 / 立体物流
- Mega Factory / Main Clear / クリア後最適化

# 進行

## 工場ランク

工場ランクは7段階。

Rank Upは**必須目標 + 選択目標**方式とする。

```text
必須目標を達成
+
各Rankの選択目標から指定数を達成
=
Rank Up
```

原則として選択目標は2つ達成を基本とする。具体的な数値はBalance調整で変更可能だが、売上だけでRankが上がる設計にはしない。

### Rank 1 → 2: 最初の自動化

必須:

- `Hopper → Conveyor → Crusher → Conveyor → Seller` のDirectional Lineを成立させ、破砕金属を自動販売する。

選択目標候補:

- 累計売上
- 鉄くず回収数
- 破砕金属生産数
- 複数Crusher稼働
- Scrap Yard主要地点発見

主な解放:

- Smelter
- Storage
- 鉄インゴット
- Backpack Upgrade
- Factory Expansion I

### Rank 2 → 3: 基本工場

必須:

- Crusher → Smelterを含む鉄インゴット完全自動ラインを成立させる。

選択目標候補:

- 鉄インゴット生産
- 鉄板 / 工具セット生産
- Factory Expansion I
- Backpack Upgrade
- 累計売上

主な解放:

- 廃住宅街
- 銅 / プラスチック
- 新Recipe
- Exploration Research I

### Rank 3 → 4: 新素材と探索

必須:

- 廃住宅街の主要Objectiveをクリアする。

選択目標候補:

- 一定割合の区画発見
- 銅系製品生産
- プラスチック系製品生産
- Backpack強化
- 新素材発見
- Optional Order達成

主な解放:

- Splitter
- Merger
- Conveyor Mk.2
- Generator
- Power Pole
- Factory Management Console

### Rank 4 → 5: 物流と電力

必須:

- Splitter / Mergerを使った複数製品自動ラインを、自前電力で安定稼働させる。

選択目標候補:

- 一定時間Power Shortageなし
- Conveyor Mk.2 Line
- Factory Expansion II
- Battery Research
- Production Order
- Throughput目標

主な解放:

- 廃工場
- Assembler
- Industrial Storage
- 電子ジャンク
- Motor / Circuit等
- Advanced Production Research

### Rank 5 → 6: 高度加工

必須:

- 廃工場の主要設備を復旧し、持ち帰った技術を利用したAssembler自動ラインを完成させる。

選択目標候補:

- Motor / Circuit生産
- Industrial Storage使用
- Smart Sorter Line
- 廃工場Shortcut開通
- Production Efficiency目標

主な解放:

- 軍事施設
- Conveyor Mk.3
- Priority / Overflow Logistics
- Advanced Power
- 軍事系Research
- Drone Researchへの入口

### Rank 6 → 7: 高度自動化

必須:

- 軍事施設からDrone Control Blueprintを回収してResearchを完了し、Droneによる自動資源回収からFactory StorageまでのRouteを成立させる。

選択目標候補:

- 軍事施設主要区画攻略
- 複数Drone Route稼働
- Priority / Overflow販売Line
- Advanced Generator
- Rare Material確保
- 高度製品自動生産

主な解放:

- 崩壊した研究施設
- Experimental Research
- Fabricator
- Advanced Drone
- 最終電力技術
- Mega Factory段階

## Rank 7からMain Clear

Rank 7到達をクリアとはしない。Rank 7は最終章開始とする。

最終進行:

1. Robotics Lab攻略
2. Materials Lab攻略
3. Energy Lab攻略
4. 各区画の技術 / 特殊部品を工場へ持ち帰る
5. 工場で最終部品を製造
6. Central Core攻略
7. Experimental TechnologyをResearch
8. 最終製品の完全自動ラインを構築
9. Mega Factoryを一定時間安定稼働
10. Main Clear

最終製品の仮称は `Autonomous Industrial Core` とする。名称と最終数値は制作段階で変更可能。

## 進行テンポ

メインクリアは普通に遊んだ場合、概ね20〜30時間台を目安とする。プレイ時間そのものをRank条件にはしない。

目安:

- Rank 1: 約1時間
- Rank 2: 約2〜3時間
- Rank 3: 約3〜4時間
- Rank 4: 約4〜5時間
- Rank 5: 約4〜5時間
- Rank 6: 約5〜6時間
- Rank 7〜Clear: 約5〜7時間

待ち時間や単純な大量生産数で水増しせず、探索・新システム・工場改善によって自然に時間が増える構成とする。

# Research

## 基本構造

```text
Rank
= 大きなゲーム進行

Research
= Rank内の技術選択

探索
= 特殊研究・Blueprint・Research Dataの発見
```

Rank到達でResearch Tierを解放し、同じTier内ではある程度順番を選べる。

Researchカテゴリ:

- Production
- Logistics
- Exploration
- Power
- Automation

### 通常技術

Rank到達でResearch可能になる。

### 特殊技術

Rank到達に加えて、探索でBlueprint / Research Data / 特殊部品を発見することでResearch可能になる。

進行必須のResearch Data / BlueprintをOrder報酬だけで取得できるようにはしない。

研究待ち時間をリアル時間で引き伸ばさない。細かな `+数%` Upgradeを大量に並べず、新設備・新能力・新しい設計方法を優先する。

# 探索

## エリア構成

1枚の巨大オープンワールドにはしない。

### Factory / Scrap Yard

- Factoryを常設メイン拠点とする。
- 現行Scrap YardはFactory Gate東側に隣接した同一Sceneを維持する。
- Rank 1の基本探索は徒歩でScrap Yardへ出入りする。

### Transport Terminalから移動する独立エリア

- 廃住宅街
- 廃工場
- 軍事施設
- 崩壊した研究施設

Transport Terminalでは、危険度、主なLoot、探索進行率、Resource Point、Main Objective、推奨装備等を確認できる。

各独立エリアは必要なSceneだけ読み込み、Factoryや他探索Sceneを同時にフルロードしない。

## エリアの役割

### Scrap Yard

- 基本操作 / 回収
- 鉄くず中心
- 敵は基本なし
- 複雑なギミックなし

### 廃住宅街

- 建物内部探索
- 銅 / 廃プラスチック / 小型電子部品
- 鍵 / ヒューズ / 電源等の軽い攻略
- 少数の危険 / 敵

### 廃工場

- 大型機械設備の復旧
- 電子ジャンク / Motor / Gear / 工業部品
- Generator / Elevator / Control Room等の復旧
- Shortcut開通

### 軍事施設

- 高危険区域
- 軍用電子部品 / レア合金 / Battery / Drone Component / Blueprint
- Patrol / Turret等を含む軽い戦闘
- 回避・電源遮断・別ルート等の非戦闘手段も残す
- Drone技術の主要取得先

### 崩壊した研究施設

- Robotics Lab
- Materials Lab
- Energy Lab
- Central Core

これまでの探索・電源・修理・Access・軽い戦闘・工場加工を統合する最終エリア。

## 探索ギミック

- 電源復旧
- 端末操作
- 必要部品の収集
- 閉鎖区画の解放
- アクセスカード
- 装置修理
- Shortcut開通

複雑なパズルゲームにはしない。

## エリアのランダム性

完全ランダム生成にはしない。

固定:

- マップ全体構造
- 主要施設
- 入口 / 出口
- 大型ギミック
- Landmark
- Main Objective

一部ランダム:

- 通常素材の正確な出現位置
- Container内容
- 一部Rare Loot
- 一部Access Card
- 敵配置の一部
- 小型ギミック

進行必須Itemを低確率Dropだけに依存させない。

## 出発 / 帰還

- 廃住宅街以降はTransport Terminalから出発する。
- 出発前に簡易Loadoutを確認する。
- メニューから即座にFactoryへワープする方式にはしない。
- 指定帰還地点へ到達して初めて正常帰還となる。
- Shortcut / Service Gate / Elevator等を復旧することで、後から出入口を増やせる。
- 時間制限中心の脱出ゲームにはしない。

`Abandon Expedition` は許可するが、探索失敗と同じ扱いにする。

Hubへ戻る操作を行っても探索Sessionを保持し、FactoryへLootを確定させない。

## Exploration Progress

探索エリアごとに進行を保存する。

永続化するもの:

- Main Objective
- 発見済み区画
- Shortcut
- 修理済み主要設備
- Drone Beacon
- Resource Point
- Major Terminal

探索ごとに変動してよいもの:

- 通常Loot
- 一部Access Card
- 一部敵
- Rare Loot
- 小型ギミック

# Loot / Resource Point

## Loot設計

レア度は概ね次の4段階とする。

- Common
- Uncommon
- Rare
- Special / Progression

Lootは場所の意味と一致させる。

例:

- Scrap pile → 鉄くず
- Garage → 工具 / Battery関連
- Electrical Room → 電子部品 / 銅
- Machine Floor → Motor / Gear
- Server / Control Room → Electronics / Research Data
- Robotics Lab → AI系部品
- Materials Lab → Experimental Alloy
- Energy Lab → Experimental Energy Cell

重要Progression Itemは初回Objective等で保証し、極端なRare周回を要求しない。

## Resource Point

一度プレイヤーが発見 / 確保した通常資源地点は、後にDrone回収地点として登録可能にする。

Resource Pointには最低限次を持たせる。

- 資源種類
- 供給能力
- Factoryからの距離
- 危険度
- Drone利用可否

# Backpack / Inventory

## 基本

将来の探索用Backpackは、**Slot数 + 最大重量**の両方で制限する。

- Slot = 種類 / Stack数の制限
- Weight = 重量物の制限

既存12 Slot Backpackから段階的に拡張する。

### 重量

- 通常域では移動ペナルティなし
- 上限付近ではSprint効率を軽く低下させてもよい
- 上限を超えるLootは取得できない
- 強い移動速度低下を中心にはしない

## Backpack Upgrade

お金 + 素材で強化する。

候補:

- Slot増加
- 最大重量増加
- Material Pouch
- Heavy Frame
- Secure Case

## Secure Case

Blueprint / Research Data / Key Item等の重要品を少数だけ保護できる特殊収納。

探索失敗時でもSecure Case内のItemは保持する。

容量は小さくし、何を保護するか選択する要素を残す。

## Factory Inventoryとの分離

```text
探索
→ Backpack
→ 正常帰還
→ Factory Storage
→ Machine / Craft / Build
```

Factory内の建築では、必要素材をFactory Storageから直接消費できるようにする。毎回Player Backpackへ材料を移す作業を必須にしない。

# 探索失敗 / HP / 戦闘

## 探索失敗

探索失敗の表現は死亡ではなく**気絶・行動不能**を基本とする。

失敗時:

### 失う

- その探索中に新しく拾った通常Loot
- 実際に使用した消耗品

### 失わない

- 工場
- 所持金
- Rank
- Research
- Backpack Upgrade
- 基本装備 / 武器
- 探索開始前から所有していた恒久装備
- Secure Case内のItem

工場全体を巻き戻す罰にはしない。

## HP

基準HPは100を想定する。具体的なDamage数値はBalance時に調整可能。

Damage源候補:

- 敵
- 落下
- 電気
- 火災
- 有毒区域
- 機械 / 環境危険

Factoryへ正常帰還した後はHPを回復する。

## 回復

Recovery Kit系のConsumableを使用する。

- 探索で入手可能
- FactoryでCraft可能
- 毎回治療費を払う仕組みを中心にしない

## 戦闘の位置づけ

軽い戦闘を導入するが、敵撃破そのものを主要目標にはしない。

- 敵は一部探索エリアのみ
- 工場内で常時戦わない
- 武器は護身 / 危険排除中心
- 敵を避けて攻略可能なルートを残す
- 後半ほど危険度を上げてもよい
- 敵Farmを主要金策にしない

武器候補:

- Scrap Pistol
- Industrial Shotgun
- Shock Tool
- Rank 7 Experimental Weapon

武器耐久値は原則導入しない。

敵の役割候補:

- 基本接近型
- Patrol Drone
- Security Turret
- Heavy Unit

AIは巡回 → 発見 → 警戒 / 追跡 → 見失い → 復帰程度を基本にし、高度FPS AIを主目的にしない。

# Production / Recipe

## Recipe階層

```text
Raw
→ Processed
→ Component
→ Advanced Product
```

新RankではItem種類を無意味に増やすより、既存素材の用途と工程を増やす。

Recipe入力は通常1〜3種類、最終Tierでも原則4種類程度までとする。

## Hand Craft

序盤の少量生産 / 緊急補充用。

候補:

- 鉄板
- ケーブル束
- Recovery Kit
- Ammo
- Beacon
- 基本建築部品

主要量産Recipeは最終的にMachineで自動化可能にする。Hand Craftが終盤まで最高効率にはならない。

## 基本加工

```text
鉄くず
→ Crusher
→ 破砕金属
→ Smelter
→ 鉄インゴット
```

Rank 3以降:

- 精製銅
- 樹脂
- ケーブル束
- プラスチック部品

Rank 5以降:

- Motor Parts
- Circuit Parts
- 強化合金
- Motor
- Circuit
- Control Unit

Rank 6以降:

- Advanced Alloy
- Advanced Battery
- Drone Frame
- Utility Drone

Rank 7:

- AI Control Module
- Experimental Frame
- Experimental Power Module
- Autonomous Industrial Core（仮称）

具体的な投入個数・処理時間・売価はBalance段階で決める。

## Assembler / Fabricator

### Assembler

Rank 5で本格解放し、複数素材からComponent / Productを生産する。

### Fabricator

Rank 7で解放し、Assemblerの単純上位互換ではなくExperimental Tier専用Recipeを担当する。

Recipe変更時にBuffer Itemを無断消失させない。

# Logistics

## Conveyor Tier

- Mk.1: Rank 1
- Mk.2: Rank 4
- Mk.3: Rank 6

Tierごとに実際のThroughput差を持たせる。具体値はBalance段階で決める。

通常Conveyorは電力不要とする。

## Directional Contract

- ConveyorのVisual Arrowと実搬送方向を必ず一致させる。
- Machine Input / Outputを見た目でも区別する。
- 物流詰まり時にItemを消失させない。
- Back Pressureにより上流を停止できる。

既存Directional Conveyor Contractを維持する。

## Rank別物流

### Rank 4

- Splitter
- Merger
- Conveyor Mk.2

### Rank 5

- Smart Sorter
- Industrial Storage

### Rank 6

- Conveyor Mk.3
- Priority
- Overflow
- Drone Logistics

Priority / Overflowにより、必要Lineを優先し余剰だけSellerへ流す構成を作れるようにする。

## Storage

- Small Storage
- Industrial Storage
- Logistics Warehouse

と段階的に拡張する。

## Conveyor / Machine Upgrade

大量の既存設備を全撤去しなくてもよいよう、同系統Tierはその場Upgradeを許容する。

# Power

## 導入

Rank 4から本格導入。

Rank 4到達時に既存の小規模工場が突然全停止しないよう、Starter Gridまたはそれに相当する移行手段を持たせる。

## 接続

Machine 1台ずつへ細かくCableを接続することを必須にせず、Power Poleの給電範囲方式を基本とする。

考える要素:

- 発電量
- 消費量
- Pole配置
- 工場範囲

## 発電設備

段階例:

- Scrap Generator
- Industrial Generator
- Advanced Generator
- Experimental Power System

Batteryを中盤以降で解放する。

電力不足では設備 / Itemを破壊せず、供給不足の設備を停止し、Factory Alertで原因を示す。

通常Conveyorは電力不要。Smart Logistics / Drone Port等の高度設備には電力を要求できる。

# Drone / 自動回収

## 基本原則

Droneは探索を削除するシステムではなく、**一度プレイヤーが攻略・発見した場所の反復作業を自動化するシステム**とする。

```text
新しいものを発見する
→ Player

発見済み通常資源を繰り返し集める
→ Drone
```

## Droneで可能

- 発見済み通常Resource Pointの自動回収
- 長距離Storage間物流

## Droneだけでは不可

- 未発見Areaの探索
- Research Data / Blueprintの新規発見
- Key Item
- Progression Item
- 新Resource Pointの発見
- 最終探索攻略

## Drone Port

- Drone格納
- Recharge
- Route管理
- Item受取
- Storage / Conveyor出力

Upgrade候補:

- Drone数
- Cargo
- Speed
- Range
- Route数

細かな燃料補給作業は中心にせず、Portで自動Rechargeする。

Drone PortのRechargeは電力消費要素とする。

# Economy

## 基本

「全部売る」が常に最適解にならないよう、素材に複数用途を持たせる。

- 売却
- 加工
- 建築
- Research
- Upgrade

基本価値:

```text
Raw Material
< Processed Material
< Component
< Finished Product
```

ただし設備費 / 電力 / 生産速度等を含めたBalanceで調整する。

## Cashの用途

- Building
- Upgrade
- Factory Expansion
- Researchの一部
- Ammo / Recovery Kit / Beacon等

Cashだけで主要進行を完結できないようにする。

## 売却価格

固定価格を基本とする。大きなリアルタイム市場変動を主システムにはしない。

## Optional Order

任意のProduction Orderを用意し、特定製品を生産する理由を作る。

主報酬:

- Cash
- Challenge / Record系

主要Progressionに必要なResearch Data / BlueprintをOrderだけで入手できるようにはしない。

# Factory Expansion

工場はRankと共に物理的に広がる。

## Expansion条件

お金だけではなく、原則として次を組み合わせる。

- Cash
- 素材
- 復旧作業

## 区画イメージ

- Starter Yard
- Processing Yard
- Power & Logistics
- Advanced Manufacturing
- Experimental Sector

完全に独立した5マップにはせず、Factory内の地続きの区画として扱う。

## 拡張時の変化

- Build Area
- Power接続地点
- Warehouse / 壊れた施設
- Transport設備
- Drone用スペース
- 道路 / Landmark

などを増やし、工場マップ自体が復旧していくようにする。

2.5m Gridと既存座標系を維持し、Expansionのために既存Save配置の中心座標を変更しない。

Rank 5以降ではElevated Conveyor / Conveyor Lift / Catwalk等の限定的な立体物流を許容する。

自由な多層建築システムを主要要件にはしない。

# Build System

既存の2.5m Grid / R回転 / Safe Dismantleを維持する。

## Placement

Previewで最低限次を確認できるようにする。

- 設置可否
- Input / Output
- Conveyor方向
- Cost
- Invalid理由

## Move / Rotate

設置済み設備を安全に移動 / 回転できる方向を目標とする。

- Custom Name / Upgradeは維持
- Buffer Itemを無断消失させない
- 接続状態を再計算
- 危険な場合は理由を表示して拒否

## Dismantle

Player-built設備:

- 建築費100%返金
- Buffer Item返却
- 返却先に収まらない場合は撤去拒否

Starter Hopper / Starter Seller等のPermanent設備は撤去不可。

## Construction Cost

Factory内ではFactory Storageから直接材料を消費可能にする。

## Quality of Life

段階的に次を許容する。

- Copy / Quick Build
- Conveyor連続配置
- Conveyor自動Corner補助
- Conveyor Lift / Elevated Conveyor
- 小規模Line Template / Blueprint
- Multi-select
- Conveyor一括Upgrade
- 直近Placementの簡易Undo

工場そのものを自動設計 / 自動建設する機能にはしない。

# Factory Management

## Factory Management Console

大工場で原因不明の停止を減らすため、Rank 4以降に段階的に解放する。

表示候補:

- Overview
- Machines
- Production
- Power
- Logistics
- Drone
- Alerts
- Orders
- Production Planner

## Alerts

最低限:

- Power Shortage
- Input不足
- Output Blocked
- Storage Full
- Conveyor停止
- Drone Route停止
- Seller処理不足

同種Alertは集約し、画面を大量通知で埋めない。

重要度はCritical / Warning / Info等に分ける。

## Locate

Console上のMachineから3D World内の該当設備を一時Highlightできるようにする。

## Production Planner

目標生産量から必要Machine / Input量を計算する補助機能。

Plannerは工場を自動建設しない。

## Bottleneck

停止理由や不足Resourceを説明できるようにし、単に「Efficiency低下」だけを表示しない。

# Challenge / Achievement

## Achievement

恒久記録。

候補:

- 初自動ライン
- 売上記録
- 生産記録
- Area攻略
- Drone Route
- Mega Factory

主要技術をAchievement取得必須にはしない。

## Challenge

任意の短期目標。

- Production
- Exploration
- Logistics
- Efficiency

Daily / Weeklyログイン前提にはしない。

## Orderとの役割分担

```text
Order
= Economy

Challenge
= 任意の遊び方

Achievement
= 長期記録
```

# Tutorial / Field Manual

## 最初の30〜60分

既存Tutorialを中心に次の成功体験まで導く。

```text
移動
→ Scrap回収
→ Sellerで売却
→ Crusher設置
→ 加工
→ Conveyor接続
→ 初の自動販売Line
```

長い説明を先に読ませず、必要な操作が発生した時点でContext Hintを表示する。

Tutorial終了後はRank Goalへ自然に接続する。

## Field Manual

`O`で後から確認できる。

候補カテゴリ:

- Controls
- Exploration
- Building
- Conveyor
- Production
- Selling
- Dismantle
- Rank
- Research
- Power
- Drone

未解放システムを序盤から全表示せず、進行に応じて追加する。

# UI / HUD

## 原則

3D Canvasを主役にし、常時HUDを増やしすぎない。

### 常時 / 状況別

- 現在Objective
- Cash
- Backpack / Weight
- 必要時のHP
- Crosshair / Interaction Marker
- Static Shortcut Bar（設定で非表示可）

### Mode UI

Build / Dismantle等の専用情報はMode中だけ表示。

### 詳細管理

詳細統計はFactory Management Consoleへ分離する。

問題表示では状態だけでなく原因を示す。

通知は短時間に大量発生した場合は集約する。

Pause Menuに探索中の即時 `Return to Factory` は置かない。

# Difficulty / Accessibility / Settings

## Difficulty

- Casual
- Standard
- Hazard

Standardを基準Balanceとする。

Difficultyは主に次へ影響させる。

- 敵Damage
- 環境Damage
- Recovery補助
- 敵の警戒等

工場生産速度やRank条件をDifficultyで大きく変えない。

既存の探索失敗時Loot喪失Contractは難易度によって無効化しない。Casualは失敗しにくさを調整する方向とする。

難易度変更はFactoryにいる時点で反映する。

## Controls

- Mouse Sensitivity
- Invert Y
- FOV
- Sprint Hold / Toggle
- Crouch Hold / Toggle（Crouch導入時）
- Key Bind

BrowserではPointer Lockによる相対Mouse Inputを基本とし、OS Level Raw Inputを保証要件にはしない。

## Accessibility

- Head Bob 0〜100 / OFF
- Sprint FOV Effect調整
- Reduce Motion
- Screen Shake調整
- HUD Scale
- Text Size
- Crosshair調整
- Shortcut / Interaction / Tutorial Hint表示設定
- 色だけに情報を依存しない
- 重要情報を音だけに依存しない

## Graphics

- Low / Medium / High / Custom
- Performance Mode

Performance Modeは描画負荷を落とすが、Factory Simulation結果を変えない。

# Audio / Feedback

Audio Systemは将来要件として扱う。

- Machineごとに動作音を区別
- 大工場では距離 / 台数に応じて音を集約
- 売却 / Build等の連続SEを過剰に鳴らさない
- AreaごとにAmbientを変える
- BGMは環境音を邪魔しない補助
- Rank Up / Area Unlock / First Drone / Main Clear等の大きな進行だけ強いFeedback
- Machine Volumeを独立設定可能にする方向

重要情報は必ずVisualでも表示する。

現行の「Three.js以外の外部Assetへ依存しない」制約とAudio Asset追加は衝突する可能性があるため、音源導入時はLicenseとAsset方針を別途明示的に決定する。勝手に外部音源依存を追加しない。

# Story / World

Gameplay中心とし、長い会話 / Movie / NPC会話を主軸にしない。

主人公は放棄された工業拠点を再稼働させるSalvager / Engineer程度の薄い設定を基本とする。

世界背景は主にEnvironmental Storytellingで伝える。

- Scrap Yard: 旧工業地帯の痕跡
- 廃住宅街: 生活の放棄 / 停電 / 避難の痕跡
- 廃工場: 生産停止 / 電力障害 / 自動化異常
- 軍事施設: 研究施設封鎖 / 特殊技術移送
- 研究施設: Robotics / Materials / Energy / Central Core

崩壊原因は単純な一原因へ固定しすぎず、Energy / Logistics / Automation / 封鎖等の複数要因を環境や短いLogから推測できる構成とする。

Logは任意収集で、読まなくても主要ゲーム進行可能にする。

Mega Factory完成は、失われた産業技術をプレイヤー自身が理解・再構築した結果として物語上のMain Clearにつなげる。

# Save

## Storage

現行 `localStorage` + Schema Version方針を維持する。

ただし長期要件によりSaveが肥大化するため、Save Data Budgetを設ける。実測でlocalStorage容量リスクが高いと確認された場合のみ、Migration付きでIndexedDB等を検討する。

永続IDは表示名 / 配列Indexと分離する。

## Auto Save

最低限次で保存する。

- Building設置 / 撤去 / 重要変更
- Research
- Rank Up
- Factory Expansion
- Backpack Upgrade
- Settings
- 正常帰還
- 一定時間ごと

Manual Save相当も残す。

## Exploration Session

探索中断から再開可能にする。

保存対象候補:

- Area
- Player Position
- HP
- 持ち込み装備
- 探索中Loot
- Secure Case
- 主要ギミック状態

Refresh / Browser Closeだけで探索成功扱いにはしない。

## 正常帰還

探索中LootをFactory Storageへ確定し、Exploration Sessionを終了する。

## 行動不能 / Abandon

通常Lootを喪失し、Secure Case等の保持対象だけ残してSessionを終了する。

## Backup / Export / Import

- Current Save
- 少なくとも1世代Backup
- JSON Export / Import

Import時はSchema確認 → Migration → Backup → 適用の順を基本とする。

壊れたImportでCurrent Saveを即上書きしない。

## Migration

Save Schema変更時に旧Dataを無断破棄しない。

不足項目を既定値で補完し、既存Factory Layout / Progressionを可能な限り維持する。

Save破損時に即初期化せず、Backup復元 / Export / 新規開始等の選択肢を持たせる方向とする。

# Performance / Scale

## 基本

Mega Factoryは実現するが、何千台ものMachineや全Itemを個別Physicsで処理するゲームにはしない。

目標:

- 通常プレイ: 60 FPS Target
- 大規模Factory: 45 FPS程度をTarget
- 30 FPS未満が常態化する状態は完成扱いにしない方向

具体的なBenchmark PCは実装 / Performance Testing段階で固定する。

## Soft Scale Target

最終Hard Limitではなく設計目安:

- Machine: 通常30〜80 / 終盤80〜150 / Mega Factory 150〜250程度
- Conveyor: Mega Factoryで1,500 Cell前後を想定
- Drone: 最大20機前後を想定

実測を見ずに固定Hard Limitを設定しない。

## Simulation / Rendering分離

- Factory Production / LogisticsはData中心でSimulation
- Conveyor上の全Itemを個別Physics Objectにしない
- 近距離PacketだけVisual化し、遠距離は簡略化可能
- 遠景はLow-detail / Colliderなし / Shadow最小
- 大量ObjectはGeometry / Material共有、Instancing等を検討
- Statisticsを毎Frame再計算しない

## FactoryとExploration

Factory / Exploration Sceneを同時にフルSimulationしない。

探索中のFactory Productionは、Factoryを毎Frame裏で動かすのではなく、探索経過時間に対する結果計算方式を基本とする。

ただしInput不足 / Output満杯 / Power不足 / Storage容量を無視した無限生産にはしない。

ゲームを閉じていた現実時間を使ったOffline Progressを主要システムにはしない。

# Game Hub

- Playableと未完成ゲームを明確に分ける。
- 最近の進行 / Play Timeを表示する。
- Save Export / Importを提供する。
- 未完成ゲームに偽のPlay導線を出さない。
- Scrap FactoryのFactory Rank / Achievement等の進捗を表示可能にする。

# 崩してはいけない仕様

- Scrap Factoryの主役は「探索 → 加工 → 自動化 → 成長」。
- 戦闘中心のFPSへ変更しない。
- 後半で探索を完全に不要にしない。
- RankをCashだけで上げられるようにしない。
- 進行必須Itemを極端なRandom Dropだけに依存させない。
- 時間制限中心のExtraction Gameへ変更しない。
- 複雑なPuzzle Gameへ変更しない。
- 未完成ゲームをPlayableと表示しない。
- Save Schema変更時に旧Dataを無断破棄しない。
- 既存Factory Layoutを理由なく破壊しない。
- Directional ConveyorのVisual Arrowと実搬送方向を一致させる。
- 既存2.5m GridとFactory座標系を理由なく変更しない。
- 現行Scrap Yardを理由なくFactoryから分離した別Sceneへ変更しない。
- GitHub PagesでRepository subpathから動く相対Pathを維持する。
- 公開ファイルへ秘密情報を置かない。
- 現行の外部Asset制約を変更する場合は明示的な仕様変更として扱う。

# 完成条件

## Playable MVP

- HubからScrap Factoryへ入れる。
- Scrap Yardへ移動してScrapを回収できる。
- 売却して設備代を稼げる。
- 設備を自由配置できる。
- Directional Conveyor経由でMachine間搬送が動く。
- 加工品が販売されCashへ反映される。
- 再読込後にSaveが復元される。
- JS / JSON / Local reference validationが成功する。
- Desktop Browserで主要導線を確認する。
- Visual Quality Baselineを確認する。

## Long-term Main Clear

- Rank 1〜7の進行が成立する。
- 各Rankで探索 / 生産 / 物流 / 電力 / 研究 / 自動化が段階的に増える。
- 廃住宅街 / 廃工場 / 軍事施設 / 崩壊した研究施設へ進行できる。
- 工場成長が探索能力向上へつながる。
- 後半でも探索と自動化の両方に意味が残る。
- Droneが発見済み通常素材の反復回収を自動化できる。
- Rank 7から研究施設攻略、最終技術、Mega Factoryまで到達できる。
- 最終製品の自動生産とMega Factory安定稼働によりMain Clearできる。
- Clear後も同じSaveでFactory Optimization / Challenge等を継続できる。
- Save Migrationにより既存Saveを無断破棄しない。
- Repository文書と現行実装が一致する。
- 実測Performance / Browser Review / Visual Reviewの未確認事項を完成済みと偽らない。

# 制作段階で調整してよい項目

以下は上記の中心方針を変更しない範囲で、実装 / Balance / Testing段階に調整してよい。

- HP / Damage / Recoveryの具体値
- Ammo / Weapon Damage / Enemy HP
- 敵種類の最終数 / 出現密度
- Rank選択目標の具体数値
- 各Recipeの投入数 / 処理時間 / 売価
- Conveyor Throughput
- Generator発電量 / Machine消費電力
- Backpack Slot / Weightの最終数値
- Drone Cargo / Speed / Range
- Resource Point供給量
- Order報酬額
- Factory Expansion Cost
- Main Clear用最終製品名
- 各Rankの最終プレイ時間
- Benchmark PC / 最終Performance Hard Limit
- Audio Asset導入方法 / License方針
- Visual Detail / Effect量

これらを調整する際も、確定済みの中心ループ、探索＋自動化、戦闘を主役にしない方針、Save互換性を変更しない。