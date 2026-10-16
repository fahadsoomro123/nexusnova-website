'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { computeWesternFinance, taxFor, simulatePayoff } = require('../assets/js/western-finance-tools.js');

const ROOT = path.resolve(__dirname, '..');

test('2026 US federal tax calculator applies progressive single-filer brackets', () => {
  const result = taxFor(100000, 'single');
  assert.equal(result.ok, true);
  assert.equal(result.tax, 16712);
  assert.equal(result.marginalRate, 0.22);
  assert.equal(Math.round(result.effectiveRate * 10000) / 100, 16.71);
});

test('tax calculator supports joint and head-of-household schedules and rejects invalid income', () => {
  assert.equal(taxFor(200000, 'joint').marginalRate, 0.22);
  assert.equal(taxFor(80000, 'head').marginalRate, 0.22);
  assert.equal(taxFor(-1, 'single').ok, false);
  assert.equal(taxFor(10000, 'unknown').ok, false);
});

test('amortization handles zero-interest loans and rejects payments that cannot reduce principal', () => {
  const zeroRate = simulatePayoff(1200, 0, 100);
  assert.equal(zeroRate.ok, true);
  assert.equal(zeroRate.months, 12);
  assert.equal(zeroRate.interest, 0);
  assert.equal(simulatePayoff(10000, 12, 50).ok, false);
});

test('mortgage payoff estimate shows lower interest and fewer months with extra principal', () => {
  const result = computeWesternFinance('mortgage-payoff', { balance: 200000, apr: 6, payment: 1500, extra: 200 });
  assert.equal(result.ok, true);
  assert.ok(result.accelerated.months < result.standard.months);
  assert.ok(result.interestSaved > 0);
});

test('loan payoff calculator validates input and compares extra-payment scenarios', () => {
  const result = computeWesternFinance('loan-payoff', { principal: 15000, apr: 11.5, payment: 360, extra: 50 });
  assert.equal(result.ok, true);
  assert.ok(result.monthsSaved > 0);
  assert.ok(result.interestSaved > 0);
  assert.equal(computeWesternFinance('loan-payoff', { principal: 15000, apr: 11.5, payment: 0, extra: 50 }).ok, false);
});

test('stock calculator includes order fees and dividends in its trade-level return', () => {
  const result = computeWesternFinance('stock-profit', { buyPrice: 100, sellPrice: 120, shares: 10, buyFees: 5, sellFees: 5, dividends: 20 });
  assert.equal(result.ok, true);
  assert.equal(result.cost, 1005);
  assert.equal(result.proceeds, 1215);
  assert.equal(result.profit, 210);
  assert.ok(result.breakEvenPrice > 100);
});

test('crypto calculator includes percentage fees and validates fee rates', () => {
  const result = computeWesternFinance('crypto-profit', { entryPrice: 100, exitPrice: 125, quantity: 2, buyFeePct: 0.1, sellFeePct: 0.1 });
  assert.equal(result.ok, true);
  assert.equal(result.cost, 200.2);
  assert.equal(result.proceeds, 249.75);
  assert.equal(result.profit, 49.55);
  assert.equal(computeWesternFinance('crypto-profit', { entryPrice: 100, exitPrice: 125, quantity: 2, buyFeePct: 0.1, sellFeePct: 100 }).ok, false);
  assert.equal(computeWesternFinance('crypto-profit', { entryPrice: 100, exitPrice: 125, quantity: 2, buyFeePct: 100, sellFeePct: 0.1 }).ok, false);
});

test('all five new finance tool pages have indexable canonicals, shared search integration and 250+ words of guidance', () => {
  const slugs = [
    'us-federal-tax-bracket-calculator',
    'mortgage-payoff-calculator',
    'loan-payoff-calculator',
    'stock-profit-calculator',
    'crypto-profit-calculator'
  ];
  const index = fs.readFileSync(path.join(ROOT, 'assets/js/search-core.js'), 'utf8');
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  for (const slug of slugs) {
    const url = 'tools/' + slug + '.html';
    const html = fs.readFileSync(path.join(ROOT, url), 'utf8');
    const editorial = html.match(/<section class="editorial-content"[^>]*>([\s\S]*?)<\/section>/i);
    assert.ok(editorial, url + ' needs a usage guide');
    const text = editorial[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
    const words = text.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’%-]*\b/gu) || [];
    assert.ok(words.length >= 250, url + ' has fewer than 250 editorial words: ' + words.length);
    assert.ok(html.includes('rel="canonical" href="https://nexusnovatools.com/' + url + '"'));
    assert.ok(html.includes('id="calculator-form"'));
    assert.ok(html.includes('id="result"'));
    assert.ok(html.includes('assets/js/search-core.js'));
    assert.ok(index.includes('url:"' + url + '"'));
    assert.ok(sitemap.includes('https://nexusnovatools.com/' + url), url + ' missing from sitemap');
  }
});
