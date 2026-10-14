(function (global, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (global && global.document) api.mount(global);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function parseItems(value) {
    return String(value == null ? '' : value)
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function uniqueItems(items) {
    const seen = new Set();
    return items.filter(item => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
  }

  function randomIndex(length, cryptoProvider) {
    if (!Number.isSafeInteger(length) || length < 1 || length > 0x100000000) {
      throw new RangeError('The selection pool must contain between 1 and 2^32 entries.');
    }
    if (!cryptoProvider || typeof cryptoProvider.getRandomValues !== 'function') {
      throw new Error('Secure browser randomness is unavailable. Try an up-to-date HTTPS browser.');
    }

    // Rejection sampling avoids the tiny modulo bias caused by value % length.
    const range = 0x100000000;
    const cutoff = range - (range % length);
    const sample = new Uint32Array(1);
    do {
      cryptoProvider.getRandomValues(sample);
    } while (sample[0] >= cutoff);
    return sample[0] % length;
  }

  function eligibleItems(items, removeDuplicates) {
    const cleaned = (Array.isArray(items) ? items : [])
      .map(item => String(item == null ? '' : item).trim())
      .filter(Boolean);
    return removeDuplicates ? uniqueItems(cleaned) : cleaned;
  }

  function drawWithoutReplacement(items, count, removeDuplicates, cryptoProvider) {
    const pool = eligibleItems(items, removeDuplicates);
    if (!pool.length) throw new Error('Add at least one non-empty entry before drawing.');
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      throw new RangeError('Choose between 1 and 100 winners.');
    }
    if (count > pool.length) {
      throw new RangeError('You requested more winners than eligible entries. Reduce the count or add entries.');
    }

    const winners = [];
    while (winners.length < count) {
      winners.push(pool.splice(randomIndex(pool.length, cryptoProvider), 1)[0]);
    }
    return { winners, eligibleCount: eligibleItems(items, removeDuplicates).length };
  }

  function shuffleItems(items, removeDuplicates, cryptoProvider) {
    const shuffled = eligibleItems(items, removeDuplicates);
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = randomIndex(index + 1, cryptoProvider);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function mount(win) {
    const root = win.document.querySelector('[data-random-picker]');
    if (!root || root.dataset.randomPickerReady === 'true') return;
    root.dataset.randomPickerReady = 'true';

    const input = root.querySelector('#items');
    const countInput = root.querySelector('#winner-count');
    const dedupeInput = root.querySelector('#dedupe-items');
    const output = root.querySelector('#out');
    const pickButton = root.querySelector('#pick');
    const shuffleButton = root.querySelector('#shuffle');
    const cleanButton = root.querySelector('#clean-list');
    const copyButton = root.querySelector('#copy-winners');
    const clearButton = root.querySelector('#clear-list');
    let lastWinners = [];

    const options = () => eligibleItems(parseItems(input.value), dedupeInput.checked);
    const setMessage = message => {
      output.replaceChildren(win.document.createTextNode(message));
    };
    const clearPrevious = () => {
      lastWinners = [];
      copyButton.disabled = true;
      setMessage('List changed. Draw again to generate a fresh result.');
    };

    input.addEventListener('input', clearPrevious);
    dedupeInput.addEventListener('change', clearPrevious);
    countInput.addEventListener('input', clearPrevious);

    pickButton.addEventListener('click', () => {
      try {
        const requested = Number(countInput.value);
        const eligible = options();
        const result = drawWithoutReplacement(eligible, requested, false, win.crypto);
        lastWinners = result.winners.slice();
        copyButton.disabled = false;

        const heading = win.document.createElement('strong');
        heading.textContent = result.winners.length === 1 ? 'Selected winner:' : 'Selected winners:';
        const list = win.document.createElement('ol');
        result.winners.forEach(winner => {
          const item = win.document.createElement('li');
          item.textContent = winner;
          list.appendChild(item);
        });
        const summary = win.document.createElement('p');
        summary.textContent = result.winners.length + ' winner(s) drawn from ' + result.eligibleCount + ' eligible entr' + (result.eligibleCount === 1 ? 'y' : 'ies') + '. Each entry position can win once in this draw.';
        output.replaceChildren(heading, list, summary);
      } catch (error) {
        lastWinners = [];
        copyButton.disabled = true;
        setMessage(error && error.message ? error.message : 'The draw could not be completed. Check the list and try again.');
      }
    });

    shuffleButton.addEventListener('click', () => {
      try {
        const shuffled = shuffleItems(parseItems(input.value), dedupeInput.checked, win.crypto);
        input.value = shuffled.join('\n');
        clearPrevious();
        setMessage(shuffled.length ? 'List shuffled using secure browser randomness. Review it before drawing.' : 'Add at least one non-empty entry before shuffling.');
      } catch (error) {
        setMessage(error && error.message ? error.message : 'The list could not be shuffled.');
      }
    });

    cleanButton.addEventListener('click', () => {
      const cleaned = parseItems(input.value);
      input.value = cleaned.join('\n');
      clearPrevious();
      setMessage(cleaned.length ? 'Removed blank lines and trimmed each entry. Duplicates were left unchanged.' : 'Add at least one non-empty entry first.');
    });

    copyButton.addEventListener('click', async () => {
      if (!lastWinners.length) return;
      try {
        if (!win.navigator.clipboard || typeof win.navigator.clipboard.writeText !== 'function') {
          throw new Error('Clipboard access is unavailable in this browser. Select and copy the result manually.');
        }
        await win.navigator.clipboard.writeText(lastWinners.join('\n'));
        const summary = win.document.createElement('p');
        summary.textContent = 'Copied ' + lastWinners.length + ' winner(s).';
        output.appendChild(summary);
      } catch (error) {
        const summary = win.document.createElement('p');
        summary.textContent = error && error.message ? error.message : 'Copy failed. Select the result and copy it manually.';
        output.appendChild(summary);
      }
    });

    clearButton.addEventListener('click', () => {
      input.value = '';
      countInput.value = '1';
      dedupeInput.checked = false;
      lastWinners = [];
      copyButton.disabled = true;
      setMessage('Enter at least one item to begin.');
      input.focus();
    });
  }

  return { parseItems, uniqueItems, randomIndex, eligibleItems, drawWithoutReplacement, shuffleItems, mount };
});
