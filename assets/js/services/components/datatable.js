/* GG Learning Labs — DataTable: search, filter, sort, page, select, bulk actions */
(function (GGL) {
  'use strict';

  var U = GGL.utils;
  var UI = GGL.ui;

  GGL.DataTable = function (container, opts) {
    opts = opts || {};
    var cols = opts.columns || [];
    var state = {
      search: opts.initialSearch || '', filters: {},
      sort: opts.defaultSort || null, dir: opts.defaultDir || 'asc',
      page: 1, size: opts.pageSize || 10, selected: {}, rows: [], meta: null
    };
    (opts.filters || []).forEach(function (f) { state.filters[f.key] = f.default || 'all'; });

    container.innerHTML =
      '<div class="card"><div class="toolbar" data-toolbar></div>' +
        '<div class="table-wrap" data-table-wrap>' +
          '<table class="table"><thead data-thead></thead><tbody data-tbody></tbody></table></div>' +
        '<div data-state-slot></div>' +
        '<div class="pagination" data-pagination hidden></div></div>';

    var toolbar   = container.querySelector('[data-toolbar]');
    var thead     = container.querySelector('[data-thead]');
    var tbody     = container.querySelector('[data-tbody]');
    var tableWrap = container.querySelector('[data-table-wrap]');
    var stateSlot = container.querySelector('[data-state-slot]');
    var pager     = container.querySelector('[data-pagination]');

    function renderToolbar() {
      var filterHtml = (opts.filters || []).map(function (f) {
        return '<label class="sr-only" for="flt-' + f.key + '">' + U.esc(f.label) + '</label>' +
          '<select class="select" id="flt-' + f.key + '" data-filter="' + f.key + '">' +
            '<option value="all">' + U.esc(f.label) + ': All</option>' +
            f.options.map(function (o) {
              return '<option value="' + U.esc(o.value) + '">' + U.esc(o.label) + '</option>';
            }).join('') + '</select>';
      }).join('');

      toolbar.innerHTML =
        (opts.search === false ? '' :
          '<div class="search"><label class="input-icon">' +
            '<span class="sr-only">' + U.esc(opts.searchLabel || 'Search records') + '</span>' +
            GGL.icon('search', 'ico') +
            '<input type="search" class="input" data-search placeholder="' +
              U.esc(opts.searchPlaceholder || 'Search…') + '" value="' + U.esc(state.search) + '">' +
          '</label></div>') +
        filterHtml + '<div class="grow"></div>' +
        '<div class="row gap-2" data-bulk hidden>' +
          '<span class="text-sm text-muted" data-bulk-count></span>' +
          (opts.bulkActions || []).map(function (a, i) {
            return '<button type="button" class="btn btn-sm btn-secondary" data-bulk-action="' + i + '">' +
              (a.icon ? GGL.icon(a.icon, 'ico') : '') + '<span>' + U.esc(a.label) + '</span></button>';
          }).join('') + '</div>' + (opts.toolbarExtra || '');

      var searchInput = toolbar.querySelector('[data-search]');
      if (searchInput) {
        searchInput.addEventListener('input', U.debounce(function () {
          state.search = searchInput.value; state.page = 1; load();
        }, 280));
      }
      U.$$('[data-filter]', toolbar).forEach(function (sel) {
        sel.addEventListener('change', function () {
          state.filters[sel.getAttribute('data-filter')] = sel.value;
          state.page = 1; load();
        });
      });
      (opts.bulkActions || []).forEach(function (action, i) {
        var btn = toolbar.querySelector('[data-bulk-action="' + i + '"]');
        if (btn) btn.addEventListener('click', function () { action.onClick(selectedIds(), api); });
      });
    }

    function renderHead() {
      var cells = cols.map(function (c) {
        var cls = [];
        if (c.align === 'right') cls.push('text-right');
        if (c.hideBelow) cls.push('hide-' + c.hideBelow);
        var style = c.width ? ' style="width:' + c.width + '"' : '';
        var inner = c.sortable
          ? '<button type="button" class="th-sort" data-sort="' + U.esc(c.key) + '"' +
            (state.sort === c.key ? ' data-dir="' + state.dir + '"' : '') + '>' +
            U.esc(c.label) + GGL.icon('sort', 'ico') + '</button>'
          : U.esc(c.label);
        return '<th' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + style +
          (c.sortable && state.sort === c.key
            ? ' aria-sort="' + (state.dir === 'asc' ? 'ascending' : 'descending') + '"' : '') +
          '>' + inner + '</th>';
      }).join('');

      var select = opts.selectable
        ? '<th style="width:36px"><label class="check" style="margin:0">' +
          '<input type="checkbox" data-select-all aria-label="Select all rows on this page"></label></th>' : '';
      var actions = opts.rowActions ? '<th class="col-actions">Actions</th>' : '';

      thead.innerHTML = '<tr>' + select + cells + actions + '</tr>';

      U.$$('[data-sort]', thead).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-sort');
          if (state.sort === key) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
          else { state.sort = key; state.dir = 'asc'; }
          state.page = 1; load();
        });
      });

      var all = thead.querySelector('[data-select-all]');
      if (all) all.addEventListener('change', function () {
        state.rows.forEach(function (r) {
          if (all.checked) state.selected[r.id] = r; else delete state.selected[r.id];
        });
        renderBody(); syncBulk();
      });
    }

    function renderBody() {
      tbody.innerHTML = state.rows.map(function (row) {
        var cells = cols.map(function (c) {
          var cls = [];
          if (c.align === 'right') cls.push('text-right');
          if (c.primary) cls.push('cell-primary');
          if (c.hideBelow) cls.push('hide-' + c.hideBelow);
          var value = c.render ? c.render(row) : U.esc(U.get(row, c.key));
          return '<td' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>' +
            (value === undefined || value === null || value === ''
              ? '<span class="text-subtle">—</span>' : value) + '</td>';
        }).join('');

        var select = opts.selectable
          ? '<td><label class="check" style="margin:0"><input type="checkbox" data-row-select="' +
            U.esc(row.id) + '"' + (state.selected[row.id] ? ' checked' : '') +
            ' aria-label="Select row"></label></td>' : '';

        var actions = '';
        if (opts.rowActions) {
          var list = opts.rowActions(row, api) || [];
          actions = '<td class="col-actions"><div class="dropdown" data-dropdown>' +
            '<button type="button" class="btn-icon btn-sm" data-dropdown-trigger aria-haspopup="true" ' +
              'aria-expanded="false" aria-label="Actions for this row">' +
              GGL.icon('moreVertical', 'ico') + '</button><div class="menu">' +
              list.map(function (a, i) {
                return '<button type="button" class="menu-item' + (a.tone === 'danger' ? ' danger' : '') +
                  '" data-row-action="' + i + '" data-row-id="' + U.esc(row.id) + '">' +
                  GGL.icon(a.icon || 'eye', 'ico') + '<span>' + U.esc(a.label) + '</span></button>';
              }).join('') + '</div></div></td>';
        }

        return '<tr data-row-id="' + U.esc(row.id) + '">' + select + cells + actions + '</tr>';
      }).join('');

      U.$$('[data-row-select]', tbody).forEach(function (cb) {
        cb.addEventListener('change', function () {
          var id = cb.getAttribute('data-row-select');
          var row = state.rows.filter(function (r) { return String(r.id) === id; })[0];
          if (cb.checked) state.selected[id] = row; else delete state.selected[id];
          syncBulk();
        });
      });

      U.$$('[data-row-action]', tbody).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-row-id');
          var row = state.rows.filter(function (r) { return String(r.id) === id; })[0];
          var action = opts.rowActions(row, api)[Number(btn.getAttribute('data-row-action'))];
          if (UI.closeDropdowns) UI.closeDropdowns();
          if (action && action.onClick) action.onClick(row, api);
        });
      });

      if (opts.onRowClick) {
        U.$$('tr[data-row-id]', tbody).forEach(function (tr) {
          tr.style.cursor = 'pointer';
          tr.addEventListener('click', function (e) {
            if (e.target.closest('.dropdown, input, a, button')) return;
            var id = tr.getAttribute('data-row-id');
            opts.onRowClick(state.rows.filter(function (r) { return String(r.id) === id; })[0], api);
          });
        });
      }
    }

    function selectedIds() { return Object.keys(state.selected); }

    function syncBulk() {
      var bulk = toolbar.querySelector('[data-bulk]');
      var ids = selectedIds();
      if (bulk) {
        bulk.hidden = !ids.length;
        var count = bulk.querySelector('[data-bulk-count]');
        if (count) count.textContent = ids.length + ' selected';
      }
      var all = thead.querySelector('[data-select-all]');
      if (all) {
        var onPage = state.rows.filter(function (r) { return state.selected[r.id]; }).length;
        all.checked = onPage > 0 && onPage === state.rows.length;
        all.indeterminate = onPage > 0 && onPage < state.rows.length;
      }
      if (opts.onSelectionChange) {
        opts.onSelectionChange(ids.map(function (i) { return state.selected[i]; }));
      }
    }

    function renderPager(meta) {
      if (meta.total <= 0) { pager.hidden = true; return; }
      pager.hidden = false;
      var windowed = [];
      var start = Math.max(1, meta.page - 2);
      var end = Math.min(meta.pages, start + 4);
      start = Math.max(1, end - 4);
      for (var p = start; p <= end; p++) windowed.push(p);

      pager.innerHTML =
        '<span>Showing <strong>' + meta.from + '–' + meta.to + '</strong> of <strong>' +
          U.num(meta.total) + '</strong></span><div class="pages">' +
          '<button type="button" class="page-btn" data-page="' + (meta.page - 1) + '"' +
            (meta.page <= 1 ? ' disabled' : '') + ' aria-label="Previous page">' +
            GGL.icon('chevronLeft', 'ico') + '</button>' +
          (start > 1 ? '<button type="button" class="page-btn" data-page="1">1</button>' +
            (start > 2 ? '<span class="text-subtle">…</span>' : '') : '') +
          windowed.map(function (p) {
            return '<button type="button" class="page-btn"' +
              (p === meta.page ? ' aria-current="page"' : '') + ' data-page="' + p + '">' + p + '</button>';
          }).join('') +
          (end < meta.pages ? (end < meta.pages - 1 ? '<span class="text-subtle">…</span>' : '') +
            '<button type="button" class="page-btn" data-page="' + meta.pages + '">' + meta.pages + '</button>' : '') +
          '<button type="button" class="page-btn" data-page="' + (meta.page + 1) + '"' +
            (meta.page >= meta.pages ? ' disabled' : '') + ' aria-label="Next page">' +
            GGL.icon('chevronRight', 'ico') + '</button></div>';

      U.$$('[data-page]', pager).forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.page = Number(btn.getAttribute('data-page'));
          load();
          container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }

    function load() {
      var colCount = cols.length + (opts.selectable ? 1 : 0) + (opts.rowActions ? 1 : 0);
      tbody.innerHTML = UI.skeletonRows(Math.min(state.size, 6), colCount);
      stateSlot.innerHTML = '';
      tableWrap.hidden = false;
      pager.hidden = true;

      opts.fetch({
        search: state.search, filters: state.filters, sort: state.sort,
        dir: state.dir, page: state.page, size: state.size
      }).then(function (meta) {
        state.rows = meta.rows;
        state.meta = meta;

        if (!meta.rows.length) {
          /* Clear the body too — otherwise the previous page's rows linger
             in the DOM behind the empty state. */
          tbody.innerHTML = '';
          state.selected = {};
          tableWrap.hidden = true;
          pager.hidden = true;
          var isFiltered = state.search || Object.keys(state.filters).some(function (k) {
            return state.filters[k] && state.filters[k] !== 'all';
          });
          stateSlot.innerHTML = isFiltered
            ? UI.empty({ icon: 'search', title: 'No matching records',
                message: 'No results for the current search and filters. Try widening them.',
                action: 'Clear filters' })
            : UI.empty(opts.empty || {});
          var act = stateSlot.querySelector('[data-empty-action]');
          if (act) act.addEventListener('click', function () {
            if (isFiltered) api.reset();
            else if (opts.empty && opts.empty.onAction) opts.empty.onAction(api);
          });
          return;
        }

        renderHead(); renderBody(); renderPager(meta); syncBulk();
      }).catch(function (err) {
        if (window.console) console.error('[GGL] table load failed', err);
        tableWrap.hidden = true;
        stateSlot.innerHTML = UI.error({ message: err && err.message });
        var retry = stateSlot.querySelector('[data-retry]');
        if (retry) retry.addEventListener('click', load);
      });
    }

    var api = {
      reload: load,
      get state() { return state; },
      get selection() { return selectedIds().map(function (i) { return state.selected[i]; }); },
      clearSelection: function () { state.selected = {}; renderBody(); syncBulk(); },
      reset: function () {
        state.search = '';
        Object.keys(state.filters).forEach(function (k) { state.filters[k] = 'all'; });
        state.page = 1;
        renderToolbar(); load();
      },
      setFilter: function (key, value) {
        state.filters[key] = value; state.page = 1;
        var sel = toolbar.querySelector('[data-filter="' + key + '"]');
        if (sel) sel.value = value;
        load();
      }
    };

    renderToolbar();
    renderHead();
    load();
    return api;
  };
})(window.GGL = window.GGL || {});
