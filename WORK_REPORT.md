# Work Report

Date: 2026-09-06

## Current Milestone

`Scrap Factory` は **Post Clear: Factory Optimization Objectives** まで実装。

Rank Upは **Rank 1 → 7**。Rank 7はFinal Chapter開始点で、Rank 8は追加しない。

```text
Rank 7
→ Ruined Research Facility Three Labs
→ Special Cargo 3 / 3 Factory secured
→ Experimental Fabrication Research
→ Fabricator
→ AI Control Module / Experimental Frame / Experimental Power Module
→ Central Core Gate
→ Core Stabilizer
→ Experimental Archive
→ Experimental Technology Research
→ Advanced Drone / Experimental Power
→ Automated Plate / Motor / Circuit production
→ Experimental Component Fabricator
→ Autonomous Industrial Core Fabricator
→ Autonomous Industrial Core → Storage complete directional line
→ Mega Factory 180秒連続安定稼働
→ MAIN CLEAR
→ Factory Optimization Objectives
→ OPTIMIZATION MASTERED
→ same SaveでFactory Optimization継続
```

---

## Requirements Mapping

`REQUIREMENTS.md` のRank 7 → Main Clear順序:

1. Robotics Lab
2. Materials Lab
3. Energy Lab
4. 特殊部品をFactoryへ持ち帰る
5. Factoryで最終部品を製造
6. Central Core攻略
7. Experimental Technology Research
8. 最終製品完全自動Line
9. Mega Factory安定稼働
10. Main Clear

実装対応:

- Phase 6-A: 1〜4
- Phase 6-B: 5〜7
- Phase 6-C: 8
- **Final Phase: 9〜10**

これによりMain progressionはRequirement上Main Clearまで接続した。

---

## Phase 6-C Baseline Preserved

Final PhaseはPhase 6-Cを置き換えず、その上へ履歴Objectiveだけを追加した。

Phase 6-Cで維持している主要Contract:

- `PLAYABLE_MAX_RANK = 7`
- Advanced Drone 5 resource route
- Utility / Advanced Drone tier compatibility
- automated Iron Plate / Motor / Circuit / Control Unit recipes
- Experimental Component Fabricator
- Autonomous Industrial Core Fabricator
- Experimental Power System 480 Power / Rare Alloy fuel
- Final Storage directional route
- actual Autonomous Industrial Core production evidence
- Final Automation completion stateはpersistent flagではなくFactory graphから導出
- Existing Save / Factory layout / Rank 1→7 / Exploration / Power / Storage / Quick Build 1〜5互換

---

## Final Phase Implemented

### 1. Mega Factory Analyzer

Created:
- `games/scrap-factory/final-phase.js`

`analyzeMegaFactory(game)` は現在のFactory stateから次を導出する。

- Phase 6-C `analyzeFinalAutomation(game).qualifies`
- Factory全体のPower statusが`ok`
- Final Storageに空き容量がある
- Final route throughput > 0

Final専用のPower / Logistics / Production simulationは追加していない。

### 2. Continuous Stable-operation Objective

Current implementation target:

```text
MEGA_FACTORY_STABLE_SECONDS = 180
```

`REQUIREMENTS.md` の「一定時間」に対する現在のBalance値として3分を採用。

Rules:

- stable条件成立中だけtimer進行
- 1 updateで最大1秒だけ加算
- Tab hidden / boot中は進行しない
- 条件が崩れたらCurrent streakを0へ戻す
- best streakは履歴として保持
- 180秒到達でMain Clearを1回記録

大きいFrame delayやbackground時間を一括加算してClearしない。

### 3. Historical Save Telemetry

Updated:
- `games/scrap-factory/storage.js`

Additive state:

```text
finalChapter = {
  version: 1,
  megaFactoryStableSeconds: 0,
  megaFactoryBestSeconds: 0,
  mainClearedAt: null,
  clearAcknowledgedAt: null
}
```

理由:

