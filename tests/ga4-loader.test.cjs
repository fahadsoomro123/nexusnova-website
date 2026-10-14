const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('public HumanProof page loads the canonical main bootstrap', () => {
  const text = fs.readFileSync('humanproof.html', 'utf8');
  assert.ok(text.includes('<script src="assets/js/main.js" defer></script>'));
});

test('GA4 bootstrap preserves the measurement ID, privacy defaults and single-load guard', () => {
  const wrapper = fs.readFileSync('assets/js/main.js', 'utf8');
  const required = [
    "const measurementId='G-YLPFKWSS12';",
    "const consentKey='nexusnova_analytics_consent_v2';",
    'window.dataLayer=window.dataLayer||[];',
    'window.gtag=window.gtag||function',
    "window.gtag('consent','default',{",
    "const legacyConsentKey='nexusnova_analytics_consent_v1';",
    "const restrictedAnalyticsRegions=['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'];",
    "window.gtag('consent','default',{analytics_storage:'granted'",
    'const readSavedAnalyticsChoice=()=>{',
    "if(current==='basic'||current==='granted'||current==='denied'||current==='legacy-basic')return current;",
    "if(legacy==='denied'){window.localStorage.setItem(consentKey,'legacy-basic');return 'legacy-basic';}",
    'wait_for_update:500',
    "window.gtag('consent','update',{",
    "ad_storage:'denied'",
    "ad_user_data:'denied'",
    "ad_personalization:'denied'",
    "window.gtag('js',new Date())",
    'googletagmanager.com/gtag/js?id=',
    "window.gtag('config',measurementId,{",
    'send_page_view:true',
    'allow_google_signals:false',
    'allow_ad_personalization_signals:false',
    'ads_data_redaction:true',
    'window.__nexusnovaConsentReady=true',
    'window.__nexusnovaLoadAnalytics=choice=>{',
    'if(window.__nexusnovaGa4BootstrapReady)return;',
    'window.__nexusnovaGa4BootstrapReady=true;',
    "script[data-nexusnova-ga4]"
  ];
  for (const token of required) assert.ok(wrapper.includes(token), token);
  assert.ok(!wrapper.includes('const mountChoices=()=>{'));
});

test('legacy site shell delegates analytics loading through the canonical GA4 bridge', () => {
  const text = fs.readFileSync('assets/js/site-main.js', 'utf8');
  for (const token of [
    "const measurementId='G-YLPFKWSS12';",
    'nexusnova_analytics_consent_v2',
    'nexusnova_analytics_consent_v1',
    'window.__nexusnovaLoadAnalytics',
    'data-consent-allow'
  ]) assert.ok(text.includes(token), token);
});

test('tool analytics detail events require the explicit analytics opt-in', () => {
  const text = fs.readFileSync('assets/js/tool-analytics.js', 'utf8');
  assert.ok(text.includes('const detailAllowed=()=>{'));
  assert.ok(text.includes("localStorage.getItem('nexusnova_analytics_consent_v2')==='granted'"));
  assert.ok(text.includes("const allowed=()=>typeof window.gtag==='function'&&detailAllowed();"));
});

test('automatic GA4 configuration cannot initialize twice on the same page', () => {
  const text = fs.readFileSync('assets/js/main.js', 'utf8');
  const guard = text.indexOf('if(window.__nexusnovaGa4BootstrapReady)return;');
  const initialized = text.indexOf('window.__nexusnovaGa4BootstrapReady=true;');
  assert.ok(guard >= 0 && initialized > guard, 'bootstrap singleton guard must run before initialization');
  assert.ok(text.includes("script[data-nexusnova-ga4]"));
  assert.ok(text.includes("script[data-nexusnova-site-shell]"));
  assert.ok(!text.includes('analyticsLoaded=false'));
});

test('GA4 external loader only runs on the owned production hostname', () => {
  const wrapper = fs.readFileSync('assets/js/main.js', 'utf8');
  const productionHostGuard = "const isProductionAnalyticsHost=/^(?:www\\.)?nexusnovatools\\.com$/i.test(location.hostname);";
  assert.ok(wrapper.includes(productionHostGuard), 'GA4 loader must have an explicit production-host allowlist');

  const hostPattern = /^(?:www\.)?nexusnovatools\.com$/i;
  for (const host of ['nexusnovatools.com', 'www.nexusnovatools.com', 'NEXUSNOVATOOLS.COM']) {
    assert.equal(hostPattern.test(host), true, host);
  }
  for (const host of ['raw.githack.com', 'github.io', 'localhost', '127.0.0.1', 'nexusnovatools.com.evil.example', 'preview.nexusnovatools.com']) {
    assert.equal(hostPattern.test(host), false, host);
  }
  assert.ok(wrapper.includes("if(isProductionAnalyticsHost&&!document.querySelector('script[data-nexusnova-ga4]')){"));
  assert.ok(wrapper.includes("const measurementId='G-YLPFKWSS12';"), 'measurement ID must remain unchanged');
});

