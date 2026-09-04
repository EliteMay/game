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
