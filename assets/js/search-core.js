'use strict';

/**
 * NexusNova Client-Side Search Core
 * Self-contained, dependency-free, fault-tolerant search engine.
 */
class NexusNovaSearchCore {
  constructor() {
    this.catalog = [
      {
        title: 'Pakistan Salary Tax Calculator',
        url: 'salary-tax-calculator-pakistan.html',
        category: 'Pakistan Calculators',
        aliases: ['salery', 'income tax', 'fbr tax'],
        keywords: [
          'salary',
          'salary tax',
          'salery',
          'income tax',
          'fbr',
          'fbr tax',
          'pakistan salary tax',
          'salaried person',
          'tax calculator',
          'salary calculator'
        ],
        priority: 100
      },
      {
        title: 'Pakistan Electricity Bill Calculator',
        url: 'electricity-bill-calculator-pakistan.html',
        category: 'Pakistan Utilities',
        aliases: ['bijli bill', 'wapda', 'lesco', 'kelectric'],
        keywords: [
          'electricity',
          'electricity bill',
          'bijli',
          'bijli bill',
          'wapda',
          'lesco',
          'k electric',
          'kelectric',
          'electric bill',
          'bill calculator',
          'units',
          'tariff'
        ],
        priority: 95
      },
      {
        title: 'WhatsApp Link Generator',
        url: 'whatsapp-link-generator.html',
        category: 'Communication',
        aliases: ['wa link', 'chat link', 'commercial text'],
        keywords: [
          'whatsapp',
          'whatsapp link',
          'wa link',
          'chat link',
          'click to chat',
          'commercial text',
          'business message',
          'message link',
          'wa me',
          'whatsapp business'
        ],
        priority: 90
      },
      {
        title: 'NexusNova X-Ray',
        url: 'xray.html',
        category: 'Security',
        aliases: ['link checker', 'url scanner', 'redirect detector'],
        keywords: [
          'xray',
          'x-ray',
          'link checker',
          'url checker',
          'url scanner',
          'redirect detector',
          'redirect checker',
          'link scanner',
          'inspect link',
          'inspect url',
          'url structure',
          'phishing link',
          'suspicious link'
        ],
        priority: 90
      }
    ];

    this.records = this.catalog.map((record, index) => ({
      ...record,
      _index: index,
      _normalizedTitle: this.normalize(record.title),
      _normalizedAliases: record.aliases.map((value) => this.normalize(value)),
      _normalizedKeywords: record.keywords.map((value) => this.normalize(value))
    }));
  }

