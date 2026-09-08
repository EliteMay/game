# Orbloom Onboarding Research

## Why this exists

The first-run experience must teach the player what to touch, what changed after the touch, and why the next action matters. Orbloom onboarding is based on observed patterns from established incremental / idle games rather than a generic explanatory overlay.

## Target type

- Primary task: learn the incremental loop by performing real gameplay actions.
- Audience: first-time player who may not know idle-game terminology such as Generator.
- Primary first-run device in current user testing: phone / touch input.
- Density: the normal Orbloom HUD is relatively dense, so tutorial targeting must remove ambiguity rather than add more competing text.
- Success criterion: a player should be able to identify the next touch target without understanding positional directions such as “top”, “left” or “bottom”.

## Reference games reviewed

### AdVenture Capitalist

Observed pattern:
- Start with one obvious business action.
- Let the player perform the repetitive action first.
- Introduce automation only after the player understands what is being automated.
- Early prompts point at the real gameplay control rather than explaining a system elsewhere.

Transfer to Orbloom:
- Matter manual production comes before buying automation.
- Generator is introduced as the thing that replaces the repeated action.

### Egg, Inc.

Evidence:
- https://www.talkandroid.com/16189-egg-inc-ultimate-walkthrough-and-game-guide/
- https://gametaco.net/egg-inc-pros-and-cons/

Observed pattern:
- One dominant early action: the large red chicken button.
- The core action is visually obvious as a control before the player understands every system around it.
- Immediate cause and effect keeps the instruction grounded in the world.

Transfer to Orbloom:
- The current tutorial target must become visually dominant while it is being taught.
- A first-time player should not need to infer that a status-looking resource card is tappable.

### Idle Planet Miner

Evidence:
- https://idle-planet-miner.fandom.com/wiki/New_Starter_walkthrough
- https://idle-planet-miner.fandom.com/wiki/New_Starters_Strategy_Guide
- https://www.youtube.com/watch?v=cfO3LV8_aWc

Observed pattern:
- The first planet itself is selected and purchased directly.
- The in-game character prompt identifies the real object the player should interact with.
- The walkthrough moves into later research / production systems only when they become relevant.
- The first planet action is concrete: touch the planet, then upgrade the controls that appear for that planet.

Transfer to Orbloom:
- Tutorial instructions target the exact current DOM control rather than describing its approximate screen location.
- New systems are taught only when unlocked.

### Cell to Singularity

Evidence:
- https://games.computerlunch.com/cell_to_singularity/
- https://celltosingularity.com/faq/
- https://cell-to-singularity.fandom.com/wiki/Help_for_Beginners

Observed pattern:
- The opening instruction is extremely direct: `TAP TO EARN ENTROPY` is displayed over the gameplay view.
- The player taps first and sees currency react before learning the wider evolution system.
- Progress broadens from one action into generators and evolution.

Transfer to Orbloom:
- The instruction for the next action must be attached visually to the current gameplay target.
- Short direct action language is more important than explaining terminology before the first touch.

### Idle Miner Tycoon

Evidence:
- https://www.kolibrigames.com/blog/lets-dig-in/
- https://idleminertycoon.fandom.com/wiki/Fundamental_Gameplay

Observed pattern:
- Important mine elements are called out with large arrows and a tooltip close to the related object.
- The visual indicator connects advice to a specific screen object instead of relying on location prose.
- Early manual work later becomes automated by managers, making the automation benefit visible in context.

Transfer to Orbloom:
- Use an unmistakable pointer / arrow-style treatment on the exact target.
- Non-target controls should not compete for attention while the tutorial asks for one specific touch.

### Additional touch-tutorial pattern check

A broader mobile-game screenshot check also found a common pattern of dimming the rest of the screen and placing a hand/finger directly beside the required control. The useful transferable principle is not the exact art style; it is that the gesture indicator and the actual target are visually connected.

## Shared onboarding patterns

The references converge on these patterns for Orbloom:

1. **One action at a time.** Do not explain all controls on the title screen.
2. **Point at the exact real control.** Do not use approximate directions such as “the card at the top”.
3. **Use a gesture cue on touch.** A visible finger / pointer and `ここをタップ` must sit next to the exact target.
4. **De-emphasize and block unrelated actions during the guided step.** The highlighted hole remains usable; dimmed areas do not accept accidental taps.
5. **Advance from game state, not a Next button.** A step completes when the requested gameplay action succeeds.
6. **Show cause and effect immediately.** Resource gain, generator output and evolution feedback remain visible.
7. **Teach automation after manual interaction.** The player creates Matter manually, then buys the system that replaces repetition.
8. **Teach reinvestment before more systems.** Repeated generator upgrades establish the incremental loop.
9. **Use progressive disclosure.** Species, Research and Expedition are taught when relevant.
10. **Complete the first newly unlocked system.** Continue through Life Scan and first Species placement rather than stopping at Water unlock.
11. **Keep help recallable.** HELP can restore the current-state guide later.

