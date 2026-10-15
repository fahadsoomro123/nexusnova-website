import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sitemapPath = path.join(root, 'sitemap.xml');
const base = 'https://nexusnovatools.com/';
const excluded = new Set(['404.html']);
const existing = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath,'utf8') : '';
const urls = new Set([...existing.matchAll(/<loc>(https:\/\/nexusnovatools\.com\/[^<]+)<\/loc>/g)].map(m => m[1]));
for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html') && !excluded.has(f))) {
  const html = fs.readFileSync(path.join(root,file),'utf8');
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1]?.toLowerCase() || '';
  if (robots.includes('noindex')) continue;
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["'](https:\/\/nexusnovatools\.com\/[^"']+)/i)?.[1];
  if (canonical) urls.add(canonical.replace(/\/$/,'/') === base ? base : canonical);
}
const sorted = [...urls].sort();
const body = sorted.map(u => `  <url><loc>${u}</loc></url>`).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
fs.writeFileSync(sitemapPath, xml);
console.log(`Regenerated sitemap.xml with ${sorted.length} unique URLs.`);
