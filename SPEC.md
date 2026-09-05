# Specification

## 1. Hub Architecture

```text
Hub UI
└─ shared save adapter
   └─ localStorage: elitemay-game-hub-v1

Game: Scrap Factory / Factory Scene
├─ config.js             : Item / Recipe / Building / Tutorial definitions
├─ logistics.js          : Directional ports / route search / throughput / rotation pure logic
├─ power.js              : Rank 4 power / generator / pole / battery pure logic
├─ storage-capacity.js   : Storage capacity / remaining / transfer clamp pure logic
├─ exploration.js        : Exploration state / session / objective / depot pure logic
├─ exploration-ui.js     : Transport Terminal overlay / area launch / depot claim
├─ progression.js        : Progression Rank / Research / Legacy inference pure logic
├─ progression-ui.js     : Rank HUD / Research panel / unlock guards
├─ storage.js            : Save parse / normalize / backup / export-import
├─ factory-management.js : Factory analysis + browser feature entry
├─ feature-pack.js       : Factory Management browser integration / quick-build
├─ visual-kit.js         : Procedural texture / material / primitive helpers
├─ industrial-art.js     : Environment art / base machine visual composition
├─ world.js              : Factory Three.js scene / FPS movement / raycast / build placement
├─ world-runtime.js      : Runtime visual corrections / advanced infrastructure visuals
└─ game.js               : Economy / inventory / production / power / transport / UI controller

Independent Exploration Scene
└─ exploration/
   ├─ residential.html
   ├─ residential.css
   └─ residential.js     : Residential Three.js scene / movement / objective interactions
```

Factoryと独立探索Areaは同じThree.js Sceneへ詰め込まず、別Page / Sceneとして切り替える。FactoryをBackgroundでフルロードし続けない。

`index.html`のImport Mapで`./world.js`を`./world-runtime.js`へ解決する。`world-runtime.js`はSave / Economy / Production contractを所有せず、Runtime visual correction、Advanced Logistics / Battery / Industrial Storage visual、Packet speed反映を担当する。

Progression / Exploration / Power / Logistics / Storage CapacityはDOMから分離したPure LogicをSource of Truthとし、各Browser Runtimeはその結果をUI / 3D Sceneへ適用する。

---

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
- `exploration`
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

Exploration Data:

```json
{
  "version": 1,
  "areas": {
    "residential": {
      "discoveredZones": [],
      "objective": {
        "fuseRecovered": false,
        "powerRestored": false,
        "surveyUploaded": false,
        "completed": false
      },
      "resourcePoints": [],
      "visits": 0,
      "successfulReturns": 0,
      "returnedLootTotal": 0,
      "completedAt": null,
      "rewardClaimed": false
    }
  },
  "depot": {},
  "activeSession": null
}
```

Active Expedition Session:

```json
{
  "id": "expedition-...",
  "areaId": "residential",
  "startedAt": "ISO-8601",
  "loot": {},
  "collectedLootIds": [],
  "player": { "x": 0, "y": 1.7, "z": 15, "yaw": 0 }
}
```

Building additive fields:

```json
{
  "powerFuelSeconds": 0,
  "powerStored": 0,
  "logisticsCursor": 0
}
```

### Exploration Persistence

- `exploration.version = 1`をExploration内部Versionとして持つ。
- Root Schema Versionは`1`のまま維持する。
- 旧Saveに`exploration`がなければDefault stateをAdditiveに補完する。
- Main Objective、発見区画、Resource Point、帰還統計はExpeditionを跨いで永続化する。
- Active SessionはArea / Loot / 回収済みLoot ID / Player位置を保存する。
- Game Hubへ戻るだけではActive Sessionを破棄しない。
- Normal Return時だけSession LootをTransport Depotへ確定し、Sessionを終了する。
- Abandon時はSession Lootを失うが、発見区画とMain Objective進行は保持する。
- DepotはFactory Backpackへ収まらない正常帰還Lootを安全に保持する。
- Main Objective報酬は`rewardClaimed`で一度だけ確定する。

