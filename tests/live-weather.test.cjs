const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('weather parser extracts nearest forecast hour and next-24h range',async()=>{
  const moduleUrl=pathToFileURL(path.join(root,'.github/scripts/live_weather_core.mjs')).href;const {parseLocationForecast}=await import(moduleUrl);
  const payload={properties:{meta:{updated_at:'2026-09-02T06:00:00Z'},timeseries:[{time:'2026-09-02T07:00:00Z',data:{instant:{details:{air_temperature:30,relative_humidity:70,wind_speed:4}},next_1_hours:{summary:{symbol_code:'partlycloudy_day'},details:{precipitation_amount:.2}}}},{time:'2026-09-02T08:00:00Z',data:{instant:{details:{air_temperature:32,relative_humidity:65,wind_speed:5}},next_1_hours:{summary:{symbol_code:'clearsky_day'},details:{precipitation_amount:0}}}},{time:'2026-09-02T09:00:00Z',data:{instant:{details:{air_temperature:29,relative_humidity:72,wind_speed:3}},next_1_hours:{summary:{symbol_code:'rainshowers_day'},details:{precipitation_amount:1.1}}}}]}};
  const result=parseLocationForecast(payload,new Date('2026-09-02T07:15:00Z'));assert.equal(result.valid_at,'2026-09-02T08:00:00Z');assert.equal(result.temperature_c,32);assert.equal(result.condition,'Clear Sky');assert.deepEqual(result.next_24h,{low_c:29,high_c:32});
});

test('weather parser fails closed when core values are missing',async()=>{const moduleUrl=pathToFileURL(path.join(root,'.github/scripts/live_weather_core.mjs')).href;const {parseLocationForecast}=await import(moduleUrl);assert.throws(()=>parseLocationForecast({properties:{meta:{updated_at:'2026-09-02T06:00:00Z'},timeseries:[{time:'2026-09-02T08:00:00Z',data:{instant:{details:{air_temperature:30}}}},{time:'2026-09-02T09:00:00Z',data:{instant:{details:{air_temperature:31}}}}]}}),/missing core weather values/i)});

test('cached quick weather still reads local JSON while worldwide fetch is user-triggered',()=>{const client=read('assets/js/live-weather.js');assert.match(client,/assets\/data\/live-weather\.json/);assert.match(client,/data-world-weather-search/);assert.match(client,/addEventListener\('submit'/);assert.match(client,/nominatim\.openstreetmap\.org\/search/);assert.match(client,/api\.met\.no\/weatherapi\/locationforecast\/2\.0\/compact/)});

test('worldwide geocoding is manual with caching and no autocomplete network handler',()=>{const page=read('weather-live.html');const client=read('assets/js/live-weather.js');assert.match(page,/autocomplete="off"/);assert.match(page,/manual only/i);assert.match(client,/GEOCODE_TTL=30\*24\*60\*60\*1000/);assert.match(client,/lastGeocodeAt/);assert.doesNotMatch(client,/worldQuery\?\.addEventListener\(['"]input/)});

test('weather page exposes global satellite and honest regional radar',()=>{const page=read('weather-live.html');const client=read('assets/js/live-weather.js');assert.match(page,/Latest worldwide satellite imagery/i);assert.match(page,/No fake global radar/i);assert.match(client,/geosatellite\/1\.4/);assert.match(client,/radar_base_reflectivity/);assert.match(client,/radar\/2\.0/);assert.doesNotMatch(client,/rainviewer/i);assert.doesNotMatch(client,/windy/i)});

test('weather page preserves required attribution and model-forecast limitation',()=>{const page=read('weather-live.html');assert.match(page,/Data from MET Norway/i);assert.match(page,/OpenStreetMap contributors/i);assert.match(page,/model forecast/i);assert.match(page,/not an instrument reading/i);assert.match(page,/radar networks are regional/i)});

test('Pakistan and featured worldwide weather coordinates follow four-decimal cache guidance',async()=>{const moduleUrl=pathToFileURL(path.join(root,'.github/scripts/live_weather_core.mjs')).href;const {PAKISTAN_CITIES,WORLD_CITIES,ALL_CITIES}=await import(moduleUrl);assert.equal(PAKISTAN_CITIES.length,6);assert.equal(WORLD_CITIES.length,6);assert.equal(ALL_CITIES.length,12);for(const city of ALL_CITIES){assert.equal(Number(city.lat.toFixed(4)),city.lat);assert.equal(Number(city.lon.toFixed(4)),city.lon);assert.ok(city.country)}});
