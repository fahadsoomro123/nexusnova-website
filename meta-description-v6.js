const fs=require('fs'),path=require('path');
const R='C:\\Users\\Fahad Hussain\\.copilot\\repos\\nexusnova-website';
const fixes={
'disclaimer.html':"Read the official legal disclaimer for NexusNova Tools. Learn about our browser-local processing limits, terms of use, and liability terms.",
'merge-pdf.html':"Merge multiple PDF files locally in your browser privately and securely. Fast client-side PDF document combination without remote server uploads.",
'minecraft-coordinate-converter.html':"Convert Minecraft Overworld and Nether coordinates instantly using the 8:1 ratio scaling matrix. Secure, local horizontal translation tool.",
'pakistan-tools.html':"Access localized digital utilities for Pakistan, including currency conversions, tax estimation context, and regional calendar metrics.",
'pomodoro-timer.html':"Use the free browser Pomodoro timer to enhance focus, block working intervals, track cycle parameters, and beat daily procrastination today.",
'whatsapp-link-generator.html':"Generate direct chat links with custom pre-filled message variables using the wa.me API structure. Quick utility for online businesses."
};
for(const [rel,desc] of Object.entries(fixes)){
 const f=path.join(R,rel),t=fs.readFileSync(f,'utf8'),headEnd=t.search(/<\/head>/i);
 if(headEnd<0)throw new Error('HEAD NOT FOUND: '+rel);
 const head=t.slice(0,headEnd);
 const re=/(<meta\b[^>]*name=["']description["'][^>]*content=["'])[^"']*(["'][^>]*>)/i;
 if(!re.test(head))throw new Error('DESCRIPTION NOT FOUND IN HEAD: '+rel);
 const out=head.replace(re,'$1'+desc+'$2')+t.slice(headEnd);
 fs.writeFileSync(f,out,'utf8');
 console.log(rel+' | '+desc.length+' chars | UPDATED');
}