## KEEP / FIX / REMOVE

### KEEP

- State-driven progression: the guide advances from successful gameplay actions.
- Spotlight hole around the real target.
- Separate HELP surface.
- One-time starter reserve for newly unlocked resources.
- Existing Orbloom visual identity and normal HUD after onboarding.

### FIX

- The spotlight border alone is not strong enough on a phone.
- A resource card can still look like passive status information.
- The coach card can explain the correct action while the user still cannot tell which object it means.
- Existing saves need the improved guide without losing progress.

### REMOVE

- Positional language such as `画面上`, `左`, `左下` as the primary way to identify a target.
- Dependence on green glow alone to communicate “this exact thing is the next action”.
- Allowing taps on unrelated dimmed UI while a guided action is active.

## Orbloom onboarding decision

The first-run flow remains:

```text
Generate Matter
-> Buy first Matter Generator
-> Reinvest until Matter Generator Lv.4
-> Reach the first Planet Evolution requirement
-> Trigger Planet Evolution
-> Activate the newly unlocked Water Generator
-> Accumulate the Life Scan cost
-> Run the first Life Scan
-> Place the discovered Species into a Biome
-> Hand control back to the player with NEXT OBJECTIVE
```

The interaction treatment changes to a more game-like touch tutorial:

```text
Dim unrelated UI
-> leave only the actual target usable
-> draw a strong target ring
-> place a large finger beside that target
-> show 「ここをタップ」 / 「ここを選ぶ」 beside the finger
-> player performs the real action
-> game state advances the tutorial automatically
```

The coach card remains supporting context, not the primary locator. If the player ignores the text, the finger and target treatment should still communicate where to touch.

## Mobile usability follow-ups

### First follow-up: Generator affordance

A real-phone report showed that the first Generator remained unclear because the resource card looked like a read-only status display and `Generator` was unexplained jargon.

Changes introduced:
- explain `Generator` as `自動生産装置`;
- resource cards expose `TAP → 自動生産を購入` / next auto-production level;
- affordable generator cards receive a stronger ready state;
- coach placement avoids intentionally covering the target on narrow viewports;
- touch-oriented verbs use `TAP` / `SELECT`.

### Second follow-up: target identification

A second real-phone report showed that wording such as `画面上の MATTER` still failed because “top” was not a meaningful locator on the responsive mobile layout.

Decision:
- never require the player to translate a relative direction into a target;
- place an animated finger and Japanese `ここをタップ` label at the target itself;
- block accidental taps in the dimmed regions;
- auto-bring an off-screen target into view when a new guide step begins;
- bump the onboarding version so existing saves see the improved guidance without resetting canonical progression.

## New-resource bootstrap

A newly unlocked resource needs a valid first source. Water/Oxygen/Energy can receive a one-time starter reserve equal to the first generator cost when first unlocked.

```text
Planet Evolution
-> small starter reserve
-> buy first generator
-> resource becomes self-sustaining
```

The grant is persisted and cannot be farmed repeatedly.

## Existing-save behavior

Onboarding completion is tracked separately from canonical game progression and keyed to the current save. Version 5 intentionally re-opens the improved target-first guide for saves that saw an earlier version, while deriving the current step from actual save state.

This means:
- a progressed save is not reset;
- completed gameplay actions are not replayed unnecessarily;
- HELP can re-open the current-state guide;
- starter reserves are not duplicated.

## Validation targets

- Fresh save starts with an exact visible touch target.
- Every actionable onboarding step can render a finger / `ここをタップ` or `ここを選ぶ` cue at the actual target.
- Positional language is not required to locate the first Generator.
- Dimmed non-target regions intercept accidental touches during actionable steps.
- The real target remains usable through the spotlight opening.
- Off-screen targets can be brought into view when their step starts.
- The first Generator is explained as auto-production, not unexplained jargon.
- Resource cards expose a tap-to-buy / tap-to-upgrade action.
- Generator reinvestment is taught before Planet Evolution.
- First Planet Evolution leads to an immediately usable Water Generator.
- The guide continues until the first Life Scan and Species placement.
- Existing saves are not reset.
- HELP remains available after tutorial completion or skip.
- New-resource starter reserves remain one-time and non-farmable.
