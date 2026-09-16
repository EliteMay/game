// Retired compatibility module.
//
// Phase 4-B production statistics and bottleneck information are now rendered
// directly by the canonical Factory Management surface in feature-pack.js.
// Keeping a second timer-driven DOM writer here caused the Overview layout to
// alternate between the canonical six-card view and the old appended-card view.
//
// This file remains as a no-op because older import paths may still reference it.
// Do not add periodic DOM rendering here; Factory Management has one render owner.
export {};
