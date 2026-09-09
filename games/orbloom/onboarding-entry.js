const CURRENT_ONBOARDING_KEY = 'elitemay-orbloom-onboarding-v5';
const RECOVERY_KEY = 'elitemay-orbloom-onboarding-mobile-recovery-v6';
const FORCE_PARAM = 'tutorial';

const $ = (selector) => document.querySelector(selector);
const isMobileLike = () => window.matchMedia('(max-width: 620px)').matches || window.matchMedia('(pointer: coarse)').matches;

function removeCurrentRecord() {
  try {
    localStorage.removeItem(CURRENT_ONBOARDING_KEY);
  } catch {}
}

function markRecoveryApplied() {
  try {
    localStorage.setItem(RECOVERY_KEY, '1');
  } catch {}
}

function recoveryAlreadyApplied() {
  try {
    return localStorage.getItem(RECOVERY_KEY) === '1';
  } catch {
    return false;
  }
}

function closeBlockingPanels() {
  ['#settings-panel', '#offline-panel', '#evolution-panel'].forEach((selector) => {
    const node = $(selector);
    if (node) node.hidden = true;
  });
}

function showLauncherError() {
  const button = $('#open-tutorial');
  if (!button) return;
  button.textContent = 'TUTORIAL ERROR';
  button.setAttribute('aria-label', 'チュートリアルの読み込みに失敗しました');
  button.classList.add('is-error');
}

const params = new URLSearchParams(location.search);
const forced = params.get(FORCE_PARAM) === '1';

if (forced || (isMobileLike() && !recoveryAlreadyApplied())) {
  removeCurrentRecord();
  if (!forced) markRecoveryApplied();
}

import('./onboarding.js?v=6').then(() => {
  const button = $('#open-tutorial');
  if (!button) return;

  button.addEventListener('click', () => {
    removeCurrentRecord();
    closeBlockingPanels();
    const guide = $('#orbloom-onboarding');
    if (guide) guide.hidden = true;
    window.setTimeout(() => {
      const activeGuide = $('#orbloom-onboarding');
      if (activeGuide?.hidden) {
        button.classList.add('needs-attention');
        window.setTimeout(() => button.classList.remove('needs-attention'), 700);
      }
    }, 420);
  });

  window.__orbloomOnboardingEntryReady = true;
}).catch((error) => {
  console.error('Orbloom onboarding failed to load', error);
  showLauncherError();
});