### Power Persistence

- Generation / Demand / Coverage / Shortage / Battery charge-discharge rateはSaveへ重複保存しない。
- Power snapshotは`buildings[]`と`progressionRank`から毎回導出する。
- Generatorの燃焼途中だけ`building.powerFuelSeconds`へ保存する。
- Batteryの残Energyだけ`building.powerStored`へ保存する。
- `powerFuelSeconds` / `powerStored`がない旧Buildingは`0`へNormalizeする。
- `storage.js`は旧Saveの`powerStored`を破壊的に容量Clampしない。

### Logistics Persistence

- Splitter等の安定したRoute選択位置を`building.logisticsCursor`へ保存する。
- `logisticsCursor`がない旧Buildingは`0`へNormalizeする。
- Route graph / Throughput / Connected PortをSaveへ複製しない。

### Storage Persistence

- Storage Itemは従来通り`building.output`に保持する。
- Capacity / Remaining / Fill RatioはBuilding定義とBufferから導出する。
- 旧Saveで現在Capacityを超えるItemが入っていても削除しない。
- Over-capacity Storageは残容量0として扱い、新規投入だけ拒否する。

### General Compatibility

- Root Save Schema Versionは`1`を維持する。
- `progressionRank`は1〜7を保存可能。通常GameplayでRank Upできるのは現在1→2→3→4まで。
- Building ID / Expedition IDは表示名や配列Indexから分離する。
- 旧Saveに`progression`がない場合はFactory使用Evidenceから最低Rank / Legacy Unlockを推定する。
- Legacy Smelter / Storage / Iron Plate Craftの既存利用を突然Lockしない。
- Existing AchievementはProgression Rankへ変換せず保持する。

Visual Foundation V2 / Directional Logistics / Phase 1 / Phase 2 / Phase 3-AではRoot Save Schemaを変更しない。

---

## 3. World / Scene Contract

### Factory Base

- 中心: `(0, 0)`
- Build可能範囲: `x/z ±20m`
- Grid: `2.5m`
- Starter Hopper: `(-5, 0)`
- Starter Seller: `(7.5, 0)`
- Static sceneryと重なる位置はBuild PreviewをInvalidにする。
- Chain-link visualとColliderの向きを一致させる。
- Conveyor Mk.1 / Mk.2 / Splitter / Mergerは床置き物流設備としてPlayer collisionを持たない。
- Battery / Industrial Storageは通常設備Colliderを維持する。

### Scrap Yard

- Factory Gate東側。
- Scrapは複数種をProcedural配置。
- 回収後22〜38秒でRespawn。
- CollectibleはStatic Collider内を避ける。
- Geometry最低Yを使って地面へ接地する。

### Residential Block / Independent Scene

- Rank 3からTransport Terminal経由で入る。
- Factory Sceneとは別のThree.js Scene / Page。
- Entry Pointから住宅街奥へ向いて開始する。
- 4 Persistent Zones:
  - `entrance`
  - `row_houses`
  - `garage`
  - `substation`
- Procedural environment:
  - Road / curb
  - Row houses
  - Open garage shell
  - Substation / fence / transformer equipment
  - Transport pad
  - Street lights
  - Debris
  - Distant residential silhouettes
- Player movementはWASD / Shift / Pointer Lock。
- Simple AABB collisionで主要建物・設備を通過不可にする。
- 現PhaseではJump / Combat / HPはResidential Sceneへ導入しない。

---

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

Residential Main Loot:

- 銅線
- 廃プラスチック
- 電子ジャンク

探索LootはSession Packへ入り、Normal ReturnまでFactory Inventoryへ直接入れない。

---

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

