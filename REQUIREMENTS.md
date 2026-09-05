# Requirements

## 要件定義ステータス

- Status: **要件定義完了（Home / Player Upgrade / Tutorial強化要件統合済み）**
- Completed: 2026-09-06
- Visual Requirements Updated: 2026-09-05
- Home / Player Convenience / Tutorial Requirements Updated: 2026-09-06
- 対象: Game Hub / Game 01 `Scrap Factory`
- このファイルを Scrap Factory のゲーム内容・進行・探索・自動化・Home / Player Upgrade・Tutorial・Visual Direction・制作Phaseに関する要件の正本とする。
- 実装詳細は現行 `SPEC.md`、現行挙動はRepository上の実装を照合する。
- Balance値、Visual Budget、個別数値は下部の「制作段階で調整してよい項目」の範囲で調整可能。
- 既存Save / Directional Conveyor / 2.5m Grid / Factory座標系 / GitHub Pages対応等の確定済みContractを、Visual強化や実装都合だけで無断変更しない。

## 目的

完成度の高いブラウザゲームを1本ずつ追加できるGame Hubを作る。大量の未完成ミニゲームを並べず、各ゲームは主要Loop・保存・設定・UI・Visual Qualityまで通してからPlayable扱いにする。

Scrap Factoryは、探索と工場自動化の両方が最後まで必要になる一人称3D工場ゲームとする。

## 利用者 / 公開

- 主利用者: Repository Owner本人
- 公開形態: Public GitHub Repository / GitHub Pages
- Primary Device: Desktop / Keyboard + Mouse

## Project Profiles

`STATIC + MEDIA + TOOL + PUBLIC-CONTENT`

# Game 01: Scrap Factory

## 中心ループ

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

現行MVPの成立条件:

- 一人称3D移動
- Factory東側Scrap Yardの探索
- Scrap回収 / Respawn
- 12 Slot Backpack
- 拠点への帰還
- 直接売却
- Hopper / Seller / Crusher / Smelter / Conveyor / Storage
- 2.5m Gridで自由配置
- Directional Conveyorによる自動搬送
- 鉄くず → 破砕金属 → 鉄インゴット
- Hand Craftによる製品化
- Cash / Lifetime Revenue
- Tutorial / Free Play
- Factory Management / Challenge / Planner / Codex
- Auto Save / Recovery / Export / Import
- Settings
- Game Hubへ戻れる

長期拡張:

- Rank 1〜7
- Research / Blueprint / Research Data
- 廃住宅街 / 廃工場 / 軍事施設 / 崩壊した研究施設
- 電力
- Splitter / Merger / Smart Sorter / 高速Conveyor
- 高度加工 / Assembler / Fabricator
- Backpack段階拡張 / Secure Case
- Home / Bed / PC / Home Storage / Exploration Workbench
- Player Convenience Upgrade / Scanner / Material Tracking / Loadout Preset
- Contextual Tutorial / Tutorial Library / System Diagnostics
- 軽い戦闘 / HP / 環境危険
- Drone / 自動素材回収
- Factory Expansion / 立体物流
- Mega Factory / Main Clear / クリア後最適化
- Hybrid Asset / PBR / Lighting / VFX / LODを含むVisual Quality強化

# 現行MVPとの互換性

長期進行やVisual強化を実装する際、現在PlayableなMVPを「新要件に合わない」という理由だけで破壊しない。

## Legacy Unlock

現行実装ではSmelter / Storage等がRankシステム導入前からBuild可能である。将来、新規GameではRank 2解放へ変更してよいが、既存Saveについては次を守る。

- 設置済みSmelter / Storage等を削除しない。
- 既存Saveが既に利用していた機能を突然使用不能にしない。
- Migration時に既存進行から必要な最低Rank / Unlockを付与する。
- Legacy SaveをRank 1へ強制巻き戻ししない。
- Legacy Rank推定規則は `SPEC.md` に定義しTestする。

## 既存Scrap Yard素材

現行Scrap Yardでは鉄くず以外に銅線 / 廃プラスチック / 電子ジャンクも少量出現する。この既存挙動を無理に消す必要はない。

Rank 3の「銅 / プラスチック解放」は初出ではなく次を意味する。

- 安定した供給源
- 専用Loot Location / Resource Point
- 本格加工Recipe
- 自動生産で意味のある量を扱える段階

電子ジャンクも序盤に少量発見可能だが、高度利用は後半Rankで解放してよい。

## Legacy Factory Rank表示

Achievement解除数から作る既存称号表示と、本要件のProgression Rank 1〜7を分離する。

- Achievement自体は保持する。
- Achievement数からProgression Rankを直接決定しない。
- 既存称号はFactory Title等として扱う。
- `progressionRank` とAchievement / Titleを別Dataとして扱う。

## Visual Compatibility

Visual強化では次を維持する。

- Machine / Buildingの永続IDをVisual Asset名へ依存させない。
- Visual Mesh差し替えだけでSave Layoutを変更しない。
- Collider簡略化は許可するが、Gameplay上の占有範囲・Build可否・主要通路と矛盾させない。
- Visual LOD / Culling / Particle削減でProduction / Throughput / Power / Drone等のSimulation結果を変えない。

# 進行

## 工場ランク

工場ランクは7段階。

Rank Upは **必須目標 + 選択目標** 方式とする。

```text
必須目標を達成
+
各Rankの選択目標から指定数を達成
=
Rank Up
```

- 選択目標は原則2つ達成を基本とする。
- 具体数値はBalance段階で調整可能。
- Cash / Lifetime RevenueだけでRankを上げられる設計にはしない。
- Rankごとに探索・加工・物流・電力・自動化など違う体験を必須目標にする。

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

- Crusher → Smelterを含む鉄インゴット完全自動Lineを成立させる。

選択目標候補:

- 鉄インゴット生産
- 鉄板 / 工具セット生産
- Factory Expansion I
- Backpack Upgrade
- 累計売上

主な解放:

- 廃住宅街
- 銅 / プラスチックの本格供給
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
- 新素材 / Resource Point発見
- Optional Order達成

主な解放:

- Splitter
- Merger
- Conveyor Mk.2
- Generator
- Power Pole
- Factory ManagementのPower / Logistics拡張

### Rank 4 → 5: 物流と電力

必須:

- Splitter / Mergerを使った複数製品自動Lineを、自前電力で安定稼働させる。

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
- 電子ジャンクの本格利用
- Motor / Circuit等
- Advanced Production Research

### Rank 5 → 6: 高度加工

必須:

- 廃工場の主要設備を復旧し、持ち帰った技術を利用したAssembler自動Lineを完成させる。

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

## Rank 7 → Main Clear

Rank 7到達をクリアとはしない。Rank 7は最終章開始とする。

1. Robotics Lab攻略
2. Materials Lab攻略
3. Energy Lab攻略
4. 各区画の技術 / 特殊部品をFactoryへ持ち帰る
5. Factoryで最終部品を製造
6. Central Core攻略
7. Experimental TechnologyをResearch
8. 最終製品の完全自動Lineを構築
9. Mega Factoryを一定時間安定稼働
10. Main Clear

最終製品の仮称は `Autonomous Industrial Core`。名称と最終数値は制作段階で変更可能。

## 進行テンポ

Main Clearまで概ね20〜30時間台を目安とする。プレイ時間そのものをRank条件にはしない。

- Rank 1: 約1時間
- Rank 2: 約2〜3時間
- Rank 3: 約3〜4時間
- Rank 4: 約4〜5時間
- Rank 5: 約4〜5時間
- Rank 6: 約5〜6時間
- Rank 7〜Clear: 約5〜7時間

待ち時間や単純な大量生産数で水増しせず、探索・新System・Factory改善によって自然に時間が増える構成とする。

# Research

```text
Rank       = 大きなゲーム進行
Research   = Rank内の技術選択
探索       = 特殊研究 / Blueprint / Research Dataの発見
```

Researchカテゴリ:

- Production
- Logistics
- Exploration
- Power
- Automation

通常技術:

- Rank到達でResearch可能。

特殊技術:

- Rank到達 + 探索でBlueprint / Research Data / 特殊部品を発見してResearch可能。

原則:

- 進行必須Research Data / BlueprintをOrder報酬だけで取得できるようにはしない。
- リアル時間待機でResearchを引き伸ばさない。
- 細かな `+数%` Upgradeを大量に並べない。
- 新設備・新能力・新しい工場設計方法を優先する。
- 同じTier内ではある程度Research順を選べる。

# 探索

## エリア構成

1枚の巨大Open Worldにはしない。

### Factory / Scrap Yard

- Factoryを常設メイン拠点とする。
- 現行Scrap YardはFactory Gate東側に隣接した同一Sceneを維持する。
- Rank 1の基本探索は徒歩でScrap Yardへ出入りする。

### Transport Terminalから移動する独立エリア

- 廃住宅街
- 廃工場
- 軍事施設
- 崩壊した研究施設

Transport Terminalでは最低限次を確認できる。

- 危険度
- 主なLoot
- 探索進行率
- Resource Point
- Main Objective
- 推奨装備

各独立エリアは必要なSceneだけ読み込み、Factoryや他探索Sceneを同時にフルロードしない。

## 各エリアの役割

### Scrap Yard

- 基本操作 / 回収
- 鉄くず中心
- 銅線 / 廃プラスチック / 電子ジャンクは既存MVPどおり少量出現可
- 敵は基本なし
- 複雑なギミックなし

### 廃住宅街

- 建物内部探索
- 銅 / 廃プラスチック / 小型電子部品の安定供給
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
- 回避・電源遮断・別Route等の非戦闘手段も残す
- Drone技術の主要取得先

### 崩壊した研究施設

- Robotics Lab
- Materials Lab
- Energy Lab
- Central Core

これまでの探索・電源・修理・Access・軽い戦闘・Factory加工を統合する最終エリア。

## 探索ギミック

- 電源復旧
- Terminal操作
- 必要部品の収集
- 閉鎖区画の解放
- Access Card
- 装置修理
- Shortcut開通

複雑なPuzzle Gameにはしない。

## ランダム性

完全ランダム生成にはしない。

固定:

- Map全体構造
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
- Menuから即Factoryへワープする方式にはしない。
- Homeへの直接Fast Travelも探索中は不可とする。
- 指定帰還地点へ到達して初めて正常帰還。
- Shortcut / Service Gate / Elevator等の復旧で後から出入口を増やせる。
- 時間制限中心のExtraction Gameにはしない。
- `Abandon Expedition` は探索失敗と同じ扱い。
- Hubへ戻ってもExploration Sessionを保持し、FactoryへLootを確定しない。

## Exploration Progress

永続化:

- Main Objective
- 発見済み区画
- Shortcut
- 修理済み主要設備
- Drone Beacon
- Resource Point
- Major Terminal

探索ごとに変動可:

- 通常Loot
- 一部Access Card
- 一部敵
- Rare Loot
- 小型ギミック

# Loot / Resource Point

レア度:

- Common
- Uncommon
- Rare
- Special / Progression

Lootは場所の意味と一致させる。

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

