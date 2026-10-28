(() => {
  'use strict';

  const enforceCleanCanonical = () => {
    const link = document.querySelector('link[rel="canonical"]');
    if (!link) return;
    try {
      const canonical = new URL(link.getAttribute('href') || location.href, location.origin);
      if (canonical.origin !== location.origin) {
        link.setAttribute('href', location.origin + location.pathname);
      }
    } catch (_) {}
  };

  enforceCleanCanonical();
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', enforceCleanCanonical, { once: true });
  }

  const measurementId = 'G-YLPFKWSS12';
  const consentKey = 'nexusnova_analytics_consent_v2';
  const legacyConsentKey = 'nexusnova_analytics_consent_v1';
  const restrictedAnalyticsRegions = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'];

  if (window.__nexusnovaGa4BootstrapReady) return;
  window.__nexusnovaGa4BootstrapReady = true;

  window.__nexusnovaConsentReady = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  const isGpcEnabled = () => window.navigator?.globalPrivacyControl === true;
  const readSavedAnalyticsChoice = () => {
    try {
      const current = window.localStorage.getItem(consentKey) || '';
      if (current === 'basic' || current === 'granted' || current === 'denied' || current === 'legacy-basic') return current;
      const legacy = window.localStorage.getItem(legacyConsentKey) || '';
      if (legacy === 'granted') {
        window.localStorage.setItem(consentKey, 'granted');
        return 'granted';
      }
      if (legacy === 'denied') {
        window.localStorage.setItem(consentKey, 'legacy-basic');
        return 'legacy-basic';
      }
    } catch (_) {}
    return '';
  };

  const savedAnalyticsChoice = readSavedAnalyticsChoice();
  if (!window.__nexusnovaConsentDefaulted) {
    if (isGpcEnabled() || savedAnalyticsChoice === 'denied') {
      window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500 });
    } else if (savedAnalyticsChoice === 'basic' || savedAnalyticsChoice === 'granted') {
      window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500 });
    } else {
      window.gtag('consent', 'default', { analytics_storage: 'denied', region: restrictedAnalyticsRegions, ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500 });
      window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500 });
    }
    window.__nexusnovaConsentDefaulted = true;
  }

  const adsenseScriptSelector = 'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]';
  const isLocalAuditHost = /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
  const robotsDirective = document.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
  const isNoindexPage = /\bnoindex\b/i.test(robotsDirective);
  const restrictedPage = /^\/(?:404\.html|account\.html|account-deletion\.html|register\.html|app\.html)$/i.test(location.pathname);
  const isHomepage = location.pathname === '/' || /\/index\.html$/.test(location.pathname);

  const scheduleAfterLargestContentfulPaint = (task, options = {}) => {
    const delay = Number.isFinite(options.delay) ? options.delay : 2500;
    const fallbackDelay = Number.isFinite(options.fallbackDelay) ? options.fallbackDelay : 7000;
    const idleTimeout = Number.isFinite(options.idleTimeout) ? options.idleTimeout : 1500;
    let scheduled = false;
    let lcpSettled = false;
    let pageLoaded = document.readyState === 'complete';
    let observer = null;
    let quietTimer = 0;
    let fallbackTimer = 0;

    const scheduleIfReady = () => {
      if (scheduled || !lcpSettled || !pageLoaded) return;
      scheduled = true;
      window.clearTimeout(quietTimer);
      window.clearTimeout(fallbackTimer);
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      window.setTimeout(() => {
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(task, { timeout: idleTimeout });
        } else {
          window.setTimeout(task, 250);
        }
      }, delay);
    };

    const markLcpSettled = () => {
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(() => {
        lcpSettled = true;
        scheduleIfReady();
      }, 1200);
    };

    if (!pageLoaded) {
      window.addEventListener('load', () => {
        pageLoaded = true;
        scheduleIfReady();
      }, { once: true });
    }

    fallbackTimer = window.setTimeout(() => {
      lcpSettled = true;
      scheduleIfReady();
    }, fallbackDelay);

    try {
      if (typeof window.PerformanceObserver === 'function') {
        observer = new window.PerformanceObserver(list => {
          if (list.getEntries().length) markLcpSettled();
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      }
    } catch (_) {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }
  };

  const insertAdsenseScript = () => {
    if (isLocalAuditHost || isNoindexPage || restrictedPage || document.querySelector(adsenseScriptSelector)) return;
    const adsenseScript = document.createElement('script');
    adsenseScript.async = true;
    adsenseScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5070673529890078';
    adsenseScript.crossOrigin = 'anonymous';
    adsenseScript.dataset.nexusnovaAdsense = '';
    document.head.appendChild(adsenseScript);
  };

  if (isHomepage && !isLocalAuditHost && !isNoindexPage && !restrictedPage && !document.querySelector(adsenseScriptSelector)) {
    scheduleAfterLargestContentfulPaint(insertAdsenseScript, { delay: 2500, fallbackDelay: 7000, idleTimeout: 1500 });
  } else {
    insertAdsenseScript();
  }

  const isProductionAnalyticsHost = /^(?:www\.)?nexusnovatools\.com$/i.test(location.hostname);
  const initializeGa4 = () => {
    if (isProductionAnalyticsHost && !document.querySelector('script[data-nexusnova-ga4]')) {
      window.gtag('js', new Date());
      window.gtag('config', measurementId, {
        send_page_view: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        ads_data_redaction: true
      });
      const analyticsScript = document.createElement('script');
      analyticsScript.async = true;
      analyticsScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
      analyticsScript.dataset.nexusnovaGa4 = '';
      analyticsScript.onerror = () => {
        analyticsScript.dataset.nexusnovaGa4Failed = 'true';
      };
      document.head.appendChild(analyticsScript);
    }
  };

  if (isProductionAnalyticsHost && isHomepage) {
    scheduleAfterLargestContentfulPaint(initializeGa4, { delay: 500, fallbackDelay: 4000, idleTimeout: 1500 });
  } else {
    initializeGa4();
  }

  window.__nexusnovaLoadAnalytics = choice => {
    const requested = choice === true ? 'granted' : choice === false ? 'denied' : choice;
    const selected = ['basic', 'granted', 'denied'].includes(requested) ? requested : 'denied';
    const effective = isGpcEnabled() ? 'denied' : selected;
    window.gtag('consent', 'update', {
      analytics_storage: effective === 'denied' ? 'denied' : 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    try { window.localStorage.setItem(consentKey, effective); } catch (_) {}
    return effective;
  };

  const dynamicLinkSelector = 'a[data-nova-dynamic-href]';
  const hydrateDynamicLink = link => {
    const target = link.dataset.novaDynamicHref;
    if (!target) return;
    try {
      const url = new URL(target, location.href);
      if (['http:', 'https:'].includes(url.protocol)) link.setAttribute('href', url.href);
    } catch (_) {}
  };

  const hydrateDynamicLinks = root => {
    if (!root) return;
    if (root.nodeType === 1 && root.matches(dynamicLinkSelector)) hydrateDynamicLink(root);
    if (typeof root.querySelectorAll === 'function') root.querySelectorAll(dynamicLinkSelector).forEach(hydrateDynamicLink);
  };

  const startDynamicLinkHydration = () => {
    const body = document.body;
    if (!body || !body.querySelector(dynamicLinkSelector)) return;
    hydrateDynamicLinks(body);

    if (window.__nexusnovaDynamicHydrationObserver) return;
    const observer = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => {
          if (node.nodeType === 1) hydrateDynamicLinks(node);
        });
      });
    });
    observer.observe(body, { childList: true, subtree: true });
    window.__nexusnovaDynamicHydrationObserver = observer;
  };

  const hydrateClickedDynamicLink = event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest(dynamicLinkSelector);
    if (link) hydrateDynamicLink(link);
  };

  document.addEventListener('click', hydrateClickedDynamicLink, true);
  document.addEventListener('auxclick', hydrateClickedDynamicLink, true);

  const scheduleDynamicLinkHydration = () => {
    if (window.__nexusnovaDynamicHydrationScheduled) return;
    window.__nexusnovaDynamicHydrationScheduled = true;
    const run = () => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(startDynamicLinkHydration, { timeout: 1800 });
      } else {
        window.setTimeout(startDynamicLinkHydration, 180);
      }
    };
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  };

  scheduleDynamicLinkHydration();

  const mountShareWidget = () => {
    if (document.querySelector('[data-nexusnova-share-widget]')) return;
    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href.split('#')[0];
    const pageTitle = (document.querySelector('h1')?.textContent || document.title || 'NexusNova Tools').trim().replace(/\s+/g, ' ');
    const shareUrl = canonical;
    const shareText = 'Check out ' + pageTitle + ' on NexusNova Tools.';
    const style = document.createElement('style');
    style.dataset.nexusnovaShareStyle = '';
    style.textContent = [
      '.nn-share-widget{position:fixed;right:16px;bottom:max(20px,env(safe-area-inset-bottom));z-index:80;font-family:inherit}',
      '.nn-share-fab{width:46px;height:46px;padding:0;border:1px solid rgba(15,23,42,.10);border-radius:15px;display:grid;place-items:center;color:#24324a;background:rgba(255,255,255,.92);box-shadow:0 12px 30px rgba(15,23,42,.12);transition:transform .18s ease,box-shadow .18s ease}',
      '.nn-share-fab:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(15,23,42,.18),0 0 0 4px rgba(122,167,255,.08)}',
      '.nn-share-fab:active{transform:translateY(0) scale(.97)}',
      '.nn-share-fab:focus-visible{outline:3px solid rgba(121,242,192,.72);outline-offset:3px}',
      '.nn-share-fab svg{width:20px;height:20px}',
      '.nn-share-toast{position:fixed;left:50%;bottom:max(78px,calc(58px + env(safe-area-inset-bottom)));z-index:81;transform:translate(-50%,8px);max-width:min(340px,calc(100vw - 28px));padding:12px 16px;border:1px solid rgba(148,163,184,.35);border-radius:12px;background:rgba(15,23,42,.92);color:#fff;opacity:0;transition:opacity .2s ease,transform .2s ease}',
      '.nn-share-toast.show{opacity:1;transform:translate(-50%,0)}',
      '@media(max-width:560px){.nn-share-widget{right:14px;bottom:max(14px,env(safe-area-inset-bottom))}.nn-share-fab{width:44px;height:44px;border-radius:14px}}',
      '@media(prefers-reduced-motion:reduce){.nn-share-fab,.nn-share-toast{transition:none}}'
    ].join('');
    document.head.appendChild(style);

    const widget = document.createElement('div');
    widget.dataset.nexusnovaShareWidget = '';
    widget.className = 'nn-share-widget';
    widget.innerHTML = '<button class="nn-share-fab" type="button" aria-label="Share this page" title="Share this page"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 8a3 3 0 1 0-2.82-4H12a3 3 0 0 0 0 6h.18A3 3 0 0 0 15 8Zm-6 7a3 3 0 1 0-2.82-4H6A3 3 0 0 0 6 17h.18A3 3 0 0 0 9 15Zm9 5a3 3 0 1 0-2.82-4H15a3 3 0 0 0 0 6h.18A3 3 0 0 0 18 20Z"></path><path d="M8.8 13.2l6.2-3.6M15 9.8l-6.2-3.6"></path></svg></button>';
    document.body.appendChild(widget);

    const toast = document.createElement('div');
    toast.className = 'nn-share-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    const button = widget.querySelector('.nn-share-fab');
    let toastTimer = 0;
    const showToast = message => {
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200);
    };

    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Page link copied.');
      } catch {
        const helper = document.createElement('textarea');
        helper.value = shareUrl;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        let copied = false;
        try { copied = document.execCommand('copy'); } catch (_) {}
        helper.remove();
        showToast(copied ? 'Page link copied.' : 'Sharing is unavailable in this browser.');
      }
    };

    button.addEventListener('click', async () => {
      const data = { title: pageTitle, text: shareText, url: shareUrl };
      if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(data))) {
        try {
          await navigator.share(data);
          return;
        } catch (error) {
          if (error && error.name === 'AbortError') return;
        }
      }
      await copyLink();
    });
  };

  const loadShareOnIntent = () => mountShareWidget();
  ['pointerdown', 'keydown', 'touchstart'].forEach(type => window.addEventListener(type, loadShareOnIntent, { once: true, passive: true }));

  const scheduleShare = () => window.setTimeout(() => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(mountShareWidget, { timeout: 1800 });
    } else {
      window.setTimeout(mountShareWidget, 900);
    }
  }, 2800);

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', scheduleShare, { once: true });
  } else {
    scheduleShare();
  }

  const inSubdir = /\/(guides|articles|tech)\//.test(location.pathname);
  const base = inSubdir ? '../' : '';

  const loadShell = () => {
    if (document.querySelector('script[data-nexusnova-site-shell]')) return;
    const shell = document.createElement('script');
    shell.src = base + 'assets/js/site-main.js?v=20261015-cookie-consent-v1';
    shell.async = true;
    shell.dataset.nexusnovaSiteShell = '';
    document.head.appendChild(shell);
  };

  const loadSocialShare = () => {
    if (document.querySelector('script[data-nexusnova-social-share]')) return;
    const script = document.createElement('script');
    script.src = base + 'assets/js/social-share.js?v=20261015-cookie-consent-v1';
    script.async = true;
    script.dataset.nexusnovaSocialShare = '';
    document.head.appendChild(script);
  };

  const scheduleShell = () => {
    if (location.pathname === '/' || /\/index\.html$/.test(location.pathname)) {
      const loadHomepageRuntime = () => {
        loadShell();
        loadSocialShare();
      };
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadHomepageRuntime, { timeout: 1800 });
      } else {
        window.setTimeout(loadHomepageRuntime, 600);
      }
      return;
    }
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        loadShell();
        loadSocialShare();
      }, { timeout: 1800 });
    } else {
      window.setTimeout(() => {
        loadShell();
        loadSocialShare();
      }, 600);
    }
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', scheduleShell, { once: true });
  } else {
    scheduleShell();
  }

  (() => {
    if (window.__nexusNovaRelatedToolsBootstrapScriptRequested) return;
    window.__nexusNovaRelatedToolsBootstrapScriptRequested = true;
    var loader = document.createElement('script');
    loader.src = '/assets/js/related-tools-bootstrap.js?v=20261016-related-content-v1';
    loader.async = true;
    loader.dataset.nexusnovaRelatedToolsBootstrap = '';
    loader.onerror = function () {
      window.__nexusNovaRelatedToolsBootstrapScriptRequested = false;
    };
    document.head.appendChild(loader);
  })();
})();
