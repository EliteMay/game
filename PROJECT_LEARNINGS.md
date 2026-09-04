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

- `PlaneGeometry`のローカルX軸はそのままFence方向に使えるのに、Fence panelへ余分な`+ Math.PI / 2`回転を与えていた。そのためVisualだけ支柱と90°ずれていた。
- Collectible Scrapは形状ごとの最低Yを見ず、全種類を一律`Y=0.32`へ配置していた。

### Keep

- ColliderとVisualは同じ基準線・向きを共有する。
- 不規則形状を地面へ置く場合は固定Yではなく、`Box3`等で実Geometryの最低点を取得して接地する。
- Alpha-tested chain-link面へ強いShadowを付けるとモアレ状の大きな影が出やすいので、支柱のShadowだけを残す方が読みやすい。

### Watch

- WebGLのStatic CIでは「見える壁を通れる」「物が浮く」のようなVisual / Collider mismatchを検出できない。Screenshot feedbackをRuntime Evidenceとして扱う。
- Visual Foundationの変更では、少なくともFence / Gate / Collectible / Building placementを実ブラウザで見るReview Gateが必要。

## 2026-09-04 / Directional Logistics & Discoverability

### Evidence

User playtestで次を確認。

- Conveyorを見ても撤去方法が分からず、実際にConveyorだけ通常の`E`操作対象から外れていた。
- Build時に`R`回転できても、設置後の方向修正手段がなかった。
- Conveyor visualの矢印と物流処理が分離しており、Crusher outputがInput側のConveyorへ逆向きに流れた。
- Tutorial / HUD / Machine Panelの説明量が少なく、「何を押すか」「なぜ止まるか」が分からない。

### Root Cause

- MVPの物流はConveyorを4-neighbor無向Graphとして扱い、`rotation`はVisual-onlyだった。
- Conveyorを`handleInteraction`で即returnしていたため、設定 / 撤去Panelへ到達できなかった。
- 操作説明をBoot screenと短いObjective文へ集約しすぎており、Gameplay中に再確認できる情報層がなかった。

### Keep

- Visual direction indicatorはDecorationではなくRuntime ruleと同じSource of Truthへ接続する。
- Factory gameの建築は試行錯誤が多いため、撤去・回転・反転を低コストにする。
- Dismantle時は建築費だけでなくMachine BufferのItem lossも防ぐ。
- 操作説明は1画面へ詰め込まず、`Static shortcut / Contextual hint / Re-openable Codex`の3層へ分ける。
- TutorialはGoal名だけでなく「操作Key + 成功条件」まで書く。
- Userが報告した逆流のような物流BugはPure Functionへ切り出し、Regression Testを持つ。

### Watch

- 旧SaveのConveyor rotationは以前Gameplayへ影響しなかったため、Directional化後に既存Lineが止まる可能性がある。Save破壊ではないがBehavior migrationとして案内が必要。
- 現在のConveyorは1出力方向のみ。Splitter / Mergerを追加するときは暗黙の多方向探索へ戻さず、明示的なLogistics nodeとして設計する。
- Dismantle / RotateはStatic CIだけではRaycast targetや操作感を検証できない。公開BrowserでUser validationを続ける。

## 2026-09-05 / Progression Rank & Legacy Compatibility

### Problem

- 既存MVPではSmelter / Storage / Iron Plate Craftが最初から利用可能だったため、後からRank / Researchを追加すると既存Saveの利用機能を突然LockするRiskがある。
- Achievement解除数から作った旧`FACTORY RANK`称号と、本来の`progressionRank` 1〜7を同じ名前で扱うと進行Dataを誤って結び付けやすい。
- Rank必須条件を売上だけにすると、探索・加工・自動化を飛ばして進行できてしまう。

### Keep

- 新Progressionは既存Achievementと別Dataにし、旧表示は`FACTORY TITLE`として扱う。
- Legacy Migrationは「旧Saveだから全部最大Unlock」にせず、実際の使用Evidenceから必要最低限だけ補完する。
- Smelter / Storage / Craft等、既に使用した機能だけは`legacyUnlocks` / Research完了扱いで維持する。
- Rank必須Line判定は新しい近似ロジックを作らず、既存Directional Conveyor helperをそのままSource of Truthに使う。
- RevenueはOptional Goalの1つに留め、Mandatory Automation + 複数OptionalをRank Up条件にする。
- Rank / Research判定はDOMから分離したPure Functionにし、Migration / Blueprint GateまでRegression Testする。
- 大規模な`game.js`改修を避けられる場合は、既存の正常なProduction / Conveyor Runtimeを残したまま独立Moduleとして追加する。

### Watch

- Progression UIは既存`game.js`のRuntime stateを直接所有していないため、Rank Up / Research確定時はReload前の最後のSave順序を意識する必要がある。現在は`beforeunload` / `pagehide`で確定Progressionを最後に再Mergeする。
- UI側のBuild / Craft Guardは通常操作を防げるが、将来ProgressionがGame Coreの主要機能になった段階では`game.js`側のCore validationへ移す方が堅牢。
- MutationObserverでHUD自身を更新するとSelf-trigger loopを起こしうる。今回のProgression UIではDOM全体Observerを使わず、Capture Guard + 定期表示更新にした。
- Static TestではPointer Lock復帰、HUD位置、実Save Reload操作、実Legacy Saveの見た目を確認できない。Browser Validationを別Gateとして残す。
