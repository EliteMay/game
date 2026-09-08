// The core game module captures tutorial DOM nodes during boot. The adaptive HUD
// renders the final visible objective surface later. Replace those visible nodes
// once so the core module keeps writing only to detached legacy references while
// the adaptive HUD becomes the single visible owner. This avoids two render loops
// alternating different objective text on the same DOM nodes.

const STYLE_HREF = './hud-objective-ownership.css';
const OBJECTIVE_NODE_IDS = Object.freeze([
  'tutorial-title',
  'tutorial-body',
  'tutorial-progress',
]);

function ensureStylesheet() {
  if (document.querySelector('link[data-hud-objective-ownership]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  link.dataset.hudObjectiveOwnership = 'true';
  document.head.append(link);
}

function handOffObjectiveNode(id) {
  const current = document.getElementById(id);
  if (!current || current.dataset.hudObjectiveOwner === 'adaptive') return current;

  const next = current.cloneNode(true);
  next.dataset.hudObjectiveOwner = 'adaptive';
  current.replaceWith(next);
  return next;
}

function establishObjectiveOwnership() {
  for (const id of OBJECTIVE_NODE_IDS) handOffObjectiveNode(id);
}

function boot() {
  ensureStylesheet();
  establishObjectiveOwnership();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
