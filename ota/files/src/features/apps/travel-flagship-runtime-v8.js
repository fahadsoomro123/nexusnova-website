const STYLE_ID = 'nn-travel-flagship-runtime-v8';
const ROOT_SELECTOR = '.nn-travel-v19';

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
html.nn-travel-v8-active,
html.nn-travel-v8-active body{
  width:100%!important;height:100%!important;min-height:0!important;
  overflow:hidden!important;overscroll-behavior:none!important
}
html.nn-travel-v8-active #nx-app,
html.nn-travel-v8-active .nx-app{
  width:100%!important;max-width:none!important;height:100%!important;min-height:0!important;
  margin:0!important;overflow:hidden!important
}
html.nn-travel-v8-active #nx-stage,
html.nn-travel-v8-active .nx-stage{
  position:fixed!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;
  margin:0!important;padding:0!important;overflow:hidden!important;scroll-padding:0!important
}
html.nn-travel-v8-active .nx-screen.nn-travel-v8-screen{
  position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;
  margin:0!important;padding:0!important;overflow:hidden!important
}
html.nn-travel-v8-active .nx-screen.nn-travel-v8-screen>[data-app-mount]{
  position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;
  margin:0!important;padding:0!important;overflow:hidden!important
}
html.nn-travel-v8-active #nx-app>.nx-dock{
  position:fixed!important;z-index:950!important;left:6px!important;right:6px!important;bottom:4px!important;
  width:auto!important;height:58px!important;min-height:58px!important;max-height:58px!important;
  margin:0!important;padding:5px!important;transform:none!important;border-radius:18px!important;
  display:grid!important;grid-template-columns:1fr 1.45fr!important;gap:8px!important
}
html.nn-travel-v8-active #nx-app>.nx-dock[hidden]{display:grid!important}
html.nn-travel-v8-active.nn-travel-v8-editing #nx-app>.nx-dock{display:none!important}
html.nn-travel-v8-active ${ROOT_SELECTOR}{
  position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;
  max-width:none!important;overflow:hidden!important
}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-travel-frame{
  position:absolute!important;top:0!important;left:0!important;right:0!important;bottom:auto!important;
  width:100%!important;height:var(--nn-v8-frame-height,calc(100% - 68px))!important;min-height:0!important;
  max-height:none!important;overflow:hidden!important
}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-travel-stage,
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-panel,
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-flight-panel{
  min-height:0!important;overflow:hidden!important
}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-flight-panel:not([hidden]){
  grid-template-rows:clamp(112px,22vh,178px) minmax(0,1fr)!important
}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-search-card{
  min-height:0!important;height:100%!important;overflow:hidden!important;
  grid-template-rows:auto minmax(68px,.95fr) minmax(44px,.7fr) minmax(44px,.7fr) minmax(34px,.55fr) minmax(47px,.72fr) auto!important;
  align-content:stretch!important;gap:5px!important
}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-search-card>.nn-trip-top,
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-search-card>.nn-routes,
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-search-card>.nn-pair,
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-search-card>.nn-filter-row,
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-search-card>.nn-search-button{
  min-height:0!important;height:100%!important
}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-search-card>.nn-routes .nn-route,
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-search-card>.nn-pair .nn-control{
  min-height:0!important;height:100%!important
}

