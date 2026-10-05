const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('EPA 2024 PM2.5 breakpoint math stays deterministic',async()=>{
  const {pm25Aqi}=await import(pathToFileURL(path.join(root,'.github/scripts/live_aqi_core.mjs')).href);
  assert.deepEqual(pm25Aqi(9.0),{aqi:50,label:'Good',concentration:9,capped:false});
  assert.equal(pm25Aqi(9.1).aqi,51);
  assert.equal(pm25Aqi(35.4).aqi,100);
  assert.equal(pm25Aqi(35.5).aqi,101);
  assert.equal(pm25Aqi(225.5).aqi,301);
  assert.equal(pm25Aqi(400).aqi,500);
  assert.throws(()=>pm25Aqi(-1),/Invalid PM2\.5/);
});

test('rolling PM2.5 mean requires enough recent hourly coverage',async()=>{
  const {rollingMean}=await import(pathToFileURL(path.join(root,'.github/scripts/live_aqi_core.mjs')).href);
  const now=new Date('2026-09-02T10:00:00Z');
  const hours=Array.from({length:24},(_,i)=>({value:10+i,period:{datetimeTo:{utc:new Date(now.getTime()-(23-i)*3600000).toISOString()}}}));
  const result=rollingMean(hours,{now:now.getTime()});
  assert.equal(result.hours,24);
  assert.equal(result.mean,21.5);
  assert.throws(()=>rollingMean(hours.slice(0,12),{now:now.getTime()}),/Insufficient hourly coverage/);
});

test('AQI publisher requires explicit commercial-use station licensing',async()=>{
  const {validateCommercialLicense}=await import(pathToFileURL(path.join(root,'.github/scripts/live_aqi_core.mjs')).href);
  assert.ok(validateCommercialLicense([{license:{name:'CC BY 4.0',commercialUseAllowed:true}}]));
  assert.throws(()=>validateCommercialLicense([{license:{name:'NC',commercialUseAllowed:false}}]),/commercial-use license/);
});

test('AQI browser reads cached NexusNova JSON and never calls OpenAQ directly',()=>{
  const client=read('assets/js/live-aqi.js');
  assert.match(client,/assets\/data\/live-aqi\.json/);
  assert.doesNotMatch(client,/api\.openaq\.org/);
  assert.doesNotMatch(client,/X-API-Key/);
});

test('AQI page states estimate source coverage and health limitations',()=>{
  const page=read('aqi-live.html');
  assert.match(page,/OpenAQ/i);
  assert.match(page,/not an official Pakistan citywide AQI declaration/i);
  assert.match(page,/at least 18 valid hourly values/i);
  assert.match(page,/commercial use/i);
  assert.match(page,/Health and decision limitation/i);
});

test('AQI seed contract is fail-closed before server secret activation',()=>{
  const data=JSON.parse(read('assets/data/live-aqi.json'));
  assert.ok(['pending','ok'].includes(data.status));
  assert.equal(data.source.name,'OpenAQ');
  if(data.status==='pending') assert.deepEqual(data.cities,[]);
});
