# Game 02 Requirements

## Status

- Status: **Current Contract / Ready for implementation planning**
- Updated: 2026-09-09
- Target: Game Hub / Game 02
- Working title: **Orbloom**
- Profile: **GAME**
- Blocking Decisions: **None**
- Implementation has **not** started.
- `Orbloom` is a working title and may change without altering the Product Core.

This file is the Source of Truth for Game 02 product requirements. It does not replace the root `REQUIREMENTS.md`, which remains the Game 01 `Scrap Factory` contract.

# 1. Product Core

## Purpose

Create a compact but complete 3D incremental / idle growth game as Game 02 in the Game Hub.

The player starts with a small lifeless world and grows it into a thriving `Stable Living World` by increasing resources, evolving the planet, developing biomes, discovering and育成する species, researching upgrades, and sending expeditions.

## Core Experience

The central experience is:

```text
Increase numbers
→ Reinvest resources
→ Growth accelerates
→ New systems / species / biomes unlock
→ The 3D planet visibly changes
→ Automation replaces old repetitive work
→ The player makes higher-level growth decisions
→ Numbers accelerate again
```

The game should deliver all of the following:

- Strong incremental number growth, including very large values later in progression.
- Reinvestment that increases the rate of growth itself.
- Frequent meaningful unlocks rather than only repeated percentage upgrades.
- A 3D planet that becomes visibly richer as progression advances.
- Multiple connected growth axes without becoming a collection of unrelated minigames.
- Species that serve both collection and gameplay / automation roles.
- Supporting systems such as Research and Expedition that feed back into Planet Growth.
- Hybrid idle play: production continues while away, while major progression choices remain active decisions.

## Intended Player Demand

Primary demands:

- Light planning and prioritization.
- Choosing what to upgrade next.
- Choosing species placement and specialization.
- Deciding between immediate upgrades and longer-term Research.
- Choosing Expedition goals / suitable species.
- Enjoying discovery, visual growth, collection and acceleration.

The game is not intended to demand precision action, combat execution, difficult puzzles or high punishment.

## Non-goals

Initial complete version will not include:

- Combat.
- Player character movement on the planet.
- First-person / third-person exploration.
- Open world gameplay.
- Civilization / city simulation.
- Complex food-chain simulation.
- Species breeding.
- Individual stat / IV systems.
- Personality systems.
- Equipment or combat skill trees.
- Species death / permanent loss.
- Multiplayer / PvP / co-op.
- Multiple simultaneously managed planets.
- Complex weather simulation.
- Large procedural worlds.
- Dozens of independent currencies.
- Advertising, login streaks, daily mandatory rewards or F2P time-gating.

# 2. Audience / Runtime

- Primary user: Repository owner / desktop player.
- Platform: Browser game inside the existing Game Hub.
- Primary device: Desktop.
- Primary input: Mouse; keyboard support may be added where useful.
- Camera / interaction model: Player directly rotates, zooms and selects the 3D planet.
- No player avatar is required.
- Exact rendering stack / library is not fixed by this requirement and must be selected from the current repository and current guide at implementation start.

# 3. Core Gameplay Loop

```text
Generate resources
→ Buy upgrades
→ Grow Planet / Biome
→ Discover, place and育成する Species
→ Species automate resource generation
→ Research
→ Expedition
→ Gain rare material / new species
→ Planet Evolution
→ Unlock new resource / system
→ Accelerate further
```

## Moment-to-Moment Loop

Typical active play:

- Observe and rotate the planet.
- Collect or review resources.
- Buy upgrades / milestones.
- Inspect biomes.
- Place or育成する species.
- Trigger species evolution when ready.
- Purchase Research.
- Prepare / collect Expeditions.
- Respond to small events / discoveries where implemented.

## Progression Loop

```text
Small upgrades
→ Milestone
→ System unlock
→ Large visual / numerical jump
→ New growth axis
→ Automation of older task
→ Higher-level choice
→ Planet Evolution
```

Progression must not become only “same task with more required clicks”.

# 4. Planet Growth

## Main Progression

The initial complete version targets approximately 6–7 meaningful Planet Evolution stages. Names and exact costs remain balance parameters.

Representative structure:

```text
Dead Rock
→ Primitive Planet
→ Atmosphere Planet
→ Living Planet
→ Advanced Ecosystem
→ Stable Living World
```

Intermediate stages may be added if they create a meaningful visual and gameplay transition without inflating scope.

## Planet Upgrade Contract

Planet progression combines:

1. **Small upgrades** — production, capacity, efficiency or growth.
2. **Milestones** — noticeable boosts or convenience unlocks.
3. **Evolution** — major visual change + new resource / biome / system.

Planet Evolution must not be a number-only level increase. A major Evolution must visibly change the world and/or unlock a new type of gameplay.

# 5. Resources / Economy

## Core Resources

Initial target: four primary resources.

- **Matter** — basic planet formation and early upgrades.
- **Water** — ocean / water-related development.
- **Oxygen** — life / forest development.
- **Energy** — Research and higher-tier growth.

Resources unlock progressively rather than appearing all at once.

## Economy Rules

- Resource generation grows exponentially / multiplicatively enough to support strong incremental inflation.
- Early values may begin near single digits; late-game values may reach K / M / B / T scale or beyond as balance requires.
- Newly unlocked resources begin small even when older resources are already huge, restoring a sense of fresh growth.
- Normal upgrades may use exponential cost curves.
- Milestones should periodically create large jumps in output.
- Large Evolutions should create a reset in pacing: a slower build-up followed by a burst of new purchasing power.
- Exact percentages, cost curves, level counts and timing are adjustable balance parameters and are not fixed requirements.

## Research Currency

Do not add a dedicated Research Point currency for the initial version unless playtesting proves necessary.

Research should primarily consume existing resources such as Energy plus another relevant resource, creating a choice between immediate growth and long-term improvement.

# 6. Biomes

Initial target: approximately four biomes.

Representative roles:

- **Rocky Zone** — Matter / base production.
- **Ocean** — Water / early life.
- **Forest** — Oxygen / species growth / mutation support.
- **Crystal Field** — Energy / Research / advanced multipliers.

Biome names may change with the final art direction.

## Biome Progression

Each biome uses a shared structure:

```text
Level
→ Milestone
→ Biome Evolution
```

Biome Evolution must create a visible change on the planet.

## Placement / Affinity

- Species may have preferred biomes.
- Preferred placement grants a meaningful bonus.
- Non-preferred placement should generally remain possible unless a species concept specifically requires otherwise.
- Avoid a design where every species has exactly one valid slot and there is no decision.

## Ecosystem Bonus

Each major biome may have approximately 1–2 simple ecosystem combinations.

An Ecosystem Bonus should reward sensible combinations of species without implementing a full ecological simulation.

# 7. Species

Initial target: approximately 10–15 species.

Species share the same base lifecycle:

```text
Discover
→ Collection registration
→ Place
→ Passive production / bonus
→ Gain level / growth
→ Evolution
```

## Species Roles

Species should cover multiple useful roles, including examples such as:

- Matter production.
- Water production.
- Oxygen production.
- Energy production.
- Species growth support.
- Research efficiency.
- Expedition support.
- Offline production support.
- Mutation / rare discovery support.
- Global / biome multipliers.

Later species should not all be simple reskins with larger production numbers.

## Species Evolution

Initial target: roughly one major Evolution per species.

Evolution should provide:

- Visible 3D model / material change.
- Major production or utility increase.
- Where appropriate, a new passive or biome interaction.

Exact levels and costs remain balance parameters.

## Species Slots

Biomes have limited species capacity that can be upgraded.

Slot limits should create light composition choices such as production vs growth vs utility, without becoming a complex party-builder.

## Collection

Species discovery is a persistent collection goal.

Main Clear must not require complete collection. Full collection remains an optional / post-clear objective.

## Rare Mutation

Initial version may include a small set of shared mutation variants such as:

- Normal.
- Golden.
- Crystal.

Mutation variants should primarily support discovery / collection and provide a useful but non-mandatory bonus.

Do not create dozens of bespoke variants per species in the initial version.

# 8. Research

Use three understandable Research branches, approximately 20 total nodes for the initial version.

## Planetology

Focus:

- Matter / Water growth.
- Biome efficiency.
- Planet growth.
- Evolution cost / capacity support.

## Biology

Focus:

- Species growth.
- Species slots.
- Evolution efficiency.
- Mutation / rare species discovery.
- Ecosystem bonus support.

## Automation

Focus:

- Auto collect / basic automation.
- Offline efficiency / offline duration.
- Auto-buy for older low-level actions where appropriate.
- Expedition speed / convenience where appropriate.
- General production efficiency.

## Research Rules

- Research must mix numeric improvements and functional unlocks.
- Do not build a huge skill tree.
- Most of the tree should fit within an understandable single management surface.
- A small number of cross-branch unlocks is allowed where it strengthens system interaction.
- Research choices should not permanently trap the player in an unwinnable build.

# 9. Expedition

Expedition is a light supporting loop, not a separate exploration game.

## Expedition Flow

```text
Choose destination
→ Choose mission focus
→ Assign one suitable species
→ Launch timer
→ Continue normal gameplay or close game
→ Collect result
```

## Mission Focus Examples

- Mineral Search.
- Rare Life Search.
- Artifact / rare material search.

## Species Interaction

Species may provide simple Expedition passives such as:

- Better mineral rewards.
- Better rare discovery chance.
- Reduced duration.
- Improved success / reward quality.

Do not add combat stats or full expedition party management for the initial version.

## Initial Destinations

Target approximately four destinations, for example:

- Small Moon.
- Asteroid Belt.
- Ancient Satellite.
- Unknown Signal.

Names are not final requirements.

## Expedition Rewards

May include:

- Normal resources.
- Rare materials.
- New species signals.
- Special unlock material.

Rare materials should act mainly as milestone / Evolution keys rather than becoming another endlessly farmed numeric currency.

## Risk

Failure / risk must remain low punishment.

No species permanent loss.

A failed risky option may return normal rewards instead of rare rewards.

# 10. Automation / Idle Contract

The game is a **Hybrid Idle** game.

## Core Principle

```text
Production can automate.
Growth direction remains a player decision.
```

Automation should replace repetitive lower-level actions shortly before they become annoying, then move the player toward higher-level choices.

## Offline Progress

Offline progression may include:

- Resource production.
- Species growth / XP.
- Expedition timers.
- Passive biome growth where applicable.

Offline progression must not automatically perform:

- Planet Evolution.
- Species Evolution.
- Research choices.
- Species placement decisions.
- Major system unlock decisions.

## Offline Efficiency

Representative initial direction:

- Starts below full online efficiency.
- Starts with a limited offline duration.
- Research can improve both efficiency and maximum duration.

Exact starting values such as 50% / 2h and later caps are balance parameters rather than fixed contract values.

Active-only play must remain capable of reaching Main Clear. The game must not require closing it for many hours to progress.

# 11. Save / Persistence

## Authority

Initial version uses **local-only canonical save data**.

- No account required.
- No cloud sync required.
- No online dependency required for progression.

Exact browser storage technology is an implementation decision based on current repository constraints and data size.

## Autosave

Autosave is the default.

Save after meaningful progression events such as:

- Upgrade / milestone purchase where appropriate.
- Planet Evolution.
- Species Evolution.
- Research purchase.
- Expedition launch / completion collection.
- Important progression unlock.
- Periodic safe autosave.

## Backup / Recovery

Provide a user-accessible backup export / import or equivalent recovery path appropriate to the final storage design.

Reset Save must be deliberate and protected from accidental activation.

## Persistent State

At minimum preserve:

- Planet stage / progression.
- Resources.
- Generator / upgrade state.
- Biome state.
- Species discoveries.
- Species growth / Evolution.
- Species placement.
- Mutation collection.
- Research.
- Expedition state / timer.
- Main progression.
- Main Clear history.
- Offline-related progression.
- User settings.

Do not silently discard valid existing save data when future additive content is introduced.

# 12. Day / Session Model

There is no mandatory day cycle.

Typical intended session:

```text
Open game
→ Receive offline result
→ Buy several upgrades
→ Evolve / reconfigure species
→ Buy Research
→ Collect and relaunch Expedition
→ Reach a milestone / Evolution
→ Observe the changed planet
→ Leave when desired
```

A normal return session may be roughly 5–15 minutes, while longer active play remains possible.

# 13. Progression / Pacing

Initial target to Main Clear: approximately **6–10 hours** of first-play progression, subject to Actual Playtest.

