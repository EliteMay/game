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
- Industrial Storageはこの時点ではRank5 future-state featureで、自然なRank5 Progressionは未接続だった。Phase 3-Bで解消。
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

## 2026-09-05 / Phase 3-B Rank 5 Production / Power Progression

### Problem

- Phase 2でRank4用Advanced Logistics / Power / Industrial Storageを実装しても、Rank4→5の自然なProgressionがなければIndustrial Storageは通常Gameplayから到達できない。
- Rank Upのために新しい`stableSeconds`や`advancedLineComplete`をSaveすると、実際のFactory配置・Route / Power stateとProgression用Cached stateが二重化する。
- Starter Gridを「自前電力」に含めると、Generatorを置いただけで実質Starter Grid依存のFactoryでもMandatoryを通せる。
- Generator inputにFuelが積まれているだけで「安定発電」と見なすと、停止中Generatorでも条件達成できる。

### Keep

- Rank4→5も既存`findDirectionalRoutes()`を唯一の物流Source of Truthとして使う。
- `crushed_metal`と`iron_ingot`の2つの自動加工Outputを同一Factoryから検出し、Route bundleにSplitter / Mergerが両方含まれることをMandatoryにする。
- Mk.2利用とRoute minimum throughputは同じRoute結果から導出する。
- Power条件は既存`computePowerSnapshot()` / `generatorActive()` / `buildingPowerGeneration()`を再利用する。
- 「自前発電」は稼働中Generator容量だけで評価し、Starter Grid 55 PowerとBattery dischargeをOwn Generationへ加算しない。
- Demandを賄うGenerator群について、`powerFuelSeconds + input.metal_scrap × 24秒`からFuel Runwayを導出する。
- Mandatoryは最低30秒Runway、Optionalは120秒Runwayを使う。
- Rank4→5専用のTimer / topology cache / power cacheをSaveしない。Factoryを崩せば昇格前の判定も未達へ戻る。
- Industrial StorageはRank5 gateを変えず、Rank5への正常到達経路を追加することで自然に解放する。
- `PLAYABLE_MAX_RANK`だけ5へ拡張し、1〜7を保存できる既存Progression contractは維持する。

### Evidence

PR #10 implementation head `6444578932c8520050b000c0e1c7605500f43ea3` に対する `Validate Web Game` run #56が成功した。

Regressionでは:

- Splitter + Merger + Mk.2を含む2加工Output topology
- Throughput 3.0
- Generator 80 Power / Covered Demand 66 / Own Reserve 14
- Fuel Runway 48秒
- Rank4 mandatory + optionals → Rank5
- Industrial Storage unlock
- Rank5 phase cap
- Merger removal rejection
- inactive Generator rejection

を確認した。

### Watch

- 現在の「安定稼働」は履歴を一定秒数連続観測する方式ではなく、現在Power正常 + Own Generation capacity + Fuel Runwayで決めるDeterministic state check。将来Production Order等で履歴が必要になれば、その時点で明示的なTelemetry contractを設計する。
- 2加工Outputは現行RecipeのCrushed Metal / Iron Ingotを使用する。Rank5 Assembler / Advanced Productionを追加した後は、Rank5→6側で製品多様化を本格化する。
- Route bundleにSplitter / Mergerが含まれることを検出するが、現PhaseではSplitter分岐数やMerger実入力数をProgression専用に別計測しない。
- Rank4→5のFactory構築操作、HUDのREADY変化、Rank Up後のIndustrial Storage BuildはBrowserで実操作確認が必要。
- Generator / Pole visual、Assembler、Advanced Recipes、Smart Sorter / Priority / Overflow、廃工場探索は後続Slice。

## 2026-09-05 / Phase 4-A Abandoned Factory & Advanced Assembly

### Problem

- Phase 4を一括実装すると探索Area追加、Save拡張、Research、Production、Visual、Rank条件が同時に広がり、既存Rank 1〜5やResidentialを壊したとき原因を切り分けにくい。
- 複数探索Areaを増やすためにResidential固有ObjectiveまでGeneric化すると、AreaごとのGameplay差が薄くなる。
- 新Area / Item追加だけを理由にSchema Versionを上げると、実際にはAdditiveで扱える旧Saveへ不要なMigration負担を作る。
- Rank 5→6用に`factoryRestored`や`assemblerLineComplete`のようなCached flagを保存すると、実探索State / Factory graphと二重Source of Truthになる。
- Rank5だけでAssemblerを解放すると、要件の「探索で技術を持ち帰り工場へ反映する」ループを飛ばせる。
- 新しい廃工場をResidentialの色替えやGeneric Boxだけで作ると、新Areaの意味とNavigation readabilityが弱い。

