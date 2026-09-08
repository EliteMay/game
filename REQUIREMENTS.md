# Requirements

## 要件定義ステータス

- Status: **Current Contract / UI・HUD要件未実装部分を含む**
- Updated: 2026-09-08
- 対象: Game Hub / Game 01 `Scrap Factory`
- このファイルは **現在も効いているProduct Contract / 未実装・未完了要件 / 今後も崩してはいけない仕様** を正本とする。
- 現在実装済みの技術仕様・Runtime・Save構造・Balance値・実装履歴は `SPEC.md` / `README.md` / `WORK_REPORT.md` を参照する。
- 実装済み内容を履歴としてこのファイルへ積み続けない。実装完了後も将来変更を禁止する恒久Contractだけは残す。

# 1. Product Core

## 目的

完成度の高いブラウザゲームを1本ずつ追加できるGame Hubを作る。

`Scrap Factory` は、探索と工場自動化の両方が最後まで必要になる **一人称3D Factory / Exploration Game** とする。

中心Loop:

```text
探索
→ スクラップ / 素材回収
→ Factoryへ帰還
→ 加工
→ Logistics / Automation
→ Factory成長
→ 新しい探索エリア / 技術解放
→ 再び探索
```

## 利用者 / 公開

- 主利用者: Repository Owner本人
- 公開形態: Public GitHub Repository / GitHub Pages
- Primary Device: Desktop / Keyboard + Mouse

## Core Experience

- 主役は `探索 → 加工 → 自動化 → 成長`。
- FactoryはPlayer自身が歩き、見て、建て、問題を直す3D空間として扱う。
- 探索で新しい素材・技術・場所を発見し、Factoryで反復作業を自動化する。
- 戦闘は一部探索Areaの危険要素であり、Combat FPSを主役にしない。
- 後半でも探索を完全不要にしない。

## Non-goals

- 時間制限中心のExtraction Gameにしない。
- 複雑なPuzzle Gameにしない。
- Factoryを全自動設計 / 全自動建設するGameにしない。
- 完全Random Map生成を主要Systemにしない。
- Login streak / Daily必須型Gameにしない。
- House Buildingを主要Systemにしない。

# 2. Current Baseline / Requirements Boundary

現在の実装は `Rank 1 → 7 → Main Clear → Post Clear Factory Optimization` まで通常Gameplayへ接続済み。詳細な現行挙動・数値・Runtimeは `README.md` / `SPEC.md` をSource of Truthとする。

そのため、このファイルでは次の詳細な実装済み内容を重複保持しない。

- 各Rankの個別実装手順 / 解放済み機能一覧
- 現在のRecipe数値 / Drone Cycle / Power値等
- 実装済みHome / Scanner / Storage / Tutorialの細かなRuntime
- Phase 0〜7の実装履歴
- Phase別に作成したFile / Module一覧
- 完了済みVisual / Performance作業履歴

現在このファイルで主に残すもの:

1. Product Core
2. 今後も崩してはいけないGameplay / Save / Progression Contract
3. 未実装または再設計対象のUI / HUD Contract
4. Visual / Accessibility / Performanceの継続要件
5. 実機・Actual Playtest等の未完了Validation

# 3. Progression Contract

## Rank

- Progression Rankは **1〜7**。
- Rank 8は追加しない。
- Rank 7到達はMain ClearではなくFinal Chapter開始点。
- Cash / Lifetime RevenueだけでRank Upできる設計にはしない。
- Rank進行では探索・加工・物流・電力・自動化等の実Gameplayを要求する。

## Rank 7 → Main Clear Contract

今後の変更でも、最終進行の意味は次を維持する。

1. Robotics Lab攻略
2. Materials Lab攻略
3. Energy Lab攻略
4. 各区画の技術 / 特殊部品をFactoryへ持ち帰る
5. Factoryで最終部品を製造する
6. Central Coreを攻略する
7. Experimental TechnologyをResearchする
8. 最終製品の完全自動Lineを成立させる
9. Mega Factoryを一定時間安定稼働させる
10. Main Clear

