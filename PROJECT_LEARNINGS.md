# Project Learnings

## 2026-09-04 / Initial Build

### Keep

- Game Hubと各Gameを分離し、Saveだけ共有する構造は追加Gameを増やしやすい。
- 外部Assetを使わずProcedural Geometryにすると、LicenseとRepository Sizeを抑えながら初期Gameplayを検証できる。
- Hubで未完成Gameを`PLANNED`表示に限定すると、PrototypeをPlayableと誤認しにくい。

### Watch

- Conveyorの無向BFSはMVPには単純で安定するが、複雑な工場では意図しない経路を選びうる。Directional化するときはSave互換性と既存Layoutを考える。
- WebGL GameはStatic Validationだけでは操作感・FPS・Pointer Lockを判断できない。Browser Validationを必ず別工程にする。

## 2026-09-04 / Visual Foundation V2

### Problem

- Gameplay loopが成立していても、World / Machine / Backgroundの大半が単純なBoxGeometryだと「WebGL Prototype」に見えやすい。
- 色やLightingだけを変えても、SilhouetteとEnvironment densityが変わらない限り完成度は大きく上がらない。

### Keep

- Save / Economy / Production / Conveyor LogicはVisual変更から分離し、正常に動いているGame Logicを保持する。
- Procedural Geometryでも、Main bodyだけでなくFrame / Pipe / Motor / Guard / Roller / Sign等を組み合わせると用途別Silhouetteを作れる。
- EnvironmentはNear / Mid / Farの3層に分けると、狭いPlayable AreaでもWorldが続いて見えやすい。
- GroundのTexture variation、Lane marking、Oil stain等は少ないGeometry costで空間の情報量を増やせる。
- CollectibleとDecorative Scrapを分けると、Gameplay readabilityを残したまま背景密度を上げられる。

### Watch

- Procedural Meshを増やしすぎるとDraw Call / Material数が増える。実ブラウザFPS確認後、必要ならMaterial共有・Instancing・LODを行う。
- Decorative ColliderとBuild Gridを別管理すると設備が背景へめり込むため、Static sceneryもPlacement validationへ含める。
- Head Bob / FOV演出は強くすると酔いやすい。現在値はCandidateとしてUser feedbackを優先する。
- Procedural ArtだけでSteam級Visualの最終到達点まで行けるとは限らない。本格Asset導入時もSave / Gameplay ContractとVisual Layerを分離した構造を維持する。

## 2026-09-04 / Runtime Visual Regression

### Evidence

User screenshotで次を確認。

- Chain-link fenceの支柱は外周にあるのに、透明Fence panelだけが拠点内部を横切って見える。
- 見えているFence panelを通過でき、ColliderとVisualが一致していない。
- Collectible Scrapが種類によって地面から明確に浮いている。

### Root Cause

- `PlaneGeometry`のローカルX軸はそのままFence方向に使えるのに、Fence panelへ余分な`+ Math.PI / 2`回転を与えていた。
- Collectible Scrapは形状ごとの最低Yを見ず、全種類を一律`Y=0.32`へ配置していた。

### Keep

- ColliderとVisualは同じ基準線・向きを共有する。
- 不規則形状を地面へ置く場合は固定Yではなく`Box3`等で実Geometryの最低点を取得して接地する。
- Alpha-tested chain-link面へ強いShadowを付けず、支柱Shadow中心にする。

### Watch

- Static CIでは「見える壁を通れる」「物が浮く」のようなVisual / Collider mismatchを検出できない。
- Visual Foundation変更はScreenshot / Browser Reviewを別Gateにする。

## 2026-09-04 / Directional Logistics & Discoverability

### Evidence

- Conveyorを見ても撤去方法が分からなかった。
- Build後の方向修正手段がなかった。
- Visual Arrowと物流処理が分離し、Crusher outputがInput側へ逆走した。
- Tutorial / HUD / Machine Panelの説明量が不足していた。

### Root Cause

- MVP物流はConveyorを4-neighbor無向Graphとして扱い、`rotation`はVisual-onlyだった。
- Conveyorが通常Interaction flowから外れていた。
- 操作説明をBoot screenと短いObjectiveへ集約しすぎていた。

### Keep

- Visual direction indicatorはDecorationではなくRuntime ruleと同じSource of Truthへ接続する。
- Factory buildingは撤去・回転・反転を低コストにする。
- Dismantle時はBuild costだけでなくBuffer Item lossも防ぐ。
- 説明をStatic shortcut / Contextual hint / Re-openable Codexへ分ける。
- Tutorialは操作Key + 成功条件まで書く。
- User報告の物流BugはPure Function + Regression Testにする。

