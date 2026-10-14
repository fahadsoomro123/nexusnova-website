const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { slug, sources, makeUrl } = require('../assets/js/pakistan-jobs-finder.js');

test('National Jobs Portal opens its official job-search form', () => {
  assert.equal(sources.government.url, 'https://www.njp.gov.pk/jobs/search');
  // Its protected search form is not falsely represented as prefilled.
  assert.equal(makeUrl('government', 'teacher', 'Karachi'), 'https://www.njp.gov.pk/jobs/search');
});

test('ROZEE receives an entered keyword in its supported search path', () => {
  assert.equal(
    makeUrl('rozee', 'Software Engineer'),
    'https://www.rozee.pk/search/Software-Engineer'
  );
  assert.equal(
    makeUrl('rozee', '', 'Karachi'),
    'https://www.rozee.pk/'
  );
});

test('Mustakbil uses its Pakistan jobs page and supported city path', () => {
  assert.equal(
    makeUrl('mustakbil', 'teacher', ''),
    'https://www.mustakbil.com/jobs/pakistan'
  );
  assert.equal(
    makeUrl('mustakbil', 'teacher', 'Karachi'),
    'https://www.mustakbil.com/jobs/pakistan/karachi'
  );
  assert.equal(
    makeUrl('mustakbil', '', 'Tando Muhammad Khan'),
    'https://www.mustakbil.com/jobs/pakistan/tando-muhammad-khan'
  );
});

test('city slugging trims whitespace and avoids empty path segments', () => {
  assert.equal(slug('  Tando Muhammad Khan  '), 'tando-muhammad-khan');
  assert.equal(slug(''), '');
});

test('unknown source keys do not produce invented destinations', () => {
  assert.equal(makeUrl('unlisted-source', 'teacher', 'Karachi'), '');
});

test('page copy discloses when search fields must be entered on the source portal', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'pakistan-jobs-finder.html'), 'utf8');
  assert.match(html, /Keywords are passed to ROZEE/);
  assert.match(html, /enter them there/);
  assert.match(html, /https:\/\/www\.njp\.gov\.pk\/jobs\/search/);
  assert.match(html, /https:\/\/www\.mustakbil\.com\/jobs\/pakistan/);
});