一度Playerが発見 / 確保した通常資源地点は、後にDrone回収地点として登録可能。

最低限持つData:

- 資源種類
- 供給能力
- Factoryからの距離
- 危険度
- Drone利用可否

# Backpack / Inventory

探索用Backpackは **Slot数を中心とする既存方式を維持**し、今回のHome / Player Convenience要件では重量制を導入しない。

- 既存12 Slot Backpackから段階的に拡張する。
- Backpack I / II / IIIの3段階を基本とする。
- Backpack IはRank 2、Backpack IIはRank 4、Backpack IIIはRank 6でPC側の購入候補として解放する。
- 具体Slot数はBalance / Playtestで調整可能。
- Slot上限を超えるItemは取得不可または既存Inventory Contractに従って拒否する。
- 重量によるSprint低下、最大重量、Heavy Frame等は今回の要件には含めない。
- 既存Backpack UpgradeとPC Upgradeを二重Systemにせず、PC側のBackpack Upgradeへ統合する。

Upgrade候補 / 関連機能:

- Backpack I / II / III
- Auto Sort
- Quick Deposit
- Loadout Preset
- Secure Case

## Secure Case

探索失敗時にもPlayerが明示的に保護したItemを少数保持できる特殊収納。

入れられる:

- 通常Loot
- Rare素材
- PC Upgrade用素材
- Optional PC Upgrade Blueprint

入れられない:

- Main Objective用Special Cargo
- 進行必須Quest Item / Key Item
- Central Core等のMain Progression専用Item
- Factory設備等の大型物

原則:

- Playerが自分でCaseへ入れたItemだけ保護する。
- 高価値Itemを自動選択しない。
- 容量は小さくし、PC Upgradeで段階拡張する。
- 探索失敗時もCase内の許可対象Itemを保持する。
- Main ProgressionのRiskをSecure Caseだけで無効化しない。

## Factory Inventoryとの分離

```text
探索
→ Backpack
→ 正常帰還
→ Factory Storage
→ Machine / Craft / Build
```

Factory内の建築ではFactory Storageから材料を直接消費可能にし、毎回Backpackへ材料を移すことを必須にしない。

Home StorageはFactory Storageとは別のPlayer / Exploration用Storageとして扱う。PC UpgradeでFactory製品を使う場合、Factory Network Link取得前はFactory Storageから自分で取り出し、BackpackでHomeへ運ぶ。

# Home / Player Convenience Progression

## 役割

Factoryのすぐ近くに、Playerの **自宅兼生活・探索準備拠点**となる小さなHomeを置く。

HomeはFactoryを置き換えず、役割を明確に分ける。

```text
Home
→ Player Upgrade / Exploration準備 / Save / Recovery / Personal Storage

Factory
→ Production / Logistics / Power / Drone / Factory Research
```

Home / PC UpgradeはMain Progressionの必須Gateにしない。PC Upgradeを取得しなくてもRank 1〜7、各探索Area、Factory Automation、Main Clearへ到達可能にする。

## Home配置 / World Contract

- Factoryと同じ3D World内にシームレスに存在する。
- Loadingを挟む別Interior Sceneにはしない。
- Factoryから徒歩10〜20秒程度を目安とする近距離に置く。
- Factory Build Gridと競合しない固定Safe Areaへ配置する。
- 既存Factory Layoutや2.5m Gridの中心座標を理由なく変更しない。
- Home内ではFactory Machine / Conveyor等をBuild不可とする。
- Bed / PC / Home Storage / Workbench等の機能設備は固定配置・解体不可。
- Home設備のColliderとVisualを一致させ、見える壁や家具を通り抜ける状態を残さない。
- Home内はSafe Zoneとし、敵・環境Damageを発生させない。
- HomeのPC / 基本照明等をFactory Power Shortageで使用不能にせず、Upgrade / RecoveryのSoft Lockを作らない。
- 探索中からHomeへ直接Fast Travelする機能は追加しない。

## Home Visual Direction

Homeは **廃工業地帯の小型プレハブ住宅**を基本とする。

初期状態:

- 金属外壁
- 少し古い窓
- 簡素なBed
- 中古PC + 小型Monitor
- Home Storage
- Workbench
- 小さな棚 / 工具 / Scrap系小物
- 最低限の照明

Progressionに合わせて巨大化させるのではなく、PC / Monitor / Scanner機器 / Storage / Workbench周辺が少しずつ整備・高度化する。

House Buildingを主要Systemにはしない。家具位置は固定し、CosmeticによるAppearance変更のみ許容する。

## Door / Home Marker

- Home Doorは通常Interactとして `E` で開閉する。
- Loadingを発生させない。
- Door Animation / ColliderでPlayerが引っかからないようにする。
- 一定距離離れた後の自動Closeは実装段階で採用可能。
- HUD / Mapに控えめな `HOME` Markerを表示可能にする。
- HOME MarkerはSettingsで非表示可能。
- HOME Marker自体をFast Travel機能にはしない。
- 既存SaveではHome追加時に一度だけ利用可能になったことを通知する。

## Bed

Bedは次を担当する。

- 手動Save
- Home Respawn地点
- HP等のPlayer状態回復
- 短い休憩演出

使用Flow:

```text
[E] 休む
→ 短いFade Out
→ Save
→ Player状態回復
→ Fade In
```

- 数秒程度で完了する。
- 昼夜Cycle / 疲労 / 睡眠時間選択Systemは今回追加しない。
- Bed利用でFactory Productionの長時間Time Skipを発生させない。
- 既存Auto Saveは維持する。
- New GameではHome Bed付近を開始 / Respawn地点とする。
- 既存Saveでは現在位置を強制移動せず、Home Bedを初めて使用するまでは既存の復帰Contractを壊さない。使用後はHome Respawnを有効化する。

## PC: Player Management Terminal

PCはPlayer側の管理中心Terminalとする。

担当:

- Player Upgrade Tree
- Upgrade必要素材 / Cash / Blueprint確認
- Material Tracking / Pin
- 発見済み素材 / 入手エリアHint
- Tutorial Library
- Tutorial Replay / 再開
- Controls / Guide
- Player Progress
- Home Upgrade
- Home Cosmetic選択

担当しない:

- Factory Researchの全面移行
- Drone管理
- Production Recipe管理
- Power管理
- Factory全体Automation

Factory Management / Automation Consoleの役割を奪わない。

PC Interaction:

- `E` でPC操作へ入る。
- Player移動を停止し、CameraをMonitorへ短く寄せて専用UIを開く。
- Mouse操作可能。
- `Esc` で通常Gameplayへ戻る。
- 3D Monitorの小さなButtonを直接Mouseで押す複雑なUIにはしない。
- PC / Workbench / Home Storage UI操作中もFactory Production / Conveyor / Power / Drone Simulationは継続する。
- 本来のPause Menuを開いた場合だけ既存Pause Contractに従う。

PC主要画面:

- `UPGRADES`
- `MATERIAL TRACKING`
- `HOME`
- `TUTORIAL LIBRARY`
- `PLAYER PROGRESS`

Upgrade購入前に効果・必要素材・不足数・消費内容を詳細画面で確認可能にする。毎回二重確認Popupを要求せず、詳細画面上の `UPGRADE` 実行を確定操作とする。

重要Upgrade Transactionは `条件確認 → 素材 / Cash消費 → Unlock → Save` を一まとまりとして扱い、途中状態・二重消費・Item lossを残さない。

## PC Upgrade基本Contract

通常Upgrade:

```text
必要Rank
+ Cash
+ 探索素材 / Factory加工品
→ Upgrade
```

特殊Upgrade:

```text
必要Rank
+ Optional Upgrade Blueprint発見
+ Cash
+ 素材
→ Upgrade
```

原則:

- 最終的には全Upgrade取得可能。
- 排他的Skill Buildにはしない。
- Reset / Respecを基本要件にしない。
- 単純な `+数%` Upgradeを大量に並べない。
- 新しい便利機能やPlayer行動の改善を優先する。
- Main Progression必須素材をPC Upgradeだけで大量消費させない。
- Upgrade専用通貨を追加せず既存Cash / 素材 / Factory製品を利用する。
- 序盤は探索素材中心、中盤以降はFactory加工品も必要にする。
- 特殊UpgradeだけBlueprintを要求し、全UpgradeをBlueprint周回にしない。
- Main Clear後も未取得Upgradeを取得可能。

## PC Upgrade Tree

### Rank 1

- Loot Scanner I

### Rank 2

- Backpack I
- Quick Deposit

### Rank 3

- Loot Scanner II
- Material Tracking
- Home Storage II

### Rank 4

- Backpack II
- Auto Sort
- Loadout Preset
- Sprint Efficiency

### Rank 5

- Resource Scanner
- Advanced Scanner
- Home Storage III

### Rank 6

- Backpack III
- Secure Case I
- Rare Loot Detection
- Secure Case II

### Rank 7

- Factory Network Link
- Scanner Mastery

具体効果値・Slot数・Scanner距離等はBalance / Playtestで調整可能。

PCでは現在Rank + 次Rank程度までのUpgradeを中心に見せる。特殊UpgradeはBlueprint未発見時に詳細を全開示せず、`未発見技術` 等のHint表示に留める。

## Existing Backpack Upgrade統合

- 既存Backpack UpgradeとPC Backpack Upgradeを別Systemとして残さない。
- 既存SaveですでにBackpack強化済みなら対応するPC Upgradeを取得済みとしてMigrationする。
- 既存SaveのBackpack容量を下げない。
- 取得済みUpgradeの再購入を要求しない。
- Cash / 素材を二重請求しない。

## Optional Upgrade Blueprint

PC Upgrade用のOptional Blueprintは通常のMain Progression Blueprintと区別する。

```text
探索でOptional Blueprint発見
→ Backpack / Secure Case
→ 正常帰還
→ 永久登録
→ PCで特殊Upgrade詳細 / 購入を解放
```

- 正常帰還前に探索失敗した場合、Backpack内Blueprintは通常Loot Contractに従って失う。
- Secure Case内の許可対象Optional Blueprintは保持できる。
- 一度正常帰還して登録済みなら以降失わない。
- 登録後にHomeまで物理Blueprintを持ち歩かせる必要はない。

## Loot / Resource Scanner

Scannerは常時全Lootを表示せず、**Pulse方式**とする。

```text
Scanner入力
→ 0.2〜0.4秒程度の短いPulse演出
→ 周囲の回収可能Itemを数秒Highlight
→ Cooldown
```

原則:

- Scanner用Consumable / Batteryを毎回消費しない。
- Player操作を長時間停止しない。
- Cameraを強制移動しない。
- 強いFlashを使わない。
- 音だけに状態を依存しない。
- Cooldown中は控えめに残り時間を確認可能。
- 画面を埋め尽くさないよう距離 / 同時表示数の上限を持たせる。

Scanner Progression:

```text
未強化 / 初期情報
→ 必要素材名

Loot Scanner I
→ 近距離Loot検出

Loot Scanner II
→ 範囲 / 表示時間等を強化

Resource Scanner
→ Resource Point / 素材エリア情報を強化

Advanced Scanner
→ 素材種類 / 方向の識別を強化

Rare Loot Detection
→ Rare Lootを明確に強調

Scanner Mastery
→ 最終便利機能
```

