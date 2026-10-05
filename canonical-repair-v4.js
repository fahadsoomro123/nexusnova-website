const fs=require('fs'),path=require('path');
const R='C:\\Users\\Fahad Hussain\\.copilot\\repos\\nexusnova-website';
const targets=[
'homepage-adsense-compact-preview-v2.html','homepage-humanproof-compact-preview-v1.html',
'humanproof-elite-credential-card-preview-v5.html','humanproof-gold-metal-card-preview-v3.html',
'humanproof-live-payment-preview.html','humanproof-mixed-metal-card-preview-v4.html',
'humanproof-payment-cancelled.html','humanproof-payment-success.html',
'humanproof-ultra-credential-card-preview-v10.html','humanproof-ultra-credential-card-preview-v11.html',
'humanproof-ultra-credential-card-preview-v12.html','humanproof-ultra-credential-card-preview-v13.html',
'humanproof-ultra-credential-card-preview-v14.html','humanproof-ultra-credential-card-preview-v15.html',
'humanproof-ultra-credential-card-preview-v6.html','humanproof-ultra-credential-card-preview-v7.html',
'humanproof-ultra-credential-card-preview-v8.html','humanproof-ultra-credential-card-preview-v9.html',
'humanproof-verified-card-preview-v1.html','humanproof-verified-card-preview-v2.html',
'humanproof-verified-card-preview-v3-gold.html','image-compressor-compact-preview-v1.html',
'instagram-callback.html','instagram-connect.html','nova-intelligence.html',
'preview-home-flagship-humanproof-v1.html','preview-home-flagship-humanproof-v2.html',
'preview-home-flagship-humanproof-v3.html','preview-home-flagship-humanproof-v4.html',
'preview-humanproof-scifi-mesh.html','ota/files/index.html','widget-pakistan-today.html'
];
for(const rel of targets){
 const file=path.join(R,rel); if(!fs.existsSync(file)){console.log('MISSING FILE: '+rel);continue;}
 let t=fs.readFileSync(file,'utf8');
 const expected='https://nexusnovatools.com/'+rel;
 const canonical=/<link\b[^>]*rel\s*=\s*["'][^"']*\bcanonical\b[^"']*["'][^>]*>/i.exec(t);
 if(canonical){const tag=canonical[0];const h=/\bhref\s*=\s*["'][^"']*["']/i;
   const fixed=tag.match(h)?tag.replace(h,'href="'+expected+'"'):tag.replace(/>$/,' href="'+expected+'">');
   t=t.replace(tag,fixed); fs.writeFileSync(file,t,'utf8'); console.log('REPAIRED: '+rel);
 } else {
   const tag='<link rel="canonical" href="'+expected+'">';
   const pos=t.search(/<\/head>/i);
   if(pos>=0){t=t.slice(0,pos)+tag+'\\n'+t.slice(pos);fs.writeFileSync(file,t,'utf8');console.log('INJECTED: '+rel);}
   else console.log('NO_HEAD: '+rel);
 }
}targets.push(['human','proof','-pricing.html'].join(''));