- Machine PanelではDescription / Input / Output / Seconds / Bufferを表示する。
- Iron Plate Hand Craftは`Basic Fabrication` Researchで解放する。
- Rank 4以降: Crusher 18 Power / Smelter 30 Power。
- Logistics / Storage / Sellerは現段階ではPassive Power設備。
- Power不足中は途中Progress / Input / Outputを保持する。

---

## 6. Directional Logistics Contract

### Rotation

- `0` → 東 `→`
- `π/2` → 北 `↑`
- `π` → 西 `←`
- `3π/2` → 南 `↓`

Visual Arrow / Markingと実際のOutput方向を一致させる。

### Conveyor Mk.1

- ID: `conveyor`
- Cost: `$12`
- Throughput: 1.5 items/sec
- Source Machineから最初に接続する場合はRear側がSource Cellへ接している必要がある。
- Line途中ではLegacy corner互換のためSide entryを許可する。
- OutputはForward 1 Cell。

### Conveyor Mk.2

- ID: `conveyor_mk2`
- Rank 4
- Cost: `$28`
- Throughput: 3 items/sec
- Input / Output ruleはMk.1と同じ。

### Splitter

- ID: `splitter`
- Rank 4
- Cost: `$85`
- Throughput: 最大3 items/sec
- Input: Rear 1
- Output: Forward / Left / Right
- 到達可能Routeだけを候補にする。
- `logisticsCursor`でdeterministic Round-robin。

### Merger

- ID: `merger`
- Rank 4
- Cost: `$85`
- Throughput: 最大3 items/sec
- Input: Rear / Left / Right
- Output: Forward 1
- Forward側からの逆入力を許可しない。

### Route Search

- Source→First NodeではSource Connection ruleを適用する。
- Mk.1 / Mk.2は途中Side entryを許可する。
- Splitter / Mergerは途中でも明示Portを厳密適用する。
- Output先がMachineならItem Accept判定を通す。
- Route内同一Cell再訪を禁止する。
- `findDirectionalRoute` / `findDirectionalRoutes`をProduction / Tutorial / Progression / Factory Analysisで共有する。

### Throughput

- Route実効ThroughputはRoute上Nodeの最小値。
- `Mk.2 → Mk.1`は1.5 items/sec。
- `game.js`はSource + Item単位のTransport Creditを`delta × throughput`で積算する。
- 1 frame Burstへ上限を持つ。
- Packet Animation speedもRoute tierへ合わせる。
- 現Phaseでは物理的Belt occupancy / per-segment queueを持たない。

### Editing

- Build中`R`で90°回転。
- 設置済みLogistics Nodeを`E`で設定。
- Rotate / Reverse後は`logisticsCursor = 0`。
- Runtime MeshもReloadなしで回転する。
- Automation判定も再計算する。

### Quick Build Compatibility

1. Crusher
2. Smelter
3. Conveyor Mk.1
4. Small Storage
5. Seller

Advanced設備追加後もこの順序を変えない。

---

## 7. Storage / Back Pressure Contract

### Small Storage

- ID: `storage`
- Rank 2
- Cost: `$60`
- Capacity: 120 items
- Itemは`output` Bufferへ保持する。

### Industrial Storage

- ID: `industrial_storage`
- Rank 5
- Cost: `$240`
- Capacity: 600 items
- 将来のRank 5 Factory向け大容量Buffer。

### Capacity Source of Truth

`storage-capacity.js`が以下を提供する。

- `storageCapacity`
- `storageAmount`
- `storageRemaining`
- `storageFillRatio`
- `storageCanReceive`
- `storageTransferAmount`

Game Runtime / Factory Management / Regressionは同Helperを共有する。

### Manual Deposit

- Storageへの手動投入は残容量だけ移動する。
- 超過分はPlayer Inventoryへ残す。
- Full時は0個移動し、既存Itemを変更しない。

### Automatic Transport

- Full Storageは`canReceiveItem`でFinal Target候補から外す。
- Transfer直前にも残容量を再確認する。
- Source OutputはTarget受入確認後にだけ減らす。
- Splitterに別の有効Routeがあれば利用できる。
- 有効RouteがなければSource側Itemはそのまま残る。

