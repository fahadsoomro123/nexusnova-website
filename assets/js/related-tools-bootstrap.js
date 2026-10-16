(function (root) {
  'use strict';

  if (!root || !root.document || root.__nexusNovaRelatedToolsBootstrapStarted) return;
  root.__nexusNovaRelatedToolsBootstrapStarted = true;

  const doc = root.document;
  const excludedPages = new Set([
    '/', '/index.html', '/tools.html', '/categories.html', '/articles.html',
    '/guides.html', '/faq.html', '/about.html', '/contact.html', '/terms.html',
    '/privacy.html', '/disclaimer.html', '/refund-policy.html', '/editorial-policy.html',
    '/editorial-team.html', '/tool-methodology.html', '/app.html', '/live.html',
    '/labs.html', '/widgets.html', '/gaming.html', '/links.html', '/404.html'
  ]);

  const normalizeLocalPath = (value) => {
    try {
      const url = new URL(value, root.location.origin + '/');
      if (url.origin !== root.location.origin || !/\.html$/i.test(url.pathname)) return null;
      return url.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
    } catch (_) {
      return null;
    }
  };

  const boot = () => {
    if (!doc.querySelector('main')) return;
    const pathname = String(root.location.pathname || '/');
    if (!/^\/(?:tools\/)?[^/]+\.html$/i.test(pathname)) return;
    if (excludedPages.has(pathname.toLowerCase())) return;

    const currentPaths = new Set([normalizeLocalPath(pathname)].filter(Boolean));
    const canonical = doc.querySelector('link[rel="canonical"]');
    if (canonical && canonical.href) {
      const canonicalPath = normalizeLocalPath(canonical.href);
      if (canonicalPath) currentPaths.add(canonicalPath);
    }

    const mountIfTool = () => {
      const data = root.NexusNovaSearchData;
      if (!Array.isArray(data)) return;
      const isIndexedTool = data.some((entry) => {
        if (!entry || entry.type !== 'tool' || typeof entry.url !== 'string') return false;
        const route = normalizeLocalPath(entry.url);
        return route !== null && currentPaths.has(route);
      });
      if (!isIndexedTool) return;

      if (root.NexusNovaRelatedTools && typeof root.NexusNovaRelatedTools.render === 'function') {
        root.NexusNovaRelatedTools.render(doc, root);
        return;
      }
      if (doc.querySelector('script[data-nexusnova-global-related-tools]')) return;
      const renderer = doc.createElement('script');
      renderer.src = '/assets/js/related-tools.js?v=20261016-global-related-v2';
      renderer.async = true;
      renderer.dataset.nexusnovaGlobalRelatedTools = '';
      renderer.onload = () => {
        if (root.NexusNovaRelatedTools) root.NexusNovaRelatedTools.render(doc, root);
      };
      doc.head.appendChild(renderer);
    };

    if (Array.isArray(root.NexusNovaSearchData)) {
      mountIfTool();
      return;
    }

    const existingCore = doc.querySelector('script[src*="search-core.js"]');
    if (existingCore) {
      existingCore.addEventListener('load', mountIfTool, { once: true });
      return;
    }

    const searchCore = doc.createElement('script');
    searchCore.src = '/assets/js/search-core.js?v=20261016-global-related-v2';
    searchCore.async = true;
    searchCore.dataset.nexusnovaGlobalRelatedSearchCore = '';
    searchCore.onload = mountIfTool;
    doc.head.appendChild(searchCore);
  };

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(typeof window === 'undefined' ? null : window);