正確な全Loot位置を最初からMapへ常時表示しない。

## Material Tracking / Pin

PC / Guideから任意のUpgrade・素材目標を **1つだけ** Pin可能にする。

HUDではMain Goalを別枠で残し、Optional TrackをMain Progressionと混同しない。

例:

```text
TRACKED
Advanced Scanner

Circuit      3 / 5
E-Waste      8 / 8
Cash       $620 / $900
Blueprint   未発見
```

Scanner Pulse時:

- 追跡中Upgradeの必要素材を強くHighlight。
- その他回収可能Lootは弱くHighlight。
- 追跡素材だけに限定して他の発見を完全に消さない。

素材入手Hintは段階的に詳しくする。

```text
素材名
→ 主な入手エリア
→ エリア内の大まかな方向
→ 近距離Scanner
```

## Home Storage

Home StorageはFactory Storageとは別の **Player / Exploration用Storage** とする。

主用途:

- PC Upgrade素材
- 探索用品
- 装備
- Secure Case関連Item
- 持ち歩かない予備品

Factory Storage主用途:

- 大量素材
- Production用素材 / 製品
- Conveyor物流
- 自動生産

原則:

- Home StorageをFactory Conveyor物流へ直接接続しない。
- 初期容量でも序盤が詰まらない程度を確保する。
- Home Storage II / IIIをPCから素材 + Cashで段階拡張する。
- Storage Upgradeで既存Itemを消さない。
- Main Progressionの必須条件にはしない。
- Main Clear後も最大段階までUpgrade可能。

PC Upgrade素材参照:

- 初期: Backpack + Home Storage
- Rank 7 `Factory Network Link` 後: Backpack + Home Storage + Factory Storage

Factory Network Link取得前はFactory製品をPC Upgradeへ使うために、Factory StorageからPlayer自身が取り出してHomeへ持ち帰る。

## Workbench

Exploration準備専用WorkbenchをHomeへ最初から固定配置する。

FactoryのHand Craft / Productionを移動させる設備にはしない。

役割:

- Backpack整理
- Home StorageとのItem移動
- Secure Case管理
- 探索装備 / Utility準備
- Loadout Preset
- Quick Deposit

段階解放:

- Rank 1: 基本整理 / Storage移動 / Secure Case基本UI
- Rank 2: Quick Deposit
- Rank 4: Loadout Preset
- Rank 6: Secure Case高度管理 / 探索準備強化

### Quick Deposit

Playerが任意操作した場合のみ実行する。

主にHome Storageへ移す:

- 通常Loot
- Upgrade素材
- Optional素材

自動で移動しない:

- Secure Case内Item
- お気に入り指定Item
- 常備品 / 回復Item
- Main Objective Item

Home Storage容量を超えるItemはBackpackへ残し、Itemを削除しない。帰宅した瞬間の強制自動収納にはしない。

### Loadout Preset

中盤以降に複数の探索準備Presetを保存可能にする。

例:

- 通常探索
- Rare素材回収
- 危険エリア

原則:

- Home Storageに存在するItemだけ自動移動する。
- 不足Itemは不足表示する。
- Itemを生成しない。
- Main Objective ItemをPreset対象にしない。
- Backpack容量を超える場合は勝手に捨てず警告する。
- PresetはSaveに保存する。
- Presetなしでも従来どおり手動準備可能。

## Home設備Progression

Home自体はNew Game開始時から利用可能にする。

初期利用可能:

- Bed
- PC基本画面
- Home Storage
- Workbench基本機能

Rank / PC Upgradeに応じて次を追加する。

```text
Rank 1
→ Bed / PC / Home Storage / Loot Scanner I

Rank 2
→ Backpack I / Quick Deposit

Rank 3
→ Resource系探索支援 / Home Storage II / Material Tracking

Rank 4
→ Backpack II / Loadout Preset / Auto Sort / Mobility系

Rank 5
→ Advanced Scanner / Home Storage III

Rank 6
→ Backpack III / Secure Case強化 / Rare Loot Detection

Rank 7
→ Factory Network Link / 最終Scanner機能

Clear後
→ 未取得Upgrade / Cosmetic収集継続
```

Home設備UpgradeはPCで購入後、短い設置 / 起動演出だけ行い即完成する。リアル時間の工事待ちを入れない。

## Starter Supplies

New GameだけHome Storageへ最低限のStarter Suppliesを配置する。

- 序盤Tutorialで詰まらない最低限の探索 / 回復用品
- Basic Tutorialに必要な基本物資を少量

含めない:

- Loot Scanner Iを無料取得できる十分なUpgrade素材
- Rare素材
- Blueprint
- 高価値Item

既存SaveにはHome追加ボーナスとしてStarter Suppliesを配布しない。

## Home Cosmetic

Home Cosmeticは探索・進行のOptional報酬とする。

候補:

- 廃住宅街のPoster
- 廃工場のIndustrial Light
- 軍事施設のMonitor / Small Prop
- Achievement / Challenge記念品
- Main Clear Trophy / 記念Cosmetic

原則:

- 性能差を付けない。
- Main Progression必須にしない。
- 家具を自由配置するHouse Buildingにはしない。
- Wall Poster / Desk Prop / Lighting / Bed Appearance等の固定Slot方式にする。
- PC `HOME` 画面から解放済みAppearanceを選択する。
- 付け替えCostを要求しない。
- 選択状態をSaveする。

# 探索失敗 / HP / 戦闘

## 探索失敗

表現は死亡ではなく **気絶・行動不能** を基本とする。

失う:

- その探索中に新しく拾った通常Loot
- 実際に使用したConsumable

失わない:

- Factory
- Cash
- Rank
- Research
- Backpack Upgrade
- 基本装備 / 武器
- 探索開始前から所有していた恒久装備
- Secure Case内の許可対象Item

Factory全体を巻き戻す罰にはしない。

New GameまたはHome Respawn有効化後の探索失敗Flow:

```text
HP 0 / Abandon
→ Current Sessionの非保護Lootを失う
→ Home Bedで復帰
→ PC / Storage / Workbenchで再準備
→ 再出発
```

既存SaveはHome追加時に現在位置や復帰地点を強制変更せず、Bed使用後にHome Respawnへ移行する。

## HP / 回復

- 基準HPは100を想定。
- Damage数値はBalance時に調整可能。
- Damage源: 敵 / 落下 / 電気 / 火災 / 有毒区域 / 機械等。
- 正常帰還後はHP回復。
- Bed利用でもHP等のPlayer状態を回復可能。
- Recovery Kit系Consumableを使用。
- Recovery Kitは探索入手 / Factory Craft可能。
- 毎回治療費を払う仕組みを中心にしない。

## 戦闘の位置づけ

- 軽い戦闘を導入する。
- 敵撃破そのものを主要目標にはしない。
- 敵は一部探索Areaのみ。
- Factory内で常時戦わない。
- 武器は護身 / 危険排除中心。
- 敵を避けるRouteを残す。
- 敵Farmを主要金策にしない。

武器候補:

- Scrap Pistol
- Industrial Shotgun
- Shock Tool
- Rank 7 Experimental Weapon

武器耐久値は原則導入しない。

敵候補:

- 基本接近型
- Patrol Drone
- Security Turret
- Heavy Unit

AIは巡回 → 発見 → 警戒 / 追跡 → 見失い → 復帰程度を基本とし、高度FPS AIを主目的にしない。

後半は敵HPを極端増加させるより、敵配置 / Security / 環境危険 / 複数Routeを組み合わせて難しくする。

# Production / Recipe

## Recipe階層

```text
Raw
→ Processed
→ Component
→ Advanced Product
```

- Item種類を無意味に増やすより、既存素材の用途と工程を増やす。
- Recipe入力は通常1〜3種類。
- 最終Tierでも原則4種類程度まで。

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

## Production Tier

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

投入個数 / 処理時間 / 売価はBalance段階で決める。

## Assembler / Fabricator

Assembler:

- Rank 5で本格解放。
- 複数素材からComponent / Productを生産。

Fabricator:

- Rank 7で解放。
- Assemblerの単純高速上位互換ではなくExperimental Tier専用Recipeを担当。

Recipe変更時にBuffer Itemを無断消失させない。

# Logistics

## Conveyor Tier

- Mk.1: Rank 1
- Mk.2: Rank 4
- Mk.3: Rank 6

Tierごとに実Throughput差を持たせる。通常Conveyorは電力不要。

## Directional Contract

- Visual Arrowと実搬送方向を必ず一致させる。
- Machine Input / OutputをVisualでも区別する。
- 物流詰まり時にItemを消失させない。
- Back Pressureにより上流を停止可能。
- 既存Directional Conveyor Contractを維持する。

Rank 4:

- Splitter
- Merger
- Conveyor Mk.2

Rank 5:

- Smart Sorter
- Industrial Storage

Rank 6:

- Conveyor Mk.3
- Priority
- Overflow
- Drone Logistics

Priority / Overflowにより必要Lineを優先し、余剰だけSellerへ流せるようにする。

## Storage

- Small Storage
- Industrial Storage
- Logistics Warehouse

同系統Tierは大量の全撤去を要求せず、その場Upgradeを許容する。

# Power

Rank 4から本格導入。

Rank 4到達時に既存小規模Factoryが突然全停止しないよう、Starter Gridまたは同等の移行手段を持たせる。

Machine 1台ずつへの細かいCable接続を必須にせず、Power Poleの給電範囲方式を基本とする。

考える要素:

- 発電量
- 消費量
- Pole配置
- Factory範囲

発電設備例:

- Scrap Generator
- Industrial Generator
- Advanced Generator
- Experimental Power System

Batteryを中盤以降で解放。

電力不足時:

- 設備 / Itemを破壊しない。
- 供給不足設備を停止。
- Factory Alertで原因を示す。

通常Conveyorは電力不要。Smart Logistics / Drone Port等の高度設備には電力を要求可能。

# Drone / 自動回収

Droneは探索を削除するSystemではなく、**一度Playerが攻略・発見した場所の反復作業を自動化するSystem**とする。

```text
新しいものを発見する
→ Player

発見済み通常資源を繰り返し集める
→ Drone
```

Droneで可能:

- 発見済み通常Resource Pointの自動回収
- 長距離Storage間物流

Droneだけでは不可:

- 未発見Areaの探索
- Research Data / Blueprintの新規発見
- Key Item / Progression Item
- 新Resource Point発見
- 最終探索攻略

Drone Port:

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

細かな燃料補給作業を中心にせず、Portで自動Recharge。Rechargeは電力消費要素とする。

# Economy

「全部売る」が常に最適解にならないよう、素材に複数用途を持たせる。

- 売却
- 加工
- 建築
- Research
- Upgrade

```text
Raw Material
< Processed Material
< Component
< Finished Product
```

Cash用途:

- Building
- Upgrade
- Factory Expansion
- Researchの一部
- Ammo / Recovery Kit / Beacon等

Cashだけで主要進行を完結させない。

売却価格は固定を基本とし、大きなリアルタイム市場変動を主Systemにしない。