This target must not be achieved through raw waiting time alone.

## Pacing Direction

- Early game: upgrades available every few seconds to tens of seconds.
- Mid game: multiple systems provide things to do while larger resources accumulate.
- Major Evolution gates may intentionally require short saving periods.
- Late game may slow slightly but should continue to provide meaningful decisions and unlocks.

Avoid long periods where the only available action is waiting for one resource bar.

## Gate Variety

Major progression may use a small mixture of:

- Resource requirements.
- Species discovery requirements.
- Ecosystem requirements.
- Research requirements.
- Expedition / rare material requirements.

Do not stack every gate type onto every Evolution.

# 14. Main Goal / Completion

Primary Completion Condition:

## **Create a Stable Living World**

Main Clear should require participation in the primary connected systems rather than one isolated number.

Representative completion contract:

- Reach the final required Planet Evolution.
- Develop the major required biomes to their target state.
- Discover a meaningful subset of species, not necessarily all species.
- Evolve several species.
- Establish required ecosystem combinations.
- Progress meaningfully in all three Research branches.
- Complete the final `Unknown Signal` style Expedition.
- Acquire the final Evolution material / equivalent milestone item.
- Trigger Planet Stabilization / final visual transformation.

Main Clear must be recorded as a historical milestone and must not be lost because the player later rearranges species or continues upgrading.

## Post Clear

The same save remains playable after Main Clear.

Optional post-clear goals may include:

- Full Species Collection.
- All current Species Evolutions.
- Mutation collection.
- Research completion.
- Biome maximum growth.
- Rare / legendary discovery.
- Expedition completion.

# 15. Prestige / Multiple Planets

Prestige is **not part of the initial Main Clear contract**.

Later expansion may use a planet-preserving meta progression rather than deleting completed worlds:

```text
Complete Planet #1
→ Preserve it in Planet Collection
→ Gain permanent meta bonus
→ Begin Planet #2
```

Possible later systems:

- New Planet types.
- Forest / Ocean / Crystal specialization branches.
- Cosmic Seed / meta currency.
- Permanent bonuses from completed worlds.
- Planet Collection.
- New Species / Biomes / Expeditions.
- Moon development.
- Star System progression.

These are Later and must not block completion of the initial game.

# 16. Interaction / Information Architecture

## Primary Surface

The 3D Planet is the home and primary gameplay surface.

The player should not navigate through many nested management pages for ordinary actions.

Main structure:

```text
                 Species
                   ↑
                   │
Research ←── 3D PLANET ──→ Expedition
                   │
                   ↓
                 Biome
```

## Planet Interaction

- Drag / equivalent to rotate.
- Wheel / equivalent to zoom.
- Select biome / visible species / meaningful event.
- Important changes occur on the same planet when possible rather than only in detached menus.

## Main Supporting Surfaces

1. Planet / contextual Biome panel.
2. Species collection / management.
3. Research.
4. Expedition.

Avoid unnecessary screen depth.

## Guidance

Keep one clear current Main Goal / next major objective visible or easily recallable.

Do not use a permanently visible long tutorial checklist.

New systems should receive brief contextual explanations at first unlock.

# 17. Onboarding

The first approximately 10 minutes should teach the main incremental loop through action rather than long text.

Representative flow:

```text
Manual Matter gain
→ First upgrade
→ Production increase
→ First automation
→ Planet Mass milestone
→ First major Evolution
→ New resource / biome appears
```

The first large Evolution is the point where the player should understand:

```text
Increase
→ Upgrade
→ Accelerate
→ Unlock
→ Visible world change
```

Do not introduce all systems in the first few minutes.

Unlock systems sequentially, then allow time to use each one before the next major system appears.

# 18. Feedback / Audio / Motion

## Feedback Hierarchy

Use different intensity for different importance levels.

### Small

- Click / collect.
- Normal upgrade.
- Routine resource change.

### Medium

- Milestone.
- Research completion.
- Expedition completion.
- Species growth milestone.

### Large

- New species.
- Species Evolution.
- Biome Evolution.
- New system unlock.
- Planet Evolution.
- Main Clear.

## Visual Growth

Major progression must change the world itself where possible.

Examples:

- Oceans expand.
- Forest coverage increases.
- Clouds / atmosphere appear.
- Crystal or fantasy elements appear later.
- More species become visible.
- Night-side / late-game effects become richer.

## Audio Direction

- Calm ambient cosmic / life-oriented soundscape.
- Environment becomes richer as the planet becomes alive.
- Major Evolution should use stronger musical / sound feedback without making routine interactions noisy.

## Motion Accessibility

Provide reduced-motion support for non-essential camera / particle / UI animation.

# 19. Visual Direction

Visual Ambition: **High** because visible planet growth is part of the product value.

Current working direction:

> **Stylized Living Planet that becomes increasingly Cosmic Fantasy as progression advances.**

Do not treat this line as a finished art specification.

Before implementation of the meaningful UI / final visual system:

- Perform current domain / genre visual research.
- Compare representative references with the same primary task.
- Confirm information density, planet prominence, panels, progression feedback and interaction patterns.
- Derive the final design from the Game 02 task rather than copying another game's surface styling.

The 3D Planet must remain the visual priority over decorative UI.

# 20. Accessibility / Usability

Initial complete version should include, where applicable:

- Readable text and number formatting.
- Keyboard focus for interactive UI where native / DOM controls are used.
- Important states not communicated by color alone.
- Reduced-motion support for non-essential motion.
- Independent or sensible audio controls.
- No mandatory precision timing.
- Clear locked / available / completed states.
- Clear reason when a major action cannot be performed.

# 21. Performance / Reliability

The game is a long-running interactive WebGL / 3D browser game and must remain responsive during normal progression.

## Targets

- Normal gameplay should target approximately **60 FPS** on the primary development / target desktop where practical.
- Do not make exact FPS on all hardware a universal pass/fail requirement without measurement.
- Planet growth must not create unbounded entity / particle / DOM growth.
- Species visual population may use representative entities rather than rendering every numerical individual.
- Heavy assets / secondary systems should be Deferred / On Demand where appropriate.
- Long active sessions must not progressively leak major resources / listeners / render objects.
- Evolution sequences must not leave the player in an unexplained long unresponsive state.

Performance decisions must preserve gameplay state; graphical quality settings must not change resource production or progression outcomes.

# 22. Initial Scope Guard

Target initial content budget:

| Area | Initial target |
| --- | ---: |
| Primary resources | 4 |
| Major biomes | ~4 |
| Species | ~10–15 |
| Major Evolution per species | ~1 |
| Shared mutation variants | ~2–3 |
| Research nodes | ~20 |
| Expedition destinations | ~4 |
| Planet Evolution stages | ~6–7 |
| Main Clear playtime target | ~6–10h |

These are scope / planning targets, not requirements to fill content for its own sake.

Do not exceed them merely to make the game appear larger. Add content only when it materially improves the Core Experience or fixes a validated pacing / variety problem.

# 23. Completion / Validation Contract

Game 02 is not complete when only the systems exist individually.

Before calling the initial game complete:

- Fresh Start → Main Clear must work End-to-End.
- The core loop must remain playable without debug commands.
- Save → reload must preserve canonical progression.
- Offline elapsed-time calculation must not grant invalid negative / extreme / duplicated rewards.
- Expedition launched before close / reload must resume / complete correctly.
- Planet / biome / species progression must remain internally consistent after reload.
- Main Clear must persist historically.
- Initial content should have no progression dead-end under normal play.
- Main progression must be Actual Playtested; static tests cannot replace gameplay pacing validation.
- The visual result must be reviewed in a real browser / screenshot at final state.
- Runtime performance must be checked with representative late-game visual population.
- Important balance assumptions such as 6–10h Main Clear remain adjustable until Actual Playtest supports them.

# 24. Implementation Handoff

- Status: **Ready for implementation planning**
- Requirements updated: 2026-09-09
- Blocking Decisions: **None**
- Important assumptions:
  - Working title may change.
  - Exact balance values are intentionally not fixed.
  - Exact browser 3D stack is selected from the current repository / current guide at implementation start.
  - Final UI / visual specification requires the planned domain-first visual research before meaningful implementation.
- Implementation conversation: `game（実装）`

Implementation must begin by checking the current `EliteMay/web-project-guide`, the current `EliteMay/game` repository and this file. Conversation history is not a second Source of Truth.