### Legacy Over-capacity

- 旧SaveでSmall Storageに120個超が入っていても内容を削除しない。
- Remainingは0。
- 新規Inputを拒否する。
- Playerが回収してCapacity以下になれば通常動作へ戻る。

---

## 8. Exploration Contract

### Transport Terminal

Factory HUDの`T`から開く。

表示:

- Area Name
- Danger
- Main Loot
- Main Objective
- Recommended state
- Discovery %
- Resource Point state
- Successful Return / Returned Loot
- Transport Depot

Rank 3未満はResidential Areaへ出発できない。

### Expedition Session

- 1つのActive Sessionだけ保持する。
- Start時に`activeSession`を作成する。
- Session Packは12 Slots。
- Loot nodeはStable IDを持ち、`collectedLootIds`で同一Session中の再回収を防ぐ。
- Session Pack容量不足ならLootを消さず回収拒否する。
- Player位置 / YawをAutosaveする。
- Residential Sceneは5秒ごとにAutosaveする。

### Persistent Discovery

- Zone discoveryはArea persistent stateへ即時反映する。
- 同じZone発見はidempotent。
- Abandon / Hub ExitでもZone discoveryは保持する。

### Residential Main Objective

順序固定:

1. `fuseRecovered`
   - West Garageで予備Fuseを回収
2. `powerRestored`
   - Fuse必須
   - Substation Breakerを復旧
3. `surveyUploaded`
   - Power Restore必須
   - Survey Terminalを起動

完了時:

- `objective.completed = true`
- `completedAt`記録
- Resource Point `residential-copper-network`を追加
- Blueprint `scrap_yard_survey_blueprint`を保証付与
- Research Data +1
- `rewardClaimed`により重複報酬を禁止

進行必須報酬をRandom Dropへしない。

### Normal Return

- Entry Point Transport Terminalから帰還する。
- Current Session Lootを`exploration.depot`へ移す。
- `successfulReturns += 1`
- `returnedLootTotal`へ持帰り数を加算。
- Active Sessionを終了する。
- DepotからFactory Backpackへ空き分だけClaimする。

### Hub Exit

- Active Sessionを維持する。
- 再開時は保存されたSession / Player位置 / Loot状態を再利用する。

### Abandon

- Current Session Lootだけ失う。
- Active Sessionを終了する。
- Discovered Zones / Main Objective / Resource Point / guaranteed reward stateは維持する。

---

## 9. Interaction / Controls

Factory:

- Center Raycast
- `E`: Scrap / Machine / Logistics / Generator操作
- `B`: Build Menu
- Build中: Left Click / `R` / Right Click / `Esc`
- `F`: Dismantle Mode
- `Tab`: Backpack + Hand Craft
- `O`: Field Manual
- `P`: Factory Management
- `T`: Transport Terminal
- HUD `RANK`: Progression / Research
- `1〜5`: Fixed Quick Build
- `Esc`: Pause / cancel

Residential:

- `WASD`: Move
- `Shift`: Sprint
- `E`: Loot / Objective / Return Terminal
- `Esc`: Expedition Pause
- Hub link: Session保持
- Abandon: Current Loot喪失 + Factoryへ戻る

### Dismantle Safety

- Player-built設備は建築費100%返金。
- `input` / `output` ItemもInventoryへ返却する。
- Inventoryへ収まらない場合は撤去拒否。
- Starter Hopper / Sellerは撤去不可。

---

## 10. Tutorial / Initial Contract

1. Scrap Yardへ移動
2. Scrap 5個回収
3. Baseへ戻る
4. 累計$80売却
5. Crusher設置
6. Crusherで加工
7. Hopper → Conveyor → Crusher → Conveyor → Seller
8. 累計売上$250

TutorialはGoalだけでなく操作Keyと成功条件を表示する。