## Optional Order

任意のProduction Orderで特定製品を作る理由を作る。

主報酬:

- Cash
- Challenge / Record系

進行必須Research Data / BlueprintをOrderだけで入手可能にはしない。

# Factory Expansion

FactoryはRankと共に物理的に広がる。

Expansion条件はお金だけではなく、原則次を組み合わせる。

- Cash
- 素材
- 復旧作業

区画イメージ:

- Starter Yard
- Processing Yard
- Power & Logistics
- Advanced Manufacturing
- Experimental Sector

完全独立5MapではなくFactory内の地続き区画。

Expansionで増やす候補:

- Build Area
- Power接続地点
- Warehouse / 壊れた施設
- Transport設備
- Drone用スペース
- 道路 / Landmark

2.5m Gridと既存座標系を維持し、Expansionのために既存Factory Layoutの中心座標を変更しない。

Rank 5以降ではElevated Conveyor / Conveyor Lift / Catwalk等の限定的立体物流を許容する。

自由な多層建築Systemを主要要件にはしない。

# Build System

既存の2.5m Grid / R回転 / Safe Dismantleを維持する。

Placement Preview:

- 設置可否
- Input / Output
- Conveyor方向
- Cost
- Invalid理由

## Move / Rotate

設置済み設備を安全に移動 / 回転できる方向を目標とする。

- Custom Name / Upgrade維持
- Buffer Itemを無断消失させない
- 接続状態再計算
- 危険なら理由を表示して拒否

## Dismantle

Player-built設備:

- 建築費100%返金
- Buffer Item返却
- 返却先に収まらない場合は撤去拒否

Starter Hopper / Starter Seller等のPermanent設備は撤去不可。

Factory内ではFactory StorageからConstruction Costを直接消費可能にする。

## Quality of Life

段階的に許容:

- Copy / Quick Build
- Conveyor連続配置
- Conveyor自動Corner補助
- Conveyor Lift / Elevated Conveyor
- 小規模Line Template / Blueprint
- Multi-select
- Conveyor一括Upgrade
- 直近Placementの簡易Undo

Factoryそのものを自動設計 / 自動建設する機能にはしない。

# Factory Management

大Factoryで原因不明の停止を減らす。

Console候補:

- Overview
- Machines
- Production
- Power
- Logistics
- Drone
- Alerts
- Orders
- Production Planner

Alerts最低限:

- Power Shortage
- Input不足
- Output Blocked
- Storage Full
- Conveyor停止
- Drone Route停止
- Seller処理不足

同種Alertは集約する。重要度はCritical / Warning / Info等に分ける。

Console上のMachineから3D World内設備を一時Highlightする `Locate` を許容。

Production Plannerは目標生産量から必要Machine / Input量を計算するが、Factoryを自動建設しない。

Bottleneck表示では「Efficiency低下」だけでなく不足Resource / 停止理由まで説明する。

## System Diagnostics

Machine / Logistics / Power / Drone / Final Automation等で、単に `停止中` / `未達成` と表示するのではなく原因と対処を確認可能にする。

通常表示:

```text
Smelter — 停止: 電力不足
```

詳細表示例:

```text
Input: 正常
Power: 不足
Output: 正常
Route: 正常

対処:
発電量またはPower接続を確認してください。
```

対象:

- Crusher / Smelter / Assembler / Fabricator
- Conveyor / Splitter / Merger / Sorter
- Power
- Storage / Back Pressure
- Drone Route
- PC / Home Upgrade不足条件
- Final Automation
- Mega Factory Stability

原則:

- 通常は短い原因だけ表示し、必要時に詳細診断を開く。
- 問題Popupを大量に出さない。
- 複数原因がある場合は重要な原因を優先表示する。
- TutorialのStuck Helpと可能な限り同じGame Rule / DiagnosisをSource of Truthとして使う。
- Tutorial専用の別判定でRuntime Ruleと矛盾させない。
- 自動修復 / 自動接続は行わない。

# Challenge / Achievement

Achievement = 恒久記録。

候補:

- 初自動Line
- 売上記録
- 生産記録
- Area攻略
- Drone Route
- Mega Factory

主要技術をAchievement取得必須にはしない。

Challenge = 任意の短期目標。

- Production
- Exploration
- Logistics
- Efficiency

Daily / Weeklyログイン前提にはしない。

```text
Order       = Economy
Challenge   = 任意の遊び方
Achievement = 長期記録
```

# Tutorial / Field Manual

Tutorialは **Contextual + 実操作成功判定型**とし、説明を読むだけで完了させない。

## New Game / Basic Tutorial

New GameではHome Bed付近から開始する。

Basic Tutorial Flow:

```text
Home Bed付近から開始
→ WASD / Interaction
→ PCを確認
→ Home Doorを開けて外へ出る
→ Scrap Yardへ移動
→ Scrap回収
→ Inventory確認
→ Factoryへ戻る
→ 手動売却
→ Build Mode
→ Hopper
→ Conveyor
→ Crusher
→ Seller
→ Directional Route成立
→ 破砕金属の自動売却を1回成功
→ BASIC TUTORIAL COMPLETE
→ Free Play / Rank Goal
```

Basic Tutorialの完了条件は **最初の自動販売が実際に成功すること**とする。

`Loot Scanner I` はPC Upgradeを理解するためのRecommended Tutorialとして提示するが、Basic Tutorial / Rank Up / Main Progressionの必須条件にはしない。

Recommended Scanner Tutorial:

```text
PCでLoot Scanner Iを確認
→ 必要素材 / Cashを確認
→ Scrap Yard等で少量回収
→ Homeへ戻る
→ PCでUpgrade
→ Scanner Pulseを体験
```

最初のUpgradeも無料配布せず、要求量を軽くして実際の `素材 + Cash → Upgrade` Loopを体験させる。

## Tutorial表示Contract

通常時:

- 画面端に現在Objectiveを1つだけ表示。
- 対象付近で短いContextual Hintを表示。
- 一定時間詰まった場合だけStuck Helpを強化。
- PC / `O` Guideで詳細説明をいつでも確認可能。

Stuck Helpは段階的に強くする。

```text
1. Objective
→ 2. 短いHint
→ 3. 対象Highlight
→ 4. 正しい向き / 配置例の半透明Preview
```

- 自動でMachineを設置しない。
- 自動でTutorialをClearしない。
- Player自身が操作して成功条件を満たす。
- すでに条件を満たしている場合はTutorial工程を自動達成扱いにしてよい。
- Tutorialのために通常機能をLockしない。

## Rank / System Tutorial

Basic Tutorial完了後は自由行動へ移行し、新Systemが初めて必要になる段階だけ短いTutorialを出す。

例:

- Rank 1: Scrap / Inventory / Build / Conveyor
- Rank 2: Smelter / Storage
- Rank 3: Transport Terminal / 独立探索Area
- Rank 4: Splitter / Merger / Power
- Rank 5: Assembler / Advanced Production
- Rank 6: Drone / Advanced Logistics
- Rank 7: Fabricator / Final Automation / Mega Factory

一度に大量の新Systemを説明しない。

## Tutorial Skip / Replay

- Basic TutorialはSkip可能。
- 個別System TutorialもSkip可能。
- SkipしてもMain ProgressionをLockしない。
- 後からPC / `O` Guideから再開 / Replay可能。
- ReplayはGame State / Rank / Inventory / Factoryを巻き戻さず、Objective / Hint / Highlight / Previewだけ再実行する。
- Tutorial報酬は初回のみ取得可能。
- ReplayでCash / 素材を繰り返し取得できない。
- 既存SaveへBasic Tutorialを強制再実行しない。

## Tutorial / Hint Settings

個別にON / OFF可能にする。

- Tutorial Objectives
- Contextual Hints
- Stuck Help
- Next Goal

全てOFFでもPC / `O` GuideのTutorial Libraryは利用可能にする。

Tutorial進行・完了・Skip・報酬受取・未読状態等はSaveごとに保持する。New Game開始時にTutorialを開始するか選択可能にする。

## Tutorial Language

説明文は日本語中心とし、既存System名を英語併記する。

例:

- 破砕機（Crusher）
- コンベア（Conveyor）
- 電力（Power）
- 物流（Logistics）
- 研究（Research）
- ドローン（Drone）

初心者が英語だけを理解しないと進行できる状態にしない。

## Tutorial Library / Field Manual

PCと `O` Guideは **同じTutorial Content Source of Truth**を参照する。

- PC: Homeでじっくり確認するManual UI
- `O`: World内どこでも確認するGuide

カテゴリ候補:

- Basics
- Exploration
- Inventory
- Home
- Building
- Logistics
- Power
- Production
- Drone
- Advanced Automation
- Final Chapter

- 未読 / 既読を表示。
- 未解放Systemを序盤から大量表示しない。
- Progressionに応じて追加する。
- 既存Saveでは現在Rankまでの必要項目を利用可能にする。
- TutorialをSkipしてもLibraryは利用可能。

詳細説明には必要に応じて次を含める。

- 何をするか
- 操作Key
- なぜ必要か
- 成功条件
- 正しい接続 / 配置例
- 問題が起きた場合の診断 / 対処

## Next Goal

Tutorial完了後も、任意で次のおすすめを表示可能にする。

区分:

- `MAIN` — 次のRank / Main Progression
- `RECOMMENDED` — 今行うと便利な内容
- `OPTIONAL` — PC Upgrade / Home強化 / Cosmetic等

一度に大量のGoalを並べず、Main Goalを最優先する。OptionalをMain Progressionのように見せない。

PC / Guideから任意目標を1つPinでき、Main Goalは別枠で維持する。

# UI / HUD

原則:

- 3D Canvasを主役にする。
- 常時HUDを増やしすぎない。
- Factory / ExplorationでObjective表示を切り替える。
- 状態だけでなく問題原因を表示する。
- 通知は大量発生時に集約する。

常時 / 状況別:

- 現在Objective
- Cash
- Backpack Slot / Secure Case等の必要情報
- 必要時のHP
- Crosshair / Interaction Marker
- Static Shortcut Bar（設定で非表示可）
- 必要時のScanner / Material Tracking / Next Goal

PC Upgrade取得一覧をHUDへ常時並べない。

- Scanner使用時だけScanner情報。
- Secure Case操作時だけ容量情報。
- Material Tracking中だけ追跡対象。
- Factory Network LinkはPC画面内で接続状態を表示。

Build / Dismantle専用情報はMode中だけ表示。

詳細統計はFactory Managementへ分離。

Pause Menuに探索中の即時 `Return to Factory` / `Return Home` は置かない。

# Difficulty / Accessibility / Settings

## Difficulty

- Casual
- Standard
- Hazard

Standardを基準Balance。

Difficultyが主に変更するもの:

- 敵Damage
- 環境Damage
- Recovery補助
- 敵の警戒等

工場生産速度 / Rank条件をDifficultyで大きく変更しない。

探索失敗時Loot喪失ContractはDifficultyで無効化しない。Casualは失敗しにくさを調整する。

難易度変更はFactoryにいる時点で反映する。

## Controls

