const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('LIVE light theme keeps cards readable even when device prefers dark',()=>{
  const css=read('assets/css/live.css');
  assert.match(css,/--live-panel:rgba\(255,255,255,.92\)/);
  assert.match(css,/--live-text:#0b1328/);
  assert.doesNotMatch(css,/prefers-color-scheme:dark/);
});

test('Pakistan prayer page uses pinned Adhan and labels calculations honestly',()=>{
  const html=read('prayer-times-qibla-pakistan.html');
  const js=read('assets/js/prayer-qibla.js');
  assert.match(html,/adhan@4\.4\.6\/lib\/bundles\/adhan\.umd\.min\.js/);
  assert.match(html,/astronomical calculations, not an official mosque timetable/i);
  assert.match(html,/18° for Fajr and 18° for Isha/i);
  assert.match(js,/CalculationMethod\.Karachi\(\)/);
  assert.match(js,/Madhab\.Hanafi/);
  assert.match(js,/Qibla\(coordinates\)/);
});

test('DNS lookup uses documented Cloudflare DoH JSON endpoint and does not invent answers',()=>{
  const js=read('assets/js/dns-lookup.js');
  const html=read('dns-lookup.html');
  assert.match(js,/cloudflare-dns\.com\/dns-query/);
  assert.match(js,/application\/dns-json/);
  assert.match(js,/No replacement result was invented/);
  assert.match(html,/Cloudflare’s 1\.1\.1\.1 DNS-over-HTTPS/i);
});

test('IPv4 CIDR calculator returns deterministic subnet math',()=>{
  const {calculate}=require('../assets/js/ip-cidr-calculator.js');
  const out=calculate('192.168.1.10/24');
  assert.equal(out.network,'192.168.1.0');
  assert.equal(out.broadcast,'192.168.1.255');
  assert.equal(out.netmask,'255.255.255.0');
  assert.equal(out.firstUsable,'192.168.1.1');
  assert.equal(out.lastUsable,'192.168.1.254');
  assert.equal(out.totalAddresses,256);
  assert.equal(out.usableHosts,254);
  assert.equal(out.scope,'Private IPv4');
  assert.throws(()=>calculate('999.1.1.1/24'));
});

test('reachability checker explicitly refuses to fake HTTP or TLS details',()=>{
  const html=read('website-reachability-checker.html');
  const js=read('assets/js/website-reachability.js');
  assert.match(js,/mode:'no-cors'/);
  assert.match(html,/not labelled a full uptime or HTTP-status checker/i);
  assert.match(html,/cannot generally inspect cross-origin response status, headers or the server’s TLS certificate/i);
});

test('Pakistan 2026 holiday page uses later moon-dependent federal dates',()=>{
  const html=read('pakistan-public-holidays-2026.html');
  for(const phrase of ['20–21 March 2026','26–28 May 2026','25–26 June 2026','26 August 2026']) assert.match(html,new RegExp(phrase));
  assert.match(html,/Cabinet Division/i);
  assert.match(html,/subject to moon sighting/i);
});

test('gold history is NexusNova-owned snapshots and updater retains at most 90 dates',()=>{
  const history=JSON.parse(read('assets/data/live-gold-history.json'));
  const updater=read('.github/scripts/update_live_gold.mjs');
  const browser=read('assets/js/live-gold.js');
  const html=read('gold-rates.html');
  assert.equal(history.status,'ok');
  assert.ok(Array.isArray(history.points)&&history.points.length>=1);
  assert.match(history.method,/NexusNova-owned daily snapshots/i);
  assert.match(updater,/slice\(-90\)/);
  assert.match(browser,/live-gold-history\.json/);
  assert.match(html,/does not backfill dates before tracking began/i);
});

test('new master-sprint pages are included in the new-tools sitemap',()=>{
  const sitemap=read('sitemap-new-tools.xml');
  for(const file of ['prayer-times-qibla-pakistan.html','pakistan-public-holidays-2026.html','dns-lookup.html','ip-cidr-calculator.html','website-reachability-checker.html']) assert.match(sitemap,new RegExp(file.replace('.','\\.')));
});