- Main Clear後も同じSaveでFactory Optimizationを継続可能にする。
- Main Clear済み履歴をFactory再構築だけで取り消さない。
- Post Clear拡張のためにRank 8や専用必須通貨を追加しない。

# 4. World / Exploration Contract

## Factory / Scrap Yard

- Factoryは常設メイン拠点。
- Scrap YardはFactoryに隣接する同一World側の基本探索Areaとして維持する。
- 既存Factory座標系 / Build Gridの中心を理由なく変更しない。

## Independent Exploration Areas

廃住宅街以降の独立探索AreaはTransport Terminal等の正式な出発Flowを使う。

- Menuから即Factoryへ帰還する方式にしない。
- 探索中Home Fast Travelで帰還Contractを回避しない。
- Main Objective / Progression Itemを低確率Random Dropだけに依存させない。
- Playerが新しいArea / Resource / Blueprintを自分で発見する意味を残す。

## Drone

Droneは **発見済み通常資源の反復回収 / Logistics自動化** を担当する。

Droneだけでは次を行わない。

- 未発見Areaの攻略
- 新Resource Pointの発見
- Main Progression Item / Key Itemの新規取得
- Blueprint / Research Dataの新規発見
- 最終探索攻略

# 5. Build / Logistics / Factory Contract

## Build

- 既存 **2.5m Grid** を維持する。
- Player-built設備のSafe Dismantle / Item保護を維持する。
- 建築 / Move / Rotate / DismantleでBuffer ItemやSaveを無断消失させない。
- Factory StorageからConstruction Costを参照できる既存方向性を壊さない。

## Directional Logistics

- ConveyorのVisual Arrowと実搬送方向を必ず一致させる。
- Machine Input / OutputのVisualとRuntime方向を一致させる。
- Back Pressure / Storage FullでItemを消失させない。
- Splitter / Merger / Priority / Overflow等を変更する場合もDirection Contractを維持する。

## Factory Management

- 大Factoryで `停止中` だけを表示せず、可能な限り停止理由を確認可能にする。
- Power / Input / Output / Storage / Conveyor / Drone等の原因をRuntime Ruleから導出する。
- Tutorial専用の別判定とRuntime Diagnosisを矛盾させない。

# 6. Home / Player Convenience Contract

HomeはFactory横の **Player / Exploration準備拠点** とし、Factory Automation / Factory Researchの代替にしない。

Homeの役割:

- Save / Recovery
- Player Upgrade
- Personal / Exploration Storage
- Exploration準備
- Tutorial Library / Player Guide

維持するContract:

- PC UpgradeをMain Progression必須Gateにしない。
- Home追加 / 変更で既存Factory BuildingやLayoutを無断削除・移動しない。
- Home StorageをFactory Conveyor Logisticsへ直接統合しない。
- Slot-based Backpackを維持し、重量制を無断で再導入しない。
- Secure CaseでMain Objective Item等を保護可能にして探索Riskを無効化しない。
- Home Cosmeticへ性能差を付けない。
- PC / Workbench / Storage UI操作中も、通常Pause Contractでない限りFactory Simulationを不必要に停止しない。

# 7. Save / Compatibility Contract

Saveの具体Schema / Key / Runtime構造は `SPEC.md` を正本とする。

今後の変更で必ず守ること:

- 既存Saveを無断破棄しない。
- Save初期化をMigration代わりにしない。
- Existing Factory Layout / Inventory / Progression Rank / Main Clear / Achievementを理由なく失わせない。
- Existing Saveが利用済みの設備・機能を理由なく再Lockしない。
- Schema変更が必要ならMigration / Backup / Rollback可能性を先に設計する。
- 容易に再計算できるFactory Summaryを第二のSource of Truthとして重複保存しない。
- Rendering / Graphics設定でProduction / Throughput / Power / Drone等のSimulation結果を変更しない。

