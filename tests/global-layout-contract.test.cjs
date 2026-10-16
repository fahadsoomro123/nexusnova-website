const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('shared browser entry points load the global shell guard',()=>{
 for(const file of ['assets/js/nn-inner-shell.js','assets/js/main.js','assets/js/site-main.js','assets/js/analytics.js','assets/js/related-tools.js']){
  assert.match(read(file),/global-shell-guard\.js/,'missing guard loader in '+file);
 }
});
test('global shell repairs navigation, search, footer, FAQ and related tools',()=>{
 const guard=read('assets/js/global-shell-guard.js');
 for(const marker of ['ensureHeader','ensureFooter','ensureToolFaq','bindSearch','ensureRelatedTools','data-nn-global-search-form','Frequently asked questions']){
  assert.ok(guard.includes(marker),'missing guard feature '+marker);
 }
});
test('108 indexed tool routes resolve to unique HTML files',()=>{
 const core=read('assets/js/search-core.js');
 const routes=[...core.matchAll(/\{\s*title:"((?:[^"\\]|\\.)*)",\s*url:"((?:[^"\\]|\\.)*)",\s*type:"tool"/g)].map(m=>m[2]);
 assert.equal(routes.length,108);
 assert.equal(new Set(routes).size,108);
 for(const route of routes)assert.ok(fs.existsSync(path.join(root,route.replace(/^\/+/,''))),'missing indexed tool route '+route);
});
test('sitemap synchronization rebuilds the article URL set',()=>{
 assert.match(read('.github/scripts/sync_phase2_content.py'),/Rebuild article URL entries/);
 assert.match(read('.github/scripts/validate_global_layout.py'),/expected/);
 assert.match(read('.github/scripts/validate_global_layout.py'),/actual/);
});
test('responsive fixes include light inputs and mobile single-column calculators',()=>{
 const css=read('assets/css/global-shell-repair.css');
 assert.match(css,/color-scheme:light/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/overflow-x:clip/);
 assert.match(css,/background:#fff!important/);
 assert.match(css,/data-result-state="error"/);
 assert.match(css,/data-result-state="success"/);
});