- Mouse Sensitivity
- Invert Y
- FOV
- Sprint Hold / Toggle
- Crouch Hold / Toggle（Crouch導入時）
- Key Bind
- Scanner PulseのKey Bind

BrowserではPointer Lockによる相対Mouse Inputを基本とし、OS Level Raw Inputを保証要件にはしない。

Scanner Keyは既存Controlsと衝突しないKeyを実装段階で選択し、Key Bind対象にする。

## Accessibility

- Head Bob 0〜100 / OFF
- Sprint FOV Effect調整
- Reduce Motion
- Screen Shake調整
- HUD Scale
- Text Size
- Crosshair調整
- Shortcut / Interaction表示設定
- Tutorial Objectives ON / OFF
- Contextual Hints ON / OFF
- Stuck Help ON / OFF
- Next Goal ON / OFF
- HOME Marker ON / OFF
- 色だけに情報を依存しない
- 重要情報を音だけに依存しない

## Graphics

- Low / Medium / High / Custom
- Performance Mode

Performance Modeは描画負荷を落とすがFactory Simulation結果を変えない。

# Visual Direction / Graphics Quality

## Visual Ambition

長期Visual Goalは **Stylized Industrial Realism** とする。

完全なAAA Photo-realismではなく、現実感のある工業設備・素材・摩耗・Lightingを持ちながら、Machine・物流方向・Interactable・危険・探索導線を一人称視点で読みやすくする。

目標:

- WebGL Prototype感を残さない。
- Steamの3D Indie Factory Gameとして見ても未完成Asset集に見えない品質を目指す。
- Geometry / Material / Lighting / Environment / Animation / VFXを組み合わせて品質を作る。
- 派手なEffectよりGameplay Readabilityを優先する。

直接的なVisual ReferenceやAssetをコピーせず、同種Factory / Salvage / Exploration GameからSilhouette・Material差・環境密度・Feedback等の構造原理を参考にする。

## Hybrid Asset Policy

従来の「Three.js Geometry中心・外部3D Assetなし」は初期MVP検証用の制約として扱い、長期Visualでは **Procedural + Local Asset Hybrid方式**へ変更する。

### Proceduralを優先するもの

- Conveyor
- Pipe
- Fence
- Floor / Wall
- Grid structure
- Road
- Repeating infrastructure
- 大量配置される単純構造

### Local Assetを使ってよいもの

- Motor / Pump / Valve
- 複雑なMachine detail
- Scrap / Tool / Vehicle wreck
- Control panel
- Props
- Hero Machine
- Detail表現にGeometry生成だけでは限界があるObject

### Asset Contract

- Assetは原則Repository管理または管理可能なProject-owned deliveryとし、重要Assetを第三者URLへHotlinkしない。
- 自作 / AI生成 / 配布Assetを問わず、公開・再配布・商用条件・Attributionを確認する。
- Attributionが必要なら `CREDITS.md` 等へ残す。
- License不明Assetを使用しない。
- 3D AssetはglTF / GLBを第一候補とする。
- Texture / Mesh CompressionはPipeline整備後に利用可能。
- Visual Assetを差し替えてもBuilding ID / Save Data / Gameplay Contractを変更しない。

Audio AssetはVisual Asset方針と別にLicense・容量・導入方式を決める。Hybrid Visual Asset採用だけで音源利用を自動承認しない。

## Lighting / Sky / Shadow / Fog

基本方針:

- 「綺麗な光」よりMaterial・Machine・距離・危険・導線が読みやすいIndustrial Lightingを優先。
- Environment Light / Main Directional Light / Local Lightを役割分離。
- 全ObjectへRealtime Light / Shadowを付けない。

Time of Day:

- 常時高速Day / Night CycleをMain Requirementにはしない。
- SceneごとのAuthored Time-of-Dayを基本とする。
- Factory / Scrap YardはLate Afternoon〜夕方前の暖かい光を基準候補。
- 廃住宅街は曇天〜夕方。
- 廃工場は曇天 + Interiorの壊れた照明 / Emergency Light。
- 軍事施設は冷たい曇天 / 薄暮。
- 研究施設は人工照明主体。

Shadow:

- Near: 高品質。
- Mid: 簡略化。
- Far: 原則Shadowなしまたは最小。
- Player近傍Machine / 大型構造 / Character / Droneを優先。
- 小型Scrap / 細かなConveyor部品 / 遠景は低Priority。

Atmosphere:

- Procedural Skyを基本とし、Horizon / Sun direction / Cloud / Distance hazeを統合。
- HDR / Environment MapはHigh設定等で必要性と容量を検証して採用可能。
- Fogを単なる描画隠しではなくAtmospheric Perspectiveとして使う。
- AreaごとにFog density / distance / particle / lightingを変える。
- Volumetric / God Ray相当は廃工場の屋根光、Military spotlight、Central Core等のHero Momentへ限定。

AO / Contact:

- Machine / Scrapが浮いて見えないことを必須とする。
- AO / baked AO / material detail /正しいGeometry接地等を組み合わせる。
- 高負荷Screen-space AOはGraphics Qualityで切替可能にする。

Post Processing:

- BloomはFurnace / Welding / Research Equipment等の高輝度部へ限定。
- Gameplay中の強いMotion BlurはDefault OFF。
- Depth of Field / Chromatic Aberrationは通常Gameplayで常用しない。
- Tone Mapping / Color Space / Exposureの基準を全Sceneで統一する。

## Material / Texture / PBR

基本はStylized PBR。

共通Material Library候補:

- Painted Metal
- Bare Steel
- Rusted Steel
- Dark Steel
- Aluminum
- Rubber
- Plastic
- Concrete
- Glass
- Emissive Screen
- Oil / Grease
- Dirt / Dust

原則:

- Base Colorだけで素材差を作らず、Roughness / Metalness / Normalを活用する。
- 必要AssetだけAO / Emissive / Alpha / Detail Mask等を追加。
- Machineごとに大量の独自Materialを増やさずShared Materialを優先。
- Ground / Wall / Road等はTileable Textureを優先。
- Industrial Atlas / Decal Atlas等を検討。
- 近距離Detailは巨大Base TextureだけでなくDetail Normal / Roughness等で補う。

Soft Texture Target:

- Hero / 重要Machine: 原則1K〜2K程度まで。
- 一般Prop: 512〜1K程度。
- 小物 / 大量配置: 256〜512 / Atlas / Shared Textureを優先。
- 4K Textureの大量使用は原則避ける。

Wear / Dirt:

- 錆はScrap Factoryの主要Visual要素だが、全Objectを一様に茶色へしない。
- Edge / Bolt / 下部 / 水分 / 使用箇所等、意味のある位置へWearを配置。
- Player-built / Abandoned / Repaired / Advanced Machineで摩耗量を変える。
- Scrap Yard = Dust / Rust powder。
- Factory = Oil / Grease / Metal dust。
- Residential = Dust / Dirt / Mold等。
- Military = Dust / Soot / Chipped paint。
- Research = 比較的Clean + 故障箇所のBurn / Residue。

Decal候補:

- Oil stain
- Tire mark
- Crack
- Rust streak
- Warning marking
- Number / Machine ID
- Old company marking
- Arrow
- Burn / Damage
- Repair patch

Decalは重要地点 / 近距離へ集中し、画面全体をNoiseで埋めない。

## Machine Visual Contract

Machineは色ではなくSilhouetteで判別可能にする。

距離別:

- Far: 種類をSilhouetteで判別。
- Mid: 主要Mechanism / Input / Outputが読める。
- Near: Material / Pipe / Bolt / Wear / Panel等のDetailが見える。

共通構造候補:

- Main Frame
- Functional Core
- Input
- Output
- Motor / Power section
- Maintenance section
- Status
- Safety part

Machine別方向:

- Crusher: Twin Roller / Feed Chute / Output Chute / Motor / Guard。
- Smelter: Furnace / Chimney / Heat section / Pipe / Heavy Door。
- Assembler: Modular Frame / Multiple Input / Assembly Chamber / Tool mechanism / Control Screen。
- Fabricator: Enclosed precision chamber / Multiple manipulator / Advanced Power / Experimental visual language。
- Scrap Generator: Improvised engine / exposed exhaust / fuel hopper / vibration。
- Industrial / Advanced Generator: より標準化・統合された構造。
- Battery: Cell module / terminal / cooling / charge gauge。
- Power Pole: Base / Mast / distribution hardware / maintenance element。
- Drone Port: Landing Pad / Charge Dock / Storage interface / Antenna / Service Arm。
- Drone: Cargo body / propulsion / sensor / battery / attachment。

Logistics:

- Conveyor Mk.1 / Mk.2 / Mk.3は速度Tierを色だけで区別しない。
- Splitterは1 Input → 3 Output、Mergerは3 Input → 1 Outputが形から読める。
- Smart SorterはSensor / Scan / Filter表示を持ち、通常Splitterと区別する。
- Input / Output Portは全Machineで共通Design Languageを使い、形 + Arrow + Label等を組み合わせる。

Animation:

- Running / Idle / Blocked / Power Shortage等をVisual stateへ反映。
- Roller / Motor / Fan / Arm / Belt等はGameplay Stateの結果として動作。
- Visual-only animationがProduction状態と矛盾しない。

Hero Asset候補:

- First Crusher
- Generator
- Assembler
- Drone Port
- Fabricator
- Experimental Power
- Autonomous Industrial Core

Hero Machineは通常設備よりDetail / Animation / VFX Budgetを多く使ってよい。

## Environment / Area Visual Identity

全SceneでNear / Mid / Farの3層を持つ。

```text
Near = Playerが触れるDetail
Mid  = 空間用途を説明するStructure / Prop
Far  = 世界の規模・方向を示すSilhouette / Landmark
```

地形:

- Factory Build Areaは2.5m Gridを優先し、基本平坦。
- Environment Areaは段差 / 傾斜 / broken foundation等を許容。
- Groundを単一Plane / 単一Textureだけで完成扱いしない。
- Concrete / Dirt / Asphalt / Metal plate / Oil-stained surface等を用途で分ける。

### Scrap Yard

Visual language:

- Main Crane
- Scrap mountain
- Container stack
- Broken vehicle
- Loader
- Fence / Workshop / Weigh station
- Barrel / Tire / Cable spool / Pipe / Pallet / Engine block等

Collectible ScrapとDecorative Scrapを見分けられること。

### Factory

Rank進行で景観も成長させる。

Early:

- worn concrete
- temporary fence / lighting
- exposed infrastructure
- repaired Scrap outpost

Mid:

- organized logistics
- reinforced floor
- power infrastructure
- Storage / Service zone
- Signage / Catwalk

Late / Mega:

- Advanced Manufacturing
- Drone infrastructure
- Experimental Sector
- 大規模でも用途が読めるZone構成

Rank / UpgradeをHUDだけでなくWorldからも感じられるようにする。

### Home

