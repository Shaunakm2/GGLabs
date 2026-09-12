/* GG Learning Labs — Training effectiveness + trainer observation (weighted criteria) */
(function (GGL) {
  'use strict';
  var U = GGL.utils, UI = GGL.ui, C = GGL.charts, S = GGL.services;
  var obsTable = null;

  function observationForm() {
    var criteria = GGL.data.observationCriteria;
    return '<form id="obs-form" novalidate>' +
      '<div class="grid grid-2 gap-4">' +
        '<div class="field"><label class="label" for="ob-trainer">Trainer <span class="req">*</span></label>' +
          '<select class="select" id="ob-trainer" name="trainerId"><option value="">Select a trainer…</option>' +
            GGL.data.trainers.map(function (t) {
              return '<option value="' + U.esc(t.id) + '">' + U.esc(t.name) + '</option>';
            }).join('') + '</select></div>' +
        '<div class="field"><label class="label" for="ob-session">Session <span class="req">*</span></label>' +
          '<select class="select" id="ob-session" name="sessionTitle"><option value="">Select a session…</option>' +
            S.courses.allSync().slice(0, 12).map(function (c) {
              return '<option>' + U.esc(c.title) + '</option>';
            }).join('') + '</select></div></div>' +
      '<div class="field"><label class="label" for="ob-date">Observation date <span class="req">*</span></label>' +
        '<input class="input" id="ob-date" name="date" type="date" value="' +
        new Date().toISOString().slice(0, 10) + '"></div>' +
      '<h4 class="mt-6 mb-2">Rating criteria</h4>' +
      '<p class="text-sm text-muted mb-3">Rate each criterion from 1 (needs development) to 5 (exemplary). ' +
      'Weightings are applied automatically.</p>' +
      '<div class="card card-pad mb-5">' + criteria.map(function (c) {
        return '<div class="criteria-row"><div><div class="c-label">' + U.esc(c.label) +
          '<span class="c-weight">' + c.weight + '%</span></div>' +
          '<div class="c-desc">' + U.esc(c.desc) + '</div></div>' +
          '<div class="rating">' + [1,2,3,4,5].map(function (n) {
            var id = 'r-' + c.id + '-' + n;
            return '<input type="radio" id="' + id + '" name="score_' + c.id + '" value="' + n + '"' +
              (n === 4 ? ' checked' : '') + '><label for="' + id + '" title="' + n + ' out of 5">' + n + '</label>';
          }).join('') + '</div></div>';
      }).join('') + '</div>' +
      '<div class="card card-pad mb-5" style="background:var(--bg-sunken)"><div class="row-between">' +
        '<div><strong>Weighted score</strong><div class="text-xs text-muted">Calculated live from the ratings above</div></div>' +
        '<div style="text-align:right"><div id="obs-score" style="font-size:var(--fs-2xl);font-weight:var(--fw-bold);line-height:1">—</div>' +
        '<div id="obs-rating" class="text-xs text-muted">—</div></div></div></div>' +
      '<div class="field"><label class="label" for="ob-strength">Strengths observed <span class="req">*</span></label>' +
        '<textarea class="textarea" id="ob-strength" name="strengths" placeholder="What worked well in this session?"></textarea></div>' +
      '<div class="field"><label class="label" for="ob-dev">Development areas <span class="req">*</span></label>' +
        '<textarea class="textarea" id="ob-dev" name="development" placeholder="What should the trainer do differently next time?"></textarea></div>' +
    '</form>';
  }

  function calculateScore(form) {
    var total = 0;
    GGL.data.observationCriteria.forEach(function (c) {
      var input = form.querySelector('[name="score_' + c.id + '"]:checked');
      total += ((input ? Number(input.value) : 0) / 5) * c.weight;
    });
    return Math.round(total * 10) / 10;
  }

  function openObservation() {
    var handle = UI.modal({
      title: 'New trainer observation', subtitle: 'Weighted criteria — the score updates as you rate.',
      size: 'lg', body: observationForm(),
      footer: '<button type="button" class="btn btn-ghost" data-save-draft>Save draft</button>' +
        '<div class="grow"></div>' +
        '<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
        '<button type="submit" form="obs-form" class="btn btn-primary">Submit observation</button>'
    });

    var form = handle.overlay.querySelector('#obs-form');
    var scoreEl = handle.overlay.querySelector('#obs-score');
    var ratingEl = handle.overlay.querySelector('#obs-rating');

    function updateScore() {
      var score = calculateScore(form);
      scoreEl.textContent = score;
      ratingEl.textContent = score >= 85 ? 'Exceeds expectations' : score >= 70 ? 'Meets expectations' : 'Needs development';
      scoreEl.style.color = score >= 85 ? 'var(--success)' : score >= 70 ? 'var(--accent)' : 'var(--warning)';
    }
    form.addEventListener('change', updateScore);
    updateScore();

    handle.overlay.querySelector('[data-cancel]').addEventListener('click', handle.close);
    handle.overlay.querySelector('[data-save-draft]').addEventListener('click', function () {
      UI.toast('Draft saved', { type: 'success', desc: 'You can complete this observation later.' });
      handle.close();
    });

    UI.handleSubmit(form, {
      trainerId: [U.validators.required], sessionTitle: [U.validators.required],
      date: [U.validators.required], strengths: [U.validators.required, U.validators.min(10)],
      development: [U.validators.required, U.validators.min(10)]
    }, function (values) {
      var trainer = GGL.data.trainers.filter(function (t) { return t.id === values.trainerId; })[0];
      var score = calculateScore(form);
      return S.observations.create({
        trainerId: values.trainerId, trainer: trainer ? trainer.name : '—',
        observer: S.auth.getUser().name, date: new Date(values.date).toISOString(),
        sessionTitle: values.sessionTitle, batchName: '—', score: score,
        rating: score >= 85 ? 'Exceeds' : score >= 70 ? 'Meets' : 'Needs development',
        strengths: values.strengths, development: values.development, status: 'Completed'
      });
    }, { success: 'Observation submitted',
      successDesc: 'The trainer\u2019s effectiveness record has been updated.',
      onDone: function () { handle.close(); if (obsTable) obsTable.reload(); } });
  }

  function openObservationDetail(o) {
    UI.modal({
      title: 'Observation — ' + o.trainer,
      subtitle: U.date(o.date, 'long') + ' · observed by ' + o.observer, size: 'lg',
      body: '<div class="row gap-4 mb-5 wrap">' + C.gauge(o.score, { size: 130, caption: o.rating }) +
          '<div class="grow"><dl class="kv">' +
            '<dt>Session</dt><dd>' + U.esc(o.sessionTitle) + '</dd>' +
            '<dt>Batch</dt><dd>' + U.esc(o.batchName) + '</dd>' +
            '<dt>Status</dt><dd>' + U.statusBadge(o.status) + '</dd></dl></div></div>' +
        (o.scores ? '<h4 class="mb-3">Criteria ratings</h4>' +
          C.hbars(GGL.data.observationCriteria.map(function (c) {
            return { label: c.label, value: o.scores[c.id] || 0 };
          }), { suffix: '/5' }) : '') +
        '<h4 class="mt-6 mb-2">Strengths</h4><p class="text-muted">' + U.esc(o.strengths) + '</p>' +
        '<h4 class="mt-4 mb-2">Development areas</h4><p class="text-muted">' + U.esc(o.development) + '</p>',
      footer: '<button type="button" class="btn btn-secondary" data-close>Close</button>',
      onMount: function (h) { h.overlay.querySelector('[data-close]').addEventListener('click', h.close); }
    });
  }

  function stat(label, value, icon, tone) {
    return '<div class="card stat"><div class="stat-top"><span class="stat-label">' + label + '</span>' +
      '<span class="stat-icon ' + tone + '">' + GGL.icon(icon,'ico') + '</span></div>' +
      '<div class="stat-value">' + value + '</div></div>';
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }

    if (user.role === GGL.ROLES.END_USER) {
      var denied = GGL.shell.mount({ active: 'effectiveness', title: 'Training effectiveness',
        breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Effectiveness' }] });
      if (denied) denied.innerHTML = '<div class="card"><div class="state">' +
        '<div class="state-icon danger">' + GGL.icon('lock','ico') + '</div>' +
        '<h3>You don\u2019t have access to this area</h3>' +
        '<p>Effectiveness measurement is available to administrators.</p>' +
        '<a class="btn btn-primary" href="' + GGL.url('app/dashboard.html') + '">Back to dashboard</a></div></div>';
      return;
    }

    var body = GGL.shell.mount({
      active: 'effectiveness', title: 'Training effectiveness',
      subtitle: 'Reaction, learning, behaviour and results — plus trainer observation.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Effectiveness' }],
      actions: '<button type="button" class="btn btn-primary" data-new-observation>' +
        GGL.icon('plus','ico') + '<span>New observation</span></button>'
    });
    if (!body) return;

    body.innerHTML = '<div class="grid grid-4 mb-6" id="e-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-1-1 mb-6">' +
        '<div id="e-gauge"><div class="card card-pad"><div class="skel skel-chart"></div></div></div>' +
        '<div id="e-trend"><div class="card card-pad"><div class="skel skel-chart"></div></div></div></div>' +
      '<div id="e-courses" class="mb-6"><div class="card card-pad"><div class="skel skel-chart"></div></div></div>' +
      '<h2 class="mb-4" style="font-size:var(--fs-lg)">Trainer observations</h2><div id="e-observations"></div>';

    UI.async(document.getElementById('e-stats'), UI.skeletonCards(4), function () {
      return S.reports.effectiveness().then(function (e) {
        document.getElementById('e-stats').innerHTML =
          stat('Overall effectiveness', e.overall, 'trending', 'violet') +
          stat('Learner satisfaction', e.satisfaction + '%', 'star', 'amber') +
          stat('Knowledge gain', '+' + e.knowledgeGain + ' pts', 'lightbulb', 'teal') +
          stat('Would recommend', e.recommend + '%', 'checkCircle', 'green');

        document.getElementById('e-gauge').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>Effectiveness by dimension</h3>' +
          '<p class="sub">Kirkpatrick-aligned measures across ' + U.num(e.responses) + ' responses</p></div></div>' +
          '<div class="card-body"><div class="row gap-6 wrap" style="justify-content:center">' +
            C.gauge(e.overall, { size: 150, caption: 'Overall score' }) +
            '<div class="grow" style="min-width:220px">' + C.hbars([
              { label: 'Reaction', value: Math.round(e.reaction * 20) },
              { label: 'Learning', value: Math.min(100, e.knowledgeGain + 50) },
              { label: 'Behaviour', value: e.behaviour },
              { label: 'Results', value: e.results }
            ], { suffix: '%' }) + '</div></div>' +
            '<p class="hint mt-4">Reaction is scaled from the 1–5 satisfaction rating. Learning is derived from real ' +
            'pre and post <a href="' + GGL.url('app/assessments.html') + '">assessment attempts</a>.</p></div></div>';

        var rows = e.rows.slice().sort(function (a, b) { return b.overall - a.overall; });
        document.getElementById('e-courses').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>Effectiveness by course</h3>' +
          '<p class="sub">Highest and lowest performing programmes</p></div>' +
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/reports.html') + '">Reports</a></div>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>Course</th>' +
          '<th class="hide-md">Trainer</th><th class="hide-sm">Responses</th>' +
          '<th class="hide-md">Pre → Post</th><th>Gain</th><th>Overall</th></tr></thead><tbody>' +
          rows.slice(0, 8).map(function (r) {
            return '<tr><td class="cell-primary"><div class="truncate" style="max-width:260px">' +
              U.esc(r.course) + '</div><div class="text-xs text-muted">' + U.esc(r.category) + '</div></td>' +
              '<td class="hide-md">' + U.esc(r.trainer) + '</td>' +
              '<td class="hide-sm">' + U.num(r.responses) + '</td>' +
              '<td class="hide-md">' + r.preScore + '% → ' + r.postScore + '%</td>' +
              '<td><span class="badge badge-success">+' + r.gain + '</span></td>' +
              '<td style="width:150px">' + U.progressCell(r.overall) + '</td></tr>';
          }).join('') + '</tbody></table></div></div>';
      });
    });

    UI.async(document.getElementById('e-trend'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.reports.series('effectivenessTrend').then(function (series) {
        document.getElementById('e-trend').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>Effectiveness trend</h3>' +
          '<p class="sub">Rolling 12 months</p></div><span class="badge badge-success">Improving</span></div>' +
          '<div class="card-body">' + C.line(series, { height: 250, color: 'var(--viz-4)',
            label: 'Effectiveness trend', zeroBased: false }) + '</div></div>';
      });
    });

    obsTable = GGL.DataTable(document.getElementById('e-observations'), {
      searchPlaceholder: 'Search trainers or sessions…',
      pageSize: 8, defaultSort: 'date', defaultDir: 'desc',
      columns: [
        { key: 'trainer', label: 'Trainer', sortable: true, primary: true,
          render: function (r) { return U.userCell(r.trainer, r.sessionTitle); }},
        { key: 'observer', label: 'Observer', sortable: true, hideBelow: 'md' },
        { key: 'date', label: 'Date', sortable: true, render: function (r) { return U.date(r.date); }},
        { key: 'score', label: 'Score', sortable: true, align: 'right',
          render: function (r) {
            var tone = r.score >= 85 ? 'success' : r.score >= 70 ? 'info' : 'warning';
            return '<span class="badge badge-' + tone + '">' + r.score + '</span>';
          }},
        { key: 'rating', label: 'Rating', sortable: true, hideBelow: 'lg' },
        { key: 'status', label: 'Status', sortable: true, hideBelow: 'md',
          render: function (r) { return U.statusBadge(r.status); }}
      ],
      fetch: function (q) { return S.observations.list(q); },
      onRowClick: openObservationDetail,
      rowActions: function () {
        return [
          { label: 'View observation', icon: 'eye', onClick: openObservationDetail },
          { label: 'Delete', icon: 'trash', tone: 'danger', onClick: function (row) {
              UI.confirm({ title: 'Delete this observation?',
                message: 'The record for ' + row.trainer + ' on ' + U.date(row.date) + ' will be removed.',
                onConfirm: function () {
                  return S.observations.remove(row.id).then(function () {
                    UI.toast('Observation deleted', { type: 'success' }); obsTable.reload();
                  });
                }});
            }}
        ];
      },
      empty: { icon: 'eye', title: 'No observations recorded',
        message: 'Record a trainer observation to start building effectiveness evidence.',
        action: 'New observation', onAction: openObservation }
    });

    document.querySelector('[data-new-observation]').addEventListener('click', openObservation);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
