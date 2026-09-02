export const PAKISTAN_CITIES=[
  {slug:'karachi',name:'Karachi',lat:24.8607,lon:67.0011},
  {slug:'lahore',name:'Lahore',lat:31.5204,lon:74.3587},
  {slug:'islamabad',name:'Islamabad',lat:33.6844,lon:73.0479},
  {slug:'peshawar',name:'Peshawar',lat:34.0151,lon:71.5249},
  {slug:'quetta',name:'Quetta',lat:30.1798,lon:66.9750},
  {slug:'multan',name:'Multan',lat:30.1575,lon:71.5249}
];

const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const round=(value,digits=1)=>Number(Number(value).toFixed(digits));

const CONDITION_LABELS={
  clearsky:'Clear Sky',
  fair:'Fair',
  partlycloudy:'Partly Cloudy',
  cloudy:'Cloudy',
  fog:'Fog',
  lightrain:'Light Rain',
  rain:'Rain',
  heavyrain:'Heavy Rain',
  lightrainshowers:'Light Rain Showers',
  rainshowers:'Rain Showers',
  heavyrainshowers:'Heavy Rain Showers',
  lightsleet:'Light Sleet',
  sleet:'Sleet',
  heavysleet:'Heavy Sleet',
  lightsnow:'Light Snow',
  snow:'Snow',
  heavysnow:'Heavy Snow',
  lightsnowshowers:'Light Snow Showers',
  snowshowers:'Snow Showers',
  heavysnowshowers:'Heavy Snow Showers',
  rainandthunder:'Rain and Thunder',
  heavyrainandthunder:'Heavy Rain and Thunder',
  rainshowersandthunder:'Rain Showers and Thunder',
  heavyrainshowersandthunder:'Heavy Rain Showers and Thunder'
};

export function humanizeSymbol(code=''){
  const normalized=String(code).replace(/_(day|night|polartwilight)$/,'');
  if(CONDITION_LABELS[normalized])return CONDITION_LABELS[normalized];
  return normalized.replace(/_/g,' ').replace(/\b\w/g,char=>char.toUpperCase())||'Forecast';
}

export function parseLocationForecast(payload,now=new Date()){
  const updatedAt=payload?.properties?.meta?.updated_at;
  const timeseries=payload?.properties?.timeseries;
  if(!updatedAt||Number.isNaN(new Date(updatedAt).getTime()))throw new Error('MET Norway payload is missing a valid model timestamp');
  if(!Array.isArray(timeseries)||timeseries.length<2)throw new Error('MET Norway payload has no usable forecast series');

  const nowMs=now.getTime();
  let current=timeseries.find(item=>new Date(item?.time).getTime()>=nowMs);
  if(!current)current=timeseries[0];
  const validAt=new Date(current?.time);
  if(Number.isNaN(validAt.getTime()))throw new Error('Forecast point has invalid time');
  const instant=current?.data?.instant?.details||{};
  const temperature=finite(instant.air_temperature);
  const humidity=finite(instant.relative_humidity);
  const windSpeed=finite(instant.wind_speed);
  if(temperature===null||humidity===null||windSpeed===null)throw new Error('Forecast point is missing core weather values');

  const summary=current?.data?.next_1_hours?.summary||current?.data?.next_6_hours?.summary||{};
  const precipitation=finite(current?.data?.next_1_hours?.details?.precipitation_amount)??0;
  const startIndex=Math.max(0,timeseries.indexOf(current));
  const horizon=timeseries.slice(startIndex,startIndex+25);
  const temperatures=horizon.map(item=>finite(item?.data?.instant?.details?.air_temperature)).filter(value=>value!==null);
  if(!temperatures.length)throw new Error('Forecast horizon is missing temperatures');

  return {
    model_updated_at:updatedAt,
    valid_at:current.time,
    temperature_c:round(temperature,1),
    humidity_pct:round(humidity,0),
    wind_speed_ms:round(windSpeed,1),
    precipitation_next_hour_mm:round(precipitation,1),
    symbol_code:summary.symbol_code||null,
    condition:humanizeSymbol(summary.symbol_code),
    next_24h:{
      low_c:round(Math.min(...temperatures),1),
      high_c:round(Math.max(...temperatures),1)
    }
  };
}
