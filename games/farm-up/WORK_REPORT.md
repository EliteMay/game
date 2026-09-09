# Farm Up — Work Report

Date: 2026-09-09
Phase: Vertical Slice / Playable MVP implementation

## Implemented

- Third-person 3D farm runtime under `games/farm-up/`.
- Required first loop: move → till → plant → water → grow → harvest → ship → money → land expansion.
- 4 MVP crops, Farm Level / XP, first land expansion and hand-tool upgrade.
- Basic day/night, seasons and weather.
- Local schema-v1 save, autosave/manual save, backup export, restore and reset recovery.
- Contextual HUD, tutorial, settings, crop/tool shortcuts and startup failure messaging.
- Core / Storage regression tests.
- Game Hub GAME 03 card and launch route.
- Game Hub Farm Up summary for money, Farm Level, play time, last played and MVP-loop status.
- Game Hub total play time / achievement summary now includes Farm Up.
- `scripts/farm-up.test.mjs` registered in `npm run validate` and as `npm run test:farm-up`.
- Fixed the first-progression economy deadlock: the tutorial wheat shipment now leaves enough money after the ¥500 land expansion to plant the Farm Lv2 carrot immediately.
- Farm Up regression tests now also guard post-expansion seed affordability, Farm Up HTML/controller ID integrity, local page references and Game Hub Farm Up summary wiring.

## Validation

### Automated / repository CI evidence

- The integrated Farm Up revision before the final economy-guard change passed the GitHub Actions `Validate Web Game` project-contract job with `npm run validate`.
- The corresponding GitHub Pages workflow validation job also passed `npm run validate`.
- JavaScript syntax / JSON baseline checks passed in the reusable baseline workflow.
- The final economy-guard revision must also pass the current repository CI run before this report treats that exact revision as fully automated-verified.

### Farm Up regression coverage

- initial 4×4 land and expanded 7×4 land rules;
- tutorial order;
- one-wheat Vertical Slice economy reaching the first land purchase amount;
- post-expansion money remaining sufficient for the newly unlocked carrot seed;
- water requirement and rain-as-watering behavior;
- Lv2 tool cross-area behavior;
- save serialization/parse round trip;
- invalid JSON and future-schema rejection;
- Farm Up HTML IDs referenced by the controller;
- Farm Up local HTML references;
- Game Hub Farm Up summary IDs, card route and stylesheet wiring.

### Current repository integration verified

- Farm Up implementation files are present under `games/farm-up/`.
- `scripts/farm-up.test.mjs` is present.
- Game Hub exposes GAME 03 / Farm Up and links to `games/farm-up/index.html`.
- Hub summary code reads Farm Up through its own storage module; Scrap Factory and Orbloom save schemas are not modified by this integration.
- Root validation command includes the Farm Up regression test.
- No new package dependency or build system was added.

### Not verified in this environment

- Actual browser pointer-lock feel.
- WebGL output on the user's GPU/browser.
- Final visual composition / responsive overflow in a real browser screenshot.
- Actual farming-loop play feel and balance.

The Guide's real Game Playtest / Visual Verification gate remains open until the game is played in an actual browser. These items must not be represented as verified evidence.

## Next phase after playtest

Continue `REQUIREMENTS.md` in order: crop variety/orders/storage → livestock → rice/orchard/greenhouse → machinery → processing/employees/economy → automation/power/offline progression → mega farm/Main Clear.
