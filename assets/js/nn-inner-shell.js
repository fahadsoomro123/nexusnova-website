/* Related-content bootstrap only. Shared header and footer are static HTML. */
(function () {
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
