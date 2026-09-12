/* ==========================================================================
   GG Learning Labs — Trainer Effectiveness Calculator

   Reproduces "Trainer Effectiveness.xlsx":
     Effectiveness = L1×0.30 + TOF×0.30 + Throughput×0.20
                   + Utilization×0.15 + Attendance×0.05
   A component below 90% is flagged and forces "Needs Improvement".
   ========================================================================== */
(function (GGL) {
  'use strict';

  var U = GGL.utils, UI = GGL.ui, C = GGL.charts, S = GGL.services;
  var table = null;

  var COLUMNS = [
    { key: 'trainer', label: 'Trainer' }, { key: 'month', label: 'Month' },
    { label: 'L1 Score (%)', value: function (r) { return r.l1; } },
    { label: 'TOF', value: function (r) { return r.tof; } },
    { label: 'Throughput', value: function (r) { return r.throughput; } },
    { label: 'Utilization (%)', value: function (r) { return r.utilization; } },
    { label: 'Attendance', value: function (r) { return r.attendance; } },
    { label: 'Trainer Effectiveness (%)', value: function (r) { return r.effectiveness; } },
    { key: 'rating', label: 'Rating' }, { key: 'improvement', label: 'Area of Improvement' }
  ];

  function stat(label, value, icon, tone, sub) {
    return '<div class="card stat"><div class="stat-top"><span class="stat-label">' + label + '</span>' +
      '<span class="stat-icon ' + (tone || '') + '">' + GGL.icon(icon, 'ico') + '</span></div>' +
      '<div class="stat-value">' + value + '</div>' +
      (sub ? '<div class="text-xs text-muted mt-2">' + U.esc(sub) + '</div>' : '') + '</div>';
  }

  function ratingBadge(rating) {
    var tone = rating === 'Effective' ? 'success' : rating === 'Satisfactory' ? 'info' : 'warning';
    return '<span class="badge badge-' + tone + '">' + U.esc(rating) + '</span>';
  }
  function pct(v) { return (Math.round(v * 100) / 100).toFixed(2) + '%'; }

  function openCalculator(record) {
    var weights = S.effectivenessCalc.weights();
    var isEdit = !!record;
    record = record || {};

    var handle = UI.modal({
      title: isEdit ? 'Effectiveness — ' + record.trainer : 'Trainer effectiveness calculator',
      subtitle: 'Weighted model: ' + weights.map(function (w) {
        return w.label + ' ' + Math.round(w.weight * 100) + '%';
      }).join(' · '),
      size: 'lg',
      body: '<form id="eff-form" novalidate>' +
        '<div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="ef-trainer">Trainer <span class="req">*</span></label>' +
            '<select class="select" id="ef-trainer" name="trainerId"><option value="">Select a trainer…</option>' +
              GGL.data.trainers.map(function (t) {
                return '<option value="' + U.esc(t.id) + '"' +
                  (record.trainerId === t.id ? ' selected' : '') + '>' + U.esc(t.name) + '</option>';
              }).join('') + '</select></div>' +
          '<div class="field"><label class="label" for="ef-month">Month <span class="req">*</span></label>' +
            '<select class="select" id="ef-month" name="month">' +
              ['January','February','March','April','May','June','July','August',
               'September','October','November','December'].map(function (m) {
                return '<option' + (record.month === m ? ' selected' : '') + '>' + m + '</option>';
              }).join('') + '</select></div></div>' +

        '<div class="calc-grid">' + weights.map(function (w) {
          var val = record[w.key];
          return '<div class="calc-row" data-metric="' + w.key + '">' +
            '<div class="calc-meta"><div class="calc-name">' + U.esc(w.label) +
              '<span class="calc-weight">' + Math.round(w.weight * 100) + '%</span></div>' +
              '<div class="calc-hint">' + U.esc(w.hint) + '</div></div>' +
            '<div class="calc-input">' +
              '<input class="input" type="number" name="' + w.key + '" min="0" max="150" step="0.01" ' +
                'value="' + (val === undefined ? '' : val) + '" placeholder="0.00" ' +
                'aria-label="' + U.esc(w.label) + ' percentage">' +
              '<span class="calc-suffix">%</span></div>' +
            '<div class="calc-contrib" data-contrib="' + w.key + '">—</div></div>';
        }).join('') + '</div>' +

        '<div class="calc-result" data-result></div>' +
        '<div class="alert mt-4">' + GGL.icon('info', 'ico') + '<div class="text-sm">' +
          'A component below ' + GGL.data.effThreshold + '% is flagged as an area of improvement and ' +
          'sets the rating to Needs Improvement, even where the weighted total is otherwise healthy.' +
        '</div></div></form>',
      footer: '<button type="button" class="btn btn-ghost" data-sample>Load workbook sample</button>' +
        '<div class="grow"></div>' +
        '<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
        '<button type="button" class="btn btn-primary" data-save>' +
          GGL.icon('check', 'ico') + '<span>Save record</span></button>'
    });

    var form = handle.overlay.querySelector('#eff-form');
    var resultEl = handle.overlay.querySelector('[data-result]');

    function readMetrics() {
      var m = {};
      weights.forEach(function (w) {
        var v = form.elements[w.key].value;
        m[w.key] = v === '' ? 0 : Number(v);
      });
      return m;
    }

    function recalc() {
      var out = S.effectivenessCalc.calculate(readMetrics());
      out.contributions.forEach(function (c) {
        var el = form.querySelector('[data-contrib="' + c.key + '"]');
        if (!el) return;
        el.innerHTML = '<span class="contrib-val">' + c.contribution.toFixed(2) + '</span>' +
          '<span class="contrib-lbl">pts</span>';
        el.classList.toggle('below', c.below && c.value > 0);
        var row = form.querySelector('[data-metric="' + c.key + '"]');
        if (row) row.classList.toggle('flagged', c.below && c.value > 0);
      });

      var tone = out.rating === 'Effective' ? 'success' : out.rating === 'Satisfactory' ? 'info' : 'warning';
      resultEl.innerHTML = '<div class="calc-total">' +
        '<div class="calc-total-left"><div class="calc-total-label">Trainer Effectiveness</div>' +
          '<div class="calc-total-value" style="color:var(--' + tone + ')">' +
            out.effectiveness.toFixed(2) + '%</div>' +
          '<div class="mt-2">' + ratingBadge(out.rating) + '</div></div>' +
        '<div class="calc-total-right"><div class="text-xs text-muted mb-2">Area of improvement</div>' +
          '<div class="fw-medium text-sm">' + U.esc(out.improvement) + '</div>' +
          '<div class="calc-formula">' + out.contributions.map(function (c) {
            return '<span' + (c.below && c.value > 0 ? ' class="below"' : '') + '>' +
              c.value.toFixed(2) + '×' + c.weight.toFixed(2) + '</span>';
          }).join('<i>+</i>') + '</div></div></div>';
    }

    form.addEventListener('input', recalc);

    handle.overlay.querySelector('[data-sample]').addEventListener('click', function () {
      form.elements.l1.value = 92.7; form.elements.tof.value = 91.5;
      form.elements.throughput.value = 95.5; form.elements.utilization.value = 102;
      form.elements.attendance.value = 100;
      recalc();
      UI.toast('Workbook sample loaded', { type: 'info',
        desc: 'Expected result 94.66% — Effective, no improvement required.' });
    });

    handle.overlay.querySelector('[data-cancel]').addEventListener('click', handle.close);

    handle.overlay.querySelector('[data-save]').addEventListener('click', function () {
      var btn = this;
      var result = U.validateForm(form, {
        trainerId: [U.validators.required], month: [U.validators.required]
      });
      if (!result.valid) return;

      var trainer = GGL.data.trainers.filter(function (t) { return t.id === result.values.trainerId; })[0];
      var metrics = Object.assign(readMetrics(), { trainerId: result.values.trainerId,
        trainer: trainer ? trainer.name : '—', month: result.values.month });

      btn.classList.add('is-loading');
      btn.disabled = true;

      S.effectivenessCalc.saveRecord(isEdit ? record.id : null, metrics).then(function (row) {
        handle.close();
        UI.toast('Effectiveness recorded', { type: 'success',
          desc: row.trainer + ' — ' + row.effectiveness.toFixed(2) + '%, ' + row.rating + '.' });
        if (table) table.reload();
      }).catch(function (err) {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        UI.toast('Could not save', { type: 'error', desc: err.message });
      });
    });

    recalc();
  }

  function viewRecord(r) {
    var out = S.effectivenessCalc.calculate(r);
    UI.modal({
      title: r.trainer + ' — ' + r.month,
      subtitle: 'Weighted effectiveness ' + r.effectiveness.toFixed(2) + '% · ' + r.rating,
      size: 'lg',
      body: '<div class="row gap-5 mb-5 wrap" style="align-items:center">' +
          C.gauge(r.effectiveness, { size: 150, caption: r.rating }) +
          '<div class="grow" style="min-width:240px">' +
            C.hbars(out.contributions.map(function (c) {
              return { label: c.label + ' (' + Math.round(c.weight * 100) + '%)',
                value: Math.round(c.value), color: c.below ? 'var(--viz-6)' : 'var(--viz-1)' };
            }), { suffix: '%' }) + '</div></div>' +
        '<div class="table-wrap mb-5"><table class="table"><thead><tr>' +
          '<th>Component</th><th class="text-right">Score</th><th class="text-right">Weight</th>' +
          '<th class="text-right">Contribution</th><th>Status</th></tr></thead><tbody>' +
          out.contributions.map(function (c) {
            return '<tr><td class="cell-primary">' + U.esc(c.label) + '</td>' +
              '<td class="text-right">' + c.value.toFixed(2) + '%</td>' +
              '<td class="text-right">' + Math.round(c.weight * 100) + '%</td>' +
              '<td class="text-right"><strong>' + c.contribution.toFixed(2) + '</strong></td>' +
              '<td>' + (c.below ? '<span class="badge badge-warning">Below ' + GGL.data.effThreshold + '%</span>'
                : '<span class="badge badge-success">Met</span>') + '</td></tr>';
          }).join('') +
          '<tr style="border-top:2px solid var(--border-strong)">' +
            '<td class="cell-primary"><strong>Trainer Effectiveness</strong></td><td colspan="2"></td>' +
            '<td class="text-right"><strong>' + r.effectiveness.toFixed(2) + '%</strong></td>' +
            '<td>' + ratingBadge(r.rating) + '</td></tr></tbody></table></div>' +
        '<dl class="kv"><dt>Area of improvement</dt><dd>' + U.esc(r.improvement) + '</dd>' +
          '<dt>Source</dt><dd>' + U.esc(r.source || 'Platform') + '</dd></dl>' +
        (r.gaps && r.gaps.length
          ? '<div class="alert alert-warning mt-4">' + GGL.icon('alert', 'ico') + '<div class="text-sm">' +
            '<strong>' + r.gaps.join(' and ') + '</strong> ' + (r.gaps.length > 1 ? 'are' : 'is') +
            ' below the ' + GGL.data.effThreshold + '% threshold. Review the trainer observation and ' +
            'agree a development action.</div></div>'
          : '<div class="alert alert-success mt-4">' + GGL.icon('checkCircle', 'ico') +
            '<div class="text-sm">All components meet the threshold. No improvement required.</div></div>'),
      footer: '<button type="button" class="btn btn-secondary" data-close>Close</button>' +
        '<button type="button" class="btn btn-secondary" data-print>' +
          GGL.icon('fileText', 'ico') + '<span>Print</span></button>' +
        '<button type="button" class="btn btn-primary" data-edit>Recalculate</button>',
      onMount: function (h) {
        h.overlay.querySelector('[data-close]').addEventListener('click', h.close);
        h.overlay.querySelector('[data-edit]').addEventListener('click', function () {
          h.close(); setTimeout(function () { openCalculator(r); }, 240);
        });
        h.overlay.querySelector('[data-print]').addEventListener('click', function () {
          U.printDocument('Trainer effectiveness — ' + r.trainer,
            '<h1>Trainer Effectiveness Scorecard</h1><div class="meta">' + U.esc(r.trainer) + ' · ' +
            U.esc(r.month) + '</div><table><thead><tr><th>Component</th><th>Score</th>' +
            '<th>Weight</th><th>Contribution</th></tr></thead><tbody>' +
            out.contributions.map(function (c) {
              return '<tr><td>' + U.esc(c.label) + '</td><td>' + c.value.toFixed(2) + '%</td><td>' +
                Math.round(c.weight * 100) + '%</td><td>' + c.contribution.toFixed(2) + '</td></tr>';
            }).join('') +
            '<tr><td><strong>Trainer Effectiveness</strong></td><td colspan="2"></td><td><strong>' +
              r.effectiveness.toFixed(2) + '%</strong></td></tr></tbody></table>' +
            '<h2>Outcome</h2><p>Rating: <strong>' + U.esc(r.rating) + '</strong><br>' +
            'Area of improvement: ' + U.esc(r.improvement) + '</p>');
        });
      }
    });
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }

    if (user.role === GGL.ROLES.END_USER) {
      var denied = GGL.shell.mount({ active: 'effectiveness-calculator',
        title: 'Effectiveness calculator',
        breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Calculator' }] });
      if (denied) denied.innerHTML = '<div class="card"><div class="state">' +
        '<div class="state-icon danger">' + GGL.icon('lock', 'ico') + '</div>' +
        '<h3>You don\u2019t have access to this area</h3>' +
        '<p>The effectiveness calculator is available to administrators.</p>' +
        '<a class="btn btn-primary" href="' + GGL.url('app/dashboard.html') + '">Back to dashboard</a></div></div>';
      return;
    }

    var body = GGL.shell.mount({
      active: 'effectiveness-calculator', title: 'Trainer effectiveness calculator',
      subtitle: 'Weighted scoring across L1, TOF, throughput, utilization and attendance.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Effectiveness calculator' }],
      actions: '<button type="button" class="btn btn-secondary" data-export>' +
          GGL.icon('download', 'ico') + '<span>Export</span></button>' +
        '<button type="button" class="btn btn-primary" data-calc>' +
          GGL.icon('activity', 'ico') + '<span>Open calculator</span></button>'
    });
    if (!body) return;

    body.innerHTML = '<div class="grid grid-4 mb-6" id="ec-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div id="ec-narrative" class="mb-6"></div>' +
      '<div class="split-2-1 mb-6">' +
        '<div id="ec-model"><div class="card card-pad"><div class="skel skel-chart"></div></div></div>' +
        '<div id="ec-gaps"><div class="card card-pad"><div class="skel skel-chart"></div></div></div></div>' +
      '<h2 class="mb-4" style="font-size:var(--fs-lg)">Trainer scorecard</h2><div id="ec-table"></div>';

    UI.async(document.getElementById('ec-stats'), UI.skeletonCards(4), function () {
      return S.effectivenessCalc.summary().then(function (st) {
        document.getElementById('ec-stats').innerHTML =
          stat('Completed records', U.num(st.records), 'clipboard', '', 'Rows with trainer names') +
          stat('Avg effectiveness', st.average.toFixed(2) + '%', 'trending', 'violet', 'Weighted across records') +
          stat('Effective trainers', U.num(st.effective), 'checkCircle', 'green', 'Meeting all criteria') +
          stat('Needs improvement', U.num(st.needsImprovement), 'alert', 'amber', 'Below one or more thresholds');

        document.getElementById('ec-narrative').innerHTML =
          '<div class="alert">' + GGL.icon('info', 'ico') + '<div class="text-sm">' +
          'The current view includes <strong>' + st.records + '</strong> completed trainer records, ' +
          'with average effectiveness of <strong>' + st.average.toFixed(1) + '%</strong>. ' +
          '<strong>' + st.effective + '</strong> ' + (st.effective === 1 ? 'trainer meets' : 'trainers meet') +
          ' the effectiveness criteria and <strong>' + st.needsImprovement + '</strong> ' +
          (st.needsImprovement === 1 ? 'requires' : 'require') + ' improvement.' +
          (st.topGap ? ' <strong>' + U.esc(st.topGap) + '</strong> is the most common priority; ' +
            'review the TOF for trainers flagged below the threshold.' : '') + '</div></div>';

        document.getElementById('ec-gaps').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>Improvement priorities</h3>' +
          '<p class="sub">Components below ' + GGL.data.effThreshold + '%</p></div></div><div class="card-body">' +
          (st.gapCounts.length ? C.hbars(st.gapCounts.map(function (g) {
              return { label: g.label, value: g.value, color: 'var(--viz-3)' };
            }), { suffix: ' trainers' })
            : UI.empty({ icon: 'checkCircle', title: 'No gaps',
                message: 'Every component is at or above the threshold.' })) + '</div></div>';
      });
    });

    UI.async(document.getElementById('ec-model'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.effectivenessCalc.summary().then(function () {
        var weights = S.effectivenessCalc.weights();
        document.getElementById('ec-model').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>The weighted model</h3>' +
          '<p class="sub">How the effectiveness percentage is built</p></div>' +
          '<button type="button" class="btn btn-sm btn-secondary" data-open-calc>Try it</button></div>' +
          '<div class="card-body"><div class="row gap-6 wrap" style="justify-content:center;align-items:center">' +
            C.donut(weights.map(function (w) {
              return { label: w.label, value: Math.round(w.weight * 100) };
            }), { size: 170, stroke: 26, centreValue: '100%', centreLabel: 'weighting',
                  label: 'Effectiveness weighting' }) +
            '<div class="grow" style="min-width:250px"><table class="table" style="font-size:var(--fs-sm)"><tbody>' +
              weights.map(function (w) {
                return '<tr><td class="cell-primary">' + U.esc(w.label) + '</td>' +
                  '<td class="text-right"><strong>' + Math.round(w.weight * 100) + '%</strong></td>' +
                  '<td class="text-xs text-muted hide-sm">' + U.esc(w.hint) + '</td></tr>';
              }).join('') + '</tbody></table></div></div>' +
            '<p class="hint mt-4">Transcribed from the source workbook and verified against both worked ' +
            'examples. Load the sample inside the calculator to check it yourself.</p></div></div>';

        document.querySelector('[data-open-calc]').addEventListener('click', function () { openCalculator(); });
      });
    });

    table = GGL.DataTable(document.getElementById('ec-table'), {
      searchPlaceholder: 'Search trainer, month or rating…',
      pageSize: 10, defaultSort: 'effectiveness', defaultDir: 'desc',
      columns: [
        { key: 'trainer', label: 'Trainer', sortable: true, primary: true,
          render: function (r) {
            return '<div class="fw-medium">' + U.esc(r.trainer) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.month) +
              (r.source === 'Workbook' ? ' · from workbook' : '') + '</div>';
          }},
        { key: 'l1', label: 'L1', sortable: true, align: 'right', hideBelow: 'md',
          render: function (r) { return pct(r.l1); }},
        { key: 'tof', label: 'TOF', sortable: true, align: 'right', hideBelow: 'md',
          render: function (r) {
            return '<span' + (r.tof < GGL.data.effThreshold ? ' class="text-warning"' : '') + '>' +
              pct(r.tof) + '</span>';
          }},
        { key: 'throughput', label: 'Throughput', sortable: true, align: 'right', hideBelow: 'lg',
          render: function (r) { return pct(r.throughput); }},
        { key: 'utilization', label: 'Utilization', sortable: true, align: 'right', hideBelow: 'lg',
          render: function (r) { return pct(r.utilization); }},
        { key: 'attendance', label: 'Attendance', sortable: true, align: 'right', hideBelow: 'xl',
          render: function (r) { return pct(r.attendance); }},
        { key: 'effectiveness', label: 'Effectiveness', sortable: true, align: 'right',
          render: function (r) { return '<strong>' + r.effectiveness.toFixed(2) + '%</strong>'; }},
        { key: 'rating', label: 'Rating', sortable: true,
          render: function (r) { return ratingBadge(r.rating); }},
        { key: 'improvement', label: 'Area of improvement', sortable: true, hideBelow: 'lg',
          render: function (r) {
            return r.gaps && r.gaps.length
              ? '<span class="text-sm">' + U.esc(r.improvement) + '</span>'
              : '<span class="text-sm text-subtle">None</span>';
          }}
      ],
      filters: [{ key: 'rating', label: 'Rating', options: [
        { value: 'Effective', label: 'Effective' }, { value: 'Satisfactory', label: 'Satisfactory' },
        { value: 'Needs Improvement', label: 'Needs Improvement' }]}],
      fetch: function (q) { return S.effectivenessCalc.list(q); },
      onRowClick: viewRecord,
      rowActions: function () {
        return [
          { label: 'View scorecard', icon: 'eye', onClick: viewRecord },
          { label: 'Recalculate', icon: 'activity', onClick: openCalculator },
          { label: 'Observe trainer', icon: 'clipboard',
            onClick: function () { window.location.href = GGL.url('app/observation.html'); }},
          { label: 'Delete record', icon: 'trash', tone: 'danger', onClick: function (r) {
              UI.confirm({ title: 'Delete this record?',
                message: r.trainer + ' — ' + r.month + ' will be removed from the scorecard.',
                onConfirm: function () {
                  return S.effectivenessCalc.remove(r.id).then(function () {
                    UI.toast('Record deleted', { type: 'success' }); table.reload();
                  });
                }});
            }}
        ];
      },
      empty: { icon: 'trending', title: 'No effectiveness records',
        message: 'Open the calculator to score a trainer.',
        action: 'Open calculator', onAction: function () { openCalculator(); } }
    });

    document.querySelector('[data-calc]').addEventListener('click', function () { openCalculator(); });
    document.querySelector('[data-export]').addEventListener('click', function () {
      S.effectivenessCalc.all().then(function (rows) {
        U.downloadCsv('trainer-effectiveness-' + U.stamp() + '.csv', COLUMNS, rows);
        UI.toast('Export downloaded', { type: 'success', desc: rows.length + ' records written to CSV.' });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
