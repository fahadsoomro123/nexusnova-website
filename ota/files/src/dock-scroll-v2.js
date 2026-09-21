/* NexusNova OTA route/touch recovery patch. */
(() => {
  const stageSelector = '#nx-stage';
  const dockSelector = '.nx-dock';
  const badgeSelector = '#nx-ota-proof-badge';

  function restoreShell() {
    const stage = document.querySelector(stageSelector);
    const video = document.querySelector('.nx-video-flagship');
    const route = stage?.dataset?.route || '';
    if (route !== 'app' || !video) {
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overscroll-behavior');
      document.body.style.removeProperty('overscroll-behavior');
      const dock = document.querySelector(dockSelector);
      if (dock && route !== 'auth') dock.hidden = false;
      if (video && route !== 'app') video.remove();
    }
  }

  function markOta9() {
    const badge = document.querySelector(badgeSelector);
    if (!badge) return;
    const text = badge.querySelector('span');
    if (text) text.textContent = 'OTA9 • ACTIVE';
    badge.setAttribute('aria-label', 'OTA9 update active');
  }

  function boot() {
    const stage = document.querySelector(stageSelector);
    const observer = new MutationObserver(() => {
      restoreShell();
      markOta9();
    });
    if (stage) observer.observe(stage, { attributes: true, childList: true, subtree: true });
    restoreShell();
    markOta9();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
