// NexusNova Travel OTA revision 18 badge stamper.
// Release-only metadata helper: no layout, provider, or navigation logic lives here.
const REVISION = '18';
const ROOT_SELECTOR = '.nn-travel-v19';
const STYLE_ID = 'nn-travel-ota-proof-v18';

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
${ROOT_SELECTOR}{position:relative}
${ROOT_SELECTOR} .nn-ota-badge{
  position:absolute;left:3px;top:2px;z-index:1600;min-width:16px;height:16px;padding:0 4px;
  border:1px solid rgba(92,255,139,.92);border-radius:999px;background:#063a1e;color:#6dff99;
  font:900 10px/14px Inter,system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;
  box-shadow:0 0 9px rgba(46,255,118,.58);pointer-events:none
}`;
  document.head.appendChild(style);
}

function stamp(root) {
  if (!(root instanceof HTMLElement)) return;
  ensureStyle();
  let badge = root.querySelector('.nn-ota-badge');
  if (!(badge instanceof HTMLElement)) {
    badge = document.createElement('span');
    badge.className = 'nn-ota-badge';
    badge.setAttribute('aria-hidden', 'false');
    root.prepend(badge);
  }
  badge.textContent = REVISION;
  badge.dataset.otaRevision = REVISION;
  badge.setAttribute('aria-label', `OTA revision ${REVISION}`);
  root.dataset.otaRevision = REVISION;
}

function scan(node = document) {
  if (node instanceof HTMLElement && node.matches(ROOT_SELECTOR)) stamp(node);
  node.querySelectorAll?.(ROOT_SELECTOR).forEach(stamp);
}

ensureStyle();
scan();
new MutationObserver(records => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node instanceof HTMLElement) scan(node);
    }
  }
}).observe(document.documentElement, { childList:true, subtree:true });
