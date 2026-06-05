(function () {
  'use strict';

  var root = document.querySelector('.hb-glossary-wrapper');
  if (!root) return;

  var searchInput = root.querySelector('#hbGlossarySearch');
  var clearButton = root.querySelector('#hbGlossaryClear');
  var submitButton = root.querySelector('#hbGlossarySubmit');
  var resetButton = root.querySelector('#hbGlossaryReset');
  var categorySelect = root.querySelector('#hbGlossaryCategory');
  var levelSelect = root.querySelector('#hbGlossaryLevel');
  var counter = root.querySelector('#hbGlossaryCounter');
  var cardsWrap = root.querySelector('#hbGlossaryCards');
  var empty = root.querySelector('#hbGlossaryEmpty');
  var suggestions = root.querySelector('#hbGlossarySuggestions');
  var loadMore = root.querySelector('#hbGlossaryLoadMore');
  var copyStatus = root.querySelector('#hbGlossaryCopyStatus');
  var letterButtons = Array.prototype.slice.call(root.querySelectorAll('.hb-glossary-letter'));
  var initialLimit = Number(root.dataset.initialLimit || 36);
  var step = Number(root.dataset.step || 36);

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function restoreSearch() {
    try {
      return sessionStorage.getItem('hbGlossarySearch') || '';
    } catch (error) {
      return '';
    }
  }

  function saveSearch(value) {
    try {
      sessionStorage.setItem('hbGlossarySearch', value);
    } catch (error) {}
  }

  var cards = Array.prototype.slice.call(root.querySelectorAll('[data-glossary-card]')).map(function (card) {
    return {
      node: card,
      term: card.dataset.term || '',
      termNorm: normalize(card.dataset.term || ''),
      search: normalize(card.dataset.search || ''),
      letter: card.dataset.letter || '',
      category: card.dataset.category || '',
      level: card.dataset.level || ''
    };
  });

  var state = {
    query: restoreSearch(),
    letter: 'all',
    category: 'all',
    level: 'all',
    limit: initialLimit
  };

  if (searchInput && state.query) searchInput.value = state.query;

  function getMatches() {
    var query = normalize(state.query);
    return cards.filter(function (item) {
      return (!query || item.search.indexOf(query) !== -1 || item.termNorm.indexOf(query) !== -1) &&
        (state.letter === 'all' || item.letter === state.letter) &&
        (state.category === 'all' || item.category === state.category) &&
        (state.level === 'all' || item.level === state.level);
    });
  }

  function applyFilters(options) {
    var opts = options || {};
    var matches = getMatches();
    var visible = matches.slice(0, state.limit);
    var visibleSet = new Set(visible.map(function (item) { return item.node; }));

    cards.forEach(function (item) {
      item.node.hidden = !visibleSet.has(item.node);
    });

    if (counter) {
      counter.textContent = matches.length === 1
        ? '1 t\u00e9rmino encontrado. Mostrando 1 resultado.'
        : matches.length + ' t\u00e9rminos encontrados. Mostrando ' + Math.min(matches.length, state.limit) + ' de ' + matches.length + '.';
    }

    if (empty) empty.hidden = matches.length !== 0;
    if (loadMore) loadMore.hidden = matches.length <= state.limit;
    updateLetters();
    renderSuggestions(matches);

    if (opts.scroll && cardsWrap) {
      cardsWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function updateLetters() {
    letterButtons.forEach(function (button) {
      button.dataset.active = button.dataset.letter === state.letter ? 'true' : 'false';
    });
  }

  function renderSuggestions(matches) {
    if (!suggestions) return;
    suggestions.innerHTML = '';
    if (matches.length || !state.query) return;

    var query = normalize(state.query);
    cards
      .map(function (item) {
        return {
          item: item,
          score: similarity(query, item.termNorm) + (item.search.indexOf(query.slice(0, 4)) !== -1 ? 0.4 : 0)
        };
      })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 5)
      .forEach(function (entry) {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = entry.item.term;
        button.dataset.suggestion = entry.item.term;
        suggestions.appendChild(button);
      });
  }

  function similarity(a, b) {
    if (!a || !b) return 0;
    if (b.indexOf(a) !== -1 || a.indexOf(b) !== -1) return 1;

    var aParts = new Set(a.split(' '));
    var bParts = new Set(b.split(' '));
    var overlap = 0;

    aParts.forEach(function (part) {
      if (bParts.has(part)) overlap += 1;
    });

    return overlap / Math.max(aParts.size, bParts.size, 1);
  }

  function setSearch(value, shouldScroll) {
    state.query = value || '';
    state.letter = 'all';
    state.limit = initialLimit;
    if (searchInput) searchInput.value = state.query;
    saveSearch(state.query);
    applyFilters({ scroll: shouldScroll });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      state.query = searchInput.value;
      state.limit = initialLimit;
      saveSearch(state.query);
      applyFilters();
    });

    searchInput.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      executeSearch(true);
    });
  }

  if (submitButton) {
    submitButton.addEventListener('click', function () {
      executeSearch(true);
    });
  }

  function executeSearch(shouldScroll) {
    state.query = searchInput ? searchInput.value : state.query;
    state.limit = initialLimit;
    saveSearch(state.query);
    applyFilters({ scroll: shouldScroll });
  }

  if (clearButton) clearButton.addEventListener('click', function () { setSearch('', true); });

  if (resetButton) {
    resetButton.addEventListener('click', function () {
      state.query = '';
      state.letter = 'all';
      state.category = 'all';
      state.level = 'all';
      state.limit = initialLimit;
      if (searchInput) searchInput.value = '';
      if (categorySelect) categorySelect.value = 'all';
      if (levelSelect) levelSelect.value = 'all';
      saveSearch('');
      applyFilters({ scroll: true });
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', function () {
      state.category = categorySelect.value;
      state.limit = initialLimit;
      applyFilters({ scroll: true });
    });
  }

  if (levelSelect) {
    levelSelect.addEventListener('change', function () {
      state.level = levelSelect.value;
      state.limit = initialLimit;
      applyFilters({ scroll: true });
    });
  }

  letterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      if (button.disabled) return;
      state.letter = button.dataset.letter || 'all';
      state.limit = initialLimit;
      applyFilters({ scroll: true });
    });
  });

  if (loadMore) {
    loadMore.addEventListener('click', function () {
      state.limit += step;
      applyFilters();
    });
  }

  root.addEventListener('click', function (event) {
    var related = event.target.closest('[data-related]');
    if (related) {
      setSearch(related.dataset.related || related.textContent || '', true);
      return;
    }

    var featured = event.target.closest('[data-featured-search]');
    if (featured) {
      setSearch(featured.dataset.featuredSearch || featured.textContent || '', true);
      return;
    }

    var suggestion = event.target.closest('[data-suggestion]');
    if (suggestion) {
      setSearch(suggestion.dataset.suggestion || suggestion.textContent || '', true);
      return;
    }

    var copy = event.target.closest('[data-copy]');
    if (!copy) return;

    copyDefinition(copy.dataset.copy || '');
  });

  function copyDefinition(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showCopyStatus).catch(function () {
        fallbackCopy(text);
        showCopyStatus();
      });
      return;
    }

    fallbackCopy(text);
    showCopyStatus();
  }

  function showCopyStatus() {
    if (!copyStatus) return;
    copyStatus.textContent = 'Definici\u00f3n copiada.';
    window.setTimeout(function () {
      copyStatus.textContent = '';
    }, 2200);
  }

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
  }

  applyFilters();
})();
