# Orbloom Onboarding Research

## Why this exists

The previous first-run experience explained controls but did not reliably teach the player what to click, what changed after the click, or why the next action mattered. The revised onboarding is based on observed onboarding patterns from established incremental / idle games rather than an invented generic tutorial pattern.

## Reference games reviewed

### AdVenture Capitalist

Evidence:
- https://www.pocketgamer.com/adventure-capitalist/adventure-capitalist-tips-and-cheats-for-making-money/
- Steam/community screenshots showing the early prompt and manager introduction.

Observed pattern:
- Start with one obvious business action.
- Let the player perform the repetitive action first.
- Introduce automation only after the player understands what is being automated.
- The prompt points at the real gameplay control instead of explaining an abstract system elsewhere.

### Egg, Inc.

Evidence:
- https://www.talkandroid.com/16189-egg-inc-ultimate-walkthrough-and-game-guide/
- https://egg-inc.fandom.com/wiki/Hatchery

Observed pattern:
- One dominant early action: hatch chickens.
- Immediate visual cause and effect: chickens appear, production grows, money rises.
- Research and other management systems are introduced progressively rather than front-loaded.

### Idle Planet Miner

Evidence:
- https://idle-planet-miner.fandom.com/wiki/New_Starter_walkthrough
- https://idle-planet-miner.fandom.com/wiki/Unlocking_Game_Features
- https://www.youtube.com/watch?v=yXDXe2YKbWM

Observed pattern:
- The player selects the real first planet and upgrades it directly.
- Mining -> transport -> income is learned from the visible world and real upgrade controls.
- Additional systems unlock later instead of all appearing as required knowledge at the start.

### Cell to Singularity

Evidence:
- https://games.computerlunch.com/cell_to_singularity/
- https://cell-to-singularity.fandom.com/wiki/Help_for_Beginners

Observed pattern:
- The first instruction is attached to the core action: tap to earn the first currency.
- The player sees the resource react immediately before being asked to understand the wider evolution system.
- Progress broadens from one action into generators and evolution.

### Cookie Clicker

Evidence:
- https://cookieclickernew.com/blog/cookie-clicker-beginner-guide/

Observed pattern:
- One visually dominant first action.
- The first automation purchase follows quickly after manual production.
- The player learns the loop by doing: click -> buy -> production rises -> buy again.

## Shared onboarding patterns

The references converge on these useful patterns for Orbloom:

1. **One action at a time.** Do not explain all controls on the title screen.
2. **Point at the real control.** The tutorial target is the actual gameplay button the player must use.
3. **Advance from game state, not a Next button.** A step completes only when the requested gameplay action succeeds.
4. **Show cause and effect immediately.** Resource gain, generator output and evolution feedback stay visible while teaching them.
5. **Teach automation after manual interaction.** The player first creates Matter manually, then buys the generator that replaces repetition.
6. **Teach reinvestment before introducing more systems.** Repeated generator upgrades establish the incremental loop.
7. **Use progressive disclosure.** Species, Research and Expedition remain later systems rather than first-minute reading material.
8. **Keep help recallable.** A short HELP surface is available after onboarding without leaving a permanent tutorial checklist on screen.

## Orbloom onboarding decision

The revised first-run flow is:

```text
Generate Matter
-> Buy first Matter Generator
-> Reinvest until Matter Generator Lv.4
-> Reach the first Planet Evolution requirement
-> Trigger Planet Evolution
-> Activate the newly unlocked Water Generator
-> Hand control back to the player with NEXT OBJECTIVE + Biomes as the continuation path
```

The tutorial uses a target spotlight and a compact coach card. Non-target UI is visually de-emphasized, but the game is not hard-locked behind modal Next buttons.

## New-resource bootstrap

A newly unlocked resource needs a valid first source. Orbloom previously unlocked Water/Oxygen/Energy at zero while their first generators also cost that same resource, creating a possible dead end.

The revised onboarding/runtime grants a one-time starter reserve equal to the first generator cost when Water, Oxygen or Energy first unlocks. This keeps the intended loop intact:

```text
Planet Evolution
-> small starter reserve
-> buy first generator
-> resource becomes self-sustaining
```

The grant is one-time and persisted so it cannot be farmed repeatedly.

## Validation targets

- Fresh save always starts with a visible first action.
- The target changes automatically when the requested state change occurs.
- The first generator is clearly taught as automation.
- Generator reinvestment is taught before Planet Evolution.
- First Planet Evolution leads to an immediately usable Water Generator.
- Existing progressed saves are not reset.
- HELP remains available after tutorial completion or skip.
- Tutorial completion is tracked separately from canonical game progression.
