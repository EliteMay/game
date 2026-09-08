const STYLE_HREF = './visual-language-ui.css';

function ensureStylesheet() {
  if (document.querySelector('link[data-visual-language-ui]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  link.dataset.visualLanguageUi = 'true';
  document.head.append(link);
}

function markSurfaceRoles() {
  document.querySelectorAll('.panel-card, .factory-management-card, .home-system-card, .home-pc-dashboard-card, .exploration-secure-card, .automation-console-card')
    .forEach((node) => node.dataset.industrialSurface = 'true');

  document.querySelectorAll('.panel-header, .factory-management-header, .home-system-header, .home-pc-dashboard-header, .exploration-secure-card > header')
    .forEach((node) => node.dataset.industrialHeader = 'true');
}

function boot() {
  ensureStylesheet();
  markSurfaceRoles();
  window.setInterval(markSurfaceRoles, 800);
}

boot();
