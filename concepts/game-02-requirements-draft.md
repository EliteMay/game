# Game 02 Requirements Draft

Status: **Draft / Not Formal Requirements**
Updated: 2026-09-09
Working title: **Orbloom**

この文書はGame 02の要件定義途中のCheckpoint。正式な`REQUIREMENTS.md`ではなく、会話ログや一時的な議論を残すための文書でもない。

## 1. Product Core

何もない小さな3D惑星を、Resource・Biome・Species・Research・Expeditionを相互に育てながら、生命に満ちた`Stable Living World`まで成長させるHybrid Incremental / Idle育成ゲーム。

中心体験:

```text
Resourceを増やす
→ Upgrade
→ 生産速度が加速
→ 新System / 新Species / 新BiomeをUnlock
→ 3D惑星の見た目が変化
→ Automationが進む
→ より上位の育成判断へ移る
```

重視する体験:

- 数字が爆発的に増える気持ちよさ
- 稼いだResourceを再投資して成長速度そのものを上げる
- 新しい育成軸が順番に解放される
- 3D惑星が見た目でも明確に成長する
- CollectionとAutomationが同じSpecies Systemに接続する
- Main Loopとは別にResearch / Expedition等の副育成があり、相互に強化する

## 2. Target / Runtime Assumption

- Game Hub内のGame 02として扱う
- Primary device: Desktop
- Primary input: Mouse中心
- Player Characterは出さず、3D惑星を直接回転 / Zoom / 選択して操作する
- Browser 3D Gameとして実装する前提。ただし技術Stackは実装開始時にCurrent RepositoryとGuideを再確認して決定する

## 3. Core Loop

```text
Resource生成
→ Upgrade
→ Planet / Biome成長
→ Species発見 / 配置 /育成
→ Speciesが自動生産
→ Research
→ Expedition
→ Rare Material / 新Species
→ Planet Evolution
→ 新Resource / 新System
→ さらに高速成長
```

### Moment-to-Moment

- Planetを回して観察
- Resource / Event回収
- Upgrade購入
- Species配置 / Evolution
- Biome選択

### Core Gameplay Loop

- 生産を伸ばす
- 新要素を解放
- 育成対象を強化
- Automationを進める
- 次のPlanet Evolution条件を満たす

### Long Progression

- Dead RockからStable Living Worldまで惑星を段階進化させる

## 4. Main Systems

### 4.1 Planet Growth

惑星は小さいUpgradeと大きなEvolutionを分ける。

想定段階:

```text
Dead Rock
→ Primitive Planet
→ Atmosphere Planet
→ Living Planet
→ Advanced Ecosystem
→ Stable Living World
```

最終的な段階数は6〜7程度を目安にする。

### 4.2 Resources

初回完成版の主要Resourceは4種。

- Matter
- Water
- Oxygen
- Energy

全部を最初から表示せず、Progressionに応じて順番に解放する。

各Resourceは次のSystemやResourceへ繋がり、独立した数字だけにしない。

### 4.3 Biomes

初回完成版は4前後。

- Rocky Zone
- Ocean
- Forest
- Crystal Field

BiomeはLevelとEvolutionを持ち、見た目・Species適性・生産・Slot等が変化する。

### 4.4 Species

初回完成版は10〜15種程度。

共通Flow:

```text
発見
→ Collection登録
→ 配置
→ 自動生産
→ Level
→ Evolution
→ Passive / 生産強化
```

Speciesは得意Biomeと役割を持つ。

初回版では個体値・性格・繁殖・装備・戦闘を持たない。

Rare MutationはCollection要素として採用候補。共通Variantを2〜3種程度に抑える。

### 4.5 Research

3 Branch、合計約20項目を目安。

- Planetology
- Biology
- Automation

単純倍率だけでなく、Auto Collect / Offline効率 / Species Slot等の機能Unlockを混ぜる。

専用Research通貨は初回版では作らず、既存Resourceを使用する。

### 4.6 Expedition

Timerだけではなく、軽い選択を持たせる。

```text
目的地選択
→ Mission Type
→ Species 1体選択
→ 出発
→ Offlineでも進行
→ Resource / Rare Material / 新Species等を獲得
```

初回完成版は4目的地前後。

戦闘Systemは追加しない。

### 4.7 Ecosystem Bonus

Speciesの組み合わせによりBiome単位で軽いSet Bonusを作る。

複雑な食物連鎖Simulationにはしない。

## 5. Idle / Automation

Hybrid Idleとする。

- Resource ProductionはOfflineでも進む
- Species XPはOfflineでも進む
- Expedition TimerはOfflineでも進む
- 重要Evolution / Research / 配置 / Unlock判断はPlayer操作を必要とする

初期Offline案:

- Efficiency: 50%
- Max time: 2h

Research等で上限と効率を伸ばす。

放置をMain Progressionの必須条件にはしない。Active PlayだけでもMain Clearへ到達可能にする。

## 6. Progression / Unlock

最初からSystemを全部見せない。

序盤の代表Unlock順:

```text
Matter
→ Automation
→ Water
→ Biome
→ Species
→ Research
→ Expedition
→ Oxygen
→ Ecosystem
→ Mutation
→ Advanced Research
→ Final Evolution
```

新Systemを解放した直後に次を連打せず、Playerが価値を理解してから次へ進む。

## 7. First 30 Minutes

目標:

```text
Dead Rock
→ Matter手動生成
→ 最初のUpgrade
→ 自動Matter
→ Primitive Planet
→ Water
→ 最初のBiome
→ 最初のSpecies
→ Species Evolution
→ Research
→ 最初のExpedition
→ Atmosphere Planet
```