test('homepage requests the current consent-aware production bootstrap', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.ok(html.includes('assets/js/main.js?v=20261015-cookie-consent-v1'));
  assert.ok(!html.includes('assets/js/main.js?v=20261013-ga4-hostguard-v3'));
  assert.ok(!html.includes('assets/js/main.js?v=20261005-ga4a'));
});

test('homepage defaults basic pageview analytics on where permitted and denies restricted regions until choice', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.ok(html.includes("nexusnova_analytics_consent_v2"));
  assert.ok(html.includes("nexusnova_analytics_consent_v1"));
  assert.ok(html.includes("nexusnova_analytics_consent_v2', 'legacy-basic'"));
  assert.ok(html.includes("analytics_storage: 'denied',"));
  assert.ok(html.includes("region: nexusnovaRestrictedAnalyticsRegions"));
  assert.ok(html.includes("analytics_storage: 'granted'"));
  assert.ok(html.includes("window.navigator && window.navigator.globalPrivacyControl === true"));
  assert.ok(html.includes('assets/js/main.js?v=20261015-cookie-consent-v1'));
});

test('previously uninstrumented public hubs load the standalone analytics and choice UI', () => {
  for (const path of ['tools.html', 'categories.html', 'guides.html', 'whatsapp-link-generator.html']) {
    const html = fs.readFileSync(path, 'utf8');
    assert.ok(html.includes('assets/js/analytics.js?v=20261015-cookie-consent-v1'), path + ' loader');
  }
});

test('standalone GA4 loader uses regional defaults, persists the selected mode and only runs on NexusNova production', () => {
  const loader = fs.readFileSync('assets/js/analytics.js', 'utf8');
  for (const token of [
    "const measurementId='G-YLPFKWSS12';",
    "const consentKey='nexusnova_analytics_consent_v2';",
    "const legacyConsentKey='nexusnova_analytics_consent_v1';",
    "window.gtag('consent','default',{analytics_storage:'granted'",
    "window.gtag('consent','update',{",
    "window.__nexusnovaOptInEventRequested=true;",
    'if(window.__nexusnovaGa4BootstrapReady)return;',
    'window.__nexusnovaGa4BootstrapReady=true;',
    "const isProductionAnalyticsHost=/^(?:www\\.)?nexusnovatools\\.com$/i.test(location.hostname);",
    "if(isProductionAnalyticsHost&&!document.querySelector('script[data-nexusnova-ga4]')){",
    'Basic only',
    'Accept all'
  ]) assert.ok(loader.includes(token), token);
  assert.ok(loader.includes("analytics_storage:'denied',region:restrictedAnalyticsRegions"), 'restricted regions must default denied');
  assert.ok(loader.includes("analytics_storage:'granted'"), 'basic pageview measurement must be enabled where permitted');
  assert.ok(loader.includes("if(legacy==='denied'){window.localStorage.setItem(consentKey,'legacy-basic');return 'legacy-basic';}"), 'legacy basic choice should be reviewed rather than silently treated as detailed opt-in');
  assert.ok(loader.includes("banner.dataset.nexusnovaConsent=''"), 'first-visit settings must be visible to the production verifier');
  assert.ok(loader.includes("const chooseBasic=()=>{applyChoice('basic')"), 'basic choice must not require detailed-interaction opt-in');
  assert.ok(loader.includes("const chooseDetailed=()=>{"), 'detailed opt-in handler must be explicit');
  assert.ok(loader.includes("const chooseOff=()=>{applyChoice('denied')"), 'visitors must be able to turn analytics off');
});

test('detailed opt-in event is fired by an explicit choice, not on every page load', () => {
  const wrapper = fs.readFileSync('assets/js/main.js', 'utf8');
  const shell = fs.readFileSync('assets/js/site-main.js', 'utf8');
  const handler = wrapper.slice(wrapper.indexOf('window.__nexusnovaLoadAnalytics=choice=>{'), wrapper.indexOf('const hydrateDynamicLinks='));
  assert.ok(!handler.includes("window.gtag('event','analytics_detail_opt_in'"));
  assert.ok(shell.includes("window.gtag('event','analytics_detail_opt_in',{detail_level:'enhanced'})"));
});

