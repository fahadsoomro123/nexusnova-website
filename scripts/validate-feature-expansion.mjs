import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), stamp='20261015-worldclass1', failures=[];
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const search=read('assets/js/search-core.js');
const rows=[...search.matchAll(/\{ title:"([^"]+)", url:"([^"]+)", type:"([^"]+)"/g)].map(m=>({title:m[1],url:m[2],type:m[3]}));
const toolRows=rows.filter(r=>r.type==='tool'),guideRows=rows.filter(r=>r.type==='guide');
if(toolRows.length!==97)failures.push('Expected 97 tool records; got '+toolRows.length);
if(guideRows.length!==14)failures.push('Expected 14 guide records; got '+guideRows.length);
const home=read('index.html'),dir=read('tools.html'),sitemap=read('sitemap.xml');
if(!home.includes('97 Free Browser Tools')||!home.includes('id="group-creator-work"'))failures.push('Homepage title/discovery group missing');
if(!dir.includes('id="directory-search-count">97 tools')||!dir.includes('group-creator-work'))failures.push('Directory count/group missing');
const assetPattern=/(?:href|src)=["']((?:\/|\.\.\/)*assets\/[^"']+\.(?:css|js)(?:\?[^"']*)?)["']/gi;
for(const record of toolRows){
  const file=record.url;
  if(!fs.existsSync(path.join(root,file))){failures.push('Missing tool page '+file);continue;}
  const html=read(file);
  const refs=[...html.matchAll(assetPattern)].map(m=>m[1]);
  if(!refs.length)failures.push(file+': no local CSS/JS references found');
  for(const asset of refs)if(!asset.includes('build='+stamp))failures.push(file+': missing build token on '+asset);
}
const newTools=['ai-prompt-enhancer.html','tiktok-reel-hook-generator.html','freelance-rate-calculator.html','crypto-tax-estimator.html','privacy-policy-terms-generator.html'];
for(const file of newTools){
  const html=read(file);
  const title=(html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1]||'').replace(/<[^>]+>/g,'').trim();if(title.length>70)failures.push(file+': title too long ('+title.length+' chars)');
  if(!html.includes('"@type":"WebApplication"'))failures.push(file+': missing WebApplication schema');
  if(!html.includes('"@type":"FAQPage"'))failures.push(file+': missing FAQPage schema');
  if(!html.includes('data-feature-tool='))failures.push(file+': missing working-tool form contract');
  if(!sitemap.includes('<loc>https://nexusnovatools.com/'+file+'</loc>'))failures.push('Sitemap missing '+file);
}
const newGuides=['ai-prompting-midjourney-sora','short-form-video-hooks','freelance-project-pricing','crypto-tax-recordkeeping-us-uk','privacy-and-terms-checklist-for-apps'].map(x=>'guides/'+x+'.html');
for(const file of newGuides){
  if(!fs.existsSync(path.join(root,file))){failures.push('Missing guide '+file);continue;}
  const html=read(file);
  const title=(html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1]||'').replace(/<[^>]+>/g,'').trim();if(title.length>70)failures.push(file+': title too long ('+title.length+' chars)');
  const plain=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,' ').replace(/\s+/g,' ');
  const words=(plain.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)||[]).length;
  if(words<1200)failures.push(file+': expected 1200 visible words, found '+words);
  if(!/https:\/\/(?:www\.)?(?:irs\.gov|gov\.uk|ftc\.gov|ads\.tiktok\.com|docs\.midjourney\.com|help\.openai\.com|upwork\.com)/i.test(html))failures.push(file+': missing primary-source link');
  if(!html.includes('rel="canonical"'))failures.push(file+': missing canonical');
  if(!sitemap.includes('<loc>https://nexusnovatools.com/'+file+'</loc>'))failures.push('Sitemap missing '+file);
}
if(!sitemap.includes('<loc>https://nexusnovatools.com/guides/index.html</loc>'))failures.push('Sitemap missing canonical /guides/index.html hub');
const sitemapUrls=[...sitemap.matchAll(/<loc>/g)].length;
if(sitemapUrls!==149)failures.push('Expected 149 sitemap URLs; found '+sitemapUrls);
const guideCounts=newGuides.map(file=>{const html=read(file);const plain=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,' ').replace(/\s+/g,' ');return {path:file,words:(plain.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)||[]).length}});
console.log(JSON.stringify({toolRecords:toolRows.length,guideRecords:guideRows.length,cacheBustStamp:stamp,sitemapUrls,guideWordCounts:guideCounts,failures},null,2));
if(failures.length)process.exit(1);