- Final Automation topologyは現在stateから再計算可能なのでSave flag不要
- 「何秒連続で安定していたか」は履歴を持たないと復元不能
- そのため履歴Telemetryだけをpersistentにする

Preserved:

- `elitemay-game-hub-v1`
- Root Save Schema 1
- Game Schema 1
- Progression Schema 1
- Exploration Schema 1
- Existing Factory / inventory / exploration / progression state

### 4. Main Clear Historical Milestone

180秒連続安定稼働達成時に `mainClearedAt` を保存。

Main Clear後:

- Rankは7のまま
- Factoryを変更してもClearを取り消さない
- 同じSaveでFactory Optimizationを続けられる
- Clear overlay acknowledgementを別時刻で保持
- Reset時だけ初期状態へ戻る

### 5. Final Phase UI

Created:
- `games/scrap-factory/final-phase-ui.js`

UI:

- Rank 7 HUDへFinal Phase / Mega Factory進行を表示
- Progression Final ChapterへStep 9 → 10 statusを追加
- Automation ConsoleへMega Factory Stability statusを追加
- Main Clear時に専用overlayを表示
- Clear後はOptimization継続可能と表示

1秒pollingでlive runtime game objectを確認する。

self-triggering `MutationObserver` は使わない。

### 6. Production Runtime Wiring

Updated:
- `games/scrap-factory/index.html`
- `games/scrap-factory/progression-ui.js`

`index.html` がproductionで `progression-ui.js` を読み込むようにした。

これにより既存:
- Rank / Research UI
- Automation Console

と今回:
- Final Phase UI

が同じstable entrypointから通常Gameplayへ接続される。

確認時、Phase 6-CまでのUI fileは存在していたがproduction HTMLから明示読み込みされていなかったため、Final Phase接続と同時にruntime wiringを修正した。

---

## Regression Coverage

Added:
- `scripts/final-phase.test.mjs`

Updated:
- `package.json`

Current `npm run validate`:

```text
scripts/validate.mjs
&& scripts/phase6b.test.mjs
&& scripts/phase6c.test.mjs
&& scripts/final-phase.test.mjs
```

Final Phase regression checks:

- Stable target = 180 sec
- delayed frame deltaは最大1秒
- explicit Main Bus representative layoutがMega Factory判定へ接続
- Final Automation qualifies
- whole Factory power status OK
- Final Storage capacity available
- Final route throughput > 0
- 30秒後にStorage満杯でCurrent streak reset
- best streak preservation
- 180秒連続安定稼働でMain Clear
- Main Clear timestamp記録
- Clear後のFactory変更でClearを取り消さない
- acknowledgementがidempotent
- additive `finalChapter` defaults
- Save Schema v1維持
- production HTML → `progression-ui.js` runtime wiring
- `progression-ui.js` → `final-phase-ui.js` wiring
- Final Phase UIにself-triggering MutationObserverがない

Phase 6-C Main Bus Regressionも継続して実行する。

```text
Advanced Sources
→ Merger
→ Conveyor Mk.3 Main Bus
→ Splitter
→ Machine
→ Merger
→ Main Bus
→ Final Storage
```

Test fixtureはactual Directional Logistics / Power / Production analyzerを迂回しない。

---

## CI Evidence

PR:

```text
#19 feat: add Mega Factory Final Phase and Main Clear
```

Documentation前のimplementation head:

```text
2f63912fc0c84b57c94b167ad4e99f262efb265b
Validate Web Game #141
```

Result:

- `project-contract`: success
- `baseline / baseline`: success
- `npm run validate`: success
- JavaScript syntax baseline: success
- JSON parse baseline: success

**これはdocumentation前headのEvidence。Documentation-inclusive final headとmerge後mainを再確認してから完成判定する。**

---

## Compatibility / Risk Review

### Preserved

