const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('age-calculator.html', 'utf8');
assert.match(html, /const parseCivilDate=value=>/);
assert.match(html, /Date\.UTC\(year,month-1,day\)/);
assert.match(html, /const days=\(a\.utc-b\.utc\)\/86400000/);
assert.doesNotMatch(html, /new Date\(document\.getElementById\('birth'\)\.value\+'T00:00:00'\)/);

function parseCivilDate(value) {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isInteger(n))) return null;
  const [year, month, day] = parts;
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month: month - 1, day, utc };
}

const cases = [
  ['2000-01-01', '2001-01-01', 366],
  ['2024-02-29', '2025-02-28', 365],
  ['2024-03-09', '2024-03-10', 1],
  ['2024-03-10', '2024-03-11', 1],
];
for (const [birth, asof, expectedDays] of cases) {
  const b = parseCivilDate(birth);
  const a = parseCivilDate(asof);
  assert.ok(b && a);
  assert.equal((a.utc - b.utc) / 86400000, expectedDays);
}

assert.equal(parseCivilDate('2025-02-29'), null);
assert.equal(parseCivilDate('2024-02-30'), null);
console.log('Age calculator timezone/date validation tests passed.');
