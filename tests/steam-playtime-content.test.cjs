const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('Steam playtime page distinguishes continuous days from average daily hours', () => {
  const html = fs.readFileSync('steam-playtime-calculator.html', 'utf8');

  assert.match(html, /<title>Steam Playtime Calculator: Hours, Days &amp; Averages<\/title>|<title>Steam Playtime Calculator: Hours, Days & Averages<\/title>/);
  assert.match(html, /Convert Steam hours into full days and average hours per day, week or month\./);
  assert.match(html, /Divide total playtime by 24 to convert hours into full days of continuous gameplay\./);
  assert.match(html, /full days of play = total hours ÷ 24/);
  assert.match(html, /average about 2\.74 hours a day/);
  assert.match(html, /averages about 1\.37 hours a day/);
  assert.match(html, /<strong>1,000 hours<\/strong><small>41\.67 full days<\/small>/);
  assert.match(html, /<strong>2,000 hours<\/strong><small>83\.33 full days<\/small>/);
  assert.match(html, /totalDays=h\/24/);
});

test('Steam playtime conversion FAQ is valid and present in structured data', () => {
  const html = fs.readFileSync('steam-playtime-calculator.html', 'utf8');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  assert.ok(blocks.length > 0, 'JSON-LD block should exist');

  const graph = blocks.map(block => JSON.parse(block[1])).flatMap(data =>
    Array.isArray(data['@graph']) ? data['@graph'] : [data]
  );
  const faq = graph.find(item => item['@type'] === 'FAQPage');
  assert.ok(faq, 'FAQPage structured data should exist');
  assert.ok(faq.mainEntity.some(item => item.name === 'How do I convert Steam hours to days?'));
});


test('Steam playtime calculator rejects an empty total while accepting explicit zero', () => {
  const html = fs.readFileSync('steam-playtime-calculator.html', 'utf8');
  const inlineScript = [...html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script>/gi)]
    .find((match) => !/\\bsrc\\s*=/.test(match[1]) &&
      !/application\\/ld\\+json/i.test(match[1]) &&
      /run\\.onclick/.test(match[2]));
  assert.ok(inlineScript, 'calculator inline script should exist');

  function execute(hoursValue) {
    const elements = {
      run: { onclick: null },
      'copy-result': { disabled: true, onclick: null },
      out: { textContent: '', innerHTML: '' },
      'copy-status': { textContent: '' },
      hours: { value: hoursValue },
      amount: { value: '365' },
      unit: { value: 'days' },
    };
    vm.runInNewContext(inlineScript[2], {
      document: {
        getElementById(id) {
          assert.ok(elements[id], 'unexpected DOM lookup: ' + id);
          return elements[id];
        },
      },
      localStorage: { getItem: () => null },
    });
    elements.run.onclick();
    return elements;
  }

  const empty = execute('');
  assert.match(empty.out.textContent, /Enter a total playtime value/i);
  assert.equal(empty['copy-result'].disabled, true);
  assert.doesNotMatch(empty.out.innerHTML, /0\\.00 total hours/);

  const explicitZero = execute('0');
  assert.match(explicitZero.out.innerHTML, /0\\.00 total hours/);
  assert.equal(explicitZero['copy-result'].disabled, false);
});
