# Project Learnings

## 2026-09-04 / Initial Build

### Keep

- Game Hubと各Gameを分離し、Saveだけ共有する構造は追加Gameを増やしやすい。
- 外部Assetを使わずProcedural Geometryにすると、LicenseとRepository Sizeを抑えながら初期Gameplayを検証できる。
- Hubで未完成Gameを`PLANNED`表示に限定すると、PrototypeをPlayableと誤認しにくい。

### Watch

- Conveyorの無向BFSはMVPには単純で安定するが、複雑な工場では意図しない経路を選びうる。Directional化するときはSave互換性と既存Layoutを考える。
- WebGL GameはStatic Validationだけでは操作感・FPS・Pointer Lockを判断できない。Browser Validationを必ず別工程にする。
