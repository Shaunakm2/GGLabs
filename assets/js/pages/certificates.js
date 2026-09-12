/* ==========================================================================
   GG Learning Labs — Certificates
   Issued by the assessment module, so every row traces to a passed attempt.
   ========================================================================== */
(function (GGL) {
  'use strict';

  var U = GGL.utils, UI = GGL.ui, C = GGL.charts, S = GGL.services;
  var table = null;

  var COLUMNS = [
    { key: 'serial', label: 'Serial' }, { key: 'name', label: 'Holder' },
    { key: 'employeeId', label: 'Employee ID' }, { key: 'department', label: 'Department' },
    { key: 'course', label: 'Course' }, { key: 'category', label: 'Category' },
    { key: 'score', label: 'Score %' },
    { label: 'Issued', value: function (r) { return U.date(r.issuedAt); } },
    { label: 'Expires', value: function (r) { return U.date(r.expiresAt); } },
    { key: 'status', label: 'Status' }
  ];

  function stat(label, value, icon, tone) {
    return '<div class="card stat"><div class="stat-top"><span class="stat-label">' + label + '</span>' +
      '<span class="stat-icon ' + (tone || '') + '">' + GGL.icon(icon, 'ico') + '</span></div>' +
      '<div class="stat-value">' + value + '</div></div>';
  }

  function certificateHtml(c) {
    return '<div style="border:10px solid #1b4fd8;padding:6px;background:#fff">' +
      '<div style="border:2px solid #2f6bf3;padding:40px 34px;text-align:center;' +
        'font-family:Inter,Segoe UI,Arial,sans-serif">' +
        '<div style="display:inline-block;width:44px;height:44px;line-height:44px;border-radius:10px;' +
          'background:linear-gradient(135deg,#2f6bf3,#14b8a6);color:#fff;font-weight:700;font-size:15px">GG</div>' +
        '<div style="margin-top:8px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#6b7686">' +
          'GG Learning Labs</div>' +
        '<h1 style="font-size:26px;letter-spacing:.04em;margin:22px 0 4px;color:#141b25">' +
          'Certificate of Completion</h1>' +
        '<div style="width:64px;height:3px;background:#2f6bf3;margin:0 auto 26px"></div>' +
        '<div style="font-size:12px;color:#6b7686">This is to certify that</div>' +
        '<div style="font-size:28px;font-weight:700;margin:10px 0;color:#141b25">' + U.esc(c.name) + '</div>' +
        '<div style="font-size:12px;color:#6b7686">has successfully completed</div>' +
        '<div style="font-size:17px;font-weight:600;margin:10px 0 4px;color:#173eaa">' + U.esc(c.course) + '</div>' +
        '<div style="font-size:12px;color:#6b7686">achieving a final assessment score of <strong>' +
          c.score + '%</strong></div>' +
        '<table style="width:100%;margin-top:34px;border:0;font-size:11px;color:#6b7686"><tr>' +
          '<td style="border:0;text-align:left;width:33%"><div style="border-top:1px solid #cbd2dd;padding-top:7px">' +
            'Serial<br><strong style="color:#141b25">' + U.esc(c.serial) + '</strong></div></td>' +
          '<td style="border:0;text-align:center;width:34%"><div style="border-top:1px solid #cbd2dd;padding-top:7px">' +
            'Issued<br><strong style="color:#141b25">' + U.date(c.issuedAt, 'long') + '</strong></div></td>' +
          '<td style="border:0;text-align:right;width:33%"><div style="border-top:1px solid #cbd2dd;padding-top:7px">' +
            'Valid until<br><strong style="color:#141b25">' + U.date(c.expiresAt, 'long') + '</strong></div></td>' +
        '</tr></table>' +
        '<div style="margin-top:26px;font-size:10px;color:#98a2b3">Employee ID ' +
          U.esc(c.employeeId || '—') + ' · ' + U.esc(c.department || '—') +
          ' · Verify at gglearninglabs.example/verify/' + U.esc(c.serial) + '</div>' +
        '<div style="margin-top:18px;font-size:9px;color:#cbd2dd">' +
          'Prototype sample document — not a genuine qualification</div>' +
      '</div></div>';
  }

  function downloadCertificate(c) {
    var doc = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      '<title>Certificate ' + U.esc(c.serial) + ' — ' + U.esc(c.name) + '</title>' +
      '<style>body{margin:0;padding:28px;background:#f7f8fa}' +
      '@media print{body{padding:0;background:#fff}}' +
      '.wrap{max-width:780px;margin:0 auto}' +
      '.bar{max-width:780px;margin:0 auto 16px;font:13px Inter,Segoe UI,Arial,sans-serif;color:#6b7686}' +
      '.bar button{font:inherit;padding:8px 14px;border:1px solid #cbd2dd;background:#fff;' +
        'border-radius:8px;cursor:pointer}' +
      '@media print{.bar{display:none}}</style></head><body>' +
      '<div class="bar"><button onclick="window.print()">Print or save as PDF</button></div>' +
      '<div class="wrap">' + certificateHtml(c) + '</div></body></html>';

    U.triggerDownload('certificate-' + c.serial + '.html', doc, 'text/html');
    UI.toast('Certificate downloaded', { type: 'success',
      desc: 'Open the file and use Print to save it as a PDF.' });
  }

  function viewCertificate(c) {
    UI.modal({
      title: 'Certificate ' + c.serial, subtitle: c.course, size: 'lg',
      body: (c.status !== 'Issued'
          ? '<div class="alert alert-' + (c.status === 'Revoked' ? 'danger' : 'warning') + ' mb-4">' +
            GGL.icon('alert', 'ico') + '<div class="text-sm"><strong>This certificate is ' +
            c.status.toLowerCase() + '.</strong> ' +
            (c.status === 'Revoked' ? U.esc(c.revokedReason || 'Revoked by an administrator.')
              : 'It passed its validity date and needs renewal.') + '</div></div>' : '') +
        certificateHtml(c),
      footer: '<button type="button" class="btn btn-secondary" data-close>Close</button>' +
        '<button type="button" class="btn btn-secondary" data-print>' +
          GGL.icon('fileText', 'ico') + '<span>Print</span></button>' +
        '<button type="button" class="btn btn-primary" data-download>' +
          GGL.icon('download', 'ico') + '<span>Download</span></button>',
      onMount: function (h) {
        h.overlay.querySelector('[data-close]').addEventListener('click', h.close);
        h.overlay.querySelector('[data-download]').addEventListener('click', function () { downloadCertificate(c); });
        h.overlay.querySelector('[data-print]').addEventListener('click', function () {
          U.printDocument('Certificate ' + c.serial, certificateHtml(c));
        });
      }
    });
  }

  function renderAdmin(body) {
    body.innerHTML =
      '<div class="grid grid-4 mb-6" id="ct-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-1-1 mb-6">' +
        '<div id="ct-trend"><div class="card card-pad"><div class="skel skel-chart"></div></div></div>' +
        '<div id="ct-cat"><div class="card card-pad"><div class="skel skel-chart"></div></div></div></div>' +
      '<h2 class="mb-4" style="font-size:var(--fs-lg)">Certificate register</h2><div id="ct-table"></div>';

    UI.async(document.getElementById('ct-stats'), UI.skeletonCards(4), function () {
      return S.certificates.stats().then(function (st) {
        document.getElementById('ct-stats').innerHTML =
          stat('Total issued', U.num(st.total), 'award', '') +
          stat('Currently valid', U.num(st.issued), 'checkCircle', 'green') +
          stat('Expired', U.num(st.expired), 'clock', 'amber') +
          stat('Unique holders', U.num(st.holders), 'users', 'teal');
      });
    });

    UI.async(document.getElementById('ct-trend'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.certificates.all().then(function (rows) {
        var months = [];
        for (var i = 5; i >= 0; i--) {
          var d = new Date();
          d.setMonth(d.getMonth() - i);
          months.push({ label: d.toLocaleDateString('en-GB', { month: 'short' }),
            key: d.getFullYear() + '-' + d.getMonth(), value: 0 });
        }
        rows.forEach(function (c) {
          var d = new Date(c.issuedAt);
          var m = months.filter(function (x) { return x.key === d.getFullYear() + '-' + d.getMonth(); })[0];
          if (m) m.value++;
        });
        document.getElementById('ct-trend').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>Certificates issued</h3>' +
          '<p class="sub">Last six months</p></div></div><div class="card-body">' +
          C.bar(months, { height: 240, color: 'var(--viz-5)', label: 'Certificates issued' }) + '</div></div>';
      });
    });

    UI.async(document.getElementById('ct-cat'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.certificates.all().then(function (rows) {
        var by = U.groupBy(rows, 'category');
        var data = Object.keys(by).map(function (k) { return { label: k, value: by[k].length }; })
          .sort(function (a, b) { return b.value - a.value; }).slice(0, 7);
        document.getElementById('ct-cat').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>By category</h3>' +
          '<p class="sub">Where capability is being certified</p></div>' +
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/courses.html') + '">Courses</a></div>' +
          '<div class="card-body">' + C.hbars(data) + '</div></div>';
      });
    });

    table = GGL.DataTable(document.getElementById('ct-table'), {
      searchPlaceholder: 'Search by holder, serial, course or department…',
      pageSize: 10, defaultSort: 'issuedAt', defaultDir: 'desc', selectable: true,
      columns: [
        { key: 'name', label: 'Holder', sortable: true, primary: true,
          render: function (r) { return U.userCell(r.name, r.employeeId); }},
        { key: 'serial', label: 'Serial', sortable: true, hideBelow: 'md',
          render: function (r) { return '<code class="text-xs">' + U.esc(r.serial) + '</code>'; }},
        { key: 'course', label: 'Course', sortable: true, hideBelow: 'md',
          render: function (r) {
            return '<div class="truncate" style="max-width:230px">' + U.esc(r.course) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.category) + '</div>';
          }},
        { key: 'department', label: 'Department', sortable: true, hideBelow: 'lg' },
        { key: 'score', label: 'Score', sortable: true, align: 'right', hideBelow: 'lg',
          render: function (r) { return r.score + '%'; }},
        { key: 'issuedAt', label: 'Issued', sortable: true,
          render: function (r) { return U.date(r.issuedAt); }},
        { key: 'expiresAt', label: 'Expires', sortable: true, hideBelow: 'md',
          render: function (r) { return U.date(r.expiresAt); }},
        { key: 'status', label: 'Status', sortable: true,
          render: function (r) { return U.statusBadge(r.status); }}
      ],
      filters: [
        { key: 'status', label: 'Status', options: [
          { value: 'Issued', label: 'Issued' }, { value: 'Expired', label: 'Expired' },
          { value: 'Revoked', label: 'Revoked' }]},
        { key: 'department', label: 'Department', options: GGL.seed.DEPTS.map(function (d) {
          return { value: d, label: d }; })}
      ],
      bulkActions: [{ label: 'Export selected', icon: 'download',
        onClick: function (ids, api) {
          var rows = api.selection;
          U.downloadCsv('certificates-' + U.stamp() + '.csv', COLUMNS, rows);
          UI.toast('Export downloaded', { type: 'success', desc: rows.length + ' certificates written to CSV.' });
        }}],
      toolbarExtra: '<button type="button" class="btn btn-sm btn-secondary" data-export-all>' +
          GGL.icon('download', 'ico') + '<span>Export CSV</span></button>' +
        '<button type="button" class="btn btn-sm btn-secondary" data-print-register>' +
          GGL.icon('fileText', 'ico') + '<span>Print register</span></button>',
      fetch: function (q) { return S.certificates.list(q); },
      onRowClick: viewCertificate,
      rowActions: function (row) {
        var actions = [
          { label: 'View certificate', icon: 'eye', onClick: viewCertificate },
          { label: 'Download', icon: 'download', onClick: downloadCertificate }
        ];
        if (row.status === 'Revoked') {
          actions.push({ label: 'Reinstate', icon: 'refresh', onClick: function (r) {
            UI.confirm({ title: 'Reinstate this certificate?',
              message: 'Serial ' + r.serial + ' will become valid again for ' + r.name + '.',
              tone: 'info', confirmLabel: 'Reinstate',
              onConfirm: function () {
                return S.certificates.reinstate(r.id).then(function () {
                  UI.toast('Certificate reinstated', { type: 'success' }); table.reload();
                });
              }});
          }});
        } else {
          actions.push({ label: 'Revoke certificate', icon: 'xCircle', tone: 'danger', onClick: function (r) {
            UI.confirm({ title: 'Revoke this certificate?',
              message: 'Serial ' + r.serial + ' held by ' + r.name + ' will be marked revoked.',
              detail: 'Revocation is reversible in this prototype, but in production it would be audited.',
              confirmLabel: 'Revoke',
              onConfirm: function () {
                return S.certificates.revoke(r.id).then(function () {
                  UI.toast('Certificate revoked', { type: 'success' }); table.reload();
                });
              }});
          }});
        }
        return actions;
      },
      empty: { icon: 'award', title: 'No certificates issued',
        message: 'Certificates are issued automatically when a learner passes a post-assessment.' }
    });

    document.querySelector('[data-export-all]').addEventListener('click', function () {
      S.certificates.all().then(function (rows) {
        U.downloadCsv('certificate-register-' + U.stamp() + '.csv', COLUMNS, rows);
        UI.toast('Export downloaded', { type: 'success', desc: rows.length + ' certificates written to CSV.' });
      });
    });

    document.querySelector('[data-print-register]').addEventListener('click', function () {
      S.certificates.all().then(function (rows) {
        U.printDocument('Certificate register',
          '<h1>Certificate register</h1><div class="meta">' + rows.length +
          ' records · generated for audit</div><table><thead><tr>' +
          COLUMNS.map(function (c) { return '<th>' + U.esc(c.label) + '</th>'; }).join('') +
          '</tr></thead><tbody>' + rows.map(function (r) {
            return '<tr>' + COLUMNS.map(function (c) {
              return '<td>' + U.esc(c.value ? c.value(r) : U.get(r, c.key)) + '</td>';
            }).join('') + '</tr>';
          }).join('') + '</tbody></table>');
      });
    });
  }

  function renderLearner(body, user) {
    body.innerHTML = '<div class="grid grid-4 mb-6" id="ct-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div id="ct-mine"><div class="grid grid-3">' + UI.skeletonCards(6) + '</div></div>';

    UI.async(document.getElementById('ct-mine'), '<div class="grid grid-3">' + UI.skeletonCards(6) + '</div>', function () {
      return S.certificates.forUser(user.id).then(function (rows) {
        var valid = rows.filter(function (c) { return c.status === 'Issued'; });
        document.getElementById('ct-stats').innerHTML =
          stat('My certificates', rows.length, 'award', '') +
          stat('Currently valid', valid.length, 'checkCircle', 'green') +
          stat('Expired', rows.filter(function (c) { return c.status === 'Expired'; }).length, 'clock', 'amber') +
          stat('Average score', (rows.length ? Math.round(U.avg(rows, 'score')) : 0) + '%', 'trending', 'violet');

        var el = document.getElementById('ct-mine');
        if (!rows.length) {
          el.innerHTML = '<div class="card">' + UI.empty({ icon: 'award', title: 'No certificates yet',
            message: 'Pass a course post-assessment and your certificate is issued automatically.',
            action: 'Browse assessments' }) + '</div>';
          el.querySelector('[data-empty-action]').addEventListener('click', function () {
            window.location.href = GGL.url('app/assessments.html');
          });
          return;
        }

        el.innerHTML = '<div class="grid grid-3 mb-5">' + rows.map(function (c, i) {
            var variant = ['', 'v2', 'v3', 'v4'][i % 4];
            return '<article class="card course-card"><div class="course-thumb ' + variant + '">' +
              '<span class="cat">' + U.esc(c.category) + '</span>' + GGL.icon('award', 'ico') + '</div>' +
              '<div class="course-body"><div class="row-between gap-2 mb-2">' + U.statusBadge(c.status) +
              '<span class="badge badge-plain">' + c.score + '%</span></div>' +
              '<h3>' + U.esc(c.course) + '</h3>' +
              '<div class="course-meta"><span>' + GGL.icon('file', 'ico') + U.esc(c.serial) + '</span>' +
              '<span>' + GGL.icon('calendar', 'ico') + U.date(c.issuedAt) + '</span></div>' +
              '<div class="course-foot"><div class="text-xs text-muted mb-3">Valid until ' +
                U.date(c.expiresAt) + '</div><div class="row gap-2">' +
                '<button type="button" class="btn btn-sm btn-secondary grow" data-view="' + U.esc(c.id) + '">View</button>' +
                '<button type="button" class="btn btn-sm btn-primary btn-icon" data-dl="' + U.esc(c.id) + '" ' +
                  'aria-label="Download certificate ' + U.esc(c.serial) + '">' +
                  GGL.icon('download', 'ico') + '</button></div></div></div></article>';
          }).join('') + '</div>' +
          '<div class="card card-pad"><div class="row-between wrap gap-3">' +
            '<div><strong class="text-sm">Export my certificates</strong>' +
            '<div class="text-xs text-muted">A CSV summary of every certificate you hold.</div></div>' +
            '<button type="button" class="btn btn-secondary btn-sm" data-export-mine>' +
              GGL.icon('download', 'ico') + '<span>Download CSV</span></button></div></div>';

        U.$$('[data-view]', el).forEach(function (b) {
          b.addEventListener('click', function () {
            viewCertificate(rows.filter(function (c) { return c.id === b.getAttribute('data-view'); })[0]);
          });
        });
        U.$$('[data-dl]', el).forEach(function (b) {
          b.addEventListener('click', function () {
            downloadCertificate(rows.filter(function (c) { return c.id === b.getAttribute('data-dl'); })[0]);
          });
        });
        el.querySelector('[data-export-mine]').addEventListener('click', function () {
          U.downloadCsv('my-certificates-' + U.stamp() + '.csv', COLUMNS, rows);
          UI.toast('Export downloaded', { type: 'success', desc: rows.length + ' certificates written to CSV.' });
        });
      });
    });
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var isLearner = user.role === GGL.ROLES.END_USER;

    var body = GGL.shell.mount({
      active: 'certificates',
      title: isLearner ? 'My certificates' : 'Certificates',
      subtitle: isLearner ? 'Every certificate you have earned, ready to download.'
        : 'The issued register, with revocation and audit-ready exports.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Certificates' }],
      actions: isLearner ? '' : '<a class="btn btn-secondary" href="' + GGL.url('app/assessments.html') + '">' +
        GGL.icon('checkSquare', 'ico') + '<span>Assessments</span></a>'
    });
    if (!body) return;

    if (isLearner) renderLearner(body, user);
    else renderAdmin(body);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