### Keep

- 大きなPhaseは「通常Gameplayで次Rankへ到達できるVertical Slice」を先に接続し、Smart Sorter等の横拡張は別Sliceへ分ける。
- `EXPLORATION_AREAS` / Session / Depotなど共有可能な部分だけGeneric化し、Residential / Industrial Objectiveは別関数として残す。
- 既存Import pathを維持したい拡張では、薄いCompatibility Entry (`exploration.js`, `progression.js`) からCore implementationへ委譲する方法が安全。
- 新Area / Itemが旧Dataを破壊せずDefault補完できる場合は、Schemaをむやみに上げずAdditive Normalizeで扱う。
- 廃工場のMandatory rewardはRandom DropにせずBlueprint + Research Dataを保証し、`rewardClaimed`でidempotentにする。
- Rank5→6 Mandatoryは `Industrial Objective state + Research state + Directional Factory graph` から毎回導出し、専用達成flagをSaveしない。
- AssemblerはRank5だけでは解放せず、`abandoned_factory_assembly_blueprint` → `advanced_assembly` Researchの二段Gateにする。
- Assembler productionは既存Generic Recipe Runtimeを再利用し、新Machine専用処理を`game.js`へ増やさない。
- VisualはSave / Productionと分離し、Assembler dedicated silhouetteを`world-runtime.js`で追加する。
- 新探索Areaは色替えで済ませず、Generator Hall / Assembly Floor / Control Roomの大きなLandmarkで進行方向を示す。
- Objective stateとVisual stateを同じPersistent stateから反映し、offline→online、gate closed→openedを別のVisual-only flagにしない。
- Environment Hazardは最初からCombat Systemへ広げず、Area gameplayに必要な最小Riskとして独立実装できる。
- 新Area追加時は既存Residential regressionを残したまま専用Regressionを追加し、複数Area化で旧挙動が壊れていないことを確認する。

### Evidence

Phase 4-A implementation head `f6806c502499990406c52c0bea07a4b8e65dec0b` に対する `Validate Web Game` run #70が成功。

Regressionで確認した主なContract:

- Rank 1→5の既存Progression
- Rank5でAssemblerがResearchなしではLock
- Industrial Rank gate
- Generator → Control Room dependency
- Blueprint reward exactly once
- Abandon時のLoot loss / facility progress persistence
- Advanced Assembly Research unlock
- Assembler directional topology
- Rank5→6 success
- Rank6 phase cap
- Existing Residential / Logistics / Power / Storage / Management regressions

### Watch

- Phase 4-AはPhase 4全体完了ではない。Smart Sorter / Production Statistics拡張 / Bottleneck Detection拡張は残る。
- `progression-core.js` / `exploration-core.js`への分離は互換性確保に有効だが、V2/V3 entryが増え続けると構造が散らばるため、安定後に役割を整理する。
- AssemblerのMotor/Circuit optionalは現在`discoveredItems`を使うため、Hand Craft時のDiscovery更新がUI上十分かBrowserで確認する。
- Industrial Electrical Arcは最小Environmental Hazardで、Damage/HP/敵との統合はしていない。
- Procedural廃工場はV4 minimum visual gateを意識した実装だが、Hybrid Asset Foundationの最終品質ではない。
- Static CIではPointer Lock、Objectiveへの実到達、Collider、Landmark readability、Hazard visibility、FPSを保証できない。Browser Validationを別Gateとして残す。

## 2026-09-05 / Phase 4-B Smart Sorting & Factory Diagnostics

### Keep

- Item-aware routingを既存Directional Graphへ追加し、Smart Sorter専用の別Graphを作らない。
- Sorterが固定カテゴリ分類なら、Filter設定をSaveへ増やさずRoute計算時に`itemId`からOutput Portを導出できる。
- Production Statistics / BottleneckはFactory stateから導出し、Telemetry SnapshotをSaveへ重複保存しない。
- 新Logistics NodeはGeneric Boxのままにせず、Gameplay Ruleと一致するLane / ArrowをVisualに出す。
- Phase 4-Bの横拡張をRank 5→6 Mandatoryへ後付けで強制せず、既に成立した進行Contractを保持する。