- Rank 1→7
- No Rank 8
- Existing Save key / Schema numbers
- Existing Factory Layout
- Phase 6-A Three-Lab state
- Phase 6-B Central Core state
- Phase 6-C Final Automation state derivation
- 2.5m Grid
- Directional Logistics
- Storage Back Pressure
- Utility / Advanced Drone routes
- Power system
- Quick Build 1〜5
- GitHub Pages relative paths

### Intentional new persistent state

`finalChapter` はDerived completion cacheではなく、連続時間 / Clear時刻という履歴Telemetryだけを保存する。

---

## Reusable Learning

### Historical objectives need explicit telemetry; derived factory state does not

Final AutomationはFactory graphから再計算できるのでSave flagを持たない。

一方で「連続180秒安定していた」は現在snapshotだけでは再現できない。

```text
current topology / power / routes
→ derive every time

continuous duration / clear timestamp
→ persist minimal history
```

と分離する。

### Continuous runtime objectives must not grant background time

Frame delay / hidden Tab /再開後deltaをそのまま加算すると、実際に安定稼働を見ていない時間までClearへ使えてしまう。

Final Phaseでは:

- visible gameplay時だけtick
- 1 tick最大1秒
- instabilityでCurrent streak reset

として実時間Objectiveの意味を守る。

### Runtime UI should not complete itself through broad MutationObserver patches

Progression / Automation UIへ後付け表示する場合でも、`document.body`全体を監視し、自分のDOM変更で再発火する構造は避ける。

今回のFinal Phase UIはbounded pollingへ統一した。

### End-to-end game tests should use explicit representative layouts

自由配置ゲームのE2E TestでFixture自身に最適routingを設計させず、buildableな代表Layoutを明示し、Product runtimeだけを動的検証する。

---

## Not Yet Verified

Static CIでは次を保証しない。

- 実ブラウザでのFactory操作
- Progression / Automation / Final HUD actual layout / overflow
- Main Clear overlayの見た目 / Pointer Lock復帰
- Recipe / Drone Route apply + reloadの操作感
- Experimental PowerへのRare Alloy供給の実プレイ感
- Advanced Drone / Experimental Power first-person silhouette / scale
- Assembler / Fabricator Build Preview readability
- Collider / Placement feel
- Mega Factory layout ergonomics
- WebGL FPS / 150〜250 Machine相当Performance
- Firefox / Chromiumでの実操作
- 180秒の実プレイBalance / pacing
- Final production balance / throughput tuning
- final Visual Review / Screenshot Review

Browser / User Validation対象として残す。

---

## Remaining Work

Main progressionのRequirement 1〜10は実装済み。

後続:

### Post Clear / Optimization
- Core Factory Optimization Objectives 4種は実装済み
- Factory Optimization / Challengeのlong-term content追加は今後の拡張対象

### Final Quality
- final Hybrid Asset / Lighting / VFX / LOD quality pass
- Mega Factory Browser / Performance / Visual Review
- gameplay balance / playtest

これらは今回のMain Clear実装と混同して完成済み扱いにしない。

## 2026-09-06 — Home / Player Upgrade / Tutorial Implementation

### Implemented

- Factory建築Grid外の固定Home、Door、Bed、PC、Home Storage、Exploration Workbench
- New Game Home Spawn / Bed Manual Save / 既存Save座標維持 / Bed使用後Home Respawn
- PC Player Upgrade Tree（Rank 1〜7、Main Progression非必須）
- Backpack I / II / IIIのSlot容量拡張とFactory/Exploration共通容量判定
- Home Storage手動移動、Quick Deposit、Auto Sort表示、Loadout Preset
- Loot Scanner / Material Tracking / Resource情報 / Rare Detection / Sprint Efficiency
- Secure Case I / IIと探索失敗時保護
- Home起点Basic Tutorial、Skip/Replay、Tutorial Library、Next Goal、Stuck Help
- Machine / Logistics / Power / Storage / Drone / Home / Final Phase Diagnostics
- Additive Save Migration（Schema v1維持）とHome regression tests
- Home外観へ玄関フレーム、窓、軒、外灯、`HOME 01 / PLAYER QUARTERS`サインを追加し、Factory設備と視覚的に区別

