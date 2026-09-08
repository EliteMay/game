# Scrap Factory UI Redesign Report

Date: 2026-09-08
Status: **Implementation merged / Static validation complete / Interactive visual acceptance pending**

This report records the implementation evidence for the `REQUIREMENTS.md` UI / HUD contract. It does not replace `REQUIREMENTS.md` or `SPEC.md` as a Source of Truth.

## Direction

The UI redesign follows the project contract:

**World-first + Diagnostic-on-demand**

```text
Normal gameplay
< Interaction / Build
< Factory Diagnostic Overlay
< Full Management / Home panels
```

The first-person 3D world remains the primary surface. Persistent UI density is kept low, and detailed information is disclosed only when the player interacts, builds, diagnoses, manages the factory, or uses the Home PC.

The implementation follows the existing `Stylized Industrial Realism` direction. UI uses restrained industrial utility surfaces rather than decorative sci-fi HUD density.

## Domain-first visual research used

The implementation direction was selected after comparing factory / first-person / exploration UI patterns from relevant games, especially:

- Satisfactory — first-person factory/build context and experienced-player shortcuts
- Techtonica — diagnostic overlay and reduction of persistent notification/status clutter
- Foundry — screen-space machine interaction for readable factory operation
- Subnautica — first-person world-first HUD hierarchy
- Dyson Sphere Program / Factorio — factory diagnosis and information architecture only, not direct visual styling

The references were used for structural principles, not copied layouts/assets.

## Phase 1 — Normal HUD / Interaction / Inventory / Build

PR: `#29 Implement world-first Scrap Factory HUD phase 1`
Merged commit: `67bee96afcf789c508003b1d09d1573a9c377d51`
Validation: `Validate Web Game #224` — success

Implemented:

- Cash / Lifetime Revenue removed from normal persistent gameplay HUD
- Backpack capacity becomes contextual near capacity instead of permanent
- Zone becomes transient instead of permanent HUD information
- Main Goal moved to compact upper-left priority surface
- Objective detail expands briefly after an update and then collapses
- permanent command rails / duplicate shortcut bars removed
- contextual Build / Dismantle hints retained
- Interaction Prompt structured as `Target -> Primary Action -> Status / Reason`
- blocked pickup explains Backpack-full cause
- Backpack rendered as visual Slot grid while keeping canonical inventory data unchanged
- selected Item detail added
- Hand Craft exposes craftable / blocked state and missing material cause
- Build selector gains category hierarchy
- Quick Build 1–5 appears only in Build context
- existing placement invalid reasons remain available

Compatibility preserved:

- Save schema
- 2.5m Grid
- Directional Logistics
- Power / Production simulation
- progression

## Phase 2 — Factory Diagnostics / Management

PR: `#30 Implement factory diagnostics and management hierarchy`
Merged commit: `4753e28659ae142941b71025d13b926b807fd0b3`
Validation: `Validate Web Game #226` — success

Implemented:

- `V` toggles on-demand first-person Factory Diagnostics
- diagnostic labels are projected from actual building mesh positions through the current world camera
- `analyzeFactory()` is reused as the single diagnostic source
- per-building causes include Power, production input/output, logistics, waiting, and Storage states
- healthy labels are proximity-limited and warning/info density is capped
- Factory Management hierarchy changed to `Overview -> Problems -> Production` before secondary tools
- Problems view exposes cause/detail and `LOCATE`
- `LOCATE` closes Management and focuses the relevant building in the 3D diagnostic overlay
- Production view exposes theoretical vs route-supported throughput, utilization, bottlenecks, and production equipment summary
- diagnostics read the live runtime game object instead of waiting for autosave state

The diagnostic overlay answers **where and why**. Full Management answers **how the factory is performing and what to inspect next**.

## Phase 3 — Home PC / Tutorial / Guide / Storage

PR: `#31 Restructure Home PC and Quick Guide surfaces`
Merged commit: `7117e9412325c0dac0c47bf9695ddecd35f9bdf6`
Validation: `Validate Web Game #229` — success

Implemented:

- Home PC now opens through a Home Console dashboard instead of dropping directly into the Upgrade list
- dashboard prioritizes Current Goal, Backpack, Home Storage, Upgrades, unread Tutorials, and exploration preparation
- detailed functions continue to use the existing Home System logic rather than duplicating business rules
- Factory management remains separate: `V` Diagnostics / `P` Management
- `O` is now a compact in-play Quick Guide
- detailed `why / success / example / diagnosis` material remains in Home PC -> Tutorial Library
- opening `O` does not mark the detailed Tutorial Library as read
- Workbench retains precise one-item transfer and adds `ALL` transfer for repeated preparation

