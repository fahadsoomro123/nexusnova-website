export const PAKISTAN_REGION={minLat:23,maxLat:38,minLon:60,maxLon:78,label:'Approx. Pakistan region (23–38°N, 60–78°E)'};
const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const iso=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?null:d.toISOString();};

export function isPakistanRegion(lat,lon){
  return lat>=PAKISTAN_REGION.minLat&&lat<=PAKISTAN_REGION.maxLat&&lon>=PAKISTAN_REGION.minLon&&lon<=PAKISTAN_REGION.maxLon;
}

export function parseUSGSFeed(payload){
  if(payload?.type!=='FeatureCollection')throw new Error('USGS payload is not a FeatureCollection');
  const feedGenerated=iso(payload?.metadata?.generated);
  if(!feedGenerated)throw new Error('USGS payload is missing a valid generated timestamp');
  if(!Array.isArray(payload?.features))throw new Error('USGS payload has no features array');
  const events=payload.features.map(feature=>{
    const p=feature?.properties||{};
    const coords=feature?.geometry?.coordinates;
    const mag=finite(p.mag),lon=finite(coords?.[0]),lat=finite(coords?.[1]),depth=finite(coords?.[2]);
    const time=iso(p.time),updated=iso(p.updated);
    if(!feature?.id||mag===null||lat===null||lon===null||depth===null||!time||!updated)return null;
    return {
      id:String(feature.id),
      magnitude:mag,
      place:String(p.place||'Location not specified'),
      time,
      updated,
      depth_km:Number(depth.toFixed(1)),
      coordinates:{lat:Number(lat.toFixed(4)),lon:Number(lon.toFixed(4))},
      significance:finite(p.sig),
      felt:finite(p.felt),
      alert:p.alert||null,
      status:p.status||null,
      tsunami:p.tsunami===1,
      source_url:typeof p.url==='string'&&p.url.startsWith('https://earthquake.usgs.gov/')?p.url:null,
      pakistan_region:isPakistanRegion(lat,lon)
    };
  }).filter(Boolean).sort((a,b)=>new Date(b.time)-new Date(a.time));
  return {
    feed_generated_at:feedGenerated,
    feed_title:String(payload?.metadata?.title||'USGS M2.5+ Earthquakes, Past Day'),
    source_count:payload?.metadata?.count??events.length,
    events,
    pakistan_region_events:events.filter(event=>event.pakistan_region)
  };
}