### Watch

- 現行Machine速度ではMk.1でも十分なケースが多く、純粋なBelt throughput bottleneckは高速Recipe追加後に意味が増える。
- Factory Managementの追加CardsはDOM拡張なので、実ブラウザでPanel open timing / overflowを確認する。
- `world-runtime.js`へ専用Visualが増えているため、将来`industrial-art.js`へ統合してVisual ownershipを整理する余地がある。

## 2026-09-05 / Phase 5-A Military Facility & Drone Automation

### Problem

- Rank 6→7を一括でConveyor Mk.3 / Priority / Overflow / Advanced Power / 戦闘 / Droneまで実装すると、Gameplay loopとRegressionの原因範囲が広がりすぎる。
- Drone回収のためだけに新しいSimulation Engineや独自物流を追加すると、Power / Back Pressure / Directional Routingと二重実装になる。
- 本格Weapon / Enemy AIを先に導入すると、探索・工場自動化が主役というGame designよりCombat側の実装負担が先行する。
- Drone PortをGeneric Box fallbackのままにすると、Rank 6の主要Rewardとして視覚的に弱い。

### Keep

- Rank 6→7は「Military Facilityで技術取得 → Research → Drone Port → Storage」のVertical Sliceを先に完成させ、Mk.3 / Priority / Overflowを後続へ分離する。
- **外部Resource Point由来の定期回収をEmpty-input Recipeとして既存Generic Production Runtimeへ接続**すると、新Simulationを作らずPower / Progress / Output / Back Pressureを再利用できる。
- Drone PortのRank判定は `Military Objective + Research + secured Resource Point + current Directional Factory graph` から導出し、`droneRouteComplete`のようなCached flagをSaveしない。
- 進行必須Drone BlueprintとResource Pointは同じMain Objectiveからguaranteeし、Random Lootへ依存させない。
- Exploration SessionへHPをAdditive補完しても、既存Areaを壊さないDefault / Normalizeを設計すればSchema v1を維持できる。
- 本格戦闘前のThreatは `HP + 危険Area + 非戦闘解除Route` で導入し、探索Riskを作りながら戦闘中心へ寄せない。
- Security状態はPersistent Objective stateからVisual / Hazardを直接切り替え、Visual-only stateを保存しない。
- Major Reward BuildingはGeneric fallbackを避け、Launch Deck / Control Mast / Docked Drone等の用途別Silhouetteを持たせる。
- 旧RegressionがPlayable capを固定して失敗した場合、旧Testを削除せず、新Rank仕様に合わせてcap assertionと次Rank requirementを更新する。

### Evidence

PR #13初回 `Validate Web Game` run #83:

- reusable baseline: success
- project-contract: failure
- 原因: 旧Regressionの `PLAYABLE_MAX_RANK === 6` assertion

Rank 7仕様へ更新後、実装 + Drone Port dedicated visual head `fa7a691e4610df2ac9cb9960e36c96d6c9a1ac8c` に対する run #85はsuccess。

Regressionで確認:

- Rank 1→6既存進行
- Military Rank 6 gate
- Exploration Schema v1 additive military state / HP
- Access → Security → Drone Bay dependency
- Blueprint / Research Data / Resource Point reward exactly once
- HP state / Abandon semantics
- Drone Control Research gate
- Drone Port Rank / Research gate
- secured Resource Point requirement
- Drone Port → Industrial Storage Directional Route
- throughput 3.0 option
- Rank 6→7 eligibility
- Rank 7 phase cap

### Watch

- Drone Portは現段階では`military-alloy-cache` 1種類へ固定。複数Resource Point選択 / Drone route assignment UIは後続。
- Military Turretは固定Threat zoneで、Weapon / patrol AI / cover combatは未実装。
- Military Sceneの内部PropsはGameplay colliderへ完全統合していないため、見た目と移動可能範囲はBrowser Validationが必要。
- Turret threat radius / HP damage cadenceが一人称で納得できるかはStatic CIでは判断できない。
- Empty-input Recipeは「Research取得済みならResource Pointも確保済み」という通常進行Contractに依存する。将来複数Drone Resourceを扱うときはBuildingごとのroute assignment stateを明示設計する。
- `exploration-core-v3.js` / `progression-phase5a.js`のLayeringは安全なVertical Sliceには有効だが、Phase追加ごとにFileを増やし続けず、安定後にCore ownershipを整理する。