# 8. UI / HUD Requirements

この章は現在の **Meaningful UI Redesign Contract**。実装済みと扱わず、実装後にCurrent UI / `SPEC.md` と照合して整理する。

## UI Design Principle

UI全体は **World-first + Diagnostic-on-demand** を基本とする。

情報密度:

```text
通常Gameplay
< Interaction / Build
< Factory Diagnostic Overlay
< Full Management Panel
```

原則:

- 3D Worldを主役にする。
- 通常HUDをDashboardのように埋めない。
- Player Intentが発生したときだけ情報量を増やす。
- Visual Priorityは `3D World > Gameplay Information > UI Decoration`。
- 状態だけでなく、必要なら原因 / 不足 / 対処まで確認可能にする。
- 現行UIを全面破棄するGreenfield Redesignではなく、既存機能を整理して段階的に統合する。

## Normal HUD

通常時に残す:

- Crosshair
- Main Goal
- 必要時のHP等、即時判断に必要なPlayer State
- Backpack満杯付近 / Item取得不可等、必要時だけ容量情報
- Optional Trackingを有効にした場合だけ追跡情報
- Settingsで有効なHOME Marker等のWorld Navigation補助

通常時に常時表示しない:

- Cash
- Lifetime Revenue
- Zone名
- Factory全体Power / Production / Storage / Drone Statistics
- WASD等のStatic Shortcut Bar
- BUILD / PACK / DISMANTLE / GUIDE / MENU等の常時操作ボタン列

Cash / Revenue / Zone等は、必要な画面やイベント時に確認できればよい。

## Main Goal

- 画面端へ小さく固定し、通常は1〜2行程度。
- Main GoalをOptional Goalより常に優先する。
- Objective更新時だけ一時展開し、その後通常サイズへ戻す。
- 詳しい「やり方」は `O` Guide / PC Tutorial Libraryへ分離する。
- Optional Goalは1つだけPin可能とし、Main Goalと同じ視覚強度にしない。

## Interaction Prompt

構造:

```text
Target Name
Primary Action + Key
必要時のみ Status / Reason
```

原則:

- Crosshair付近または少し下。
- 見ている対象だけ表示し、視線を外したら速やかに消す。
- Primary Actionは原則1つを強く見せる。
- 詳細StatisticsはMachine Panelへ分離する。
- Action不可の理由が重要なら隠さない。

## Inventory / Backpack

通常Inventoryは **Backpack + Hand Craft** を中心にする。

Backpack:

- Slot Grid
- Item icon / Name / Quantity
- 選択Item詳細
- 使用Slot / 最大Slot

Hand Craft:

- Recipe
- 必要素材 / 所持数
- Craft可否
- 不足理由

InventoryへFactory全体Statisticsや長いTutorial本文を混ぜない。

Storage操作時はBackpackとの2ペインUIを許容し、Shift + Click / Move All等の高速操作を提供してよい。容量超過や保護Itemを勝手に捨てない。

## Build Mode

Build Modeは **3D Placement Previewが中心**。

確認可能にする:

- Building / Machine名
- Cost / 必要素材
- 設置可否
- Invalid理由
- 向き
- Input / Output
- Conveyor方向
- Snap Point
- Build中だけ必要な操作

原則:

- 設置不可は色だけでなく理由も示す。
- Conveyor Direction / Machine Portを設置前に判断可能にする。
- Quick Build / 1〜5等はBuild Mode中だけ表示する。
- Build SelectorはProduction / Logistics / Power等で探しやすくする。
- 一度設備を選んだら大型Panelより3D Placementを優先する。
- Dismantle情報もDismantle Mode中だけ表示する。

## Factory Diagnostic Overlay

通常HUDへ工場状態を大量表示せず、必要時に3D World上で問題を探せるOverlayを使う。

候補:

- Running / Idle / Blocked / Error
- Input不足
- Output Full / Back Pressure
- Power不足
- Recipe未設定
- Conveyor Direction / Flow
- Machine Input / Output
- Storage Full
- Drone Route異常

