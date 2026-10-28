/* Homepage search engine is fetched only on explicit search intent.
   Keep the existing matching and keyboard behavior in one cacheable asset. */
(() => {
  'use strict';
  if (window.__nexusnovaHomepageSearchInitialized) return;
  const root = document.querySelector('[data-nexusnova-search-root]');
  const input = document.querySelector('[data-nexusnova-search-input]');
  if (!root || !input) return;
  window.__nexusnovaHomepageSearchInitialized = true;

    function initializeHomepageSearch() {
      'use strict';

      var root = document.querySelector('[data-nexusnova-search-root]');
      var form = document.querySelector('[data-nexusnova-search]');
      var input = document.querySelector('[data-nexusnova-search-input]');
      var panel = document.getElementById('nn-search-suggestions');
      var directoryNodes = Array.prototype.slice.call(document.querySelectorAll('[data-master-tool]'));

      if (!root || !form || !input || !panel) {
        return;
      }

      /*
       * The matching algorithm stays the same style as the existing homepage:
       * normalize -> tokenize -> exact/substring/fuzzy token scoring -> ranked route.
       * The catalog is now built from the fully visible homepage directory, so
       * fallback search covers every listed route instead of only four featured tools.
       */
      function normalize(value) {
        return String(value || '')
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      function tokenize(value) {
        var normalized = normalize(value);
        return normalized ? normalized.split(/\s+/).filter(Boolean) : [];
      }

      function distance(left, right) {
        var a = String(left || '');
        var b = String(right || '');
        var previous = [];
        var current = [];
        var row;
        var column;

        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;

        for (column = 0; column <= b.length; column += 1) {
          previous[column] = column;
        }

        for (row = 1; row <= a.length; row += 1) {
          current[0] = row;

          for (column = 1; column <= b.length; column += 1) {
            current[column] = Math.min(
              current[column - 1] + 1,
              previous[column] + 1,
              previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1)
            );
          }

          previous = current.slice();
        }

        return previous[b.length];
      }

      function fuzzyTokenMatch(queryToken, candidateToken) {
        if (!queryToken || !candidateToken) return false;
        if (queryToken === candidateToken) return true;

        if (candidateToken.indexOf(queryToken) !== -1 || queryToken.length >= 2 && queryToken.indexOf(candidateToken) !== -1) {
          return true;
        }

        var maxLength = Math.max(queryToken.length, candidateToken.length);
        var allowed = maxLength <= 3 ? 0 : (maxLength <= 5 ? 1 : (maxLength <= 8 ? 2 : 3));
        return distance(queryToken, candidateToken) <= allowed;
      }

      var fallbackCatalog = directoryNodes.map(function (node, index) {
        var searchText = node.getAttribute('data-search') || node.getAttribute('data-title') || node.textContent;
        return {
          title: node.getAttribute('data-title') || node.querySelector('h3')?.textContent.trim() || '',
          url: node.getAttribute('href') || '',
          category: node.querySelector('.nn-master-tool-category')?.textContent.trim() || '',
          aliases: [],
          keywords: searchText.split('|').map(function (part) { return part.trim(); }).filter(Boolean),
          type: 'tool',
          priority: directoryNodes.length - index
        };
      });

      function fallbackQuery(query) {
        var normalizedQuery = normalize(query);
        var queryTokens = tokenize(normalizedQuery);

        if (!normalizedQuery || !queryTokens.length) {
          return [];
        }

        return fallbackCatalog
          .map(function (record, index) {
            var score = record.priority;
            var matched = 0;
            var exactPhrase = false;
            var fuzzyCount = 0;
            var candidates = [record.title].concat(record.aliases || [], record.keywords || []);

            candidates.forEach(function (candidate, candidateIndex) {
              var normalizedCandidate = normalize(candidate);

              if (normalizedCandidate === normalizedQuery) {
                score += candidateIndex === 0 ? 1000 : 940;
                exactPhrase = true;
                matched += queryTokens.length;
                return;
              }

              if (normalizedCandidate.indexOf(normalizedQuery) !== -1) {
                score += candidateIndex === 0 ? 800 : 700;
                matched += queryTokens.length;
                return;
              }

              queryTokens.forEach(function (token) {
                var candidateTokens = tokenize(normalizedCandidate);
                var tokenMatch = candidateTokens.some(function (candidateToken) {
                  return fuzzyTokenMatch(token, candidateToken);
                });

                if (tokenMatch) {
                  matched += 1;
                  fuzzyCount += 1;
                  score += 85;
                }
              });
            });

            if (!matched) return null;

            score += exactPhrase ? 250 : 0;
            score += Math.min(80, matched * 7);
            score -= Math.max(0, queryTokens.length - matched) * 35;
            score -= Math.min(40, Math.max(0, fuzzyCount - 2) * 5);

            return {
              title: record.title,
              url: record.url,
              category: record.category,
              matchScore: score,
              index: index
            };
          })
          .filter(Boolean)
          .sort(function (left, right) {
            if (right.matchScore !== left.matchScore) {
              return right.matchScore - left.matchScore;
            }
            return left.index - right.index;
          });
      }

      var externalEngine = null;

      if (typeof window.NexusNovaSearchCore === 'function') {
        try {
          externalEngine = new window.NexusNovaSearchCore();
        } catch (error) {
          externalEngine = null;
        }
      }

      function search(query) {
        var results = [];
        if (externalEngine) {
          try {
            var engineResults = externalEngine.query(query);
            if (Array.isArray(engineResults)) results = engineResults;
          } catch (error) {
            externalEngine = null;
          }
        }
        if (!results.length) results = fallbackQuery(query);
        return sortToolsFirst(results);
      }

      function sortToolsFirst(results) {
        var priority = function (result) {
          return result.type === 'tool' ? 0 : (result.type === 'category' ? 1 : 2);
        };
        return results.slice().sort(function (left, right) {
          var difference = priority(left) - priority(right);
          if (difference) return difference;
          return (right.matchScore || 0) - (left.matchScore || 0);
        });
      }

      var state = { results: [], activeIndex: -1 };

      function clearPanel() {
        panel.replaceChildren();
        panel.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('aria-activedescendant', '');
        state.results = [];
        state.activeIndex = -1;
      }

      function setActive(index) {
        var items = panel.querySelectorAll('[data-nn-search-result]');
        if (!items.length) {
          state.activeIndex = -1;
          input.setAttribute('aria-activedescendant', '');
          return;
        }

        var normalizedIndex = index;
        if (normalizedIndex < 0) normalizedIndex = items.length - 1;
        if (normalizedIndex >= items.length) normalizedIndex = 0;

        items.forEach(function (item, itemIndex) {
          var active = itemIndex === normalizedIndex;
          item.classList.toggle('is-active', active);
          if (active) item.scrollIntoView({ block: 'nearest' });
        });

        state.activeIndex = normalizedIndex;
        input.setAttribute('aria-activedescendant', items[normalizedIndex].id);
      }

      function renderResults(results) {
        panel.replaceChildren();
        state.results = results.slice(0, 6);
        state.activeIndex = -1;

        if (!state.results.length) {
          var empty = document.createElement('div');
          empty.className = 'nn-search-empty';
          empty.setAttribute('role', 'status');
          empty.textContent = 'No matching tool found. Search by a simpler task, title, typo or alias.';
          panel.appendChild(empty);
          panel.hidden = false;
          input.setAttribute('aria-expanded', 'true');
          input.setAttribute('aria-activedescendant', '');
          return;
        }

        var fragment = document.createDocumentFragment();

        state.results.forEach(function (result, index) {
          var item = document.createElement('a');
          var icon = document.createElement('span');
          var main = document.createElement('span');
          var title = document.createElement('span');
          var meta = document.createElement('span');
          var url = document.createElement('span');
          var key = document.createElement('span');

          item.id = 'nn-search-result-' + (index + 1);
          item.className = 'nn-search-result';
          item.href = result.url;
          item.setAttribute('role', 'option');
          item.setAttribute('data-nn-search-result', '');
          item.setAttribute('aria-label', result.title + ', ' + (result.category || 'NexusNova tool'));

          icon.className = 'nn-search-result-icon';
          icon.setAttribute('aria-hidden', 'true');
          icon.textContent = String(index + 1).padStart(2, '0');

          main.className = 'nn-search-result-main';

          title.className = 'nn-search-result-title';
          title.textContent = result.title;

          meta.className = 'nn-search-result-meta';
          meta.textContent = result.category || 'NEXUSNOVA TOOL';

          url.className = 'nn-search-result-url';
          url.textContent = result.url;

          key.className = 'nn-search-result-key';
          key.textContent = index < 9 ? 'ALT ' + (index + 1) : '';

          meta.appendChild(key);
          main.appendChild(title);
          main.appendChild(meta);
          main.appendChild(url);
          item.appendChild(icon);
          item.appendChild(main);
          item.appendChild(document.createTextNode('→'));

          item.addEventListener('mouseenter', function () { setActive(index); });
          item.addEventListener('focus', function () { setActive(index); });

          fragment.appendChild(item);
        });

        panel.appendChild(fragment);
        panel.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      }

      function runQuery() {
        var query = input.value.trim();
        if (!query) {
          clearPanel();
          return;
        }
        renderResults(search(query));
      }

      function openActiveResult() {
        if (state.activeIndex >= 0 && state.results[state.activeIndex]) {
          window.location.assign(state.results[state.activeIndex].url);
          return true;
        }
        if (state.results[0] && state.results[0].url) {
          window.location.assign(state.results[0].url);
          return true;
        }
        return false;
      }

      input.addEventListener('input', runQuery);
      input.addEventListener('focus', function () {
        if (input.value.trim()) runQuery();
      });

      input.addEventListener('keydown', function (event) {
        var resultCount = state.results.length;

        if (event.key === 'ArrowDown' && resultCount) {
          event.preventDefault();
          setActive(state.activeIndex + 1);
          return;
        }

        if (event.key === 'ArrowUp' && resultCount) {
          event.preventDefault();
          setActive(state.activeIndex - 1);
          return;
        }

        if (event.key === 'Home' && resultCount) {
          event.preventDefault();
          setActive(0);
          return;
        }

        if (event.key === 'End' && resultCount) {
          event.preventDefault();
          setActive(resultCount - 1);
          return;
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          clearPanel();
          return;
        }

        if (event.key === 'Enter' && state.activeIndex >= 0) {
          event.preventDefault();
          openActiveResult();
        }
      });

      form.addEventListener('submit', function (event) {
        var query = input.value.trim();

        if (!query) {
          event.preventDefault();
          input.focus();
          return;
        }

        var results = search(query);

        if (results[0] && results[0].url) {
          event.preventDefault();
          window.location.assign(results[0].url);
        } else {
          event.preventDefault();
          renderResults([]);
        }
      });

      document.addEventListener('pointerdown', function (event) {
        if (!root.contains(event.target)) clearPanel();
      });

      document.addEventListener('keydown', function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          input.focus();
          input.select();
        }
      });

      clearPanel();
      if (input.value.trim()) runQuery();
    }

  if (typeof window.NexusNovaSearchCore === 'function') {
    initializeHomepageSearch();
  } else {
    const searchCoreScript = document.createElement('script');
    searchCoreScript.src = '/assets/js/search-core.js?v=20261015-v4';
    searchCoreScript.async = true;
    searchCoreScript.onload = initializeHomepageSearch;
    searchCoreScript.onerror = initializeHomepageSearch;
    document.head.appendChild(searchCoreScript);
  }
})();