## 2026-09-05 / Phase 6-C Final Automation Regression

### Problem

- 最終製品の完全自動Lineは5種類のAdvanced Drone source、複数input Assembler、2段Fabricator、Experimental Power、Storageまでを同時に検証する必要がある。
- 最初のE2E fixtureは空きGridをBFSで自動探索して配線していたため、Factoryが密になるにつれinput/output branchの予約順に結果が依存した。
- `plastic-control`、`motor-control`、`circuit-experimental`等、Product runtimeではなくFixture自身の自動配線Algorithmをdebugする状態になった。

### Root Cause

- 自由配置ゲームのRegression fixtureに「自動で最適な工場Layoutを設計する」という別問題まで担当させた。
- Test対象はDirectional Logistics / Production contractなのに、Fixture生成が第二のrouting systemになっていた。
- Explicit input gateway / branch reservationを追加しても、経路予約順序の競合は別箇所へ移るだけだった。

### Keep

- **E2E Testは代表的な明示Layoutを使い、Product runtimeだけを動的に検証する。**
- Phase 6-Cでは `Advanced Sources → Merger → Conveyor Mk.3 Main Bus → Splitter → Machine → Merger → Main Bus → Final Storage` のbuildable topologyへ変更した。
- Test fixtureを単純化しても、`findDirectionalRoutes()` / Power / Production analyzerを迂回しなければRegressionを弱めたことにはならない。
- Final progression stateは`finalAutomationComplete`のようなSave flagを持たず、Drone assignment / route / Machine recipe / Power / produced itemから毎回導出する。
- Topologyだけで完成扱いにせず、`Autonomous Industrial Core`を実際に1個以上生産したEvidenceを要求する。
- Recipe変更はOutput Bufferを保持し、incompatible Input Bufferがある場合は切替を拒否する。
- Utility / Advanced Droneは同じResource Point registryを共有しつつtier availabilityを明示して、旧Drone contractを壊さない。

### Evidence

最終implementation head:

```text
1e3a2bae14c1f9861b25e7d14c88190f486faa3a
Validate Web Game #135
result: success
```

このrunでexisting regression through Phase 6-BとPhase 6-C Main Bus testがすべて成功した。

### Watch

- Main Bus fixtureは代表LayoutのRegressionであり、任意のPlayer layoutの使いやすさや最適性を保証しない。
- Automation ConsoleのRoute / Recipe変更はcurrent module-local runtimeとの整合のためreloadを使う。将来runtime mutation APIを用意できればreload dependencyを外す。
- Static CIではAutomation Consoleのlayout、Pointer Lock、Build Preview、Collider、Advanced Drone / Experimental Powerの一人称Scale、WebGL FPS、Final line balanceを確認できない。
- Requirements step 9のMega Factory stable-operationは履歴時間を持つObjectiveになる可能性が高い。現在のPhase 6-C derived topology stateと安易に同じpersistent flagへまとめない。

## 2026-09-06 — Home / Tutorial Migration Learnings

- New GameのSpawn変更と既存SaveのPlayer座標Migrationは分離する。DefaultだけHomeに変え、normalizeでは旧座標を上書きしない。
- Backpack容量はFactoryとExplorationで別定数を持たず、同じSlot capacity関数を参照する。UIだけ容量を増やす実装はSave/探索挙動と不整合になる。
- Tutorial完了は売上額などの代理指標ではなく、要求された実イベント（今回ならcrushed_metalがSellerへ実搬送・自動販売された瞬間）を記録する。
- Optional Player UpgradeはMain Progressionと別状態に置き、取得判定をRank/Main Clear条件へ混ぜない。
- Secure Caseのような保護機能は「何を保護できないか」を先に固定し、Main Objective CargoやFinal progression itemを自動保護しない。
- System Diagnosticsは既存Runtime/Analyzerを再利用し、別の真実を保存しない。原因候補と確認先を提示し、自動修正はしない。