原則:

- 正常状態は控えめ、Warning / Criticalほど強くする。
- 色だけに依存せずIcon + Text + Colorを使う。
- Critical IssueはOverlay外でも通知可能。
- Overlayは **問題を探す** ためのSurfaceとし、細かな設定はMachine / Management Panelへ分離する。

## Machine Panel

Machine単体の操作は読みやすいScreen-space Panelを基本とする。

役割:

- Machine Name / Recipe / Status
- Input / Output Buffer
- 稼働 / 停止理由
- 必要なMachine Action

3D Object上の小さなButtonだけを主要操作にしない。Machine PanelへFactory全体Statisticsを混ぜない。

## Factory / Automation Management

Factory Managementは工場全体を分析する高密度画面とする。

情報階層:

```text
Overview
→ Problems / Flow
→ Detail
```

主要情報候補:

- Running / Stopped Machine数
- Production Summary
- Power Supply / Demand
- Storage / Logistics
- Drone / Automation
- Critical / Warning Problems
- 必要時のCash / Revenue

Section候補:

- Overview
- Production / Machines
- Power
- Logistics / Storage
- Automation / Drone
- Problems / Alerts
- Orders / Planner

同種Alertは集約し、Problemから対象設備や原因を確認可能にする。大量GraphよりFlow / Bottleneck / Causeを優先する。

## PC / Home UI

PCは **Player / Home Management Terminal**。Factory Managementを置き換えない。

PCで扱う:

- Player Upgrade
- Home
- Personal Storage
- Material Tracking
- Tutorial Library
- Player Progress / Goal補助

必要ならFactoryの読み取り専用Summaryを表示してよいが、Power / Drone / Production管理の正式操作Surfaceにはしない。

PC Interaction:

- `E` で開始
- Player移動停止
- CameraをMonitorへ短く寄せる程度
- 大きな2D UIをMouseで操作
- `Esc` で通常Gameplayへ戻る

小さな3D Monitor上だけで複雑なUI操作を要求しない。

## Tutorial / Guide

- `O` Guide = World内ですぐ確認する軽量Guide。
- PC Tutorial Library = Homeで詳しく読むManual。
- 両方とも同じTutorial Content Sourceを参照する。

`O` Guideでは次を中心にする。

- Current Main Goal
- 今必要な操作
- Contextual Tutorial
- 基本Controls
- よくある問題への短い回答

長いManualはPCへ分離する。

Main GoalとTutorialの役割を混同しない。

```text
Main Goal = 何を達成するか
Tutorial  = どうやるか
```

## Notifications / Alerts

通知は意味で分ける。

1. 軽い通知 — Item取得 / Unlock / 小進捗
2. Warning — Backpack残量 / Storage / Factory Problem
3. Critical — Power Failure / Main Production Stop等

原則:

- 連続する同種通知は集約する。
- 同じ原因で複数Machineが止まる場合はMachineごとのSpamにしない。
- Interaction ErrorはInteraction付近、Build ErrorはBuild UI内等、意味と表示場所を一致させる。

## Pause / Settings

Pause Menuは簡潔にする。

- Resumeを最優先
- Settings
- Guide
- Save
- Game Hubへ戻る

探索中の即時 `Return to Factory / Home` は置かない。

Settingsカテゴリ候補:

- Gameplay
- Graphics
- Audio
- Controls
- Accessibility

Performance Modeは描画負荷のみを下げ、Factory Simulation結果を変更しない。

# 9. UI Visual Language

既存Visual Direction **Stylized Industrial Realism** を維持する。

UIは派手なSF装飾ではなく **実用的なIndustrial Terminal / Control Panel** の読みやすさを優先する。

## Panel / Component

避ける:

- 強いGlow
- 大量Gradient
- Glassmorphism中心
- 極端に丸いCard
- Cardの中へCardを大量配置
- 常時Pulse / 常時光るBorder

優先:

- Dark neutral background
- Small radius
- Thin border
- Line / spacingでSection分離
- Table / List / Inspector等、情報に合った構造

## Color

色はDecorative Brand Colorではなく状態の意味を持たせる。

- Industrial Yellow: Active / Build Direction / Conveyor Direction / Primary Action
- Green: Success / Running
- Amber: Warning
- Red: Error / Critical
- Muted Blue: Information

色だけで状態を伝えない。

## Typography

- 小さい英字Label: `POWER` / `INPUT` / `OUTPUT` / `STATUS` 等
- Playerが判断する本文 / Error / Goalは日本語を優先
- 雰囲気のためだけに英語を大量使用しない
- Heading / Value / DescriptionのHierarchyを明確にする

## Animation

使う:

- Panel Open / Close
- Objective Update
- Warning
- Button Feedback
- Build Preview

避ける:

- 無意味な常時Animation
- 画面全体を覆う派手なTransition
- 読み取りを妨げる数字Animation

# 10. Accessibility / Controls

最低限:

- Mouse Sensitivity
- FOV
- Key Bind
- HUD Scale
- Text Size
- Crosshair調整
- Reduce Motion
- Screen Shake調整
- Tutorial / Context Hint設定
- HOME Marker設定
- 色だけに情報を依存しない
- 重要情報を音だけに依存しない

Factory Error / Overlayでは `Icon + Text + Color` を基本とする。

BrowserではPointer Lockによる相対Mouse Inputを基本とし、OS Level Raw Inputを保証要件にしない。

# 11. Visual / Rendering Contract

3D Worldの長期Visual Directionは **Stylized Industrial Realism**。

- AAA Photo-realismを目標にしない。
- Machine / Logistics / Interactable / Hazard / RouteのReadabilityを優先する。
- Machineは色だけでなくSilhouette / Input / Output / Mechanismで役割を判別可能にする。
- Running / Idle / Blocked / Power Shortage等のVisual StateとRuntime Stateを矛盾させない。
- Decorative detailのためにCollision / Path / Build readabilityを悪化させない。
- Direct referenceのAsset / UIをコピーせず、同種Gameから構造原理を参考にする。
- License不明Asset / 永続Hotlink Assetを導入しない。
- Graphics Quality / LOD / Shadow / VFX削減でSimulation結果を変えない。

Phase 7までに適用済みの具体的Material / LOD / VFX / Asset実装値は `SPEC.md` / `WORK_REPORT.md` に置き、このファイルへ重複保持しない。

# 12. Performance / Reliability

Soft Target:

- 通常プレイ: 60 FPS
- 大規模 / Mega Factory: 45 FPS程度
- 30 FPS未満が常態化する状態は完成扱いにしない方向

実測なしでHard Limitを固定しない。

維持する原則:

- Production / Logistics SimulationとRenderingを分離する。
- 遠距離Visual簡略化でFactory結果を変えない。
- Offscreen /別SceneのVisualを不必要にFull Updateしない。
- 大量Objectは共有Material / Instancing / LOD等を利用可能。
- Performance Modeは描画のみを軽量化する。

# 13. Remaining Validation

現行実装について、次はStatic CIだけで確認済み扱いにしない。

- 実GPU / 実機でMega Factory 45 FPS目安
- Firefox / Chromiumでの実Pointer Lock
- Build Preview / Placement ergonomics
- Collider / First-person movementの実操作
- UI Overlayの実Viewport Layout
- 180秒安定稼働 / Final production BalanceのActual Playtest

今回のUI / HUD要件を実装した場合は、上記に加えて代表ViewportのScreenshot / Browser Reviewを必須とする。

# 14. UI / HUD Completion Contract

今回のUI要件は、Codeを書いた時点では完成扱いにしない。

最低限:

