import fs from 'node:fs/promises';
import {PAKISTAN_CITIES,parseLocationForecast} from './live_weather_core.mjs';

const OUT='assets/data/live-weather.json';
const BASE='https://api.met.no/weatherapi/locationforecast/2.0/compact';
const USER_AGENT='NexusNova-LIVE/1.0 nexusnovatools.com nexusnovatools@gmail.com';

let previous={cities:[]};
try{previous=JSON.parse(await fs.readFile(OUT,'utf8'))}catch{}
const previousMap=new Map((previous.cities||[]).map(city=>[city.slug,city]));

async function fetchCity(city){
  const old=previousMap.get(city.slug);
  const headers={accept:'application/json','user-agent':USER_AGENT};
  if(old?.source_last_modified)headers['if-modified-since']=old.source_last_modified;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const url=`${BASE}?lat=${city.lat.toFixed(4)}&lon=${city.lon.toFixed(4)}`;
    const response=await fetch(url,{headers,signal:controller.signal});
    if(response.status===304){
      if(!old?.forecast)throw new Error(`${city.name}: source returned 304 but no cached forecast exists`);
      return {...old,source_status:'not_modified'};
    }
    if(!response.ok)throw new Error(`${city.name}: MET Norway returned HTTP ${response.status}`);
    const payload=await response.json();
    const forecast=parseLocationForecast(payload,new Date());
    return {
      slug:city.slug,
      name:city.name,
      country:'Pakistan',
      coordinates:{lat:city.lat,lon:city.lon},
      source_url:url,
      source_last_modified:response.headers.get('last-modified'),
      source_expires:response.headers.get('expires'),
      source_status:'fresh',
      forecast
    };
  }finally{clearTimeout(timer)}
}

const cities=[];
for(const city of PAKISTAN_CITIES)cities.push(await fetchCity(city));
const payload={
  schema_version:1,
  status:'ok',
  generated_at:new Date().toISOString(),
  source:{
    name:'MET Norway Locationforecast',
    url:'https://api.met.no/weatherapi/locationforecast/2.0/',
    license:'CC BY 4.0 / NLOD 2.0',
    attribution:'Data from MET Norway',
    method:'Cached model forecast for fixed Pakistan city coordinates; not an observed weather station feed'
  },
  cities
};
await fs.writeFile(OUT,`${JSON.stringify(payload,null,2)}\n`,'utf8');
console.log(`Wrote MET Norway model forecasts for ${cities.length} Pakistan cities.`);