最初の約10分で`増やす → 強化 → 自動化 → 大きなEvolution → 新要素`を一周させる。

## 8. Economy / Balance Direction

- 通常Upgradeは指数的に価格上昇
- Milestone Levelで大きな倍率 / 機能Unlock
- Evolution直後は大量にUpgrade可能な成長Burstを作る
- 新Resource解放時は再び小さい数字から育てる感覚を作る
- 後半はK / M / B / T等へ桁が大きく伸びる
- 序盤はほぼ止めず、中盤は複数Systemを回し、終盤だけ短い貯め時間を許容
- 広告視聴 / 課金短縮を前提にBalanceしない

## 9. Main Goal / Completion

Main Goalは`Stable Living World`の完成。

Main Clear条件は1つの数値だけでなく、主要Systemを一通り使わせる。

候補:

- Planet Final Evolution
- 主要Biomeを一定段階まで育成
- Speciesを一定数発見
- 複数SpeciesをEvolution
- 主要BiomeでEcosystem Bonus成立
- Research 3 Branchを一定以上使用
- Final Expedition `Unknown Signal`達成
- Final Evolution Item取得

Main Clear後も同じ惑星でCollection / Research / Mutation / Biome育成を継続可能。

## 10. Failure Contract

基本的にGame Overなし。

- Speciesロストなし
- 惑星破壊なし
- Resource全没収なし
- Expedition失敗時も重大な永久損失なし

効率の悪さは時間Costとして扱い、配置・Research等で改善する。

## 11. UI / Interaction Direction

主要SurfaceはPlanet中心。

- Planet / Biome
- Species
- Research
- Expedition

PlanetをHomeとして扱い、画面切替を増やしすぎない。

通常画面では3D惑星を大きく見せ、必要なPanelだけを開く。

新Species / Evolution / New System等のUnlockは強いReward Feedbackとして扱う。

## 12. Visual Direction

Working direction:

**Stylized Living Planet → 後半ほどCosmic Fantasy化**

- 開始時は暗く何もない岩
- Ocean / Forest / Atmosphere / Species等が段階的に増える
- 後半はCrystal / 発光生命等の神秘的要素を増やす
- 開始時とFinalの見た目差を大きくする

世界観はStory-heavyにせず、`World Seed`から生命のある惑星を作る程度の軽い設定を基本とする。

## 13. Audio / Feedback Direction

- 普段の小Upgradeは軽いFeedback
- Milestoneは中程度
- Planet / Species Evolution、新System、Main Completeは強いFeedback
- Planet進化に合わせて環境音も育つ
- 数字・見た目・音を同時に変化させる大きなMilestoneを用意する

## 14. Save / Offline

Auto Save中心。

保存対象候補:

- Planet Stage
- Resource
- Generator / Upgrade Level
- Biome State
- Species Discovery / Level / Evolution / Placement / Mutation
- Research
- Expedition
- Main Progression / Main Clear
- Offline Upgrade
- Settings

既存Saveを無断破壊しない。Schema / Migrationの具体設計は実装前にGuide Owner 03を確認する。

## 15. Non-goals / Initial Scope Exclusions

初回完成版には入れない:

- Combat
- Player Character
- Planet上を歩くGameplay
- Open World
- Civilization Simulation
- City Building
- 複雑な食物連鎖
- Species繁殖
- 個体値
- 性格
- 装備
- Skill Tree
- Species Death / Permanent Loss
- Multiplayer / PvP
- 複数惑星同時管理
- 複雑なWeather Simulation
- 大量Resource
- 大規模Procedural Generation
- Prestige必須Progression

## 16. Later Candidates

- New Planet
- Planet Collection
- Forest / Ocean / Crystal等のPlanet Type分岐
- Cosmic Seed / Prestige相当
- 完成PlanetからPermanent Bonus
- Legendary Species
- Species / Biome / Expedition追加
- Artifact
- Challenge / Special Event
- Moon育成
- Star System
- Civilization
- Auto Expedition
- Advanced Automation

Prestigeを追加する場合は完成したPlanetを消すResetより、完成PlanetをCollectionとして残し次のPlanetへ進むMeta Progressionを優先候補とする。

## 17. Initial Scope Target

目安:

- Resources: 4
- Biomes: 約4
- Species: 10〜15
- Species Evolution: 各1回程度
- Mutation Variant: 共通2〜3種
- Research: 約20
- Expeditions: 約4
- Planet Evolution: 6〜7段階
- Main Clear: 約6〜10時間を目安

これらはContent quotaではなくScope上限の初期目安。Actual Playtestで調整する。

## 18. Remaining Decisions Before Formal Requirements

現時点でProduct Coreを止めるBlocking Decisionはなし。

正式Requirements化前に確認 / 決定する項目:

- Working title `Orbloom`を正式採用するか、名称はLater扱いにするか
- Browser Game / Game Hub Runtime Contractの明文化
- 代表Performance Target
- 必要最低限のAccessibility / Settings
- Visual Ambition level
- Initial content valuesはRequirementでは固定しすぎずBalance Parameterとして扱う範囲

## 19. Current Decision Status

- Product direction: Confirmed
- Core Loop: Confirmed
- Main Systems: Confirmed at requirement level
- Initial Scope / Non-goals: Confirmed
- Main Goal: Confirmed at requirement level
- Prestige: Later
- Implementation: Not started
- Formal Requirements persistence: Pending final requirement pass
