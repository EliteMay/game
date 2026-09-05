import { BUILDINGS, RECIPES } from './config.js';

export const PRODUCTION_RECIPE_FAMILIES = {
  assembler: {
    id: 'assembler',
    name: 'ASSEMBLER',
    buildingTypes: ['assembler', 'assembler_plate', 'assembler_motor', 'assembler_circuit'],
    recipes: [
      { recipeId: 'assembler_control_unit', buildingType: 'assembler', label: '制御ユニット', requiredResearch: 'advanced_assembly' },
      { recipeId: 'assembler_iron_plate', buildingType: 'assembler_plate', label: '鉄板', requiredResearch: 'advanced_assembly' },
      { recipeId: 'assembler_motor', buildingType: 'assembler_motor', label: '産業モーター', requiredResearch: 'advanced_assembly' },
      { recipeId: 'assembler_circuit', buildingType: 'assembler_circuit', label: '制御回路', requiredResearch: 'advanced_assembly' },
    ],
  },
  fabricator: {
    id: 'fabricator',
    name: 'FABRICATOR',
    buildingTypes: ['fabricator', 'fabricator_core'],
    recipes: [
      { recipeId: 'fabricator_experimental_set', buildingType: 'fabricator', label: 'Experimental部品セット', requiredResearch: 'experimental_fabrication' },
      { recipeId: 'fabricator_autonomous_core', buildingType: 'fabricator_core', label: 'Autonomous Industrial Core', requiredResearch: 'experimental_technology' },
    ],
  },
};

const FAMILY_BY_TYPE = new Map();
const OPTION_BY_RECIPE = new Map();
for (const family of Object.values(PRODUCTION_RECIPE_FAMILIES)) {
  for (const type of family.buildingTypes) FAMILY_BY_TYPE.set(type, family);
  for (const option of family.recipes) OPTION_BY_RECIPE.set(option.recipeId, { ...option, familyId: family.id });
}

function completedResearch(game) {
  return new Set(Array.isArray(game?.progression?.completedResearch) ? game.progression.completedResearch.map(String) : []);
}

export function productionRecipeFamily(buildingOrType) {
  const type = typeof buildingOrType === 'string' ? buildingOrType : buildingOrType?.type;
  return FAMILY_BY_TYPE.get(type) || null;
}

export function productionRecipeForBuilding(building) {
  return BUILDINGS[building?.type]?.recipe ? RECIPES[BUILDINGS[building.type].recipe] || null : null;
}

export function productionRecipeOptions(game, building) {
  const family = productionRecipeFamily(building);
  if (!family) return [];
  const researched = completedResearch(game);
  return family.recipes.map((option) => ({
    ...option,
    recipe: RECIPES[option.recipeId] || null,
    selected: BUILDINGS[building?.type]?.recipe === option.recipeId,
    available: !option.requiredResearch || researched.has(option.requiredResearch),
  }));
}

function positiveKeys(buffer) {
  return Object.entries(buffer || {}).filter(([, amount]) => Number(amount) > 0).map(([id]) => id);
}

export function assignProductionRecipe(game, building, recipeId) {
  const family = productionRecipeFamily(building);
  const option = OPTION_BY_RECIPE.get(recipeId);
  if (!family || !option || option.familyId !== family.id) return { changed: false, reason: 'unknown-recipe', option: option || null };
  const researched = completedResearch(game);
  if (option.requiredResearch && !researched.has(option.requiredResearch)) return { changed: false, reason: 'research', option };
  if (BUILDINGS[building.type]?.recipe === recipeId) return { changed: false, reason: 'same', option };

  const recipe = RECIPES[recipeId];
  if (!recipe) return { changed: false, reason: 'missing-recipe', option };
  const allowedInputs = new Set(Object.keys(recipe.input || {}));
  const conflicts = positiveKeys(building.input).filter((itemId) => !allowedInputs.has(itemId));
  if (conflicts.length) return { changed: false, reason: 'buffer-conflict', conflicts, option };

  const previousType = building.type;
  building.type = option.buildingType;
  building.progress = 0;
  return { changed: true, reason: null, previousType, option, building };
}

export function configurableProductionBuildings(game) {
  return (Array.isArray(game?.buildings) ? game.buildings : []).filter((building) => productionRecipeFamily(building));
}
