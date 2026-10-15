const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const BASE = 'https://nexusnovatools.com/';

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function jsonLd(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]));
}

function schemaNodes(data) {
  return Array.isArray(data['@graph']) ? data['@graph'] : [data];
}

function cleanText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function sectionBounds(html, selector) {
  const start = html.indexOf(selector);
  if (start < 0) return null;
  const tail = html.slice(start);
  const tags = /<\/?section\b[^>]*>/gi;
  let depth = 0;
  let match;
  while ((match = tags.exec(tail))) {
    if (/^<section\b/i.test(match[0])) depth += 1;
    else depth -= 1;
    if (depth === 0) return { start, end: start + tags.lastIndex };
  }
  return null;
}

test('all homepage tool routes exist and expose valid WebApplication JSON-LD', () => {
  const index = read('index.html');
  const hrefs = [...index.matchAll(/<a\b([^>]*\bdata-master-tool\b[^>]*)>/gi)]
    .map((match) => {
      const href = match[1].match(/href=["']([^"']+)["']/i);
      return href ? href[1] : null;
    })
    .filter((href) => href && /^[a-z0-9-]+\.html(?:#[^"' ]*)?$/i.test(href));
  const unique = [...new Set(hrefs)];
  assert.ok(unique.length >= 90, `Expected the established tool directory, found ${unique.length} routes`);

  for (const href of unique) {
    const file = href.split('#')[0];
    assert.ok(fs.existsSync(path.join(ROOT, file)), `Missing homepage tool route: ${file}`);
    const html = read(file);
    let parsed;
    assert.doesNotThrow(() => { parsed = jsonLd(html); }, `Invalid JSON-LD on ${file}`);
    const nodes = parsed.flatMap(schemaNodes);
    assert.ok(nodes.some((node) => node['@type'] === 'WebApplication' ||
      (Array.isArray(node['@type']) && node['@type'].includes('WebApplication'))),
    `Missing WebApplication schema on ${file}`);

    const robots = (html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i) || [''])[0];
    const sitemap = read('sitemap.xml');
    const sitemapUrls = [...sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((m) => m[1].trim());
    const canonical = (html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [null, BASE + file])[1];
    if (/\bnoindex\b/i.test(robots)) {
      assert.ok(!sitemapUrls.includes(canonical), `noindex URL unexpectedly listed in sitemap: ${canonical}`);
    } else {
      assert.ok(sitemapUrls.includes(canonical), `Indexable tool missing from sitemap: ${canonical}`);
    }
  }
});

test('core generic calculators have FAQPage JSON-LD', () => {
  const targets = [
    'calculator.html', 'percentage-calculator.html', 'age-calculator.html',
    'date-difference-calculator.html', 'discount-calculator.html',
    'percentage-change-calculator.html', 'scientific-calculator.html',
    'bmi-calculator.html', 'emi-calculator.html', 'bill-split-tip-calculator.html',
    'unit-converter.html', 'storage-size-converter.html',
    'time-duration-calculator.html', 'online-timer.html', 'stopwatch.html',
    'pomodoro-timer.html', 'word-counter.html', 'text-case-converter.html',
    'roman-numeral-converter.html', 'rgb-hex-converter.html',
    'number-to-words.html', 'paper-size-converter.html',
    'paper-size-in-pixels.html', 'unix-timestamp-converter.html',
  ];

  for (const file of targets) {
    const html = read(file);
    const nodes = jsonLd(html).flatMap(schemaNodes);
    const faq = nodes.find((node) => node['@type'] === 'FAQPage');
    assert.ok(faq, `FAQPage schema missing on ${file}`);
    assert.ok(Array.isArray(faq.mainEntity) && faq.mainEntity.length >= 2,
      `FAQPage must contain at least two questions on ${file}`);
  }
});

test('new FAQPage schema is backed by visible matching questions', () => {
  const files = fs.readdirSync(ROOT).filter((name) => name.endsWith('.html'));
  for (const file of files) {
    const html = read(file);
    const matches = [...html.matchAll(/<script\b([^>]*data-nn-faqpage[^>]*)>([\s\S]*?)<\/script>/gi)];
    for (const match of matches) {
      const schema = JSON.parse(match[2]);
      assert.equal(schema['@type'], 'FAQPage', `Unexpected schema type in ${file}`);
      assert.ok(schema.mainEntity.length >= 2, `FAQPage is too short in ${file}`);
      const visible = cleanText(html);
      for (const item of schema.mainEntity) {
        assert.ok(visible.includes(String(item.name).toLowerCase()),
          `FAQ question is not visible in page content: ${file} — ${item.name}`);
      }
    }
  }
});

test('tax, finance, energy and benefit pages carry source-linked informational disclaimers', () => {
  const required = {
    'salary-tax-calculator-pakistan.html': ['data-ymyl-disclaimer', 'fbr.gov.pk/Budget2026-27/FinanceAct.html'],
    'fbr-tax-calculator-pakistan.html': ['data-ymyl-disclaimer', 'fbr.gov.pk/withholding-taxes-rate-card'],
    'fbr-atl-status-checker.html': ['data-ymyl-disclaimer', 'fbr.gov.pk/active-taxpayer-list'],
    'electricity-bill-calculator-pakistan.html': ['data-ymyl-disclaimer', 'nepra.org.pk'],
    'emi-calculator.html': ['data-ymyl-disclaimer', 'consumerfinance.gov'],
    'currency-rates.html': ['data-ymyl-disclaimer', 'sbp.org.pk/economic-data'],
    'gold-rates.html': ['data-ymyl-disclaimer', 'gold-api.com'],
    'fuel-rates.html': ['data-ymyl-disclaimer', 'petroleum.gov.pk'],
  };

  for (const [file, markers] of Object.entries(required)) {
    const html = read(file).toLowerCase();
    for (const marker of markers) assert.ok(html.includes(marker.toLowerCase()),
      `Missing disclaimer/source marker ${marker} on ${file}`);
    assert.match(html, /informational purposes only|informational reference only|informational estimate only|budgeting and information only|informational assistance only/i,
      `Missing informational-only language on ${file}`);
  }

  const cola = read('social-security-cola-calculator-2027.html');
  assert.match(cola, /general information only|informational purposes only/i);
  assert.match(cola, /ssa.gov\/news\/en\/press\/releases\/2026-10-14\.html/i);
});

test('homepage prioritizes global tools and places the Pakistan spotlight after the full directory', () => {
  const html = read('index.html');
  const featured = sectionBounds(html, '<section class="nn-featured-tools"');
  const directory = sectionBounds(html, '<section class="nn-directory" id="master-directory"');
  const pakistan = sectionBounds(html, '<section class="nn-pakistan-highlight"');
  assert.ok(featured && directory && pakistan, 'Required homepage sections must exist');
  assert.ok(pakistan.start > directory.end, 'Pakistan spotlight should follow the main global tool directory');
  const featureHtml = html.slice(featured.start, featured.end);
  for (const href of [
    'ai-token-calculator.html', 'ai-vram-calculator.html',
    'social-security-cola-calculator-2027.html', 'edpi-calculator.html',
    'gaming-sensitivity-converter.html', 'ip-cidr-calculator.html',
    'document-workbench.html',
  ]) assert.ok(featureHtml.includes(href), `Priority Tier-1 tool missing from featured area: ${href}`);
});

test('sitemap and robots keep essential trust pages crawlable', () => {
  const sitemap = read('sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((m) => m[1].trim());
  assert.ok(urls.includes(BASE), 'Homepage canonical URL must be in sitemap');
  assert.ok(urls.length >= 139, `Expected updated sitemap to retain 139+ URL entries, found ${urls.length}`);
  assert.match(read('robots.txt'), /User-agent:\s*\*\s*[\s\S]*Allow:\s*\//i);

  for (const file of ['about.html', 'contact.html', 'privacy.html', 'terms.html']) {
    const html = read(file);
    assert.doesNotMatch((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i) || [''])[0], /noindex/i,
      `Trust page should remain indexable: ${file}`);
    assert.ok(urls.includes(BASE + file), `Trust page missing from sitemap: ${file}`);
  }
});
