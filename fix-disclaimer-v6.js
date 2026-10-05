const fs=require('fs'),p='C:\\Users\\Fahad Hussain\\.copilot\\repos\\nexusnova-website\\disclaimer.html';
let t=fs.readFileSync(p,'utf8');
const desc="Read the official legal disclaimer for NexusNova Tools. Learn about our browser-local processing limits, terms of use, and liability terms.";
const re=/<meta\b(?=[^>]*\bname\s*=\s*"description")(?=[^>]*\bcontent\s*=\s*"[^"]*")[^>]*>/i;
const next='<meta name="description" content="'+desc+'">';
if(!re.test(t))throw new Error('description tag not found');
t=t.replace(re,next);
fs.writeFileSync(p,t,'utf8');
console.log('disclaimer.html | '+desc.length+' chars | REPAIRED EXACTLY');