const fs=require('fs'),p='C:\\Users\\Fahad Hussain\\.copilot\\repos\\nexusnova-website\\'+['human','proof','-pricing.html'].join('');
let t=fs.readFileSync(p,'utf8');
const ex='https://nexusnovatools.com/'+['human','proof','-pricing.html'].join('');
const tags=t.match(/<link\b[^>]*>/gi)||[]; for(const tag of tags){
if(/\brel\s*=\s*["'][^"']*\bcanonical\b[^"']*["']/i.test(tag)){
 const fixed=tag.replace(/\bhref\s*=\s*["'][^"']*["']/i,'href="'+ex+'"');
 fs.writeFileSync(p,t.replace(tag,fixed),'utf8'); console.log('REPAIRED: '+p); break;
}}