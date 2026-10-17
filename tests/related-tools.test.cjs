'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getCanonicalPath,
  selectRelatedTools
} = require('../.github/scripts/related_tools_selector.cjs');

const origin = 'https://nexusnovatools.com';
const tool = (title, url, category) => ({ title, url, category, type: 'tool' });

test('canonical paths resolve relative to the site root and reject external URLs', () => {
  assert.equal(getCanonicalPath({ url: 'tools/solar-bill-calculator.html' }, origin), '/tools/solar-bill-calculator.html');
  assert.equal(getCanonicalPath({ url: 'image-compressor.html' }, origin), '/image-compressor.html');
  assert.equal(getCanonicalPath({ url: 'https://example.com/not-ours.html' }, origin), null);
  assert.equal(getCanonicalPath({ url: 'javascript:alert(1)' }, origin), null);
  assert.equal(getCanonicalPath({ url: 'search?q=tools' }, origin), null);
});

test('Pakistan tools prioritize solar, quote-card and local utility links', () => {
  const data = [
    tool('Gold & Jewellery Calculator Pakistan', 'tools/gold-calculator-pakistan.html', 'Pakistan'),
    tool('Solar Bill Calculator', 'tools/solar-bill-calculator.html', 'Pakistan'),
    tool('Instant Quote Card Maker', 'tools/quote-card-maker.html', 'Creator & Social'),
    tool('Gold Rates', 'gold-rates.html', 'Live Information'),
    tool('Pakistan Salary Tax Calculator', 'salary-tax-calculator-pakistan.html', 'Pakistan Tools'),
    tool('Pakistan Zakat Calculator', 'zakat-calculator-pakistan.html', 'Pakistan Tools')
  ];
  const picks = selectRelatedTools(data, '/tools/gold-calculator-pakistan.html', { origin, limit: 4 });
  assert.equal(picks.length, 4);
  assert.deepEqual(picks.slice(0, 2).map(item => item.href), [
    '/tools/solar-bill-calculator.html',
    '/tools/quote-card-maker.html'
  ]);
  assert.ok(picks.every(item => item.href !== '/tools/gold-calculator-pakistan.html'));
});

test('US finance pages prioritize pay, bill-split and invoice tools', () => {
  const data = [
    tool('US Tip & Bill Splitter', 'tools/us-tip-bill-splitter.html', 'Money & Records'),
    tool('Hourly-to-Salary Calculator', 'tools/hourly-to-salary-calculator.html', 'Money & Records'),
    tool('Instant PDF Invoice Generator', 'tools/instant-pdf-invoice-generator.html', 'PDF & Documents'),
    tool('Invoice Maker', 'invoice-maker.html', 'Productivity'),
    tool('Bill Split & Tip Calculator', 'bill-split-tip-calculator.html', 'Calculators'),
    tool('JPG to PDF', 'jpg-to-pdf.html', 'PDF & Documents')
  ];
  const picks = selectRelatedTools(data, '/tools/us-tip-bill-splitter.html', { origin, limit: 4 });
  assert.deepEqual(picks.slice(0, 3).map(item => item.href), [
    '/tools/hourly-to-salary-calculator.html',
    '/tools/instant-pdf-invoice-generator.html',
    '/bill-split-tip-calculator.html'
  ]);
});

test('related grid selection excludes self, non-tools, duplicate paths and off-site URLs', () => {
  const data = [
    tool('Current page', 'tools/instant-pdf-invoice-generator.html', 'PDF & Documents'),
    tool('Image Compressor', 'image-compressor.html', 'Images'),
    tool('Duplicate title', 'image-compressor.html', 'Images'),
    { title: 'An article', url: 'articles/some-article.html', type: 'article', category: 'Article' },
    tool('External', 'https://example.com/tool.html', 'External'),
    tool('JPG to PDF', 'jpg-to-pdf.html', 'PDF & Documents'),
    tool('Calculator', 'calculator.html', 'Calculators'),
    tool('Text to PDF', 'text-to-pdf.html', 'PDF & Documents')
  ];
  const picks = selectRelatedTools(data, '/tools/instant-pdf-invoice-generator.html', { origin, limit: 4 });
  assert.equal(picks.length, 4);
  assert.equal(new Set(picks.map(item => item.href)).size, picks.length);
  assert.ok(picks.every(item => item.href.startsWith('/') && /\.html$/.test(item.href)));
  assert.ok(picks.every(item => item.href !== '/tools/instant-pdf-invoice-generator.html'));
});

test('general-tool recommendations are capped at four and deterministic per route', () => {
  const data = [
    tool('Image Compressor', 'image-compressor.html', 'Images'),
    tool('JPG to PDF', 'jpg-to-pdf.html', 'PDF & Documents'),
    tool('Document Workbench', 'document-workbench.html', 'PDF & Documents'),
    tool('Percentage Calculator', 'percentage-calculator.html', 'Calculators'),
    tool('Calculator', 'calculator.html', 'Calculators'),
    tool('YouTube Thumbnail Downloader', 'youtube-thumbnail-downloader.html', 'Images'),
    tool('Text to PDF', 'text-to-pdf.html', 'PDF & Documents'),
    tool('Currency Rates', 'currency-rates.html', 'Live Information')
  ];
  const first = selectRelatedTools(data, '/tools/some-general-tool.html', { origin, limit: 4 });
  const second = selectRelatedTools(data, '/tools/some-general-tool.html', { origin, limit: 4 });
  assert.equal(first.length, 4);
  assert.deepEqual(first.map(item => item.href), second.map(item => item.href));
});