- Factory横の小型プレハブ住宅。
- Earlyでは中古PC / 簡素なBed / 小型Storage / Workbenchを中心にする。
- MidではMonitor増設 / Scanner機器 / Storage拡張 / Exploration準備設備が増える。
- LateではAdvanced Terminal / Factory Network表示 / Advanced Scanner機器等でPlayer側の成長を見せる。
- Home Progressionを大型建築化で表現せず、既存の小さい室内に機能 / Visual detailが増える方向とする。
- Home Cosmeticは固定SlotのAppearance変更で表現し、Gameplay機能配置と矛盾させない。

### 廃住宅街

- House / Apartment / Garage / Shop / Utility building。
- Furniture / Appliance / Bicycle / Trash bin / Sign / Streetlight / Vehicle等。
- Cracked road / broken window / hanging cable / limited vegetation。
- 人が生活していた痕跡を出す。

### 廃工場

- Press / Tank / Boiler / Overhead Crane / Pipe Network / Catwalk / Control Room。
- Valve / Motor / Pump / Electrical Cabinet / Workbench等。
- 空間から過去の生産用途が想像できること。
- Steam / Oil / Machinery密度を高める。

### 軍事施設

- Reinforced wall / Checkpoint / Barrier / Watch tower / Security Gate / Bunker / Vehicle bay / Antenna。
- Scrap Yardより規律的・整然とした配置。
- Security / Defenseの用途をArchitectureで示す。

### 崩壊した研究施設

- Precision panel / laboratory / glass partition / robotics / energy conduit / test chamber / server / central machinery。
- 旧Scrap系設備より高い文明レベルを造形で示す。
- Cleanな設計とDamage / malfunctionを対比させる。

Interior:

- 全BuildingをEnterableにしない。
- 入れるBuildingはDetail高め、入れないBuildingはFacade / Silhouette中心。
- Modular Kitを基本とし、Damage / Material / Decal / Prop / Lighting variantでRepetitionを崩す。

Navigation:

- Landmark / Road / Lighting / Signage / Architecture / Objective framingで誘導。
- Visual強化でInteractableが背景に埋もれないこと。
- Gameplay ObjectとDecorationの見た目を区別する。

Collision:

- Wall / Large Machine / Container / Major Pipe等はCollider対象。
- Cable / Bolt / Small debris / stain /遠景等は原則Collider不要。
- Decorationのために移動が細かく引っかかる状態を避ける。

## VFX / Particle

VFXは派手さではなく、Machine State / Hazard / Environment / Progressを伝えるために使う。

Machine例:

- Crusher: Metal dust / short spark / vibration。
- Smelter: Heat glow / Smoke / Steam / optional heat distortion。
- Generator: Exhaust / vibration / fuel stop feedback。
- Assembler: Tool movement / short welding spark / work light。
- Fabricator: Hero-scale enclosed glow / precision effect / startup sequence。
- Drone Port: Takeoff / Landing dust / guide light / charging feedback。

Environment:

- Scrap Yard: Dust / small drifting debris。
- Residential: Dust / leaf / paper。
- Factory: Steam / Dust / Metal particle。
- Military: Light dust / electrical effect。
- Research: Subtle vapor / electrical instability。

Hazard:

- Electric arc
- Fire / smoke
- Toxic gas
- Security light / laser等

危険はEffectだけでなく形・Warning・配置でも理解できるようにする。

Performance:

- NearはFull effect、MidでSpawn Rate削減、Farで停止 / simplified。
- Offscreen /別Sceneの細かなVFXを常時Simulationしない。
- Burst系ParticleはPoolingを検討。
- Conveyor等の大量設備へ常時Particleを付けない。
- Smoke / SteamでGameplay targetや導線を隠さない。

Progress:

- Repairは短いSpark → Light ON → Mechanism start等で復旧感を出す。
- Rank Up / Researchは世界観に合う短いTechnical Feedback。
- Mega Factory StartupはExperimental Power → Main Bus → Drone Network → Production Line → Fabricator → Final Productの大きなVisual Reward候補。

## Camera / Movement Feel / Screen Effects

一人称操作はResponsiveさを維持しつつ、ごく軽い重量感を持たせる。

Movement:

- 入力直後の反応を保ち、短いAcceleration / Decelerationのみ許容。
- 強い慣性 / 滑りを中心にしない。
- Sprintは探索移動手段。
- 小さな段差はStep-up等で毎回Jumpを要求しない方向。
- Crouchは探索 / Combatが必要になった段階で追加可能。

Camera:

- Head Bob Defaultは弱め、0〜100 / OFF。
- Camera Swayは極小。
- Landing / heavy impactは短いCamera responseのみ。
- Build中はHead Bob / FOV / Shakeを弱め、Placement精度を優先。
- Machine PanelでCameraを強制的に大きく移動させない。
- Home PCは専用InteractionとしてMonitorへ短く寄せるCamera transitionを許容するが、長い演出にはしない。

First-person Animation:

- Full Body FPSを必須にしない。
- Hands / Tool / Weapon / Interaction animationから導入可能。
- Pickup / Press / Repair / Insert / Use等の短い共通Animationを使う。
- Pickup演出で連続回収を遅くしない。

Screen Effects:

- Screen ShakeはExplosion / Heavy Machine / Mega Factory startup等へ限定。
- Damage Feedbackは短いDirectional Indicator / subtle vignette / impulse程度。
- Low HP演出で視界を強く潰さない。
- Motion Blur Default OFF。
- DoF / Chromatic Aberrationは通常Gameplayで常時使わない。
- Reduce MotionでCamera / Transition / Effectを削減可能にする。

Mouse:

- Pointer Lockを基本。
- 人工的な強いMouse smoothing / latencyを入れない。
- Interaction Raycastは小型Scrap等でわずかなToleranceを許容可能。

# Audio / Feedback

Audio Systemは将来要件。

- Machineごとに動作音を区別
- 大Factoryでは距離 / 台数に応じて音を集約
- 売却 / Build等の連続SEを過剰に鳴らさない
- AreaごとにAmbientを変える
- BGMは環境音を邪魔しない補助
- Rank Up / Area Unlock / First Drone / Main Clear等の大きな進行だけ強いFeedback
- Machine Volumeを独立設定可能にする方向
- 重要情報は必ずVisualでも表示

Audio Asset導入時はVisual Assetとは別にLicense / 容量 / Attributionを確認する。

# Story / World

Gameplay中心とし、長い会話 / Movie / NPC会話を主軸にしない。

主人公は放棄された工業拠点を再稼働させるSalvager / Engineer程度の薄い設定。

Environmental Storytelling:

- Scrap Yard: 旧工業地帯の痕跡
- Home: Playerが拠点へ根付き、探索 / Factory成長とともに生活・技術環境も整っていく痕跡
- 廃住宅街: 生活の放棄 / 停電 / 避難
- 廃工場: 生産停止 / 電力障害 / 自動化異常
- 軍事施設: 研究施設封鎖 / 特殊技術移送
- 研究施設: Robotics / Materials / Energy / Central Core

崩壊原因は一原因へ固定しすぎず、Energy / Logistics / Automation / 封鎖等の複数要因を環境や短いLogから推測できる構成。

Logは任意収集で、読まなくても主要進行可能。

Mega Factory完成を、失われた産業技術をPlayer自身が理解・再構築した結果としてMain Clearへつなげる。

# Save

## Storage

現行 `localStorage` + Schema Version方針を維持。

長期要件によるSave肥大化を計測し、容量Riskが高いと実測確認された場合のみMigration付きでIndexedDB等を検討する。

永続IDは表示名 / 配列Index / Visual Asset Pathと分離する。

## Auto Save

最低限:

- Building設置 / 撤去 / 重要変更
- Research
- Rank Up
- Factory Expansion
- PC / Backpack / Home Upgrade
- Home Storage重要変更
- Tutorial重要進行 / 報酬受取
- Home Cosmetic選択
- Settings
- 正常帰還
- 一定時間ごと

BedによるManual Save相当も残す。

## Home / Player Persistent State

必要に応じて次を永続化する。

- PC Upgrade取得状態
- Backpack Upgrade状態
- Home Storage contents / capacity tier
- Secure Case tier / contents
- Material Tracking / Pin
- Loadout Preset
- Tutorial completion / skip / replay-independent reward flags
- Tutorial Library unread / unlocked state
- Home初回案内済み
- Home Respawn有効状態
- Home Cosmetic unlock / selection
- Optional PC Upgrade Blueprint登録状態

容易に再計算できる表示用Summaryを第二のSource of Truthとして重複保存しない。

## Exploration Session

探索中断から再開可能。

保存候補:

- Area
- Player Position
- HP
- 持ち込み装備
- 探索中Loot
- Secure Case
- 主要ギミック状態

Refresh / Browser Closeだけで探索成功扱いにはしない。

正常帰還:

- 探索LootをFactory Storageへ確定。
- Optional PC Upgrade Blueprint等、正常帰還で登録する対象を永久登録。
- Exploration Session終了。

行動不能 / Abandon:

- 通常Loot喪失。
- Secure Case等の保持対象のみ残す。
- Home Respawn有効時はHome Bedへ復帰。
- Session終了。

## Backup / Export / Import

- Current Save
- 少なくとも1世代Backup
- JSON Export / Import

ImportはSchema確認 → Migration → Backup → 適用を基本とする。

壊れたImportでCurrent Saveを即上書きしない。

## Migration

Save Schema変更時に旧Dataを無断破棄しない。

不足項目を既定値で補完し、既存Factory Layout / Progressionを可能な限り維持する。

Home / Player Convenience追加時:

- Home / Bed / PC / Home Storage / Workbenchを既存Saveにも利用可能にする。
- 既存SaveのPlayer現在位置をHomeへ強制Teleportしない。
- Basic Tutorialを強制再実行しない。
- 現在RankまでのTutorial Libraryは必要範囲を利用可能にする。
- 既存Backpack Upgrade Evidenceから対応するPC Backpack Upgradeを取得済みとしてMigrationする。
- 既存Backpack容量を下げない。
- Scanner / Secure Case / Factory Network Link等の新規Convenience Upgradeを勝手に取得済みにしない。
- Existing Factory Layout / Inventory / Rank / Main Clear / Achievementを維持する。
- Home固定位置が既存Factory Buildingと衝突する場合はMigration / Placement Strategyを先に解決し、既存設備を無断削除しない。
- 既存SaveへStarter Suppliesを無料配布しない。

Save破損時に即初期化せず、Backup復元 / Export / 新規開始等の選択肢を持たせる方向。

# Performance / Scale

Mega Factoryは実現するが、何千台ものMachineや全Itemを個別Physicsで処理するGameにはしない。

Target:

- 通常プレイ: 60 FPS
- 大規模Factory: 45 FPS程度
- 30 FPS未満が常態化する状態は完成扱いにしない方向

具体Benchmark PCは実装 / Performance Testing段階で固定。

Soft Scale Target:

- Machine: 通常30〜80 / 終盤80〜150 / Mega Factory 150〜250程度
- Conveyor: Mega Factoryで1,500 Cell前後
- Drone: 最大20機前後

実測を見ずにHard Limitを固定しない。

## Simulation / Rendering分離

