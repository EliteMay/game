# Game Hub

**Live Site:** https://elitemay.github.io/game/

完成度の高いブラウザゲームを1本ずつ追加していく個人Game Hubです。

現在のPlayable Game:

- **Scrap Factory** — 一人称3D / 探索 / 加工 / 工場自動化 / Directional Logistics / Power / Drone Automation / Progression / Research

## Source of Truth

- `REQUIREMENTS.md` — ゲーム内容・進行・探索・Visual方針の確定要件
- `SPEC.md` — 現在実装されている技術仕様とRuntime / Save Contract
- `WORK_REPORT.md` — 実装・検証・未確認事項
- `PROJECT_LEARNINGS.md` — 再利用価値のある実装上の学び

未実装要件を実装済みとして扱いません。

## 現在のPlayable状態

`Scrap Factory` は **Phase 6-B: Fabricator / Central Core / Experimental Technology** まで通常Gameplayへ接続しています。

通常のRank Upは **Rank 1 → 7**。Rank 7はMain ClearではなくFinal Chapterの開始点です。

```text
Factory / Scrap Yard
→ Rank 1-3 基本加工 / Directional Logistics
→ 廃住宅街
→ Rank 4 Logistics / Power
→ 廃工場 / Advanced Assembly / Smart Sorter
→ Rank 6 軍事施設 / Drone Control
→ Conveyor Mk.3 / Priority / Overflow
→ 複数Drone Route / Industrial Generator / Logistics Warehouse
→ Rank 7
→ 崩壊した研究施設
→ Robotics / Materials / Energy Lab
→ Special Cargo 3種をFactoryへ確保
→ Tri-Lab Fabrication Research
→ Fabricator
→ Experimental部品 3種を製造
→ Central Core GateへInstall
→ Core Stabilizer
→ Experimental Archive
→ Experimental Technology Research
```

**まだMain Clearではありません。** Advanced Drone / Experimental Power System / Autonomous Industrial Core / Mega Factory安定稼働 / Main Clearは後続Phaseです。

## Rank 7 Final Chapter

### 1. Three Labs

崩壊した研究施設で以下を攻略します。

- Robotics Lab
- Materials Lab
- Energy Lab

Special Cargo:

- AI制御コア試作機
- 実験合金サンプル
- 高密度Energy Cell試作機

Lab復旧は永続化されます。Special Cargoは正常帰還でFactoryへ確保され、Abandon / HP 0で未確定分を失っても復旧済みLabから再回収できます。

### 2. Tri-Lab Fabrication

Special Cargo 3/3をFactoryへ確保すると `実験部品製造技術` Researchへ進めます。

Phase 6-Aですでに3/3確保済みのSaveも再探索不要でResearch可能です。

Research完了で **Fabricator** を解放します。

### 3. Fabricator

FabricatorはAssemblerの単純高速版ではなく、Rank 7 Experimental Tier専用設備です。

```text
制御ユニット ×2
+ 軍用レア合金 ×3
+ 制御回路 ×2
+ 鉄板 ×2
↓ 20秒 / 110 Power
AI制御モジュール ×1
+ 実験フレーム ×1
+ 実験電力モジュール ×1
```

- Cost: `$1250`
- Rank 7
- `experimental_fabrication` Research必須
- 既存Generic Production / Power / Buffer / Directional Logisticsを再利用
- Fabricator専用の別Simulationは作っていません

### 4. Central Core

Central Coreは探索だけでは解放できません。

必須:

- Three Labs復旧
- Special Cargo 3/3 Factory確保
- AI制御モジュール ×1
- 実験フレーム ×1
- 実験電力モジュール ×1

3部品はGate解放成功時に**Atomicに1個ずつ消費**します。不足時に一部だけ消えることはありません。

```text
Experimental部品Install
→ Central Core開放
→ Core Stabilizer復旧
→ Experimental Archive回収
```

Archive回収でResearch FacilityのMain Objectiveが完了し、`central_core_experimental_blueprint` と Research Data +4を保証します。

### 5. Experimental Technology

Central Core攻略後、FactoryのResearch画面で `実験技術統合` をResearchできます。

これはFinal Experimental Tierへの入口です。Phase 6-B時点ではAdvanced Drone / Experimental Power / Autonomous Industrial Coreそのものはまだ実装していません。

