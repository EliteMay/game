// Compatibility entrypoint. Phase 6-C progression remains in progression-ui-v4.js.
// Automation Console, Final Phase, Home, Post Clear, adaptive HUD, Phase 7 settings,
// final factory visual/performance, high-polling input, and early-game onboarding load here.
import './phase5c-automation-ui.js';
import './final-phase-ui.js';
import './home-runtime.js';
import './home-surface-ui.js';
import './post-clear-optimization-ui.js';
import './hud-objective-ownership.js';
import './adaptive-ui.js';
// Fresh Contract must attach after the adaptive HUD has established the visible
// objective owner. Otherwise the legacy generic "Rank N Main Objective" can be
// left visible while the Fresh Contract surface is still waiting for the HUD stack.
import './early-game-runtime.js';
import './early-game-rank-runtime.js';
import './early-game-hud-ownership.js';
import './phase7-settings.js';
import './pause-notification-ui.js';
import './phase7-world-runtime.js';
import './high-polling-input.js';
import './visual-language-ui.js';
import './visual-overhaul-v3.js';
export * from './progression-ui-v4.js';