- Production / LogisticsはData中心でSimulation。
- Conveyor上の全Itemを個別Physics Objectにしない。
- 近距離PacketだけVisual化し、遠距離は簡略化可能。
- 遠景はLow-detail / Colliderなし / Shadow最小。
- 大量ObjectはGeometry / Material共有、Instancing等を使用または検討。
- Statisticsを毎Frame再計算しない。
- Machine Animation / VFXの更新頻度は距離に応じて下げてよい。
- Renderer最適化でSimulation結果を変えない。

Factory / Exploration Sceneを同時にフルSimulationしない。

探索中Factory Productionは毎Frame裏で動かさず、探索経過時間に対する結果計算方式を基本とする。

Home内のPC / Workbench / Storage UI操作はFactory Scene内Interactionなので、Player操作を止めてもFactory Simulation自体は継続する。

Input不足 / Output満杯 / Power不足 / Storage容量を無視した無限生産にはしない。

ゲームを閉じていた現実時間を使ったOffline Progressを主要Systemにはしない。

## Visual Performance Budget

Asset / RenderingのSoft Targetを設ける。最終値は実測で調整可能。

Initial Load:

- Game HubからScrap Factoryへ入るためのCore Assetは概ね15〜25MB程度を初期目安。
- Factory / Scrap Yard / Homeに不要な将来Area Assetを初回から一括読込しない。

Exploration Area:

- 各独立Areaは必要時にLazy Load。
- Area単位のAssetは概ね20〜40MB程度をSoft Targetとし、実測Loading / Memoryで調整。
- 一度LoadしたAssetはSession内で再利用可能。

Rendering:

- Asset系Machine / 大型PropはLOD0 / LOD1 / LOD2等を原則検討。
- LODでMachineの主要Silhouette / Input / Output方向を壊さない。
- Conveyor Support / Fence / Barrel / Pallet / Pipe / Scrap Decoration等、大量反復ObjectはInstancing優先候補。
- 遠距離Machineは細部Animation / Roller / Particle / Shadowを削減可能。
- Realtime Point LightをMachine数に比例させず、Status LampはEmissive中心。
- Realtime Reflectionを大量設備へ使わずEnvironment Map / PBR responseを優先。

Texture / GPU Memory:

- 同一MachineはTexture Setを共有。
- Download容量だけでなくGPU展開後Memoryを確認。
- Material / Texture / Shader Variantを無制限に増やさない。

Mega Factory:

- Distance-based LOD / Culling / Shadow / Animation / Particle削減を通常機構として利用。
- Graphics Qualityを勝手にLowへ変更しない。
- 大規模化でVisualを簡略化しても、物流・生産・電力・Drone結果を変えない。

Performance Mode:

- Shadow削減
- AO OFF / 簡略化
- Bloom OFF
- Particle削減
- Draw Distance / Environment detail削減
- Animation更新削減

Gameplay Simulationには影響させない。

# Game Hub

- Playableと未完成Gameを明確に分ける。
- 最近の進行 / Play Timeを表示。
- Save Export / Importを提供。
- 未完成Gameに偽のPlay導線を出さない。
- Scrap FactoryのProgression Rank / Achievement等を表示可能にする。

# 制作ロードマップ / Phase Gate

実装は一度にRank 7まで広げず、各Phaseで**遊べる縦の一本**を完成させてから次へ進む。

共通原則:

> 「Codeを書いた」「Commitした」ではなく、そのPhaseの主要FlowがSave / Reloadを含め最後まで成立してから次へ進む。

## Phase 0: 既存MVPを基準状態として固定

対象:

- 現行Save
- Directional Conveyor
- Building / Dismantle
- Crusher / Smelter / Seller
- Factory Management
- Tutorial
- Existing Tests
- GitHub Pages主要Flow

完成Gate:

- 現行Save読込成功。
- Building / Dismantle正常。
- Directional Conveyor逆流Regressionなし。
- Production / Selling成立。
- Tutorial → Free Play成立。
- 既存Tests / Validation成功。
- Desktop Browser主要操作確認。

禁止:

- Save初期化で問題解決。
- Directional Conveyor Contractの無断変更。
- 大規模Refactorと新機能を同時に行う。

## Phase 1: Progression Rank / Research

対象:

- `progressionRank` 1〜7のData構造
- 必須目標 + 選択目標
- Rank Up判定
- Research Tier / Category
- Blueprint / Research Data
- Unlock管理
- Legacy Factory Rank表示との分離
- Legacy Save Migration

完成Flow:

```text
Rank 1
→ 必須 + 選択目標
→ Rank Up
→ Research Tier解放
→ Research
→ Unlock
→ Reload後も維持
```

必須:

- Blueprint未発見技術を研究不可。
- AchievementだけでRankを決めない。
- Existing Achievementを消さない。
- 既存Smelter / Storage等を持つLegacy Saveを破壊しない。
- Rank 1→2→3程度の縦進行を実際に確認。

禁止:

- RankをLifetime Revenueだけで決定。
- Research Pointの放置稼ぎ。
- 巨大Research Treeを先に全部作る。

## Phase 2: Power / Logistics / Production Expansion

対象:

- Starter Grid
- Generator
- Power不足 / 復旧
- Power Pole
- Battery基盤
- Splitter / Merger
- Conveyor Mk.2
- Throughput
- Storage拡張
- 新Recipe
- Factory Expansion I / II

完成Flow例:

```text
Generator
→ 複数Crusher
→ Splitter / Merger
→ Smelter
→ Storage / Seller
```

必須Regression:

- Item lossなし。
- Conveyor逆流なし。
- Power不足から復旧可能。
- Storage満杯でSave破損なし。
- Rank 4相当のFactoryを安定稼働可能。

## Phase 3: Exploration共通基盤 / 廃住宅街

対象:

- Transport Terminal
- Expedition Select
- Loadout
- Exploration Session
- 指定帰還地点
- 探索失敗 / Abandon
- Slot-based Backpack
- Secure Case
- Shortcut
- Resource Point
- Loot Table
- Exploration Progress
- 廃住宅街

完成Flow:

```text
Factory
→ Transport Terminal
→ Loadout
→ 廃住宅街
→ Loot / Objective
→ 指定帰還地点
→ Factory Storage
```

必須:

- 失敗Flow成立。
- Browser ReloadからSession再開可能。
- Secure Case Contract成立。
- Resource Point登録可能。

禁止:

- このPhaseで残り全Mapを量産。
- 完全Random Map化。
- Menu即時帰還。

廃住宅街1Areaで探索共通Systemを完成させてからPhase 4へ進む。

## Phase 4: Advanced Production / 廃工場

Factory側:

- Assembler
- Smart Sorter
- Industrial Storage
- Motor / Circuit / Control Unit
- Production Statistics
- Bottleneck Detection

探索側:

- 廃工場
- Generator復旧
- Control Room
- Shortcut
- Industrial Loot
- Blueprint
- Environmental Hazard

完成Flow:

```text
廃工場探索
→ 設備復旧
→ Blueprint取得
→ Research
→ Assembler
→ 高度Component
→ 完全自動化
```

探索で得た技術がFactoryの新しい生産方法へ直接つながったらPhase 5へ進む。

## Phase 5: Combat / 軍事施設 / Drone

Combat:

- HP
- Recovery
- 基本Weapon
- Shock Tool
- 基本Enemy AI
- Turret / Patrol Drone
- Hazard

軍事施設:

- Security / Access
- 複数侵入Route
- Drone Blueprint
- Rare Material

Drone:

- Drone Port
- Resource Point Route
- 自動回収
- Recharge
- Factory Storage接続

完成条件:

- `戦う / 避ける / 設備停止` のうち最低2つ以上の攻略方法が成立。
- PlayerがResource Point発見 → Route確保 → Drone回収 → Storage → Productionまで成立。
- Droneが未発見Resource / Blueprint / Progression Itemを勝手に取得しない。
- Combatだけで主要進行するGameになっていない。
- 探索を完全自動化できない。

Rank 6の「探索 → Drone化 → 高度生産」が成立したらPhase 6へ進む。

## Phase 6: 崩壊した研究施設 / Main Clear

対象:

- Robotics Lab
- Materials Lab
- Energy Lab
- Central Core
- Experimental Research
- Fabricator
- Experimental Power
- Advanced Drone
- 最終素材 / 最終製品
- Mega Factory
- Main Clear

完成Flow:

```text
Robotics / Materials / Energy Lab
→ Factoryで最終部品生産
→ Central Core
→ Experimental Research
→ 最終自動Line
→ Mega Factory安定稼働
→ MAIN CLEAR
```

**新規SaveからMain Clearまで到達可能**になって初めてScrap FactoryのLong-term Main Game完成と扱う。

Rank 7到達だけでは完成扱いしない。

## Phase 7: Endgame / Home / Player Convenience / Polish

Main Clear成立後のEndgame候補に加え、既存Main Progressionを壊さずHome / Player Convenience / Tutorial強化をCross-cutting拡張として実装する。

Home / Player Convenience対象:

- Home fixed safe area
- Bed / Home Respawn / Manual Save
- PC Player Management Terminal
- PC Upgrade Tree
- Home Storage / Workbench
- Scanner / Material Tracking
- Backpack I / II / III integration
- Secure Case contract update
- Loadout Preset / Quick Deposit
- Tutorial / Tutorial Library / Next Goal
- System Diagnostics
- Existing Save Migration

Endgame / Polish候補:

- Advanced Orders
- Endgame Challenges
- Achievement拡張
- Factory Optimization
- 小規模Blueprint
- Multi-select
- Conveyor一括Upgrade
- Audio / BGM
- Environmental Storytelling / Log追加
- Final Visual Polish
- Performance Optimization

Home / Tutorial拡張を理由にMain Clear Contractを変更しない。Polishを理由にMain Progressionの完成を後回しにしない。

### Home / Tutorial完成Flow

```text
New Game
→ Home Bed付近から開始
→ Basic Tutorial
→ Scrap回収
→ 最初の自動販売成功
→ Basic Tutorial完了
→ Free Play
→ PC Upgrade / Material Trackingを任意利用
→ Rank進行でSystem Tutorial / Home機能段階解放
→ Main Clearまで既存Progression維持
```

必須Regression:

- Existing SaveのFactory / Rank / Main Clearを維持。
- Home追加で既存Buildingを無断削除しない。
- Backpack Upgrade Migrationで容量を下げない。
- Tutorial Skip / Replay / Settingsが進行を壊さない。
- PC UpgradeでItem二重消費 / Item lossなし。
- Home Storage UpgradeでItem lossなし。
- Secure Caseの許可 / 禁止Item Contract成立。
- Scanner / Material Tracking連動成立。
- Factory Network Link取得前後の素材参照範囲が正しい。

## Visual Development Track

VisualはPhase 7まで何も触らない方式にはしない。新しいArea / Machineを追加するたびに最低Visual Qualityを同時に満たし、基盤強化はGameplay Phaseと並行するCross-cutting Trackとして扱う。

### V0: Current Baseline / Research

- 現行Factory / Scrap Yard / ResidentialのScreenshot / Browser確認。
- KEEP / FIX / REMOVE整理。
- Domain / Genre Research。
- Visual Performance baseline計測。

### V1: Hybrid Asset Foundation

