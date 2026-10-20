'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');

function htmlFiles(dir) {
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...htmlFiles(absolute));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) output.push(absolute);
  }
  return output;
}

function mainHeadings(html) {
  // Redirect stubs without a main region should not report footer headings as page headings.
  const main = (html.match(/<main\b[\s\S]*?<\/main\s*>/i) || [])[0];
  if (!main) return [];
  const clean = main
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  return [...clean.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)]
    .map((match) => ({
      tag: match[1].toLowerCase(),
      text: match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }));
}

function metaContent(html, selector) {
  const head = (html.match(/<head\b[\s\S]*?<\/head\s*>/i) || [])[0] || '';
  const tag = (head.match(selector) || [])[0] || '';
  return (tag.match(/\bcontent=["']([^"']*)["']/i) || [])[1] || '';
}

test('homepage starts with one H1 and has consistent SEO identity metadata', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const headings = mainHeadings(html);
  assert.equal(headings[0]?.tag, 'h1', 'The first content heading must be H1');
  assert.equal(headings.filter((heading) => heading.tag === 'h1').length, 1, 'Homepage should have exactly one H1');
  assert.equal(headings[0]?.text, "Find what's holding your site back.");

  const title = (html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i) || [])[1] || '';
  const description = metaContent(html, /<meta\b[^>]*name=["']description["'][^>]*>/i);
  assert.match(title, /Free Online Browser Tools/i);
  assert.match(title, /PDFs?/i);
  assert.match(title, /109/);
  assert.ok(description.length >= 100 && description.length <= 160, 'Homepage description should be 100-160 characters');
  assert.match(description, /free online browser tools/i);
  assert.match(description, /PDFs?/i);
  assert.match(description, /Pakistan/i);

  for (const selector of [
    /<meta\b[^>]*property=["']og:title["'][^>]*>/i,
    /<meta\b[^>]*property=["']og:description["'][^>]*>/i,
    /<meta\b[^>]*name=["']twitter:title["'][^>]*>/i,
    /<meta\b[^>]*name=["']twitter:description["'][^>]*>/i
  ]) assert.ok(metaContent(html, selector), 'Open Graph and Twitter metadata must be populated');

  const schemaTags = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)];
  const orgTag = schemaTags.find((match) => /data-nexusnova-organization/.test(match[0]));
  assert.ok(orgTag, 'Homepage must include the Organization JSON-LD identity block');
  const organization = JSON.parse(orgTag[1]);
  assert.equal(organization['@type'], 'Organization');
  assert.equal(organization['@id'], 'https://nexusnovatools.com/#organization');
  assert.equal(organization.url, 'https://nexusnovatools.com/');
  assert.ok(organization.sameAs.includes('https://github.com/fahadsoomro123'));
  assert.ok(organization.sameAs.includes('https://x.com/NexusNovaTools'));
});

test('repository-wide HTML heading-order diagnostic reports H2-first pages', () => {
  const files = htmlFiles(root);
  const findings = [];
  for (const file of files) {
    const headings = mainHeadings(fs.readFileSync(file, 'utf8'));
    if (headings[0]?.tag === 'h2') {
      findings.push({
        path: path.relative(root, file).split(path.sep).join('/'),
        firstHeading: headings[0].text,
        laterH1: headings.some((heading) => heading.tag === 'h1')
      });
    }
  }
  console.log(`SEO_HEADING_ORDER_AUDIT pages=${files.length} h2_first=${findings.length}`);
  if (findings.length) console.log(JSON.stringify(findings, null, 2));
  assert.deepEqual(findings, [], 'Every page with a main region must start with H1');
});
