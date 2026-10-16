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
test('Phase 2 synchronization workflow exists and does not promise instant indexing',()=>{
 const wf=fs.readFileSync('.github/workflows/google-sitemap-submit.yml','utf8');
 const guide=fs.readFileSync('docs/google-search-console-indexing.md','utf8');
 const sync=fs.readFileSync('.github/scripts/sync_phase2_content.py','utf8');
 assert.match(wf,/sitemap\.xml/); assert.match(wf,/GSC_SERVICE_ACCOUNT_JSON/);
 assert.match(wf,/workflow_dispatch/);
 assert.match(guide,/does not guarantee one-second indexing/i); assert.match(guide,/Search Console Sitemap API/i);
 assert.match(sync,/\.glob\("\*\.html"\)/); assert.match(sync,/sitemap\.xml/); assert.match(sync,/NEXUSNOVA_EXPECTED_COUNTS/);
});
