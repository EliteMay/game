// Compatibility entrypoint retained for the existing factory-management import contract.
//
// The Phase 4-B statistics are already part of feature-pack.js's canonical
// Factory Management renderer. The previous implementation polled the same
// #factory-management-content surface every second and appended a second set of
// cards after the canonical renderer had replaced the panel. That created two
// alternating overview layouts.
//
// Keep this module intentionally side-effect free: Factory Management has one
// visible renderer/owner now.
export const PHASE4B_MANAGEMENT_UI_RETIRED = true;
