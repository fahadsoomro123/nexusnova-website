const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'..','assets','js','auth-header-state.js'),'utf8');

test('account page resolves Firebase header even before auth marker exists',()=>{
  assert.match(source,/let shouldLoad=page==='account\.html';/);
  assert.match(source,/if\(!shouldLoad\)\{\s*try\{shouldLoad=localStorage\.getItem\(AUTH_MARKER\)==='1';/s);
});

test('public guest pages still retain auth-marker performance gate',()=>{
  assert.match(source,/if\(!shouldLoad\)return;/);
});
