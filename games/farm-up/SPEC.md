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
- `world.js` — third-person rendering, targeting, environment and visible growth only.
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

## Save contract

Canonical key: `gameHub.farmUp.save`
Recovery key: `gameHub.farmUp.recovery`
Schema: v1

Load flow is parse → schema check → normalize → validate → use. A corrupt/future save is not silently treated as valid. Backup export and restore round-trip use the same schema.

Non-automated crops do **not** progress while the game is closed. Offline progression remains reserved for future automated systems as required by `REQUIREMENTS.md`.

## Controls

- `WASD`: move
- `Shift`: sprint
- mouse: third-person camera
- `E`: work / interact
- `1`: hoe
- `2`: seed
- `3`: watering can
- `4`: harvest
- `Q`: cycle unlocked crop
- `Esc`: release pointer lock

## Not included in this MVP

Livestock, rice, orchard, greenhouse gameplay, drivable machinery, free-form build mode, processing, employees, power, automation, offline production and final Main Clear progression remain Later Phases. They are not removed from `REQUIREMENTS.md`.
