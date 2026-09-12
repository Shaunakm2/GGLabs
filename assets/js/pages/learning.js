/* GG Learning Labs — My Learning (learner-facing) */
(function (GGL) {
  'use strict';
  var U = GGL.utils, UI = GGL.ui, S = GGL.services;
  var filter = 'all';

  function courseCard(c, i) {
    var variant = ['','v2','v3','v4'][i % 4];
    var overdue = c.status !== 'Completed' && new Date(c.dueDate) < new Date();
    return '<article class="card course-card"><div class="course-thumb ' + variant + '">' +
      '<span class="cat">' + U.esc(c.category) + '</span>' +
      GGL.icon(c.delivery === 'E-Learning' ? 'video' : c.delivery === 'Blended' ? 'layers' : 'users','ico') +
      '</div><div class="course-body">' +
      '<div class="row-between gap-2 mb-2">' + U.statusBadge(c.status) +
        (c.mandatory ? '<span class="badge badge-warning">Mandatory</span>' : '') + '</div>' +
      '<h3>' + U.esc(c.title) + '</h3>' +
      '<div class="course-meta">' +
        '<span>' + GGL.icon('user','ico') + U.esc(c.instructor.split(' ')[0]) + '</span>' +
        '<span>' + GGL.icon('clock','ico') + U.duration(c.durationMins) + '</span>' +
        '<span>' + GGL.icon('layers','ico') + c.lessonsDone + '/' + c.lessons + ' lessons</span></div>' +
      '<div class="course-foot"><div class="row-between mb-2">' +
        '<span class="text-xs text-muted">' + (c.status === 'Completed' ? 'Completed' : 'Due ' + U.date(c.dueDate)) + '</span>' +
        (overdue ? '<span class="badge badge-danger">Overdue</span>' : '') + '</div>' +
        U.progressCell(c.progress) +
        (c.status === 'Completed'
          ? '<button type="button" class="btn btn-secondary btn-sm btn-block mt-3" data-cert="' + U.esc(c.id) + '">' +
            GGL.icon('award','ico') + '<span>View certificate</span></button>'
          : '<button type="button" class="btn btn-primary btn-sm btn-block mt-3" data-continue="' + U.esc(c.id) + '">' +
            GGL.icon('play','ico') + '<span>' + (c.progress ? 'Continue' : 'Start course') + '</span></button>') +
      '</div></div></article>';
  }

  function certificateDialog(course) {
    UI.modal({
      title: 'Certificate of completion', subtitle: course.title, size: 'sm',
      body: '<div class="text-center" style="padding:var(--sp-6) var(--sp-4);border:2px dashed var(--border-strong);border-radius:var(--r-lg)">' +
        '<div class="state-icon" style="background:var(--accent-soft);color:var(--text-brand);margin:0 auto var(--sp-4)">' +
        GGL.icon('award','ico') + '</div><h3 style="margin-bottom:var(--sp-2)">' +
        U.esc(S.auth.getUser().name) + '</h3>' +
        '<p class="text-sm text-muted">has successfully completed</p>' +
        '<p class="fw-semi">' + U.esc(course.title) + '</p>' +
        '<p class="text-xs text-subtle" style="margin:0">Issued ' + U.date(new Date().toISOString(), 'long') + '</p></div>' +
        '<p class="hint mt-4">Full certificates with serials live in the Certificates module.</p>',
      footer: '<button type="button" class="btn btn-secondary" data-close>Close</button>' +
        '<a class="btn btn-primary" href="' + GGL.url('app/certificates.html') + '">My certificates</a>',
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

    var body = GGL.shell.mount({
      active: 'learning', title: 'My learning',
      subtitle: 'Everything assigned to you, in one place.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'My learning' }],
      actions: '<a class="btn btn-secondary" href="' + GGL.url('app/calendar.html') + '">' +
        GGL.icon('calendar','ico') + '<span>My calendar</span></a>'
    });
    if (!body) return;

    body.innerHTML = '<div class="grid grid-4 mb-6" id="l-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="card mb-5"><div class="toolbar">' +
        '<div class="segmented" role="group" aria-label="Filter courses">' +
          ['all','In Progress','Not Started','Completed'].map(function (f) {
            return '<button type="button" data-filter="' + U.esc(f) + '" aria-pressed="' + (filter === f) + '">' +
              (f === 'all' ? 'All' : f) + '</button>';
          }).join('') + '</div><div class="grow"></div>' +
        '<span class="text-sm text-muted" id="l-count"></span></div></div>' +
      '<div id="l-grid"><div class="grid grid-4">' + UI.skeletonCards(8) + '</div></div>';

    var grid = document.getElementById('l-grid');
    var rows = [];

    function draw() {
      var filtered = filter === 'all' ? rows : rows.filter(function (c) { return c.status === filter; });
      document.getElementById('l-count').textContent = filtered.length + ' course' + (filtered.length === 1 ? '' : 's');
      if (!filtered.length) {
        grid.innerHTML = '<div class="card">' + UI.empty({ icon: 'bookOpen', title: 'Nothing here',
          message: filter === 'all' ? 'You have no assigned learning yet. Your L&D team will assign courses to you.'
            : 'No courses with the status \u201C' + filter + '\u201D.' }) + '</div>';
        return;
      }
      grid.innerHTML = '<div class="grid grid-4">' + filtered.map(courseCard).join('') + '</div>';

      U.$$('[data-continue]', grid).forEach(function (btn) {
        btn.addEventListener('click', function () {
          btn.classList.add('is-loading');
          S.learning.advance(btn.getAttribute('data-continue'), 15).then(function (res) {
            UI.toast(res.progress === 100 ? 'Course completed' : 'Progress saved', {
              type: 'success',
              desc: res.progress === 100 ? 'Well done — your certificate is now available.'
                                         : 'You are now at ' + res.progress + '%.'
            });
            load();
          });
        });
      });
      U.$$('[data-cert]', grid).forEach(function (btn) {
        btn.addEventListener('click', function () {
          certificateDialog(rows.filter(function (c) { return c.id === btn.getAttribute('data-cert'); })[0]);
        });
      });
    }

    function load() {
      return Promise.all([S.learning.myLearning(), S.learning.progress()]).then(function (res) {
        rows = res[0];
        var p = res[1];
        document.getElementById('l-stats').innerHTML =
          stat('Assigned', p.assigned, 'book', '') +
          stat('In progress', p.inProgress, 'play', 'teal') +
          stat('Completed', p.completed, 'checkCircle', 'green') +
          stat('Certificates', p.certificates, 'award', 'amber');
        draw();
      });
    }

    U.$$('[data-filter]', body).forEach(function (btn) {
      btn.addEventListener('click', function () {
        filter = btn.getAttribute('data-filter');
        U.$$('[data-filter]', body).forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        draw();
      });
    });

    UI.async(grid, '<div class="grid grid-4">' + UI.skeletonCards(8) + '</div>', load);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
