/* GG Learning Labs — Batch management */
(function (GGL) {
  'use strict';
  var U = GGL.utils, UI = GGL.ui, S = GGL.services;
  var table = null;
  var MODES = ['Classroom','Virtual','Hybrid'];
  var STATUSES = ['Active','Scheduled','Completed','On Hold'];
  var LOCATIONS = ['Mumbai','Bengaluru','Pune','Hyderabad','Gurugram','Chennai','Remote'];

  function opts(list, sel) {
    return list.map(function (o) { return '<option' + (o === sel ? ' selected' : '') + '>' + U.esc(o) + '</option>'; }).join('');
  }
  function mini(label, value) {
    return '<div class="card card-pad" style="padding:var(--sp-3);text-align:center">' +
      '<div class="fw-bold">' + U.esc(value) + '</div><div class="text-xs text-muted">' + U.esc(label) + '</div></div>';
  }

  var WIZARD_STEPS = ['Batch details', 'Course & trainer', 'Trainees', 'Review'];

  function openWizard() {
    var state = { step: 0, values: {} };
    var handle = UI.modal({
      title: 'Create batch', subtitle: 'Four steps — details, course, trainees, review.', size: 'lg',
      body: '<div id="wizard"></div>',
      footer: '<button type="button" class="btn btn-ghost" data-wz-cancel>Cancel</button>' +
        '<div class="grow"></div>' +
        '<button type="button" class="btn btn-secondary" data-wz-back hidden>Back</button>' +
        '<button type="button" class="btn btn-primary" data-wz-next>Continue</button>'
    });

    var wizard = handle.overlay.querySelector('#wizard');
    var backBtn = handle.overlay.querySelector('[data-wz-back]');
    var nextBtn = handle.overlay.querySelector('[data-wz-next]');
    handle.overlay.querySelector('[data-wz-cancel]').addEventListener('click', handle.close);

    function stepper() {
      return '<div class="wizard-steps">' + WIZARD_STEPS.map(function (s, i) {
        var cls = i === state.step ? ' active' : i < state.step ? ' done' : '';
        return '<span class="wizard-step' + cls + '"><span class="n">' +
          (i < state.step ? '✓' : i + 1) + '</span><span>' + U.esc(s) + '</span></span>';
      }).join('') + '</div>';
    }

    function render() {
      var v = state.values, content = '';
      if (state.step === 0) {
        content = '<form id="wz-form" novalidate>' +
          '<div class="field"><label class="label" for="wz-name">Batch name <span class="req">*</span></label>' +
            '<input class="input" id="wz-name" name="name" value="' + U.esc(v.name || '') + '" placeholder="LEAD-2026-B01"></div>' +
          '<div class="grid grid-2 gap-4">' +
            '<div class="field"><label class="label" for="wz-start">Start date <span class="req">*</span></label>' +
              '<input class="input" id="wz-start" name="startDate" type="date" value="' + (v.startDate || '') + '"></div>' +
            '<div class="field"><label class="label" for="wz-end">End date <span class="req">*</span></label>' +
              '<input class="input" id="wz-end" name="endDate" type="date" value="' + (v.endDate || '') + '"></div></div>' +
          '<div class="grid grid-2 gap-4">' +
            '<div class="field"><label class="label" for="wz-mode">Delivery mode</label>' +
              '<select class="select" id="wz-mode" name="mode">' + opts(MODES, v.mode) + '</select></div>' +
            '<div class="field"><label class="label" for="wz-loc">Location</label>' +
              '<select class="select" id="wz-loc" name="location">' + opts(LOCATIONS, v.location) + '</select></div></div></form>';
      }
      if (state.step === 1) {
        var courses = S.courses.allSync().filter(function (c) { return c.status === 'Published'; });
        content = '<form id="wz-form" novalidate>' +
          '<div class="field"><label class="label" for="wz-course">Programme / course <span class="req">*</span></label>' +
            '<select class="select" id="wz-course" name="courseId"><option value="">Select a course…</option>' +
              courses.map(function (c) {
                return '<option value="' + U.esc(c.id) + '"' + (v.courseId === c.id ? ' selected' : '') + '>' + U.esc(c.title) + '</option>';
              }).join('') + '</select></div>' +
          '<div class="field"><label class="label" for="wz-trainer">Assigned trainer <span class="req">*</span></label>' +
            '<select class="select" id="wz-trainer" name="trainerId"><option value="">Select a trainer…</option>' +
              GGL.data.trainers.filter(function (t) { return t.status === 'Active'; }).map(function (t) {
                return '<option value="' + U.esc(t.id) + '"' + (v.trainerId === t.id ? ' selected' : '') + '>' +
                  U.esc(t.name) + ' — ' + U.esc(t.specialism) + '</option>';
              }).join('') + '</select></div>' +
          '<div class="field"><label class="label" for="wz-sessions">Number of sessions</label>' +
            '<input class="input" id="wz-sessions" name="sessions" type="number" min="1" max="30" value="' + (v.sessions || 6) + '"></div></form>';
      }
      if (state.step === 2) {
        content = '<form id="wz-form" novalidate><div class="grid grid-2 gap-4">' +
            '<div class="field"><label class="label" for="wz-dept">Target department</label>' +
              '<select class="select" id="wz-dept" name="department">' + opts(GGL.seed.DEPTS, v.department) + '</select></div>' +
            '<div class="field"><label class="label" for="wz-count">Number of trainees <span class="req">*</span></label>' +
              '<input class="input" id="wz-count" name="trainees" type="number" min="1" max="200" value="' + (v.trainees || 15) + '"></div></div>' +
          '<div class="alert mt-2">' + GGL.icon('info','ico') + '<div class="text-sm">' +
            'Individual trainee selection from the learner directory is not implemented in this phase — ' +
            'the batch is created with a headcount.</div></div></form>';
      }
      if (state.step === 3) {
        var course = S.courses.allSync().filter(function (c) { return c.id === v.courseId; })[0] || {};
        var trainer = GGL.data.trainers.filter(function (t) { return t.id === v.trainerId; })[0] || {};
        content = '<div class="alert alert-success mb-5">' + GGL.icon('checkCircle','ico') +
          '<div class="text-sm">Everything looks complete. Review and create the batch.</div></div>' +
          '<dl class="kv">' +
            '<dt>Batch name</dt><dd>' + U.esc(v.name) + '</dd>' +
            '<dt>Programme</dt><dd>' + U.esc(course.title || '—') + '</dd>' +
            '<dt>Trainer</dt><dd>' + U.esc(trainer.name || '—') + '</dd>' +
            '<dt>Dates</dt><dd>' + U.date(v.startDate) + ' → ' + U.date(v.endDate) + '</dd>' +
            '<dt>Mode</dt><dd>' + U.esc(v.mode) + ' · ' + U.esc(v.location) + '</dd>' +
            '<dt>Sessions</dt><dd>' + U.esc(v.sessions) + '</dd>' +
            '<dt>Trainees</dt><dd>' + U.esc(v.trainees) + ' from ' + U.esc(v.department) + '</dd></dl>';
      }
      wizard.innerHTML = stepper() + content;
      backBtn.hidden = state.step === 0;
      nextBtn.innerHTML = state.step === WIZARD_STEPS.length - 1
        ? GGL.icon('check','ico') + '<span>Create batch</span>' : '<span>Continue</span>';
    }

    var STEP_RULES = [
      { name: [U.validators.required], startDate: [U.validators.required], endDate: [U.validators.required] },
      { courseId: [U.validators.required], trainerId: [U.validators.required] },
      { trainees: [U.validators.required, U.validators.numeric] }, {}
    ];

    function collect() {
      var form = wizard.querySelector('#wz-form');
      if (!form) return { valid: true, values: {} };
      var result = U.validateForm(form, STEP_RULES[state.step]);
      if (result.valid) Object.assign(state.values, result.values);
      return result;
    }

    nextBtn.addEventListener('click', function () {
      var result = collect();
      if (!result.valid) return;
      if (state.step < WIZARD_STEPS.length - 1) {
        if (state.step === 0 && state.values.endDate < state.values.startDate) {
          UI.toast('End date is before the start date', { type: 'error' }); return;
        }
        state.step++; render(); return;
      }
      var v = state.values;
      var course = S.courses.allSync().filter(function (c) { return c.id === v.courseId; })[0] || {};
      var trainer = GGL.data.trainers.filter(function (t) { return t.id === v.trainerId; })[0] || {};
      nextBtn.classList.add('is-loading'); nextBtn.disabled = true;

      S.batches.create({
        name: v.name, programme: course.title, courseId: v.courseId,
        trainer: trainer.name, trainerId: v.trainerId, location: v.location, mode: v.mode,
        startDate: new Date(v.startDate).toISOString(), endDate: new Date(v.endDate).toISOString(),
        trainees: Number(v.trainees), sessions: Number(v.sessions), department: v.department,
        status: new Date(v.startDate) > new Date() ? 'Scheduled' : 'Active',
        completion: 0, attendanceRate: null
      }).then(function () {
        UI.toast('Batch created', { type: 'success', desc: v.name + ' is ready.' });
        handle.close(); table.reload();
      }).catch(function (err) {
        nextBtn.classList.remove('is-loading'); nextBtn.disabled = false;
        UI.toast('Could not create batch', { type: 'error', desc: err.message });
      });
    });

    backBtn.addEventListener('click', function () {
      collect(); state.step = Math.max(0, state.step - 1); render();
    });
    render();
  }

  function openDetail(b) {
    var tabs = ['Overview','Trainees','Schedule','Outcomes'];
    var uid = U.uid('bt');
    var learners = GGL.data.users.filter(function (u) { return u.role === GGL.ROLES.END_USER; })
      .slice(0, Math.min(b.trainees, 8));
    var sessions = GGL.data.sessions.filter(function (s) { return s.batchId === b.id; });

    UI.modal({
      title: b.name, subtitle: b.programme, size: 'lg',
      body: '<div class="tabs mb-5" role="tablist" aria-label="Batch details">' +
          tabs.map(function (t, i) {
            return '<button type="button" class="tab" role="tab" id="' + uid + '-t' + i + '" ' +
              'aria-controls="' + uid + '-p' + i + '" aria-selected="' + (i === 0) + '">' + t + '</button>';
          }).join('') + '</div>' +
        '<div id="' + uid + '-p0" role="tabpanel" aria-labelledby="' + uid + '-t0">' +
          '<div class="row gap-2 mb-5 wrap">' + U.statusBadge(b.status) +
          '<span class="badge badge-plain">' + U.esc(b.mode) + '</span>' +
          '<span class="badge badge-plain">' + U.esc(b.location) + '</span></div>' +
          '<div class="grid grid-4 gap-3 mb-5">' + mini('Trainees', b.trainees) + mini('Sessions', b.sessions) +
            mini('Completion', b.completion + '%') +
            mini('Attendance', b.attendanceRate === null ? '—' : b.attendanceRate + '%') + '</div>' +
          '<dl class="kv"><dt>Programme</dt><dd>' + U.esc(b.programme) + '</dd>' +
            '<dt>Trainer</dt><dd>' + U.esc(b.trainer) + '</dd>' +
            '<dt>Department</dt><dd>' + U.esc(b.department) + '</dd>' +
            '<dt>Start date</dt><dd>' + U.date(b.startDate, 'long') + '</dd>' +
            '<dt>End date</dt><dd>' + U.date(b.endDate, 'long') + '</dd></dl></div>' +
        '<div id="' + uid + '-p1" role="tabpanel" aria-labelledby="' + uid + '-t1" hidden>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>Trainee</th>' +
          '<th class="hide-sm">Department</th><th>Progress</th><th>Status</th></tr></thead><tbody>' +
          learners.map(function (l) {
            return '<tr><td>' + U.userCell(l.name, l.employeeId) + '</td>' +
              '<td class="hide-sm">' + U.esc(l.department) + '</td>' +
              '<td style="width:150px">' + U.progressCell(l.progress) + '</td>' +
              '<td>' + U.statusBadge(l.trainingStatus) + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
          (b.trainees > 8 ? '<p class="hint mt-3">Showing 8 of ' + b.trainees + ' trainees.</p>' : '') + '</div>' +
        '<div id="' + uid + '-p2" role="tabpanel" aria-labelledby="' + uid + '-t2" hidden>' +
          (sessions.length ? '<ul class="session-list">' + sessions.map(function (s) {
            var d = new Date(s.start);
            return '<li><span class="session-date"><span class="m">' +
              d.toLocaleDateString('en-GB', { month: 'short' }) + '</span>' +
              '<span class="d">' + d.getDate() + '</span></span>' +
              '<span class="session-info"><h4>' + U.esc(s.title) + '</h4>' +
              '<span class="meta"><span>' + GGL.icon('clock','ico') + U.time(s.start) + ' · ' +
              U.duration(s.durationMins) + '</span><span>' + GGL.icon('mapPin','ico') +
              U.esc(s.location) + '</span></span></span>' +
              U.statusBadge(s.status === 'Today' ? 'Active' : s.status) + '</li>';
          }).join('') + '</ul>'
          : UI.empty({ icon: 'calendar', title: 'No sessions scheduled',
              message: 'Add sessions to this batch from the training calendar.' })) + '</div>' +
        '<div id="' + uid + '-p3" role="tabpanel" aria-labelledby="' + uid + '-t3" hidden>' +
          '<p class="text-muted text-sm">Record the outcome for a trainee once their assessment is complete.</p>' +
          '<div class="card card-pad mb-4"><div class="row-between mb-3">' +
            '<strong>' + U.esc(GGL.data.users[2].name) + '</strong>' +
            '<span class="badge badge-info">Assessment complete</span></div>' +
            '<div class="row-between mb-4"><span class="text-sm text-muted">Final score</span>' +
            '<strong style="font-size:var(--fs-xl)">84%</strong></div>' +
            '<div class="text-xs text-muted mb-3">Recommended action based on score: <strong>Graduate</strong></div>' +
            '<div class="btn-group">' +
              '<button type="button" class="btn btn-sm btn-primary" data-outcome="Graduated">Graduate</button>' +
              '<button type="button" class="btn btn-sm btn-secondary" data-outcome="Moved to next batch">Move to next batch</button>' +
              '<button type="button" class="btn btn-sm btn-secondary" data-outcome="Retraining">Retraining</button>' +
              '<button type="button" class="btn btn-sm btn-danger-ghost" data-outcome="Failed">Fail</button></div></div>' +
          '<div class="alert">' + GGL.icon('info','ico') + '<div class="text-sm">' +
            'Full trainee-by-trainee outcome management is planned for a later phase.</div></div></div>',
      footer: '<button type="button" class="btn btn-secondary" data-close>Close</button>' +
              '<a class="btn btn-primary" href="' + GGL.url('app/attendance.html') + '">Mark attendance</a>',
      onMount: function (h) {
        UI.initTabs(h.overlay);
        h.overlay.querySelector('[data-close]').addEventListener('click', h.close);
        U.$$('[data-outcome]', h.overlay).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var outcome = btn.getAttribute('data-outcome');
            var destructive = outcome === 'Failed';
            UI.confirm({
              title: 'Record outcome: ' + outcome + '?',
              message: 'This sets the trainee\u2019s status for ' + b.name + ' to \u201C' + outcome + '\u201D.',
              detail: destructive ? 'A failed outcome may trigger a retraining nomination workflow.' : null,
              tone: destructive ? 'danger' : 'info', confirmLabel: 'Confirm ' + outcome.toLowerCase(),
              onConfirm: function () {
                return U.delay(500).then(function () {
                  UI.toast('Outcome recorded', { type: 'success', desc: 'Trainee marked as ' + outcome + '.' });
                });
              }
            });
          });
        });
      }
    });
  }

  function stat(label, value, icon, tone) {
    return '<div class="card stat"><div class="stat-top"><span class="stat-label">' + label + '</span>' +
      '<span class="stat-icon ' + tone + '">' + GGL.icon(icon,'ico') + '</span></div>' +
      '<div class="stat-value">' + U.num(value) + '</div></div>';
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }

    var body = GGL.shell.mount({
      active: 'batches', title: 'Batches',
      subtitle: 'Cohorts, trainers, schedules and outcomes.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Batches' }],
      actions: '<button type="button" class="btn btn-primary" data-create-batch>' +
               GGL.icon('plus','ico') + '<span>Create batch</span></button>'
    });
    if (!body) return;

    body.innerHTML = '<div class="grid grid-4 mb-6" id="b-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div id="b-table"></div>';

    UI.async(document.getElementById('b-stats'), UI.skeletonCards(4), function () {
      return S.batches.all().then(function (rows) {
        var by = U.groupBy(rows, 'status');
        document.getElementById('b-stats').innerHTML =
          stat('Total batches', rows.length, 'layers', '') +
          stat('Active', (by.Active || []).length, 'play', 'green') +
          stat('Scheduled', (by.Scheduled || []).length, 'calendar', 'teal') +
          stat('Completed', (by.Completed || []).length, 'checkCircle', 'violet');
      });
    });

    table = GGL.DataTable(document.getElementById('b-table'), {
      searchPlaceholder: 'Search batches, programmes or trainers…',
      pageSize: 10, defaultSort: 'startDate', defaultDir: 'desc',
      columns: [
        { key: 'name', label: 'Batch', sortable: true, primary: true,
          render: function (r) {
            return '<div class="fw-medium">' + U.esc(r.name) + '</div>' +
              '<div class="text-xs text-muted truncate" style="max-width:260px">' + U.esc(r.programme) + '</div>';
          }},
        { key: 'trainer', label: 'Trainer', sortable: true, hideBelow: 'md' },
        { key: 'mode', label: 'Mode', sortable: true, hideBelow: 'lg' },
        { key: 'startDate', label: 'Start', sortable: true, hideBelow: 'md',
          render: function (r) { return U.date(r.startDate); }},
        { key: 'endDate', label: 'End', sortable: true, hideBelow: 'lg',
          render: function (r) { return U.date(r.endDate); }},
        { key: 'trainees', label: 'Trainees', sortable: true, align: 'right' },
        { key: 'completion', label: 'Completion', sortable: true, width: '150px',
          render: function (r) { return U.progressCell(r.completion); }},
        { key: 'status', label: 'Status', sortable: true,
          render: function (r) { return U.statusBadge(r.status); }}
      ],
      filters: [
        { key: 'status', label: 'Status', options: STATUSES.map(function (s) { return { value: s, label: s }; })},
        { key: 'mode', label: 'Mode', options: MODES.map(function (m) { return { value: m, label: m }; })}
      ],
      fetch: function (q) { return S.batches.list(q); },
      onRowClick: openDetail,
      rowActions: function () {
        return [
          { label: 'View batch', icon: 'eye', onClick: openDetail },
          { label: 'Mark attendance', icon: 'userCheck',
            onClick: function () { window.location.href = GGL.url('app/attendance.html'); }},
          { label: 'Put on hold', icon: 'clock', onClick: function (row) {
              S.batches.update(row.id, { status: 'On Hold' }).then(function () {
                UI.toast('Batch put on hold', { type: 'success' }); table.reload();
              });
            }},
          { label: 'Delete batch', icon: 'trash', tone: 'danger', onClick: function (row) {
              UI.confirm({ title: 'Delete this batch?',
                message: '\u201C' + row.name + '\u201D and its schedule will be removed.',
                detail: row.trainees + ' trainees are assigned to this batch.',
                confirmLabel: 'Delete batch',
                onConfirm: function () {
                  return S.batches.remove(row.id).then(function () {
                    UI.toast('Batch deleted', { type: 'success' }); table.reload();
                  });
                }});
            }}
        ];
      },
      empty: { icon: 'layers', title: 'No batches yet',
        message: 'Create a batch to schedule training for a group of learners.',
        action: 'Create batch', onAction: openWizard }
    });

    document.querySelector('[data-create-batch]').addEventListener('click', openWizard);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
