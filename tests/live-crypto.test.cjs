const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('crypto parser requires the five exact Coinranking featured assets',async()=>{
  const {FEATURED_COINS,parseCoinranking}=await import(pathToFileURL(path.join(root,'.github/scripts/live_crypto_core.mjs')).href);
  const coins=FEATURED_COINS.map((coin,index)=>({...coin,price:String(100+index),change:String(index-2),rank:index+1,marketCap:'1000','24hVolume':'100'}));
  const parsed=parseCoinranking({status:'success',data:{coins}});
  assert.deepEqual(parsed.map(row=>row.symbol),['BTC','ETH','BNB','SOL','XRP']);
  assert.equal(parsed[0].price_usd,100);
  assert.equal(parsed[4].change_24h_pct,2);
  assert.throws(()=>parseCoinranking({status:'success',data:{coins:coins.slice(1)}}),/Missing featured coin BTC/);
  assert.throws(()=>parseCoinranking({status:'success',data:{coins:coins.map(row=>row.symbol==='ETH'?{...row,price:'NaN'}:row)}}),/Invalid ETH price/);
});

test('optional PKR references derive only from validated cached USD/PKR data',async()=>{
  const {addPkrReference,readUsdPkrReference}=await import(pathToFileURL(path.join(root,'.github/scripts/live_crypto_core.mjs')).href);
  const ref=readUsdPkrReference({status:'ok',data_date:'2026-09-02',source:{name:'Frankfurter'},rates:[{code:'USD',rate:278.5}]});
  assert.equal(ref.rate,278.5);
  assert.equal(addPkrReference([{price_usd:2}],ref)[0].price_pkr,557);
  assert.equal(readUsdPkrReference({status:'pending',rates:[]}),null);
  assert.equal(addPkrReference([{price_usd:2}],null)[0].price_pkr,null);
});

test('crypto browser reads cached NexusNova JSON and never calls Coinranking directly',()=>{
  const client=read('assets/js/live-crypto.js');
  assert.match(client,/assets\/data\/live-crypto\.json/);
  assert.doesNotMatch(client,/api\.coinranking\.com/);
  assert.doesNotMatch(client,/x-access-token/i);
  assert.doesNotMatch(client,/COINRANKING_API_KEY/);
});

test('crypto page includes attribution freshness PKR method and financial limitation',()=>{
  const page=read('crypto-live.html');
  assert.match(page,/Data provided by Coinranking/i);
  assert.match(page,/30-minute schedule/i);
  assert.match(page,/USD crypto price × daily USD\/PKR reference/i);
  assert.match(page,/not investment, trading, tax or financial advice/i);
  assert.match(page,/not a second-by-second exchange feed/i);
});

test('crypto source key stays server-side and schedule remains inside free-plan call budget',()=>{
  const workflow=read('.github/workflows/update-live-crypto.yml');
  const updater=read('.github/scripts/update_live_crypto.mjs');
  assert.match(workflow,/COINRANKING_API_KEY: \$\{\{ secrets\.COINRANKING_API_KEY \}\}/);
  assert.match(workflow,/cron: '7,37 \* \* \* \*'/);
  assert.match(updater,/x-access-token/);
  assert.doesNotMatch(read('crypto-live.html'),/COINRANKING_API_KEY|x-access-token/);
});

test('crypto seed contract is fail-closed before server secret activation',()=>{
  const data=JSON.parse(read('assets/data/live-crypto.json'));
  assert.ok(['pending','ok'].includes(data.status));
  assert.equal(data.source.name,'Coinranking');
  assert.equal(data.source.attribution,'Data provided by Coinranking');
  if(data.status==='pending') assert.deepEqual(data.coins,[]);
});