Rank 3以降の探索はInitial TutorialではなくTransport Terminal / Progression HUDから案内する。

---

## 11. Visual Direction

### Target

- Primary Task: 一人称で回収し、拠点工場を構築し、独立Areaへ探索に出る。
- Tone: Industrial / technical / abandoned infrastructure。
- Steam掲載相当を長期品質目標とするが、Reference Asset / Layoutを直接コピーしない。

### Transfer Principles

- Satisfactory / Factorio等からTask structure / feedback / discoverabilityを参考にする。
- Logistics directionはDecorationではなくRuntime ruleと一致させる。
- MachineはFrame / Motor / Pipe / Guard / Sign等で用途別Silhouetteを作る。
- EnvironmentはNear / Mid / Farで密度を作る。
- Static Shortcut / Contextual Hint / Codex / Terminalを分離する。
- Independent AreaはFactoryと異なるLandmark / Objective readabilityを持たせる。

### Avoid

- Generic glass / neon / gradient UI。
- 大型Hero中心のLanding Page構造。
- BoxGeometry色違いだけのMachineを完成扱いすること。
- Visual Arrowと内部Directionの不一致。
- Exploration objectiveがUI文だけでWorld上に対応物を持たない状態。

---

## 12. Machine Visual Contract

- Hopper: Funnel + frame + discharge
- Seller: Terminal + screen + bollards
- Crusher: Twin rollers + motor + chute + frame
- Smelter: Furnace + rings + chimney + glowing door + pipe
- Conveyor Mk.1: Belt + rollers + rails + supports + arrows
- Conveyor Mk.2: 高速Tierと分かるRail / Marking
- Splitter: 1 Input / 3 Outputが読める床置きNode
- Merger: 3 Input / 1 Outputが読める床置きNode
- Small Storage: Corrugated container + frame + door
- Battery: Cell cabinet + terminal + visible charge gauge
- Industrial Storage: Small Storageと区別できる大型Frame / door / marking
- Scrap Generator / Power Pole: Core logic実装済み。専用Silhouetteは後続Visual passで改善対象

Advanced Logistics / Battery / Industrial Storage visualは現時点で`world-runtime.js`の明示Runtime extensionとして追加する。

---

## 13. Gameplay UX Contract

### Shortcut Layers

1. Static Shortcut Bar
2. Contextual Build / Dismantle / Exploration Hint
3. Re-openable Field Manual
4. Progression HUD
5. Factory Management Console
6. Transport Terminal

### Machine Panel

- Descriptionを常時表示。
- RecipeはInput → Output → Seconds。
- LogisticsはPort / Direction / Throughput / Rotate / Reverse。
- GeneratorはFuel / generation / remaining seconds。
- Power PoleはGrid connection / coverage guidance。
- BatteryはStored / Capacity / Charge Rate / Discharge Rate / Grid connection。
- StorageはUsed / Capacity / Remaining / Full state。
- Power停止中MachineはCoverage不足とGeneration不足を区別する。

### Exploration UI

- TerminalはArea danger / loot / objective / progressを出発前に表示。
- Residential HUDはZone / Session Pack / District progress / Main Objectiveを表示。
- Session LootはFactory Inventoryと区別して表示。
- ObjectiveはFuse → Power → Surveyの現在Stepを明示する。
- Return Terminalは「正常帰還でLoot確定」と分かる文言を表示する。

---

## 14. Dependencies

Three.js `0.185.0`をjsDelivr ES Moduleとして利用する。

CDN障害時は3D Factory / Exploration Sceneは起動できない。HubとSave DataはThree.jsに依存しない。

---

## 15. Known Limits

