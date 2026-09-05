export const FINAL_COMPONENT_IDS = [
  'ai_control_module',
  'experimental_frame',
  'experimental_power_module',
];

export const TRI_LAB_FABRICATION_BLUEPRINT = 'tri_lab_fabrication_blueprint';
export const CENTRAL_CORE_EXPERIMENTAL_BLUEPRINT = 'central_core_experimental_blueprint';

function nonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function buildingOutputs(game) {
  return (Array.isArray(game?.buildings) ? game.buildings : [])
    .filter((building) => building && typeof building === 'object')
    .map((building) => ({ building, output: building.output && typeof building.output === 'object' ? building.output : {} }));
}

export function finalComponentCounts(game) {
  const counts = Object.fromEntries(FINAL_COMPONENT_IDS.map((id) => [id, nonNegative(game?.inventory?.[id])]));
  for (const { output } of buildingOutputs(game)) {
    for (const id of FINAL_COMPONENT_IDS) counts[id] += nonNegative(output[id]);
  }
  return counts;
}

export function finalComponentSetStatus(game) {
  const counts = finalComponentCounts(game);
  const missing = FINAL_COMPONENT_IDS.filter((id) => counts[id] < 1);
  return { ready: missing.length === 0, counts, missing };
}

function consumeFromObject(buffer, itemId, amount) {
  if (!buffer || amount <= 0) return amount;
  const current = nonNegative(buffer[itemId]);
  const consumed = Math.min(current, amount);
  buffer[itemId] = current - consumed;
  return amount - consumed;
}

export function consumeFinalComponentSet(game) {
  const before = finalComponentSetStatus(game);
  if (!before.ready) return { changed: false, reason: 'missing-components', ...before };

  game.inventory ??= {};
  const sources = buildingOutputs(game);
  for (const itemId of FINAL_COMPONENT_IDS) {
    let remaining = consumeFromObject(game.inventory, itemId, 1);
    for (const { output } of sources) {
      if (remaining <= 0) break;
      remaining = consumeFromObject(output, itemId, remaining);
    }
  }

  return {
    changed: true,
    consumed: Object.fromEntries(FINAL_COMPONENT_IDS.map((id) => [id, 1])),
    after: finalComponentCounts(game),
  };
}

export function securedResearchCargoCount(game) {
  const secured = game?.exploration?.areas?.research?.securedComponents;
  return Array.isArray(secured) ? new Set(secured.map(String)).size : 0;
}

export function allResearchCargoSecured(game) {
  return securedResearchCargoCount(game) >= 3;
}