### Watch

- Directional化はSave破壊でなくてもBehavior migrationになりうる。
- Splitter / Merger追加時も暗黙の多方向探索へ戻さない。
- Dismantle / RotateはBrowserでRaycast / Pointer Lockを確認する。

## 2026-09-05 / Progression Rank & Legacy Compatibility

### Problem

- 後からRank / Researchを追加すると旧Saveで既に使っていた機能を突然LockするRiskがある。
- Achievement由来Factory称号と本当の`progressionRank`を混同しやすい。
- RevenueだけをRank条件にすると探索・加工・自動化を飛ばせる。

### Keep

- ProgressionはAchievementと別Dataにし、旧表示は`FACTORY TITLE`として扱う。
- Legacy Migrationは使用Evidenceから必要最低限だけ補完する。
- 使用済みSmelter / Storage / CraftはLegacy Unlock / Research完了扱いで維持する。
- Rank必須Lineは既存Directional Route helperをSource of Truthにする。
- RevenueはOptional Goalに留める。
- Rank / Research判定はDOMから分離したPure Functionにする。
- UI guardだけでなく`game.js` CoreでもBuild / Craftを再検証する。

### Watch

- Progression UIと`game.js` Runtime Saveの書込順序を意識する。
- MutationObserverでHUD自身を更新するSelf-trigger loopを避ける。
- Pointer Lock / Reload / Legacy Save見た目はBrowser Validationを別Gateにする。

## 2026-09-05 / Phase 2-A Power Core

### Problem

- Rank4でPowerを一括導入すると既存小型Factoryが突然全停止する可能性がある。
- Shortage処理でInput / Output /途中Progressを失うRiskがある。
- Generation / Demand / CoverageをSaveするとBuilding配置と二重Source of Truthになる。

### Keep

- Rank1〜3ではPowerを無効にし既存Behaviorを保つ。
- Rank4にはStarter Gridを用意し、Crusher1 + Smelter1程度を無追加作業で維持する。
- Power snapshotは`buildings[]`とProgressionから導出しSaveへ重複保存しない。
- Generatorで永続化が必要なのは`powerFuelSeconds`だけ。
- Shortage中はInput / Output /途中Progressを保持する。
- ConveyorはPassiveに保ち、停電中もGeneratorへFuelを届けられるようにする。
- Power allocationはPriority + Building IDでdeterministicにする。
- Power計算はPure Functionへ切り出す。

### Watch

- 複数独立Power Network導入時はGenerationを全体PoolではなくNetwork component単位へ拡張する。
- Generator / Power Pole dedicated silhouetteは改善対象。
- Rank4への通常到達条件は探索Progression待ち。
- Generator fuel → Shortage → Recovery / Pole coverageはBrowserで確認する。

## 2026-09-05 / Phase 2-B Logistics Expansion

### Problem

- Splitter / Merger追加で単純多方向BFSへ戻すと、矢印と実搬送の不一致を再発させる。
- 新Input Port modelを既存Conveyorへ厳密適用するとLegacy cornerを壊す。
- `BUILD_MENU_ORDER`途中挿入でQuick Build 1〜5がずれるRiskがある。
- Fixed Transport TickではMk.1 / Mk.2 tierを表現しにくい。
- Splitter分配位置をRuntimeだけで持つとReloadで不安定になる。

### Evidence

PR #7最初のCI:

- `scripts/logistics.test.mjs`
- `AssertionError: east then north route should resolve`

Line途中の2本目ConveyorにもRear Inputを要求し、既存90°曲がりLineを破壊していた。

### Root Cause

- 「Advanced Nodeは明示Port」と「Legacy Conveyorは途中Side entry許可」を同一判定にまとめた。

### Keep

- `logistics.js`をRoute唯一のSource of Truthにする。
- Source→First Conveyor / Mk.2だけRear接続を要求する。
- 途中ConveyorはLegacy Side entryを維持する。
- Splitter / Mergerは途中でもStrict Port。
- Splitter = Rear1 → Forward/Left/Right3。
- Merger = Rear/Left/Right3 → Forward1。
- Route cycleはPath-local visited setで防止する。
- Splitter routeをStable sortし`logisticsCursor`でRound-robinする。
- ThroughputはRoute上最小Node speed。
- Fixed Intervalではなく`delta × throughput` Credit。
- Quick Build 1〜5をPublic ContractとしてRegression固定する。
- Route graph / throughputをSaveせず`logisticsCursor`だけ永続化する。
- CIが既存Contract破壊を検出したらTestを弱めず実装を直す。

### Watch