## Exploration

| Area | Rank | Main Role |
| --- | ---: | --- |
| 廃住宅街 | 3 | 銅 / プラスチック / Resource Point |
| 廃工場 | 5 | Advanced Assembly / Industrial tech |
| 軍事施設 | 6 | Drone Control / Rare Alloy / HP threat |
| 崩壊した研究施設 | 7 | Three Labs / Fabricator parts / Central Core |

探索共通Contract:

- 通常Lootは正常帰還まで未確定
- Abandon / HP 0ではCurrent Session Lootを失う
- 永続Objective / Zone / Shortcutは保持
- 進行必須報酬を低確率Dropへ依存させない

## Directional Logistics

| 設備 | Rank | Throughput | Rule |
| --- | ---: | ---: | --- |
| Conveyor Mk.1 | 1 | 1.5/s | Forward |
| Conveyor Mk.2 | 4 | 3.0/s | Forward |
| Conveyor Mk.3 | 6 | 6.0/s | Forward |
| Splitter | 4 | 3.0/s | Forward / Left / Right Round-robin |
| Merger | 4 | 3.0/s | Rear / Left / Right → Forward |
| Smart Sorter | 5 | 3.0/s | category固定Lane |
| Priority Splitter | 6 | 6.0/s | Forward優先 / backup |
| Overflow Splitter | 6 | 6.0/s | Forward Main / Right Overflow |

Visual ArrowとRuntime方向は同じContractを使います。

## Drone Automation

攻略済みResource PointをDrone Portごとに選択できます。

| Resource Point | Output | Cycle |
| --- | --- | ---: |
| Residential Copper Network | Copper Wire ×1 | 8s |
| Industrial Electronics Cache | E-Waste ×1 | 10s |
| Military Alloy Cache | Rare Alloy ×1 | 12s |

Rank 6 → 7 Mandatoryは引き続きMilitary Alloy Routeを要求します。

## Power / Storage

Power:

- Starter Grid — 55 Power
- Scrap Generator — 80 Power
- Industrial Generator — 180 Power
- Battery — 960 Energy
- Fabricator — 110 Power use

Storage:

- Small Storage — 120
- Industrial Storage — 600
- Logistics Warehouse — 1800
- Storage Full時はBack PressureでItem lossを防止

## Save / Compatibility

```text
localStorage key: elitemay-game-hub-v1
Root Save Schema: 1
Game Schema: 1
Progression Schema: 1
Exploration Schema: 1
Build Grid: 2.5m
```

Phase 6-BでもSchema番号は変更していません。

Additive state:

```text
areas.research.centralCore
├─ fabricationSetInstalled
├─ stabilizerOnline
├─ archiveRecovered
└─ rewardClaimed
```

既存Factory Layout / Rank 1→7 / Phase 6-A Three-Lab progress / Drone routes / Power / Storageを維持します。

## 操作

| Key / UI | 操作 |
| --- | --- |
| WASD | 移動 |
| Shift | ダッシュ |
| E | 拾う / 設備 / 探索Objective操作 |
| B | 建築 |
| R | 建築中90°回転 |
| F | 解体 |
| Tab | Inventory / Hand Craft |
| O | Guide |
| P | Factory Management |
| T | Transport Terminal |
| AUTOMATION | Drone Route / Storage Upgrade |
| 1〜5 | 基本設備Quick Build |
| Esc | Pause / Panelを閉じる |

## Validation

```bash
npm run validate
```

既存のRank 1→7 / Logistics / Factory Management / Power / Storage / 3探索エリア / Military / Drone / Phase 6-A Regressionに加え、Phase 6-Bで次を確認します。

- Fabricator Rank / Research Gate
- 4入力以内のExperimental batch recipe
- 3種類のFinal Component output
- Phase 6-A既存3/3 Cargo Save互換
- Final Component countでMachine input queueを除外
- Central Core部品Atomic consume
- Central Gate → Stabilizer → Archive dependency
- Central reward idempotence
- Experimental Technology Research
- Exploration Schema v1維持
- Quick Build 1〜5維持
- Research Facility current runtime / Fabricator visual marker

Static CIでは実ブラウザPointer Lock、Central Coreへの実到達性、Collider、Fabricatorの一人称Scale / Build Preview、Hazard体感、WebGL FPSまでは保証しません。
