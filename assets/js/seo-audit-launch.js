/* Data-driven launch offer display for NexusNova SEO Audit Studio. */
(() => {
  'use strict';
  const offerBox = document.getElementById('nnAuditLaunchOffer');
  const cta = document.getElementById('nnAuditLaunchCta');
  if (!offerBox || !cta) return;

  const allowedOrigins = new Set(['https://nexusnovatools.com', 'https://www.nexusnovatools.com', 'https://review.nexusnova-seo-audit-studio-review.pages.dev']);
  if (!allowedOrigins.has(window.location.origin)) return;

  const api = 'https://nexusnova-audit-studio-review.fahadsoomro123.workers.dev/api/promotions/active';
  const text = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  };
  const offerLabel = (campaign) => {
    const type = String(campaign.offerType || '');
    const value = Number(campaign.offerValue);
    if (type === 'free_report' && value === 100) return 'Free full-report access';
    if (type === 'percent' && Number.isInteger(value) && value > 0 && value <= 100) return value + '% off the full report';
    if (type === 'fixed' && Number.isInteger(value) && value > 0) return '$' + (value / 100).toFixed(2) + ' off the full report';
    return '';
  };
  const displayDate = (value) => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  fetch(api, { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } })
    .then((response) => {
      if (!response.ok) return null;
      return response.json();
    })
    .then((payload) => {
      const campaign = payload && payload.ok === true ? payload.campaign : null;
      if (!campaign || typeof campaign.id !== 'string' || !campaign.id || !Number.isInteger(Number(campaign.remainingClaims)) ||
          Number(campaign.remainingClaims) <= 0) return;
      const label = offerLabel(campaign);
      if (!label) return;

      offerBox.append(
        text('span', 'nn-audit-launch-offer-label', 'LIMITED-TIME LAUNCH OFFER'),
        text('span', 'nn-audit-launch-offer-detail', label),
        text('span', '', Number(campaign.remainingClaims) + ' claims remaining')
      );
      const ends = displayDate(campaign.endsAt);
      if (ends) offerBox.append(text('span', '', 'Offer ends ' + ends));
      if (campaign.terms && typeof campaign.terms === 'string') offerBox.append(text('span', 'nn-audit-launch-terms', campaign.terms));
      offerBox.append(text('span', 'nn-audit-launch-terms', 'Use your voucher code at checkout in Audit Studio.'));
      offerBox.hidden = false;
      cta.href = 'seo-audit-studio.html';
    })
    .catch(() => {
      // Intentionally fail closed. An unavailable promotions service must not create offer claims.
    });
})();
