/* GG Learning Labs — Toasts, modals, dropdowns, tabs, states, form handling */
(function (GGL) {
  'use strict';

  var U = GGL.utils;
  var UI = {};

  /* ---------------- Toasts ---------------- */
  function toastRegion() {
    var r = document.getElementById('toast-region');
    if (!r) {
      r = U.el('div', { id: 'toast-region', class: 'toast-region', role: 'status',
        'aria-live': 'polite', 'aria-atomic': 'false' });
      document.body.appendChild(r);
    }
    return r;
  }

  var TOAST_ICON = { success: 'checkCircle', error: 'xCircle', warning: 'alert', info: 'info' };

  UI.toast = function (title, opts) {
    opts = opts || {};
    var type = opts.type || 'info';
    var node = U.el('div', { class: 'toast toast-' + type },
      GGL.icon(TOAST_ICON[type] || 'info', 'ico') +
      '<div class="msg"><span class="title">' + U.esc(title) + '</span>' +
      (opts.desc ? '<span class="desc">' + U.esc(opts.desc) + '</span>' : '') + '</div>');
    var close = U.el('button', { class: 'btn-icon btn-sm', 'aria-label': 'Dismiss notification' },
      GGL.icon('close', 'ico'));
    node.appendChild(close);
    toastRegion().appendChild(node);

    var timer = setTimeout(dismiss, opts.duration || 4200);
    function dismiss() {
      clearTimeout(timer);
      node.classList.add('out');
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 220);
    }
    close.addEventListener('click', dismiss);
    return dismiss;
  };

  /* ---------------- Modal ---------------- */
  var openModals = [];

  UI.modal = function (opts) {
    opts = opts || {};
    var lastFocused = document.activeElement;
    var titleId = U.uid('modal-title');

    var overlay = U.el('div', { class: 'modal-overlay' });
    var modal = U.el('div', { class: 'modal ' + (opts.size ? 'modal-' + opts.size : ''),
      role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId });

    var head = U.el('div', { class: 'modal-head' },
      '<div><h2 id="' + titleId + '">' + U.esc(opts.title || '') + '</h2>' +
      (opts.subtitle ? '<p class="sub">' + U.esc(opts.subtitle) + '</p>' : '') + '</div>');
    var closeBtn = U.el('button', { class: 'btn-icon', type: 'button', 'aria-label': 'Close dialog' },
      GGL.icon('close', 'ico'));
    head.appendChild(closeBtn);

    var body = U.el('div', { class: 'modal-body' });
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);

    modal.appendChild(head);
    modal.appendChild(body);

    if (opts.footer) {
      var foot = U.el('div', { class: 'modal-foot' });
      if (typeof opts.footer === 'string') foot.innerHTML = opts.footer;
      else foot.appendChild(opts.footer);
      modal.appendChild(foot);
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { overlay.classList.add('open'); });

    var release = U.trapFocus(modal);
    openModals.push(handleClose);

    function handleClose() {
      overlay.classList.remove('open');
      release();
      openModals = openModals.filter(function (f) { return f !== handleClose; });
      if (!openModals.length) document.body.style.overflow = '';
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (lastFocused && lastFocused.focus) lastFocused.focus();
      }, 220);
      if (opts.onClose) opts.onClose();
    }

    closeBtn.addEventListener('click', handleClose);
    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay && opts.dismissible !== false) handleClose();
    });
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && opts.dismissible !== false) { e.stopPropagation(); handleClose(); }
    });

    setTimeout(function () {
      var first = modal.querySelector('input:not([type=hidden]), select, textarea, .modal-foot .btn');
      (first || closeBtn).focus();
    }, 60);

    var handle = { el: modal, body: body, overlay: overlay, close: handleClose };
    if (opts.onMount) opts.onMount(handle);
    return handle;
  };

  UI.confirm = function (opts) {
    opts = opts || {};
    var tone = opts.tone || 'danger';
    var confirmClass = tone === 'danger' ? 'btn-danger' : 'btn-primary';

    var handle = UI.modal({
      title: opts.title || 'Are you sure?',
      size: 'sm',
      body: '<div class="confirm-icon ' + (tone === 'danger' ? '' : tone) + '">' +
              GGL.icon(tone === 'danger' ? 'trash' : tone === 'warning' ? 'alert' : 'info', 'ico') +
            '</div><p>' + U.esc(opts.message || 'This action cannot be undone.') + '</p>' +
            (opts.detail ? '<div class="alert alert-warning mt-4">' + GGL.icon('alert', 'ico') +
              '<div>' + U.esc(opts.detail) + '</div></div>' : ''),
      footer: '<button type="button" class="btn btn-secondary" data-act="cancel">Cancel</button>' +
              '<button type="button" class="btn ' + confirmClass + '" data-act="confirm">' +
              U.esc(opts.confirmLabel || 'Delete') + '</button>'
    });

    var confirmBtn = handle.overlay.querySelector('[data-act="confirm"]');
    handle.overlay.querySelector('[data-act="cancel"]').addEventListener('click', handle.close);

    confirmBtn.addEventListener('click', function () {
      if (!opts.onConfirm) { handle.close(); return; }
      confirmBtn.classList.add('is-loading');
      confirmBtn.disabled = true;
      Promise.resolve(opts.onConfirm())
        .then(function () { handle.close(); })
        .catch(function (err) {
          confirmBtn.classList.remove('is-loading');
          confirmBtn.disabled = false;
          UI.toast('Could not complete', { type: 'error', desc: err.message });
        });
    });
    return handle;
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openModals.length) openModals[openModals.length - 1]();
  });

  /* ---------------- Dropdowns ----------------
     One global delegated handler, registered exactly once. An earlier version
     attached "open" and "close-everything" to the same node, so
     stopPropagation() could not separate them and menus closed on the same
     click that opened them. It also leaked a listener per table reload. */
  var dropdownsReady = false;

  function closeAllDropdowns() {
    U.$$('.menu.open').forEach(function (m) {
      m.classList.remove('open');
      var wrap = m.closest('[data-dropdown]');
      var t = wrap && wrap.querySelector('[data-dropdown-trigger]');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }
  UI.closeDropdowns = closeAllDropdowns;

  UI.initDropdowns = function () {
    if (dropdownsReady) return;
    dropdownsReady = true;

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-dropdown-trigger]');
      if (trigger) {
        e.preventDefault();
        var wrap = trigger.closest('[data-dropdown]');
        var menu = wrap && wrap.querySelector('.menu');
        if (!menu) return;
        var wasOpen = menu.classList.contains('open');
        closeAllDropdowns();
        if (wasOpen) return;
        menu.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        var rect = menu.getBoundingClientRect();
        if (rect.bottom > window.innerHeight - 8) {
          menu.style.top = 'auto'; menu.style.bottom = 'calc(100% + 6px)';
        } else { menu.style.top = ''; menu.style.bottom = ''; }
        return;
      }
      if (e.target.closest('.menu-item')) { closeAllDropdowns(); return; }
      if (e.target.closest('.menu')) return;
      closeAllDropdowns();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllDropdowns();
    });
  };

  /* ---------------- Tabs ---------------- */
  UI.initTabs = function (root) {
    U.$$('[role="tablist"]', root || document).forEach(function (list) {
      var tabs = U.$$('[role="tab"]', list);
      function select(tab) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
      }
      list.addEventListener('click', function (e) {
        var tab = e.target.closest('[role="tab"]');
        if (tab) select(tab);
      });
      list.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(document.activeElement);
        if (i === -1) return;
        var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1
                 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
        if (next === null) return;
        e.preventDefault();
        var target = tabs[(next + tabs.length) % tabs.length];
        target.focus();
        select(target);
      });
      var initial = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
      select(initial || tabs[0]);
    });
  };

  UI.initAccordion = function (root) {
    U.on(root || document, 'click', '.faq-q', function (e, btn) {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (panel) panel.classList.toggle('open', !open);
    });
  };

  /* ---------------- States ---------------- */
  UI.skeletonRows = function (count, cols) {
    var out = '';
    for (var i = 0; i < (count || 5); i++) {
      out += '<tr>';
      for (var c = 0; c < (cols || 5); c++) {
        out += '<td><div class="skel skel-text" style="width:' + (45 + ((i + c) % 4) * 14) + '%"></div></td>';
      }
      out += '</tr>';
    }
    return out;
  };

  UI.skeletonCards = function (count) {
    var out = '';
    for (var i = 0; i < (count || 4); i++) out += '<div class="skel skel-card"></div>';
    return out;
  };

  UI.empty = function (opts) {
    opts = opts || {};
    return '<div class="state">' +
      '<div class="state-icon">' + GGL.icon(opts.icon || 'inbox', 'ico') + '</div>' +
      '<h3>' + U.esc(opts.title || 'Nothing here yet') + '</h3>' +
      '<p>' + U.esc(opts.message || 'When records are added they will appear here.') + '</p>' +
      (opts.action ? '<button type="button" class="btn btn-primary" data-empty-action>' +
        GGL.icon(opts.actionIcon || 'plus', 'ico') + '<span>' + U.esc(opts.action) + '</span></button>' : '') +
      '</div>';
  };

  UI.error = function (opts) {
    opts = opts || {};
    return '<div class="state">' +
      '<div class="state-icon danger">' + GGL.icon('alert', 'ico') + '</div>' +
      '<h3>' + U.esc(opts.title || 'Something went wrong') + '</h3>' +
      '<p>' + U.esc(opts.message || 'We could not load this content. Please try again.') + '</p>' +
      '<button type="button" class="btn btn-secondary" data-retry>' +
        GGL.icon('refresh', 'ico') + '<span>Retry</span></button></div>';
  };

  UI.async = function (container, loadingHtml, task) {
    function run() {
      container.innerHTML = loadingHtml;
      Promise.resolve().then(task).catch(function (err) {
        if (window.console) console.error('[GGL]', err);
        container.innerHTML = UI.error({ message: err && err.message });
        var retry = container.querySelector('[data-retry]');
        if (retry) retry.addEventListener('click', run);
      });
    }
    run();
    return run;
  };

  /* ---------------- Form submit ---------------- */
  UI.handleSubmit = function (form, rules, submitFn, opts) {
    opts = opts || {};
    form.setAttribute('novalidate', 'novalidate');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var result = U.validateForm(form, rules || {});
      if (!result.valid) return;

      var btn = form.querySelector('[type="submit"]') ||
                document.querySelector('[form="' + form.id + '"]');
      if (btn) { btn.classList.add('is-loading'); btn.disabled = true; }

      Promise.resolve(submitFn(result.values, form))
        .then(function (res) {
          if (opts.success) UI.toast(opts.success, { type: 'success', desc: opts.successDesc });
          if (opts.reset !== false) form.reset();
          if (opts.onDone) opts.onDone(res);
        })
        .catch(function (err) {
          UI.toast(opts.failure || 'Could not save', { type: 'error', desc: err && err.message });
          if (opts.onError) opts.onError(err);
        })
        .then(function () {
          if (btn) { btn.classList.remove('is-loading'); btn.disabled = false; }
        });
    });

    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field) { field.classList.remove('has-error'); e.target.removeAttribute('aria-invalid'); }
    });
  };

  GGL.ui = UI;
})(window.GGL = window.GGL || {});
