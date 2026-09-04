# Work Report

Date: 2026-09-04

## Scope

空の`EliteMay/game` RepositoryにGame HubとGame 01 `Scrap Factory`のPlayable MVPを新規作成し、その後Visual Foundation V2として「箱中心のPrototype感」を減らす環境アート改修を実施。

## Implemented

### Hub

- Launcher / Library型Home
- Playable / Plannedの明確なStatus
- Scrap Factory Save Summary
- Total Play Time
- Save JSON Export / Import
- Responsive layout

### Scrap Factory / Gameplay

- Three.js first-person 3D world
- WASD / Sprint / Jump / Pointer Lock
- Scrap Yard + Factory Base
- Scrap respawn
- 12-slot backpack
- Direct selling
- Build mode / 2.5m grid / rotation
- Hopper / Seller / Crusher / Smelter / Conveyor / Storage
- Machine buffers + processing cycles
- Conveyor BFS transport + visible item packet
- Hand crafting
- Cash / Revenue
- Tutorial contract / free-play transition
- Autosave / recovery copy / reset / export
- Graphics / sensitivity / volume / FPS settings
- Procedural Web Audio sound

### Scrap Factory / Visual Foundation V2

- 単色背景からGradient Sky / Cloud / Fogへ変更
- Groundを単色PlaneからProcedural Concrete / Dirt Textureへ変更
- Oil stain / Lane marking / Hazard stripe追加
- Chain-link fence / Gate gantry / Workshop / Awning / Floodlight追加
- Scrap YardをContainer / Scrap pile / Tire / Barrel / Cable spool / Crushed car / Craneで構成
- 遠景にSilo / Chimney / Pipe bridge / Industrial building silhouetteを追加
- Collectible Scrapを4種類それぞれ専用形状へ変更
- Machineを用途別Silhouetteへ再設計
  - Hopper: Funnel / frame / discharge
  - Seller: Terminal / screen / bollards
  - Crusher: Twin roller / motor / chute / frame
  - Smelter: Furnace / chimney / pipe / glowing door
  - Conveyor: Belt / roller / rail / support
  - Storage: Corrugated container / frame / door
- Interaction Marker追加
- 軽いHead Bob / Sprint FOV変化追加
- Static sceneryとBuild placementのCollisionを連携
- Graphics LowではDust FXを無効化

### Runtime Visual Bug Fix

User screenshotをRuntime Evidenceとして次を修正。

- Chain-link visual panelが支柱から90°ずれて拠点内部を横切る問題を補正
- Fence visualと既存Colliderを同じ向きへ一致
- Chain-link textureの実長に応じたRepeat調整
- Alpha-tested Fence panelのShadowを無効化し、巨大な格子影を抑制
- Collectible Scrapを固定Y配置からBounding Box接地へ変更
- Initial Spawn / Respawnの両方で接地処理を適用
- Runtime fix moduleをValidatorのRequired fileへ追加

## Save / Compatibility

Visual Foundation V2およびRuntime Visual FixではSave Schemaを変更していない。

- Root key: `elitemay-game-hub-v1`
- Schema Version: `1`
- Building ID / position / type contractを維持
- 既存Saveはそのまま利用する設計

## Visual Research

- Satisfactory official: first-person factory building / exploration / automationのTask構造を確認
- Satisfactory factory screenshots: Machine以外のBelt / Pipe / Support / Floor / Backgroundが工場密度へ寄与する点を確認
- Scrap Mechanic: Modular PartsでもShape / Color coding / Industrial detailで役割を識別させる方向を確認
- Surface copyはせず、Scrap / industrial safety languageへRebuild

## Validation

Initial MVP:

- JavaScript syntax: local `node --check`
- JSON parse: local validator
- Local HTML refs: local validator
- Required files / profiles: local validator

Visual Foundation V2:

- Pull Request CI Pass
- Main push CI Pass
- GitHub Pages Deploy Pass

Runtime Visual Fix:

- `world-runtime.js`をProject validator対象へ追加
- Import Map routeをProject validatorで確認
- Pull Request CI / Pages Deployを最終確認する

## Verification State

- Implemented: Yes
- Static Validated: Runtime fix PR CI待ち
- Browser Evidence: User screenshotでV2 regression確認済み
- Browser Fix Validation: 公開後User確認待ち
- Save Compatibility: Schema変更なし

## Known Limits

- Mobile touch controlsなし
- Conveyor directionはVisualのみ、物流は4-neighbor無向Network
- Combat / Weapon / additional zonesは後続Phase
- 外部3D Model / Image Textureはまだ使用せず、Procedural Geometry / Runtime Canvas Texture中心
- 現実的なSteam級Visualへ近づけるには、今後Animation / Sound / Prop variation / authored 3D assetsの検討余地あり

## Next Validation

1. Runtime fix Pull Request CI確認
2. Merge後Pages Deploy確認
3. 公開URLでFenceが支柱に沿っていることを確認
4. Fenceを通過できないこと / Gateは通過できることを確認
5. 鉄くず・銅線・廃プラスチック・電子ジャンクが地面へ接地していることを確認
6. その後Visual polishを継続
