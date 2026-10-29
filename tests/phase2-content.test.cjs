'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const batch2Paths=[
 'articles/2026-us-federal-tax-brackets-explained.html',
 'articles/emergency-fund-for-irregular-income.html',
 'articles/small-business-break-even-point.html',
 'articles/profit-margin-vs-markup-small-business.html',
 'articles/credit-card-payoff-avalanche-vs-snowball.html',
 'articles/hourly-to-annual-salary-conversion-guide.html',
 'articles/mortgage-extra-payments-interest-savings.html'
];
const paths=[
 'articles/gross-to-net-paycheck-guide.html',
 'articles/quarterly-estimated-taxes-1099.html',
 'articles/freelance-invoice-payment-terms.html',
 'articles/freelance-cash-flow-budget.html',
 ...batch2Paths
];
const visibleBody=(h,p)=>{
 const m=h.match(/<article class="article-main">([\s\S]*?)<\/article>/);
 assert.ok(m,p+' needs a readable article body');
 return m[1].replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean);
};
test('Phase 2 article batches have indexable SEO foundations and contextual tool links',()=>{
 for(const p of paths){
  const h=fs.readFileSync(p,'utf8');
  assert.match(h,/<title>/,p+' needs a title');
  assert.match(h,/<meta name="description"/,p+' needs a description');
  assert.match(h,/<link rel="canonical"/,p+' needs a canonical');
  assert.match(h,/"@type":"Article"/,p+' needs Article JSON-LD');
  assert.doesNotMatch(h,/<meta name="robots" content="noindex/i,p+' must be indexable');
  const body=visibleBody(h,p);
  assert.ok((h.match(/<h2>/g)||[]).length>=5,p+' needs useful article structure');
  assert.ok((h.match(/<link rel="canonical"/g)||[]).length===1,p+' must have exactly one canonical');
  const article=h.match(/<article class="article-main">([\s\S]*?)<\/article>/)[1];
  assert.ok((article.match(/<a href="\.\.\/[^"]+\.html"/g)||[]).length>=3,p+' needs at least three contextual internal tool links');
  assert.ok(body.length>=300,p+' needs substantial visible content');
 }
});
test('Batch 2 articles each contain at least 500 words in the visible article body',()=>{
 for(const p of batch2Paths){
  const h=fs.readFileSync(p,'utf8');
  assert.ok(visibleBody(h,p).length>=500,p+' needs at least 500 visible body words');
 }
});
test('sitemap automation explains a Google Search Console 403 with the exact service account',()=> {
 const wf=fs.readFileSync('.github/workflows/google-sitemap-submit.yml','utf8');
 assert.match(wf,/response\.status_code == 403/);
 assert.match(wf,/info\.get\('client_email'/);
 assert.match(wf,/Service account to grant access/);
 assert.match(wf,/Users and permissions/);
 assert.match(wf,/Full user or Owner/);
 assert.match(wf,/GSC_PERMISSION_BLOCKED/);
 assert.match(wf,/will not claim a successful submission until the API accepts it/);
});
test('sitemap automation records both accepted sitemap submissions and failures in the workflow summary',()=> {
 const wf=fs.readFileSync('.github/workflows/google-sitemap-submit.yml','utf8');
 assert.match(wf,/GSC_SUBMISSION_ACCEPTED/);
 assert.match(wf,/GSC_SUBMISSION_FAILED/);
 assert.match(wf,/Accepted sitemap count:/);
 assert.match(wf,/Configured property: /);
 assert.match(wf,/GITHUB_STEP_SUMMARY/);
 assert.match(wf,/sitemap\.xml/);
 assert.match(wf,/sitemap-daily-tools\.xml/);
 assert.match(wf,/response\.status_code not in \(200, 204\)/);
 assert.match(wf,/for sitemap, status in accepted/);
 assert.match(wf,/does not guarantee that every URL will be indexed/i);
});
test('Phase 2 synchronization workflow exists and does not promise instant indexing',()=>{
 const wf=fs.readFileSync('.github/workflows/google-sitemap-submit.yml','utf8');
 const guide=fs.readFileSync('docs/google-search-console-indexing.md','utf8');
 const sync=fs.readFileSync('.github/scripts/sync_phase2_content.py','utf8');
 assert.match(wf,/sitemap\.xml/); assert.match(wf,/GSC_SERVICE_ACCOUNT_JSON/);
 assert.match(wf,/workflow_dispatch/);
 assert.match(guide,/does not guarantee one-second indexing/i); assert.match(guide,/Search Console Sitemap API/i);
 assert.match(sync,/\.glob\("\*\.html"\)/); assert.match(sync,/sitemap\.xml/); assert.match(sync,/NEXUSNOVA_EXPECTED_COUNTS/); assert.match(sync,/sitemap_records/); assert.match(sync,/page_url/);
});

test('homepage directly links all 19 reported URLs needing indexing attention',()=>{
 const home=fs.readFileSync('index.html','utf8');
 const sitemap=fs.readFileSync('sitemap.xml','utf8');
 const sitemapIndex=fs.readFileSync('sitemap-index.xml','utf8');
 const links=[
  'articles/capital-gains-cost-basis.html',
  'articles/cash-reserve-vs-credit-line.html',
  'articles/credit-card-payoff-avalanche-vs-snowball.html',
  'articles/currency-conversion-fees.html',
  'articles/electricity-fixed-charges-vs-usage-cost.html',
  'articles/freelance-cash-flow-budget.html',
  'articles/freelance-tax-reserve.html',
  'articles/generator-fuel-cost.html',
  'articles/gross-pay-vs-take-home-pay.html',
  'articles/overdraft-fee-opportunity-cost.html',
  'articles/paycheck-budget-allocation.html',
  'articles/percent-vs-percentage-point.html',
  'articles/portfolio-rebalancing-bands.html',
  'articles/profit-margin-vs-markup-small-business.html',
  'articles/quarterly-estimated-taxes-1099.html',
  'articles/solar-panel-payback-period.html',
  'articles/subscription-annual-cost.html',
  'articles/water-leak-bill-estimate.html',
  'pdf-tools.html'
 ];
 for(const path of links){
  assert.ok(home.includes('href="'+path+'"'),'homepage should directly link '+path);
  const url='https://nexusnovatools.com/'+path;
  assert.ok(sitemap.includes('<loc>'+url+'</loc>'),'sitemap should retain the page URL '+path);
 }
 assert.ok(sitemap.includes('<url><loc>https://nexusnovatools.com/</loc><lastmod>2026-10-29</lastmod></url>'),'homepage lastmod should reflect its updated internal links');
 assert.ok(sitemapIndex.includes('<lastmod>2026-10-29</lastmod>'),'sitemap index lastmod should reflect the updated sitemap');
});
