# Scrap Factory Visual Research

Updated: 2026-09-17

## Target Type

- Primary task: 一人称でScrap Yard / Factory内を歩き、回収・建築・加工・自動化を繰り返す。
- Content model: 3D World + Factory Machines + Logistics + Exploration。
- Audience: 工場・自動化・拠点設計・効率化が好きなPlayer。
- Usage: 中〜長時間Session。
- Density: Playable Areaはmedium、背景はNear / Mid / Farで段階的に密度を作る。
- Primary device: Desktop browser / keyboard + mouse。
- Tone: Stylized Industrial Realism。Voxel / large-block lookではなく、滑らかな3Dと工業的な重量感を優先する。

## Representative References

### Satisfactory

Official: https://www.satisfactorygame.com/

- Factoryだけを見せず、広い地形・植生・岩山・遠景が常に背景として存在する。
- Factory expansionとOpen World explorationが同じ画面内で成立している。
- Scrap Factoryへは「Playable Areaの外にも世界が続いて見える」原則をTransferする。

### FOUNDRY

Official art direction: https://www.paradoxinteractive.com/games/foundry/news/dev-blog-48-making-art-in-foundry

- Heavy / bulky industrial machinesに対し、Biome側はsoftで読みやすい背景として機能する。
- High-frequencyな汚れを増やすより、Silhouetteと大きなMaterial差で世界をまとめている。
- Massive factoryを前提にRendering Performanceを考慮している。
- Scrap Factoryへは「背景と工業設備を別レイヤーとして対比」「Clean stylized industrial」「大量ObjectはInstancing /簡略化」の原則をTransferする。

### Techtonica

Official: https://techtonicagame.com/

- Factory以外のCave / Flora / Lightingが強いEnvironment Identityを持つ。
- Factoryを置いていない場所でもWorldが空に見えない。
- Scrap FactoryへはBioluminescent表現そのものではなく、「背景環境自体が場所の個性を作る」原則をTransferする。

## Existing Scrap Factory

### KEEP

- Scrap Yard / Workshop / Containers / Crane / Silos / Fence等のIndustrial props。
- 灰緑・鉄・黄色Hazard Accentを中心にした既存Palette。
- Dirt / Concrete / Oil stain / Lane marking。
- Gameplay / Save / Collision / Build GridはVisual改善と分離する。

### FIX

- Playable Area外の地平線が空きすぎてWorldが小さく見える。
- Industrial skylineが主に一方向に偏っている。
- Ground planeの外側が急に何もないように見えやすい。
- Near / Mid / FarのうちMidとFarが弱い。
- Machine detailを増やしても背景密度が低いため、画面全体ではPrototype感が残る。

### REMOVE / AVOID

- World全体をBoxGeometryで埋めること。
- Voxel terrainへ戻すこと。
- 高周波Grungeを大量に追加して視認性を落とすこと。
- 背景Objectへ不要なColliderやShadowを付けてGameplay / Performanceへ影響させること。
- すべての距離へ同じDetail量を置くこと。

## Design Direction Contract

### Design Concept

**Living Scrap Industrial District**

Scrap Factory単体が平面上に置かれているのではなく、道路・鉄道・電力線・資材置場・遠景工場・地形が続くIndustrial Districtの一角として見せる。

### Near Layer

- Fence外周付近のRock / Dry scrub / Scrap clutter。
- Road shoulder / lane marking等の低Costな地面情報。
- 既存Workshop / Container / Scrap Pileを活かす。

### Mid Layer

- Service roads。
- Rail corridor。
- Utility poles / power lines。
- Container stacks。
- Yard外周のIndustrial props。

### Far Layer

- Slag hill / low mountain silhouettes。
- Factory blocks / silos / smokestacks。
- Smoke / haze。
- North / South / West / Eastの複数方向へ背景を分散させる。

### Material / Color

- Machinery: gray-green steel + dark frames + yellow hazard accent。
- Ground: dusty brown / concrete gray。
- Background: desaturated green-gray / blue-gray。
- Far objectsはFogで馴染ませ、NearよりContrastを下げる。

### Performance Rule

- Repeated background objectsはInstancedMeshを優先する。
- Background propsは原則Shadowなし。
- Gameplay colliderを追加しない。
- Far skyline / smokeはLow qualityで非表示にできる既存Quality Budgetへ接続する。

## Acceptance Targets

- First-person cameraから複数方向を見ても、空の平面だけが大きく残らない。
- Ground edgeが近距離で目立たない。
- Near / Mid / Farの3層を視認できる。
- Background追加がBuild Grid / Collision / Saveへ影響しない。
- Static validation、browser smoke、console error checkをPassする。
- 最終VisualはScreenshot / Actual Browserで確認し、確認不能なら未確認として記録する。
