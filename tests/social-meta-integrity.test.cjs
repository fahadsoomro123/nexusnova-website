'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const cases = [
  ['electricity-bill-calculator-pakistan.html', 'Pakistan Electricity Bill Calculator 2026 | NexusNova'],
  ['fbr-atl-status-checker.html', 'FBR ATL Status: CNIC, NTN & Passport | NexusNova'],
  ['fbr-tax-calculator-pakistan.html', 'FBR Tax Calculator Pakistan 2026–27 | Salary & Business | NexusNova'],
  ['pakistan-jobs-finder.html', 'Pakistan Jobs Finder — Government & Private Jobs | NexusNova'],
  ['salary-tax-calculator-pakistan.html', 'Pakistan Salary Tax Calculator 2026–27 | NexusNova'],
  ['articles/cloudflare-introduces-context-aware-vulnerability-remediation.html', 'Cloudflare Introduces Context-Aware Vulnerability Remediation'],
  ['whatsapp-link-generator.html', 'WhatsApp Link Generator — Create wa.me Click to Chat Link']
];

function headOf(html) {
  return (html.match(/<head\b[\s\S]*?<\/head>/i) || [])[0] || '';
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(name + '="([^"]*)"', 'i'));
  return match ? match[1] : '';
}

function metaContent(head, wantedAttr, wantedKey) {
  for (const tag of head.match(/<meta\b[^>]*>/gi) || []) {
    if (attribute(tag, wantedAttr) === wantedKey) return attribute(tag, 'content');
  }
  return '';
}

test('priority pages have complete page-specific social metadata and concise descriptions', () => {
  for (const [file, expectedTitle] of cases) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const head = headOf(html);
    assert.ok(head, file + ': missing head');
    const desc = metaContent(head, 'name', 'description');
    assert.ok(desc, file + ': missing description');
    assert.ok(desc.length <= 160, file + ': description exceeds 160 characters (' + desc.length + ')');
    for (const name of ['og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
      assert.ok(metaContent(head, name.startsWith('og:') ? 'property' : 'name', name), file + ': missing ' + name);
    }
    if (file === 'whatsapp-link-generator.html') {
      assert.equal(metaContent(head, 'name', 'twitter:title'), expectedTitle, 'WhatsApp page must not advertise another tool');
      assert.match(metaContent(head, 'name', 'twitter:description'), /WhatsApp wa\.me/i);
      assert.doesNotMatch(metaContent(head, 'name', 'twitter:description'), /compress|resize|JPG|PNG|WebP/i);
    }
  }
});

test('priority page Open Graph URLs remain aligned to canonical URLs', () => {
  for (const [file] of cases) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const head = headOf(html);
    const canonicalTag = (head.match(/<link\b[^>]*\brel="canonical"[^>]*>/i) || [])[0] || '';
    const canonical = attribute(canonicalTag, 'href');
    assert.ok(canonical, file + ': missing canonical');
    assert.equal(metaContent(head, 'property', 'og:url'), canonical, file + ': og:url does not match canonical');
  }
});
