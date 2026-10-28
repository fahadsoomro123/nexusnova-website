(() => {
  'use strict';

  const homeAdScriptSelector = 'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]';
  const rootAdScriptSelector = 'script[src*="bauval.org"]';

  const existingGoogleScript = document.querySelector(homeAdScriptSelector);
  const existingRootScript = document.querySelector(rootAdScriptSelector);

  if (existingRootScript) {
    existingRootScript.remove();
  }

  if (!existingGoogleScript) {
    const adsenseScript = document.createElement('script');
    adsenseScript.async = true;
    adsenseScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5070673529890078';
    adsenseScript.crossOrigin = 'anonymous';
    document.head.appendChild(adsenseScript);
  }

  const consentKey = 'nexusnova_analytics_consent_v2';
  const gpcState = () => window.navigator?.globalPrivacyControl === true;

  const applyConsent = () => {
    try {
      const choice = window.localStorage.getItem(consentKey) || '';
      if (gpcState() || choice === 'denied' || choice === 'legacy-basic') {
        window.gtag = window.gtag || function () { (window.dataLayer = window.dataLayer || []).push(arguments); };
        window.gtag('consent', 'default', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          wait_for_update: 500
        });
      }
    } catch (_) {}
  };

  applyConsent();
})();