### Preserved Contracts

- Rank 1〜7 / Main Clear / Mega Factory Final Phase
- Directional Logistics / 2.5m Grid / Factory Layout
- 既存Save Schema v1と旧Player位置
- BackpackはSlot制のみ。重量制・Weight Penaltyは追加していない。

### Static Validation

Home統合後の `npm run validate` はGitHub Actionsで成功。

確認範囲:

- 75 JS/MJS files / 7 HTML targets
- Logistics / Management / Progression / Power / Storage
- Residential / Industrial / Military / Research exploration
- Phase 4-B / Phase 5-A / Phase 5-B / Phase 5-C / Phase 6-A / Phase 6-B / Phase 6-C
- Final Phase / Mega Factory / Main Clear
- `scripts/home-system.test.mjs`
- Backpack Migration / Atomic Upgrade purchase / Secure Case / Tutorial progression

### Chromium Browser Validation

Temporary CI browser harnessでChrome + WebGL/SwiftShaderを使い、production Runtimeを実際に起動して確認した。

Final successful run:

```text
Home Browser Smoke #8
Run: 33996946432
Head: 205f425b3ea777aa14b1d99ca1be98d66f5b8270
Result: success
```

確認済み:

- Game boot / Home 3D scene生成
- Fresh SaveがHome Bed付近から開始
- Backpack初期容量 12 Slot
- Home Door open時Collider解除 / close完了後Collider復帰
- Bed使用でHome Respawn有効化
- Bed Manual SaveがlocalStorageへ永続化
- Player Management PC表示
- Tutorial Library tab接続
- 1440×900でpage-level horizontal overflowなし
- Home未導入の旧Saveを別Browser Contextへ投入し、旧Player座標 `(5, 5)` をGame state / World spawn双方で保持
- Migration後 `introducedFromLegacy = true`

CIではThree.js CDN依存による不安定さを避けるため、Smokeのcheckout内だけ同一version `three@0.185.0` をlocal配信した。ProductionのCDN設定自体は変更していない。

### Visual Review

Noto CJKを導入したChromium Screenshotを確認。

- Player Management PC: 日本語表示、6 tabs、status cards、3-column Upgrade Tree、disabled state、縦scroll、横overflowに大きな崩れなし
- Home exterior: 最初の暗い箱状外観を不採用とし、corrugated wall / windows / yellow entrance frame / porch / exterior light / Home signを追加後に再Screenshot Review
- 改善後HomeはFactory設備と区別でき、入口が視認できる状態

Browser Smoke用Workflowとintegration patch scriptsは検証後に削除し、PRへ恒久実装だけ残す。

## 2026-09-06 — Post Clear Factory Optimization

### Implemented

- Main Clear後のみ解放されるFactory Optimization Objectiveを4種追加
  - Power Headroom
  - Buffer Reserve
  - Logistics Backbone
  - Redundant Automation
- Rank 8 / 新通貨 / Main Clear再判定は追加せず、既存Power / Storage / Logistics / Final Automationを再利用
- 現在条件はFactory stateからderiveし、達成履歴だけ `postClearOptimization` にadditive保存
- Objective達成後にFactoryを組み替えても履歴は取り消さない
- 4 / 4達成で `OPTIMIZATION MASTERED` を記録
- Main Clear後HUDから専用Optimization Panelを開ける
- `post-clear-optimization.test.mjs` を通常Validationへ追加

### Preserved Contracts

- Rank 1〜7 / No Rank 8
- Main Clearは歴史的Milestoneのまま
- Directional Logistics / 2.5m Grid / Factory Layout
- Root / Game / Progression / Exploration Save Schema v1
- Home / Player Upgrade / Tutorial / slot-based Backpack

### Verification

Final successful validation:

```text
Post Clear Browser Smoke #5
Run: 33998104085
Head: 99de3908fe800bc4ef2ea83d724550aaaaeb607d
Result: success
```

確認済み:

- 現行headで `npm run validate` 成功
- Main Clear確認済みSaveでOPTIMIZE HUDが解放
- Pointer Lock中に `K` でFactory Optimization Panelを開ける
- 4 Objectiveと現在進捗を表示
- `K` / `Escape` でPanelを閉じられる
- Objective達成履歴を保存し、Reload後も `1 / 4` を保持
- 1440×900でpage-level horizontal overflowなし
- page error / meaningful console error / request failureなし

### Visual Review

Noto CJKを導入したChromium Screenshotを確認。既存Factory OSの工業UIと整合し、4 Objectiveのタイトル・進捗バー・現在条件が判読可能で、横overflowや大きなレイアウト崩れは見られなかった。

Browser Smoke用Workflowは検証後に削除し、恒久実装だけをPRへ残す。

## 2026-09-06 — Save Reset Resurrection Bug Fix

### Symptom

Settingsの「Scrap Factoryのセーブを初期化」で確認後にReloadしても、削除前の進行データが復活することがあった。

### Root Cause

`resetGameSave()` 自体はDefault Saveを書き込んでいたが、その直後の `window.location.reload()` で `beforeunload` / `visibilitychange` が発火し、`game.js` が保持している削除前のruntime objectを `saveGameSave()` で再保存していた。

```text
Reset button
→ Default Save write
→ reload
→ page lifecycle autosave
→ stale runtime state write
→ old progress resurrected
```

### Fix

- `storage.js` に `resetPendingReload` guardを追加
- Reset成功後からReload完了まで `saveGameSave()` のlate writeを拒否
- `scrap-factory-management-v1` のFactory Management補助stateもReset時に削除
- Save key / Schema v1 / Rank 1〜7 / Main Clear等の既存Contractは変更しない
- `scripts/reset-save.test.mjs` を通常Validationへ追加

### Verification

- PR #22の `npm run validate`: success
- Chromium Browser Smoke Run `33998751546`: success
- 進行済みfixture（$9999 / Revenue 12345 / Scrap 77 / Main Clear済み）を保存
- Reset buttonを実行し自動Reload
- Reload後 `$40 / Revenue 0 / Scrap 0 / Main Clear null` を確認
- Factory Management補助state削除を確認
- さらに2回目Reload後も `$40` のままで旧Saveが復活しないことを確認
- temporary Browser Smoke workflowは検証後に削除

## 2026-09-06 — Fresh Spawn Movement Fix

- Symptom: Save初期化後のFresh StartでWASDが反応しないように見えた。
- Root Cause: `HOME_RESPAWN_POSITION` がHome Bed colliderへ重なっており、入力は取得できていたが移動結果がcollisionで毎Frame拒否されていた。IME / 日本語入力は原因ではない。
- Fix: Fresh/Home respawnをBed collider外の `(-10.25, 36.1)` へ移動。既存Saveの現在位置は変更しない。
- Regression: `scripts/home-system.test.mjs` でrespawnとBed colliderの重なりを禁止。
- Browser verification: Fresh Spawn Movement Smoke Run `33999840395` success。Pointer Lock中にWを押し、`z=36.10 -> 36.62` の実移動を確認。

## 2026-09-06 HUD / Tutorial Hotkey UX Fix

- HOME distance chip was moved away from the upper-right Contract HUD so the two elements no longer overlap.
- Build (`B`) and Inventory (`Tab`) panels now use the same key as a toggle: press once to open, press again to close and resume gameplay.
- Guide (`O`) now follows the same toggle behavior for consistency.
- Build / Inventory panels show the current Tutorial objective inside the panel, so the instruction that led into the panel does not disappear while the player is acting on it.
- Repeated action-key events are ignored for `B` / `Tab` / `O` / `F` to prevent hold-to-flicker behavior.
- Chromium Browser Smoke Run `34000578539`: success at 1536×864. `B` / `Tab` / `O` open-close toggles, Pointer Lock restore, contextual Tutorial visibility, and HOME/Contract non-overlap were verified.
- Screenshot review: Build panel keeps the current Tutorial directly below its header without obscuring the equipment list; HOME marker has clear separation from the upper HUD.

