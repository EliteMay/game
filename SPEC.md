# Specification

## 1. Hub Architecture

```text
Hub UI
└─ shared save adapter
   └─ localStorage: elitemay-game-hub-v1

Game: Scrap Factory
├─ config.js             : Item / Recipe / Building / Tutorial definitions
├─ logistics.js          : Directional conveyor routing / rotation helpers
├─ progression.js        : Progression Rank / Research / Legacy inference pure logic
├─ progression-ui.js     : Rank HUD / Research panel / unlock guards
├─ progression.css       : Progression UI styles
├─ storage.js            : Save parse / normalize / backup / export-import
├─ factory-management.js : Factory analysis / challenge / planner logic + progression UI entry
├─ feature-pack.js       : Factory Management browser integration / quick-build
├─ visual-kit.js         : Procedural texture / material / primitive helpers
├─ industrial-art.js     : Environment art / machine visual composition
├─ world.js              : Three.js scene / FPS movement / raycast / build placement
├─ world-runtime.js      : Runtime visual corrections + live building rotation
└─ game.js               : Economy / inventory / machine process / transport / UI controller
```

`index.html`のImport Mapで`./world.js`を`./world-runtime.js`へ解決する。`world-runtime.js`は既存Worldを継承し、Save / Economy / Production contractを変更せずRuntime visual correctionと設置済みConveyorのVisual rotationを担当する。

Progression UIは`factory-management.js`から読み込む。既存`game.js`の生産・物流Loopを置換せず、Rank / ResearchのPure LogicとUIを別Moduleに分離する。

## 2. Save Contract

