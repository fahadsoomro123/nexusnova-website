(function (root) {
  'use strict';

  if (!root || !root.document || root.__nexusNovaRelatedToolsBootstrapStarted) return;
  root.__nexusNovaRelatedToolsBootstrapStarted = true;

  const doc = root.document;
  const normalizeLocalPath = (value) => {
    try {
      const url = new URL(value, root.location.origin + '/');
      if (url.origin !== root.location.origin || !/\.html$/i.test(url.pathname)) return null;
      return url.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
    } catch (_) {
      return null;
    }
  };

  const isSupportedPath = (path) =>
    /^\/(?:tools|articles|guides)\/[^/]+\.html$/i.test(path) ||
    /^\/[^/]+\.html$/i.test(path);

  const boot = () => {
    if (!doc.querySelector('main')) return;
    const pathname = String(root.location.pathname || '/');
    if (!isSupportedPath(pathname)) return;

    const currentPaths = new Set([normalizeLocalPath(pathname)].filter(Boolean));
    const canonical = doc.querySelector('link[rel="canonical"]');
    if (canonical && canonical.href) {
      const canonicalPath = normalizeLocalPath(canonical.href);
      if (canonicalPath) currentPaths.add(canonicalPath);
    }

    const mountIfSupportedPage = () => {
      const data = root.NexusNovaSearchData;
      if (!Array.isArray(data)) return;

      const listings = new Set(['/articles.html', '/guides.html', '/categories.html']);
      const isListing = [...currentPaths].some(path => listings.has(path.toLowerCase()));
      const indexedPage = data.some((entry) => {
        if (!entry || !['tool', 'article', 'guide', 'category'].includes(entry.type) || typeof entry.url !== 'string') return false;
        const route = normalizeLocalPath(entry.url);
        return route !== null && currentPaths.has(route);
      });
      if (!isListing && !indexedPage) return;

      if (root.NexusNovaRelatedTools && typeof root.NexusNovaRelatedTools.render === 'function') {
        root.NexusNovaRelatedTools.render(doc, root);
        return;
      }
      if (doc.querySelector('script[data-nexusnova-global-related-tools]')) return;
      const renderer = doc.createElement('script');
      renderer.src = '/assets/js/related-tools.js?v=20261016-related-content-v1';
      renderer.async = true;
      renderer.dataset.nexusnovaGlobalRelatedTools = '';
      renderer.onload = () => {
        if (root.NexusNovaRelatedTools) root.NexusNovaRelatedTools.render(doc, root);
      };
      doc.head.appendChild(renderer);
    };

    if (Array.isArray(root.NexusNovaSearchData)) {
      mountIfSupportedPage();
      return;
    }

    const existingCore = doc.querySelector('script[src*="search-core.js"]');
    if (existingCore) {
      existingCore.addEventListener('load', mountIfSupportedPage, { once: true });
      // A cached or already-executed script may no longer emit a load event.
      if (root.NexusNovaSearchData) mountIfSupportedPage();
      return;
    }

    const searchCore = doc.createElement('script');
    searchCore.src = '/assets/js/search-core.js?v=20261016-related-content-v1';
    searchCore.async = true;
    searchCore.dataset.nexusnovaGlobalRelatedSearchCore = '';
    searchCore.onload = mountIfSupportedPage;
    doc.head.appendChild(searchCore);
  };

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(typeof window === 'undefined' ? null : window);