No Home upgrade economy, Save schema, or tutorial progression semantics were changed.

## Phase 4 — Notifications / Pause / Settings

PR: `#32 Refine notifications, pause, and settings hierarchy`
Merged commit: `0f9516555ee4186dcd13784912175922a5c2e655`
Validation: `Validate Web Game #231` — success

Implemented:

- notifications moved away from the center/build interaction area
- maximum visible Toasts capped at 3
- identical tone/message notifications within 1.8 seconds aggregate into `xN`
- severity remains visible through icon/text plus semantic color
- existing Factory session log remains the history surface
- Pause shows current Main Goal/progress/hint
- Resume is the dominant Pause action and explicitly shows `Esc`
- Pause Guide action routes to Quick Guide
- Save / Settings remain secondary
- Game Hub exit is visually separated
- Escape handling while Pause is open resumes without duplicate lower-level handling
- Settings receive readable Core, Guidance/HUD, Accessibility/Graphics, and Save Data hierarchy without changing setting semantics

## Phase 5 — Shared Visual Language

PR: `#33 Unify Scrap Factory industrial UI visual language`
Merged commit: `1eca1cbb364a02dcac5a57c41b6cd579e6b0343d`
Validation: `Validate Web Game #233` — success

Implemented:

- common steel surface / line / text / state tokens
- common hard-edged industrial frame for major Panel, Factory Management, Home, PC, and Automation surfaces
- consistent header hierarchy, micro-labels, buttons, keyboard keys, tabs, form controls, focus states, and scrollbars
- Industrial Yellow reserved for Primary Action / priority
- Red reserved for Error / Critical
- Green reserved for healthy / complete states
- gameplay HUD remains more transparent and less dense than management screens
- reduced-motion and visible keyboard-focus behavior preserved

This is intentionally a CSS-first visual pass; runtime simulation and progression behavior were not changed.

## Runtime entrypoints added / updated

Current stable `games/scrap-factory/progression-ui.js` loads the new UI layers through the existing production entrypoint, including:

- `home-surface-ui.js`
- `pause-notification-ui.js`
- `visual-language-ui.js`

Key implementation files:

- `games/scrap-factory/adaptive-ui.js`
- `games/scrap-factory/adaptive-ui.css`
- `games/scrap-factory/factory-management.js`
- `games/scrap-factory/feature-pack.js`
- `games/scrap-factory/factory-management.css`
- `games/scrap-factory/home-surface-ui.js`
- `games/scrap-factory/home-surface-ui.css`
- `games/scrap-factory/pause-notification-ui.js`
- `games/scrap-factory/pause-notification-ui.css`
- `games/scrap-factory/visual-language-ui.js`
- `games/scrap-factory/visual-language-ui.css`

## Regression coverage added

The default `npm run validate` now also includes UI-specific regression checks:

- `scripts/adaptive-ui.test.mjs`
- `scripts/factory-management.test.mjs`
- `scripts/home-surface-ui.test.mjs`
- `scripts/pause-notification-ui.test.mjs`
- `scripts/visual-language-ui.test.mjs`

These run in addition to the existing game, progression, final-phase, Home, settings, and visual baseline checks.

## Contracts intentionally preserved

No phase of this UI redesign intentionally changes:

- Save key or schema versions
- Rank 1 -> 7 progression
- Main Clear / Post Clear semantics
- Existing Factory layout
- Directional Logistics
- 2.5m Build Grid
- Storage Back Pressure
- Power simulation
- Drone / production simulation results
- Home upgrade economy
- Quick Build 1–5 ordering
- GitHub Pages relative-path contract

## Static validation evidence

All implementation PR heads passed `Validate Web Game` before merge:

| Phase | PR | Workflow | Result |
| --- | ---: | ---: | --- |
| HUD / Interaction / Inventory / Build | #29 | #224 | success |
| Diagnostics / Management | #30 | #226 | success |
| Home PC / Guide | #31 | #229 | success |
| Notifications / Pause / Settings | #32 | #231 | success |
| Visual Language | #33 | #233 | success |

## Not yet verified

Static CI does **not** prove the final interactive visual result.

Still requires actual browser / user review:

- final HUD spacing while actively moving in first person
- actual 3D diagnostic label placement and overlap under real camera movement
- Pointer Lock transitions across Pause / Guide / Home PC / Management / Diagnostics
- Build Preview ergonomics while rotating and placing equipment
- narrow viewport behavior in a real browser
- Firefox interaction behavior
- real GPU / WebGL performance with a large Factory
- contrast/readability against all world lighting conditions
- final screenshot / visual acceptance review

Therefore the current state is:

**UI implementation complete according to the current contract and static regression suite; final interactive visual acceptance remains pending.**
