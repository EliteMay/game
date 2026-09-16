// Legacy Phase 4-B management augmentation is intentionally retired.
//
// `feature-pack.js` is now the single owner of `#factory-management-content`.
// Keeping the former 1-second augmentation loop active caused the current
// overview and the old Phase 4 layout to replace/augment each other every
// second. This compatibility module remains so historical import paths and
// validators can resolve it without starting another renderer.
//
// Legacy feature markers retained for repository archaeology/tests:
// 理論生産能力 / 搬送対応能力 / Machine稼働率 / Smart Sorter

export const PHASE4B_MANAGEMENT_UI_RETIRED = true;
