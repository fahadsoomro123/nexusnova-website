/* NexusNova auth Turnstile v1
   Email/password form guard. Turnstile tokens are verified by the Cloudflare
   Worker before the existing Firebase auth submit handler is allowed to run.
   No secret is present in this file. */
(() => {
  'use strict';

  const BACKEND = 'https://nexusnova-telegram-bot.fahadsoomro123.workers.dev';
  const CONFIG_ENDPOINT = `${BACKEND}/api/auth/security-config`;
  const VERIFY_ENDPOINT = `${BACKEND}/api/auth/turnstile/verify`;
  const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  const REQUEST_TIMEOUT_MS = 10000;

  const form = document.querySelector('[data-account-form]');
  const panel = document.querySelector('[data-auth-human-check]');
  const widgetHost = document.querySelector('[data-turnstile-widget]');
  const note = document.querySelector('[data-turnstile-note]');
  const status = document.querySelector('[data-status]');
  if (!form || !panel || !widgetHost) return;

  let configuration = null;
  let configurationError = null;
  let token = '';
  let widgetId = null;
  let guardBusy = false;
  let passThroughOnce = false;

  function setStatus(message, kind = '') {
    if (!status) return;
    status.textContent = message;
    if (kind) status.dataset.kind = kind;
    else delete status.dataset.kind;
  }

  function setNote(message, kind = '') {
    if (!note) return;
    note.textContent = message;
    if (kind) note.dataset.kind = kind;
    else delete note.dataset.kind;
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, {
        ...options,
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async function loadConfiguration() {
    try {
      const response = await fetchWithTimeout(CONFIG_ENDPOINT, {
        headers: { Accept: 'application/json' }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.ok !== true) {
        throw new Error(result?.error || `Security configuration failed (${response.status}).`);
      }
      configuration = {
        enabled: result.enabled === true,
        siteKey: String(result.siteKey || '').trim(),
        action: String(result.action || 'auth').trim() || 'auth'
      };
      configurationError = null;
      return configuration;
    } catch (error) {
      configurationError = error;
      console.warn('[NexusNova Turnstile config]', error?.message || error);
      throw error;
    }
  }

  function loadTurnstileScript() {
    if (window.turnstile?.render) return Promise.resolve(window.turnstile);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-nexusnova-turnstile]');
      if (existing) {
        const ready = () => window.turnstile?.render
          ? resolve(window.turnstile)
          : reject(new Error('Turnstile did not initialize.'));
        existing.addEventListener('load', ready, { once: true });
        existing.addEventListener('error', () => reject(new Error('Turnstile script failed to load.')), { once: true });
        setTimeout(() => window.turnstile?.render && resolve(window.turnstile), 0);
        return;
      }

      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.defer = true;
      script.async = true;
      script.dataset.nexusnovaTurnstile = '1';
      script.onload = () => window.turnstile?.render
        ? resolve(window.turnstile)
        : reject(new Error('Turnstile did not initialize.'));
      script.onerror = () => reject(new Error('Turnstile script failed to load.'));
      document.head.appendChild(script);
    });
  }

  function resetWidget() {
    token = '';
    if (widgetId !== null && window.turnstile?.reset) {
      try { window.turnstile.reset(widgetId); } catch (_) {}
    }
  }

  async function mountWidget(config) {
    if (!config?.enabled) {
      panel.hidden = true;
      return;
    }
    if (!config.siteKey) throw new Error('Turnstile site key is missing.');

    panel.hidden = false;
    panel.dataset.state = 'loading';
    setNote('Preparing secure bot protection…');
    const turnstile = await loadTurnstileScript();

    widgetId = turnstile.render(widgetHost, {
      sitekey: config.siteKey,
      action: config.action,
      theme: 'auto',
      size: 'flexible',
      callback(value) {
        token = String(value || '').trim();
        panel.dataset.state = token ? 'ready' : 'waiting';
        setNote(token ? 'Security check ready.' : 'Complete the security check to continue.', token ? 'good' : '');
      },
      'expired-callback'() {
        token = '';
        panel.dataset.state = 'waiting';
        setNote('Security check expired. Complete it again.');
      },
      'timeout-callback'() {
        token = '';
        panel.dataset.state = 'waiting';
        setNote('Security check timed out. Try again.');
      },
      'error-callback'() {
        token = '';
        panel.dataset.state = 'error';
        setNote('Bot protection could not load. Check your connection and retry.', 'error');
      }
    });
  }

  async function verifyToken(config) {
    const email = String(form.elements?.email?.value || '').trim().toLowerCase().slice(0, 320);
    const response = await fetchWithTimeout(VERIFY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ token, action: config.action, email })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.ok !== true || result?.verified !== true) {
      const error = new Error(result?.error || 'Security verification failed.');
      error.code = result?.code || `http-${response.status}`;
      throw error;
    }

    const disposable = result?.emailRisk?.checked === true && result?.emailRisk?.disposable === true;
    form.dataset.emailRisk = disposable ? 'disposable' : 'clear';
    form.dataset.emailRiskReason = String(result?.emailRisk?.reason || '').slice(0, 80);
    return result;
  }

  const configurationPromise = loadConfiguration()
    .then(async config => {
      if (config.enabled) await mountWidget(config);
      return config;
    })
    .catch(error => {
      panel.hidden = false;
      panel.dataset.state = 'error';
      setNote('Secure bot protection is temporarily unavailable. Please retry shortly.', 'error');
      return null;
    });

  form.addEventListener('submit', async event => {
    if (passThroughOnce) {
      passThroughOnce = false;
      queueMicrotask(resetWidget);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    if (guardBusy) return;
    guardBusy = true;

    try {
      const config = configuration || await configurationPromise;
      if (!config) {
        throw configurationError || new Error('Security service is unavailable.');
      }

      if (!config.enabled) {
        passThroughOnce = true;
        guardBusy = false;
        form.requestSubmit();
        return;
      }

      if (!token) {
        panel.dataset.state = 'waiting';
        setNote('Complete the security check to continue.');
        setStatus('Complete the secure bot check before continuing.', 'error');
        return;
      }

      panel.dataset.state = 'verifying';
      setNote('Verifying securely with Cloudflare…');
      await verifyToken(config);
      panel.dataset.state = 'verified';
      setNote('Security check verified.', 'good');

      passThroughOnce = true;
      guardBusy = false;
      form.requestSubmit();
    } catch (error) {
      console.warn('[NexusNova Turnstile verify]', error?.code || error?.message || error);
      resetWidget();
      panel.dataset.state = 'error';
      setNote(error?.message || 'Security verification failed. Please retry.', 'error');
      setStatus(error?.code === 'too-many-requests'
        ? 'Too many attempts. Wait briefly and try again.'
        : 'Security verification failed. Please complete the check again.', 'error');
    } finally {
      guardBusy = false;
    }
  }, true);
})();