- Local Asset folder / naming / license管理。
- glTF / GLB loading方針。
- Shared PBR Material Library。
- Texture / Decal / Atlas方針。
- Color Management / Tone Mapping。
- LOD / Instancing基盤。

### V2: Factory / Scrap Yard Quality Pass

- Generator / Power Pole等の未完成Silhouette改善。
- Machine Material / Animation / status feedback。
- Ground / Decal / Scrap density。
- Lighting / Fog / Sky。
- Near / Mid / Far composition。

### V3: Residential Quality Pass

- Building / Interior / Props / Landmark。
- Residential固有Material / Lighting。
- Gameplay route readability。
- Loot / InteractableとDecorationの区別。

### V4: New Area Visual Gate

廃工場 / 軍事施設 / 研究施設は、Gameplayだけ実装してGeneric Box Environmentのまま次Areaへ進まない。

各Areaで最低限:

- 固有Architecture
- 固有Prop language
- 固有Material / Lighting / Atmosphere
- 1〜3 Landmark
- Interactable readability
- Performance check

を満たす。

### V5: Mega Factory / Final Polish

- Mega FactoryでLOD / Culling / Shadow / Light / VFX Budgetを実測。
- Final Hero Machine / Autonomous Industrial Core visual。
- Rank 1 / Mid / Late / MegaのFactory成長差を確認。
- 各探索AreaのScreenshot Review。
- High / Flagship Visual Review Gate。

## 全Phase共通Gate

次Phaseへ進む前に最低限:

1. 主要Flowが最後まで通る。
2. Save / Reload後も成立。
3. 既存機能に重大Regressionなし。
4. Item loss / Save破損等の重大既知Bugなし。
5. 必要なTests / Validation成功。
6. Desktop Browserで実動作確認。
7. Requirements / SPEC / README / 実装の必要範囲が一致。
8. User-facing Visual変更を行った場合、主ViewportをBrowser / Screenshotで確認。
9. Visual強化でInteraction / Build / Directional Logisticsの読みやすさを悪化させていない。
10. 未確認事項を確認済みと偽らず記録。

# 崩してはいけない仕様

- 主役は「探索 → 加工 → 自動化 → 成長」。
- 戦闘中心FPSへ変更しない。
- 後半で探索を完全不要にしない。
- RankをCashだけで上げられるようにしない。
- 進行必須Itemを極端なRandom Dropだけに依存させない。
- 時間制限中心Extraction Gameへ変更しない。
- 複雑なPuzzle Gameへ変更しない。
- 未完成GameをPlayable表示しない。
- Save Schema変更時に旧Dataを無断破棄しない。
- Existing Factory Layoutを理由なく破壊しない。
- Existing Achievementを新Rank導入のために削除しない。
- Legacy Saveが既に使用している設備を理由なく再Lockしない。
- Directional ConveyorのVisual Arrowと実搬送方向を一致させる。
- Machine Input / OutputのVisualとRuntime方向を矛盾させない。
- Existing 2.5m Grid / Factory座標系を理由なく変更しない。
- 現行Scrap Yardを理由なくFactoryから分離した別Sceneへ変更しない。
- GitHub PagesのRepository subpathで動く相対Pathを維持する。
- 公開Fileへ秘密情報を置かない。
- Visual品質のためにGameplay Readability / 操作性 / Save互換性を犠牲にしない。
- License不明Asset / 永続依存するHotlink Assetを導入しない。
- Graphics Quality / LOD / VFX削減でSimulation結果を変更しない。
- 今回のBackpackはSlot制を維持し、重量制を無断で再導入しない。
- PC UpgradeをMain Progression必須Gateへ変更しない。
- HomeをFactory Automation / Factory Researchの代替Systemにしない。
- Home追加で既存Factory Building / Layoutを無断削除・移動しない。
- Secure CaseでMain Objective Item / Special Cargoを保護可能にして探索Riskを無効化しない。
- Tutorialのために通常Gameplay機能をLockしない。
- Tutorial ReplayでGame Stateを巻き戻さない。
- Home Fast Travelで探索の指定帰還Contractを回避させない。
- Home Cosmeticへ性能差を付けない。

# 完成条件

## Playable MVP

- HubからScrap Factoryへ入れる。
- Scrap Yardへ移動してScrap回収可能。
- 売却して設備代を稼げる。
- 設備を自由配置可能。
- Directional Conveyor経由でMachine間搬送が動く。
- 加工品販売がCashへ反映。
- Reload後にSave復元。
- JS / JSON / Local reference validation成功。
- Desktop Browser主要導線確認。
- Visual Quality Baseline確認。

## Long-term Main Clear

- Rank 1〜7進行が成立。
- 各Rankで探索 / 生産 / 物流 / 電力 / Research / 自動化が段階的に増える。
- 廃住宅街 / 廃工場 / 軍事施設 / 崩壊した研究施設へ進行可能。
- Factory成長が探索能力向上へつながる。
- 後半でも探索と自動化の両方に意味が残る。
- Droneが発見済み通常素材の反復回収を自動化可能。
- Rank 7から研究施設攻略 / 最終技術 / Mega Factoryまで到達可能。
- 最終製品の自動生産 + Mega Factory安定稼働でMain Clear可能。
- Clear後も同じSaveでFactory Optimization / Challenge等を継続可能。
- Legacy Save Migrationで既存Save / Achievement / Factory Layoutを無断破棄しない。
- Repository文書と現行実装が一致。
- 実測Performance / Browser Review / Visual Reviewの未確認事項を完成済みと偽らない。

## Home / Player Convenience / Tutorial Completion

最低限次をEnd-to-Endで確認する。

New Game:

```text
New Game
→ Home Bed付近から開始
→ PC / Door / Scrap Yard導線
→ Scrap回収
→ 手動売却
→ Build / Directional Conveyor
→ 最初の自動販売成功
→ Basic Tutorial Complete
→ Free Play
```

Home / PC:

- BedでSave / 回復可能。
- Home Respawn Contract成立。
- PCを開閉でき、通常Gameplayへ安全に戻れる。
- PC / Workbench / Storage操作中もFactory Simulationが継続。
- Home Storage / Workbenchの基本Flow成立。
- Home Storage UpgradeでItem lossなし。
- PC Upgradeが `条件確認 → 消費 → Unlock → Save` でAtomicに成立。
- Main Progression必須でなくOptionalに利用可能。

Player Convenience:

- Backpack I / II / IIIが既存Backpack Upgradeと二重化しない。
- Scanner PulseがPlayer操作を妨げず動作。
- Material Trackingした素材をScannerが優先表示。
- Quick Depositで除外対象 / 容量超過Itemを失わない。
- Loadout Presetで不足Itemを生成しない。
- Secure Caseの許可対象だけ探索失敗時に保持。
- Main Objective ItemをSecure Caseへ入れられない。
- Factory Network Link前後でPC Upgrade素材参照範囲が正しく変わる。

Tutorial / Diagnostics:

- Tutorial Objectives / Contextual Hint / Stuck Helpが段階的に動作。
- 既に条件達成済みの場合に不要なやり直しを要求しない。
- SkipしてもMain Progression可能。
- ReplayしてもRank / Inventory / Factoryを巻き戻さない。
- Tutorial報酬をReplayで再取得できない。
- PC / `O` Guideが同じTutorial Contentを参照。
- Next GoalでMain / Recommended / Optionalを混同しない。
- Machine / Logistics / Power / Drone等で停止原因と対処を確認可能。

Existing Save:

- Home追加後も現在位置を強制変更しない。
- Basic Tutorialを強制再実行しない。
- Existing Backpack容量を下げない。
- 取得済みBackpack Upgradeを再購入させない。
- Existing Factory Layout / Rank / Inventory / Main Clear / Achievementを維持。
- Home固定位置と既存Buildingの衝突で既存設備を削除しない。

## Visual Quality Completion

長期Visual完成では最低限次を満たす。

- BoxGeometry色違いだけの主要Machineを完成Assetとして残さない。
- MachineはSilhouette / Mechanism / Portで役割を判別可能。
- Materialが色だけでなくRoughness / Metalness / Wear等で区別される。
- Ground / Environmentが巨大な単一Plane / 単一Textureだけに見えない。
- Factory / Home / Scrap Yard / Residential / 廃工場 / 軍事施設 / 研究施設でArchitecture / Material / Lightingの差がある。
- Factory Rank進行でWorld上の成長を感じられる。
- HomeでもPC / Storage / Scanner機器等のProgressionをWorld上で感じられる。
- Interactable / Hazard / Directional LogisticsがDecorationに埋もれない。
- Shadow / Fog / VFX / Post Effectで視認性を大きく損なわない。
- Low / Medium / High / Performance ModeでVisual設定を調整可能。
- 通常 / 大Factory / Mega FactoryでPerformance目標を実測。
- Asset License / Attribution / Repository管理を確認。
- Browser / Screenshotで最低限次をReviewする。
  - Home Interior / Exterior
  - Rank 1 Factory
  - 中盤Factory
  - Mega Factory
  - Scrap Yard
  - 廃住宅街
  - 廃工場
  - 軍事施設
  - 崩壊した研究施設
  - 主要Machine近景
- High / Flagship Visual ReviewでBlocking Findingが残る場合、Visual完成扱いにしない。

# 制作段階で調整してよい項目

中心方針を変更しない範囲で実装 / Balance / Testing段階に調整可能:

- HP / Damage / Recovery具体値
- Ammo / Weapon Damage / Enemy HP
- 敵種類最終数 / 出現密度
- Rank選択目標の具体数値
- Legacy Saveから初期Progression Rankを算出する細かなMigration規則
- 各Recipe投入数 / 処理時間 / 売価
- Conveyor Throughput
- Generator発電量 / Machine消費電力
- Backpack I / II / IIIの具体Slot数
- Secure Case各段階のSlot数
- Home Storage各Tierの容量
- Scanner Range / Highlight時間 / Cooldown / 同時表示数
- PC Upgradeに必要なCash / 素材数
- Home Upgradeに必要なCash / 素材数
- Tutorial Stuck Helpの待ち時間
- PC Camera transition / Bed Fade等の短い演出時間
- Starter Suppliesの具体内容 / 数量
- Homeの正確な寸法 / 配置座標
- Home Cosmeticの最終種類数
- Drone Cargo / Speed / Range
- Resource Point供給量
- Order報酬額
- Factory Expansion Cost
- Main Clear用最終製品名
- 各Rank最終プレイ時間
- Benchmark PC / 最終Performance Hard Limit
- Audio Asset導入方法 / License方針
- Texture Resolutionの個別値
- Core / Area Asset容量Budget
- LOD切替距離
- Shadow distance / Shadow quality
- Realtime Light上限
- AO / Bloom / Fog具体方式
- Particle数 / VFX density
- Areaごとの正確なTime-of-Day / Exposure
- Material / Decal数
- Hero Asset detail量
- Visual Detail / Effect量

これらを調整する際も、確定済みの中心Loop、探索＋自動化、戦闘を主役にしない方針、Save互換性、Gameplay Readability、PC UpgradeのOptional性、Slot-based Backpackを変更しない。