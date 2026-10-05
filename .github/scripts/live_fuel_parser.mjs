const MONTHS={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};

function decode(text){
  return text
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>');
}

export function htmlToText(html){
  return decode(String(html||''))
    .replace(/<!--[\s\S]*?-->/g,' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<(?:br|\/p|\/div|\/li|\/tr|\/td|\/th|\/h[1-6])\b[^>]*>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/[ \t]+/g,' ')
    .replace(/\n\s*\n+/g,'\n')
    .trim();
}

function parseDate(raw){
  const value=raw.trim();
  let match=value.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/);
  if(match){
    const month=MONTHS[match[1].slice(0,3).toLowerCase()];
    if(month===undefined)return null;
    const date=new Date(Date.UTC(Number(match[3]),month,Number(match[2])));
    if(Number.isNaN(date.getTime()))return null;
    return date.toISOString().slice(0,10);
  }
  match=value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(match){
    const date=new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime())?null:value;
  }
  return null;
}

function priceFrom(block,label){
  const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const patterns=[
    new RegExp(`${escaped}\\s*(?:\\||:)?\\s*Rs\\.?\\s*([0-9][0-9,.]*)\\s*(?:\\/\\s*)?Ltr`,'i'),
    new RegExp(`${escaped}\\s*(?:\\||:)?\\s*([0-9][0-9,.]*)\\s*(?:Rs\\.?\\s*)?(?:\\/\\s*)?Ltr`,'i')
  ];
  for(const pattern of patterns){
    const match=block.match(pattern);
    if(!match)continue;
    const value=Number(match[1].replace(/,/g,''));
    if(Number.isFinite(value)&&value>=50&&value<=1000)return value;
  }
  return null;
}

export function parsePsoFuelPrices(html){
  const text=htmlToText(html);
  const marker=/Effective From:\s*([^\n]{4,40})/gi;
  const hits=[];
  let match;
  while((match=marker.exec(text))){
    hits.push({index:match.index,dateRaw:match[1].trim()});
  }
  if(!hits.length)throw new Error('No PSO effective-date blocks found');

  const candidates=[];
  for(let i=0;i<hits.length;i++){
    const start=hits[i].index;
    const end=i+1<hits.length?hits[i+1].index:Math.min(text.length,start+5000);
    const block=text.slice(start,end);
    const effectiveDate=parseDate(hits[i].dateRaw);
    const petrol=priceFrom(block,'PREMIER EURO 5');
    const diesel=priceFrom(block,'HI-CETANE DIESEL EURO 5');
    if(!effectiveDate||petrol===null||diesel===null)continue;
    candidates.push({effective_date:effectiveDate,petrol_pkr_per_litre:petrol,diesel_pkr_per_litre:diesel});
  }

  if(!candidates.length)throw new Error('No validated PSO POL block with petrol and diesel found');
  candidates.sort((a,b)=>b.effective_date.localeCompare(a.effective_date));
  const latest=candidates[0];
  const duplicate=candidates.find((item,index)=>index>0&&item.effective_date===latest.effective_date&&(item.petrol_pkr_per_litre!==latest.petrol_pkr_per_litre||item.diesel_pkr_per_litre!==latest.diesel_pkr_per_litre));
  if(duplicate)throw new Error('Conflicting PSO values found for the latest effective date');
  return latest;
}
