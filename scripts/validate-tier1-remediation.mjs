import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const excluded = new Set([
  'index.html','404.html','tools.html','categories.html','articles.html','tech.html','guides.html','faq.html',
  'about.html','contact.html','privacy.html','terms.html','disclaimer.html','editorial-policy.html','editorial-team.html',
  'tool-methodology.html','account-deletion.html','app.html','humanproof.html','currency-rates.html','gold-rates.html',
  'fuel-rates.html','aqi-live.html','earthquakes-live.html','crypto-live.html','weather-live.html','sports-live.html',
  'live-alerts.html','pulse.html','magic-drop.html','xray.html','widgets.html','pakistan-public-holidays-2026.html',
  'refund-policy.html','cancellation-policy.html','digital-delivery-policy.html','pakistan-tools.html','calculator-tools.html',
  'image-tools.html','pdf-tools.html','productivity-tools.html','network-tools.html','gaming-tools.html','developer-tools.html',
  'new-tools.html','popular-tools.html','smart-tools.html','trending-tools.html','daily-tools-directory.html','live.html','labs.html',
  'gaming.html','developer.html'
]);
const generic = [/calculator/i,/word-counter/i,/age-calculator/i,/timer/i,/stopwatch/i,/unit-converter/i,/converter/i,/text-case/i,/text-diff/i,/number-to-words/i,/roman-numeral/i,/percentage/i,/date-difference/i,/time-duration/i];
function hasToolSurface(file, html) {
  if (excluded.has(file)) return false;
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html;
  const bodyAttrs = html.match(/<body\b([^>]*)>/i)?.[1] || '';
  return /\bdata-tool-ui\b/i.test(main) ||
    /\bdata-tool=["'][^"']+/i.test(bodyAttrs) ||
    /<(?:input|select|textarea|button)\b/i.test(main);
}
function hasJsonLdType(html, wantedType, file, failures) {
  let found = false;
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = match[1];
    if (!raw.includes(wantedType)) continue;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      failures.push(file + ': invalid JSON-LD for ' + wantedType);
      continue;
    }
    const nodes = [parsed, ...(Array.isArray(parsed['@graph']) ? parsed['@graph'] : [])];
    if (nodes.some(node => node && (node['@type'] === wantedType || (Array.isArray(node['@type']) && node['@type'].includes(wantedType))))) found = true;
  }
  return found;
}
const htmlFiles = fs.readdirSync(root).filter(f => f.endsWith('.html'));

const failures = [];
let indexable = 0, webApps = 0, genericPages = 0, faqPages = 0;
const toolCanonicals = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root,file),'utf8');
  if (!hasToolSurface(file, html)) continue;
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1]?.toLowerCase() || '';
  if (robots.includes('noindex')) continue;
  indexable++;
  if (hasJsonLdType(html, 'WebApplication', file, failures)) webApps++;
  else failures.push(file + ': missing or invalid WebApplication JSON-LD');
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
  if (canonical) toolCanonicals.push(canonical);
  if (generic.some(re => re.test(file + ' ' + (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')))) {
    genericPages++;
    if (!html.includes('NEXUSNOVA-TIER1-GUIDE:v1')) failures.push(`${file}: missing tier-1 guide`);
    if (!hasJsonLdType(html, 'FAQPage', file, failures)) failures.push(file + ': missing or invalid FAQPage JSON-LD');
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
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>(https:\/\/nexusnovatools\.com\/[^<]+)<\/loc>/g)].map(m => m[1]));
for (const canonical of toolCanonicals) {
  if (!sitemapUrls.has(canonical)) failures.push('sitemap.xml: missing indexable tool canonical ' + canonical);
}
const home = fs.existsSync(path.join(root,'index.html')) ? fs.readFileSync(path.join(root,'index.html'),'utf8') : '';
if (!home.includes('NEXUSNOVA-TIER1-HOME:v1')) failures.push('index.html: missing Tier-1 global homepage discovery layer');
for (const target of ['ai-token-calculator.html','ai-vram-calculator.html','social-security-cola-calculator-2027.html','edpi-calculator.html','ip-cidr-calculator.html','document-workbench.html']) {
  if (!home.includes('href="' + target + '"')) failures.push('index.html: missing homepage discovery link to ' + target);
  if (!fs.existsSync(path.join(root,target))) failures.push('homepage target missing: ' + target);
}
for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root,file),'utf8');
  const robotsMeta = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1]?.toLowerCase() || '';
  if (robotsMeta.includes('noindex')) continue;
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  if (/(tax|salary|currency|gold|fuel|fbr|emi|social-security|cola)/i.test(file + ' ' + title) && !html.includes('nn-ymyl-disclaimer')) {
    failures.push(file + ': missing financial/YMYL disclaimer');
  }
}
for (const file of excluded) {
  const fullPath = path.join(root,file);
  if (!fs.existsSync(fullPath)) continue;
  const html = fs.readFileSync(fullPath,'utf8');
  if (/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?"@type"\s*:\s*"WebApplication"/i.test(html)) {
    failures.push(file + ': non-tool page still has WebApplication JSON-LD');
  }
}
for (const required of ['about.html','contact.html','privacy.html','terms.html']) {
  if (!sitemap.includes(`https://nexusnovatools.com/${required}`)) failures.push(`sitemap.xml: missing ${required}`);
}
if (!/^User-agent:\s*\*/m.test(robots)) failures.push('robots.txt: missing User-agent wildcard');
if (!/Sitemap:\s*https:\/\/nexusnovatools\.com\/sitemap\.xml/m.test(robots)) failures.push('robots.txt: missing primary sitemap declaration');
console.log(JSON.stringify({sitemapUrls:sitemapUrls.size,toolPages:indexable,webApps,genericPages,faqPages,failures},null,2));
if (failures.length) process.exit(1);
