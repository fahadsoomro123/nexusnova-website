import fs from 'node:fs/promises';
import {parseEiaWeeklyUsRow} from './live_fuel_us_parser.mjs';

const OUT='assets/data/live-fuel-us.json';
const GASOLINE_URL='https://www.eia.gov/dnav/pet/pet_pri_gnd_a_epmr_pte_dpgal_w.htm';
const DIESEL_URL='https://www.eia.gov/dnav/pet/PET_PRI_GND_A_EPD2D_PTE_DPGAL_W.htm';

async function fetchHtml(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(url,{
      headers:{
        accept:'text/html,application/xhtml+xml',
        'user-agent':'NexusNova-LIVE/1.0 (+https://nexusnovatools.com/live.html)'
      },
      signal:controller.signal
    });
    if(!response.ok)throw new Error(`EIA fuel page returned HTTP ${response.status}`);
    const html=await response.text();
    if(!html||html.length<1000)throw new Error('EIA fuel page response is unexpectedly small');
    return html;
  }finally{
    clearTimeout(timer);
  }
}

const [gasolineHtml,dieselHtml]=await Promise.all([fetchHtml(GASOLINE_URL),fetchHtml(DIESEL_URL)]);
const gasoline=parseEiaWeeklyUsRow(gasolineHtml);
const diesel=parseEiaWeeklyUsRow(dieselHtml);
if(gasoline.data_date!==diesel.data_date){
  throw new Error(`EIA weekly dates do not match: gasoline ${gasoline.data_date}, diesel ${diesel.data_date}`);
}

const payload={
  schema_version:1,
  status:'ok',
  generated_at:new Date().toISOString(),
  data_date:gasoline.data_date,
  country:'US',
  source:{
    name:'U.S. Energy Information Administration (EIA)',
    url:'https://www.eia.gov/petroleum/gasdiesel/',
    gasoline_url:GASOLINE_URL,
    diesel_url:DIESEL_URL,
    method:'Official weekly U.S. national retail averages in dollars per gallon including taxes'
  },
  prices:{
    regular_gasoline:{
      product_name:'Regular Gasoline',
      ...gasoline
    },
    on_highway_diesel:{
      product_name:'On-Highway Diesel — All Types',
      ...diesel
    }
  },
  notice:'Weekly U.S. national averages including taxes. These are not pump quotes for a specific state, city or station.'
};

await fs.writeFile(OUT,`${JSON.stringify(payload,null,2)}\n`,'utf8');
console.log(`Wrote EIA U.S. weekly fuel averages for ${payload.data_date}: gasoline $${gasoline.usd_per_gallon}/gal, diesel $${diesel.usd_per_gallon}/gal.`);
