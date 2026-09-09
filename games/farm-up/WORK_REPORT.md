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

## Automated validation evidence already recorded for the implementation candidate

- `node --check` on Farm Up JavaScript modules.
- Farm Up Core / Storage tests passed.
- Initial 4×4 land and expanded 7×4 land rules.
- Tutorial order.
- One-wheat Vertical Slice economy reaches the first land purchase amount.
- Water requirement and rain-as-watering behavior.
- Lv2 tool cross-area behavior.
- Save serialization/parse round trip.
- Invalid JSON and future schema rejection.
- HTML IDs referenced by the controller had no missing/duplicate IDs in the implementation candidate.

## Current repository integration verification

### Verified from current GitHub source

- Farm Up implementation files are present under `games/farm-up/`.
- `scripts/farm-up.test.mjs` is present.
- Game Hub exposes GAME 03 / Farm Up and links to `games/farm-up/index.html`.
- Hub summary code reads Farm Up through its own storage module; Scrap Factory and Orbloom save schemas are not modified by this integration.
- Root validation command includes the Farm Up regression test.
- No new package dependency or build system was added.

### Not verified in this environment

- Full `npm run validate` execution against the current GitHub checkout. The available local execution environment cannot resolve GitHub to clone the repository, so current-source execution must be confirmed by repository CI or another runtime with the checkout available.
- Actual browser pointer-lock feel.
- WebGL output on the user's GPU/browser.
- Final visual composition / responsive overflow in a real browser screenshot.
- Actual farming-loop play feel and balance.

The Guide's real Game Playtest / Visual Verification gate remains open until the game is played in an actual browser. These items must not be represented as verified evidence.

## Next phase after playtest

Continue `REQUIREMENTS.md` in order: crop variety/orders/storage → livestock → rice/orchard/greenhouse → machinery → processing/employees/economy → automation/power/offline progression → mega farm/Main Clear.
