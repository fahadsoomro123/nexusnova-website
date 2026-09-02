export const FEATURED_COINS=Object.freeze([
  {uuid:'Qwsogvtv82FCd',symbol:'BTC',name:'Bitcoin'},
  {uuid:'razxDUgYGNAdQ',symbol:'ETH',name:'Ethereum'},
  {uuid:'WcwrkfNI4FUAe',symbol:'BNB',name:'BNB'},
  {uuid:'zNZHO_Sjf',symbol:'SOL',name:'Solana'},
  {uuid:'-l8Mn2pVlRs-p',symbol:'XRP',name:'XRP'}
]);

const finiteNumber=(value,label)=>{
  const number=Number(value);
  if(!Number.isFinite(number)) throw new Error(`Invalid ${label}`);
  return number;
};

export function parseCoinranking(payload){
  if(payload?.status!=='success'||!Array.isArray(payload?.data?.coins)) throw new Error('Coinranking returned an invalid payload');
  const byUuid=new Map();
  for(const row of payload.data.coins){
    if(row?.uuid) byUuid.set(String(row.uuid),row);
  }
  return FEATURED_COINS.map(expected=>{
    const row=byUuid.get(expected.uuid);
    if(!row) throw new Error(`Missing featured coin ${expected.symbol}`);
    if(String(row.symbol||'').toUpperCase()!==expected.symbol) throw new Error(`Unexpected symbol for ${expected.symbol}`);
    const price=finiteNumber(row.price,`${expected.symbol} price`);
    const change=finiteNumber(row.change,`${expected.symbol} 24h change`);
    if(price<=0) throw new Error(`Invalid ${expected.symbol} price`);
    const rank=Number(row.rank);
    return {
      uuid:expected.uuid,
      symbol:expected.symbol,
      name:String(row.name||expected.name),
      price_usd:price,
      change_24h_pct:change,
      rank:Number.isFinite(rank)&&rank>0?rank:null,
      market_cap_usd:Number.isFinite(Number(row.marketCap))&&Number(row.marketCap)>=0?Number(row.marketCap):null,
      volume_24h_usd:Number.isFinite(Number(row['24hVolume']))&&Number(row['24hVolume'])>=0?Number(row['24hVolume']):null
    };
  });
}

export function readUsdPkrReference(currencyData){
  if(currencyData?.status!=='ok'||!Array.isArray(currencyData?.rates)) return null;
  const usd=currencyData.rates.find(row=>String(row?.code||'').toUpperCase()==='USD');
  const rate=Number(usd?.rate);
  if(!Number.isFinite(rate)||rate<=0) return null;
  return {rate,data_date:usd?.data_date||currencyData.data_date||null,source:currencyData?.source?.name||null};
}

export function addPkrReference(coins,usdPkr){
  if(!usdPkr) return coins.map(row=>({...row,price_pkr:null}));
  return coins.map(row=>({...row,price_pkr:Number((row.price_usd*usdPkr.rate).toFixed(4))}));
}
