# Farm Up — Domain / Visual Research Brief

Updated: 2026-09-09

## Current user feedback

After the first Playable MVP reached GitHub Pages, the first direct visual / control feedback was:

- the 3D graphics feel too simple;
- moving the camera / viewpoint is difficult.

This feedback changes the immediate priority from adding more gameplay systems to improving **world readability, farm atmosphere and camera intent fidelity** while preserving the existing farming loop and save contract.

## Target Type

- Product: 3D farming progression / management game
- Camera: Third-person 3D
- Primary Task: move around a farm → aim at a plot → till / plant / water / harvest → sell → reinvest
- Secondary Task: manage upgrades and later large-scale farm systems
- Audience: Desktop player / repository owner
- Session pattern: Repeated medium-to-long sessions with long-term save progression
- Density: Low during direct farming, medium/high inside management surfaces
- Input: keyboard + mouse
- Tone: Bright, calm, rewarding, modern farming
- Visual ambition: High enough that world growth itself feels rewarding

## Representative References

### Palia

Official gameplay / support:
https://support.palia.com/hc/en-us/articles/7475603096980-Gameplay

Official site:
https://palia.com/

Relevant transfer:

- Third-person camera is a strong fit for gardening because it keeps the character and the work area visible together.
- Gardening interactions benefit from a clear relationship between player position, plot position and camera angle.
- Bright stylization, readable crops and an inhabited home plot can create atmosphere without realistic rendering cost.
- Camera movement should feel like a normal third-person world camera rather than forcing an FPS-style input mode.

Do not copy:

- MMO / social structure.
- Fantasy identity.
- Decorative density that competes with farming targets.

### Dinkum

Official site:
https://dinkum.com/

Relevant visual transfer:

- Crops, soil, paths, fences, trees and props form distinct layers, so a farm reads as a place rather than a flat set of plots.
- Slightly exaggerated crop silhouettes remain legible from a third-person farming angle.
- Ground color variation and small props add richness without requiring high-poly assets.

Do not copy:

- Strong toy-like proportions as the final identity.
- Australian setting / palette as a theme requirement.

### My Time at Sandrock

Official developer:
https://pathea.net/

Relevant visual transfer:

- Third-person farming areas are easier to read when the camera has a higher working angle and the character remains visible at the lower center of the frame.
- Fences, paths, buildings and distant landmarks give scale and depth even when the underlying geometry is stylized.
- Crops should have recognizably different silhouettes instead of only different colors.

Do not copy:

- Desert setting.
- RPG / workshop systems outside Farm Up's Product Core.

### Farming Simulator 25

Official:
https://www.farming-simulator.com/about.php?country=jp&lang=en

Relevant transfer:

- Agricultural machinery should eventually read as real machinery rather than toys.
- Large fields, barns, silos and production buildings need believable scale.
- Different work types should create visibly different zones of the farm.

Do not copy:

- Full simulation complexity.
- Hyper-realistic machinery controls.
- Visual realism that reduces crop readability or makes the browser game unnecessarily heavy.

### Farm Together 2

Steam:
https://store.steampowered.com/app/2418520/Farm_Together_2/

Relevant transfer:

- Start from a small plot and visually grow toward a very large farm.
- Crops, trees and animals remain easy to identify in a colorful 3D environment.
- Expansion itself can be a strong visible reward.

Do not copy:

- Extreme cartoon / toy proportions.
- Multiplayer or life-sim features outside Farm Up's Product Core.

### Lightyear Frontier

Steam:
https://store.steampowered.com/app/1677110/Lightyear_Frontier/

Relevant transfer:

- Large-scale farming can remain pleasant and visually readable.
- Powerful machinery can materially change how large fields are worked.
- Farm building and expansion should visibly change the world.

Do not copy:

- Sci-fi setting.
- Mech identity.
- Exploration / survival structure that would move focus away from the farm.

## Current UI / World review

### KEEP

- Third-person perspective.
- Center-screen targeting for field work.
- Small persistent HUD plus contextual interaction prompt.
- Bright natural palette.
- Existing day / weather state connection.
- Current gameplay / save separation between Core, World and Storage.

### FIX

- Initial camera should face the first field instead of making the player re-orient before working.
- Camera rotation should not require Pointer Lock.
- Add direct zoom and a quick camera reset.
- Raise the default camera angle so multiple nearby plots remain readable.
- Increase the number of world layers: paths, fence, grass, rocks, props and structure details.
- Give tilled soil visible furrows and wet/dry differentiation.
- Give each crop a stronger silhouette and mature state.
- Replace the capsule-like farmer placeholder with a readable stylized character and basic walk motion.
- Strengthen lighting / weather presentation without bloom-heavy effects.

### REMOVE / AVOID

- Pointer Lock as the normal farming camera control.
- Empty flat grass as the dominant first-view surface.
- Buildings that read only as primitive boxes with no functional detail.
- Crop identity based mostly on color.
- Hyper-realistic rendering, heavy texture packs or high-poly assets before gameplay scale needs them.

## Visual / camera decision

Adopt a **Stylized Modern Farming + Orbit Work Camera** direction:

```text
Readable third-person farmer
+
Right-drag orbit camera
+
Wheel zoom / quick reset
+
Higher default farming angle
+
Layered farm environment
+
Distinct tilled soil and crops
+
Modern farm structures with functional detail
```

The world itself remains the primary visual reward. The goal of this pass is not to make the MVP look final, but to move it out of placeholder territory and make the farming surface pleasant enough for real playtesting.

## Visual Progression Contract

```text
Small manual farm
→ Organized crop farm
→ Livestock / silos / greenhouse / rice / orchard
→ Tractors and large fields
→ Processing and warehouse district
→ Automated modern mega farm
```

Future assets should continue this direction rather than replacing the world with a different visual identity.