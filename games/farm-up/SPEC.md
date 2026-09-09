# Farm Up — MVP Implementation Spec

Updated: 2026-09-09
Status: Playable MVP implementation
Requirements Source of Truth: `REQUIREMENTS.md`

## Runtime

- Static browser game under `games/farm-up/`.
- Third-person 3D.
- Uses the same pinned Three.js CDN version as Orbloom: `three@0.185.0`.
- No build step or new package dependency.
- Desktop / keyboard + mouse.

## MVP loop

```text
Move
→ Till
→ Plant wheat
→ Water
→ Grow
→ Harvest
→ Ship
→ Money
→ Buy first land expansion
```

Starting cash is `¥490`. Wheat seed is `¥8`, wheat shipment is `¥32`, so the first completed tutorial crop leaves `¥514`, enough for the required `¥500` first land expansion. After expansion the player keeps `¥14`, reaches Farm Lv2 and can immediately plant the newly unlocked carrot (`¥14`) instead of entering an economy deadlock.

## Modules

- `config.js` — crops, progression, land, tool, tutorial, season, weather balance values.
- `core.js` — canonical gameplay state/rules independent from DOM and Three.js.
- `world.js` — third-person rendering, camera, targeting, environment and visible growth only.
- `game.js` — controller connecting Core / World / Storage / HUD.
- `storage.js` — local schema-v1 save, recovery, export/import/reset.

## MVP content

- 30-level XP curve reserved from the first save schema.
- Crops: wheat, carrot, corn, strawberry.
- 4×4 initial field; one expansion to 7×4.
- Hoe / seed / water / harvest tools.
- One tool upgrade: Hoe + Watering Can Lv2 affect a cross of up to five valid tiles.
- Money / Farm Level / XP.
- Day/night lighting, four seasons, sunny/cloudy/rain/heavy rain.
- Rain waters outdoor crops while active.
- Minimal contextual HUD and action-based tutorial.

## Camera / movement contract

The camera is an orbit-style third-person farm camera intended for repeated field work, not an FPS camera.

- Initial camera starts behind the farmer and looks toward the first field.
- `WASD` movement remains camera-relative.
- Hold right mouse button and drag to orbit / tilt the camera.
- Mouse wheel changes camera distance from roughly `5.2` to `11.5` meters.
- `C` resets the camera behind the farmer at the default farming angle.
- Pointer Lock is not required, so the cursor remains available for HUD / upgrade controls.
- Pitch is limited to a practical farming range to avoid disorienting upside-down / ground-level views.
- Camera sensitivity and distance remain compatible with the existing settings save.

## World visual contract

The MVP world uses a **Stylized Modern Farming** direction without adding external asset dependencies.

Implemented visual layers:

- ACES filmic tone mapping and softer daylight / weather exposure changes.
- More detailed barn with foundation, doors, trim and loft window.
- Detailed silo with rings and ladder.
- Raised water tank, piping, shipping crates, hay bales and farm cart.
- Farm paths, gravel, fence, grass clumps, rocks and multi-volume tree line.
- Tilled plots show raised furrows and wet/dry soil distinction.
- Wheat, carrot, corn and strawberry have more distinct silhouettes and mature states.
- Farmer avatar has head, hat, clothing, arms, legs, boots and walking animation instead of a single capsule body.
- Existing day/night and rain systems remain connected to the same canonical game state.

The goal is higher visual readability and a more inhabited farm, not realism-heavy simulation or high-poly assets.

## Save contract

Canonical key: `gameHub.farmUp.save`
Recovery key: `gameHub.farmUp.recovery`
Schema: v1

Load flow is parse → schema check → normalize → validate → use. A corrupt/future save is not silently treated as valid. Backup export and restore round-trip use the same schema.

Non-automated crops do **not** progress while the game is closed. Offline progression remains reserved for future automated systems as required by `REQUIREMENTS.md`.

## Controls

- `WASD`: move
- `Shift`: sprint
- right mouse drag: orbit / tilt third-person camera
- mouse wheel: zoom camera
- `C`: reset camera behind farmer
- `E`: work / interact
- `1`: hoe
- `2`: seed
- `3`: watering can
- `4`: harvest
- `Q`: cycle unlocked crop
- `Esc`: close panels / normal browser escape behavior

## Not included in this MVP

Livestock, rice, orchard, greenhouse gameplay, drivable machinery, free-form build mode, processing, employees, power, automation, offline production and final Main Clear progression remain Later Phases. They are not removed from `REQUIREMENTS.md`.