- Nested Splitterは各Splitter独立Queueではなく、Sourceからの最終Route単位でRound-robinする。
- ThroughputはRoute-levelでper-segment occupancy / queueはまだない。
- Advanced visualは長期的には`industrial-art.js`へ統合余地がある。
- Build Preview tintがCustom shape全体へ完全連動するかBrowser確認が必要。
- Mk.2 packet数増加時のFPSを確認する。
- Splitter / Merger Port Markingの一人称可読性はBrowserで見る。

## 2026-09-05 / Phase 2-C Power Buffer & Storage

### Problem

- GeneratorだけではFuel切れや需要SpikeでFactoryが即Shortageになり、余剰電力を将来へ持ち越せない。
- Storageを無制限Bufferのまま扱うと大規模化したときBottleneckが見えず、Storage Expansionの意味も作れない。
- StorageへCapacityだけ追加してSource Outputを先に減らす実装にすると、満杯時にItem lossが発生する。
- BatteryのGeneration / Charge / Discharge stateを丸ごとSaveすると、Building配置・Stored Energy・SnapshotのSource of Truthが重複する。
- RankだけでBatteryを解放するとResearchの役割が薄くなる。

### Keep

- BatteryはRank4 + `grid_storage` Researchの二段Gateにする。
- Build lock reasonをRank / Researchで分離し、CoreとUIの両方で同じ`buildingUnlockState()`を使う。
- Batteryで永続化するのは`powerStored`だけにする。
- Generation / Demand / Charge Rate / Discharge Rate / Coverageは毎Frame導出する。
- `computePowerSnapshot()`はnon-mutatingに保ち、時間でEnergyを変える責務は`tickPowerStorage()`だけにする。
- BatteryはShortfallだけを補い、余剰時だけ充電する。供給と充電を同時に二重計上しない。
- Current `delta`で維持できるStored Energyを超えるDischargeを予定しない。
- Disconnected Batteryは充放電しない。
- Storage Capacityは`storage-capacity.js`のPure helperへ分離し、Manual Deposit / Runtime Transport / Factory Management / Testで共有する。
- Full StorageをRoute Target候補から除外し、Transfer直前にもRemainingを再確認する。
- **Source OutputはTarget受入を確認した後でだけ減らす。** No Route / FullならItemをSourceへ残す。
- Manual DepositもRemainingだけ移動し、超過ItemをInventoryへ残す。
- Legacy over-capacity Storageは中身を削除せず、Remaining=0として新規Inputだけ拒否する。
- Storage Back PressureをFactory Management Alertへ出し、止まる理由を見えるようにする。
- Battery / Industrial StorageをGeneric fallbackのまま完成扱いせず専用Silhouetteを追加する。

### Evidence

PR #8 implementation-only headで次のRegressionを追加し、`Validate Web Game` run #43が成功した。

- Battery exact-shortfall discharge
- snapshot non-mutation
- surplus charging
- capacity clamp
- disconnected battery
- low-energy discharge
- Small / Industrial Storage capacity
- Full Back Pressure
- Legacy over-capacity preservation
- Battery Research Gate / Industrial Storage Rank5 Gate
- Factory Management Storage / Power metrics

### Watch

- 現在BatteryはStarter Grid / connected Pole coverageへ参加するが、Grid component自体は1つのGlobal Pool。独立Networkを作るときBatteryもComponent所属へ変更する。
- Battery charge/dischargeはPower量×秒の単純Energy model。Efficiency / max cycle / degradationはまだない。
- Back PressureはFinal Storage TargetをRoute候補から外すModelで、Belt segment上の物理Queueや詰まりAnimationはまだない。
- SplitterはStorage Full時に別Final Routeへ再選択できるが、各Intermediate Nodeの独立Bufferは持たない。
- Industrial StorageはRank5 future-state featureで、自然なRank5 Progressionは未接続。
- Battery charge gauge / Industrial Storage scale / collision / Pointer LockはStatic CIでは評価できない。
- `world-runtime.js`のCustom Visualが増えてきたため、次のVisual architecture整理では`industrial-art.js`への責務移動を検討する。
- Generator / Pole final visuals、Assembler / advanced recipes、Smart Sorter / Priority / Overflowは後続Slice。

## 2026-09-05 / Phase 3-A Residential Exploration Progression

### Problem