1. Normal HUDがWorld-first方針になっている。
2. Cash / Revenue / Zone / Static Shortcutの常時表示が必要Contextへ移動している。
3. Main Goal / Optional GoalのPriorityが明確。
4. Interaction Promptで対象 / Action / Reasonを即読できる。
5. Inventory / Storageで主要操作が完結する。
6. Build PreviewでDirection / Input / Output / Invalid Reasonを判断できる。
7. Factory Diagnostic Overlayで問題位置 / 原因を探せる。
8. Machine Panel / Factory Managementの責務が混ざっていない。
9. PC / Home UIがFactory Managementを置き換えていない。
10. Tutorial / Guide / NotificationsがSpamになっていない。
11. Error / Stateが色だけに依存していない。
12. HUD Scale / Text Size / Reduce Motion等の関連設定が機能する。
13. Existing Save / Directional Logistics / Build Grid / Factory SimulationにRegressionがない。
14. Desktop BrowserでPointer Lockを含む主要Flowを実操作確認する。
15. 主要ViewportをScreenshotで確認する。
16. 必要なTests / Validationが成功する。
17. `REQUIREMENTS.md` / `SPEC.md` / `README.md` / 実装の役割と内容が一致する。

実装完了後、UIの細かな実装済みRuntime仕様は `SPEC.md` へ移し、`REQUIREMENTS.md` には将来も守るUI Contractだけを残してよい。

# 15. 崩してはいけない仕様

- 主役は `探索 → 加工 → 自動化 → 成長`。
- 戦闘中心FPSへ変更しない。
- 後半で探索を完全不要にしない。
- Rankは1〜7。Rank 8を追加しない。
- RankをCashだけで上げられるようにしない。
- Progression Itemを極端なRandom Dropだけに依存させない。
- 時間制限中心Extraction Gameへ変更しない。
- Save Schema変更時に旧Dataを無断破棄しない。
- Existing Factory Layout / Achievement / Rank / Main Clearを理由なく破壊しない。
- Directional ConveyorのVisual Arrowと実搬送方向を一致させる。
- Machine Input / OutputのVisualとRuntime方向を矛盾させない。
- Existing 2.5m Grid / Factory座標系を理由なく変更しない。
- 現行Scrap Yardを理由なくFactoryから分離した別Sceneへ変更しない。
- GitHub PagesのRepository subpathで動く相対Pathを維持する。
- 公開Fileへ秘密情報を置かない。
- Visual品質のためにGameplay Readability / 操作性 / Save互換性を犠牲にしない。
- License不明Asset / 永続依存するHotlink Assetを導入しない。
- Graphics Quality / Performance ModeでSimulation結果を変更しない。
- Slot-based Backpackを重量制へ無断変更しない。
- PC UpgradeをMain Progression必須Gateへ変更しない。
- HomeをFactory Automation / Researchの代替Systemにしない。
- Secure CaseでMain Objective Itemを保護して探索Riskを無効化しない。
- Tutorialのために通常Gameplay機能をLockしない。
- Tutorial ReplayでGame Stateを巻き戻さない。
- Home Fast Travelで探索の指定帰還Contractを回避させない。
- Home Cosmeticへ性能差を付けない。

# 16. 調整してよい項目

中心方針を変えない範囲で実装 / Balance / Playtest段階に調整可能:

- HP / Damage / Enemy Balance
- Recipe投入数 / 処理時間 / 売価
- Conveyor Throughput
- Power発電 / 消費具体値
- Backpack / Secure Case / Storage容量
- Scanner Range / Cooldown
- Drone Cargo / Speed / Cycle
- Post Clear Objective数値
- Main Clear安定稼働時間のBalance
- Benchmark PC / Performance Hard Limit
- UIの正確なpx / spacing / panel幅 / font size
- Build / Overlayの最終Key Bind
- UI Accentの具体Color値
- Animation時間
- Notification表示秒数 / 集約Window
- Home / PCの短いCamera transition
- Graphics presetの個別値

これらを調整しても、Product Core、Save互換性、Rank 1〜7、Directional Logistics、2.5m Grid、探索 + 自動化、World-first UI方針を変更しない。
