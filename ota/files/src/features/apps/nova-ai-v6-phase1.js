import { renderAI } from './discover-apps.js';

const V6_CONFIG_KEY = 'nexusnova_nova_ai_mobile_v1';
const HEALTH_TIMEOUT_MS = 10_000;
const CHAT_TIMEOUT_MS = 180_000;

function readV6Config() {
  try {
    const value = JSON.parse(localStorage.getItem(V6_CONFIG_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function normalizeEndpoint(raw) {
  const input = String(raw || '').trim();
  if (!input) throw new Error('Enter the PC V6 gateway HTTPS address first.');

  let url;
  try { url = new URL(input); }
  catch { throw new Error('Enter a valid V6 gateway URL.'); }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Use the plain gateway base URL without login, query or # fragment.');
  }
  const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) {
    throw new Error('Phone V6 connection requires HTTPS.');
  }

  const path = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${path === '/' ? '' : path}`;
}

function saveV6Config(endpoint, token) {
  const next = { ...readV6Config(), endpoint, token };
  localStorage.setItem(V6_CONFIG_KEY, JSON.stringify(next));
  return next;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Connection test timed out.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function safeJson(response) {
  try { return await response.json(); }
  catch { return {}; }
}

async function runSecureV6Test(endpoint, token) {
  const healthResponse = await fetchWithTimeout(`${endpoint}/health`, { method: 'GET' }, HEALTH_TIMEOUT_MS);
  const health = await safeJson(healthResponse);
  if (!healthResponse.ok) throw new Error(`Gateway health failed (HTTP ${healthResponse.status}).`);

  const chatResponse = await fetchWithTimeout(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-NexusNova-Token': token
    },
    body: JSON.stringify({
      message: 'NEXUSNOVA_V6_CONNECTION_TEST. Reply briefly that the connection is working.',
      mode: 'chat',
      history: [],
      app_context: 'NexusNova Fresh mobile V6 secure connection diagnostic. No GitHub write action requested.',
      connection_test: true
    })
  }, CHAT_TIMEOUT_MS);
  const chat = await safeJson(chatResponse);

  if (!chatResponse.ok) {
    const detail = String(chat?.error || chat?.message || '').trim();
    throw new Error(detail || `V6 request failed (HTTP ${chatResponse.status}).`);
  }
  const reply = String(chat?.reply || '').trim();
  if (!reply) throw new Error('V6 gateway returned no model reply.');

  return String(chat?.model || health?.model || health?.ollama?.model || 'V6').trim() || 'V6';
}

function mountV6Panel(root) {
  const saved = readV6Config();
  const panel = document.createElement('section');
  panel.className = 'nx-tool-card';
  panel.setAttribute('data-nova-v6-phase1', '');
  panel.innerHTML = `
    <div class="nx-list-card__head"><div><strong>PC V6 Secure Link</strong><p class="nx-tool-meta">Phase 1 connection test only. Normal Nova AI chat stays on Firebase until this test passes.</p></div></div>
    <label class="nx-field"><span>V6 gateway HTTPS address</span><input type="url" inputmode="url" autocomplete="off" data-v6-endpoint placeholder="https://your-secure-gateway.example"></label>
    <label class="nx-field"><span>Pairing token</span><input type="password" autocomplete="off" data-v6-token placeholder="Paste token from the PC gateway"></label>
    <div class="nx-action-row"><button class="nx-secondary" type="button" data-v6-save>SAVE V6 LINK</button><button class="nx-primary" type="button" data-v6-test>TEST SECURE V6</button></div>
    <p class="nx-tool-meta" data-v6-status>V6 chat routing is OFF until a successful secure test.</p>`;

  const endpointInput = panel.querySelector('[data-v6-endpoint]');
  const tokenInput = panel.querySelector('[data-v6-token]');
  const saveButton = panel.querySelector('[data-v6-save]');
  const testButton = panel.querySelector('[data-v6-test]');
  const status = panel.querySelector('[data-v6-status]');
  endpointInput.value = String(saved.endpoint || '');
  tokenInput.value = String(saved.token || '');

  const validateAndSave = () => {
    const endpoint = normalizeEndpoint(endpointInput.value);
    const token = String(tokenInput.value || '').trim();
    if (!token) throw new Error('Enter the V6 pairing token first.');
    endpointInput.value = endpoint;
    saveV6Config(endpoint, token);
    return { endpoint, token };
  };

  saveButton.addEventListener('click', () => {
    try {
      validateAndSave();
      status.textContent = 'V6 link saved on this device. Chat routing is still OFF.';
    } catch (error) {
      status.textContent = String(error?.message || error).slice(0, 240);
    }
  });

  testButton.addEventListener('click', async () => {
    if (testButton.disabled) return;
    let config;
    try { config = validateAndSave(); }
    catch (error) {
      status.textContent = String(error?.message || error).slice(0, 240);
      return;
    }

    testButton.disabled = true;
    saveButton.disabled = true;
    testButton.textContent = 'TESTING…';
    status.textContent = 'Checking gateway health, token request and real model reply…';
    try {
      const model = await runSecureV6Test(config.endpoint, config.token);
      status.textContent = `Secure V6 connected • ${model} • health + token request + model reply OK. Chat routing remains OFF for Phase 1.`;
    } catch (error) {
      status.textContent = `V6 test failed • ${String(error?.message || error || 'Connection failed.').slice(0, 240)}`;
    } finally {
      testButton.disabled = false;
      saveButton.disabled = false;
      testButton.textContent = 'TEST SECURE V6';
    }
  });

  root.appendChild(panel);
}

export function renderNovaAIV6Phase1() {
  const root = renderAI();
  mountV6Panel(root);
  return root;
}
