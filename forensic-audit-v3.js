const fs=require('fs'),path=require('path');
const ROOT=process.argv[2]||process.cwd(),OUT=path.join(ROOT,'forensic-audit-v3-report.tsv');
function cleanHtml(html){let s=html.replace(/<!--[\s\S]*?-->/g,' ');const area=(s.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||s.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)||s.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)||[,s])[1];return area.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<noscript\b[\s\S]*?<\/noscript>/gi,' ').replace(/<svg\b[\s\S]*?<\/svg>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot|apos);/gi,' ').trim();}
function words(html){const t=cleanHtml(html);return t?t.split(/\s+/).filter(Boolean).length:0;}
function robots(html){for(const t of html.match(/<meta\b[^>]*>/gi)||[]){if(/\bname\s*=\s*["']robots["']/i.test(t)){const m=t.match(/\bcontent\s*=\s*["']([^"']*)["']/i);return m?m[1].trim():'(present; content missing)';}}return '(none)';}
function canonical(html){for(const t of html.match(/<link\b[^>]*>/gi)||[]){if(/\brel\s*=\s*["'][^"']*\bcanonical\b[^"']*["']/i.test(t)){const m=t.match(/\bhref\s*=\s*["']([^"']+)["']/i);return m?m[1].trim():null;}}return null;}
function schema(html){return /<script\b[^>]*type\s*=\s*["']application\/ld\+json["']/i.test(html);}
function expected(rel){return 'https://nexusnovatools.com/'+(rel==='index.html'?'':rel);}
const files=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.isFile()&&e.name.toLowerCase().endsWith('.html'))files.push(p);}})(ROOT);files.sort((a,b)=>a.localeCompare(b));
const rows=['FILE PATH\tEXACT WORD COUNT\tROBOTS DIRECTIVE\tCANONICAL STATUS\tPASS/FAIL STATUS'];
for(const f of files){const html=fs.readFileSync(f,'utf8'),rel=path.relative(ROOT,f).split(path.sep).join('/'),w=words(html),r=robots(html),c=canonical(html),ex=expected(rel),cb=c?(c===ex?'VERIFIED':'MISMATCH: '+c):'MISSING',undersized=w<400&&!/\bnoindex\b/i.test(r),status=undersized?'FAIL: UNDERSIZED':cb==='VERIFIED'?'VERIFIED'+(schema(html)?'':' | SCHEMA MISSING'):cb==='MISSING'?'FAIL: CANONICAL MISSING':'FAIL: CANONICAL MISMATCH';rows.push([rel,w,r,cb,status].join('\t'));}
fs.writeFileSync(OUT,rows.join('\n'),'utf8');
const sum={total:files.length,indexable:0,noindex:0,under400:0,canonicalVerified:0,canonicalMissing:0,canonicalMismatch:0,schemaMissing:0};
for(const row of rows.slice(1)){const p=row.split('\t');if(/\bnoindex\b/i.test(p[2]))sum.noindex++;else sum.indexable++;if(+p[1]<400&&!/\bnoindex\b/i.test(p[2]))sum.under400++;if(p[3]==='VERIFIED')sum.canonicalVerified++;else if(p[3]==='MISSING')sum.canonicalMissing++;else sum.canonicalMismatch++;if(p[4].includes('SCHEMA MISSING'))sum.schemaMissing++;}
fs.writeFileSync(path.join(ROOT,'forensic-audit-v3-summary.txt'),JSON.stringify(sum,null,2),'utf8');
console.log('[AUDIT COMPLETE] HTML FILES: '+files.length);console.log('[REPORT] '+OUT);console.log(rows.slice(0,51).join('\n'));