## 2026-09-06 — Phase 7 Final Visual / Performance Quality Pass

Earlier `Final Quality` / `Browser Performance / Visual Review` remaining items in this report are superseded by this section.

### Implemented

- Phase 5-B〜6-Cで既に作られていた高度Machine VisualをProduction Runtimeへ正式接続
- Conveyor Mk.2 / Mk.3、Splitter / Merger / Smart Sorter / Priority / Overflow
- Battery / Industrial Storage / Logistics Warehouse
- Assembler variants / Utility + Advanced Drone / Industrial Generator
- Fabricator / Autonomous Core Fabricator / Experimental Power System
- 高度設備のBuild Preview / transparency / post-placement rotation
- type-batched `THREE.InstancedMesh` proxyによる遠距離LOD
- 距離ベースShadow / Animation / Particle budget
- bounded Spark / Heat / Energy feedback
- transfer packet距離制限 + maximum count
- Performance ModeのLow visual budget
- Rendering layerはFactory Simulation / Logistics / Power / Save resultを変更しない

### Baseline / Stress Evidence

同一Chromium + SwiftShader fixture。絶対Frame timeは実GPU FPSとして扱わず、同一環境の相対比較だけに使う。

| 264設備 | Draw calls | Triangles |
| --- | ---: | ---: |
| 旧Production baseline | 6,054 | 134,084 |
| Phase 7 High | 1,285 | 58,944 |
| Performance Mode | 134 | 8,898 |

Highでは264設備中72をdetail、192をinstanced proxyへ移行。Performance Modeでは12 detail / 252 proxy。Visual transfer packetsはHighで最大140へbounded。

### Browser / Visual Validation

Final successful visual run:

```text
Phase 7 Visual Review #5
Run: 34035243298
Head: 0c09735ecd6f2b69935403f42f02270e89503cfe
Result: success
```

確認済み:

- Production Runtime patch active
- Phase 5-B visual count / Phase 6-C late visual count
- enhanced Build Preview + transparency
- post-placement rotation
- 264設備Stress
- Packet budget
- Performance Mode: Low visual budget / shadows off / spark・heat・energy off
- 1440×900 horizontal overflowなし
- page errors 0
- High / Stress / Performance Mode screenshot目視

Visual Review #4のPerformance Mode screenshotでProcedural SkyがCamera Far Clipに切られ、大きな明るい多角形として見える問題を発見。Performance Modeのcamera farを145へ縮める方式をやめ、skyは190のfrustum内に維持し、Factory draw distanceは既存のLOD / Culling budgetで削減するよう修正した。Review #5 screenshotで崩れ解消を目視確認済み。

### Static Regression

- `scripts/phase7-settings.test.mjs`
- `scripts/phase7-visual.test.mjs`
- `npm run validate` へ統合
- Phase 7 layerが `RECIPES` / Power snapshot / Progression state等のSimulation ownershipを持たないことをRegressionで固定

### Preserved Contracts

- Rank 1→7 / Main Clear / Post Clear Optimization
- Save Schema v1
- Existing Factory Layout / 2.5m Grid
- Directional Logistics / Power / Storage Back Pressure
- Home / Player Upgrade / Tutorial
- Factory Simulation resultはGraphics Quality / Performance Modeで変化しない

### Still Requires Real-device / Actual Playtest

- 実GPU環境で通常60 FPS / Mega Factory約45 FPS目安を満たすか
- Firefox / Chromium Pointer Lock実操作
- Collider / Placement / Mega Factory layout ergonomics
- 180秒stable-run pacing / final production balance

CIのSwiftShader stress結果だけから実機45 FPS達成とは扱わない。
