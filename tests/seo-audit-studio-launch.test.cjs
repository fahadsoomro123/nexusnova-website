'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/seo-audit-launch.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/js/seo-audit-launch.js'), 'utf8');
const auditHtml = fs.readFileSync(path.join(root, 'seo-audit-studio.html'), 'utf8');

test('homepage introduces a realistic SEO audit workspace before tool discovery', () => {
  const header = html.indexOf('</header>');
  const main = html.indexOf('<main class="nn-main">');
  const banner = html.indexOf('class="nn-audit-launch nn-shell"');
  const toolsHeading = Math.max(html.indexOf('<h1 id="new-tools-title">'), html.indexOf('<h2 id="new-tools-title">'));
  assert.ok(header >= 0 && main > header && banner > main && banner < toolsHeading);
  assert.match(html, /<h1 class="nn-audit-launch-title" id="nn-audit-launch-title">SEO Audit Studio<\/h1>/);
  assert.match(html, /class="nn-audit-workspace"/);
  assert.match(html, /nn-audit-workspace-layout-simple/);
  assert.doesNotMatch(html, /nn-audit-value-list|nn-audit-sidebar|nn-audit-mini-metrics|Your report will appear here|WAITING FOR AUDIT/);
  assert.match(html, /id="nnAuditHomeForm"/);
  assert.match(html, /id="nnAuditLaunchUrl"/);
  assert.match(html, /id="nnAuditClaimVoucher"/);
  assert.match(html, /assets\/css\/seo-audit-launch\.css\?v=20261023-ready-post-v4/);
  assert.match(html, /assets\/js\/seo-audit-launch\.js\?v=20261023-ready-post-v4/);
  assert.doesNotMatch(html, /Missing page title|Meta description review|Image alt-text review/);
});


test('voucher terms stay concise and voucher claims remain backend-controlled', () => {
  assert.match(html, /class="nn-audit-voucher-terms"/);
  assert.match(html, /<summary>Voucher terms<\/summary>/);
  assert.match(html, /Publish a public post with a direct link to nexusnovatools.com or the SEO Audit Studio campaign/i);
  assert.match(html, /id="nnAuditClaimPanel"/);
  assert.match(html, /id="nnAuditProofUrl"/);
  assert.match(html, /id="nnAuditTermsAccepted"/);
  assert.match(html, /A verified matching post unlocks a single-use voucher/i);
  assert.doesNotMatch(html, /twitter\.com\/intent\/tweet|facebook\.com\/sharer\/sharer\.php|Sharing is optional|Share on X|Share on Facebook/);
  assert.match(js, /\/api\/promotions\/claim/);
});

test('Audit Studio tool page keeps only essential evidence and unlock text', () => {
  assert.match(auditHtml, /Unavailable checks are unscored/);
  assert.match(auditHtml, /actual website and provider measurements/);
  assert.match(auditHtml, /Why is some data unavailable\?/);
  assert.match(auditHtml, /Scores need usable source evidence/);
  assert.doesNotMatch(auditHtml, /Audit notes and common questions|Why can a category show N\/A|Do scores guarantee rankings|When is the full report unlocked/);
});

test('homepage URL handoff validates HTTP(S) URLs and Audit Studio prefills without auto-running', () => {
  assert.match(js, /nnAuditHomeForm/);
  assert.match(js, /new URL\(candidate\)/);
  assert.match(js, /target\.searchParams\.set\('url',parsed\.href\)/);
  assert.match(auditHtml, /new URLSearchParams\(window\.location\.search\)\.get\('url'\)/);
  assert.match(auditHtml, /input\.value = target\.href/);
  assert.match(auditHtml, /history\.replaceState/);
});

test('voucher claims require backend confirmation and fail closed on preview connectivity errors', () => {
  assert.match(js, /\/api\/promotions\/active/);
  assert.match(js, /\/api\/promotions\/claim/);
  assert.match(js, /nexusnova_audit_session_v1/);
  assert.match(js, /nexusnova_audit_voucher_v1/);
  assert.match(js, /ALLOWED_ORIGINS\.has\(window\.location\.origin\)/);
  assert.match(js, /payload\.ok===true/);
  assert.match(js, /campaign\.terms/);
  assert.match(js, /campaign\.remainingClaims/);
  assert.match(js, /credentials:'omit'/);
  assert.match(js, /voucherServiceReady=false/);
  assert.match(js, /isolated voucher service is not responding in this preview/);
  assert.match(js, /No code was issued/);
  assert.doesNotMatch(js, /setInterval|countdown|fakeUserCount|remainingClaims\s*[:=]\s*\d+/i);
});

