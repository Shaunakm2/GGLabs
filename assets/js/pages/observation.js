/* ==========================================================================
   GG Learning Labs — Trainer Observation Form (TOF)

   The instrument is the client's own: seven sections, 36 criteria from
   "TOF Form-Blank.xlsx". Section score = mean of its answered criteria;
   overall = mean of the section scores. A submitted observation writes its
   overall score into the trainer's effectiveness record (30% weight).
   ========================================================================== */
(function (GGL) {
  'use strict';

  var U = GGL.utils, UI = GGL.ui, C = GGL.charts, S = GGL.services;
  var table = null;

  var COLUMNS = [
    { key: 'trainer', label: 'Trainer' }, { key: 'evaluator', label: 'Evaluator' },
    { label: 'Date', value: function (r) { return U.date(r.observationDate); } },
    { key: 'topic', label: 'Topic' },
    { label: 'Duration (mins)', value: function (r) { return r.durationMins || ''; } },
    { label: 'Overall %', value: function (r) { return r.score; } },
    { key: 'rating', label: 'Rating' }
  ];

  function stat(label, value, icon, tone) {
    return '<div class="card stat"><div class="stat-top"><span class="stat-label">' + label + '</span>' +
      '<span class="stat-icon ' + (tone || '') + '">' + GGL.icon(icon, 'ico') + '</span></div>' +
      '<div class="stat-value">' + value + '</div></div>';
  }
  function ratingTone(score) { return score >= 85 ? 'success' : score >= 70 ? 'info' : 'warning'; }

  function openForm(prefillTrainerId) {
    var inst = S.tof.instrument();
    var ratings = {}, comments = {};

    var handle = UI.modal({
      title: 'Trainer Observation Form',
      subtitle: 'Learning & Development — ' + inst.sections.length + ' sections, ' +
        inst.sections.reduce(function (a, s) { return a + s.criteria.length; }, 0) + ' criteria',
      size: 'xl', dismissible: false,
      body: '<div id="tof-form-wrap"></div>',
      footer: '<button type="button" class="btn btn-ghost" data-cancel>Cancel</button>' +
        '<div class="grow"></div><div class="tof-live" data-live></div>' +
        '<button type="button" class="btn btn-primary" data-submit>' +
        GGL.icon('check', 'ico') + '<span>Submit observation</span></button>'
    });

    var wrap = handle.overlay.querySelector('#tof-form-wrap');

    wrap.innerHTML = '<form id="tof-form" novalidate>' +
      '<div class="card card-pad mb-5"><div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="tf-trainer">Trainer name <span class="req">*</span></label>' +
            '<select class="select" id="tf-trainer" name="trainerId"><option value="">Select a trainer…</option>' +
              GGL.data.trainers.map(function (t) {
                return '<option value="' + U.esc(t.id) + '"' +
                  (t.id === prefillTrainerId ? ' selected' : '') + '>' + U.esc(t.name) + '</option>';
              }).join('') + '</select></div>' +
          '<div class="field"><label class="label" for="tf-eval">Name of the evaluator <span class="req">*</span></label>' +
            '<input class="input" id="tf-eval" name="evaluator" value="' + U.esc(S.auth.getUser().name) + '"></div></div>' +
        '<div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="tf-date">Observation date <span class="req">*</span></label>' +
            '<input class="input" id="tf-date" name="observationDate" type="date" value="' +
              new Date().toISOString().slice(0, 10) + '"></div>' +
          '<div class="field"><label class="label" for="tf-time">Observation time</label>' +
            '<input class="input" id="tf-time" name="observationTime" type="time" value="10:00"></div></div>' +
        '<div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="tf-topic">Class name / topic <span class="req">*</span></label>' +
            '<input class="input" id="tf-topic" name="topic" list="tf-topics" placeholder="Session topic">' +
            '<datalist id="tf-topics">' + GGL.data.courses.slice(0, 16).map(function (c) {
              return '<option value="' + U.esc(c.title) + '">';
            }).join('') + '</datalist></div>' +
          '<div class="field"><label class="label" for="tf-dur">Course duration (minutes)</label>' +
            '<input class="input" id="tf-dur" name="durationMins" type="number" min="15" max="600" value="120"></div>' +
        '</div></div>' +

      '<div class="card card-pad mb-5" style="background:var(--bg-sunken)">' +
        '<strong class="text-sm">Rating scale</strong><div class="row gap-4 mt-3 wrap">' +
          inst.scale.map(function (s) {
            return '<span class="text-xs"><strong>' + s.value + '</strong> · ' + U.esc(s.label) +
              ' <span class="text-subtle">— ' + U.esc(s.desc) + '</span></span>';
          }).join('') + '</div>' +
        '<p class="hint" style="margin-top:var(--sp-3)">Leave a criterion blank if it was not observable. ' +
        'Blank criteria are excluded from the section average rather than scored as zero.</p></div>' +

      '<div class="tof-strip mb-5" data-strip></div>' +

      inst.sections.map(function (sec) {
        return '<section class="card mb-4" data-section="' + sec.id + '">' +
          '<div class="card-head"><div><h3>' + sec.no + '. ' + U.esc(sec.title) + '</h3>' +
          '<p class="sub">' + sec.criteria.length + ' criteria</p></div>' +
          '<span class="badge badge-plain" data-sec-score="' + sec.id + '">—</span></div>' +
          '<div class="card-body" style="padding-top:var(--sp-2)">' +
            sec.criteria.map(function (c) {
              return '<div class="tof-row" data-criterion="' + c.id + '">' +
                '<div class="tof-label">' + U.esc(c.text) + '</div>' +
                '<div class="tof-controls">' +
                  '<div class="rating" role="group" aria-label="' + U.esc(c.text) + '">' +
                    inst.scale.map(function (s) {
                      var id = 'r-' + c.id + '-' + s.value;
                      return '<input type="radio" id="' + id + '" name="rate_' + c.id +
                        '" value="' + s.value + '"><label for="' + id + '" title="' + U.esc(s.label) + '">' +
                        s.value + '</label>';
                    }).join('') +
                    '<button type="button" class="tof-clear" data-clear="' + c.id + '" ' +
                      'title="Clear this rating" aria-label="Clear rating">' + GGL.icon('close', 'ico') + '</button>' +
                  '</div>' +
                  '<input class="input tof-comment" data-comment="' + c.id + '" placeholder="Comments" ' +
                    'aria-label="Comments for ' + U.esc(c.text) + '"></div></div>';
            }).join('') + '</div></section>';
      }).join('') +

      '<div class="card card-pad"><div class="field" style="margin:0">' +
        '<label class="label" for="tf-rec">Recommendations <span class="req">*</span></label>' +
        '<textarea class="textarea" id="tf-rec" name="recommendations" ' +
        'placeholder="Strengths observed and specific development actions for this trainer."></textarea>' +
      '</div></div></form>';

    var form = wrap.querySelector('#tof-form');
    var strip = wrap.querySelector('[data-strip]');
    var live = handle.overlay.querySelector('[data-live]');

    function recalc() {
      var scored = S.tof.score(ratings);
      strip.innerHTML = scored.sections.map(function (s) {
        var done = s.answered === s.total;
        return '<div class="tof-chip' + (s.answered ? ' active' : '') + '">' +
          '<span class="n">' + s.no + '</span>' +
          '<span class="t">' + U.esc(s.title) + '</span>' +
          '<span class="v">' + (s.answered ? s.score.toFixed(1) + '%' : '—') + '</span>' +
          '<span class="c">' + s.answered + '/' + s.total + (done ? ' ✓' : '') + '</span></div>';
      }).join('') +
      '<div class="tof-chip overall"><span class="t">Overall Score</span>' +
        '<span class="v">' + scored.overall.toFixed(1) + '%</span>' +
        '<span class="c">' + scored.answered + '/' + scored.total + ' rated</span></div>';

      scored.sections.forEach(function (s) {
        var badge = form.querySelector('[data-sec-score="' + s.id + '"]');
        if (!badge) return;
        badge.textContent = s.answered ? s.score.toFixed(1) + '%' : '—';
        badge.className = 'badge ' + (s.answered ? 'badge-' + ratingTone(s.score) : 'badge-plain');
      });

      live.innerHTML = '<span class="lbl">Overall</span>' +
        '<strong class="val" style="color:var(--' +
          (scored.overall >= 85 ? 'success' : scored.overall >= 70 ? 'accent' : 'warning') + ')">' +
          scored.overall.toFixed(1) + '%</strong>' +
        '<span class="sub">' + scored.answered + '/' + scored.total + '</span>';
    }

    form.addEventListener('change', function (e) {
      var m = e.target.name && e.target.name.match(/^rate_(.+)$/);
      if (m) { ratings[m[1]] = Number(e.target.value); recalc(); }
    });

    U.on(form, 'click', '[data-clear]', function (e, btn) {
      var id = btn.getAttribute('data-clear');
      delete ratings[id];
      U.$$('[name="rate_' + id + '"]', form).forEach(function (i) { i.checked = false; });
      recalc();
    });

    U.on(form, 'input', '[data-comment]', function (e, input) {
      comments[input.getAttribute('data-comment')] = input.value;
    });

    handle.overlay.querySelector('[data-cancel]').addEventListener('click', function () {
      if (!Object.keys(ratings).length) { handle.close(); return; }
      UI.confirm({ title: 'Discard this observation?',
        message: 'You have rated ' + Object.keys(ratings).length + ' criteria. Nothing will be saved.',
        confirmLabel: 'Discard', tone: 'warning',
        onConfirm: function () { handle.close(); } });
    });

    handle.overlay.querySelector('[data-submit]').addEventListener('click', function () {
      var btn = this;
      var result = U.validateForm(form, {
        trainerId: [U.validators.required], evaluator: [U.validators.required],
        observationDate: [U.validators.required], topic: [U.validators.required],
        recommendations: [U.validators.required, U.validators.min(15)]
      });
      if (!result.valid) {
        wrap.scrollTop = 0;
        UI.toast('Complete the header and recommendations', { type: 'warning' });
        return;
      }

      var scored = S.tof.score(ratings);
      if (scored.answered < scored.total * 0.6) {
        UI.toast('Rate more criteria before submitting', { type: 'warning',
          desc: 'At least 60% of criteria should be rated. Currently ' + scored.answered + ' of ' + scored.total + '.' });
        return;
      }

      var trainer = GGL.data.trainers.filter(function (t) { return t.id === result.values.trainerId; })[0];
      btn.classList.add('is-loading');
      btn.disabled = true;

      S.tof.submit({
        trainerId: result.values.trainerId, trainer: trainer ? trainer.name : '—',
        evaluator: result.values.evaluator,
        observationDate: new Date(result.values.observationDate).toISOString(),
        observationTime: result.values.observationTime, topic: result.values.topic,
        durationMins: Number(result.values.durationMins) || null,
        ratings: ratings, comments: comments, recommendations: result.values.recommendations
      }).then(function (row) {
        handle.close();
        UI.toast('Observation submitted', { type: 'success',
          desc: 'Overall ' + row.score.toFixed(1) + '% — the trainer\u2019s effectiveness record has been updated.' });
        if (table) table.reload();
        setTimeout(function () { viewRecord(row); }, 300);
      }).catch(function (err) {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        UI.toast('Could not submit', { type: 'error', desc: err.message });
      });
    });

    recalc();
  }

  function viewRecord(r) {
    var inst = S.tof.instrument();
    UI.modal({
      title: 'Observation — ' + r.trainer,
      subtitle: U.date(r.observationDate, 'long') +
        (r.observationTime ? ' at ' + r.observationTime : '') + ' · evaluated by ' + r.evaluator,
      size: 'lg',
      body: '<div class="row gap-5 mb-5 wrap" style="align-items:center">' +
          C.gauge(r.score, { size: 140, caption: r.rating }) +
          '<div class="grow" style="min-width:240px">' +
            C.hbars(r.sections.map(function (s) {
              return { label: s.no + '. ' + s.title, value: Math.round(s.score) };
            }), { suffix: '%' }) + '</div></div>' +
        '<dl class="kv mb-5"><dt>Topic</dt><dd>' + U.esc(r.topic) + '</dd>' +
          '<dt>Duration</dt><dd>' + (r.durationMins ? U.duration(r.durationMins) : '—') + '</dd>' +
          '<dt>Overall score</dt><dd><strong>' + r.score.toFixed(1) + '%</strong> — ' + U.esc(r.rating) + '</dd></dl>' +
        '<h4 class="mb-3">Criterion detail</h4>' +
        inst.sections.map(function (sec) {
          var secScore = (r.sections.filter(function (s) { return s.id === sec.id; })[0] || {}).score;
          return '<div class="card card-pad mb-3"><div class="row-between mb-3">' +
            '<strong class="text-sm">' + sec.no + '. ' + U.esc(sec.title) + '</strong>' +
            '<span class="badge badge-' + ratingTone(secScore || 0) + '">' +
              (secScore === undefined ? '—' : secScore.toFixed(1) + '%') + '</span></div>' +
            '<ul style="list-style:none;padding:0;margin:0">' + sec.criteria.map(function (c) {
              var v = r.ratings ? r.ratings[c.id] : undefined;
              var lbl = v === undefined ? 'Not observed'
                : (inst.scale.filter(function (s) { return s.value === v; })[0] || {}).label;
              return '<li class="row-between text-sm" style="padding:5px 0;gap:var(--sp-4);' +
                'border-bottom:1px solid var(--border)">' +
                '<span class="text-muted" style="flex:1">' + U.esc(c.text) + '</span>' +
                '<span class="badge ' + (v === undefined ? 'badge-plain'
                  : v >= 3 ? 'badge-success' : v >= 2 ? 'badge-info' : 'badge-warning') + '">' +
                (v === undefined ? '—' : v + ' · ' + lbl) + '</span></li>';
            }).join('') + '</ul></div>';
        }).join('') +
        '<h4 class="mt-5 mb-2">Recommendations</h4>' +
        '<p class="text-muted">' + U.esc(r.recommendations) + '</p>',
      footer: '<button type="button" class="btn btn-secondary" data-close>Close</button>' +
        '<button type="button" class="btn btn-secondary" data-print>' +
          GGL.icon('fileText', 'ico') + '<span>Print</span></button>' +
        '<a class="btn btn-primary" href="' + GGL.url('app/effectiveness-calculator.html') + '">' +
          GGL.icon('trending', 'ico') + '<span>Effectiveness</span></a>',
      onMount: function (h) {
        h.overlay.querySelector('[data-close]').addEventListener('click', h.close);
        h.overlay.querySelector('[data-print]').addEventListener('click', function () {
          U.printDocument('Trainer Observation — ' + r.trainer,
            '<h1>Trainer Observation Form</h1><div class="meta">' + U.esc(r.trainer) + ' · ' +
            U.date(r.observationDate, 'long') + ' · evaluated by ' + U.esc(r.evaluator) + '</div>' +
            '<table><tbody><tr><th>Topic</th><td>' + U.esc(r.topic) + '</td>' +
            '<th>Duration</th><td>' + (r.durationMins || '—') + ' mins</td></tr>' +
            '<tr><th>Overall score</th><td><strong>' + r.score.toFixed(1) + '%</strong></td>' +
            '<th>Rating</th><td>' + U.esc(r.rating) + '</td></tr></tbody></table>' +
            '<h2>Section scores</h2><table><thead><tr><th>#</th><th>Section</th><th>Score</th></tr></thead><tbody>' +
            r.sections.map(function (s) {
              return '<tr><td>' + s.no + '</td><td>' + U.esc(s.title) + '</td><td>' + s.score.toFixed(1) + '%</td></tr>';
            }).join('') + '</tbody></table>' +
            '<h2>Recommendations</h2><p>' + U.esc(r.recommendations) + '</p>');
        });
      }
    });
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }

    if (user.role === GGL.ROLES.END_USER) {
      var denied = GGL.shell.mount({ active: 'observation', title: 'Trainer observation',
        breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Observation' }] });
      if (denied) denied.innerHTML = '<div class="card"><div class="state">' +
        '<div class="state-icon danger">' + GGL.icon('lock', 'ico') + '</div>' +
        '<h3>You don\u2019t have access to this area</h3>' +
        '<p>Trainer observation is available to administrators and evaluators.</p>' +
        '<a class="btn btn-primary" href="' + GGL.url('app/dashboard.html') + '">Back to dashboard</a></div></div>';
      return;
    }

    var body = GGL.shell.mount({
      active: 'observation', title: 'Trainer observation',
      subtitle: 'The TOF instrument — seven sections, 36 criteria, scored live.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Trainer observation' }],
      actions: '<button type="button" class="btn btn-secondary" data-export>' +
          GGL.icon('download', 'ico') + '<span>Export</span></button>' +
        '<button type="button" class="btn btn-primary" data-new>' +
          GGL.icon('plus', 'ico') + '<span>New observation</span></button>'
    });
    if (!body) return;

    body.innerHTML = '<div class="grid grid-4 mb-6" id="tf-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-1-1 mb-6">' +
        '<div id="tf-sections"><div class="card card-pad"><div class="skel skel-chart"></div></div></div>' +
        '<div id="tf-trainers"><div class="card card-pad"><div class="skel skel-chart"></div></div></div></div>' +
      '<h2 class="mb-4" style="font-size:var(--fs-lg)">Completed observations</h2><div id="tf-table"></div>';

    UI.async(document.getElementById('tf-stats'), UI.skeletonCards(4), function () {
      return S.tof.all().then(function (rows) {
        var avg = rows.length ? U.avg(rows, 'score') : 0;
        var recent = rows.filter(function (r) {
          return (Date.now() - new Date(r.observationDate)) < 30 * 86400000;
        });
        document.getElementById('tf-stats').innerHTML =
          stat('Observations', U.num(rows.length), 'eye', '') +
          stat('Average score', avg.toFixed(1) + '%', 'trending', 'violet') +
          stat('Last 30 days', U.num(recent.length), 'calendar', 'teal') +
          stat('Below 70%', rows.filter(function (r) { return r.score < 70; }).length, 'alert', 'amber');

        var agg = {};
        rows.forEach(function (r) {
          (r.sections || []).forEach(function (s) {
            if (!agg[s.title]) agg[s.title] = { total: 0, n: 0, no: s.no };
            agg[s.title].total += s.score; agg[s.title].n++;
          });
        });
        var secData = Object.keys(agg).map(function (k) {
          return { label: agg[k].no + '. ' + k, value: Math.round(agg[k].total / agg[k].n) };
        }).sort(function (a, b) { return a.value - b.value; });

        document.getElementById('tf-sections').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>Section performance</h3>' +
          '<p class="sub">Average across all observations — weakest first</p></div></div>' +
          '<div class="card-body">' + C.hbars(secData, { suffix: '%' }) +
          '<p class="hint mt-4">The lowest sections are where calibration and trainer development should focus.</p>' +
          '</div></div>';

        var byTrainer = U.groupBy(rows, 'trainer');
        var tData = Object.keys(byTrainer).map(function (t) {
          return { label: t, value: Math.round(U.avg(byTrainer[t], 'score')) };
        }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8);

        document.getElementById('tf-trainers').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>Trainer scores</h3>' +
          '<p class="sub">Observation average by trainer</p></div>' +
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/trainers.html') + '">Directory</a></div>' +
          '<div class="card-body">' + C.hbars(tData, { suffix: '%' }) + '</div></div>';
      });
    });

    table = GGL.DataTable(document.getElementById('tf-table'), {
      searchPlaceholder: 'Search trainer, evaluator or topic…',
      pageSize: 10, defaultSort: 'observationDate', defaultDir: 'desc',
      columns: [
        { key: 'trainer', label: 'Trainer', sortable: true, primary: true,
          render: function (r) { return U.userCell(r.trainer, r.topic); }},
        { key: 'evaluator', label: 'Evaluator', sortable: true, hideBelow: 'md' },
        { key: 'observationDate', label: 'Date', sortable: true,
          render: function (r) { return U.date(r.observationDate); }},
        { key: 'durationMins', label: 'Duration', sortable: true, hideBelow: 'lg',
          render: function (r) { return U.duration(r.durationMins); }},
        { key: 'score', label: 'Overall', sortable: true, align: 'right',
          render: function (r) {
            return '<span class="badge badge-' + ratingTone(r.score) + '">' + r.score.toFixed(1) + '%</span>';
          }},
        { key: 'rating', label: 'Rating', sortable: true, hideBelow: 'md' }
      ],
      filters: [{ key: 'rating', label: 'Rating', options: [
        { value: 'Exceeds', label: 'Exceeds' }, { value: 'Meets', label: 'Meets' },
        { value: 'Needs development', label: 'Needs development' }]}],
      fetch: function (q) { return S.tof.list(q); },
      onRowClick: viewRecord,
      rowActions: function () {
        return [
          { label: 'View observation', icon: 'eye', onClick: viewRecord },
          { label: 'Observe again', icon: 'plus', onClick: function (r) { openForm(r.trainerId); }},
          { label: 'Delete', icon: 'trash', tone: 'danger', onClick: function (r) {
              UI.confirm({ title: 'Delete this observation?',
                message: 'The record for ' + r.trainer + ' on ' + U.date(r.observationDate) + ' will be removed.',
                onConfirm: function () {
                  return S.tof.remove(r.id).then(function () {
                    UI.toast('Observation deleted', { type: 'success' }); table.reload();
                  });
                }});
            }}
        ];
      },
      empty: { icon: 'eye', title: 'No observations recorded',
        message: 'Complete the TOF to start building trainer evidence.',
        action: 'New observation', onAction: function () { openForm(); } }
    });

    document.querySelector('[data-new]').addEventListener('click', function () { openForm(); });
    document.querySelector('[data-export]').addEventListener('click', function () {
      S.tof.all().then(function (rows) {
        var cols = COLUMNS.concat(GGL.data.tofSections.map(function (sec) {
          return { label: sec.no + '. ' + sec.title + ' %',
            value: function (r) {
              var s = (r.sections || []).filter(function (x) { return x.id === sec.id; })[0];
              return s ? s.score : '';
            }};
        }));
        U.downloadCsv('trainer-observations-' + U.stamp() + '.csv', cols, rows);
        UI.toast('Export downloaded', { type: 'success', desc: rows.length + ' observations written to CSV.' });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