Root:

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "updatedAt": "ISO-8601",
  "profile": {},
  "games": {
    "scrap-factory": {}
  }
}
```

Scrap Factory主要Data:

- `money`
- `lifetimeRevenue`
- `inventory`
- `buildings[]`
- `tutorialStep`
- `tutorialStats`
- `progression`
- `player`
- `settings`
- `discoveredItems`
- `playTimeSeconds`

Progression Data:

```json
{
  "version": 1,
  "progressionRank": 1,
  "researchData": 0,
  "blueprints": [],
  "completedResearch": [],
  "unlocks": [],
  "legacyUnlocks": [],
  "legacyMigrated": false,
  "history": []
}
```

- Root Save Schema Versionは`1`のまま維持する。
- `progression.version`をProgression内部のVersionとして持つ。
- `progressionRank`は1〜7を保存可能にし、Phase 1で実動作するRank Upは1→2→3まで。
- Building IDは表示名や配列Indexから分離した永続ID。
- 旧Saveに`progression`がない場合は現行Factoryの使用Evidenceから最低Rank / Legacy Unlockを推定する。
- Legacy Saveで既にSmelter / Storageを使用していればRank 2相当を補完する。
- Directional Iron Lineが既に成立しているLegacy SaveはRank 3相当まで推定可能。
- 既に鉄板 / 工具セットCraftを使用したEvidenceがあれば`basic_fabrication`を完了扱いにし、旧機能を失わせない。
- Existing AchievementはProgression Rankへ変換せず保持する。

Visual Foundation V2 / Runtime Visual Fix / Directional Conveyor & UX UpdateではSave Schemaを変更しない。旧Saveはnormalizeし、新しい`settings.showShortcuts`は既定値`true`で補完する。Phase 1 ProgressionでもRoot Schema Versionは変更しない。

## 3. World

### Factory Base

- 中心: `(0, 0)`
- Build可能範囲: `x/z ±20m`
- Grid: `2.5m`
- Starter Hopper: `(-5, 0)`
- Starter Seller: `(7.5, 0)`
- 周辺にFence / Workshop / Awning / Floodlight / Gateを配置
- Static sceneryと重なる位置はBuild PreviewをInvalidにする
- Chain-link visual panelは支柱と同じ基準線へ揃える。ColliderとVisualの向きを一致させる

### Scrap Yard

- Factory Gate東側
- Scrapは複数種をProcedural配置
- 回収後22〜38秒で同地点へRespawn
- Container / Scrap pile / Tire / Barrel / Cable spool / Crushed car / CraneをEnvironment Propとして配置
- Collectible ScrapはStatic Collider内を避けてSpawn
- Collectibleは実GeometryのBounding Box最低点を基準に地面へ接地する

### Distant Background

- Silo
- Chimney
- Pipe bridge
- Industrial building silhouettes

近景だけで世界が終了して見えないよう、操作範囲外にも工業地帯の遠景を持つ。

## 4. Items

Raw:

- 鉄くず
- 銅線
- 廃プラスチック
- 電子ジャンク

Processed:

- 破砕金属
- 鉄インゴット

Products:

- 鉄板
- ケーブル束
- 工具セット

素材のままでも売れるが、加工・クラフトほど単価が上がる。

## 5. Production

```text
鉄くず
↓ Crusher / 2.2s
破砕金属
↓ Smelter / 3.0s
鉄インゴット
↓ Hand Craft
鉄板 / 工具セット
```

Machine Panelでは用途説明、Recipe Input / Output、処理時間、Bufferを表示する。

Phase 1では新規Saveの鉄板Hand Craftを`Basic Fabrication` Researchで解放する。Legacy Saveで既に鉄板 / 工具セットCraftを使用したEvidenceがある場合は互換性のためResearch済み扱いにする。

## 6. Directional Conveyor Contract

### Core

- Conveyorは2.5m Grid Cell単位。
- Conveyorの`rotation`が実際の搬送方向を決定する。
- Visual上の黄色い矢印と物流方向を一致させる。
- Rotation mapping:
  - `0` → 東 `→`
  - `π/2` → 北 `↑`
  - `π` → 西 `←`
  - `3π/2` → 南 `↓`
- Source Machineから最初のConveyorへ搬送するとき、そのConveyorのInput側がSource Cellへ接していなければならない。
- 途中のConveyorは現在Cellへどの方向から入ってもよいが、次の搬送先はそのConveyorの矢印方向1Cellのみ。
- Conveyorの出力CellがMachineなら、そのMachineがItemを受け入れる場合のみ搬送する。
- 搬送時は3D Packetを実際のDirectional Pathに沿ってAnimationする。

これにより、CrusherのInput側にある逆向きConveyorへ完成品が逆走することを防ぐ。

### Editing

- Build中は`R`で90°回転。
- 設置済みConveyorを見て`E`で設定Panelを開く。
- `右へ90°回転`で`+π/2`。
- `向きを反転`で`+π`。
- 回転はSaveへ即時反映し、World MeshもReloadなしで回転する。
- Direction変更後はTutorialのAutomation判定も再計算する。

### Regression

`scripts/logistics.test.mjs`で最低限次を確認する。

- 4方向Rotation mapping。
- 直進→曲がりのDirectional Path。
- Sourceへ向いた逆向きConveyorからItemを引き出さない。

Progression Rankの必須自動Line判定も同じDirectional Route helperを利用し、Visual-onlyなLineを達成扱いしない。

## 7. Interaction / Controls

- Center Raycast
- 対象を見ている間はWorld側に小さいInteraction Markerを表示
- `E`: Scrap回収 / Machine操作 / Conveyor設定
- `B`: Build menu
- Build中: Left Click設置 / `R` 90°回転 / Right Click or `Esc`終了
- `F`: Dismantle Mode ON / OFF
- Dismantle中: Player-built設備を狙ってLeft Clickで撤去
- `Tab`: Backpack + Hand Craft
- `O`: Field Manual / Codex
- `P`: Factory Management
- HUD `RANK`: Progression / Research Panel
- `Esc`: Pause / mode cancel
- Walk時は軽いHead Bob、Sprint時は小さいFOV変化を付ける

### Dismantle Safety

- Player-built設備は建築費100%返金。
- 設備`input` / `output`内のItemもInventoryへ返却する。
- 返却ItemがInventoryへ収まらない場合、Item loss防止のため撤去を拒否する。
- Starter Hopper / Starter Sellerは`permanent`のため撤去不可。

## 8. Tutorial / Initial Contract

1. Scrap Yardへ移動
2. Scrap 5個回収
3. Baseへ戻る
4. 累計$80売却
5. Crusher設置
6. Crusherで加工
7. Hopper → Conveyor → Crusher → Conveyor → SellerのDirectional Line成立
8. 累計売上$250

各Stepは「何をするか」だけでなく「どのKeyを使うか / 何が成功条件か」まで表示する。

達成後はFree Playへ移る。Progression RankはTutorialを削除せず、その後の中長期目標として追加する。

## 9. Visual Direction

### Target Type

- Primary Task: 一人称で回収し、拠点で工場を組み上げる
- Content Model: 3D Canvas + HUD / Game Launcher Library
- Audience: Owner本人 / PC gamer
- Density: Hub=Medium/High, Game HUD=Low/Contextual
- Tone: Industrial / technical / playful
- Visual Ambition: High（Steam掲載相当を目標。ただし実際の配信は目的外）

### Domain Research

- Satisfactory: First-person Factory Buildingに探索・自動化を組み合わせる構造
  - https://www.satisfactorygame.com/
- Satisfactory Official Wiki / Conveyor Belts
  - https://satisfactory.wiki.gg/wiki/Conveyor_Belts
  - Building portでInput / Outputを視覚的に区別し、Belt DirectionをGameplay Contractとして扱う
- Satisfactory Official Wiki / Build Gun
  - https://satisfactory.wiki.gg/wiki/Build_Gun
  - Dismantle Mode、Build Hologram、Guideline、Quick interactionを確認
- Satisfactory Official Wiki / HUD
  - https://satisfactory.wiki.gg/wiki/HUD
  - 常時ShortcutとContextual shortcutを分けて表示する構成を確認
- Satisfactory Official Wiki / Onboarding・Controls
  - https://satisfactory.wiki.gg/wiki/Onboarding
  - https://satisfactory.wiki.gg/wiki/Controls
  - Codex / Onboarding / Key promptを通常Gameplayと分離して参照可能にする構造を確認
- Factorio Wiki / Tutorial / Quick Panel
  - https://wiki.factorio.com/tutorial
  - https://wiki.factorio.com/Quick_panel
  - Goal-driven tutorialとTips / information panelを別に持つ構造を確認

Referenceの見た目・Asset・固有UIをコピーせず、Task structure / feedback / discoverabilityだけをTransferする。

### Observed Conventions

- 大型MachineはMain bodyだけでなくFrame / Motor / Pipe / Guard / Status partsでSilhouetteを作る
- 地面は単色面ではなく、Lane / Dirt / Oil / Crack等が距離感と用途を作る
- Yardは単一種類のPropを散らすのでなく、Container / Tire / Barrel / Vehicle / Scrap pile等を混在させる
- Play area外のSilo / Chimney / BuildingがWorld scaleを補う
- Factory gameのLogisticsは見た目のDirectionと内部Directionを一致させる
- Common shortcutとMode-specific shortcutをUI上で分離する
- Tutorial objectiveとは別に、後から読み返せるGuide / Codexを持つ

### Transfer

- Game: Canvasを主役にし、HUDは常時情報を絞る
- Factory: Machineごとに用途が分かるSilhouetteを作る
- Environment: Near / Mid / Farの3層で情報量を持つ
- Logistics: Arrow / Direction表示をDecorationではなくActual transport ruleへ接続する
- UX: Static Shortcut + Contextual Hint + Codexの3層に分ける
- Hub: Library / Progress / Statusを前面へ置く

### Rebuild

- Scrap / industrial safety markingをIdentityにする
- 暗すぎるPost-apocalypseではなく、明るい空 + 錆・Concrete + Safety Yellow
- 外部Assetを直接コピーせず、Procedural TextureとPrimitive Compositionで独自に再構成する

### Avoid

- Glass / Neon / Gradientを大量に重ねたGeneric Game UI
- 大きなLanding Page HeroだけでLibraryが下へ追いやられる構造
- 未完成GameをPlayableに見せるCard
- BoxGeometryを色違いで並べるだけのMachine / Background
- Reference GameのAsset / Layout / Color schemeの直接コピー
- Visual Arrowと実際の物流方向が一致しない状態
- 主要操作を説明なしで隠す状態

## 10. Visual Foundation V2

### Procedural Surface

Runtime Canvasで次を生成する。

- Concrete noise / crack / oil stain
- Dirt / gravel variation
- Corrugated metal + light rust
- Hazard stripe
- Chain-link alpha texture
- Industrial labels
- Soft cloud texture

外部Texture fileを追加せず、Repository sizeとLicense Riskを抑える。

### Environment Composition

```text
Near
- Machine
- Collectible Scrap
- Barrel / Tire / Spool

