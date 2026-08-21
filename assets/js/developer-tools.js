(() => {
  const $ = (id) => document.getElementById(id);
  const status = (id, text) => { const el = $(id); if (el) el.textContent = text; };

  const copyText = async (text, statusId) => {
    if (!text) return status(statusId, 'Nothing to copy yet.');
    try {
      await navigator.clipboard.writeText(text);
      status(statusId, 'Copied to clipboard.');
    } catch {
      status(statusId, 'Copy was blocked by the browser. Select the result and copy manually.');
    }
  };

  if ($('json-input')) {
    $('json-format')?.addEventListener('click', () => {
      const raw = $('json-input').value.trim();
      if (!raw) return status('json-status', 'Paste JSON first.');
      try {
        const value = JSON.parse(raw);
        $('json-output').value = JSON.stringify(value, null, 2);
        status('json-status', 'Valid JSON • formatted with 2-space indentation.');
      } catch (error) {
        $('json-output').value = '';
        status('json-status', `Invalid JSON • ${error.message}`);
      }
    });
    $('json-minify')?.addEventListener('click', () => {
      const raw = $('json-input').value.trim();
      if (!raw) return status('json-status', 'Paste JSON first.');
      try {
        $('json-output').value = JSON.stringify(JSON.parse(raw));
        status('json-status', 'Valid JSON • minified.');
      } catch (error) {
        $('json-output').value = '';
        status('json-status', `Invalid JSON • ${error.message}`);
      }
    });
    $('json-copy')?.addEventListener('click', () => copyText($('json-output').value, 'json-status'));
  }

  const bytesToBinary = (bytes) => {
    let out = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) out += String.fromCharCode(...bytes.subarray(i, i + chunk));
    return out;
  };
  const binaryToBytes = (binary) => Uint8Array.from(binary, (ch) => ch.charCodeAt(0));

  if ($('base64-input')) {
    $('base64-encode')?.addEventListener('click', () => {
      const text = $('base64-input').value;
      if (!text) return status('base64-status', 'Enter text first.');
      try {
        const bytes = new TextEncoder().encode(text);
        $('base64-output').value = btoa(bytesToBinary(bytes));
        status('base64-status', 'Encoded as UTF-8 Base64.');
      } catch {
        status('base64-status', 'Could not encode this value.');
      }
    });
    $('base64-decode')?.addEventListener('click', () => {
      const raw = $('base64-input').value.trim().replace(/\s+/g, '');
      if (!raw) return status('base64-status', 'Enter Base64 first.');
      try {
        const bytes = binaryToBytes(atob(raw));
        $('base64-output').value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        status('base64-status', 'Decoded as UTF-8 text.');
      } catch {
        $('base64-output').value = '';
        status('base64-status', 'Invalid Base64 or the decoded bytes are not valid UTF-8 text.');
      }
    });
    $('base64-copy')?.addEventListener('click', () => copyText($('base64-output').value, 'base64-status'));
  }

  if ($('url-input')) {
    $('url-encode')?.addEventListener('click', () => {
      const text = $('url-input').value;
      if (!text) return status('url-status', 'Enter text or a URL component first.');
      $('url-output').value = encodeURIComponent(text);
      status('url-status', 'Encoded with encodeURIComponent.');
    });
    $('url-decode')?.addEventListener('click', () => {
      const text = $('url-input').value;
      if (!text) return status('url-status', 'Enter encoded text first.');
      try {
        $('url-output').value = decodeURIComponent(text);
        status('url-status', 'Decoded successfully.');
      } catch {
        $('url-output').value = '';
        status('url-status', 'Invalid percent-encoded input.');
      }
    });
    $('url-copy')?.addEventListener('click', () => copyText($('url-output').value, 'url-status'));
  }

  const uuidV4 = () => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10).join('')}`;
  };

  if ($('uuid-output')) {
    $('uuid-run')?.addEventListener('click', () => {
      const count = Math.max(1, Math.min(50, Math.floor(Number($('uuid-count').value) || 1)));
      $('uuid-count').value = count;
      $('uuid-output').value = Array.from({ length: count }, uuidV4).join('\n');
      status('uuid-status', `${count} UUID v4 value${count === 1 ? '' : 's'} generated with browser cryptographic randomness.`);
    });
    $('uuid-copy')?.addEventListener('click', () => copyText($('uuid-output').value, 'uuid-status'));
  }

  if ($('hash-input')) {
    $('hash-run')?.addEventListener('click', async () => {
      const text = $('hash-input').value;
      if (!text) return status('hash-status', 'Enter text first.');
      if (!crypto.subtle) return status('hash-status', 'Web Crypto is unavailable in this browser context.');
      try {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        $('hash-output').value = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
        status('hash-status', 'SHA-256 digest generated locally.');
      } catch {
        status('hash-status', 'Could not generate the digest.');
      }
    });
    $('hash-copy')?.addEventListener('click', () => copyText($('hash-output').value, 'hash-status'));
  }
})();
