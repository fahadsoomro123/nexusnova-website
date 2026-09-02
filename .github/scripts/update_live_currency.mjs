import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

export const CODES=['USD','GBP','EUR','AED','SAR'];
export const ENDPOINT='https://api.frankfurter.dev/v2/rates?base=PKR&quotes=USD,GBP,EUR,AED,SAR';

export function invertPkrQuotes(rows, previous={rates:[]}){
  if(!Array.isArray(rows))throw new Error('Frankfurter response must be an array.');
  const previousByCode=new Map((previous.rates||[]).map(item=>[item.code,item]));
  const seen=new Map();
  for(const row of rows){
    if(!row||row.base!=='PKR'||!CODES.includes(row.quote))continue;
    const quote=Number(row.rate);
    if(!Number.isFinite(quote)||quote<=0)throw new Error(`Invalid PKR/${row.quote} quote.`);
    seen.set(row.quote,{date:row.date,rate:1/quote});
  }
  for(const code of CODES)if(!seen.has(code))throw new Error(`Missing PKR/${code} quote.`);

  return CODES.map(code=>{
    const current=seen.get(code);
    const old=previousByCode.get(code);
    let previousRate=null;
    let changePct=null;
    if(old&&old.data_date===current.date){
      previousRate=Number.isFinite(old.previous_rate)?old.previous_rate:null;
      changePct=Number.isFinite(old.change_pct)?old.change_pct:null;
    }else if(old&&Number.isFinite(old.rate)&&old.rate>0){
      previousRate=old.rate;
      changePct=((current.rate-old.rate)/old.rate)*100;
    }
    return {
      code,
      rate:Number(current.rate.toFixed(6)),
      data_date:current.date,
      previous_rate:previousRate===null?null:Number(previousRate.toFixed(6)),
      change_pct:changePct===null?null:Number(changePct.toFixed(4))
    };
  });
}

export function buildPayload(rows, previous={}){
  const rates=invertPkrQuotes(rows,previous);
  const dates=[...new Set(rates.map(item=>item.data_date).filter(Boolean))].sort();
  if(!dates.length)throw new Error('No source date supplied by Frankfurter.');
  return {
    schema_version:1,
    status:'ok',
    generated_at:new Date().toISOString(),
    data_date:dates.at(-1),
    quote_currency:'PKR',
    source:{
      name:'Frankfurter',
      url:'https://frankfurter.dev/',
      api_url:ENDPOINT,
      method:'Daily reference exchange rates aggregated from central banks and official sources'
    },
    rates
  };
}

export async function main(){
  const scriptPath=fileURLToPath(import.meta.url);
  const repoRoot=path.resolve(path.dirname(scriptPath),'../..');
  const outputPath=path.join(repoRoot,'assets/data/live-currency.json');
  let previous={rates:[]};
  try{previous=JSON.parse(await readFile(outputPath,'utf8'))}catch{}
  const response=await fetch(ENDPOINT,{headers:{Accept:'application/json','User-Agent':'NexusNovaTools-LiveData/1.0'}});
  if(!response.ok)throw new Error(`Frankfurter HTTP ${response.status}`);
  const rows=await response.json();
  const payload=buildPayload(rows,previous);
  await writeFile(outputPath,JSON.stringify(payload,null,2)+'\n','utf8');
  console.log(`Wrote ${payload.rates.length} PKR reference rates for ${payload.data_date}.`);
}

const invoked=process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href;
if(invoked)main().catch(error=>{console.error(error);process.exitCode=1});
