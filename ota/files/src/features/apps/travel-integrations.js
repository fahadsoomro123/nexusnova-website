import { renderTravelGroundPanel } from './travel-ground.js';

const TRAVEL_HOST_STYLE_ID = 'nn-travel-host-guard-v6';
const TRAVEL_OTA_REVISION = 4;

function localDateOffset(days = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + Number(days || 0));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function datePlusDays(value, days) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return localDateOffset(days);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  date.setDate(date.getDate() + Number(days || 0));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeTravelDates(root) {
  const departure = root.querySelector('[data-flight-departure]');
  const returnDate = root.querySelector('[data-flight-return]');
  if (departure) {
    departure.min = localDateOffset(1);
    if (!departure.value) departure.value = localDateOffset(7);
    if (returnDate) returnDate.min = departure.value;
    departure.addEventListener('change', () => {
      if (!returnDate) return;
      returnDate.min = departure.value || localDateOffset(1);
      if (returnDate.value && returnDate.value < returnDate.min) returnDate.value = '';
    });
  }

  const checkIn = root.querySelector('[data-hotel-checkin]');
  const checkOut = root.querySelector('[data-hotel-checkout]');
  if (checkIn && checkOut) {
    checkIn.min = localDateOffset(1);
    if (!checkIn.value) checkIn.value = localDateOffset(7);
    checkOut.min = localDateOffset(2);
    if (!checkOut.value) checkOut.value = localDateOffset(10);
    checkIn.addEventListener('change', () => {
      checkOut.min = checkIn.value || localDateOffset(2);
      if (!checkOut.value || checkOut.value <= checkOut.min) {
        checkOut.value = datePlusDays(checkIn.value || localDateOffset(1), 3);
      }
    });
  }

  const groundDate = root.querySelector('[data-ground-date]');
  if (groundDate) {
    groundDate.min = localDateOffset(1);
    if (!groundDate.value) groundDate.value = localDateOffset(7);
  }

  const tripStart = root.querySelector('[data-trip-start]');
  const tripStatus = root.querySelector('[data-trip-status]');
  const hasSavedTrip = String(tripStatus?.textContent || '').includes('Saved trip plan loaded');
  if (tripStart && !hasSavedTrip && !tripStart.value) tripStart.value = localDateOffset(0);
}

function stampTravelRevision(root) {
  const badge = root.querySelector('.nn-ota-badge');
  if (!badge) return;
  badge.textContent = String(TRAVEL_OTA_REVISION);
  badge.dataset.otaRevision = String(TRAVEL_OTA_REVISION);
  badge.setAttribute('aria-label', `OTA revision ${TRAVEL_OTA_REVISION}`);
}

