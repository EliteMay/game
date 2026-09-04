# Work Report

Date: 2026-09-04

## Scope

`EliteMay/game`のGame HubとGame 01 `Scrap Factory`をPlayable MVPから、Steam掲載相当を目標に継続改善。

今回の重点:

- Visual Foundation V2のRuntime不具合修正
- ConveyorをVisual-only rotationからDirectional Logisticsへ昇格
- Conveyorの設置後編集 / 解体を追加
- Tutorial / Shortcut / Guide / Machine説明を増やし、初見でも操作を理解できる状態へ改善

## Implemented

### Hub

- Launcher / Library型Home
- Playable / Plannedの明確なStatus
- Scrap Factory Save Summary
- Total Play Time
- Save JSON Export / Import
- Responsive layout

### Scrap Factory / Gameplay Base

- Three.js first-person 3D world
- WASD / Sprint / Jump / Pointer Lock
- Scrap Yard + Factory Base
- Scrap respawn
- 12-slot backpack
- Direct selling
- Build mode / 2.5m grid / rotation
- Hopper / Seller / Crusher / Smelter / Conveyor / Storage
- Machine buffers + processing cycles
- Hand crafting
- Cash / Revenue
- Tutorial contract / free-play transition
- Autosave / recovery copy / reset / export
- Graphics / sensitivity / volume / FPS settings
- Procedural Web Audio sound

### Visual Foundation V2

- Gradient Sky / Cloud / Fog
- Procedural Concrete / Dirt Texture
- Oil stain / Lane marking / Hazard stripe
- Chain-link fence / Gate gantry / Workshop / Awning / Floodlight
- Container / Scrap pile / Tire / Barrel / Cable spool / Crushed car / Crane
- 遠景Silo / Chimney / Pipe bridge / Industrial silhouette
- Collectible Scrap 4種類の専用形状
- Machine用途別Silhouette
- Interaction Marker
- Head Bob / Sprint FOV
- Static sceneryとBuild placement Collision連携

### Runtime Visual Bug Fix

User screenshotをRuntime Evidenceとして次を修正。

- Chain-link panelが支柱から90°ずれる問題
- Fence visual / collider alignment
- Chain-link shadowの巨大格子影
- Collectible Scrapの固定Yによる浮き
- Spawn / Respawn双方でBounding Box接地

### Directional Conveyor / Factory QoL Update

User feedback:

- Conveyorを壊せない
- Conveyorの向きを設置後に変えられない
- Crusher outputが逆向きへ流れる
- 説明が少なすぎる
- Button / Key説明が欲しい

対応:

- `logistics.js`を追加し、Conveyor `rotation`をActual transport ruleへ接続
- 黄色い矢印 = 実搬送方向へ統一
- Source Machineから最初のBeltはInput側がSourceへ接している場合のみ搬送開始
- Conveyorは自分の矢印方向1CellへだけOutput
- Crusher Input側の逆向きBeltへ完成品が逆走しない構造へ変更
- 設置済みConveyorを`E`で開けるよう変更
- Conveyor Panelに`右へ90°回転` / `向きを反転`を追加
- Rotation変更をReloadなしでWorld Meshへ反映
- `F` Dismantle Mode追加
- Player-built設備をLeft Clickで撤去
- 建築費100%返金
- Machine Buffer内のItemをInventoryへ安全に返却
- Inventoryへ収まらない場合はItem loss防止のため撤去拒否
- Starter Hopper / Sellerは固定設備として維持
- `O` Field Manual / Codex追加
- HUD下部にStatic Shortcut Bar追加
- Build Mode / Dismantle ModeにDynamic Hint追加
- Machine PanelへDescription / Recipe Flow / Seconds表示追加
- Tutorial本文を「何をするか + どのKeyを使うか」まで拡充
- SettingsへShortcut Bar表示ON/OFF追加

## Factory Game Research

Gameplay UX / Logisticsの参考として、見た目をコピーせずTask structureを確認。

- Satisfactory Official Wiki / Conveyor Belts
  - Input / Output方向をVisualで明確化し、Belt DirectionをActual logisticsとして扱う
- Satisfactory Official Wiki / Build Gun
  - Dismantle Mode / build hologram / guideline / quick interaction
- Satisfactory Official Wiki / HUD
  - Static shortcutとContextual shortcutを分ける
- Satisfactory Official Wiki / Controls / Onboarding
  - Codexを通常Gameplayからいつでも参照可能にする
  - Objective中にも具体的なKey promptを表示
- Factorio Wiki / Tutorial / Quick Panel
  - Goal-driven tutorialとTips / information panelを分離

採用したTransfer:

```text
Directional logistics
+ Dismantle mode
+ Static shortcut
+ Contextual shortcut
+ Re-openable Codex
+ Explicit tutorial instructions
```

## Save / Compatibility

今回もSave Schemaは変更していない。

- Root key: `elitemay-game-hub-v1`
- Schema Version: `1`
- Building `rotation`は既存fieldをそのままActual Logisticsへ利用
- `settings.showShortcuts`は旧Saveに存在しなくてもDefault `true`で補完
- Building ID / position / type contractを維持

注意:

旧VersionではConveyor rotationが物流に影響しなかったため、既存FactoryのBelt向きによってはUpdate後にLineが停止する可能性がある。`E`でConveyorを回転 / 反転すれば修正できる。

## Validation

### Existing

- Initial MVP: JavaScript / JSON / local refs / Project profiles
- Visual Foundation V2: PR CI Pass / Main CI Pass / Pages Deploy Pass
- Runtime Visual Fix: PR CI Pass / Main Pages Deploy Pass

### Directional Logistics / UX

- `logistics.js` pure logic化
- `scripts/logistics.test.mjs`追加
- Test coverage:
  - Rotation 4方向
  - 直進 → 90° turn route
  - Sourceへ向いた逆向きConveyorへItemを出さない
- Project Validatorで次をRequired化
  - `game-ux.css`
  - `logistics.js`
  - `world-runtime.js`
  - `logistics.test.mjs`
- UX control ID presenceをValidatorで確認
- PR CIで最終確認後にMergeする

## Verification State

Directional Logistics / UX Update:

- Implemented: Yes
- Local pure logistics test: Pass
- Local JavaScript syntax: Pass for authored changed modules
- GitHub PR CI: Pending at this report revision
- Browser Validated: Pending published build
- User Validated: Pending published build
- Save Schema Compatibility: Maintained

## Known Limits

- Mobile touch controlsなし
- Splitter / Merger専用設備は未実装
- Conveyor speed tier / throughput bottleneckは未実装
- Combat / Weapon / additional zonesは後続Phase
- 外部3D Model / Image Textureはまだ使用せずProcedural Geometry中心
- Dismantle target / Pointer Lock / Direction arrowの最終操作感は公開BrowserでReviewが必要

## Next Validation

1. Directional Logistics / UX Pull Request CI
2. Merge後GitHub Pages Deploy
3. 公開URLで`O` Guide / Shortcut表示
4. `F` → Conveyor撤去
5. Conveyor `E` → 90°回転 / 反転
6. Hopper → Belt → Crusher → Belt → Sellerで矢印方向だけ搬送
7. Crusher Input側BeltへOutputが逆走しないこと
8. Save → Reload後もConveyor rotationが保持されること