test('real workspace styling is responsive and accessible with a restrained premium offer', () => {
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /--audit-blue:#3157b7/);
  assert.match(css, /nn-audit-workspace-layout/);
  assert.match(css, /nn-audit-report-card/);
  assert.match(css, /radial-gradient\(circle at 91% 6%/);
  assert.match(css, /linear-gradient\(125deg,#142239/);
  assert.match(css, /background:#f7f2e8/);
  assert.doesNotMatch(css, /--audit-lime|#dfff00|acid-lime/i);
  assert.match(js, /showOfferUnavailable/);
  assert.match(js, /NEXUSNOVA \| LAUNCH PRIVILEGE/);
});

test('production audit page does not load review-only mocks or browser source relays', () => {
  assert.doesNotMatch(auditHtml, /seo-audit-studio-preview-mock\.js/);
  assert.doesNotMatch(auditHtml, /api\/page-source|api-page-source|allorigins\.win|r\.jina\.ai/);
  assert.match(auditHtml, /nexusnova-audit-studio\.fahadsoomro123\.workers\.dev/);
  assert.match(auditHtml, /const runAudit = async/);
});


test('production audit source retrieval is server-side and has no public browser relay', () => {
  const runStart = auditHtml.indexOf('const runAudit = async');
  const runEnd = auditHtml.indexOf('if (el.retryMeasurements)', runStart);
  const runBody = auditHtml.slice(runStart, runEnd);
  assert.match(auditHtml, /nexusnova-audit-studio\.fahadsoomro123\.workers\.dev/);
  assert.match(runBody, /apiFetch\('\/api\/audits'/);
  assert.doesNotMatch(runBody, /fetchPageContent\(|fetchPageSpeed\(/);
  assert.doesNotMatch(auditHtml, /api\/page-source|api-page-source|allorigins\.win|r\.jina\.ai/);
});

test('category scores require real evidence coverage', () => {
  assert.match(auditHtml, /requiredHtmlChecks=\{onPage:6,geo:4,links:4,usability:4,social:4,local:3\}/);
  assert.match(auditHtml, /geo: scoreCategory\(checks,'GEO readiness',categoryMinimum\('geo'\)\)/);
  assert.match(auditHtml, /links: scoreCategory\(checks,'Links',categoryMinimum\('links'\)\)/);
  assert.match(auditHtml, /usability: scoreCategory\(checks,'Usability',categoryMinimum\('usability'\)\) \?\? usabilityProviderScore/);
  assert.match(auditHtml, /categoryMeta=\{/);
  assert.match(auditHtml, /categories:scores,categoryMeta,checks/);
  assert.match(auditHtml, /status:scores\.geo!=null\?'measured':categoryCheckCount\('GEO readiness'\)\?'limited':'unavailable'/);
  assert.match(auditHtml, /status:scores\.links!=null\?'measured':categoryCheckCount\('Links'\)\?'limited':'unavailable'/);
  assert.match(auditHtml, /status:scores\.social!=null\?'measured':categoryCheckCount\('Social'\)\?'limited':'unavailable'/);
});


test('public audit UI displays all backend categories and excludes not-applicable categories from scoring denominators', () => {
  assert.match(auditHtml, /\{id:'technical',name:'Technical SEO'/);
  assert.match(auditHtml, /\{id:'content',name:'Content'/);
  assert.match(auditHtml, /'not_applicable'\]\.includes\(meta\.status\)/);
  assert.match(auditHtml, /meta\.status==='not_applicable'\?'Not applicable'/);
  assert.match(auditHtml, /const notApplicable=categories\.filter\(c=>report\.categoryMeta\?\.\[c\.id\]\?\.status==='not_applicable'\)\.length/);
  assert.match(auditHtml, /applicableCategoryScores=categoryScores\.filter\(item=>report\.categoryMeta\?\.\[item\.cat\.id\]\?\.status!=='not_applicable'\)/);
  assert.match(auditHtml, /Applicable category coverage:/);
});

test('partial audit evidence cannot receive a misleading overall score', () => {
  assert.match(auditHtml, /if \(items\.length < minimumChecks\) return null/);
  assert.match(auditHtml, /requiredHtmlChecks=\{onPage:6,geo:4,links:4,usability:4,social:4,local:3\}/);
  assert.match(auditHtml, /const overall=allCoreSourcesMeasured&&scored\.length \? Math\.round/);
  assert.match(auditHtml, /const hasRawHtml=Boolean\(content && content\.mode==='html'\)/);
  assert.match(auditHtml, /const allCoreSourcesMeasured=hasRawHtml&&hasMobile&&hasDesktop/);
  assert.match(auditHtml, /const overall=allCoreSourcesMeasured&&scored\.length \? Math\.round/);
  assert.match(auditHtml, /const hasMobile=Boolean\(psiMobile\?\.lighthouseResult\)/);
  assert.match(auditHtml, /const hasDesktop=Boolean\(psiDesktop\?\.lighthouseResult\)/);
});

test('production audit and voucher requests are served only by the correct Worker', () => {
  const runStart = auditHtml.indexOf('const runAudit = async');
  const runEnd = auditHtml.indexOf('if (el.retryMeasurements)', runStart);
  const runBody = auditHtml.slice(runStart, runEnd);
  assert.match(auditHtml, /const API_BASE_URL = window\.location\.origin === REVIEW_ORIGIN/);
  assert.match(auditHtml, /nexusnova-audit-studio-review\.fahadsoomro123\.workers\.dev/);
  assert.match(auditHtml, /nexusnova-audit-studio\.fahadsoomro123\.workers\.dev/);
  assert.match(runBody, /apiFetch\('\/api\/audits'/);
  assert.doesNotMatch(runBody, /fetchPageContent\(|fetchPageSpeed\(/);
  assert.doesNotMatch(auditHtml, /seo-audit-studio-preview-mock\.js|api\/page-source|allorigins\.win|r\.jina\.ai/);
  assert.match(auditHtml, /const hasCompleteReportEvidence = \(report\) => Boolean/);
  assert.match(auditHtml, /if \(state\.report && !hasCompleteReportEvidence\(state\.report\)\)/);
  assert.match(auditHtml, /Full report unavailable · data required/);
  assert.match(auditHtml, /report\.overallScoreReason\s*\|\|/);
});

test('production audit requests have bounded waits and always release the loading UI', () => {
  assert.doesNotMatch(auditHtml, /seo-audit-studio-preview-mock\.js/);
  assert.match(auditHtml, /async function requestAuditSession\(callerSignal\)/);
  assert.match(auditHtml, /const timeoutMs = isReviewPreview \? 8000 : 20000/);
  assert.match(auditHtml, /const timeout = setTimeout\(\(\) => controller\.abort\(\), 240000\)/);
  assert.match(auditHtml, /payload\.ok!==true \|\| typeof payload\.auditId!=='string' \|\| !payload\.preview/);
  assert.match(auditHtml, /clearInterval\(state\.progressTimer\); state\.progressTimer = null;/);
  assert.match(auditHtml, /Voucher redemption is paused because required source measurements are missing/);
  assert.match(auditHtml, /if \(hasCompleteReportEvidence\(payload\.preview\)\)/);
  assert.doesNotMatch(auditHtml, /window\.setTimeout\(async\(\)=>\{\s*renderReport\(payload\.preview\)/);
});

test('Owner Console gives environment-specific guidance for rejected tokens', () => {
  const admin = fs.readFileSync(path.join(root, 'seo-audit-studio-admin.html'), 'utf8');
  assert.match(admin, /Review Owner token was rejected/);
  assert.match(admin, /latest successful review Worker run/);
  assert.match(admin, /review tokens are temporary and cannot access production/);
  assert.match(admin, /Production Owner token was rejected/);
  assert.match(admin, /Review access artifacts are not valid for production/);
  assert.match(admin, /const isReviewWorker=API===/);
});

test('production Owner Console is noindex and routes to the real production Worker', () => {
  const admin = fs.readFileSync(path.join(root, 'seo-audit-studio-admin.html'), 'utf8');
  assert.match(admin, /<meta name="robots" content="noindex,nofollow,noarchive">/);
  assert.match(admin, /const REVIEW_ORIGIN='https:\/\/review\.nexusnova-seo-audit-studio-review\.pages\.dev'/);
  assert.match(admin, /nexusnova-audit-studio-review\.fahadsoomro123\.workers\.dev/);
  assert.match(admin, /nexusnova-audit-studio\.fahadsoomro123\.workers\.dev/);
  assert.match(admin, /X-Owner-Admin-Token/);
  assert.match(admin, /Owner token was rejected/);
  assert.doesNotMatch(admin, /localStorage\.(?:setItem|getItem)\([^\n]*(?:token|secret)/i);
});

test('Owner Console clean and .html routes are both marked noindex and no-store', () => {
  const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
  assert.match(headers, /\/seo-audit-studio-admin\r?\n  X-Robots-Tag: noindex, nofollow, noarchive\r?\n  Cache-Control: no-store/);
  assert.match(headers, /\/seo-audit-studio-admin\.html\r?\n  X-Robots-Tag: noindex, nofollow, noarchive\r?\n  Cache-Control: no-store/);
});

test('Owner Console renders full audit reports as readable sections instead of a raw JSON code block', () => {
  const admin = fs.readFileSync(path.join(root, 'seo-audit-studio-admin.html'), 'utf8');
  assert.match(admin, /function renderAuditReport\(report,auditId\)/);
  assert.match(admin, /Category scores/);
  assert.match(admin, /Mobile and desktop performance/);
  assert.match(admin, /Prioritized recommendations/);
  assert.match(admin, /All audit checks/);
  assert.match(admin, /Website and measurement details/);
  assert.match(admin, /Download raw report JSON/);
  assert.match(admin, /report\.checks\)\?report\.checks\.filter\(item=>item\.category!=='Audit scoring'\)/);
  assert.match(admin, /const notApplicable=state==='not_applicable'/);
  assert.match(admin, /reportBadge\(notApplicable\?'Not applicable':reportLabel\(state\),state\)/);
  assert.match(admin, /status==='pass'\?'Guidance'/);
  assert.match(admin, /status==='info'\?'Interpretation \/ applicability'/);
  assert.match(admin, /PageSpeed opportunities/);
  assert.match(admin, /PageSpeed diagnostics/);
  assert.match(admin, /Source coverage/);
  assert.match(admin, /Category coverage/);
  assert.match(admin, /item\\.fix\\|\\|item\\.recommendation\\|\\|item\\.action/);
  assert.doesNotMatch(admin, /text\('pre',JSON\.stringify\(report,null,2\),'output'\)/);
});


test('SEO Audit Studio public page keeps only essential copy and has no prefilled sample URL', () => {
  assert.match(auditHtml, /id="urlInput"[^>]*placeholder="https:\/\/example\.com" aria-describedby="urlHelp"/);
  assert.doesNotMatch(auditHtml, /value="https:\/\/example\.com"/);
  assert.doesNotMatch(auditHtml, /id="seo-audit-faq"|Frequently Asked Questions/);
  const data = auditHtml.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/i);
  assert.ok(data, 'web application structured data must remain');
  const schema = JSON.parse(data[1]);
  assert.ok(schema['@graph'].some(node => node['@type'] === 'WebApplication'));
  assert.ok(!schema['@graph'].some(node => node['@type'] === 'FAQPage'), 'FAQ structured data must match removed visible FAQ');
  for (const copy of ['Unavailable checks stay unscored.', 'Free summary. Full report: $2.99 or valid voucher.', 'Unlocked only after server-side payment verification or a valid voucher.']) assert.ok(auditHtml.includes(copy), copy);
});


test('Fix Issues offers the one-time complimentary audit only after live verification and renders results safely', () => {
  const html = fs.readFileSync(path.join(root, 'seo-audit-studio.html'), 'utf8');
  assert.ok(html.includes('id="fixIssuesVerificationPanel"'));
  assert.ok(html.includes('id="fixIssuesVerificationBtn"'));
  assert.ok(html.includes("job.status === 'completed' && !isFixKit && verification.status === 'verified'"));
  assert.ok(html.includes("/verification-audit"));
  assert.ok(html.includes("['resolved', 'Resolved checks']"));
  assert.ok(html.includes("['remaining', 'Issues still present']"));
  assert.ok(html.includes("['newlyDetected', 'New findings']"));
  assert.ok(html.includes("['unverified', 'Could not be verified']"));
  assert.ok(html.includes("li.textContent = String(item.category || 'Check') + ': ' + String(item.title || 'Untitled finding')"));
  assert.ok(html.includes("Retry free verification audit"));
  assert.ok(html.includes('the server prevents duplicate bonus audits'));
});