- Mobile Touch FPS操作なし（Desktop primary）。
- 通常GameplayのRank UpはRank 1→2→3→4まで。
- Rank 4→5の自然な到達条件は未接続。
- Industrial StorageはRank 5 Save状態向け先行実装。
- Residential AreaはPhase 3-Aの探索基盤。建物内部探索の深さ、敵、Combat、HP、環境Hazardは未実装。
- ResidentialのDanger 1は現時点で敵/HP Gameplayへ完全接続していない。
- BatteryはStarter Grid + Pole coverageを使うが、複数独立Power Network componentはまだ持たない。
- Power Generationは現段階では全体Pool。将来Network分離時にcomponent単位へ拡張する。
- ThroughputはRoute-level Credit Model。per-segment occupancy / physical queueは未実装。
- Storage Back PressureはFinal Target受入制御で、Belt segment上の物理Queueではない。
- Nested SplitterはSourceから到達する最終Route単位でRound-robin。各Splitter独立Queueではない。
- Smart Sorter / Priority / Overflow / Assembler / Phase 2新Recipeは未実装。
- BrowserでTransport Terminal / Residential movement / collision / objective reachability / return / abandon / FPSを実操作確認する必要がある。

---

## 16. Phase 1 Progression Contract

### Rank 1 → 2

Mandatory:
- Hopper → Crusher → Seller Directional Line

Optionalから2つ:
- Revenue $250
- Scrap 10
- Crusher processing 5
- Crusher 2台
- Item discovery 4

Reward:
- Smelter
- Small Storage
- Research Tier 2
- Research Data +1

### Rank 2 → 3

Mandatory:
- Hopper → Crusher → Smelter → Seller Iron Line

Optionalから2つ:
- Revenue $750
- Iron Ingot discovery
- Player-built 8
- Crusher processing 10
- Smelter 2台

Reward:
- Rank 3
- Research Data +2
- Residential Exploration入口

### Research

- `basic_fabrication`: Rank2 / Data1 / Iron Plate Hand Craft
- `scrap_yard_survey`: Rank3 / Data1 / Residential Main ObjectiveのBlueprint必須 / Exploration Research I
- `grid_storage`: Rank4 / Data2 / Battery Build unlock

### Unlock Guard

- Smelter / Storage: Rank2
- Residential Area: Rank3
- Conveyor Mk.2 / Splitter / Merger / Generator / Power Pole: Rank4
- Battery: Rank4 + `grid_storage`
- Industrial Storage: Rank5
- Iron Plate Hand Craft: `basic_fabrication`
- Core `game.js`でもBuild / Craftを再検証する。

---

## 17. Phase 2-A Power Core Contract

### Activation

- `progressionRank >= 4`で有効。
- Rank1〜3はLegacy no-power。

### Starter Grid

- Center `(0,0)`
- Radius 17.5m
- Capacity 55 Power

### Generator

- ID `generator`
- Rank4
- Cost `$260`
- Fuel: Metal Scrap 1
- Cycle: 24 sec
- Generation: 80 Power

### Power Pole

- ID `power_pole`
- Rank4
- Cost `$45`
- Link Range: 12.5m
- Consumer Coverage: 10m

### Shortage / Recovery

- Deterministic Priority + Building ID allocation。
- Power停止でItem / Progressを破壊しない。
- LogisticsはPassiveのため停電中もFuelをGeneratorへ届けられる。

---

## 18. Phase 2-B Logistics Expansion Contract

### Unlocks

Rank4:
- Conveyor Mk.2
- Splitter
- Merger

### Runtime

- Fixed transport intervalを廃止。
- Frame deltaからCreditを積算。
- Mk.1 = 1.5 items/sec。
- Mk.2 / Splitter / Merger = 3 items/sec。
- SplitterはStable sort + `logisticsCursor`。

### Factory Management

- Logistics Node count
- Defined logistics capacity
- Dead end alerts
- Underused Splitter alert
- Existing Machine output route analysis

### Regression

- Legacy corner
- reverse rejection
- Splitter ports/routes
- Round-robin
- Merger ports
- Throughput tier
- Quick Build order

---

