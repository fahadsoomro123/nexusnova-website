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
const contentTargets = [
  'png-to-jpg.html','jpg-to-png.html','jpg-to-pdf.html','calculator.html','stopwatch.html',
  'webp-to-jpg.html','text-to-pdf.html','webp-to-png.html','avif-to-jpg.html','heic-to-jpg.html',
  'word-counter.html','online-timer.html','bmi-calculator.html','emi-calculator.html','unit-converter.html',
  'age-calculator.html','pomodoro-timer.html','edpi-calculator.html','number-to-words.html','rgb-hex-converter.html',
  'text-diff-checker.html','ip-cidr-calculator.html','ai-vram-calculator.html','csv-json-converter.html',
  'discount-calculator.html','ai-token-calculator.html','text-case-converter.html','scientific-calculator.html',
  'paper-size-in-pixels.html','paper-size-converter.html','percentage-calculator.html','storage-size-converter.html',
  'time-duration-calculator.html','roman-numeral-converter.html','fps-frame-time-calculator.html',
  'unix-timestamp-converter.html','steam-playtime-calculator.html','bill-split-tip-calculator.html',
  'zakat-calculator-pakistan.html','date-difference-calculator.html','decision-matrix-calculator.html',
  'fbr-tax-calculator-pakistan.html','percentage-change-calculator.html','gaming-sensitivity-converter.html',
  'salary-tax-calculator-pakistan.html','minecraft-coordinate-converter.html',
  'social-security-cola-calculator-2027.html','electricity-bill-calculator-pakistan.html'
];
const legacyMarkers = ['NEXUSNOVA-TIER1-GUIDE:v1', 'nn-tier1-faq'];
const genericPhrases = [
  'A practical US workflow',
  'contract, tax return, payroll choice',
  'A freelancer using',
  'When a US freelancer uses',
  'For a remote team,',
  'After completing the underlying work, students can use'
];

function wordCount(html) {
  const text = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ');
  return (text.match(/[\w’'-]+/g) || []).length;
}

function hasJsonLdType(html, wantedType) {
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed;
    try { parsed = JSON.parse(match[1]); } catch { continue; }
    const nodes = [parsed, ...(Array.isArray(parsed['@graph']) ? parsed['@graph'] : [])];
    if (nodes.some(node => node && (node['@type'] === wantedType || (Array.isArray(node['@type']) && node['@type'].includes(wantedType))))) return true;
  }
  return false;
}

function isToolSurface(file, html) {
  if (excluded.has(file)) return false;
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html;
  const bodyAttrs = html.match(/<body\b([^>]*)>/i)?.[1] || '';
  return /\bdata-tool-ui\b/i.test(main) ||
    /\bdata-tool=["'][^"']+/i.test(bodyAttrs) ||
    /<(?:input|select|textarea|button)\b/i.test(main);
}

const failures = [];
const htmlFiles = fs.readdirSync(root).filter(name => name.toLowerCase().endsWith('.html'));
const sitemap = fs.existsSync(path.join(root, 'sitemap.xml')) ? fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8') : '';
const robots = fs.existsSync(path.join(root, 'robots.txt')) ? fs.readFileSync(path.join(root, 'robots.txt'), 'utf8') : '';
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>(https:\/\/nexusnovatools\.com\/[^<]+)<\/loc>/g)].map(match => match[1]));

let indexableToolPages = 0;
let webApps = 0;
let contentGuidePages = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  if (legacyMarkers.some(marker => html.toLowerCase().includes(marker.toLowerCase()))) {
    failures.push(file + ': retired generic tier-1 block remains');
  }

  const robotsMeta = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1]?.toLowerCase() || '';
  if (robotsMeta.includes('noindex') || !isToolSurface(file, html)) continue;

  indexableToolPages++;
  if (hasJsonLdType(html, 'WebApplication')) webApps++;
  else failures.push(file + ': missing or invalid WebApplication JSON-LD');

  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
  if (canonical && !sitemapUrls.has(canonical)) failures.push('sitemap.xml: missing indexable tool canonical ' + canonical);
}

for (const file of contentTargets) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    failures.push(file + ': missing content target');
    continue;
  }
  const html = fs.readFileSync(fullPath, 'utf8');
  const startMarker = '<!-- NEXUSNOVA_COMPACT_TOOL_GUIDE_START -->';
  const endMarker = '<!-- NEXUSNOVA_COMPACT_TOOL_GUIDE_END -->';
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < start) {
    failures.push(file + ': missing reviewed tool-specific guide block');
    continue;
  }
  const block = html.slice(start, end + endMarker.length);
  const count = wordCount(block);
  if (count < 130) failures.push(file + ': tool-specific guide is too short (' + count + ' words)');
  for (const required of ['<h2', 'How to use', 'Practical example', 'Limits, privacy and checks']) {
    if (!block.includes(required)) failures.push(file + ': missing required guide element ' + required);
  }
  if (genericPhrases.some(phrase => block.toLowerCase().includes(phrase.toLowerCase()))) {
    failures.push(file + ': generic audience/workflow copy detected in tool-specific guide');
  }
  contentGuidePages++;
}

const home = fs.existsSync(path.join(root, 'index.html')) ? fs.readFileSync(path.join(root, 'index.html'), 'utf8') : '';
if (!home.includes('NEXUSNOVA-TIER1-HOME:v1')) failures.push('index.html: missing homepage discovery layer');
for (const target of ['ai-token-calculator.html','ai-vram-calculator.html','social-security-cola-calculator-2027.html','edpi-calculator.html','ip-cidr-calculator.html','document-workbench.html']) {
  if (!home.includes('href="' + target + '"')) failures.push('index.html: missing homepage discovery link to ' + target);
  if (!fs.existsSync(path.join(root, target))) failures.push('homepage target missing: ' + target);
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const robotsMeta = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1]?.toLowerCase() || '';
  if (robotsMeta.includes('noindex')) continue;
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const isFinancialOrYmyL = /(tax|salary|currency|gold|fuel|fbr|emi|social-security|cola)/i.test(file + ' ' + title);
  const hasDedicatedDisclaimer = html.includes('nn-ymyl-disclaimer');
  const hasExplicitTaxCaution = /informational, not tax advice|not tax advice|not financial advice/i.test(html);
  if (isFinancialOrYmyL && !hasDedicatedDisclaimer && !hasExplicitTaxCaution) {
    failures.push(file + ': missing financial/YMYL disclaimer');
  }
}

for (const required of ['about.html','contact.html','privacy.html','terms.html']) {
  if (!sitemap.includes('https://nexusnovatools.com/' + required)) failures.push('sitemap.xml: missing ' + required);
}
if (!/^User-agent:\s*\*/m.test(robots)) failures.push('robots.txt: missing User-agent wildcard');
if (!/Sitemap:\s*https:\/\/nexusnovatools\.com\/sitemap\.xml/m.test(robots)) failures.push('robots.txt: missing primary sitemap declaration');

const colaPath = path.join(root, 'social-security-cola-calculator-2027.html');
if (fs.existsSync(colaPath)) {
  const cola = fs.readFileSync(colaPath, 'utf8');
  if (!/official 3\.6% COLA for 2027/i.test(cola)) failures.push('social-security-cola-calculator-2027.html: missing official 3.6% 2027 COLA statement');
  if (/treat a 2027 cola percentage as hypothetical unless/i.test(cola)) failures.push('social-security-cola-calculator-2027.html: obsolete hypothetical-rate claim remains');
}

const result = { sitemapUrls: sitemapUrls.size, indexableToolPages, webApps, contentTargets: contentTargets.length, contentGuidePages, failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
