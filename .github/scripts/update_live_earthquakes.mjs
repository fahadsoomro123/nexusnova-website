import fs from 'node:fs/promises';
import {parseUSGSFeed,PAKISTAN_REGION} from './live_earthquakes_core.mjs';

const SOURCE_URL='https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
const OUTPUT='assets/data/live-earthquakes.json';
const response=await fetch(SOURCE_URL,{headers:{Accept:'application/geo+json, application/json','User-Agent':'NexusNovaTools/1.0 (+https://nexusnovatools.com/)'}});
if(!response.ok)throw new Error(`USGS earthquake feed failed with HTTP ${response.status}`);
const parsed=parseUSGSFeed(await response.json());
const output={
  schema_version:1,
  status:'ok',
  generated_at:new Date().toISOString(),
  source:{
    name:'U.S. Geological Survey (USGS)',
    url:SOURCE_URL,
    attribution:'Earthquake data courtesy of the U.S. Geological Survey',
    feed_scope:'Magnitude 2.5+ earthquakes, past 24 hours',
    feed_refresh_note:'USGS says this GeoJSON summary feed is updated every minute; NexusNova publishes a cached snapshot on its own schedule.'
  },
  pakistan_region:PAKISTAN_REGION,
  feed_generated_at:parsed.feed_generated_at,
  feed_title:parsed.feed_title,
  source_count:parsed.source_count,
  pakistan_region_events:parsed.pakistan_region_events,
  worldwide_events:parsed.events.slice(0,80)
};
await fs.writeFile(OUTPUT,JSON.stringify(output,null,2)+'\n','utf8');
console.log(`Wrote ${output.worldwide_events.length} recent USGS events; ${output.pakistan_region_events.length} in the Pakistan-region box.`);
