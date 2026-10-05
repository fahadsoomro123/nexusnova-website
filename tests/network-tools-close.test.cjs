const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const hub=fs.readFileSync('network-tools.html','utf8');
const ipHtml=fs.readFileSync('public-ip-checker.html','utf8');
const ipJs=fs.readFileSync('assets/js/public-ip-checker.js','utf8');
const sslHtml=fs.readFileSync('ssl-certificate-checker.html','utf8');
const sslJs=fs.readFileSync('assets/js/ssl-certificate-checker.js','utf8');
const sitemap=fs.readFileSync('sitemap-new-tools.xml','utf8');

test('network hub links all five focused network tools',()=>{
  ['public-ip-checker.html','ssl-certificate-checker.html','dns-lookup.html','ip-cidr-calculator.html','website-reachability-checker.html'].forEach(path=>assert.match(hub,new RegExp(path.replace('.','\\.'))));
});

test('public IP checker is click-to-run and uses only ipify address endpoints',()=>{
  assert.match(ipHtml,/Show my public IP/);
  assert.match(ipJs,/button\.addEventListener\('click'/);
  assert.match(ipJs,/https:\/\/api64\.ipify\.org\?format=json/);
  assert.match(ipJs,/https:\/\/api\.ipify\.org\?format=json/);
  assert.doesNotMatch(ipJs,/geolocation|ipinfo|geoip|location database/i);
});

test('public IP checker validates source response and fails closed',()=>{
  assert.match(ipJs,/validIp\(data\?\.ip\)/);
  assert.match(ipJs,/did not guess an address/);
});

test('SSL checker uses NetworkCalc public certificate API on standard HTTPS only',()=>{
  assert.match(sslJs,/https:\/\/networkcalc\.com\/api\/security\/certificate\//);
  assert.doesNotMatch(sslJs,/\?port=/);
  assert.match(sslHtml,/port 443/i);
});

test('SSL checker rejects internal-style targets and direct IP addresses',()=>{
  assert.match(sslJs,/\.localhost/);
  assert.match(sslJs,/\.local/);
  assert.match(sslJs,/\.internal/);
  assert.match(sslJs,/accepts domain names only, not direct IP addresses/);
});

test('SSL checker displays certificate metadata safely without raw PEM',()=>{
  assert.match(sslJs,/issued_to/);
  assert.match(sslJs,/issued_by/);
  assert.match(sslJs,/valid_to/);
  assert.match(sslJs,/alternate_names/);
  assert.match(sslJs,/textContent/);
  assert.doesNotMatch(sslJs,/certificate\.raw/);
});

test('new network pages are discoverable in sitemap',()=>{
  ['network-tools.html','public-ip-checker.html','ssl-certificate-checker.html'].forEach(path=>assert.match(sitemap,new RegExp(path.replace('.','\\.'))));
});