test('production GA4 verifier checks Realtime page_view events', () => {
  const workflow = fs.readFileSync('.github/workflows/privacy-analytics-production.yml', 'utf8');
  const deployShaToken = 'DEPLOY_SHA: ' + '$' + '{{ github.sha }}';
  for (const token of [
    'Wait for the matching Pages deployment before live browser checks',
    deployShaToken,
    "('/', 'assets/js/main.js?v=20261015-cookie-consent-v1')",
    "GA4_QA_VERSION: '20261015-cookie-consent-v1'",
    "('/tools.html', 'assets/js/analytics.js?v=20261015-cookie-consent-v1')",
    "('/categories.html', 'assets/js/analytics.js?v=20261015-cookie-consent-v1')",
    "('/guides.html', 'assets/js/analytics.js?v=20261015-cookie-consent-v1')",
    "('/whatsapp-link-generator.html', 'assets/js/analytics.js?v=20261015-cookie-consent-v1')",
    "const banner=document.querySelector('#nexusnova-analytics-consent, #nexusnova-analytics-consent-banner');",
    "def add_collect_events(q,method,source):",
    "body_chunks=[chunk.strip() for chunk in post_data.splitlines() if chunk.strip()]",
    "optin_responses=[];optin_errors=[];optin_report_only_csp_notices=[]",
    "def is_report_only_csp_notice(message):",
    "no further action has been taken",
    "page.on('response',lambda response:optin_responses.append(",
    "'google-analytics.com/g/collect' in response.url",
    "response.request.method",
    "response.request.post_data or ''",
    "'httpStatus':response.status",
    "consented_response_events=[x for x in optin_response_evidence if x['en']=='analytics_detail_opt_in' and x['gcs']=='G101' and isinstance(x['httpStatus'],int) and 200<=x['httpStatus']<300]",
    "'consentedOptInResponses':consented_response_events",
    "len(consented_response_events)>=1",
    "optInEventCallback:window.__nexusnovaOptInEventCallback===true",
    "optInEventCommand:eventCommands.includes('analytics_detail_opt_in')",
    "'httpStatusCounts':{}",
    "'expectedEvent':'page_view'",
    "'expectedMetric':'eventCount'",
    "'observedEventNames':[]",
    "https://analyticsadmin.googleapis.com/v1beta/properties/{PROPERTY_ID}/dataStreams",
    "rt['dataStreamMeasurementMatch']=any(x['matchesExpectedMeasurementId'] for x in rt['adminDataStreams'])",
    "https://analyticsdata.googleapis.com/v1beta/properties/{PROPERTY_ID}:runReport",
    "'startDate':'7daysAgo','endDate':'today'",
    "rt['historicalReport']['matchedEventCount']=metrics[0] if metrics else ''",
    "rt['apiErrors'].append",
    "if response.status_code not in (429,500,502,503,504):",
    "rt['fatalApiError']=True",
    "rt['observedEventNames'].append(event_name)",
    "if rt['success'] or rt['fatalApiError']:break",
    "payload={'dimensions':[{'name':'eventName'}],'metrics':[{'name':'eventCount'}],'limit':50}",
    "if len(dims)>=1:",
    "if event_name=='page_view' and positive_count:",
    "rt['matchedEventCount']=metrics[0]",
    "rt['matchedEventName']=event_name",
    "rt['success']=True",
    "assert rt['success'], 'GA4 Realtime did not observe a page_view event in the configured property'"
  ]) assert.ok(workflow.includes(token), token);
});

test('live performance workflow fingerprint follows the canonical GA4 loader signature', () => {
  const wrapper = fs.readFileSync('assets/js/main.js', 'utf8');
  const workflow = fs.readFileSync('.github/workflows/live-performance-100.yml', 'utf8');
  const expected = 'window.__nexusnovaLoadAnalytics=choice=>{';
  assert.ok(wrapper.includes(expected), 'canonical GA4 loader signature must exist');
  assert.ok(workflow.includes('grep -Fq "' + expected + '" assets/js/main.js'), 'live performance fingerprint must match the canonical loader');
  assert.ok(!workflow.includes('window.__nexusnovaLoadAnalytics=granted=>{'), 'obsolete loader signature must not return');
});