## 19. Phase 2-C Power Buffer & Storage Contract

### Grid Storage Research

- Research ID: `grid_storage`
- Category: Power
- Required Rank: 4
- Cost: Research Data 2
- Unlock: `building:battery`
- RankだけではBatteryをBuildできない。

### Grid Battery

- Building ID: `battery`
- Cost: `$220`
- Rank: 4
- Research: `grid_storage`
- Capacity: 960 Energy
- Charge Rate: max 60 Power
- Discharge Rate: max 80 Power
- Starter GridまたはConnected Pole coverage内のみ接続扱い。
- BatteryはNetwork anchorにはならない。

#### Charge

- `baseGeneration > coveredDemand`の余剰だけを充電へ使う。
- Charge RateとRemaining CapacityでClampする。
- 充電に使ったPowerをFree Reserveとして二重計上しない。

#### Discharge

- `coveredDemand > baseGeneration`のShortfallだけを補う。
- Discharge Rateを超えない。
- Current frameの`delta`で維持できるStored Energyを超えて供給予定にしない。
- BatteryだけでShortfallを埋められなければ既存deterministic allocationへShortageが残る。

#### Persistence

- `powerStored`だけ保存。
- Snapshot計算は`powerStored`をmutateしない。
- `tickPowerStorage()`だけがRuntime時間経過に応じて増減する。
- Disconnected Batteryは充電も放電もしない。

### Storage Capacity

Small Storage:
- Capacity 120

Industrial Storage:
- Rank5
- Cost `$240`
- Capacity 600

### Back Pressure

- Full StorageをRuntime Transfer Targetから除外する。
- Transfer直前にも再確認する。
- Source Outputを先に減らさない。
- No RouteならSource BufferへItemを残す。
- Manual Depositも`storageTransferAmount()`でClampする。

### Factory Management

`analyzeFactory()`で追加:

- `storageUsed`
- `storageCapacity`
- `storageFull`
- Full Storage Warning
- Power generation / demand / reserve
- Battery stored / capacity
- Power coverage count

### Visual

Battery:
- Cell cabinet
- terminal details
- visible charge gauge
- status light

Industrial Storage:
- larger silhouette than Small Storage
- structural frame
- front door / safety marking

---

## 20. Phase 3-A Residential Exploration Progression Contract

### Rank 3 → 4

Mandatory:

- Residential Main Objective complete

Optionalから2つ:

- Residential 4区画中3区画発見
- ResidentialからLootを累計10個正常帰還
- Cable Bundleを発見 / 製作
- Lifetime Revenue $1,200
- Item discovery 6種類

Reward:

- Rank 4
- Splitter
- Merger
- Conveyor Mk.2
- Scrap Generator
- Power Pole
- Research Data +1

### Area Unlock

- Residential required Rank = 3。
- Rank 2以下ではTransport Terminalから出発不可。
- Rank 3ではMain Objective未完了でも自由に複数回出発できる。

### Guaranteed Progression Reward

Survey Terminal完了時:

- `scrap_yard_survey_blueprint`
- Research Data +1
- Residential Copper Resource Point

を保証する。

同じTerminalを再操作しても報酬を増殖させない。

### Regression

`scripts/exploration.test.mjs`で最低限確認する。

- Rank2 Area lock / Rank3 unlock
- Exploration normalize
- Expedition start / duplicate start
- Zone discovery idempotence
- Session Loot collection / duplicate prevention / capacity isolation
- Fuse → Power → Survey dependency
- Guaranteed Blueprint / Research Data
- Reward idempotence
- Normal Return → Depot
- Return statistics
- Rank3 mandatory + optionals → Rank4
- Rank4 building unlocks
- Depot → Factory Backpack
- Abandon current Loot loss
- Abandon後のZone / Objective persistence

CIではResidential HTMLのLocal ReferenceとRuntime integration markerも検証する。

Browser / Visual validationはStatic CIと別Gateとして扱う。
