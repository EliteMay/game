import { RECOVERY_KEY, SAVE_KEY, SAVE_SCHEMA_VERSION } from './config.js';
import { createInitialState, normalizeState, validateState } from './core.js';

function localStore() {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

export function parseSaveText(text, now = Date.now()) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid-save');
  if (Number(parsed.schemaVersion) > SAVE_SCHEMA_VERSION) throw new Error('future-schema');
  const state = normalizeState(parsed, now);
  if (!validateState(state)) throw new Error('invalid-save');
  return state;
}

export function serializeSave(state, now = Date.now()) {
  const normalized = normalizeState(state, now);
  if (!validateState(normalized)) throw new Error('invalid-save');
  return JSON.stringify(normalized, null, 2);
}

export function loadSave(now = Date.now()) {
  const store = localStore();
  if (!store) return { state: createInitialState(now), status: 'memory-only' };
  const raw = store.getItem(SAVE_KEY);
  if (!raw) return { state: createInitialState(now), status: 'new' };
  try {
    const state = parseSaveText(raw, now);
    state.lastSimulationAt = now;
    return { state, status: 'loaded' };
  } catch (error) {
    try { store.setItem(RECOVERY_KEY, raw); } catch {}
    return { state: createInitialState(now), status: 'recovery', recovery: error instanceof Error ? error.message : 'invalid-save' };
  }
}

export function saveState(state, now = Date.now()) {
  const store = localStore();
  if (!store) throw new Error('storage-unavailable');
  const next = normalizeState(state, now);
  next.revision += 1;
  next.lastPlayedAt = new Date(now).toISOString();
  next.lastSimulationAt = now;
  if (!validateState(next)) throw new Error('invalid-save');
  store.setItem(SAVE_KEY, JSON.stringify(next));
  return next;
}

export function exportSaveText(state, now = Date.now()) {
  return serializeSave(state ?? loadSave(now).state, now);
}

export function importSaveText(text, now = Date.now()) {
  const store = localStore();
  if (!store) throw new Error('storage-unavailable');
  const incoming = parseSaveText(text, now);
  const previous = store.getItem(SAVE_KEY);
  if (previous) store.setItem(RECOVERY_KEY, previous);
  incoming.revision += 1;
  incoming.lastPlayedAt = new Date(now).toISOString();
  incoming.lastSimulationAt = now;
  store.setItem(SAVE_KEY, JSON.stringify(incoming));
  const roundTrip = store.getItem(SAVE_KEY);
  if (!roundTrip) throw new Error('restore-verification-failed');
  try {
    return parseSaveText(roundTrip, now);
  } catch (error) {
    if (previous) store.setItem(SAVE_KEY, previous);
    else store.removeItem(SAVE_KEY);
    throw error;
  }
}

export function resetSave(now = Date.now()) {
  const store = localStore();
  if (!store) throw new Error('storage-unavailable');
  const previous = store.getItem(SAVE_KEY);
  if (previous) store.setItem(RECOVERY_KEY, previous);
  const fresh = createInitialState(now);
  store.setItem(SAVE_KEY, JSON.stringify(fresh));
  return fresh;
}
