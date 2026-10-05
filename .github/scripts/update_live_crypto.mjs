import fs from 'node:fs/promises';
import {FEATURED_COINS,addPkrReference,parseCoinranking,readUsdPkrReference} from './live_crypto_core.mjs';

const KEY=process.env.COINRANKING_API_KEY||'';
const API='https://api.coinranking.com/v2/coins';
const OUT='assets/data/live-crypto.json';
const CURRENCY='assets/data/live-currency.json';

if(!KEY) throw new Error('COINRANKING_API_KEY is required server-side');

const params=new URLSearchParams({timePeriod:'24h',limit:String(FEATURED_COINS.length)});
for(const coin of FEATURED_COINS) params.append('uuids[]',coin.uuid);
const apiUrl=`${API}?${params.toString()}`;
const response=await fetch(apiUrl,{headers:{'x-access-token':KEY,'User-Agent':'NexusNova-LIVE/1.0 (+https://nexusnovatools.com/live.html)'}});
if(!response.ok) throw new Error(`Coinranking returned HTTP ${response.status}`);
const payload=await response.json();
const coins=parseCoinranking(payload);

let currencyData=null;
try{currencyData=JSON.parse(await fs.readFile(CURRENCY,'utf8'));}catch{}
const usdPkr=readUsdPkrReference(currencyData);
const enriched=addPkrReference(coins,usdPkr);

const output={
  schema_version:1,
  status:'ok',
  generated_at:new Date().toISOString(),
  freshness:'Scheduled NexusNova snapshot, refreshed every 30 minutes when the upstream API is available. Not an exchange execution quote.',
  source:{
    name:'Coinranking',
    url:'https://coinranking.com/',
    api_url:'https://api.coinranking.com/v2/coins',
    attribution:'Data provided by Coinranking'
  },
  quote_currency:'USD',
  time_period:'24h',
  usd_pkr_reference:usdPkr?{rate:usdPkr.rate,data_date:usdPkr.data_date,source:usdPkr.source,method:'Optional PKR display is derived from the cached NexusNova daily USD/PKR reference and is not a crypto exchange PKR execution price.'}:null,
  coins:enriched,
  notice:'Crypto prices are volatile and informational only. NexusNova does not provide investment, trading or financial advice.'
};
await fs.writeFile(OUT,JSON.stringify(output,null,2)+'\n');
console.log(`Wrote ${enriched.length} validated Coinranking crypto rows.`);
for(const row of enriched) console.log(`${row.symbol}: $${row.price_usd} (${row.change_24h_pct}% / 24h)`);
if(!usdPkr) console.warn('USD/PKR reference unavailable; PKR derived values were left null.');