- Rank4のPower / Advanced Logisticsを先に実装しても、通常GameplayがRank3で止まる限りPlayerは自然に利用できない。
- Factory Sceneへ探索Areaを追加し続けるとWorld / Collider / Draw Costが肥大化し、探索ごとの状態管理も複雑になる。
- 探索中Lootを直接Factory Inventoryへ入れると「正常帰還で初めて持帰り確定」という探索Riskが作れず、Inventory Full時のItem lossも起こしやすい。
- 進行必須BlueprintをRandom Lootへ置くと、運次第でRank進行が止まる。
- Nested stateをNormalizeする関数が内部でObjectを差し替えると、呼び出し側が掴んだ古い参照へMutationしてもAuthoritative stateへ反映されない。

### Evidence

PR #9初回CI `Validate Web Game` run #49でExploration regressionが失敗した。

- duplicate Loot IDが`collected`にならず、同じLoot Nodeを再回収できる状態だった。
- `collectExplorationLoot()`は最初に`session`参照を取得した後、容量確認のため`canAddExplorationLoot()`を呼んでいた。
- `canAddExplorationLoot()`内の`ensureExplorationState()`が`activeSession`をNormalize済み別Objectへ差し替えた。
- その後のLoot / `collectedLootIds`更新はStale Sessionへ書き込まれ、Authoritative stateへ残らなかった。

### Root Cause

- Outer `exploration` objectのidentityは維持していたが、Nested `activeSession` identityまでは維持していなかった。
- 容量確認のようなRead-only判定が再Normalizeを発生させる設計だったため、同じOperation内で参照が無効化された。
- Progressionで過去に経験したState identity問題をNested Sessionへ再適用できていなかった。

### Keep

- FactoryとIndependent Exploration Areaは別Scene / Pageとして切り替え、同時フルロードしない。
- Exploration persistent stateとCurrent Expedition Sessionを分離する。
- Session LootはNormal ReturnまでFactory Inventoryへ混ぜない。
- Normal ReturnではLootをTransport Depotへ確定し、Factory Backpack overflowからItemを守る。
- Hub ExitはSessionを保持し、AbandonだけCurrent Session Lootを失う。
- Zone discovery / Main Objective / Resource PointはAbandon後も保持する。
- 進行必須Blueprint / Research DataはMain ObjectiveからGuaranteeし、Random Dropへ依存させない。
- Objective rewardは`rewardClaimed`でidempotentにする。
- Rank3→4はResidential Main ObjectiveをMandatoryにし、探索・経済・製品のOptionalから2つを要求する。
- Area Launch GateとRank Up Gateは別にする。Rank3になれば探索を繰り返せるが、Rank4にはMain Objective + Optionalsが必要。
- Loot NodeはStable IDを持ち、Current Session内の再取得を明示的に防ぐ。
- Session Pack Full時はWorld Lootを消さず回収拒否する。
- **同一Operation内のRead-only判定でNormalizeを再実行しない。** 容量確認はSession objectだけを受け取るPure `canAddSessionLoot()`へ分離する。
- State NormalizationがObjectを差し替える可能性がある場合、Normalize前に取得したNested referenceをMutationへ使わない。
- CIがState identity regressionを検出した場合、Testを弱めず参照/責務設計を修正する。

### Evidence After Fix

修正後 `Validate Web Game` run #50:

- project-contract: success
- `npm run validate`: success
- reusable baseline: success

探索Regressionは以下を固定した。

- Rank3 Area gate
- Session start
- duplicate Loot prevention
- Zone idempotence
- Fuse → Power → Survey dependency
- Guaranteed reward
- Reward idempotence
- Normal Return → Depot
- Abandon loot loss / persistent progress
- Rank3→4 eligibility

### Watch

- Residential SceneはPhase 3-AのVertical Sliceで、建物内部の深さ・敵・HP・環境Hazardはまだ不足している。
- Danger表示は現在1だが、実Gameplay上のThreatへ完全接続していない。今後Danger値と敵/環境Riskを一致させる。
- Simple AABB collision / objective interaction distanceはStatic CIではPlayabilityを保証できない。実ブラウザでGarage / Substation / Return Terminalへの到達性を確認する。
- Factory→Terminal→Residential→FactoryのPointer Lock遷移とSave順序はBrowserで確認する。
- Transport Terminalを開く前のFactory state同期は既存`save-now` Handlerを利用している。将来は公開Runtime save APIへ整理できる。
- Residential Procedural GeometryのDraw Cost、Fog、Landmark readability、Loot visibilityは実FPS / Screenshotで評価する。
- Active ExpeditionをHubからどうResume導線へ見せるかは、現在TerminalのResume button中心。Hub cardへSession indicatorを出す余地がある。
- 今後複数Areaを追加するときは`EXPLORATION_AREAS`を増やしてもResidential固有ObjectiveをGeneric化しすぎず、AreaごとのGameplay差を維持する。
