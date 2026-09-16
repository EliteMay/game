# Scrap Factory Visual Research — 2026-09-16

## Target Type

- Primary Task: 一人称で探索・回収し、3D空間内へ設備と物流を組み、工場を拡張・最適化する。
- Content Model: Walkable 3D world + machines + conveyors + contextual HUD / management surfaces.
- Audience: Factory / automation gameを遊ぶPCユーザー。初見でも設備の役割と搬送方向を読める必要がある。
- Density: Medium → High。進行に応じて設備数が大きく増える。
- Primary Device: Desktop / keyboard + mouse.
- Tone: Stylized Industrial Realism。写実主義ではなく、工業感・素材感・読みやすさを優先する。

## Representative References

### Satisfactory

Official: https://www.satisfactorygame.com/

- First-person factory building + explorationというPrimary Taskが最も近い。
- 大規模FactoryでもMachine silhouette、conveyor、pipe等の役割を遠距離から判別しやすい。
- Transfer: 「設備を単なる箱として見せない」「遠距離でも用途を示すsilhouetteを残す」。
- Do not transfer: Brand color、UI composition、個別Machine design、Assetそのもの。

### Techtonica

Official: https://techtonicagame.com/
Press kit: https://techtonicagame.com/press-kit/

- First-person factory automation + explorationというPrimary Taskが近い。
- Industrial machineryとenvironment lighting / emissive accentを組み合わせ、Factoryの機能性とWorld atmosphereを両立している。
- Transfer: Material hierarchy、industrial lighting、機械ごとの形状差、automation readability。
- Do not transfer: Cave / bioluminescent worldという固有Theme、個別UI / Asset。

### Astroneer — Contrast Reference

Official press kit: https://astroneer.space/presskit/sheet.php?p=astroneer
Art direction: https://blog.astroneer.space/p/the-art-of-astroneer-low-poly/

- Stylized 3D / base buildingとして隣接するが、公式にlow-poly / faceted appearanceを意図した方向。
- Scrap Factoryで現在問題になっている「大きなドット・角ばった塊に見える」印象へ近づくため、geometry simplificationの見た目は今回のReference Transfer対象にしない。
- Transfer: 明快なsilhouetteと色面の整理だけ。

## Current KEEP / FIX / REMOVE

### KEEP

- Existing MeshStandardMaterial + ACES tone mapping + soft shadow foundation.
- Machine roleを色だけでなくFrame / Pipe / Roller / Guard等で示す構造。
- Instancing / LOD / cullingによるWebGL performance budget。
- Low / Medium / High quality tiersとPerformance Mode。
- Save / economy / production / directional logistics / collisionからVisual layerを分離したArchitecture。

### FIX

- High qualityでも約32mからMachineが単純なBox proxyへ切り替わり、通常の一人称視点でFactoryが大きなブロック群に見える。
- Cylinder / pipe / tire等に8〜14 segment程度のGeometryが多く、近距離でも輪郭が角ばる。
- Ground / corrugated surface等を斜めから見る場面でtexture samplingをもう少し明瞭にする余地がある。

### REMOVE / AVOID

- LOD自体を削除しない。Mega Factory performance contractを守る。
- 全Objectを高polyへ置換しない。
- Photorealismを目標にしない。
- Visual変更のためにcollider、build grid、save schema、machine stateを変更しない。
- Reference GameのAsset / UI / Machine designをコピーしない。

## Design Direction Contract

1. Directionは `Stylized Industrial Realism` を維持する。
2. High qualityではDetailed Machineを現状より遠くまで維持し、通常play距離でBox proxyが目立つ時間を減らす。
3. Far LODはInstanced proxyを維持するが、raw BoxGeometryではなく小さくroundしたindustrial massingへ変更する。
4. Round objectはroundに見せる。低segment Cylinder / Torusはpresentation layerで適度にsmooth化する。
5. Texture anisotropyはquality tierに応じてboundedに上げ、斜め面のdetailを保つ。
6. Low / Performance Modeは現状の軽量distance budgetを維持する。
7. Rendering changesはsimulation resultへ影響させない。

## Validation Contract

- Static regression: smooth visual moduleがproduction entryへPhase 7 runtimeより先に接続されていること。
- Static regression: Visual moduleがproduction / route / progression stateを所有しないこと。
- Browser smoke: boot、HUD、fresh start、console errorなし。
- Visual review: High qualityでnormal play distanceのMachineがraw block群に見えないこと。
- Performance: existing 264-building stress pathを維持し、実GPUでFPS確認が必要。
- Real input: Pointer Lock / placement / collider feelは実機確認が必要。
