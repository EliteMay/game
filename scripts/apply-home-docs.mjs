import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function append(rel, marker, text) {
  const target = path.join(root, rel);
  const current = fs.readFileSync(target, 'utf8');
  if (current.includes(marker)) return;
  fs.writeFileSync(target, `${current.trimEnd()}\n\n${text.trim()}\n`);
}

append('README.md', '## Home / Player Convenience (2026-09-06)', `## Home / Player Convenience (2026-09-06)

Scrap FactoryのFactory北側に固定Home区画を追加しました。HomeはFactoryの2.5m建築Grid外で、Factory Layoutを消費しません。

- Bed: Manual Save / Home Respawn。既存SaveはBedを一度使うまで従来位置を維持します。
- PC: Player Upgrade / Material Tracking / Tutorial Library / Player Progress。Factory Researchとは別系統です。
- Home Storage / Exploration Workbench: 手動移動、Quick Deposit、Loadout Preset、Secure Caseを管理します。
- Backpackは従来どおりSlot制です。重量制・重量Penaltyは導入していません。
- TutorialはHomeから始まる実操作ベースへ更新し、O GuideとPC Libraryで同じ説明Sourceを参照します。
- System DiagnosticsはMachine / Logistics / Power / Storage / Drone / Final Phaseの原因候補と確認先を表示します。自動修正は行いません。`);

append('SPEC.md', '## 2026-09-06 Home / Player Upgrade / Tutorial Runtime', `## 2026-09-06 Home / Player Upgrade / Tutorial Runtime

### Home Contract

- 固定HomeはFactory北側・Factory建築範囲外に配置し、既存の2.5m Grid、Factory Layout、Directional Logisticsを変更しない。
- Bed / PC / Home Storage / Exploration Workbenchは固定設備で、Factory設備として建築・解体・Conveyor接続しない。
- New GameはHome Bed付近から開始する。既存SaveはMigration時にPlayer座標を保持し、Bed使用後だけHome Respawnを有効化する。
- Bed Manual Saveは既存Auto Saveを置換しない。

### Player Convenience State

既存Root/Game Save Schema v1を維持し、game.home.version=1を加算する。主な永続状態はPlayer Upgrade、Home Storage、Secure Case、Loadout Preset、Material Tracking、Tutorial Library既読/進行、Home Respawn登録である。

BackpackはSlot制を唯一の容量Contractとして維持する。Base 12 Slot、Backpack I=16、II=20、III=24。旧Saveに既存Backpack容量/Unlockがある場合は対応UpgradeへMigrationし、容量を減らさず再購入も要求しない。

PC Upgrade購入はRank/前提/Cash/素材を検証した後、まとめて消費してUnlockしSaveする。Factory Network Link取得前はBackpack+Home Storage、取得後のみFactory StorageをCost参照対象へ追加する。PC UpgradeはRank 1〜7のMain Progression条件にはしない。

Secure Caseは探索Session LootからPlayerが明示選択した通常Lootだけを保護する。Main Objective CargoとFinal系Itemは保護対象外。失敗時もCase内容は永続する。

### Tutorial / Diagnostics

Basic TutorialはHome Bed → 移動 → PC → Door → Scrap Yard → 回収 → Backpack → Factory Return → 手動販売 → Build → Hopper → Conveyor → Crusher → Seller接続 → crushed_metalの実自動販売で完了する。Scanner購入はTutorial必須条件ではない。既存SaveにはBasic Tutorialを強制しない。

Tutorial Objectives / Contextual Hints / Stuck Help / Next GoalはSettingsで個別制御できる。PC Tutorial LibraryとO Guideは同じTutorial定義を使用する。

DiagnosticsはMachine Input/Output、Directional Logistics、Power、Storage/Backpressure、Drone、Home/Player、Final Automation/Mega Factoryを既存Runtime stateから派生表示し、自動修正・自動建築は行わない。`);

append('WORK_REPORT.md', '## 2026-09-06 — Home / Player Upgrade / Tutorial Implementation', `## 2026-09-06 — Home / Player Upgrade / Tutorial Implementation

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

### Preserved Contracts

- Rank 1〜7 / Main Clear / Mega Factory Final Phase
- Directional Logistics / 2.5m Grid / Factory Layout
- 既存Save Schema v1と旧Player位置
- BackpackはSlot制のみ。重量制・Weight Penaltyは追加していない。

### Validation

このReport追加はHome integration workflow内で \`npm run validate\` 成功後にのみ実行される。GitHub通常PR Validationも別途通過させる。実ブラウザ操作・WebGL見た目確認はCI Static Validationとは別判定として扱う。`);

append('PROJECT_LEARNINGS.md', '## 2026-09-06 — Home / Tutorial Migration Learnings', `## 2026-09-06 — Home / Tutorial Migration Learnings

- New GameのSpawn変更と既存SaveのPlayer座標Migrationは分離する。DefaultだけHomeに変え、normalizeでは旧座標を上書きしない。
- Backpack容量はFactoryとExplorationで別定数を持たず、同じSlot capacity関数を参照する。UIだけ容量を増やす実装はSave/探索挙動と不整合になる。
- Tutorial完了は売上額などの代理指標ではなく、要求された実イベント（今回ならcrushed_metalがSellerへ実搬送・自動販売された瞬間）を記録する。
- Optional Player UpgradeはMain Progressionと別状態に置き、取得判定をRank/Main Clear条件へ混ぜない。
- Secure Caseのような保護機能は「何を保護できないか」を先に固定し、Main Objective CargoやFinal progression itemを自動保護しない。
- System Diagnosticsは既存Runtime/Analyzerを再利用し、別の真実を保存しない。原因候補と確認先を提示し、自動修正はしない。`);

console.log('Home implementation documentation updated.');
