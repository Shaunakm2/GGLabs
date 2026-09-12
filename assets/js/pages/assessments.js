/* ==========================================================================
   GG Learning Labs — Assessments
   Admin: manage the bank, review attempts, export results.
   Learner: sit a real graded quiz that awards points and can issue a certificate.
   ========================================================================== */
(function (GGL) {
  'use strict';

  var U = GGL.utils, UI = GGL.ui, C = GGL.charts, S = GGL.services;
  var bankTable = null, resultsTable = null;
  var TYPES = ['Pre-assessment', 'Post-assessment', 'Knowledge check'];
  var STATUSES = ['Published', 'Draft', 'Archived'];

  var RESULT_COLUMNS = [
    { key: 'name', label: 'Learner' }, { key: 'employeeId', label: 'Employee ID' },
    { key: 'department', label: 'Department' }, { key: 'assessment', label: 'Assessment' },
    { key: 'course', label: 'Course' }, { key: 'stage', label: 'Stage' },
    { key: 'score', label: 'Score %' }, { key: 'correct', label: 'Correct' },
    { key: 'total', label: 'Questions' },
    { label: 'Outcome', value: function (r) { return r.passed ? 'Passed' : 'Failed'; } },
    { label: 'Submitted', value: function (r) { return U.date(r.submittedAt); } }
  ];

  function stat(label, value, icon, tone) {
    return '<div class="card stat"><div class="stat-top"><span class="stat-label">' + label + '</span>' +
      '<span class="stat-icon ' + (tone || '') + '">' + GGL.icon(icon, 'ico') + '</span></div>' +
      '<div class="stat-value">' + value + '</div></div>';
  }

  /* ---------------- Learner: sitting an assessment ---------------- */
  function takeAssessment(assessment, onDone) {
    var answers = {}, index = 0;
    var qs = assessment.questions;

    var handle = UI.modal({
      title: assessment.title,
      subtitle: qs.length + ' questions · ' +
        (assessment.passMark > 0 ? 'pass mark ' + assessment.passMark + '%' : 'baseline check, not graded'),
      size: 'lg', dismissible: false,
      body: '<div id="quiz"></div>',
      footer: '<button type="button" class="btn btn-ghost" data-quit>Leave</button>' +
        '<div class="grow"></div>' +
        '<button type="button" class="btn btn-secondary" data-prev hidden>Previous</button>' +
        '<button type="button" class="btn btn-primary" data-next>Next</button>'
    });

    var quiz = handle.overlay.querySelector('#quiz');
    var prevBtn = handle.overlay.querySelector('[data-prev]');
    var nextBtn = handle.overlay.querySelector('[data-next]');

    handle.overlay.querySelector('[data-quit]').addEventListener('click', function () {
      UI.confirm({ title: 'Leave this assessment?',
        message: 'Your answers so far will not be saved and no attempt will be recorded.',
        confirmLabel: 'Leave', tone: 'warning',
        onConfirm: function () { handle.close(); } });
    });

    function render() {
      var q = qs[index];
      var answered = Object.keys(answers).length;
      quiz.innerHTML =
        '<div class="row-between mb-3">' +
          '<span class="text-sm text-muted">Question ' + (index + 1) + ' of ' + qs.length + '</span>' +
          '<span class="text-sm text-muted">' + answered + ' answered</span></div>' +
        '<div class="progress mb-5"><div class="progress-bar" style="width:' +
          Math.round((index / qs.length) * 100) + '%"></div></div>' +
        '<h3 style="font-size:var(--fs-md);line-height:1.45;margin-bottom:var(--sp-4)">' + U.esc(q.text) + '</h3>' +
        '<div class="quiz-options">' + q.options.map(function (opt, i) {
          var id = 'opt-' + q.id + '-' + i;
          return '<label class="quiz-option' + (answers[q.id] === i ? ' selected' : '') + '" for="' + id + '">' +
            '<input type="radio" id="' + id + '" name="' + q.id + '" value="' + i + '"' +
            (answers[q.id] === i ? ' checked' : '') + '>' +
            '<span class="marker">' + String.fromCharCode(65 + i) + '</span>' +
            '<span>' + U.esc(opt) + '</span></label>';
        }).join('') + '</div>';

      U.$$('input[type=radio]', quiz).forEach(function (input) {
        input.addEventListener('change', function () {
          answers[q.id] = Number(input.value); render();
        });
      });

      prevBtn.hidden = index === 0;
      var last = index === qs.length - 1;
      nextBtn.innerHTML = last ? GGL.icon('check', 'ico') + '<span>Submit assessment</span>' : '<span>Next</span>';
      nextBtn.disabled = answers[q.id] === undefined;
    }

    nextBtn.addEventListener('click', function () {
      if (index < qs.length - 1) { index++; render(); return; }
      if (Object.keys(answers).length < qs.length) {
        UI.toast('Answer every question first', { type: 'warning' }); return;
      }
      nextBtn.classList.add('is-loading');
      nextBtn.disabled = true;
      S.assessments.submitAttempt(assessment.id, answers).then(function (result) {
        handle.close();
        setTimeout(function () { showResult(result, onDone); }, 250);
      }).catch(function (err) {
        nextBtn.classList.remove('is-loading');
        nextBtn.disabled = false;
        UI.toast('Could not submit', { type: 'error', desc: err.message });
      });
    });

    prevBtn.addEventListener('click', function () { index = Math.max(0, index - 1); render(); });
    render();
  }

  function showResult(r, onDone) {
    var tone = r.passed ? 'success' : 'warning';
    UI.modal({
      title: r.passed ? 'Assessment passed' : 'Assessment submitted',
      subtitle: r.assessment.title, size: 'sm',
      body: '<div class="text-center mb-5">' +
          C.gauge(r.score, { size: 150, caption: r.correct + ' of ' + r.total + ' correct' }) + '</div>' +
        '<div class="alert alert-' + tone + ' mb-4">' +
          GGL.icon(r.passed ? 'checkCircle' : 'info', 'ico') + '<div class="text-sm">' +
          (r.assessment.passMark === 0
            ? 'This is a baseline check — it establishes your starting point and is not graded pass or fail.'
            : r.passed ? 'You scored above the ' + r.assessment.passMark + '% pass mark.'
              : 'The pass mark is ' + r.assessment.passMark + '%. You can retake this assessment.') +
        '</div></div>' +
        (r.awarded.length ? '<h4 class="mb-2" style="font-size:var(--fs-base)">Points awarded</h4>' +
          '<ul class="session-list mb-4">' + r.awarded.map(function (a) {
            return '<li style="padding:var(--sp-2) 0"><span class="session-info">' +
              '<strong class="text-sm">' + U.esc(a.label) + '</strong></span>' +
              '<span class="badge badge-accent">+' + a.points + '</span></li>';
          }).join('') + '</ul>' : '') +
        (r.certificate ? '<div class="alert alert-success">' + GGL.icon('award', 'ico') +
          '<div class="text-sm"><strong>Certificate issued.</strong> Serial ' +
          U.esc(r.certificate.serial) + ' is now in your certificates.</div></div>' : ''),
      footer: '<button type="button" class="btn btn-secondary" data-close>Close</button>' +
        (r.certificate
          ? '<a class="btn btn-primary" href="' + GGL.url('app/certificates.html') + '">View certificate</a>'
          : '<a class="btn btn-primary" href="' + GGL.url('app/gamification.html') + '">See my standing</a>'),
      onMount: function (h) { h.overlay.querySelector('[data-close]').addEventListener('click', h.close); },
      onClose: onDone
    });
  }

  function previewAssessment(a, showAnswers) {
    UI.modal({
      title: a.title,
      subtitle: a.type + ' · ' + a.questions.length + ' questions · ' +
        (a.passMark > 0 ? 'pass mark ' + a.passMark + '%' : 'baseline check, not graded'),
      size: 'lg',
      body: '<div class="row gap-2 mb-5 wrap">' + U.statusBadge(a.status) +
          '<span class="badge badge-plain">' + U.esc(a.category) + '</span>' +
          (a.mandatory ? '<span class="badge badge-warning">Mandatory</span>' : '') + '</div>' +
        '<div class="grid grid-4 gap-3 mb-5">' +
          [['Attempts', U.num(a.attempts)], ['Average', a.avgScore + '%'],
           ['Pass rate', a.passRate + '%'], ['Duration', a.durationMins + 'm']].map(function (x) {
            return '<div class="card card-pad" style="padding:var(--sp-3);text-align:center">' +
              '<div class="fw-bold">' + x[1] + '</div>' +
              '<div class="text-xs text-muted">' + x[0] + '</div></div>';
          }).join('') + '</div>' +
        '<h4 class="mb-3">Questions</h4>' + a.questions.map(function (q, i) {
          return '<div class="card card-pad mb-3"><div class="fw-medium mb-3">' +
            (i + 1) + '. ' + U.esc(q.text) + '</div>' +
            '<ul style="list-style:none;padding:0;margin:0">' + q.options.map(function (opt, oi) {
              var right = showAnswers && oi === q.correct;
              return '<li class="text-sm ' + (right ? 'fw-semi' : 'text-muted') + '" style="padding:3px 0">' +
                String.fromCharCode(65 + oi) + '. ' + U.esc(opt) +
                (right ? ' <span class="badge badge-success">Correct</span>' : '') + '</li>';
            }).join('') + '</ul></div>';
        }).join(''),
      footer: '<button type="button" class="btn btn-secondary" data-close>Close</button>',
      onMount: function (h) { h.overlay.querySelector('[data-close]').addEventListener('click', h.close); }
    });
  }

  /* ---------------- Admin: create / edit ---------------- */
  function assessmentForm(a) {
    a = a || {};
    function opts(list, sel) {
      return list.map(function (o) {
        return '<option' + (o === sel ? ' selected' : '') + '>' + U.esc(o) + '</option>';
      }).join('');
    }
    var courses = S.courses.allSync().filter(function (c) { return c.status === 'Published'; });

    return '<form id="asm-form" novalidate>' +
      '<div class="field"><label class="label" for="af-title">Assessment title <span class="req">*</span></label>' +
        '<input class="input" id="af-title" name="title" value="' + U.esc(a.title || '') + '"></div>' +
      '<div class="grid grid-2 gap-4">' +
        '<div class="field"><label class="label" for="af-course">Linked course</label>' +
          '<select class="select" id="af-course" name="courseId"><option value="">None — standalone check</option>' +
            courses.map(function (c) {
              return '<option value="' + U.esc(c.id) + '"' + (a.courseId === c.id ? ' selected' : '') + '>' +
                U.esc(c.title) + '</option>';
            }).join('') + '</select></div>' +
        '<div class="field"><label class="label" for="af-type">Type</label>' +
          '<select class="select" id="af-type" name="type">' + opts(TYPES, a.type) + '</select></div></div>' +
      '<div class="grid grid-2 gap-4">' +
        '<div class="field"><label class="label" for="af-pass">Pass mark (%) <span class="req">*</span></label>' +
          '<input class="input" id="af-pass" name="passMark" type="number" min="0" max="100" value="' +
          (a.passMark === undefined ? 70 : a.passMark) + '"></div>' +
        '<div class="field"><label class="label" for="af-dur">Time limit (minutes)</label>' +
          '<input class="input" id="af-dur" name="durationMins" type="number" min="1" max="180" value="' +
          (a.durationMins || 15) + '"></div></div>' +
      '<div class="field"><label class="label" for="af-status">Status</label>' +
        '<select class="select" id="af-status" name="status">' + opts(STATUSES, a.status) + '</select></div>' +
      '<label class="check"><input type="checkbox" name="mandatory"' + (a.mandatory ? ' checked' : '') + '>' +
        '<span>Mandatory — every assigned learner must pass this</span></label>' +
      '<div class="alert mt-4">' + GGL.icon('info', 'ico') + '<div class="text-sm">' +
        'New assessments are seeded with a five-question bank drawn from the category pool. ' +
        'A full question editor is planned for a later phase.</div></div></form>';
  }

  var RULES = {
    title: [U.validators.required, U.validators.min(5)],
    passMark: [U.validators.required, U.validators.numeric]
  };

  function openCreate() {
    var handle = UI.modal({
      title: 'Create assessment', subtitle: 'Define the shell and link it to a course.',
      size: 'lg', body: assessmentForm(null),
      footer: '<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
        '<button type="submit" form="asm-form" class="btn btn-primary">' +
        GGL.icon('plus', 'ico') + '<span>Create assessment</span></button>'
    });
    handle.overlay.querySelector('[data-cancel]').addEventListener('click', handle.close);

    UI.handleSubmit(handle.overlay.querySelector('#asm-form'), RULES, function (v) {
      var course = S.courses.allSync().filter(function (c) { return c.id === v.courseId; })[0];
      var template = GGL.data.assessments.filter(function (x) {
        return x.category === (course ? course.category : 'General');
      })[0] || GGL.data.assessments[0];

      return S.assessments.create({
        title: v.title, courseId: v.courseId || null,
        course: course ? course.title : '—',
        category: course ? course.category : 'General',
        type: v.type,
        stage: v.type === 'Pre-assessment' ? 'Pre' : v.type === 'Post-assessment' ? 'Post' : 'Check',
        questions: U.clone(template.questions),
        passMark: Number(v.passMark), durationMins: Number(v.durationMins),
        status: v.status, mandatory: !!v.mandatory, attempts: 0, avgScore: 0, passRate: 0
      });
    }, { success: 'Assessment created',
      onDone: function () { handle.close(); bankTable.reload(); } });
  }

  function openEdit(a) {
    var handle = UI.modal({
      title: 'Edit assessment', subtitle: a.title, size: 'lg', body: assessmentForm(a),
      footer: '<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
        '<button type="submit" form="asm-form" class="btn btn-primary">Save changes</button>'
    });
    handle.overlay.querySelector('[data-cancel]').addEventListener('click', handle.close);
    UI.handleSubmit(handle.overlay.querySelector('#asm-form'), RULES, function (v) {
      return S.assessments.update(a.id, { title: v.title, type: v.type, status: v.status,
        passMark: Number(v.passMark), durationMins: Number(v.durationMins), mandatory: !!v.mandatory });
    }, { reset: false, success: 'Assessment updated',
      onDone: function () { handle.close(); bankTable.reload(); } });
  }

  /* ---------------- Admin view ---------------- */
  function renderAdmin(body) {
    body.innerHTML =
      '<div class="grid grid-4 mb-6" id="as-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-1-1 mb-6">' +
        '<div id="as-scores"><div class="card card-pad"><div class="skel skel-chart"></div></div></div>' +
        '<div id="as-gain"><div class="card card-pad"><div class="skel skel-chart"></div></div></div></div>' +
      '<div class="tabs mb-5" role="tablist" aria-label="Assessment views">' +
        '<button type="button" class="tab" role="tab" id="as-t0" aria-controls="as-p0" aria-selected="true">Assessment bank</button>' +
        '<button type="button" class="tab" role="tab" id="as-t1" aria-controls="as-p1" aria-selected="false">Results</button></div>' +
      '<div id="as-p0" role="tabpanel" aria-labelledby="as-t0"></div>' +
      '<div id="as-p1" role="tabpanel" aria-labelledby="as-t1" hidden></div>';

    UI.initTabs(body);

    UI.async(document.getElementById('as-stats'), UI.skeletonCards(4), function () {
      return S.assessments.stats().then(function (st) {
        document.getElementById('as-stats').innerHTML =
          stat('Assessments', U.num(st.total), 'checkSquare', '') +
          stat('Published', U.num(st.published), 'checkCircle', 'green') +
          stat('Total attempts', U.num(st.attempts), 'activity', 'teal') +
          stat('Pass rate', st.passRate + '%', 'trending', 'violet');
      });
    });

    UI.async(document.getElementById('as-scores'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.attempts.all().then(function (rows) {
        var buckets = [{ label: '0–39', value: 0 }, { label: '40–59', value: 0 },
          { label: '60–69', value: 0 }, { label: '70–84', value: 0 }, { label: '85–100', value: 0 }];
        rows.forEach(function (r) {
          var i = r.score < 40 ? 0 : r.score < 60 ? 1 : r.score < 70 ? 2 : r.score < 85 ? 3 : 4;
          buckets[i].value++;
        });
        document.getElementById('as-scores').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>Score distribution</h3>' +
          '<p class="sub">Across ' + U.num(rows.length) + ' recorded attempts</p></div></div>' +
          '<div class="card-body">' + C.bar(buckets, { height: 240, label: 'Score distribution' }) + '</div></div>';
      });
    });

    UI.async(document.getElementById('as-gain'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.attempts.all().then(function (rows) {
        var byCat = U.groupBy(rows.filter(function (r) { return r.stage !== 'Check'; }), 'category');
        var data = Object.keys(byCat).slice(0, 6).map(function (cat) {
          var pre = byCat[cat].filter(function (r) { return r.stage === 'Pre'; });
          var post = byCat[cat].filter(function (r) { return r.stage === 'Post'; });
          var gain = (post.length ? U.avg(post, 'score') : 0) - (pre.length ? U.avg(pre, 'score') : 0);
          return { label: cat, value: Math.max(0, Math.round(gain)) };
        }).sort(function (a, b) { return b.value - a.value; });

        document.getElementById('as-gain').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>Knowledge gain by category</h3>' +
          '<p class="sub">Average post-assessment score minus pre-assessment</p></div>' +
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/effectiveness.html') + '">Effectiveness</a></div>' +
          '<div class="card-body">' + C.hbars(data, { suffix: ' pts' }) +
          '<p class="hint mt-4">These are the same figures the effectiveness module reports — both read the attempt data.</p>' +
          '</div></div>';
      });
    });

    bankTable = GGL.DataTable(document.getElementById('as-p0'), {
      searchPlaceholder: 'Search assessments, courses or categories…',
      pageSize: 10, defaultSort: 'title',
      columns: [
        { key: 'title', label: 'Assessment', sortable: true, primary: true,
          render: function (r) {
            return '<div class="fw-medium truncate" style="max-width:300px">' + U.esc(r.title) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.category) + (r.mandatory ? ' · Mandatory' : '') + '</div>';
          }},
        { key: 'type', label: 'Type', sortable: true, hideBelow: 'md' },
        { key: 'questions', label: 'Qs', sortable: true, align: 'right', hideBelow: 'lg',
          render: function (r) { return r.questions.length; }},
        { key: 'passMark', label: 'Pass mark', sortable: true, align: 'right', hideBelow: 'lg',
          render: function (r) { return r.passMark + '%'; }},
        { key: 'attempts', label: 'Attempts', sortable: true, align: 'right', hideBelow: 'md',
          render: function (r) { return U.num(r.attempts); }},
        { key: 'passRate', label: 'Pass rate', sortable: true, width: '150px',
          render: function (r) { return U.progressCell(r.passRate); }},
        { key: 'status', label: 'Status', sortable: true,
          render: function (r) { return U.statusBadge(r.status); }}
      ],
      filters: [
        { key: 'type', label: 'Type', options: TYPES.map(function (t) { return { value: t, label: t }; })},
        { key: 'status', label: 'Status', options: STATUSES.map(function (s) { return { value: s, label: s }; })}
      ],
      toolbarExtra: '<button type="button" class="btn btn-sm btn-secondary" data-export-bank>' +
        GGL.icon('download', 'ico') + '<span>Export</span></button>',
      fetch: function (q) { return S.assessments.list(q); },
      onRowClick: function (r) { previewAssessment(r, true); },
      rowActions: function () {
        return [
          { label: 'Preview questions', icon: 'eye', onClick: function (r) { previewAssessment(r, true); }},
          { label: 'Edit assessment', icon: 'edit', onClick: openEdit },
          { label: 'View results', icon: 'barChart', onClick: function (r) {
              document.getElementById('as-t1').click();
              setTimeout(function () { resultsTable.setFilter('assessmentId', r.id); }, 120);
            }},
          { label: 'Delete assessment', icon: 'trash', tone: 'danger', onClick: function (r) {
              UI.confirm({ title: 'Delete this assessment?',
                message: '\u201C' + r.title + '\u201D will be removed from the bank.',
                detail: r.attempts ? U.num(r.attempts) + ' recorded attempts reference this assessment.' : null,
                confirmLabel: 'Delete assessment',
                onConfirm: function () {
                  return S.assessments.remove(r.id).then(function () {
                    UI.toast('Assessment deleted', { type: 'success' }); bankTable.reload();
                  });
                }});
            }}
        ];
      },
      empty: { icon: 'checkSquare', title: 'No assessments yet',
        message: 'Create an assessment and link it to a course.',
        action: 'Create assessment', onAction: openCreate }
    });

    document.querySelector('[data-export-bank]').addEventListener('click', function () {
      S.assessments.all().then(function (rows) {
        U.downloadCsv('assessment-bank-' + U.stamp() + '.csv', [
          { key: 'title', label: 'Assessment' }, { key: 'course', label: 'Course' },
          { key: 'category', label: 'Category' }, { key: 'type', label: 'Type' },
          { label: 'Questions', value: function (r) { return r.questions.length; } },
          { key: 'passMark', label: 'Pass mark %' }, { key: 'attempts', label: 'Attempts' },
          { key: 'avgScore', label: 'Average score %' }, { key: 'passRate', label: 'Pass rate %' },
          { key: 'status', label: 'Status' }
        ], rows);
        UI.toast('Export downloaded', { type: 'success', desc: rows.length + ' assessments written to CSV.' });
      });
    });

    resultsTable = GGL.DataTable(document.getElementById('as-p1'), {
      searchPlaceholder: 'Search by learner, employee ID or course…',
      pageSize: 10, defaultSort: 'submittedAt', defaultDir: 'desc', selectable: true,
      columns: [
        { key: 'name', label: 'Learner', sortable: true, primary: true,
          render: function (r) { return U.userCell(r.name, r.employeeId); }},
        { key: 'assessment', label: 'Assessment', sortable: true, hideBelow: 'md',
          render: function (r) {
            return '<div class="truncate" style="max-width:240px">' + U.esc(r.assessment) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.stage) + '</div>';
          }},
        { key: 'department', label: 'Department', sortable: true, hideBelow: 'lg' },
        { key: 'submittedAt', label: 'Submitted', sortable: true, hideBelow: 'md',
          render: function (r) { return U.date(r.submittedAt); }},
        { key: 'score', label: 'Score', sortable: true, align: 'right',
          render: function (r) {
            return '<strong>' + r.score + '%</strong><div class="text-xs text-muted">' +
              r.correct + '/' + r.total + '</div>';
          }},
        { key: 'passed', label: 'Outcome', sortable: true,
          render: function (r) { return U.statusBadge(r.passed ? 'Passed' : 'Failed'); }}
      ],
      filters: [
        { key: 'stage', label: 'Stage', options: [
          { value: 'Pre', label: 'Pre' }, { value: 'Post', label: 'Post' },
          { value: 'Check', label: 'Knowledge check' }]},
        { key: 'assessmentId', label: 'Assessment', options: GGL.data.assessments.map(function (a) {
          return { value: a.id, label: a.title }; })}
      ],
      bulkActions: [{ label: 'Export selected', icon: 'download',
        onClick: function (ids, api) {
          var rows = api.selection;
          U.downloadCsv('assessment-results-' + U.stamp() + '.csv', RESULT_COLUMNS, rows);
          UI.toast('Export downloaded', { type: 'success', desc: rows.length + ' results written to CSV.' });
        }}],
      toolbarExtra: '<button type="button" class="btn btn-sm btn-secondary" data-export-results>' +
        GGL.icon('download', 'ico') + '<span>Export all</span></button>',
      fetch: function (q) { return S.attempts.list(q); },
      onRowClick: function (r) {
        UI.modal({
          title: r.name + ' — ' + r.score + '%', subtitle: r.assessment, size: 'sm',
          body: '<div class="text-center mb-5">' +
              C.gauge(r.score, { size: 140, caption: r.correct + ' of ' + r.total + ' correct' }) + '</div>' +
            '<dl class="kv"><dt>Outcome</dt><dd>' + U.statusBadge(r.passed ? 'Passed' : 'Failed') + '</dd>' +
              '<dt>Stage</dt><dd>' + U.esc(r.stage) + '</dd>' +
              '<dt>Course</dt><dd>' + U.esc(r.course) + '</dd>' +
              '<dt>Department</dt><dd>' + U.esc(r.department) + '</dd>' +
              '<dt>Submitted</dt><dd>' + U.date(r.submittedAt, 'long') + ', ' + U.time(r.submittedAt) + '</dd></dl>',
          footer: '<button type="button" class="btn btn-secondary" data-close>Close</button>',
          onMount: function (h) { h.overlay.querySelector('[data-close]').addEventListener('click', h.close); }
        });
      },
      empty: { icon: 'activity', title: 'No attempts recorded',
        message: 'Results appear here once learners submit assessments.' }
    });

    document.querySelector('[data-export-results]').addEventListener('click', function () {
      S.attempts.all().then(function (rows) {
        U.downloadCsv('assessment-results-' + U.stamp() + '.csv', RESULT_COLUMNS, rows);
        UI.toast('Export downloaded', { type: 'success', desc: rows.length + ' results written to CSV.' });
      });
    });
  }

  /* ---------------- Learner view ---------------- */
  function renderLearner(body, user) {
    body.innerHTML =
      '<div class="grid grid-4 mb-6" id="as-stats">' + UI.skeletonCards(4) + '</div>' +
      '<h2 class="mb-4" style="font-size:var(--fs-lg)">Available to you</h2>' +
      '<div id="as-available"><div class="grid grid-3">' + UI.skeletonCards(6) + '</div></div>' +
      '<h2 class="mb-4 mt-8" style="font-size:var(--fs-lg)">My results</h2><div id="as-mine"></div>';

    function load() {
      return Promise.all([S.assessments.availableFor(user.id), S.assessments.attemptsFor(user.id)])
        .then(function (res) {
          var available = res[0], mine = res[1];
          var passed = mine.filter(function (m) { return m.passed; }).length;

          document.getElementById('as-stats').innerHTML =
            stat('Available', available.filter(function (a) { return !a.taken; }).length, 'checkSquare', '') +
            stat('Attempted', mine.length, 'activity', 'teal') +
            stat('Passed', passed, 'checkCircle', 'green') +
            stat('Average score', (mine.length ? Math.round(U.avg(mine, 'score')) : 0) + '%', 'trending', 'violet');

          var open = available.filter(function (a) { return !a.taken; });
          var el = document.getElementById('as-available');

          el.innerHTML = open.length
            ? '<div class="grid grid-3">' + open.slice(0, 9).map(function (a, i) {
                var variant = ['', 'v2', 'v3', 'v4'][i % 4];
                return '<article class="card course-card"><div class="course-thumb ' + variant + '">' +
                  '<span class="cat">' + U.esc(a.category) + '</span>' + GGL.icon('checkSquare', 'ico') + '</div>' +
                  '<div class="course-body"><div class="row-between gap-2 mb-2">' +
                    '<span class="badge badge-info">' + U.esc(a.type) + '</span>' +
                    (a.mandatory ? '<span class="badge badge-warning">Mandatory</span>' : '') + '</div>' +
                  '<h3>' + U.esc(a.title) + '</h3>' +
                  '<div class="course-meta">' +
                    '<span>' + GGL.icon('help', 'ico') + a.questions.length + ' questions</span>' +
                    '<span>' + GGL.icon('clock', 'ico') + a.durationMins + ' min</span>' +
                    '<span>' + GGL.icon('target', 'ico') +
                      (a.passMark > 0 ? a.passMark + '% to pass' : 'Not graded') + '</span></div>' +
                  '<div class="course-foot">' +
                    '<button type="button" class="btn btn-primary btn-sm btn-block" data-take="' + U.esc(a.id) + '">' +
                    GGL.icon('play', 'ico') + '<span>Start assessment</span></button></div></div></article>';
              }).join('') + '</div>'
            : '<div class="card">' + UI.empty({ icon: 'checkCircle', title: 'Nothing outstanding',
                message: 'You have attempted every assessment currently available to you.' }) + '</div>';

          U.$$('[data-take]', el).forEach(function (btn) {
            btn.addEventListener('click', function () {
              takeAssessment(available.filter(function (x) { return x.id === btn.getAttribute('data-take'); })[0], load);
            });
          });

          var mineEl = document.getElementById('as-mine');
          mineEl.innerHTML = mine.length
            ? '<div class="card"><div class="table-wrap"><table class="table"><thead><tr>' +
                '<th>Assessment</th><th class="hide-sm">Stage</th><th class="hide-md">Submitted</th>' +
                '<th>Score</th><th>Outcome</th></tr></thead><tbody>' +
              mine.sort(function (a, b) { return new Date(b.submittedAt) - new Date(a.submittedAt); })
                .map(function (m) {
                  return '<tr><td class="cell-primary"><div class="truncate" style="max-width:280px">' +
                    U.esc(m.assessment) + '</div></td>' +
                    '<td class="hide-sm">' + U.esc(m.stage) + '</td>' +
                    '<td class="hide-md">' + U.date(m.submittedAt) + '</td>' +
                    '<td><strong>' + m.score + '%</strong></td>' +
                    '<td>' + U.statusBadge(m.passed ? 'Passed' : 'Failed') + '</td></tr>';
                }).join('') + '</tbody></table></div>' +
              '<div class="card-foot"><button type="button" class="btn btn-sm btn-secondary" data-export-mine>' +
                GGL.icon('download', 'ico') + '<span>Export my results</span></button></div></div>'
            : '<div class="card">' + UI.empty({ icon: 'activity', title: 'No attempts yet',
                message: 'Start an assessment above and your results will appear here.' }) + '</div>';

          var exp = mineEl.querySelector('[data-export-mine]');
          if (exp) exp.addEventListener('click', function () {
            U.downloadCsv('my-assessment-results-' + U.stamp() + '.csv', RESULT_COLUMNS, mine);
            UI.toast('Export downloaded', { type: 'success', desc: mine.length + ' results written to CSV.' });
          });
        });
    }

    UI.async(document.getElementById('as-available'),
      '<div class="grid grid-3">' + UI.skeletonCards(6) + '</div>', load);
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var isLearner = user.role === GGL.ROLES.END_USER;

    var body = GGL.shell.mount({
      active: 'assessments', title: 'Assessments',
      subtitle: isLearner ? 'Knowledge checks, pre and post assessments assigned to you.'
        : 'Build the question bank, review every attempt and export the results.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Assessments' }],
      actions: isLearner ? '' : '<button type="button" class="btn btn-primary" data-create-assessment>' +
        GGL.icon('plus', 'ico') + '<span>Create assessment</span></button>'
    });
    if (!body) return;

    if (isLearner) { renderLearner(body, user); return; }
    renderAdmin(body);
    document.querySelector('[data-create-assessment]').addEventListener('click', openCreate);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
