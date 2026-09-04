# Specification

## 1. Hub Architecture

```text
Hub UI
└─ shared save adapter
   └─ localStorage: elitemay-game-hub-v1

Game: Scrap Factory
├─ config.js   : Item / Recipe / Building / Tutorial definitions
├─ storage.js  : Save parse / normalize / backup / export-import
├─ world.js    : Three.js scene / FPS movement / raycast / build placement / visuals
└─ game.js     : Economy / inventory / machine process / transport / UI controller
```

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

## 3. World

### Factory Base

- 中心: `(0, 0)`
- Build可能範囲: `x/z ±20m`
- Grid: `2.5m`
- Starter Hopper: `(-5, 0)`
- Starter Seller: `(7.5, 0)`

### Scrap Yard

- Factory Gate東側
- Scrapは複数種をProcedural配置
- 回収後22〜38秒で同地点へRespawn

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
- `E`: Scrap回収 / Machine操作
- `B`: Build menu
- Build中: Left Click設置 / `R`回転 / Right Click or `Esc`終了
- `Tab`: Backpack + Hand Craft

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

### Domain Research

- Satisfactory: First-person Factory Buildingに探索・自動化を組み合わせる構造
  - https://www.satisfactorygame.com/
- Steam / game launcher系: Libraryを主役にし、Play対象とStatusを明確化
- Leadwerks Game Launcher: Dark library UI / playtime based browsing

### Transfer

- Game: Canvasを主役にし、HUDは常時情報を絞る
- Hub: Library / Progress / Statusを前面へ置く

### Rebuild

- Scrap / industrial safety markingをIdentityにする
- 暗すぎるPost-apocalypseではなく、明るい空 + 錆・Concrete + Safety Yellow

### Avoid

- Glass / Neon / Gradientを大量に重ねたGeneric Game UI
- 大きなLanding Page HeroだけでLibraryが下へ追いやられる構造
- 未完成GameをPlayableに見せるCard

## 10. Dependencies

Three.js `0.185.0`をjsDelivrからES Moduleとして読み込む。

CDN障害時は3D Gameは起動できない。HubとSave DataはThree.jsに依存しない。

## 11. Known MVP Limits

- Mobile Touch FPS操作なし（Desktop primary）
- Directional Conveyorは未実装
- Enemy / Weapon / HealthはMVP後
- 3D外部Model / Textureなし
