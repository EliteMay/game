# Work Report

Date: 2026-09-04

## Scope

空の`EliteMay/game` RepositoryにGame HubとGame 01 `Scrap Factory`のPlayable MVPを新規作成。

## Implemented

### Hub

- Launcher / Library型Home
- Playable / Plannedの明確なStatus
- Scrap Factory Save Summary
- Total Play Time
- Save JSON Export / Import
- Responsive layout

### Scrap Factory

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

## Visual Research

- Satisfactory official site: first-person factory building / exploration / automationのTask構造を確認
- Game launcher / Steam系UI: LibraryをFirst Viewの主役にする方向を採用
- Surface copyはせず、Scrap / industrial safety languageへRebuild

## Validation

- JavaScript syntax: local `node --check`
- JSON parse: local validator
- Local HTML refs: local validator
- Required files / profiles: local validator
- GitHub Actions workflow追加

## Verification State

- Implemented: Yes
- Static Validated: Yes（Commit前ローカル）
- Browser Validated: Pending
- Visual Reviewed: Pending final browser screenshot / live Pages
- GitHub Pages Deploy: Pending repository Pages source enablement / workflow run
- User Validated: Pending

## Known MVP Limits

- Mobile touch controlsなし
- Conveyor directionはVisualのみ、物流は4-neighbor無向Network
- Combat / Weapon / additional zonesはMVP後

## Next Validation

1. GitHub Pages SourceをGitHub Actionsへ設定
2. Deploy後URLでHub → Game → collect → sell → build → automate → reloadを確認
3. Chromium / FirefoxでPointer LockとFPSを確認
4. ScreenshotでHub / Boot / Gameplay / Build MenuをVisual Review