function ensureTravelHostStyle() {
  if (document.getElementById(TRAVEL_HOST_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = TRAVEL_HOST_STYLE_ID;
  style.textContent = `
html.nn-travel-host-lock,html.nn-travel-host-lock body{
  width:100%!important;height:100%!important;min-height:0!important;overflow:hidden!important;
  overscroll-behavior:none!important;scroll-behavior:auto!important
}
html.nn-travel-host-lock .nx-app{
  width:100%!important;height:100%!important;min-height:0!important;max-height:none!important;
  margin:0!important;overflow:hidden!important
}
html.nn-travel-host-lock .nx-stage{
  position:fixed!important;inset:0!important;width:100%!important;height:auto!important;
  min-height:0!important;max-height:none!important;margin:0!important;padding:0!important;
  scroll-padding:0!important;overflow:hidden!important;overscroll-behavior:none!important
}
html.nn-travel-host-lock .nx-screen.nn-travel-host-screen{
  position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
  min-height:0!important;max-height:none!important;margin:0!important;padding:0!important;
  overflow:hidden!important
}
html.nn-travel-host-lock .nx-screen.nn-travel-host-screen>[data-app-mount]{
  position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
  min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important
}
html.nn-travel-host-lock .nx-dock.global{
  margin:0!important;transform:none!important;left:5px!important;right:5px!important;
  width:auto!important;bottom:4px!important
}
html.nn-travel-host-lock .nn-travel-v19{
  position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
  min-height:0!important;max-height:none!important;overflow:hidden!important
}
html.nn-travel-host-lock .nn-travel-v19 .nn-travel-frame{
  top:0!important;left:0!important;right:0!important;
  bottom:var(--nn-travel-dock-reserve,72px)!important;height:auto!important;min-height:0!important
}
html.nn-travel-host-lock .nn-travel-v19 .nn-travel-stage,
html.nn-travel-host-lock .nn-travel-v19 .nn-panel{
  min-height:0!important;overflow:hidden!important
}
html.nn-travel-host-lock .nn-travel-v19 .nn-results-body,
html.nn-travel-host-lock .nn-travel-v19 [data-flight-results],
html.nn-travel-host-lock .nn-travel-v19 [data-hotel-results],
html.nn-travel-host-lock .nn-travel-v19 [data-ground-results]{
  overscroll-behavior:contain!important
}
@media (min-height:681px){
  html.nn-travel-host-lock:not(.nn-travel-keyboard-open) .nn-travel-v19 .nn-flight-panel:not([hidden]){
    grid-template-rows:clamp(132px,26vh,238px) minmax(0,1fr)!important
  }
  html.nn-travel-host-lock:not(.nn-travel-keyboard-open) .nn-travel-v19 .nn-search-card{
    grid-template-rows:minmax(34px,.68fr) minmax(72px,1.28fr) minmax(50px,1fr) minmax(50px,1fr) minmax(36px,.78fr) minmax(51px,1.02fr) minmax(47px,.95fr)!important;
    align-content:stretch!important;min-height:0!important;height:100%!important;overflow:hidden!important
  }
  html.nn-travel-host-lock:not(.nn-travel-keyboard-open) .nn-travel-v19 .nn-trip-top,
  html.nn-travel-host-lock:not(.nn-travel-keyboard-open) .nn-travel-v19 .nn-routes,
  html.nn-travel-host-lock:not(.nn-travel-keyboard-open) .nn-travel-v19 .nn-pair,
  html.nn-travel-host-lock:not(.nn-travel-keyboard-open) .nn-travel-v19 .nn-filter-row,
  html.nn-travel-host-lock:not(.nn-travel-keyboard-open) .nn-travel-v19 .nn-search-button,
  html.nn-travel-host-lock:not(.nn-travel-keyboard-open) .nn-travel-v19 .nn-search-card>div:last-child{
    min-height:0!important;height:100%!important
  }
  html.nn-travel-host-lock:not(.nn-travel-keyboard-open) .nn-travel-v19 .nn-route,
  html.nn-travel-host-lock:not(.nn-travel-keyboard-open) .nn-travel-v19 .nn-control{
    min-height:0!important;height:100%!important
  }
  html.nn-travel-host-lock:not(.nn-travel-keyboard-open) .nn-travel-v19 .nn-search-card>div:last-child{
    display:grid!important;grid-template-rows:13px minmax(34px,1fr)!important
  }
  html.nn-travel-host-lock:not(.nn-travel-keyboard-open) .nn-travel-v19 .nn-trust{
    min-height:0!important;height:100%!important
  }
}
html.nn-travel-keyboard-open .nx-dock.global{display:none!important}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-travel-frame{bottom:0!important}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-flight-panel:not([hidden]){
  grid-template-rows:minmax(0,1fr)!important
}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-hero{display:none!important}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-secondary:not([hidden]){
  grid-template-rows:minmax(0,1fr)!important
}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-secondary-hero{display:none!important}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-secondary-card{min-height:0!important}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-search-card{
  grid-template-rows:32px 68px 44px 44px 32px 44px minmax(28px,1fr)!important;
  align-content:stretch!important;overflow:hidden!important;gap:4px!important;padding:6px!important
}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-search-card>.nn-trip-top,
html.nn-travel-keyboard-open .nn-travel-v19 .nn-search-card>.nn-routes,
html.nn-travel-keyboard-open .nn-travel-v19 .nn-search-card>.nn-pair,
html.nn-travel-keyboard-open .nn-travel-v19 .nn-filter-row,
html.nn-travel-keyboard-open .nn-travel-v19 .nn-search-button,
html.nn-travel-keyboard-open .nn-travel-v19 .nn-search-card>div:last-child{
  display:grid!important;visibility:visible!important;opacity:1!important;min-height:0!important
}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-routes,
html.nn-travel-keyboard-open .nn-travel-v19 .nn-route{height:68px!important;min-height:68px!important}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-control{height:44px!important;min-height:44px!important}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-filter-row{height:32px!important;min-height:32px!important}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-search-button{height:44px!important;min-height:44px!important}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-search-card>div:last-child{
  grid-template-rows:10px minmax(18px,1fr)!important;overflow:hidden!important
}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-status{height:10px!important;line-height:10px!important;font-size:6.5px!important}
html.nn-travel-keyboard-open .nn-travel-v19 .nn-trust{min-height:18px!important;height:100%!important}
.nn-travel-v19.nn-travel-route-focus .nn-route:focus-within{
  border-color:#62eaff!important;box-shadow:0 0 0 2px rgba(65,218,255,.14),0 0 16px rgba(30,186,255,.22)!important
}
.nn-travel-v19.nn-travel-route-focus .nn-route input{
  width:82%!important;height:34px!important;font-size:20px!important
}
`;
  document.head.appendChild(style);
}

function installLockedTravelHost(root) {
  if (root.dataset.travelHostGuard === 'v6') return;
  root.dataset.travelHostGuard = 'v6';
  ensureTravelHostStyle();

  const doc = document.documentElement;
  const visual = window.visualViewport;
  let disposed = false;
  let baselineHeight = Math.max(
    1,
    Math.round(window.innerHeight || 0),
    Math.round(document.documentElement.clientHeight || 0),
    Math.round(visual?.height || 0)
  );
  let screen = null;
  let stage = null;

  const editableInRoot = () => {
    const active = document.activeElement;
    return active instanceof HTMLElement
      && root.contains(active)
      && active.matches('input,select,textarea,[contenteditable="true"]')
      ? active
      : null;
  };

  const markHost = () => {
    if (!root.isConnected) return false;
    screen = root.closest('.nx-screen');
    stage = screen?.closest('.nx-stage') || document.querySelector('.nx-stage');
    screen?.classList.add('nn-travel-host-screen');
    doc.classList.add('nn-travel-host-lock');
    return Boolean(screen);
  };

  const syncDockReserve = keyboardOpen => {
    if (keyboardOpen) {
      root.style.setProperty('--nn-travel-dock-reserve', '0px');
      return;
    }
    const dock = document.querySelector('.nx-dock.global');
    if (!(dock instanceof HTMLElement) || getComputedStyle(dock).display === 'none') {
      root.style.setProperty('--nn-travel-dock-reserve', '0px');
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const dockRect = dock.getBoundingClientRect();
    const raw = Math.max(0, Math.round(rootRect.bottom - dockRect.top + 8));
    const cap = Math.max(56, Math.round(rootRect.height * 0.18));
    root.style.setProperty('--nn-travel-dock-reserve', `${Math.min(raw, cap)}px`);
  };

  const syncViewport = () => {
    if (disposed || !markHost()) return;
    const active = editableInRoot();
    const layoutHeight = Math.max(
      1,
      Math.round(window.innerHeight || 0),
      Math.round(document.documentElement.clientHeight || 0)
    );
    const visibleHeight = Math.max(1, Math.round(visual?.height || layoutHeight));
    if (!active) baselineHeight = Math.max(baselineHeight, layoutHeight, visibleHeight);
    const effectiveHeight = Math.min(layoutHeight, visibleHeight);
    const keyboardOpen = Boolean(active)
      && baselineHeight - effectiveHeight >= Math.max(110, Math.round(baselineHeight * 0.14));

    doc.classList.toggle('nn-travel-keyboard-open', keyboardOpen);
    root.classList.toggle('nn-travel-keyboard-open', keyboardOpen);
    root.classList.toggle('nn-travel-route-focus', Boolean(active?.closest('.nn-route')));
    root.dataset.keyboardOpen = keyboardOpen ? 'true' : 'false';
    syncDockReserve(keyboardOpen);

    if (stage) stage.scrollTop = 0;
    const scroller = document.scrollingElement;
    if (scroller) scroller.scrollTop = 0;
  };

  const onFocusIn = event => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches('input,select,textarea,[contenteditable="true"]')) return;
    root.classList.toggle('nn-travel-route-focus', Boolean(target.closest('.nn-route')));
    setTimeout(syncViewport, 0);
    setTimeout(syncViewport, 80);
    setTimeout(syncViewport, 260);
  };

  const onFocusOut = () => {
    setTimeout(() => {
      if (!editableInRoot()) root.classList.remove('nn-travel-route-focus');
      syncViewport();
    }, 90);
  };

  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  visual?.addEventListener('resize', syncViewport);
  visual?.addEventListener('scroll', syncViewport);
  window.addEventListener('resize', syncViewport);
  window.addEventListener('orientationchange', syncViewport);

  requestAnimationFrame(() => requestAnimationFrame(syncViewport));
  setTimeout(syncViewport, 120);
  setTimeout(syncViewport, 420);

  const previousCleanup = root.__cleanup;
  root.__cleanup = () => {
    if (disposed) return;
    disposed = true;
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    visual?.removeEventListener('resize', syncViewport);
    visual?.removeEventListener('scroll', syncViewport);
    window.removeEventListener('resize', syncViewport);
    window.removeEventListener('orientationchange', syncViewport);
    root.classList.remove('nn-travel-keyboard-open', 'nn-travel-route-focus');
    root.style.removeProperty('--nn-travel-dock-reserve');
    screen?.classList.remove('nn-travel-host-screen');
    doc.classList.remove('nn-travel-host-lock', 'nn-travel-keyboard-open');
    previousCleanup?.();
  };
}

export function enhanceTravelApp(id, root) {
  if (!(root instanceof HTMLElement) || id !== 'travel') return root;

  stampTravelRevision(root);

  const lockedTravel = root.matches?.('.nn-travel-v16,.nn-travel-v19,[data-runtime-repair]')
    || root.querySelector?.('.nn-travel-v16,.nn-travel-v19,[data-runtime-repair]');
  if (lockedTravel) {
    normalizeTravelDates(root);
    installLockedTravelHost(root);
    return root;
  }

  const expansion = [...root.querySelectorAll('.nx-tool-card')]
    .find(card => card.textContent?.includes('Worldwide Travel Expansion')) || null;
  const groundPanel = renderTravelGroundPanel();
  if (expansion) {
    expansion.insertAdjacentElement('beforebegin', groundPanel);
    const meta = expansion.querySelector('.nx-tool-meta');
    if (meta) meta.textContent = 'Flights, hotels, rail and coach/bus now use browser-free in-app data engines. Live inventory appears only when an approved secure provider returns it.';
    const railBox = [...expansion.querySelectorAll('.nx-summary-grid > div')]
      .find(item => item.textContent?.includes('Rail / Bus'));
    const state = railBox?.querySelector('strong');
    if (state) state.textContent = 'LIVE SEARCH ENGINE';
  } else {
    root.appendChild(groundPanel);
  }

  normalizeTravelDates(root);
  return root;
}
