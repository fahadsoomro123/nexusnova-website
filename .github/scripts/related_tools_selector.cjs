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
    '/tools/us-federal-tax-bracket-calculator.html': [
      'tools/mortgage-payoff-calculator.html',
      'tools/loan-payoff-calculator.html',
      'tools/stock-profit-calculator.html',
      'tools/crypto-profit-calculator.html'
    ],
    '/tools/mortgage-payoff-calculator.html': [
      'tools/loan-payoff-calculator.html',
      'tools/us-federal-tax-bracket-calculator.html',
      'tools/stock-profit-calculator.html',
      'tools/crypto-profit-calculator.html'
    ],
    '/tools/loan-payoff-calculator.html': [
      'tools/mortgage-payoff-calculator.html',
      'tools/us-federal-tax-bracket-calculator.html',
      'tools/stock-profit-calculator.html',
      'tools/crypto-profit-calculator.html'
    ],
    '/tools/stock-profit-calculator.html': [
      'tools/crypto-profit-calculator.html',
      'tools/us-federal-tax-bracket-calculator.html',
      'tools/mortgage-payoff-calculator.html',
      'tools/loan-payoff-calculator.html'
    ],
    '/tools/crypto-profit-calculator.html': [
      'tools/stock-profit-calculator.html',
      'tools/us-federal-tax-bracket-calculator.html',
      'tools/mortgage-payoff-calculator.html',
      'tools/loan-payoff-calculator.html'
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

    const ignoredTags = new Set(['tool', 'tools', 'utility', 'free', 'online', 'category', 'hub', 'article', 'articles', 'guide', 'guides', 'the', 'and', 'for', 'with']);
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
    if (entry.category && current.category && !/^(articles?|guides?|category)$/i.test(current.category) &&
        String(entry.category).toLowerCase() === String(current.category).toLowerCase()) score += 6;
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

    const current = settings.currentEntry || data.find(item =>
      item && getCanonicalPath(item, origin) === activePath
    ) || { title: '', category: '', tags: [] };

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


  function getPageContext(data, currentPaths) {
    const pathSet = currentPaths instanceof Set ? currentPaths : new Set([currentPaths]);
    const listingKinds = {
      '/articles.html': 'article-list',
      '/guides.html': 'guide-list',
      '/categories.html': 'category-list'
    };
    for (const path of pathSet) {
      const kind = listingKinds[String(path || '').toLowerCase()];
      if (kind) return { kind, entry: null, path };
    }

    const priority = ['category', 'article', 'guide', 'tool'];
    for (const type of priority) {
      const entry = data.find(item =>
        item && item.type === type && getCanonicalPath(item) && pathSet.has(getCanonicalPath(item))
      );
      if (entry) return { kind: type, entry, path: getCanonicalPath(entry) };
    }
    return null;
  }

  function tokenize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 2 && !/^(the|and|for|with|from|your|you|how|what|this|that|guide|tool|tools|online|free)$/.test(word));
  }

  function contentScore(candidate, current, toolEntries, currentPath) {
    let score = 0;
    const ignored = new Set(['tool', 'tools', 'utility', 'free', 'online', 'category', 'hub', 'article', 'articles', 'guide', 'guides']);
    const contextTags = new Set([
      ...(Array.isArray(current && current.tags) ? current.tags : []),
      ...(toolEntries || []).flatMap(item => Array.isArray(item.tags) ? item.tags : [])
    ].map(tag => String(tag).trim().toLowerCase()).filter(tag => tag && !ignored.has(tag)));

    const candidateTags = (Array.isArray(candidate.tags) ? candidate.tags : [])
      .map(tag => String(tag).trim().toLowerCase()).filter(tag => tag && !ignored.has(tag));
    const shared = candidateTags.filter(tag => contextTags.has(tag));
    score += Math.min(shared.length * 5, 35);

    const currentCategory = String(current && current.category || '').toLowerCase();
    const candidateCategory = String(candidate.category || '').toLowerCase();
    if (currentCategory && !/^(articles?|guides?|category)$/i.test(currentCategory) &&
        currentCategory === candidateCategory) score += 8;

    const currentWords = new Set(tokenize([
      current && current.title,
      ...(Array.isArray(current && current.tags) ? current.tags : []),
      ...(toolEntries || []).map(item => item.title)
    ].join(' ')));
    const candidateWords = tokenize(candidate.title + ' ' + (candidate.url || ''));
    score += Math.min(candidateWords.filter(word => currentWords.has(word)).length * 3, 18);

    if (getCanonicalPath(candidate) === currentPath) return -1000;
    return score;
  }

  function selectRelatedReading(data, current, currentPath, toolEntries, options) {
    const settings = options || {};
    const limit = Math.max(1, Math.min(3, Number(settings.limit) || 2));
    const preferredType = settings.preferredType;
    const candidates = [];
    const seen = new Set();

    for (const entry of data || []) {
      if (!entry || !['article', 'guide'].includes(entry.type) || typeof entry.title !== 'string') continue;
      const path = getCanonicalPath(entry);
      if (!path || path === currentPath || seen.has(path)) continue;
      seen.add(path);
      candidates.push(Object.assign({}, entry, { href: path }));
    }

    const sorted = candidates.map(entry => {
      let score = contentScore(entry, current || {}, toolEntries || [], currentPath);
      if (preferredType && entry.type === preferredType) score += 5;
      // Topic-neutral directory views still show stable, useful reading links.
      const tie = hash(String(currentPath || '/') + '|reading|' + entry.href);
      return { entry, score, tie };
    }).sort((a, b) => b.score - a.score || a.tie - b.tie);

    return sorted.slice(0, limit).map(item => item.entry);
  }

  function categoryToolEntries(data, context, currentPath, origin) {
    const entry = context && context.entry;
    const title = String(entry && entry.title || '').toLowerCase();
    const categoryAliases = {
      'security & network': ['security', 'developer & data'],
      'pdf & documents': ['pdf & documents'],
      'live information': ['live information'],
      'calculators': ['calculators'],
      'images': ['images'],
      'pakistan tools': ['pakistan', 'pakistan tools'],
      'productivity': ['productivity'],
      'developer & data': ['developer & data'],
      'gaming': ['gaming', 'calculators']
    };
    const allowed = categoryAliases[title] || [title];
    const currentTags = new Set((Array.isArray(entry && entry.tags) ? entry.tags : [])
      .map(tag => String(tag).toLowerCase()).filter(tag => tag && !['category', 'hub', 'tool', 'utility'].includes(tag)));
    const candidates = (data || []).filter(item =>
      item && item.type === 'tool' && getCanonicalPath(item, origin) !== currentPath
    ).map(item => {
      let score = 0;
      const category = String(item.category || '').toLowerCase();
      if (allowed.includes(category)) score += 22;
      const tags = (Array.isArray(item.tags) ? item.tags : []).map(tag => String(tag).toLowerCase());
      score += Math.min(tags.filter(tag => currentTags.has(tag)).length * 5, 30);
      score += scoreCandidate(item, entry || { title, category: title, tags: [...currentTags] }, currentPath);
      return { item, score, tie: hash(String(currentPath) + '|category|' + getCanonicalPath(item, origin)) };
    }).sort((a, b) => b.score - a.score || a.tie - b.tie);

    const seen = new Set();
    return candidates.map(row => {
      const href = getCanonicalPath(row.item, origin);
      return Object.assign({}, row.item, { href });
    }).filter(item => {
      if (!item.href || seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    }).slice(0, 4);
  }

module.exports = Object.freeze({ getCanonicalPath, getPageContext, isToolPage, selectRelatedReading, selectRelatedTools });
