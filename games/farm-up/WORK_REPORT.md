# Farm Up — Work Report

Date: 2026-09-09
Phase: Vertical Slice / Playable MVP + first camera / visual quality pass

## Implemented

- Third-person 3D farm runtime under `games/farm-up/`.
- Required first loop: move → till → plant → water → grow → harvest → ship → money → land expansion.
- 4 MVP crops, Farm Level / XP, first land expansion and hand-tool upgrade.
- Basic day/night, seasons and weather.
- Local schema-v1 save, autosave/manual save, backup export, restore and reset recovery.
- Contextual HUD, tutorial, settings, crop/tool shortcuts and startup failure messaging.
- Game Hub GAME 03 card, launch route and Farm Up save summary.
- Farm Up regression tests registered in `npm run validate` and `npm run test:farm-up`.
- Fixed the first-progression economy deadlock: after the ¥500 tutorial land expansion the player still has enough money to plant the newly unlocked carrot.

## Camera / control pass

Direct user feedback after the first MVP was that viewpoint movement was difficult. The camera was therefore changed from a Pointer Lock style control to an orbit-style farm camera.

Implemented:

- Initial camera now starts behind the farmer looking toward the first field.
- Right mouse drag rotates / tilts the camera.
- Mouse wheel zooms between a practical near/far range.
- `C` resets the camera behind the farmer.
- Pointer Lock is no longer required for normal farming.
- `WASD` remains camera-relative.
- Existing sensitivity and camera-distance settings remain in the same save schema.
- On-screen control guidance and Settings text were updated to the new controls.

## Visual quality pass

Direct user feedback also identified the first world as visually too simple. The first visual pass keeps the existing Three.js-only architecture and adds detail without a new asset/dependency pipeline.

Implemented:

- ACES filmic tone mapping and improved daylight / weather exposure.
- More detailed barn with foundation, doors, trim and loft window.
- More detailed silo with structural rings and ladder.
- Raised water tank and piping.
- Shipping area crates, hay bales and a farm cart.
- Farm paths, gravel, fence, grass clumps, rocks and a multi-volume tree line.
- Tilled soil now has visible raised furrows and stronger wet/dry distinction.
- Wheat, corn, carrot and strawberry models have more distinct silhouettes and mature states.
- Farmer placeholder upgraded to a readable stylized character with clothing, limbs, hat, boots and walking animation.
- Existing weather / day state continues to drive the world presentation.

## Research / direction

`DESIGN_RESEARCH.md` was updated from the latest user feedback and current third-person farming references. The retained direction is:

```text
Stylized Modern Farming
+
Orbit Work Camera
+
Readable crops / soil
+
Layered farm environment
+
Visible world growth
```

No external visual assets were copied or introduced by this pass.

## Regression coverage

Farm Up automated coverage now includes:

- initial 4×4 and expanded 7×4 land rules;
- tutorial order;
- first-wheat economy and post-expansion seed affordability;
- water requirement and rain-as-watering behavior;
- Lv2 tool cross-area behavior;
- save serialization / parse round trip;
- invalid JSON and future-schema rejection;
- Farm Up HTML/controller ID integrity and local references;
- Game Hub Farm Up summary wiring;
- right-drag camera marker;
- wheel zoom marker;
- camera reset marker;
- absence of `requestPointerLock` from the Farm Up world runtime;
- visual-pass markers for ground detail, yard props, furrows, tone mapping and player animation.

## Verification state

### Source / automated

- `world.js` replacement was syntax-checked before GitHub reflection.
- Current-source validation is delegated to the repository `npm run validate` GitHub Actions run after the final documentation commit.
- No save schema change, new package dependency or build-system change was introduced.

### Still requires actual browser playtest

- Whether right-drag sensitivity feels correct for the user.
- Whether the default working angle is comfortable during repeated till / plant / water / harvest actions.
- Whether wheel zoom range is appropriate.
- Final WebGL composition, shadow quality and object readability on the user's browser/GPU.
- Whether added world props make the farm feel richer without making field targeting visually noisy.
- Actual farming-loop balance / feel.

The Guide's Actual Playtest / Visual Verification gate remains open until the deployed revision is played in a real browser. These items must not be represented as verified evidence.

## Next after playtest

If camera and first visual layer feel good, continue the current `REQUIREMENTS.md` progression order: crop variety / orders / storage → livestock → rice / orchard / greenhouse → machinery → processing / employees / economy → automation / power / offline progression → mega farm / Main Clear.