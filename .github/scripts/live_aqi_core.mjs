export const PM25_BREAKPOINTS=[
  {cLo:0.0,cHi:9.0,iLo:0,iHi:50,label:'Good'},
  {cLo:9.1,cHi:35.4,iLo:51,iHi:100,label:'Moderate'},
  {cLo:35.5,cHi:55.4,iLo:101,iHi:150,label:'Unhealthy for Sensitive Groups'},
  {cLo:55.5,cHi:125.4,iLo:151,iHi:200,label:'Unhealthy'},
  {cLo:125.5,cHi:225.4,iLo:201,iHi:300,label:'Very Unhealthy'},
  {cLo:225.5,cHi:325.4,iLo:301,iHi:500,label:'Hazardous'}
];

export function pm25Aqi(concentration){
  const c=Number(concentration);
  if(!Number.isFinite(c)||c<0) throw new Error('Invalid PM2.5 concentration');
  const truncated=Math.floor(c*10)/10;
  const bp=PM25_BREAKPOINTS.find(row=>truncated>=row.cLo&&truncated<=row.cHi);
  if(!bp){
    if(truncated>325.4) return {aqi:500,label:'Hazardous',concentration:truncated,capped:true};
    throw new Error('PM2.5 concentration falls into an unsupported breakpoint gap');
  }
  const aqi=Math.round(((bp.iHi-bp.iLo)/(bp.cHi-bp.cLo))*(truncated-bp.cLo)+bp.iLo);
  return {aqi,label:bp.label,concentration:truncated,capped:false};
}

export function rollingMean(hours,{minimumHours=18,maxAgeHours=6,now=Date.now()}={}){
  if(!Array.isArray(hours)) throw new Error('Hourly measurements must be an array');
  const valid=hours.map(item=>({value:Number(item?.value),time:new Date(item?.period?.datetimeTo?.utc||item?.datetime?.utc||item?.datetimeTo?.utc||item?.time)}))
    .filter(item=>Number.isFinite(item.value)&&item.value>=0&&!Number.isNaN(item.time.getTime()))
    .sort((a,b)=>a.time-b.time);
  if(valid.length<minimumHours) throw new Error(`Insufficient hourly coverage: ${valid.length}/${minimumHours}`);
  const latest=valid.at(-1);
  if(now-latest.time.getTime()>maxAgeHours*3600000) throw new Error('Latest PM2.5 hour is stale');
  const windowStart=latest.time.getTime()-23*3600000;
  const window=valid.filter(item=>item.time.getTime()>=windowStart);
  if(window.length<minimumHours) throw new Error(`Insufficient rolling-24h coverage: ${window.length}/${minimumHours}`);
  const mean=window.reduce((sum,item)=>sum+item.value,0)/window.length;
  return {mean:Number(mean.toFixed(2)),hours:window.length,latest_at:latest.time.toISOString()};
}

export function validateCommercialLicense(licenses){
  if(!Array.isArray(licenses)||!licenses.length) throw new Error('Location license metadata missing');
  const allowed=licenses.find(item=>item?.license?.commercialUseAllowed===true||item?.commercialUseAllowed===true);
  if(!allowed) throw new Error('No explicit commercial-use license found for location');
  return allowed;
}
