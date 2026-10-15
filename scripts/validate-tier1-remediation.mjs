import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const excluded = new Set(['index.html','tools.html','categories.html','articles.html','guides.html','faq.html','about.html','contact.html','privacy.html','terms.html','disclaimer.html','editorial-policy.html','editorial-team.html','tool-methodology.html','account-deletion.html','pakistan-tools.html','calculator-tools.html','image-tools.html','pdf-tools.html','productivity-tools.html','network-tools.html','gaming-tools.html','developer-tools.html','new-tools.html','popular-tools.html','smart-tools.html','trending-tools.html','daily-tools-directory.html']);
const generic = [/calculator/i,/word-counter/i,/age-calculator/i,/timer/i,/stopwatch/i,/unit-converter/i,/converter/i,/text-case/i,/text-diff/i,/number-to-words/i,/roman-numeral/i,/percentage/i,/date-difference/i,/time-duration/i];
const htmlFiles = fs.readdirSync(root).filter(f => f.endsWith('.html') && !excluded.has(f));
const failures = [];
let indexable = 0, webApps = 0, genericPages = 0, faqPages = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root,file),'utf8');
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1]?.toLowerCase() || '';
  if (robots.includes('noindex')) continue;
  indexable++;
  if (/WebApplication/.test(html)) webApps++;
  else failures.push(`${file}: missing WebApplication JSON-LD`);
  if (generic.some(re => re.test(file + ' ' + (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')))) {
    genericPages++;
    if (!html.includes('NEXUSNOVA-TIER1-GUIDE:v1')) failures.push(`${file}: missing tier-1 guide`);
    if (!/FAQPage/.test(html)) failures.push(`${file}: missing FAQPage JSON-LD`);
    const start = html.indexOf('NEXUSNOVA-TIER1-GUIDE:v1');
    const tail = start >= 0 ? html.slice(start, Math.min(html.length,start+24000)) : '';
    const text = tail.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z0-9#]+;/gi,' ').replace(/\s+/g,' ');
    const count = (text.match(/\b[\w'-]+\b/g) || []).length;
    if (count < 600) failures.push(`${file}: tier-1 guide contains only ${count} words`);
    else faqPages++;
  }
}
const sitemap = fs.existsSync(path.join(root,'sitemap.xml')) ? fs.readFileSync(path.join(root,'sitemap.xml'),'utf8') : '';
const robots = fs.existsSync(path.join(root,'robots.txt')) ? fs.readFileSync(path.join(root,'robots.txt'),'utf8') : '';
for (const required of ['about.html','contact.html','privacy.html','terms.html']) {
  if (!sitemap.includes(`https://nexusnovatools.com/${required}`)) failures.push(`sitemap.xml: missing ${required}`);
}
if (!/^User-agent:\s*\*/m.test(robots)) failures.push('robots.txt: missing User-agent wildcard');
if (!/Sitemap:\s*https:\/\/nexusnovatools\.com\/sitemap\.xml/m.test(robots)) failures.push('robots.txt: missing primary sitemap declaration');
console.log(JSON.stringify({indexable,webApps,genericPages,faqPages,failures},null,2));
if (failures.length) process.exit(1);
