(() => {
  'use strict';

  const API_URL = window.NOVA_API_URL || 'https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/api/nova';
  const HISTORY_KEY = 'nexusnova:nova-context:v2';
  const MAX_HISTORY = 8;
  const prompt = document.getElementById('niPrompt');
  const result = document.getElementById('niResult');
  const buildButton = document.getElementById('niBuild');
  const surpriseButton = document.getElementById('niSurprise');
  const stateBadge = document.getElementById('niState');
  const modeButtons = [...document.querySelectorAll('[data-mode]')];
  const exampleButtons = [...document.querySelectorAll('[data-example]')];
  let busy = false;
  let activeMode = 'auto';

  const readHistory = () => {
    try {
      const value = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(value) ? value.slice(-MAX_HISTORY) : [];
    } catch (_) {
      return [];
    }
  };
  const writeHistory = history => {
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY))); } catch (_) {}
  };
  const record = (role, content) => {
    const clean = String(content || '').trim().slice(0, 3000);
    if (!clean) return;
    const history = readHistory();
    history.push({ role, content: clean });
    writeHistory(history);
  };

  function setState(text, className = '') {
    if (!stateBadge) return;
    stateBadge.textContent = text;
    stateBadge.className = `ni-state-badge ${className}`.trim();
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function addCard(parent, title, body) {
    const card = el('div', 'ni-result-card');
    card.append(el('h4', '', title), el('p', '', body));
    parent.append(card);
    return card;
  }

  function safeInternalLink(value) {
    try {
      const url = new URL(String(value || ''), location.origin);
      return url.origin === location.origin ? url.pathname + url.search + url.hash : '';
    } catch (_) { return ''; }
  }

  function render(data) {
    result.replaceChildren();
    const group = el('div', 'ni-understood');
    addCard(group, 'Nova', String(data.answer || 'I could not produce a safe response.').trim().slice(0, 8000));

    if (data.action?.href) {
      const href = safeInternalLink(data.action.href);
      if (href) {
        const action = el('div', 'ni-result-card ni-action-card');
        action.append(el('h4', '', 'Recommended next step'));
        const row = el('div', 'ni-action-row');
        const link = document.createElement('a');
        link.className = 'ni-action-link';
        link.href = href;
        link.textContent = String(data.action.label || 'Open NexusNova tool').slice(0, 160);
        row.append(link);
        action.append(row);
        group.append(action);
      }
    }

    if (Array.isArray(data.suggestedTools) && data.suggestedTools.length) {
      const card = el('div', 'ni-result-card');
      card.append(el('h4', '', 'Useful NexusNova options'));
      const row = el('div', 'ni-action-row');
      data.suggestedTools.slice(0, 6).forEach(item => {
        const href = safeInternalLink(item?.href);
        if (!href) return;
        const link = document.createElement('a');
        link.className = 'ni-action-link';
        link.href = href;
        link.textContent = String(item?.label || 'Open tool').slice(0, 160);
        row.append(link);
      });
      card.append(row);
      group.append(card);
    }

    if (Array.isArray(data.sources) && data.sources.length) {
      const sourceCard = el('div', 'ni-result-card');
      sourceCard.append(el('h4', '', 'Sources'));
      data.sources.slice(0, 8).forEach(source => {
        try {
          const url = new URL(String(source?.url || ''));
          if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
          const link = document.createElement('a');
          link.className = 'ni-source-link';
          link.href = url.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = String(source?.title || url.hostname).slice(0, 180);
          sourceCard.append(link);
        } catch (_) {}
      });
      if (sourceCard.querySelector('a')) group.append(sourceCard);
    }

    if (data.nextStep) addCard(group, 'Next step', String(data.nextStep).slice(0, 1200));
    result.append(group);
    setState(data.mode === 'clarify' ? 'CLARIFY' : data.mode === 'search' ? 'CHECKED' : data.mode === 'tool' ? 'ACTION' : 'DONE');
  }

  function renderFailure(message) {
    result.replaceChildren();
    const group = el('div', 'ni-understood');
    addCard(group, 'Nova is unavailable', message);
    addCard(group, 'Try this', 'Retry once. You can also use the connected NexusNova tools below without waiting for an AI response.');
    setState('RECOVERED');
    const history = readHistory();
    if (history.length) writeHistory(history);
  }

  async function ask() {
    if (busy) return;
    const message = String(prompt?.value || '').trim();
    if (!message) {
      result.replaceChildren();
      addCard(result, 'Tell Nova what you need', 'Describe the goal in your own words. Nova can handle normal questions, writing, explanations, current-information requests and NexusNova tool discovery.');
      setState('NEEDS INPUT');
      prompt?.focus();
      return;
    }

    busy = true;
    buildButton?.setAttribute('disabled', 'disabled');
    setState(activeMode === 'auto' ? 'THINKING…' : `THINKING • ${activeMode.toUpperCase()}…`);
    const history = readHistory();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ message, context: history, focus: activeMode })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.ok !== true) throw new Error('nova-response-unavailable');
      record('user', message);
      record('assistant', data.answer || data.nextStep || 'Nova completed the request.');
      render(data);
    } catch (_) {
      renderFailure('Nova could not reach its secure reasoning service right now. No fake answer was generated.');
    } finally {
      busy = false;
      buildButton?.removeAttribute('disabled');
    }
  }

  function setMode(mode) {
    activeMode = mode || 'auto';
    modeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === activeMode)));
    if (prompt && activeMode !== 'auto') prompt.setAttribute('data-focus', activeMode);
  }

  function surprise() {
    const options = [
      'Explain black holes like I am 12.',
      'Write a professional email asking for leave.',
      'Why is my website loading slowly?',
      'Bhai 27 ko 14 se multiply karo.',
      'What can NexusNova do?'
    ];
    prompt.value = options[Math.floor(Math.random() * options.length)];
    prompt.focus();
    ask();
  }

  modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  exampleButtons.forEach(button => button.addEventListener('click', () => { prompt.value = button.dataset.example || ''; prompt.focus(); }));
  buildButton?.addEventListener('click', ask);
  surpriseButton?.addEventListener('click', surprise);
  prompt?.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); ask(); }
  });

  renderFailure('Ready. Tell Nova what you are trying to accomplish, and it will choose the safest useful path.');
})();
