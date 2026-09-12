/* GG Learning Labs — Reporting centre (real exports) */
(function (GGL) {
  'use strict';
  var U = GGL.utils, UI = GGL.ui, C = GGL.charts, S = GGL.services;
  var lastRendered = { columns: [], rows: [] };

  function reportCard(r) {
    return '<article class="card card-interactive report-card">' +
      '<div class="feature-icon" style="width:38px;height:38px;margin-bottom:var(--sp-3)">' +
      GGL.icon(r.icon, 'ico') + '</div><h3>' + U.esc(r.name) + '</h3>' +
      '<p>' + U.esc(r.description) + '</p>' +
      '<div class="row-between mt-4"><span class="text-xs text-subtle">Last run ' + U.relative(r.lastRun) + '</span>' +
      '<span class="badge badge-plain">' + U.esc(r.category) + '</span></div>' +
      '<button type="button" class="btn btn-secondary btn-sm btn-block mt-4" data-run="' + U.esc(r.id) + '">' +
      GGL.icon('play','ico') + '<span>Run report</span></button></article>';
  }

  function pickSeries(report) {
    var d = GGL.data;
    if (/Attendance/.test(report.name)) {
      return { chart: C.donut(d.series.attendanceSplit, { size: 160, stroke: 24, label: 'Attendance split' }),
        head: ['Status','Records','Share'],
        body: d.series.attendanceSplit.map(function (s) {
          return [U.esc(s.label), U.num(s.value * 12), s.value + '%'];
        })};
    }
    if (/Trainer/.test(report.name)) {
      var trainers = d.trainers.slice(0, 8);
      return { chart: C.hbars(trainers.map(function (t) {
          return { label: t.name, value: Math.round(t.effectiveness) };
        }), { suffix: '%' }),
        head: ['Trainer','Sessions','Hours','Observation','Effectiveness'],
        body: trainers.map(function (t) {
          return [U.esc(t.name), U.num(t.sessionsDelivered), U.num(t.trainingHours),
            t.observationScore + '/5', U.progressCell(Math.round(t.effectiveness))];
        })};
    }
    if (/Competency/.test(report.name)) {
      return { chart: C.hbars(d.competencies.map(function (c) {
          return { label: c.name, value: c.gap,
            color: c.gap >= 2 ? 'var(--viz-6)' : c.gap === 1 ? 'var(--viz-3)' : 'var(--viz-5)' };
        }), { suffix: ' levels' }),
        head: ['Competency','Current','Required','Gap','Priority'],
        body: d.competencies.map(function (c) {
          return [U.esc(c.name), c.current + '/5', c.required + '/5', String(c.gap), U.statusBadge(c.priority)];
        })};
    }
    if (/Learning Hours/.test(report.name)) {
      var total = U.sum(d.series.hoursByMode, 'value');
      return { chart: C.bar(d.series.hoursByMode, { height: 220, color: 'var(--viz-2)', label: 'Learning hours' }),
        head: ['Delivery mode','Hours','Share'],
        body: d.series.hoursByMode.map(function (m) {
          return [U.esc(m.label), U.num(m.value), Math.round(m.value / total * 100) + '%'];
        })};
    }
    if (/Effectiveness/.test(report.name)) {
      return { chart: C.line(d.series.effectivenessTrend, { height: 220, color: 'var(--viz-4)',
          label: 'Effectiveness', zeroBased: false }),
        head: ['Course','Responses','Pre','Post','Gain','Overall'],
        body: d.effectiveness.slice(0, 8).map(function (e) {
          return [U.esc(e.course), U.num(e.responses), e.preScore + '%', e.postScore + '%',
            '+' + e.gain, U.progressCell(e.overall)];
        })};
    }
    if (/Batch|Graduation|Retraining/.test(report.name)) {
      var batches = d.batches.slice(0, 8);
      return { chart: C.bar(batches.map(function (b, i) { return { label: 'B' + (i + 1), value: b.completion }; }),
          { height: 220, suffix: '%', label: 'Batch completion' }),
        head: ['Batch','Programme','Trainees','Attendance','Completion'],
        body: batches.map(function (b) {
          return [U.esc(b.name), U.esc(b.programme), String(b.trainees),
            b.attendanceRate === null ? '—' : b.attendanceRate + '%', U.progressCell(b.completion)];
        })};
    }
    var courses = d.courses.filter(function (c) { return c.status === 'Published'; }).slice(0, 8);
    return { chart: C.line(d.series.completion, { height: 220, suffix: '%', label: 'Completion trend' }),
      head: ['Course','Category','Enrolled','Completed','Rate'],
      body: courses.map(function (c) {
        return [U.esc(c.title), U.esc(c.category), U.num(c.enrolled), U.num(c.completed),
          U.progressCell(c.completionRate)];
      })};
  }

  function renderOutput(report, res) {
    var series = pickSeries(report);
    lastRendered = {
      columns: series.head.map(function (h, i) {
        return { label: h, value: function (row) { return row[i]; } };
      }),
      rows: series.body
    };
    return '<div class="row-between mb-4 wrap gap-3">' +
        '<div><strong>' + U.num(res.rows) + '</strong> <span class="text-muted">records matched</span></div>' +
        '<span class="text-xs text-subtle">Generated ' + U.date(res.generatedAt) + ', ' + U.time(res.generatedAt) + '</span></div>' +
      '<div class="card card-pad mb-4">' + series.chart + '</div>' +
      '<div class="card"><div class="table-wrap"><table class="table"><thead><tr>' +
        series.head.map(function (h) { return '<th>' + U.esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + series.body.map(function (row) {
        return '<tr>' + row.map(function (cell, i) {
          return '<td' + (i === 0 ? ' class="cell-primary"' : '') + '>' + cell + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function openReport(report) {
    var handle = UI.modal({
      title: report.name, subtitle: report.description, size: 'xl',
      body: '<form id="rp-filters" class="card card-pad mb-5"><div class="grid grid-4 gap-3">' +
          '<div class="field" style="margin:0"><label class="label" for="rp-from">From</label>' +
            '<input class="input" id="rp-from" name="from" type="date" value="' +
            new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10) + '"></div>' +
          '<div class="field" style="margin:0"><label class="label" for="rp-to">To</label>' +
            '<input class="input" id="rp-to" name="to" type="date" value="' +
            new Date().toISOString().slice(0, 10) + '"></div>' +
          '<div class="field" style="margin:0"><label class="label" for="rp-dept">Department</label>' +
            '<select class="select" id="rp-dept" name="department"><option value="all">All departments</option>' +
              GGL.seed.DEPTS.map(function (d) { return '<option>' + U.esc(d) + '</option>'; }).join('') + '</select></div>' +
          '<div class="field" style="margin:0"><label class="label" for="rp-group">Group by</label>' +
            '<select class="select" id="rp-group" name="groupBy"><option>Month</option>' +
            '<option>Department</option><option>Course</option><option>Trainer</option></select></div></div>' +
        '<div class="row gap-3 mt-4">' +
          '<button type="submit" class="btn btn-primary btn-sm">' + GGL.icon('refresh','ico') +
            '<span>Apply filters</span></button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-reset-filters>Reset</button></div></form>' +
        '<div id="rp-output"></div>',
      footer: '<span class="text-xs text-subtle grow" style="align-self:center">Exports the filtered result set</span>' +
        '<button type="button" class="btn btn-secondary" data-export="PDF">' + GGL.icon('download','ico') + '<span>PDF</span></button>' +
        '<button type="button" class="btn btn-secondary" data-export="Excel">' + GGL.icon('download','ico') + '<span>Excel</span></button>' +
        '<button type="button" class="btn btn-primary" data-export="CSV">' + GGL.icon('download','ico') + '<span>CSV</span></button>'
    });

    var output = handle.overlay.querySelector('#rp-output');
    var filters = handle.overlay.querySelector('#rp-filters');

    function run(values) {
      output.innerHTML = '<div class="card card-pad"><div class="skel skel-chart"></div>' +
        '<div class="skel skel-row mt-4"></div><div class="skel skel-row"></div></div>';
      S.reports.run(report.id, values || {}).then(function (res) {
        output.innerHTML = renderOutput(report, res);
      }).catch(function (err) {
        output.innerHTML = UI.error({ message: err.message });
        output.querySelector('[data-retry]').addEventListener('click', function () { run(values); });
      });
    }

    filters.addEventListener('submit', function (e) {
      e.preventDefault();
      var values = {};
      U.$$('input, select', filters).forEach(function (i) { values[i.name] = i.value; });
      if (values.from && values.to && values.from > values.to) {
        UI.toast('The "from" date is after the "to" date', { type: 'error' }); return;
      }
      run(values);
      UI.toast('Filters applied', { type: 'success', duration: 2000 });
    });

    handle.overlay.querySelector('[data-reset-filters]').addEventListener('click', function () {
      filters.reset(); run({});
    });

    U.$$('[data-export]', handle.overlay).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var format = btn.getAttribute('data-export');
        btn.classList.add('is-loading');
        S.reports.export(report.id, format, lastRendered).then(function (res) {
          btn.classList.remove('is-loading');
          UI.toast(format + (res.printed ? ' ready to print' : ' export downloaded'), {
            type: 'success',
            desc: res.printed ? 'Use your browser\u2019s print dialog to save it as a PDF.'
                              : res.rows + ' rows written to ' + res.file + '.'
          });
        }).catch(function (err) {
          btn.classList.remove('is-loading');
          UI.toast('Export failed', { type: 'error', desc: err.message });
        });
      });
    });

    run({});
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }

    if (user.role === GGL.ROLES.END_USER) {
      var denied = GGL.shell.mount({ active: 'reports', title: 'Reports',
        breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Reports' }] });
      if (denied) denied.innerHTML = '<div class="card"><div class="state">' +
        '<div class="state-icon danger">' + GGL.icon('lock','ico') + '</div>' +
        '<h3>You don\u2019t have access to this area</h3>' +
        '<p>The reporting centre is available to administrators.</p>' +
        '<a class="btn btn-primary" href="' + GGL.url('app/dashboard.html') + '">Back to dashboard</a></div></div>';
      return;
    }

    var body = GGL.shell.mount({
      active: 'reports', title: 'Reports',
      subtitle: 'Run, filter and export the reports your audits and reviews need.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Reports' }]
    });
    if (!body) return;

    body.innerHTML = '<div class="card mb-5"><div class="toolbar">' +
        '<div class="search"><label class="input-icon"><span class="sr-only">Search reports</span>' +
        GGL.icon('search','ico') + '<input type="search" class="input" id="rep-search" placeholder="Search reports…"></label></div>' +
        '<select class="select" id="rep-cat"><option value="all">Category: All</option>' +
        '<option>Operations</option><option>Quality</option><option>People</option></select></div></div>' +
      '<div id="rep-grid"><div class="grid grid-3">' + UI.skeletonCards(6) + '</div></div>';

    var grid = document.getElementById('rep-grid');
    var all = [];

    function draw() {
      var q = document.getElementById('rep-search').value.toLowerCase().trim();
      var cat = document.getElementById('rep-cat').value;
      var rows = all.filter(function (r) {
        return (!q || (r.name + ' ' + r.description).toLowerCase().indexOf(q) !== -1) &&
               (cat === 'all' || r.category === cat);
      });
      if (!rows.length) {
        grid.innerHTML = '<div class="card">' + UI.empty({ icon: 'search', title: 'No reports match',
          message: 'Try a different search term or category.' }) + '</div>';
        return;
      }
      grid.innerHTML = '<div class="grid grid-3">' + rows.map(reportCard).join('') + '</div>';
      U.$$('[data-run]', grid).forEach(function (btn) {
        btn.addEventListener('click', function () {
          openReport(all.filter(function (r) { return r.id === btn.getAttribute('data-run'); })[0]);
        });
      });
    }

    UI.async(grid, '<div class="grid grid-3">' + UI.skeletonCards(6) + '</div>', function () {
      return S.reports.catalogue().then(function (rows) { all = rows; draw(); });
    });

    document.getElementById('rep-search').addEventListener('input', U.debounce(draw, 250));
    document.getElementById('rep-cat').addEventListener('change', draw);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
