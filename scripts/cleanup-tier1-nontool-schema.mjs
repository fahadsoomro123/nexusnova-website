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
let changed = 0;
for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html') && excluded.has(f))) {
  const p = path.join(root,file);
  const before = fs.readFileSync(p,'utf8');
  const after = before.replace(/\s*<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?"@type"\s*:\s*"WebApplication"[\s\S]*?<\/script>/g, '');
  if (after !== before) { fs.writeFileSync(p,after); changed++; }
}
console.log(`Cleaned ${changed} non-tool pages.`);