/* Production-real route editor: keep the active fields visible and remove the fake blank screen. */
${ROOT_SELECTOR} .nn-route-editor-v8{
  position:absolute;z-index:1400;inset:0;display:flex;flex-direction:column;
  background:
    radial-gradient(circle at 78% 10%,rgba(18,160,240,.24),transparent 26%),
    radial-gradient(circle at 22% 44%,rgba(0,104,180,.18),transparent 34%),
    linear-gradient(180deg,#04182a 0%,#031321 58%,#020b14 100%);
  color:#f7fbff;padding:10px 10px max(10px,env(safe-area-inset-bottom));overflow:hidden
}
${ROOT_SELECTOR} .nn-route-editor-v8[hidden]{display:none!important}
${ROOT_SELECTOR} .nn-route-editor-v8__top{
  display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 2px 10px
}
${ROOT_SELECTOR} .nn-route-editor-v8__title strong{display:block;font-size:17px;line-height:1.05}
${ROOT_SELECTOR} .nn-route-editor-v8__title small{display:block;margin-top:5px;color:#82c9ea;font-size:10px}
${ROOT_SELECTOR} .nn-route-editor-v8__done{
  min-width:72px;height:38px;border:1px solid #60e9ff;border-radius:13px;
  background:linear-gradient(135deg,#0e78b8,#0a5b95);color:#fff;font-weight:900
}
${ROOT_SELECTOR} .nn-route-editor-v8__surface{
  border:1px solid #2879a3;border-radius:20px;background:linear-gradient(150deg,#082942,#041827 62%,#03131f);
  box-shadow:0 16px 36px rgba(0,0,0,.34),inset 0 1px rgba(255,255,255,.06);padding:10px
}
${ROOT_SELECTOR} .nn-route-editor-v8__surface>.nn-routes{
  display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;position:relative!important;
  min-height:86px!important;height:86px!important
}
${ROOT_SELECTOR} .nn-route-editor-v8__surface .nn-route{
  display:block!important;visibility:visible!important;opacity:1!important;height:86px!important;min-height:86px!important;
  border-radius:16px!important;padding:8px 10px!important
}
${ROOT_SELECTOR} .nn-route-editor-v8__surface .nn-route input{
  display:block!important;visibility:visible!important;opacity:1!important;width:80%!important;height:34px!important;
  font-size:23px!important;line-height:34px!important
}
${ROOT_SELECTOR} .nn-route-editor-v8__surface .nn-route small{font-size:9px!important;line-height:1.15!important}
${ROOT_SELECTOR} .nn-route-editor-v8__surface .nn-swap{width:40px!important;height:40px!important;font-size:20px!important}
${ROOT_SELECTOR} .nn-route-editor-v8__hint{
  margin-top:10px;border:1px solid rgba(44,126,169,.58);border-radius:16px;background:rgba(2,18,31,.82);
  padding:12px 13px;color:#a9d1e5;font-size:10px;line-height:1.45
}
${ROOT_SELECTOR} .nn-route-editor-v8__hint b{display:block;color:#e9f8ff;font-size:11px;margin-bottom:4px}
${ROOT_SELECTOR}.nn-v8-route-edit .nn-travel-frame{visibility:hidden!important;pointer-events:none!important}

/* Full usable-height results, not the old 34% mini-window. */
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-results{
  position:absolute!important;z-index:1200!important;
  left:8px!important;right:8px!important;top:var(--nn-v8-results-top,78px)!important;
  bottom:var(--nn-v8-results-bottom,68px)!important;height:auto!important;min-height:0!important;
  max-height:none!important;border:1px solid #2e86b2!important;border-radius:22px!important;
  background:linear-gradient(180deg,#06243a 0%,#041827 45%,#020e18 100%)!important;
  box-shadow:0 20px 48px rgba(0,0,0,.72)!important;overflow:hidden!important;
  display:grid!important;grid-template-rows:56px minmax(0,1fr) auto!important
}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-results[hidden]{display:none!important}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-results-head{
  height:56px!important;min-height:56px!important;padding:0 12px 0 14px!important;
  background:linear-gradient(180deg,rgba(10,49,76,.98),rgba(5,30,49,.96))!important
}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-results-head strong{font-size:14px!important}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-results-head small{font-size:9px!important;margin-top:3px!important}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-results-close{width:38px!important;height:38px!important;font-size:25px!important}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-results-body{
  min-height:0!important;overflow-y:auto!important;padding:10px!important;overscroll-behavior:contain!important;
  scrollbar-width:thin
}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-result{
  min-height:96px!important;border-radius:16px!important;grid-template-columns:48px minmax(0,1fr) auto!important;
  gap:10px!important;padding:11px!important;margin-bottom:9px!important;
  background:linear-gradient(110deg,#0a3a58,#072a42 58%,#052238)!important
}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-logo{
  width:46px!important;height:46px!important;border-radius:12px!important;font-size:10px!important
}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-result strong{font-size:12px!important;line-height:1.22!important}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-meta{font-size:9.5px!important;line-height:1.35!important;margin-top:4px!important}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-price{min-width:90px!important}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-live-chip{font-size:8px!important;padding:3px 6px!important}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-price strong{font-size:12px!important;margin-top:7px!important}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-empty{min-height:160px!important;font-size:11px!important}

/* Same real filter controls, moved to the results footer just above the phone/app navigation. */
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-results>.nn-filter-row{
  position:relative!important;z-index:1300!important;display:grid!important;grid-template-columns:repeat(4,1fr)!important;
  gap:7px!important;height:58px!important;min-height:58px!important;padding:8px!important;margin:0!important;
  border-top:1px solid rgba(53,135,176,.7)!important;
  background:linear-gradient(180deg,rgba(4,25,42,.98),rgba(2,14,24,.99))!important
}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-results>.nn-filter-row .nn-filter{
  min-width:0!important;height:42px!important;border-radius:15px!important;font-size:10.5px!important;gap:5px!important
}
html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-results>.nn-filter-row .fi{font-size:17px!important}

@media(max-width:380px){
  html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-result{min-height:90px!important;grid-template-columns:43px minmax(0,1fr) auto!important;padding:9px!important;gap:8px!important}
  html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-logo{width:41px!important;height:41px!important}
  html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-result strong{font-size:11px!important}
  html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-meta{font-size:8.6px!important}
  html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-price{min-width:80px!important}
  html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-results>.nn-filter-row .nn-filter{font-size:9.5px!important}
}
@media(max-height:700px){
  html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-flight-panel:not([hidden]){grid-template-rows:102px minmax(0,1fr)!important}
  html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-hero-copy{top:13px!important}
  html.nn-travel-v8-active ${ROOT_SELECTOR} .nn-hero p{display:none!important}
}
`;
  document.head.appendChild(style);
}

function realDock() {
  return document.querySelector('#nx-app > .nx-dock') || document.querySelector('.nx-dock');
}

function isVisible(el) {
  if (!(el instanceof HTMLElement)) return false;
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

function bindRoot(root) {
  if (!(root instanceof HTMLElement) || root.dataset.flagshipRuntimeV8 === 'true') return;
  root.dataset.flagshipRuntimeV8 = 'true';
  installStyle();

  const doc = document.documentElement;
  const screen = root.closest('.nx-screen');
  const frame = root.querySelector('.nn-travel-frame');
  const results = root.querySelector('.nn-results');
  const routes = root.querySelector('.nn-routes');
  const filterRow = root.querySelector('.nn-filter-row');
  const searchCard = root.querySelector('.nn-search-card');
  const searchButton = root.querySelector('.nn-search-button');
  const visual = window.visualViewport;

  doc.classList.add('nn-travel-v8-active');
  screen?.classList.add('nn-travel-v8-screen');
  root.dataset.productionDockSelector = 'nx-dock';

  const routeMarker = document.createComment('nn-route-v8-home');
  const filterMarker = document.createComment('nn-filter-v8-home');
  if (routes?.parentNode) routes.parentNode.insertBefore(routeMarker, routes);
  if (filterRow?.parentNode) filterRow.parentNode.insertBefore(filterMarker, filterRow);

  const editor = document.createElement('section');
  editor.className = 'nn-route-editor-v8';
  editor.hidden = true;
  editor.innerHTML = `
    <div class="nn-route-editor-v8__top">
      <div class="nn-route-editor-v8__title"><strong>Edit flight route</strong><small>Type a city or airport code</small></div>
      <button class="nn-route-editor-v8__done" type="button" data-v8-route-done>DONE</button>
    </div>
    <div class="nn-route-editor-v8__surface" data-v8-route-surface></div>
    <div class="nn-route-editor-v8__hint"><b>Route stays visible while you type</b>From and To remain on screen above the keyboard. No full-page scroll and no hidden form jump.</div>`;
  root.appendChild(editor);
  const editorSurface = editor.querySelector('[data-v8-route-surface]');

  let editing = false;
  let disposed = false;

  const restoreRoutes = () => {
    if (routes && routeMarker.parentNode) routeMarker.parentNode.insertBefore(routes, routeMarker.nextSibling);
  };

  const openEditor = focusTarget => {
    if (!(routes instanceof HTMLElement) || !(editorSurface instanceof HTMLElement)) return;
    if (!editing) {
      editing = true;
      editor.hidden = false;
      editorSurface.appendChild(routes);
      root.classList.add('nn-v8-route-edit');
      doc.classList.add('nn-travel-v8-editing');
    }
    requestAnimationFrame(() => {
      if (focusTarget instanceof HTMLInputElement && document.activeElement !== focusTarget) {
        try { focusTarget.focus({preventScroll:true}); focusTarget.select(); } catch { focusTarget.focus(); }
      }
    });
    syncLayout();
  };

  const closeEditor = () => {
    if (!editing) return;
    editing = false;
    restoreRoutes();
    editor.hidden = true;
    root.classList.remove('nn-v8-route-edit');
    doc.classList.remove('nn-travel-v8-editing');
    syncLayout();
  };

  const restoreFilter = () => {
    if (filterRow && filterMarker.parentNode) filterMarker.parentNode.insertBefore(filterRow, filterMarker.nextSibling);
  };

  const syncResultsFilter = () => {
    if (!(results instanceof HTMLElement) || !(filterRow instanceof HTMLElement)) return;
    if (!results.hidden) {
      if (filterRow.parentNode !== results) results.appendChild(filterRow);
      root.classList.add('nn-v8-results-open');
    } else {
      restoreFilter();
      root.classList.remove('nn-v8-results-open');
    }
  };

  const syncLayout = () => {
    if (disposed || !root.isConnected) return;
    const rootRect = root.getBoundingClientRect();
    const layoutHeight = Math.max(1, Math.round(window.innerHeight || document.documentElement.clientHeight || rootRect.height));
    const visibleHeight = Math.max(1, Math.round(visual?.height || layoutHeight));
    const visibleTop = Math.max(0, Math.round(visual?.offsetTop || 0));
    const visibleBottom = visibleTop + Math.min(layoutHeight, visibleHeight);
    const dock = realDock();
    const dockVisible = !editing && isVisible(dock);
    const dockTop = dockVisible ? dock.getBoundingClientRect().top : visibleBottom;
    const targetBottom = dockVisible ? Math.min(visibleBottom, dockTop - 6) : visibleBottom;
    const frameHeight = Math.max(1, Math.floor(targetBottom - rootRect.top));
    root.style.setProperty('--nn-v8-frame-height', `${frameHeight}px`);

    const topDock = root.querySelector('.nn-tab-dock');
    const head = root.querySelector('.nn-travel-head');
    const top = Math.max(
      8,
      Math.round((head?.getBoundingClientRect().bottom || rootRect.top) - rootRect.top + (topDock?.getBoundingClientRect().height || 0) + 6)
    );
    root.style.setProperty('--nn-v8-results-top', `${top}px`);
    const bottomReserve = dockVisible ? Math.max(8, Math.round(visibleBottom - dockTop + 6)) : 8;
    root.style.setProperty('--nn-v8-results-bottom', `${bottomReserve}px`);
    root.dataset.v8FrameHeight = String(frameHeight);
    root.dataset.v8DockVisible = dockVisible ? 'true' : 'false';
    root.dataset.v8VisibleHeight = String(Math.round(Math.max(1, visibleBottom - rootRect.top)));
    root.dataset.v8RootBottom = String(Math.round(rootRect.bottom));
    root.dataset.v8TargetBottom = String(Math.round(targetBottom));

    const scroller = document.scrollingElement;
    if (scroller) scroller.scrollTop = 0;
    const stage = root.closest('.nx-stage');
    if (stage instanceof HTMLElement) stage.scrollTop = 0;
  };

  root.addEventListener('pointerdown', event => {
    const route = event.target instanceof Element ? event.target.closest('.nn-route') : null;
    if (!(route instanceof HTMLElement) || !root.contains(route)) return;
    const input = route.querySelector('input');
    if (input instanceof HTMLInputElement) openEditor(input);
  }, true);

  root.addEventListener('focusin', event => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.closest('.nn-route')) openEditor(input);
  });

  editor.querySelector('[data-v8-route-done]')?.addEventListener('click', () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    closeEditor();
  });

  const resultsObserver = results instanceof HTMLElement ? new MutationObserver(() => {
    syncResultsFilter();
    syncLayout();
  }) : null;
  if (results instanceof HTMLElement) resultsObserver?.observe(results, {attributes:true, attributeFilter:['hidden']});

  visual?.addEventListener('resize', syncLayout);
  visual?.addEventListener('scroll', syncLayout);
  window.addEventListener('resize', syncLayout);
  window.addEventListener('orientationchange', syncLayout);

  syncResultsFilter();
  requestAnimationFrame(() => requestAnimationFrame(syncLayout));
  setTimeout(syncLayout, 120);
  setTimeout(syncLayout, 420);
  setTimeout(syncLayout, 900);

  const previousCleanup = root.__cleanup;
  root.__cleanup = () => {
    if (disposed) return;
    disposed = true;
    resultsObserver?.disconnect();
    visual?.removeEventListener('resize', syncLayout);
    visual?.removeEventListener('scroll', syncLayout);
    window.removeEventListener('resize', syncLayout);
    window.removeEventListener('orientationchange', syncLayout);
    restoreRoutes();
    restoreFilter();
    root.classList.remove('nn-v8-results-open','nn-v8-route-edit');
    root.style.removeProperty('--nn-v8-frame-height');
    root.style.removeProperty('--nn-v8-results-top');
    root.style.removeProperty('--nn-v8-results-bottom');
    editor.remove();
    screen?.classList.remove('nn-travel-v8-screen');
    doc.classList.remove('nn-travel-v8-active','nn-travel-v8-editing');
    previousCleanup?.();
  };
}

function scan() {
  document.querySelectorAll(ROOT_SELECTOR).forEach(bindRoot);
}

installStyle();
scan();
const observer = new MutationObserver(scan);
observer.observe(document.documentElement, {subtree:true, childList:true});