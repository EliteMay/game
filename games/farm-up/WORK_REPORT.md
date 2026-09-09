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

## Validation

### Automated / repository CI verified

- Current `main` GitHub Actions `Validate Web Game` project-contract job passed `npm run validate` after Farm Up was registered in the root validation command.
- GitHub Pages workflow validation job also passed `npm run validate` for the same current `main` revision.
- JavaScript syntax / JSON baseline checks passed in the reusable baseline workflow for the current revision.
- Farm Up regression coverage includes:
  - initial 4×4 land and expanded 7×4 land rules;
  - tutorial order;
  - one-wheat Vertical Slice economy reaching the first land purchase amount;
  - water requirement and rain-as-watering behavior;
  - Lv2 tool cross-area behavior;
  - save serialization/parse round trip;
  - invalid JSON and future-schema rejection.

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
