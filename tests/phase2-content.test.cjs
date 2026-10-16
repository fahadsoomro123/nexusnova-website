'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const paths=[
 'articles/gross-to-net-paycheck-guide.html',
 'articles/quarterly-estimated-taxes-1099.html',
 'articles/freelance-invoice-payment-terms.html',
 'articles/freelance-cash-flow-budget.html'
];
test('Phase 2 articles have indexable SEO foundations and internal tool links',()=>{
 for(const p of paths){
  const h=fs.readFileSync(p,'utf8');
  assert.match(h,/<title>/); assert.match(h,/<meta name="description"/); assert.match(h,/<link rel="canonical"/);
  assert.match(h,/application\/ld\+json/); assert.doesNotMatch(h,/<meta name="robots" content="noindex/i);
  assert.ok((h.match(/<h2>/g)||[]).length>=5,p+' needs real article structure');
  assert.ok((h.match(/<a href="\.\.\/[^\"]+\.html"/g)||[]).length>=3,p+' needs contextual internal links');
  assert.ok(h.split(/\s+/).length>=500,p+' needs substantial visible content');
 }
});

test('Phase 2 synchronization workflow exists and does not promise instant indexing',()=>{
 const wf=fs.readFileSync('.github/workflows/google-sitemap-submit.yml','utf8');
 const guide=fs.readFileSync('docs/google-search-console-indexing.md','utf8');
 assert.match(wf,/sitemap\.xml/); assert.match(wf,/GSC_SERVICE_ACCOUNT_JSON/);
 assert.match(guide,/does not guarantee one-second indexing/i); assert.match(guide,/Search Console Sitemap API/i);
});
