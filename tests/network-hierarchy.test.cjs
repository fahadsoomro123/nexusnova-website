const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const networkPages = [
  'dns-lookup.html',
  'ip-cidr-calculator.html',
  'website-reachability-checker.html',
  'public-ip-checker.html',
  'ssl-certificate-checker.html',
];

test('network tools link back to the Network Tools hub', () => {
  for (const file of networkPages) {
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /href="network-tools\.html">Network Tools<\/a>/, `${file} should link to the Network Tools hub`);
  }
});

test('Network Tools hub links to every network utility', () => {
  const hub = fs.readFileSync('network-tools.html', 'utf8');
  for (const file of networkPages) {
    assert.match(hub, new RegExp(`href="${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), `network-tools.html should link to ${file}`);
  }
});
