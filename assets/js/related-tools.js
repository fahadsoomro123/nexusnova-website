(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NexusNovaRelatedTools = api;
  if (!root || typeof document === 'undefined') return;

  const start = () => api.render(document, root);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';

  const DEFAULT_ORIGIN = 'https://nexusnovatools.com';
  const POPULAR_PATHS = [
    'image-compressor.html',
    'jpg-to-pdf.html',
    'document-workbench.html',
    'percentage-calculator.html',
    'calculator.html',
    'youtube-thumbnail-downloader.html',
    'text-to-pdf.html',
    'currency-rates.html',
    'invoice-maker.html',
    'tools/quote-card-maker.html'
  ];

  const ROUTE_PRIORITIES = {
    '/tools/gold-calculator-pakistan.html': [
      'tools/solar-bill-calculator.html',
      'tools/quote-card-maker.html',
      'gold-rates.html',
      'salary-tax-calculator-pakistan.html',
      'zakat-calculator-pakistan.html',
      'electricity-bill-calculator-pakistan.html'
    ],
    '/tools/solar-bill-calculator.html': [
      'tools/gold-calculator-pakistan.html',
      'tools/quote-card-maker.html',
      'electricity-bill-calculator-pakistan.html',
      'gold-rates.html',
      'currency-rates.html'
    ],
    '/tools/quote-card-maker.html': [
      'short-form-video-hook-generator.html',
      'youtube-thumbnail-downloader.html',
      'image-compressor.html',
      'tools/solar-bill-calculator.html',
      'tools/gold-calculator-pakistan.html'
    ],
    '/tools/us-tip-bill-splitter.html': [
      'tools/hourly-to-salary-calculator.html',
      'tools/instant-pdf-invoice-generator.html',
      'bill-split-tip-calculator.html',
      'invoice-maker.html',
      'freelance-rate-calculator.html'
    ],
    '/tools/hourly-to-salary-calculator.html': [
      'tools/us-tip-bill-splitter.html',
      'tools/instant-pdf-invoice-generator.html',
      'freelance-rate-calculator.html',
      'invoice-maker.html',
      'bill-split-tip-calculator.html'
    ],
    '/tools/instant-pdf-invoice-generator.html': [
      'tools/hourly-to-salary-calculator.html',
      'tools/us-tip-bill-splitter.html',
      'invoice-maker.html',
      'document-workbench.html',
      'jpg-to-pdf.html',
      'freelance-rate-calculator.html'
    ]
  };

  function normalizePath(path) {
    if (typeof path !== 'string' || !path.trim()) return null;
    try {
      const parsed = new URL(path, DEFAULT_ORIGIN + '/');
      return parsed.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
    } catch (_) {
      return null;
    }
  }

  function getCanonicalPath(entry, origin) {
    const raw = typeof entry === 'string' ? entry : entry && entry.url;
    if (typeof raw !== 'string' || !raw.trim()) return null;
    try {
      const base = (typeof origin === 'string' && origin) ? origin : DEFAULT_ORIGIN;
      const site = new URL(base);
      const resolved = new URL(raw, site.origin + '/');
      if (resolved.origin !== site.origin) return null;
      if (resolved.protocol !== 'https:' && resolved.protocol !== 'http:') return null;
      if (!/\.html$/i.test(resolved.pathname)) return null;
      return resolved.pathname.replace(/\/{2,}/g, '/');
    } catch (_) {
      return null;
    }
  }

  function isToolPage(data, currentPath, options) {
    const settings = options || {};
    const origin = settings.origin || DEFAULT_ORIGIN;
    const activePath = normalizePath(currentPath);
    if (!activePath || !Array.isArray(data)) return false;
    return data.some(item =>
      item && item.type === 'tool' && getCanonicalPath(item, origin) === activePath
    );
  }

  function hash(value) {
    let result = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      result ^= value.charCodeAt(i);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function routePriorityPaths(currentPath, origin) {
    return (ROUTE_PRIORITIES[currentPath] || [])
      .map(path => getCanonicalPath({ url: path }, origin))
      .filter(Boolean);
  }

  function scoreCandidate(entry, current, currentPath) {
    const category = String(entry.category || '').toLowerCase();
    const title = String(entry.title || '').toLowerCase();
    const path = getCanonicalPath(entry) || '';
    const isPakistan = /pakistan|gold-calculator-pakistan|solar-bill-calculator/i.test(
      String(current.category || '') + ' ' + String(current.title || '') + ' ' + currentPath
    );
    const isFinance = !isPakistan && /money|records|salary|paycheck|invoice|tip|finance/i.test(
      String(current.category || '') + ' ' + String(current.title || '') + ' ' + currentPath
    );
    const isPdf = !isFinance && /pdf|documents/i.test(String(current.category || '') + ' ' + currentPath);
    const isCreator = /creator|social/i.test(String(current.category || '') + ' ' + currentPath);
    let score = 0;

    if (isPakistan) {
      if (/^pakistan/.test(category) || category === 'pakistan tools') score += 14;
      if (/gold|solar|electricity|zakat|fbr|tax|currency|fuel/.test(title)) score += 8;
      if (category === 'live information') score += 5;
      if (category === 'creator & social') score += 2;
    } else if (isFinance) {
      if (/money|records/.test(category)) score += 14;
      if (/pdf|documents/.test(category)) score += 10;
      if (/invoice|salary|tip|bill split|freelance|tax|payment/.test(title)) score += 7;
      if (/calculators/.test(category)) score += 4;
    } else if (isPdf) {
      if (/pdf|documents/.test(category)) score += 14;
      if (/invoice|document|pdf/.test(title)) score += 7;
      if (/productivity|money|records/.test(category)) score += 4;
    } else if (isCreator) {
      if (/creator|social/.test(category)) score += 14;
      if (/image/.test(category)) score += 8;
    } else {
      if (category && category === String(current.category || '').toLowerCase()) score += 5;
    }

    const ignoredTags = new Set(['tool', 'utility', 'free', 'online']);
    const currentTags = new Set(
      (Array.isArray(current.tags) ? current.tags : [])
        .map(tag => String(tag).trim().toLowerCase())
        .filter(tag => tag && !ignoredTags.has(tag))
    );
    const sharedTags = (Array.isArray(entry.tags) ? entry.tags : [])
      .map(tag => String(tag).trim().toLowerCase())
      .filter(tag => tag && !ignoredTags.has(tag) && currentTags.has(tag));
    score += Math.min(sharedTags.length * 2, 10);

    const popularIndex = POPULAR_PATHS.map(pathValue => getCanonicalPath({ url: pathValue })).indexOf(path);
    if (!isPakistan && !isFinance && !isPdf && !isCreator && popularIndex >= 0) score += 18;
    return score;
  }

  function selectRelatedTools(data, currentPath, options) {
    const settings = options || {};
    const origin = settings.origin || DEFAULT_ORIGIN;
    const limit = Math.max(3, Math.min(4, Number(settings.limit) || 4));
    const activePath = normalizePath(currentPath);
    if (!activePath || !Array.isArray(data)) return [];

    const candidates = [];
    const byPath = new Map();
    for (const item of data) {
      if (!item || item.type !== 'tool' || typeof item.title !== 'string') continue;
      const path = getCanonicalPath(item, origin);
      if (!path || path === activePath || byPath.has(path)) continue;
      const normalized = Object.assign({}, item, { href: path });
      byPath.set(path, normalized);
      candidates.push(normalized);
    }

    const current = data.find(item =>
      item && item.type === 'tool' && getCanonicalPath(item, origin) === activePath
    ) || { title: '', category: '' };

    const result = [];
    const included = new Set();
    const add = item => {
      if (!item || result.length >= limit || included.has(item.href)) return;
      included.add(item.href);
      result.push(item);
    };

    for (const path of routePriorityPaths(activePath, origin)) add(byPath.get(path));

    const sorted = candidates
      .filter(item => !included.has(item.href))
      .map(item => ({
        item,
        score: scoreCandidate(item, current, activePath),
        tie: hash(activePath + '|' + item.href)
      }))
      .sort((a, b) => b.score - a.score || a.tie - b.tie);

    sorted.forEach(candidate => add(candidate.item));

    return result.slice(0, limit);
  }

  function injectStyles(doc) {
    if (doc.querySelector('[data-nexusnova-related-tools-style]')) return;
    const style = doc.createElement('style');
    style.dataset.nexusnovaRelatedToolsStyle = '';
    style.textContent = [
      '.nn-related-tools{margin:28px 0 32px;padding:clamp(18px,2.5vw,26px);border:1px solid #e2e8f0;border-radius:18px;background:#fff;color:#0f172a;box-shadow:0 8px 24px rgba(15,23,42,.045)}',
      '.nn-related-tools__heading{margin:0 0 6px;color:#0f172a;font-size:clamp(1.35rem,2.8vw,1.7rem);line-height:1.25}',
      '.nn-related-tools__intro{margin:0 0 16px;color:#475569;line-height:1.65}',
      '.nn-related-tools__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}',
      '.nn-related-tools__card{display:flex;min-width:0;flex-direction:column;gap:8px;padding:16px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;color:#0f172a;text-decoration:none;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}',
      '.nn-related-tools__card:hover{transform:translateY(-2px);border-color:#cbd5e1;box-shadow:0 10px 22px rgba(15,23,42,.08)}',
      '.nn-related-tools__card:focus-visible{outline:3px solid #93c5fd;outline-offset:3px}',
      '.nn-related-tools__category{color:#64748b;font-size:.75rem;font-weight:700;letter-spacing:.02em}',
      '.nn-related-tools__title{margin:0;color:#0f172a;font-size:1rem;line-height:1.4;overflow-wrap:anywhere}',
      '.nn-related-tools__action{margin-top:auto;color:#334155;font-size:.85rem;font-weight:800}',
      '@media(max-width:900px){.nn-related-tools__grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
      '@media(max-width:560px){.nn-related-tools__grid{grid-template-columns:1fr}.nn-related-tools__card{min-height:0}}',
      '@media(prefers-reduced-motion:reduce){.nn-related-tools__card{transition:none}.nn-related-tools__card:hover{transform:none}}'
    ].join('');
    doc.head.appendChild(style);
  }

  function render(doc, win) {
    if (!doc || !win || !win.location || !win.NexusNovaSearchData) return null;
    const activePath = normalizePath(win.location.pathname);
    if (!activePath) return null;
    if (doc.querySelector('[data-nexusnova-related-tools]')) return null;
    const main = doc.querySelector('main');
    if (!main) return null;

    const canonical = doc.querySelector('link[rel="canonical"]');
    const canonicalPath = canonical ? getCanonicalPath({ url: canonical.href }, win.location.origin) : null;
    const route = canonicalPath || activePath;
    if (!isToolPage(win.NexusNovaSearchData, route, { origin: win.location.origin })) return null;
    const entries = selectRelatedTools(win.NexusNovaSearchData, route, {
      origin: win.location.origin,
      limit: 4
    });
    if (entries.length < 3) return null;

    const section = doc.createElement('section');
    section.className = 'nn-related-tools';
    section.dataset.nexusnovaRelatedTools = '';
    section.setAttribute('aria-labelledby', 'nn-related-tools-heading');

    const heading = doc.createElement('h2');
    heading.id = 'nn-related-tools-heading';
    heading.className = 'nn-related-tools__heading';
    heading.textContent = 'You May Also Like';
    section.appendChild(heading);

    const intro = doc.createElement('p');
    intro.className = 'nn-related-tools__intro';
    intro.textContent = 'Explore a few related free tools for your next task.';
    section.appendChild(intro);

    const grid = doc.createElement('div');
    grid.className = 'nn-related-tools__grid';
    entries.forEach(entry => {
      const card = doc.createElement('a');
      card.className = 'nn-related-tools__card';
      card.href = entry.href;
      const category = doc.createElement('span');
      category.className = 'nn-related-tools__category';
      category.textContent = entry.category || 'Free utility';
      const title = doc.createElement('h3');
      title.className = 'nn-related-tools__title';
      title.textContent = entry.title;
      const action = doc.createElement('span');
      action.className = 'nn-related-tools__action';
      action.textContent = 'Open tool →';
      card.append(category, title, action);
      grid.appendChild(card);
    });
    section.appendChild(grid);
    injectStyles(doc);
    main.appendChild(section);
    return section;
  }

  return Object.freeze({ getCanonicalPath, isToolPage, selectRelatedTools, render });
});
