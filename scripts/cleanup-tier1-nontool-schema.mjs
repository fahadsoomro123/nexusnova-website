import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const excluded = new Set(['index.html','404.html','tools.html','categories.html','articles.html','guides.html','faq.html','about.html','contact.html','privacy.html','terms.html','disclaimer.html','editorial-policy.html','editorial-team.html','tool-methodology.html','account-deletion.html','cancellation-policy.html','digital-delivery-policy.html','refund-policy.html','humanproof.html','pakistan-tools.html','calculator-tools.html','image-tools.html','pdf-tools.html','productivity-tools.html','network-tools.html','gaming-tools.html','developer-tools.html','new-tools.html','popular-tools.html','smart-tools.html','trending-tools.html','daily-tools-directory.html']);
let changed = 0;
for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html') && excluded.has(f))) {
  const p = path.join(root,file);
  const before = fs.readFileSync(p,'utf8');
  const after = before.replace(/\s*<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?"@type"\s*:\s*"WebApplication"[\s\S]*?<\/script>/g, '');
  if (after !== before) { fs.writeFileSync(p,after); changed++; }
}
console.log(`Cleaned ${changed} non-tool pages.`);
