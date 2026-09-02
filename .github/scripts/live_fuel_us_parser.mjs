function cleanHtml(html=''){
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&quot;/gi,'"')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function toIsoDate(value){
  const match=String(value).match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if(!match)throw new Error(`Invalid EIA weekly date: ${value}`);
  return `${2000+Number(match[3])}-${match[1]}-${match[2]}`;
}

export function parseEiaWeeklyUsRow(html){
  const text=cleanHtml(html);
  if(!/Weekly Retail Gasoline and Diesel Prices/i.test(text)){
    throw new Error('EIA weekly fuel table marker not found');
  }
  const showIndex=text.search(/Show Data By:/i);
  if(showIndex<0)throw new Error('EIA Show Data By marker not found');
  const tableText=text.slice(showIndex);
  const usMatch=/\bU\.S\.\b/i.exec(tableText);
  if(!usMatch)throw new Error('EIA U.S. national row not found');

  const header=tableText.slice(0,usMatch.index);
  const dates=[...header.matchAll(/\b(\d{2}\/\d{2}\/\d{2})\b/g)].map(match=>match[1]);
  if(dates.length<2)throw new Error('EIA weekly dates not found');

  const afterUs=tableText.slice(usMatch.index+usMatch[0].length);
  const eastIndex=afterUs.search(/\bEast Coast\b/i);
  if(eastIndex<0)throw new Error('EIA East Coast row boundary not found');
  const usRow=afterUs.slice(0,eastIndex);
  const values=[...usRow.matchAll(/\b(\d+\.\d{3})\b/g)].map(match=>Number(match[1]));
  if(values.length<dates.length){
    throw new Error(`EIA U.S. row has ${values.length} values for ${dates.length} dates`);
  }

  const latest=values.at(-1);
  const previous=values.at(-2);
  if(!Number.isFinite(latest)||latest<=0||latest>20)throw new Error('Invalid latest EIA U.S. fuel value');
  if(!Number.isFinite(previous)||previous<=0||previous>20)throw new Error('Invalid previous EIA U.S. fuel value');

  return {
    data_date:toIsoDate(dates.at(-1)),
    usd_per_gallon:Number(latest.toFixed(3)),
    previous_usd_per_gallon:Number(previous.toFixed(3)),
    change_usd_per_gallon:Number((latest-previous).toFixed(3))
  };
}
