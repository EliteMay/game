# Specification

## 1. Hub Architecture

```text
Hub UI
└─ shared save adapter
   └─ localStorage: elitemay-game-hub-v1

Game: Scrap Factory
├─ config.js          : Item / Recipe / Building / Tutorial definitions
├─ storage.js         : Save parse / normalize / backup / export-import
├─ visual-kit.js      : Procedural texture / material / primitive helpers
├─ industrial-art.js  : Environment art / machine visual composition
├─ world.js           : Three.js scene / FPS movement / raycast / build placement
├─ world-runtime.js   : Runtime visual corrections (fence alignment / scrap grounding)
└─ game.js            : Economy / inventory / machine process / transport / UI controller
```

`index.html`のImport Mapで`./world.js`を`./world-runtime.js`へ解決する。`world-runtime.js`は既存Worldを継承し、Save / Economy / Production contractを変更せずRuntime visual regressionのみ補正する。

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
- `player`
- `settings`
- `discoveredItems`
- `playTimeSeconds`

Building IDは表示名や配列Indexから分離した永続ID。

Visual Foundation V2およびRuntime Visual FixではSave Schemaを変更しない。旧MVPのSaveをそのまま利用する。

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

## 6. Conveyor Contract

- ConveyorはGrid Cell単位
- 4方向NeighborでNetworkを作る
- Source Machineから隣接ConveyorへBFS
- 搬送Itemを受け入れられる最短Machineへ1個ずつ転送
- 搬送時は3D PacketをPathに沿ってAnimation
- MVPではConveyor回転はVisual方向用。物流Graphは4方向無向接続

この制限は将来、Directional Conveyorへ拡張可能な接続点として残す。

## 7. Interaction

- Center Raycast
- 対象を見ている間はWorld側に小さいInteraction Markerを表示
- `E`: Scrap回収 / Machine操作
- `B`: Build menu
- Build中: Left Click設置 / `R`回転 / Right Click or `Esc`終了
- `Tab`: Backpack + Hand Craft
- Walk時は軽いHead Bob、Sprint時は小さいFOV変化を付ける

操作演出はGameplayを邪魔しない強さに留める。

## 8. Tutorial / Initial Contract

1. Scrap Yardへ移動
2. Scrap 5個回収
3. Baseへ戻る
4. 累計$80売却
5. Crusher設置
6. Crusherで加工
7. Hopper → Conveyor → Crusher → Conveyor → Sellerの自動Line成立
8. 累計売上$250

達成後はFree Playへ移る。

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
- Satisfactory factory screenshots: Machine単体だけでなくBelt / Pipe / Support / Floor / Backgroundを含む密度を確認
- Scrap Mechanic: Modular machineでも独自ShapeとColor codingで部品を識別できる構造を確認
- Steam / game launcher系: Libraryを主役にし、Play対象とStatusを明確化

### Observed Conventions

- 大型MachineはMain bodyだけでなくFrame / Motor / Pipe / Guard / Status partsでSilhouetteを作る
- 地面は単色面ではなく、Lane / Dirt / Oil / Crack等が距離感と用途を作る
- Yardは単一種類のPropを散らすのでなく、Container / Tire / Barrel / Vehicle / Scrap pile等を混在させる
- Play area外のSilo / Chimney / BuildingがWorld scaleを補う
- Bright skyでもRust / Concrete / Safety colorで工業感を維持できる

### Transfer

- Game: Canvasを主役にし、HUDは常時情報を絞る
- Factory: Machineごとに用途が分かるSilhouetteを作る
- Environment: Near / Mid / Farの3層で情報量を持つ
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
- Conveyor: Belt + rollers + side rails + support legs
- Storage: Corrugated container + frame + door detail

同じ`BUILDINGS` / Save ID / Collision Gridを維持し、見た目だけを差し替え可能にする。

## 11. Runtime Visual Fix Contract

- Fence panel visualは既存Colliderと同じFence segmentへ整列させる
- Fence mesh texture repeatは実長に合わせて密度を保つ
- Alpha-tested Fence panelはShadow castを無効化し、支柱Shadowのみ残す
- Collectible ScrapはSpawn / Respawnごとに`THREE.Box3`で最低Yを算出し地面へ接地する
- Save Schema / Building placement / Economy / Tutorial contractは変更しない

## 12. Dependencies

Three.js `0.185.0`をjsDelivrからES Moduleとして読み込む。

CDN障害時は3D Gameは起動できない。HubとSave DataはThree.jsに依存しない。

## 13. Known Limits

- Mobile Touch FPS操作なし（Desktop primary）
- Directional Conveyorは未実装
- Enemy / Weapon / HealthはMVP後
- 外部3D Model / Image Textureなし。現状はProcedural Geometry / Runtime Canvas Texture中心
- Visual Foundationは実ブラウザでのGameplay / FPS / Screenshot Reviewを継続する