  normalize(input) {
    return String(input ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  tokenize(input) {
    const normalized = this.normalize(input);
    return normalized ? normalized.split(/\b+/u).filter(Boolean) : [];
  }

  uniqueTokens(input) {
    return [...new Set(this.tokenize(input))];
  }

  bigrams(token) {
    const value = String(token ?? '');
    if (value.length < 2) return new Set([value]);

    const grams = new Set();
    for (let index = 0; index < value.length - 1; index += 1) {
      grams.add(value.slice(index, index + 2));
    }
    return grams;
  }

  ngramOverlap(left, right) {
    const a = this.bigrams(left);
    const b = this.bigrams(right);

    if (!a.size && !b.size) return 1;
    if (!a.size || !b.size) return 0;

    let intersection = 0;
    for (const gram of a) {
      if (b.has(gram)) intersection += 1;
    }

    return intersection / Math.max(1, new Set([...a, ...b]).size - intersection);
  }

  levenshtein(left, right) {
    const a = String(left ?? '');
    const b = String(right ?? '');

    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const previous = new Array(b.length + 1);
    const current = new Array(b.length + 1);

    for (let column = 0; column <= b.length; column += 1) {
      previous[column] = column;
    }

    for (let row = 1; row <= a.length; row += 1) {
      current[0] = row;

      for (let column = 1; column <= b.length; column += 1) {
        const substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;
        current[column] = Math.min(
          current[column - 1] + 1,
          previous[column] + 1,
          previous[column - 1] + substitutionCost
        );
      }

      for (let column = 0; column <= b.length; column += 1) {
        previous[column] = current[column];
      }
    }

    return previous[b.length];
  }

  allowedDistance(length) {
    if (length <= 3) return 0;
    if (length <= 5) return 1;
    if (length <= 8) return 2;
    return 3;
  }

  fuzzyTokenMatch(queryToken, candidateToken) {
    if (!queryToken || !candidateToken) return null;
    if (queryToken === candidateToken) {
      return {
        distance: 0,
        overlap: 1,
        confidence: 1
      };
    }

    const distance = this.levenshtein(queryToken, candidateToken);
    const limit = this.allowedDistance(Math.max(queryToken.length, candidateToken.length));
    if (distance > limit) return null;

    const overlap = this.ngramOverlap(queryToken, candidateToken);
    const maxLength = Math.max(queryToken.length, candidateToken.length, 1);
    const normalizedDistance = distance / maxLength;
    const confidence = (1 - normalizedDistance) * 0.7 + overlap * 0.3;

    if (confidence < 0.55) return null;

    return {
      distance,
      overlap,
      confidence
    };
  }

  splitBoundaryMatch(queryTokens, candidateText) {
    const candidateTokens = this.uniqueTokens(candidateText);
    if (!queryTokens.length || !candidateTokens.length) {
      return {
        exactTokens: 0,
        fuzzyTokens: 0,
        distance: Infinity,
        overlap: 0
      };
    }

    let exactTokens = 0;
    let fuzzyTokens = 0;
    let totalDistance = 0;
    let totalOverlap = 0;

    for (const queryToken of queryTokens) {
      let exactFound = false;
      let bestFuzzy = null;

      for (const candidateToken of candidateTokens) {
        if (
          candidateToken === queryToken ||
          candidateToken.includes(queryToken) ||
          queryToken.includes(candidateToken)
        ) {
          exactFound = true;
          break;
        }

        const fuzzy = this.fuzzyTokenMatch(queryToken, candidateToken);
        if (
          fuzzy &&
          (!bestFuzzy ||
            fuzzy.confidence > bestFuzzy.confidence ||
            (
              fuzzy.confidence === bestFuzzy.confidence &&
              fuzzy.distance < bestFuzzy.distance
            ))
        ) {
          bestFuzzy = fuzzy;
        }
      }

      if (exactFound) {
        exactTokens += 1;
        continue;
      }

      if (bestFuzzy) {
        fuzzyTokens += 1;
        totalDistance += bestFuzzy.distance;
        totalOverlap += bestFuzzy.overlap;
      }
    }

    return {
      exactTokens,
      fuzzyTokens,
      distance: fuzzyTokens ? totalDistance / fuzzyTokens : 0,
      overlap: fuzzyTokens ? totalOverlap / fuzzyTokens : 0
    };
  }

  evaluateField(query, queryTokens, value, baseScore) {
    if (!value) return null;

    const normalizedValue = this.normalize(value);

    // Tier A — absolute normalized phrase match.
    if (normalizedValue === query) {
      return {
        score: baseScore,
        mode: 'exact',
        matchedTokens: queryTokens.length,
        distance: 0,
        overlap: 1
      };
    }

    if (query.length >= 2 && normalizedValue.includes(query)) {
      return {
        score: baseScore - 25,
        mode: 'phrase',
        matchedTokens: queryTokens.length,
        distance: 0,
        overlap: 1
      };
    }

    // Tier B — split-word containment with fuzzy fallback.
    const boundary = this.splitBoundaryMatch(queryTokens, normalizedValue);
    const totalTokens = queryTokens.length;
    const matchedTokens = boundary.exactTokens + boundary.fuzzyTokens;

    if (!matchedTokens) return null;

    const containmentRatio = boundary.exactTokens / Math.max(1, totalTokens);
    const fuzzyRatio = boundary.fuzzyTokens / Math.max(1, totalTokens);

    let score = baseScore;

    if (boundary.exactTokens > 0) {
      score -= 100 - Math.round(containmentRatio * 100);
      score += Math.min(120, boundary.exactTokens * 25);
    }

    if (boundary.fuzzyTokens > 0) {
      score =
        Math.max(500, 500 + Math.round(fuzzyRatio * 150)) -
        Math.round(boundary.distance * 10) +
        Math.round(boundary.overlap * 50);
    }

    if (matchedTokens < totalTokens && totalTokens > 1) {
      score -= (totalTokens - matchedTokens) * 60;
    }

    return {
      score,
      mode: boundary.fuzzyTokens ? 'fuzzy' : 'token',
      matchedTokens,
      distance: boundary.distance,
      overlap: boundary.overlap
    };
  }

  evaluateRecord(query, queryTokens, record) {
    const candidates = [];

    const titleResult = this.evaluateField(
      query,
      queryTokens,
      record.title,
      1000
    );
    if (titleResult) {
      candidates.push({
        ...titleResult,
        source: 'title'
      });
    }

    for (const alias of record.aliases) {
      const result = this.evaluateField(
        query,
        queryTokens,
        alias,
        950
      );
      if (result) {
        candidates.push({
          ...result,
          source: 'alias'
        });
      }
    }

    for (const keyword of record.keywords) {
      const result = this.evaluateField(
        query,
        queryTokens,
        keyword,
        900
      );
      if (result) {
        candidates.push({
          ...result,
          source: 'keyword'
        });
      }
    }

    if (!candidates.length) return null;

    candidates.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.matchedTokens !== left.matchedTokens) {
        return right.matchedTokens - left.matchedTokens;
      }
      if (left.distance !== right.distance) {
        return left.distance - right.distance;
      }
      if (right.overlap !== left.overlap) {
        return right.overlap - left.overlap;
      }
      return 0;
    });

    const best = candidates[0];

    // Priority is deliberately only a fractional secondary tie-breaker.
    const finalScore = best.score + Math.min(0.99, record.priority / 10000);

    return {
      ...record,
      match: {
        source: best.source,
        mode: best.mode,
        matchedTokens: best.matchedTokens,
        distance: best.distance,
        overlap: best.overlap,
        relevance: best.score,
        priority: record.priority,
        finalScore
      }
    };
  }

  query(input) {
    const normalizedQuery = this.normalize(input);
    if (!normalizedQuery) return [];

    const queryTokens = this.uniqueTokens(normalizedQuery);
    if (!queryTokens.length) return [];

    const results = [];

    for (const record of this.records) {
      const evaluated = this.evaluateRecord(
        normalizedQuery,
        queryTokens,
        record
      );

      if (evaluated) {
        results.push(evaluated);
      }
    }

    results.sort((left, right) => {
      if (right.match.finalScore !== left.match.finalScore) {
        return right.match.finalScore - left.match.finalScore;
      }

      if (right.match.relevance !== left.match.relevance) {
        return right.match.relevance - left.match.relevance;
      }

      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      if (right.match.matchedTokens !== left.match.matchedTokens) {
        return right.match.matchedTokens - left.match.matchedTokens;
      }

      if (left.match.distance !== right.match.distance) {
        return left.match.distance - right.match.distance;
      }

      return left._index - right._index;
    });

    return results.map((record) => ({
      title: record.title,
      url: record.url,
      category: record.category,
      aliases: [...record.aliases],
      keywords: [...record.keywords],
      priority: record.priority,
      match: { ...record.match }
    }));
  }
}

window.NexusNovaSearchCore = NexusNovaSearchCore;
