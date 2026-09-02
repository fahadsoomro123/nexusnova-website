import fs from 'node:fs/promises';

const OUT='assets/data/live-gold.json';
const FX='assets/data/live-currency.json';
const GOLD_URL='https://api.gold-api.com/price/XAU';
const TROY_OUNCE_GRAMS=31.1034768;
const TOLA_GRAMS=11.6638038;

const round=(value,digits=6)=>Number(value.toFixed(digits));

async function fetchJson(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(url,{headers:{'accept':'application/json','user-agent':'NexusNova-LIVE/1.0 (+https://nexusnovatools.com/live.html)'},signal:controller.signal});
    if(!response.ok)throw new Error(`${url} returned HTTP ${response.status}`);
    return await response.json();
  }finally{clearTimeout(timer)}
}

const fxData=JSON.parse(await fs.readFile(FX,'utf8'));
if(fxData?.status!=='ok'||!Array.isArray(fxData.rates))throw new Error('Published currency dataset is not ready');
const usd=fxData.rates.find(item=>item.code==='USD');
const usdPkr=Number(usd?.rate);
if(!Number.isFinite(usdPkr)||usdPkr<=0)throw new Error('USD/PKR reference rate is missing or invalid');

const gold=await fetchJson(GOLD_URL);
const xauUsd=Number(gold?.price);
if(gold?.symbol!=='XAU'||!Number.isFinite(xauUsd)||xauUsd<=0)throw new Error('Gold API returned invalid XAU data');
const upstreamUpdatedAt=gold?.updatedAt;
if(!upstreamUpdatedAt||Number.isNaN(new Date(upstreamUpdatedAt).getTime()))throw new Error('Gold API returned an invalid updatedAt timestamp');

const pkrPerGram=(xauUsd*usdPkr)/TROY_OUNCE_GRAMS;
const pkrPerTola=pkrPerGram*TOLA_GRAMS;
const pkrPer10g=pkrPerGram*10;
const payload={
  schema_version:1,
  status:'ok',
  generated_at:new Date().toISOString(),
  source:{
    name:'Gold API',
    url:'https://gold-api.com/',
    api_url:GOLD_URL,
    method:'Current XAU/USD reference price fetched by the NexusNova publishing workflow; PKR values are calculated using the published NexusNova USD/PKR daily reference rate'
  },
  xau:{
    symbol:'XAU',
    quote_currency:'USD',
    usd_per_troy_ounce:round(xauUsd,6),
    updated_at:upstreamUpdatedAt
  },
  fx:{
    pair:'USD/PKR',
    usd_pkr:round(usdPkr,6),
    data_date:fxData.data_date||usd?.data_date||null,
    source:fxData.source?.name||'Frankfurter'
  },
  international_derived_pkr:{
    basis:'International XAU/USD converted using published USD/PKR reference; not a Pakistan Sarafa board quote',
    per_tola_24k:round(pkrPerTola,2),
    per_10g_24k:round(pkrPer10g,2),
    per_gram_24k:round(pkrPerGram,2),
    per_tola_22k:round(pkrPerTola*(22/24),2),
    tola_grams:TOLA_GRAMS,
    troy_ounce_grams:TROY_OUNCE_GRAMS
  },
  local_sarafa:{
    status:'not_published',
    message:'Pakistan local Sarafa board rates are intentionally not inferred from international spot data. A verified local source is still under review.'
  }
};
await fs.writeFile(OUT,`${JSON.stringify(payload,null,2)}\n`,'utf8');
console.log(`Wrote XAU/USD ${payload.xau.usd_per_troy_ounce} with international-derived PKR references.`);