Mid
- Workshop
- Fence / Gate
- Container / Scrap pile / Vehicle
- Crane

Far
- Silo
- Chimney
- Pipe bridge
- Factory silhouette
- Sky / Fog
```

### Machine Visual Contract

- Hopper: Funnel + frame + discharge section
- Seller: Terminal body + screen + bollards
- Crusher: Twin rollers + motor + chute + frame
- Smelter: Furnace body + rings + chimney + glowing door + pipe
- Conveyor: Belt + rollers + side rails + support legs + yellow direction arrows
- Storage: Corrugated container + frame + door detail

同じ`BUILDINGS` / Save ID / Collision Gridを維持し、見た目だけを差し替え可能にする。

## 11. Runtime Visual Fix Contract

- Fence panel visualは既存Colliderと同じFence segmentへ整列させる
- Fence mesh texture repeatは実長に合わせて密度を保つ
- Alpha-tested Fence panelはShadow castを無効化し、支柱Shadowのみ残す
- Collectible ScrapはSpawn / Respawnごとに`THREE.Box3`で最低Yを算出し地面へ接地する
- Save Schema / Building placement / Economy / Tutorial contractは変更しない

## 12. Gameplay UX Contract

### Shortcut Layers

1. **Static Shortcut Bar**
   - `WASD` / `Shift` / `E` / `F` / `O`
   - Settingsから非表示可能
2. **Contextual Hint**
   - Build Mode: placement / rotation / cancel / current direction
   - Dismantle Mode: target / click / refund / exit
   - Raycast prompt: Scrap / Machine / Conveyor direction
3. **Field Manual / Codex**
   - `O`でいつでも開く
   - Game loop / Controls / Conveyor / Production / Dismantle / Starter lineを掲載
4. **Progression HUD**
   - 右上に現在Rank / Research Data状態を表示
   - クリックでRank Goal / Research Panel
   - Detailed factory statisticsはFactory Managementへ残す

### Machine Panel

- Descriptionを常時表示
- RecipeはInput → Output → Secondsとして表示
- ConveyorはBuffer UIを隠し、Direction + Rotate / Reverseを前面に出す
- Removalは100% refundと安全なBuffer returnを表示

## 13. Dependencies

Three.js `0.185.0`をjsDelivrからES Moduleとして読み込む。

CDN障害時は3D Gameは起動できない。HubとSave DataはThree.jsに依存しない。

## 14. Known Limits

- Mobile Touch FPS操作なし（Desktop primary）
- Phase 1 ProgressionはRank 1 → 2 → 3まで。Rank 4以降は未実装
- Blueprint必須Researchの取得元となる独立探索AreaはPhase 3以降
- Conveyor Splitter / Merger専用設備は未実装。現状は1 Conveyor = 1 output direction
- Conveyor speed tier / throughput bottleneckは未実装
- Enemy / Weapon / HealthはMVP後
- 外部3D Model / Image Textureなし。現状はProcedural Geometry / Runtime Canvas Texture中心
- Visual / Pointer Lock / Progression Panel / Build unlock guardは実ブラウザReviewを継続する

## 15. Phase 1 Progression Contract

### Rank Data

`progressionRank`はAchievement解除数から作る旧Factory称号と分離する。

- Achievement由来表示は`FACTORY TITLE`として扱う。
- Achievementは削除しない。
- Achievement数から`progressionRank`を直接決めない。
- Progression Dataは1〜7を保存可能。
- Phase 1でRank Up可能なのは1→2→3。

### Rank 1 → 2

Mandatory:

- Directional `Hopper → Crusher → Seller` lineが成立。

Optionalから2つ:

- Lifetime Revenue $250
- Scrap collected 10
- Crusher processing 5
- Crusher 2台
- Item discovery 4種類

Reward:

- Smelter
- Storage
- Research Tier 2
- Research Data +1

RevenueだけではRank Up不可。

### Rank 2 → 3

Mandatory:

- Directional `Hopper → Crusher → Smelter → Seller`の鉄インゴット完全自動Lineが成立。

Optionalから2つ:

- Lifetime Revenue $750
- Iron Ingot discovery
- Player-built equipment 8台
- Crusher processing 10
- Smelter 2台

Reward:

- Rank 3
- Research Data +2
- Exploration Researchへの入口

### Research

Phase 1実装:

- `basic_fabrication`
  - Category: Production
  - Rank 2
  - Research Data 1
  - Blueprint不要
  - Iron Plate Hand Craft unlock
- `scrap_yard_survey`
  - Category: Exploration
  - Rank 3
  - Research Data 1
  - `scrap_yard_survey_blueprint`必須
  - Blueprint未発見ならResearch不可
  - Blueprint取得Gameplayは後続Exploration Phaseで実装

### Unlock Guard

新規Save:

- Smelter / StorageはRank 2未満でBuild UI / Quick Buildから選択不可。
- Iron Plate Hand Craftは`basic_fabrication`未研究では選択不可。

Legacy Save:

- 使用済みSmelter / Storageは`legacyUnlocks`で維持。
- 使用済みIron Plate / Tool Kit Craft Evidenceがあれば`basic_fabrication`を完了扱い。

### Persistence Bridge

Progression UIは既存`game.js`のRuntime stateを直接置換しない。

Rank Up / Research確定時:

1. ProgressionだけRoot Saveへ書込。
2. UI Moduleが確定Progressionを一時的にAuthoritativeとして保持。
3. Page Reload時の`beforeunload` / `pagehide`で、既存`game.js`の最後のSave後にProgressionを再Merge。
4. Reload後は通常の`storage.js` normalize結果としてGame Runtimeへ入る。

これにより、Phase 1追加のために既存Production / Conveyor Runtimeを大規模変更しない。

### Regression

`scripts/progression.test.mjs`で最低限次を確認する。

- Rank 1必須Directional Line。
- RevenueだけではRank Up不可。
- 必須 + Optional 2つでRank 2へ進行。
- Rank 2の完全Iron LineでRank 3へ進行可能。
- Rank Up時のResearch Data付与。
- `Basic Fabrication` ResearchとIron Plate unlock。
- Blueprint未発見Researchの拒否。
- Legacy Smelter / Storage / Craft unlock migration。
