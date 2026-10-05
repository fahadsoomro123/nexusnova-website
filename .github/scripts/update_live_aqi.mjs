import fs from 'node:fs/promises';
import {pm25Aqi,rollingMean,validateCommercialLicense} from './live_aqi_core.mjs';

const API='https://api.openaq.org/v3';
const KEY=process.env.OPENAQ_API_KEY||'';
const OUT='assets/data/live-aqi.json';
const LOCATIONS=[
  {city:'Karachi',id:6135472},
  {city:'Lahore',id:6125629},
  {city:'Islamabad',id:4568424},
  {city:'Rawalpindi',id:4554236},
  {city:'Peshawar',id:4608419}
];

if(!KEY) throw new Error('OPENAQ_API_KEY is required server-side');

async function api(path){
  const res=await fetch(`${API}${path}`,{headers:{'X-API-Key':KEY,'User-Agent':'NexusNova-LIVE/1.0 (+https://nexusnovatools.com/live.html)'}});
  if(!res.ok) throw new Error(`OpenAQ ${path} returned HTTP ${res.status}`);
  const body=await res.json();
  if(!Array.isArray(body?.results)) throw new Error(`OpenAQ ${path} returned an invalid payload`);
  return body.results;
}

function pm25Sensor(location){
  const sensors=Array.isArray(location?.sensors)?location.sensors:[];
  const matches=sensors.filter(sensor=>String(sensor?.parameter?.name||'').toLowerCase()==='pm25'&&String(sensor?.parameter?.units||'').toLowerCase().includes('g/m'));
  if(!matches.length) throw new Error(`No PM2.5 mass sensor at OpenAQ location ${location?.id}`);
  matches.sort((a,b)=>new Date(b?.datetimeLast?.utc||0)-new Date(a?.datetimeLast?.utc||0));
  return matches[0];
}

async function station(config){
  const [location]=await api(`/locations/${config.id}`);
  if(!location||location?.country?.code!=='PK') throw new Error(`Location ${config.id} is not a validated Pakistan location`);
  const licenseMeta=validateCommercialLicense(location.licenses);
  const sensor=pm25Sensor(location);
  const to=new Date();
  const from=new Date(to.getTime()-30*3600000);
  const qs=new URLSearchParams({datetime_from:from.toISOString(),datetime_to:to.toISOString(),limit:'100'});
  const hours=await api(`/sensors/${sensor.id}/hours?${qs}`);
  const rolling=rollingMean(hours,{now:to.getTime()});
  const index=pm25Aqi(rolling.mean);
  const license=licenseMeta.license||licenseMeta;
  return {
    city:config.city,
    location_id:location.id,
    station_name:location.name||config.city,
    locality:location.locality||config.city,
    coordinates:location.coordinates||null,
    provider:location.provider?.name||null,
    owner:location.owner?.name||null,
    instrument_type:location.isMonitor?'Reference/monitor location':'Air sensor location',
    pm25_rolling_24h_ug_m3:rolling.mean,
    coverage_hours:rolling.hours,
    latest_hour_at:rolling.latest_at,
    aqi_estimate:index.aqi,
    aqi_category:index.label,
    aqi_capped:index.capped,
    license:{name:license.name||'OpenAQ-listed licence',commercial_use_allowed:true,source_url:license.sourceUrl||license.source_url||null},
    openaq_url:`https://explore.openaq.org/locations/${location.id}`
  };
}

const results=[];
const failures=[];
for(const config of LOCATIONS){
  try{results.push(await station(config));}
  catch(error){failures.push({city:config.city,error:error.message});}
}
if(results.length<3) throw new Error(`Only ${results.length}/5 Pakistan AQI cities validated: ${JSON.stringify(failures)}`);

const output={
  schema_version:1,
  status:'ok',
  generated_at:new Date().toISOString(),
  method:'Rolling approximately 24-hour PM2.5 mean from OpenAQ hourly observations, converted to an informational AQI estimate using current U.S. EPA PM2.5 breakpoints. This is not an official government AQI.',
  source:{name:'OpenAQ',url:'https://openaq.org/',api_url:'https://api.openaq.org/v3/',attribution:'OpenAQ plus each original provider and OpenAQ-listed station licence'},
  standard:{name:'U.S. EPA PM2.5 AQI breakpoints',version:'2024-current',url:'https://aqs.epa.gov/aqsweb/documents/codetables/aqi_breakpoints.html'},
  cities:results,
  failures,
  notice:'Observed station/sensor PM2.5 can vary within a city. NexusNova AQI values are rolling PM2.5-based estimates, not official citywide AQI declarations.'
};
await fs.writeFile(OUT,JSON.stringify(output,null,2)+'\n');
console.log(`Wrote ${results.length} validated Pakistan AQI city rows; ${failures.length} unavailable.`);
for(const row of results) console.log(`${row.city}: AQI ${row.aqi_estimate} (${row.aqi_category}), PM2.5 ${row.pm25_rolling_24h_ug_m3} µg/m³, ${row.coverage_hours} hourly values.`);
if(failures.length) console.warn('Unavailable cities:',failures);
