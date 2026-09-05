# Work Report

Date: 2026-09-05

## Current Milestone

`Scrap Factory` は **Phase 5-A: Military Facility / Drone Automation** まで実装。

通常GameplayのRank Upは **Rank 1 → 7** まで接続した。

今回のVertical Slice:

```text
Rank 6
→ 軍事施設
→ Access Card
→ Security Grid OFFLINE
→ Drone Control Bay ONLINE
→ Drone Control Blueprint
→ Drone Control Research
→ Drone Port
→ Rare AlloyをFactory Storageへ自動搬送
→ Rank 7
```

Conveyor Mk.3 / Priority / Overflow / multiple Drone route managementはPhase 5-B以降へ残す。

---

## Implemented

### 1. Military Facility Exploration

追加:

- `exploration/military.html`
- `exploration/military.css`
- `exploration/military.js`
- `exploration-core-v3.js`

Persistent zones:

- Checkpoint
- Security Yard
- Drone Control Bay
- Command Bunker

Main Objective:

```text
Security Access Card回収
→ Security Grid停止
→ Drone Control Bay復旧
→ Drone Control Blueprint回収
```

Optional:

- Service Gate shortcut

Guaranteed reward:

- `military_drone_control_blueprint`
- Research Data +3
- `military-alloy-cache` Resource Point

Rewardはidempotent。

### 2. HP / Security Threat

Exploration SessionへAdditiveに `hp` を追加。

- Default 100
- Normalize 0–100
- Security Grid稼働中のTurret範囲で22 Damage
- HP 0でExpedition failure
- Failure / AbandonはCurrent Session Lootのみ失う
- Discovered Zones / Security shutdown / Shortcut / Blueprint progressは保持

Weapon systemを先に導入せず、Access Card → Security Grid停止という非戦闘Routeを成立させた。

### 3. Drone Control Research

追加Research:

```text
id: drone_control_systems
Rank: 6
Research Data: 3
Blueprint: military_drone_control_blueprint
Unlock: building:drone_port
```

### 4. Rare Alloy / Drone Port

追加Item:

- `rare_alloy` / 軍用レア合金

追加Building:

- `drone_port`
- Cost `$760`
- Rank 6 + Drone Control Research
- 65 Power

Drone Port Production:

```text
military-alloy-cache secured
→ Drone Port / 12 sec
→ Rare Alloy ×1
```

Production implementationは既存Generic Recipe Runtimeを再利用。

Outputは既存Directional Logistics / Storage Back Pressureをそのまま使用する。

### 5. Rank 6 → 7

`PLAYABLE_MAX_RANK = 7`。

Mandatory:

1. Military Main Objective complete
2. Drone Control Research complete
3. `military-alloy-cache` Resource Point secured
4. Drone Port → Small / Industrial Storage のRare Alloy Route成立

Optional 2つ:

- Military 3/4 zones discovery
- Service Gate
- Rare Alloy discovery
- Drone Port 2台
- Drone route throughput 3.0/s

Rank topology cacheは保存しない。

### 6. Drone Port Visual

Generic Box fallbackのまま完成扱いせず、`world-runtime.js`へ専用Procedural silhouetteを追加。

- Launch deck
- Control mast
- antenna / radar ring
- Docked Utility Drone
- status light
- active spinner

Save / Production logicとは分離。

---

## Compatibility / Contracts Preserved

- Root Save Schema 1
- Progression Schema 1
- Exploration Schema 1
- `elitemay-game-hub-v1`
- Existing Factory Layout
- 2.5m Build Grid
- Factory coordinate system
- Directional Logistics visual = runtime direction
- Quick Build 1〜5
- Rank 1 → 6 existing progression behavior
- Residential / Industrial Exploration behavior
- Smart Sorter behavior
- Storage Back Pressure / no item loss
- Power shortage state preservation
- GitHub Pages Relative Paths

旧SaveへMilitary Area / HP / Rare AlloyをAdditive補完する。

---

## Regression Coverage

追加:

- `scripts/military-exploration.test.mjs`
- `scripts/phase5a.test.mjs`

既存 `scripts/progression.test.mjs` は旧Rank6 cap assertionのみ新仕様へ更新し、Rank 1〜6の既存判定は維持。

Coverage:

- Military Rank gate
- Exploration Schema v1 additive normalization
- Session HP normalization
- Access → Security → Drone Bay dependency
- Shortcut
- Blueprint guaranteed + reward exactly once
- Resource Point acquisition
- Return / Abandon
- Drone Research Blueprint Gate
- Drone Port Rank / Research Gate
- Drone Port → Storage route
- Route throughput
- Rank 6 → 7 eligibility
- Rank 7 phase cap
- Existing logistics / management / progression / power / storage / residential / industrial / Phase 4-B regressions

---

## CI

Initial PR run #83 failed because the previous Regression intentionally fixed `PLAYABLE_MAX_RANK = 6`.

Phase 5-A requirements extend the cap to Rank 7, so the obsolete cap assertion was updated without weakening prior Rank behavior tests.

Implementation + dedicated Drone Port visual Head:

```text
fa7a691e4610df2ac9cb9960e36c96d6c9a1ac8c
Validate Web Game / run #85
result: success
```

Documentation更新後の最終HeadはMerge前に再検証する。

---

## Not Yet Verified

Static CIでは保証できない:

- Pointer Lock実操作
- Military Facilityの各Objectiveへの実到達性
- Facility propsとplayer colliderの一致
- Turret threat radiusの一人称可読性
- HP failure時の体感
- Drone Port Build Preview / first-person scale
- WebGL FPS / draw cost

これらはBrowser Validation対象。

---

## Remaining Work

### Phase 5-B

- Conveyor Mk.3
- Priority Logistics
- Overflow Logistics
- multiple Resource Point / Drone route assignment
- Advanced Power

### Later

- 武器 / patrol AIを含む軽戦闘の本実装
- 崩壊した研究施設
- Fabricator
- Advanced Drone
- Mega Factory / Main Clear
- Final Hybrid Asset quality pass

Phase 5-AはRank 6→7の主要Loopを接続したが、Rank 6 Advanced Logistics全体を完了した扱いにはしない。
