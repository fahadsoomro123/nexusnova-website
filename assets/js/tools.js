(() => {
  const $ = (id) => document.getElementById(id);
  const number = (value) => Number.parseFloat(value);
  const fmt = (value, digits = 2) => Number.isFinite(value)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value)
    : '—';

  const calcDisplay = $('calc-display');
  if (calcDisplay) {
    let expression = '';
    const safeEval = (expr) => {
      if (!/^[0-9+\-*/().\s]+$/.test(expr)) throw new Error('Invalid');
      return Function(`"use strict"; return (${expr})`)();
    };
    document.querySelectorAll('[data-calc-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.calcKey;
        if (key === 'C') expression = '';
        else if (key === '⌫') expression = expression.slice(0, -1);
        else if (key === '=') {
          try {
            const value = safeEval(expression || '0');
            expression = Number.isFinite(value) ? String(value) : '';
          } catch { expression = ''; }
        } else expression += key;
        calcDisplay.value = expression || '0';
      });
    });
  }

  $('percent-run')?.addEventListener('click', () => {
    const pct = number($('percent-pct').value);
    const base = number($('percent-base').value);
    $('percent-result').textContent = Number.isFinite(pct) && Number.isFinite(base)
      ? `${fmt(pct)}% of ${fmt(base)} = ${fmt((pct / 100) * base, 6)}`
      : 'Enter valid numbers.';
  });

  const parseYmd = (value) => {
    const [y, m, d] = value.split('-').map(Number);
    return { y, m, d };
  };
  const utcDayNumber = ({ y, m, d }) => Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const clampDay = (y, m, d) => Math.min(d, daysInMonth(y, m));
  const compareYmd = (a, b) => utcDayNumber(a) - utcDayNumber(b);

  $('age-run')?.addEventListener('click', () => {
    const value = $('age-date').value;
    if (!value) return $('age-result').textContent = 'Choose your date of birth.';
    const dob = parseYmd(value);
    const now = new Date();
    const today = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
    if (compareYmd(dob, today) > 0) return $('age-result').textContent = 'Date of birth cannot be in the future.';
    let years = today.y - dob.y;
    const birthdayThisYear = { y: today.y, m: dob.m, d: clampDay(today.y, dob.m, dob.d) };
    if (compareYmd(today, birthdayThisYear) < 0) years -= 1;
    const anchorYear = dob.y + years;
    let anchor = { y: anchorYear, m: dob.m, d: clampDay(anchorYear, dob.m, dob.d) };
    let months = 0;
    while (months < 11) {
      const totalMonths = (anchor.m - 1) + 1;
      const y = anchor.y + Math.floor(totalMonths / 12);
      const m = (totalMonths % 12) + 1;
      const candidate = { y, m, d: clampDay(y, m, dob.d) };
      if (compareYmd(candidate, today) > 0) break;
      anchor = candidate;
      months += 1;
    }
    const days = utcDayNumber(today) - utcDayNumber(anchor);
    $('age-result').textContent = `${years} years, ${months} months, ${days} days`;
  });

  $('date-run')?.addEventListener('click', () => {
    const a = $('date-a').value, b = $('date-b').value;
    if (!a || !b) return $('date-result').textContent = 'Choose both dates.';
    const days = Math.abs(utcDayNumber(parseYmd(b)) - utcDayNumber(parseYmd(a)));
    $('date-result').textContent = `${fmt(days, 0)} day${days === 1 ? '' : 's'} apart`;
  });

  const unitGroups = {
    length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254, mi: 1609.344 },
    weight: { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.028349523125 }
  };
  const labels = { m:'Meter',km:'Kilometer',cm:'Centimeter',mm:'Millimeter',ft:'Foot',in:'Inch',mi:'Mile',kg:'Kilogram',g:'Gram',lb:'Pound',oz:'Ounce' };
  const fillUnits = () => {
    const type = $('unit-type')?.value;
    const from = $('unit-from'), to = $('unit-to');
    if (!type || !from || !to) return;
    const keys = type === 'temperature' ? ['c','f','k'] : Object.keys(unitGroups[type]);
    const tempLabels = {c:'Celsius',f:'Fahrenheit',k:'Kelvin'};
    const options = keys.map(k => `<option value="${k}">${labels[k] || tempLabels[k]}</option>`).join('');
    from.innerHTML = options; to.innerHTML = options;
    if (keys.length > 1) to.selectedIndex = 1;
  };
  $('unit-type')?.addEventListener('change', fillUnits);
  fillUnits();
  $('unit-run')?.addEventListener('click', () => {
    const type = $('unit-type').value, from = $('unit-from').value, to = $('unit-to').value;
    const val = number($('unit-value').value);
    if (!Number.isFinite(val)) return $('unit-result').textContent = 'Enter a valid value.';
    let out;
    if (type === 'temperature') {
      let c = from === 'c' ? val : from === 'f' ? (val - 32) * 5/9 : val - 273.15;
      out = to === 'c' ? c : to === 'f' ? c * 9/5 + 32 : c + 273.15;
    } else out = val * unitGroups[type][from] / unitGroups[type][to];
    $('unit-result').textContent = `${fmt(val, 6)} ${from.toUpperCase()} = ${fmt(out, 6)} ${to.toUpperCase()}`;
  });

  const updateTextStats = () => {
    const text = $('text-input')?.value || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const noSpaces = text.replace(/\s/g, '').length;
    const minutes = words ? Math.max(1, Math.ceil(words / 200)) : 0;
    if ($('text-result')) $('text-result').textContent = `${words} words • ${chars} characters • ${noSpaces} without spaces • ~${minutes} min read`;
  };
  $('text-input')?.addEventListener('input', updateTextStats);
  updateTextStats();

  const cryptoInt = (max) => {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
    return buf[0] % max;
  };
  $('pass-run')?.addEventListener('click', () => {
    const length = Math.min(64, Math.max(8, Number.parseInt($('pass-length').value || '16', 10)));
    let chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    if ($('pass-symbols').checked) chars += '!@#$%^&*()-_=+?';
    let out = '';
    for (let i = 0; i < length; i += 1) out += chars[cryptoInt(chars.length)];
    $('pass-result').textContent = out;
  });
  $('pass-copy')?.addEventListener('click', async () => {
    const text = $('pass-result').textContent.trim();
    if (!text || text.includes('Generate')) return;
    try { await navigator.clipboard.writeText(text); $('pass-copy').textContent = 'Copied'; setTimeout(() => $('pass-copy').textContent = 'Copy', 1200); } catch {}
  });

  $('split-run')?.addEventListener('click', () => {
    const bill = number($('split-bill').value);
    const tip = number($('split-tip').value);
    const people = Number.parseInt($('split-people').value, 10);
    if (!(bill >= 0) || !(tip >= 0) || !(people > 0)) return $('split-result').textContent = 'Enter valid values.';
    const total = bill * (1 + tip / 100);
    $('split-result').textContent = `Total ${fmt(total)} • Per person ${fmt(total / people)}`;
  });

  const note = $('quick-note');
  if (note) {
    const key = 'nexusnova_quick_note_v1';
    note.value = localStorage.getItem(key) || '';
    $('note-save')?.addEventListener('click', () => { localStorage.setItem(key, note.value); $('note-result').textContent = 'Saved on this device.'; });
    $('note-clear')?.addEventListener('click', () => { note.value = ''; localStorage.removeItem(key); $('note-result').textContent = 'Cleared.'; });
  }

  $('discount-run')?.addEventListener('click', () => {
    const price = number($('discount-price').value);
    const pct = number($('discount-pct').value);
    if (!(price >= 0) || !(pct >= 0 && pct <= 100)) return $('discount-result').textContent = 'Enter a valid price and a discount from 0 to 100%.';
    const saved = price * pct / 100;
    $('discount-result').textContent = `Final ${fmt(price - saved, 6)} • You save ${fmt(saved, 6)}`;
  });

  $('change-run')?.addEventListener('click', () => {
    const oldValue = number($('change-old').value);
    const newValue = number($('change-new').value);
    if (!Number.isFinite(oldValue) || !Number.isFinite(newValue)) return $('change-result').textContent = 'Enter both values.';
    if (oldValue === 0) return $('change-result').textContent = 'Starting value must be non-zero for percentage change.';
    const pct = ((newValue - oldValue) / Math.abs(oldValue)) * 100;
    const direction = pct > 0 ? 'increase' : pct < 0 ? 'decrease' : 'no change';
    $('change-result').textContent = `${fmt(Math.abs(pct), 6)}% ${direction}`;
  });

  $('storage-run')?.addEventListener('click', () => {
    const val = number($('storage-value').value);
    const baseSize = Number.parseInt($('storage-base').value, 10);
    const units = ['B','KB','MB','GB','TB'];
    const fromIndex = units.indexOf($('storage-from').value);
    const toIndex = units.indexOf($('storage-to').value);
    if (!(val >= 0) || ![1000,1024].includes(baseSize) || fromIndex < 0 || toIndex < 0) return $('storage-result').textContent = 'Enter a valid storage value.';
    const bytes = val * (baseSize ** fromIndex);
    const out = bytes / (baseSize ** toIndex);
    $('storage-result').textContent = `${fmt(val, 8)} ${units[fromIndex]} = ${fmt(out, 8)} ${units[toIndex]} (${baseSize} scale)`;
  });

  const minutesFromTime = (value) => {
    const [h,m] = value.split(':').map(Number);
    return h * 60 + m;
  };
  $('time-run')?.addEventListener('click', () => {
    const start = $('time-start').value, end = $('time-end').value;
    if (!start || !end) return $('time-result').textContent = 'Choose start and end times.';
    const startMin = minutesFromTime(start), endMin = minutesFromTime(end);
    let diff = endMin - startMin;
    if (diff < 0) diff += 1440;
    const hours = Math.floor(diff / 60), mins = diff % 60;
    $('time-result').textContent = `${hours} hour${hours === 1 ? '' : 's'} ${mins} minute${mins === 1 ? '' : 's'}`;
  });

  const sentenceCase = (text) => text.toLowerCase().replace(/(^\s*[a-z]|[.!?]\s+[a-z])/g, (m) => m.toUpperCase());
  const titleCase = (text) => text.toLowerCase().replace(/\b[\p{L}\p{N}]/gu, (m) => m.toUpperCase());
  document.querySelectorAll('[data-case]').forEach((btn) => btn.addEventListener('click', () => {
    const text = $('case-input').value;
    const mode = btn.dataset.case;
    const converted = mode === 'upper' ? text.toUpperCase() : mode === 'lower' ? text.toLowerCase() : mode === 'title' ? titleCase(text) : sentenceCase(text);
    $('case-output').value = converted;
  }));
  $('case-copy')?.addEventListener('click', async () => {
    const text = $('case-output').value;
    if (!text) return;
    try { await navigator.clipboard.writeText(text); $('case-copy').textContent = 'Copied'; setTimeout(() => $('case-copy').textContent = 'Copy result', 1200); } catch {}
  });

  $('picker-run')?.addEventListener('click', () => {
    const entries = $('picker-input').value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
    if (entries.length < 2) return $('picker-result').textContent = 'Add at least two non-empty options.';
    $('picker-result').textContent = entries[cryptoInt(entries.length)];
  });

  const clock = $('local-clock');
  if (clock) {
    const tick = () => {
      const d = new Date();
      clock.textContent = `${d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})} • ${d.toLocaleDateString([], {weekday:'long',year:'numeric',month:'long',day:'numeric'})}`;
    };
    tick();
    setInterval(tick, 1000);
  }
})();
