# Work Report

Date: 2026-09-05

## Current Milestone

`Scrap Factory` は **Final Phase: Mega Factory Stability / Main Clear** まで実装。

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
- clear-after Optimization objectivesの拡張
- Factory Optimization / Challengeのlong-term content

### Final Quality
- final Hybrid Asset / Lighting / VFX / LOD quality pass
- Mega Factory Browser / Performance / Visual Review
- gameplay balance / playtest

これらは今回のMain Clear実装と混同して完成済み扱いにしない。
