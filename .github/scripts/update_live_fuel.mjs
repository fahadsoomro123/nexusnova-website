import fs from 'node:fs/promises';
import {parsePsoFuelPrices} from './live_fuel_parser.mjs';

const OUT='assets/data/live-fuel.json';
const SOURCE_URL='https://psopk.com/index.php/en/fuels/fuel-prices';

const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),20000);
let html;
try{
  const response=await fetch(SOURCE_URL,{headers:{'accept':'text/html,application/xhtml+xml','user-agent':'NexusNova-LIVE/1.0 (+https://nexusnovatools.com/live.html)'},signal:controller.signal});
  if(!response.ok)throw new Error(`PSO fuel page returned HTTP ${response.status}`);
  html=await response.text();
}finally{clearTimeout(timer)}

if(!html||html.length<1000)throw new Error('PSO fuel page response is unexpectedly small');
const parsed=parsePsoFuelPrices(html);
const payload={
  schema_version:1,
  status:'ok',
  generated_at:new Date().toISOString(),
  effective_date:parsed.effective_date,
  source:{
    name:'Pakistan State Oil (PSO)',
    url:SOURCE_URL,
    method:'Official PSO published POL retail reference rates; NexusNova validates the effective date plus Premier Euro 5 and Hi-Cetane Diesel Euro 5 in the same source block'
  },
  prices:{
    petrol:{
      product_name:'PREMIER EURO 5',
      pkr_per_litre:parsed.petrol_pkr_per_litre
    },
    diesel:{
      product_name:'HI-CETANE DIESEL EURO 5',
      pkr_per_litre:parsed.diesel_pkr_per_litre
    }
  },
  notice:'PSO states that applicable freight charges can affect final selling prices at retail outlets. These are published reference rates, not a promise of an identical pump price at every location.'
};
await fs.writeFile(OUT,`${JSON.stringify(payload,null,2)}\n`,'utf8');
console.log(`Wrote PSO fuel references effective ${payload.effective_date}: petrol ${payload.prices.petrol.pkr_per_litre}, diesel ${payload.prices.diesel.pkr_per_litre}.`);
