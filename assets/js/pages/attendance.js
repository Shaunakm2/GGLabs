/* GG Learning Labs — Attendance */
(function (GGL) {
  'use strict';
  var U = GGL.utils, UI = GGL.ui, C = GGL.charts, S = GGL.services;
  var STATES = ['Present','Late','Absent','Excused'];
  var table = null;

  var COLUMNS = [
    { key: 'name', label: 'Trainee' }, { key: 'employeeId', label: 'Employee ID' },
    { key: 'department', label: 'Department' }, { key: 'sessionTitle', label: 'Session' },
    { key: 'batchName', label: 'Batch' },
    { label: 'Date', value: function (r) { return U.date(r.date); } },
    { key: 'status', label: 'Status' }, { key: 'minutesAttended', label: 'Minutes attended' }
  ];

  function statusToggle(row) {
    return '<div class="att-toggle" role="group" aria-label="Attendance for ' + U.esc(row.name) + '">' +
      STATES.map(function (st) {
        return '<button type="button" data-att="' + st + '" data-id="' + U.esc(row.id) + '" ' +
          'aria-pressed="' + (row.status === st) + '" title="' + st + '">' + st.charAt(0) + '</button>';
      }).join('') + '</div>';
  }

  function stat(label, value, icon, tone) {
    return '<div class="card stat"><div class="stat-top"><span class="stat-label">' + label + '</span>' +
      '<span class="stat-icon ' + tone + '">' + GGL.icon(icon,'ico') + '</span></div>' +
      '<div class="stat-value">' + value + '</div></div>';
  }

  function refreshSummary() {
    var el = document.getElementById('a-stats');
    if (!el) return;
    S.attendance.summary().then(function (st) {
      el.innerHTML = stat('Attendance rate', st.rate + '%', 'userCheck', 'green') +
        stat('Present', U.num(st.present), 'checkCircle', '') +
        stat('Late', U.num(st.late), 'clock', 'amber') +
        stat('Absent', U.num(st.absent), 'xCircle', 'red');
      var chart = document.getElementById('a-chart');
      if (chart) {
        chart.innerHTML = '<div class="card"><div class="card-head"><div><h3>Attendance breakdown</h3>' +
          '<p class="sub">Across all recorded sessions</p></div></div><div class="card-body">' +
          C.donut([
            { label: 'Present', value: st.present, color: 'var(--viz-5)' },
            { label: 'Late', value: st.late, color: 'var(--viz-3)' },
            { label: 'Absent', value: st.absent, color: 'var(--viz-6)' },
            { label: 'Excused', value: st.excused, color: 'var(--viz-1)' }
          ], { size: 170, stroke: 26, centreValue: st.rate + '%', centreLabel: 'attended',
               label: 'Attendance breakdown' }) + '</div></div>';
      }
    });
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }

    var body = GGL.shell.mount({
      active: 'attendance', title: 'Attendance',
      subtitle: 'Mark, review and report attendance across sessions.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Attendance' }],
      actions: '<button type="button" class="btn btn-secondary" data-export>' +
        GGL.icon('download','ico') + '<span>Export register</span></button>'
    });
    if (!body) return;

    body.innerHTML = '<div class="grid grid-4 mb-6" id="a-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-2-1 mb-6">' +
        '<div id="a-by-session"><div class="card card-pad"><div class="skel skel-chart"></div></div></div>' +
        '<div id="a-chart"><div class="card card-pad"><div class="skel skel-chart"></div></div></div></div>' +
      '<h2 class="mb-4" style="font-size:var(--fs-lg)">Attendance register</h2><div id="a-table"></div>';

    refreshSummary();

    UI.async(document.getElementById('a-by-session'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.sessions.all().then(function (rows) {
        var completed = rows.filter(function (s) {
          return s.attendance !== null && s.attendance !== undefined;
        }).slice(0, 8);
        document.getElementById('a-by-session').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>Attendance by session</h3>' +
          '<p class="sub">Most recent completed sessions</p></div></div><div class="card-body">' +
          C.bar(completed.map(function (s, i) { return { label: 'S' + (i + 1), value: s.attendance }; }),
            { height: 250, suffix: '%', color: 'var(--viz-1)', label: 'Attendance by session' }) + '</div></div>';
      });
    });

    var container = document.getElementById('a-table');
    table = GGL.DataTable(container, {
      searchPlaceholder: 'Search trainees, sessions or batches…',
      pageSize: 10, defaultSort: 'date', defaultDir: 'desc', selectable: true,
      columns: [
        { key: 'name', label: 'Trainee', sortable: true, primary: true,
          render: function (r) { return U.userCell(r.name, r.employeeId); }},
        { key: 'sessionTitle', label: 'Session', sortable: true, hideBelow: 'md',
          render: function (r) {
            return '<div class="truncate" style="max-width:240px">' + U.esc(r.sessionTitle) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.batchName) + '</div>';
          }},
        { key: 'department', label: 'Department', sortable: true, hideBelow: 'lg' },
        { key: 'date', label: 'Date', sortable: true, hideBelow: 'md',
          render: function (r) { return U.date(r.date); }},
        { key: 'status', label: 'Status', sortable: true,
          render: function (r) { return U.statusBadge(r.status); }},
        { key: 'mark', label: 'Mark', width: '160px', render: statusToggle }
      ],
      filters: [{ key: 'status', label: 'Status', options: STATES.map(function (s) { return { value: s, label: s }; })}],
      bulkActions: STATES.map(function (st) {
        return { label: 'Mark ' + st.toLowerCase(),
          icon: st === 'Present' ? 'checkCircle' : st === 'Absent' ? 'xCircle' : st === 'Late' ? 'clock' : 'info',
          onClick: function (ids, api) {
            UI.confirm({ title: 'Mark ' + ids.length + ' record(s) as ' + st.toLowerCase() + '?',
              message: 'This updates the attendance register for the selected trainees.',
              tone: 'info', confirmLabel: 'Mark ' + st.toLowerCase(),
              onConfirm: function () {
                return S.attendance.markAll(ids, st).then(function (res) {
                  UI.toast(res.updated + ' record(s) updated', { type: 'success' });
                  api.clearSelection(); api.reload(); refreshSummary();
                });
              }});
          }};
      }),
      fetch: function (q) { return S.attendance.list(q); },
      empty: { icon: 'userCheck', title: 'No attendance records',
        message: 'Attendance appears here once sessions have been delivered.' }
    });

    U.on(container, 'click', '[data-att]', function (e, btn) {
      var id = btn.getAttribute('data-id');
      var status = btn.getAttribute('data-att');
      U.$$('[data-att]', btn.parentNode).forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      S.attendance.update(id, { status: status }).then(function () {
        UI.toast('Marked ' + status.toLowerCase(), { type: 'success', duration: 1800 });
        refreshSummary();
      }).catch(function () { UI.toast('Could not save', { type: 'error' }); });
    });

    document.querySelector('[data-export]').addEventListener('click', function () {
      S.attendance.all().then(function (rows) {
        U.downloadCsv('attendance-register-' + U.stamp() + '.csv', COLUMNS, rows);
        UI.toast('Export downloaded', { type: 'success', desc: rows.length + ' records written to CSV.' });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
