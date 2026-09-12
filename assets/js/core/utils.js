/* GG Learning Labs — Shared utilities */
(function (GGL) {
  'use strict';

  var U = {};

  /* ---------------- DOM ---------------- */
  U.$  = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  U.el = function (tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'dataset') Object.keys(attrs[k]).forEach(function (d) { node.dataset[d] = attrs[k][d]; });
        else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    if (html !== undefined && html !== null) node.innerHTML = html;
    return node;
  };

  U.on = function (target, evt, sel, handler) {
    if (typeof sel === 'function') { target.addEventListener(evt, sel); return; }
    target.addEventListener(evt, function (e) {
      var match = e.target.closest(sel);
      if (match && target.contains(match)) handler.call(match, e, match);
    });
  };

  U.esc = function (str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  U.debounce = function (fn, wait) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait || 250);
    };
  };

  U.trapFocus = function (container) {
    var SEL = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    function onKey(e) {
      if (e.key !== 'Tab') return;
      var items = U.$$(SEL, container).filter(function (n) { return n.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    container.addEventListener('keydown', onKey);
    return function () { container.removeEventListener('keydown', onKey); };
  };

  /* ---------------- Formatting ---------------- */
  U.initials = function (name) {
    if (!name) return '?';
    return String(name).trim().split(/\s+/).slice(0, 2)
      .map(function (p) { return p.charAt(0).toUpperCase(); }).join('');
  };
  U.num = function (n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-IN');
  };
  U.pct = function (n, dp) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toFixed(dp === undefined ? 0 : dp) + '%';
  };
  U.money = function (n, cur) { return (cur || '₹') + Number(n || 0).toLocaleString('en-IN'); };
  U.date = function (iso, style) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var opts = style === 'long'
      ? { day: 'numeric', month: 'long', year: 'numeric' }
      : { day: '2-digit', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-GB', opts);
  };
  U.time = function (iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };
  U.relative = function (iso) {
    if (!iso) return '—';
    var then = new Date(iso).getTime();
    if (isNaN(then)) return '—';
    var diff = Math.round((then - Date.now()) / 1000);
    var abs = Math.abs(diff);
    var units = [['year', 31536000], ['month', 2592000], ['week', 604800],
                 ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (var i = 0; i < units.length; i++) {
      if (abs >= units[i][1]) {
        var v = Math.round(diff / units[i][1]);
        return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(v, units[i][0]);
      }
    }
    return 'just now';
  };
  U.greeting = function () {
    var h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };
  U.duration = function (mins) {
    if (!mins && mins !== 0) return '—';
    var h = Math.floor(mins / 60), m = mins % 60;
    if (!h) return m + 'm';
    return h + 'h' + (m ? ' ' + m + 'm' : '');
  };

  /* ---------------- Data ops ---------------- */
  U.clone = function (v) { return JSON.parse(JSON.stringify(v)); };
  U.uid = function (prefix) { return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9); };
  U.get = function (obj, path) {
    return String(path).split('.').reduce(function (acc, k) {
      return (acc === null || acc === undefined) ? undefined : acc[k];
    }, obj);
  };
  U.search = function (rows, term, keys) {
    if (!term) return rows;
    var q = String(term).toLowerCase().trim();
    return rows.filter(function (r) {
      return keys.some(function (k) {
        var v = U.get(r, k);
        return v !== undefined && v !== null && String(v).toLowerCase().indexOf(q) !== -1;
      });
    });
  };
  U.sort = function (rows, key, dir) {
    if (!key) return rows;
    var mul = dir === 'desc' ? -1 : 1;
    return rows.slice().sort(function (a, b) {
      var x = U.get(a, key), y = U.get(b, key);
      if (x === y) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * mul;
      var dx = Date.parse(x), dy = Date.parse(y);
      if (!isNaN(dx) && !isNaN(dy) && typeof x === 'string' && x.length > 7) return (dx - dy) * mul;
      return String(x).localeCompare(String(y), undefined, { numeric: true }) * mul;
    });
  };
  U.paginate = function (rows, page, size) {
    var total = rows.length;
    var pages = Math.max(1, Math.ceil(total / size));
    var p = Math.min(Math.max(1, page), pages);
    return {
      rows: rows.slice((p - 1) * size, p * size),
      page: p, pages: pages, total: total, size: size,
      from: total ? (p - 1) * size + 1 : 0,
      to: Math.min(p * size, total)
    };
  };
  U.groupBy = function (rows, key) {
    return rows.reduce(function (acc, r) {
      var k = typeof key === 'function' ? key(r) : U.get(r, key);
      (acc[k] = acc[k] || []).push(r);
      return acc;
    }, {});
  };
  U.sum = function (rows, key) {
    return rows.reduce(function (a, r) { return a + (Number(U.get(r, key)) || 0); }, 0);
  };
  U.avg = function (rows, key) { return rows.length ? U.sum(rows, key) / rows.length : 0; };

  /* ---------------- Validation ---------------- */
  U.validators = {
    required: function (v) { return (v !== null && v !== undefined && String(v).trim() !== '') || 'This field is required.'; },
    email: function (v) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Enter a valid email address.'; },
    min: function (n) { return function (v) { return !v || String(v).length >= n || 'Must be at least ' + n + ' characters.'; }; },
    max: function (n) { return function (v) { return !v || String(v).length <= n || 'Must be ' + n + ' characters or fewer.'; }; },
    numeric: function (v) { return !v || !isNaN(Number(v)) || 'Enter a number.'; },
    match: function (otherName, label) {
      return function (v, form) {
        var other = form.elements[otherName];
        return !v || v === (other && other.value) || (label || 'Values') + ' do not match.';
      };
    }
  };

  U.validateForm = function (form, rules) {
    var errors = {}, values = {};
    U.$$('.field', form).forEach(function (f) { f.classList.remove('has-error'); });

    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      var val = input.type === 'checkbox' ? input.checked : input.value;
      values[name] = typeof val === 'string' ? val.trim() : val;
      for (var i = 0; i < rules[name].length; i++) {
        var res = rules[name][i](values[name], form);
        if (res !== true) { errors[name] = res; break; }
      }
    });

    U.$$('input, select, textarea', form).forEach(function (i) {
      if (!i.name || values.hasOwnProperty(i.name)) return;
      values[i.name] = i.type === 'checkbox' ? i.checked : i.value;
    });

    Object.keys(errors).forEach(function (name) {
      var input = form.elements[name];
      var field = input.closest('.field');
      if (!field) return;
      field.classList.add('has-error');
      var msg = field.querySelector('.error-text');
      if (!msg) { msg = U.el('span', { class: 'error-text' }); field.appendChild(msg); }
      msg.innerHTML = GGL.icon('alert', 'ico') + '<span>' + U.esc(errors[name]) + '</span>';
      var ico = msg.querySelector('.ico');
      if (ico) { ico.style.width = '13px'; ico.style.height = '13px'; }
      input.setAttribute('aria-invalid', 'true');
    });

    var firstError = Object.keys(errors)[0];
    if (firstError && form.elements[firstError]) form.elements[firstError].focus();
    return { valid: !Object.keys(errors).length, values: values, errors: errors };
  };

  U.delay = function (ms) {
    return new Promise(function (res) { setTimeout(res, ms === undefined ? 380 : ms); });
  };

  /* ---------------- Real file export ---------------- */
  function csvField(v) {
    if (v === null || v === undefined) return '';
    var s = String(v).replace(/<[^>]*>/g, '').trim();
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  U.triggerDownload = function (filename, content, mime) {
    var blob = content instanceof Blob
      ? content
      : new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
    return filename;
  };

  U.downloadCsv = function (filename, columns, rows) {
    var head = columns.map(function (c) { return csvField(c.label); }).join(',');
    var body = rows.map(function (r) {
      return columns.map(function (c) {
        return csvField(c.value ? c.value(r) : U.get(r, c.key));
      }).join(',');
    }).join('\r\n');
    return U.triggerDownload(filename, '\uFEFF' + head + '\r\n' + body, 'text/csv');
  };

  U.stamp = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  };

  U.printDocument = function (title, bodyHtml) {
    var w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return false;
    w.document.write(
      '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>' +
      U.esc(title) + '</title><style>' +
      'body{font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;color:#141b25;margin:40px;line-height:1.55}' +
      'h1{font-size:24px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}' +
      '.meta{color:#6b7686;font-size:12px;margin-bottom:24px}' +
      'table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}' +
      'th,td{border:1px solid #e1e5ec;padding:7px 9px;text-align:left}' +
      'th{background:#f7f8fa;font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:.05em}' +
      'tr:nth-child(even) td{background:#fcfcfd}' +
      '.foot{margin-top:28px;padding-top:12px;border-top:1px solid #e1e5ec;color:#98a2b3;font-size:11px}' +
      '@media print{body{margin:12mm}}' +
      '</style></head><body>' + bodyHtml +
      '<div class="foot">GG Learning Labs · Generated ' + new Date().toLocaleString('en-GB') +
      ' · Prototype sample data</div></body></html>'
    );
    w.document.close();
    setTimeout(function () { w.focus(); w.print(); }, 350);
    return true;
  };

  /* ---------------- Storage ---------------- */
  U.store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem('ggl.' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, val) {
      try { localStorage.setItem('ggl.' + key, JSON.stringify(val)); return true; }
      catch (e) { return false; }
    },
    remove: function (key) { try { localStorage.removeItem('ggl.' + key); } catch (e) {} }
  };

  /* ---------------- Presentation helpers ---------------- */
  var STATUS_TONE = {
    active: 'success', published: 'success', completed: 'success', graduated: 'success',
    approved: 'success', present: 'success', delivered: 'success', passed: 'success',
    online: 'success', verified: 'success', met: 'success', issued: 'success',
    'in progress': 'info', ongoing: 'info', assigned: 'info', scheduled: 'info',
    review: 'info', 'under review': 'info', submitted: 'info', enrolled: 'info',
    medium: 'info', matching: 'info', identified: 'info', planned: 'info',
    draft: 'warning', pending: 'warning', late: 'warning', retraining: 'warning',
    'on hold': 'warning', tentative: 'warning', overdue: 'warning', excused: 'warning',
    requested: 'warning', approval: 'warning',
    inactive: 'danger', absent: 'danger', failed: 'danger', rejected: 'danger',
    cancelled: 'danger', canceled: 'danger', expired: 'danger', suspended: 'danger',
    high: 'danger', critical: 'danger', revoked: 'danger',
    archived: 'plain', 'coming soon': 'plain', 'not started': 'plain', addressed: 'success'
  };

  U.statusBadge = function (status) {
    var s = String(status || '').toLowerCase();
    var tone = STATUS_TONE[s] || '';
    var cls = 'badge' + (tone && tone !== 'plain' ? ' badge-' + tone : '');
    return '<span class="' + cls + '">' + U.esc(status) + '</span>';
  };

  U.progressCell = function (value) {
    var v = Math.max(0, Math.min(100, Number(value) || 0));
    var tone = v >= 75 ? 'green' : v >= 40 ? '' : v > 0 ? 'amber' : 'red';
    return '<div class="progress-row">' +
             '<div class="progress"><div class="progress-bar ' + tone + '" style="width:' + v + '%"></div></div>' +
             '<span class="pct">' + v + '%</span>' +
           '</div>';
  };

  U.userCell = function (name, sub) {
    return '<div class="user-cell">' +
             '<span class="avatar avatar-sm">' + U.esc(U.initials(name)) + '</span>' +
             '<span class="meta"><span class="name truncate">' + U.esc(name) + '</span>' +
             (sub ? '<span class="sub truncate">' + U.esc(sub) + '</span>' : '') + '</span>' +
           '</div>';
  };

  GGL.utils = U;

})(window.GGL = window.GGL || {});
