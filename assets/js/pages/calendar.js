/* GG Learning Labs — Training calendar */
(function (GGL) {
  'use strict';
  var U = GGL.utils, UI = GGL.ui, S = GGL.services;
  var DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var state = { view: 'month', cursor: new Date(), sessions: [] };

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function eventTone(s) { return { Classroom: '', Virtual: 'teal', Hybrid: 'violet' }[s.mode] || ''; }

  function monthView() {
    var c = state.cursor;
    var first = new Date(c.getFullYear(), c.getMonth(), 1);
    var start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    var today = new Date(), cells = '';
    for (var i = 0; i < 42; i++) {
      var day = new Date(start);
      day.setDate(start.getDate() + i);
      var events = state.sessions.filter(function (s) { return sameDay(new Date(s.start), day); });
      cells += '<div class="cal-cell' + (day.getMonth() !== c.getMonth() ? ' muted' : '') +
        (sameDay(day, today) ? ' today' : '') + (events.length ? ' has-events' : '') + '">' +
        '<span class="cal-daynum">' + day.getDate() + '</span>' +
        events.slice(0, 3).map(function (e) {
          return '<button type="button" class="cal-event ' + eventTone(e) + '" data-session="' +
            U.esc(e.id) + '" title="' + U.esc(e.title) + '">' + U.time(e.start) + ' ' + U.esc(e.batchName) + '</button>';
        }).join('') +
        (events.length > 3 ? '<span class="cal-more">+' + (events.length - 3) + ' more</span>' : '') + '</div>';
    }
    return '<div class="cal-grid">' + DOW.map(function (d) { return '<div class="cal-dow">' + d + '</div>'; }).join('') + cells + '</div>';
  }

  function weekView() {
    var c = state.cursor;
    var start = new Date(c);
    start.setDate(c.getDate() - ((c.getDay() + 6) % 7));
    var today = new Date(), cells = '';
    for (var i = 0; i < 7; i++) {
      var day = new Date(start);
      day.setDate(start.getDate() + i);
      var events = state.sessions.filter(function (s) { return sameDay(new Date(s.start), day); });
      cells += '<div class="cal-cell' + (sameDay(day, today) ? ' today' : '') + '" style="min-height:240px">' +
        '<span class="cal-daynum">' + day.getDate() + '</span>' +
        (events.length ? events.map(function (e) {
          return '<button type="button" class="cal-event ' + eventTone(e) + '" data-session="' + U.esc(e.id) +
            '" style="white-space:normal;padding:var(--sp-2)"><strong>' + U.time(e.start) + '</strong><br>' +
            U.esc(e.batchName) + '</button>';
        }).join('') : '<span class="cal-more">—</span>') + '</div>';
    }
    return '<div class="cal-grid">' + DOW.map(function (d, i) {
      var day = new Date(start); day.setDate(start.getDate() + i);
      return '<div class="cal-dow">' + d + ' ' + day.getDate() + '</div>';
    }).join('') + cells + '</div>';
  }

  function agendaView() {
    var upcoming = state.sessions.filter(function (s) {
      return new Date(s.start) >= new Date(new Date().setHours(0,0,0,0));
    }).slice(0, 20);
    if (!upcoming.length) {
      return '<div class="card-body">' + UI.empty({ icon: 'calendar', title: 'Nothing scheduled ahead',
        message: 'There are no upcoming sessions in the sample data.' }) + '</div>';
    }
    var grouped = U.groupBy(upcoming, function (s) { return U.date(s.start, 'long'); });
    return '<div class="card-body">' + Object.keys(grouped).map(function (date) {
      return '<h4 class="mb-3 mt-4">' + U.esc(date) + '</h4><ul class="session-list">' +
        grouped[date].map(function (s) {
          return '<li><span class="session-date"><span class="m">' +
            new Date(s.start).toLocaleDateString('en-GB', { month: 'short' }) + '</span>' +
            '<span class="d">' + new Date(s.start).getDate() + '</span></span>' +
            '<span class="session-info"><h4 class="truncate">' + U.esc(s.title) + '</h4>' +
            '<span class="meta"><span>' + GGL.icon('clock','ico') + U.time(s.start) + ' · ' + U.duration(s.durationMins) + '</span>' +
            '<span>' + GGL.icon('user','ico') + U.esc(s.trainer) + '</span>' +
            '<span>' + GGL.icon('mapPin','ico') + U.esc(s.location) + '</span></span></span>' +
            '<button type="button" class="btn btn-sm btn-secondary" data-session="' + U.esc(s.id) + '">View</button></li>';
        }).join('') + '</ul>';
    }).join('') + '</div>';
  }

  function openSession(id) {
    var s = state.sessions.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    UI.modal({
      title: s.title, subtitle: U.date(s.start, 'long') + ' · ' + U.time(s.start), size: 'sm',
      body: '<div class="row gap-2 mb-5 wrap">' + U.statusBadge(s.status === 'Today' ? 'Active' : s.status) +
        '<span class="badge badge-plain">' + U.esc(s.mode) + '</span></div>' +
        '<dl class="kv"><dt>Batch</dt><dd>' + U.esc(s.batchName) + '</dd>' +
          '<dt>Trainer</dt><dd>' + U.esc(s.trainer) + '</dd>' +
          '<dt>Duration</dt><dd>' + U.duration(s.durationMins) + '</dd>' +
          '<dt>Location</dt><dd>' + U.esc(s.location) + '</dd>' +
          '<dt>Trainees</dt><dd>' + s.trainees + '</dd>' +
          (s.attendance !== null && s.attendance !== undefined
            ? '<dt>Attendance</dt><dd>' + s.attendance + '%</dd>' : '') + '</dl>',
      footer: '<button type="button" class="btn btn-ghost" data-reschedule>Reschedule</button>' +
        '<button type="button" class="btn btn-secondary" data-close>Close</button>' +
        (s.mode === 'Virtual' ? '<button type="button" class="btn btn-primary" data-join>Join session</button>'
          : '<a class="btn btn-primary" href="' + GGL.url('app/attendance.html') + '">Attendance</a>'),
      onMount: function (h) {
        h.overlay.querySelector('[data-close]').addEventListener('click', h.close);
        var join = h.overlay.querySelector('[data-join]');
        if (join) join.addEventListener('click', function () {
          UI.toast('Virtual meeting not connected', { type: 'info',
            desc: 'Meeting links are a placeholder in this prototype.' });
        });
        h.overlay.querySelector('[data-reschedule]').addEventListener('click', function () {
          UI.confirm({ title: 'Reschedule this session?',
            message: 'All ' + s.trainees + ' trainees would be notified of the new date and time.',
            tone: 'warning', confirmLabel: 'Reschedule',
            onConfirm: function () {
              return U.delay(600).then(function () {
                UI.toast('Reschedule requested', { type: 'success',
                  desc: 'Date picker is not implemented in this phase.' });
                h.close();
              });
            }});
        });
      }
    });
  }

  function titleFor() {
    var c = state.cursor;
    if (state.view === 'agenda') return 'Upcoming sessions';
    if (state.view === 'week') {
      var start = new Date(c);
      start.setDate(c.getDate() - ((c.getDay() + 6) % 7));
      var end = new Date(start); end.setDate(start.getDate() + 6);
      return U.date(start.toISOString()) + ' – ' + U.date(end.toISOString());
    }
    return MONTHS[c.getMonth()] + ' ' + c.getFullYear();
  }

  function render(container) {
    container.innerHTML = '<div class="card"><div class="cal-head">' +
        '<div class="row gap-2">' +
          '<button type="button" class="btn-icon" data-nav="-1" aria-label="Previous">' + GGL.icon('chevronLeft','ico') + '</button>' +
          '<button type="button" class="btn-icon" data-nav="1" aria-label="Next">' + GGL.icon('chevronRight','ico') + '</button>' +
          '<button type="button" class="btn btn-sm btn-secondary" data-today>Today</button>' +
          '<h2 class="cal-title" style="margin-left:var(--sp-3)">' + U.esc(titleFor()) + '</h2></div>' +
        '<div class="segmented" role="group" aria-label="Calendar view">' +
          ['month','week','agenda'].map(function (v) {
            return '<button type="button" data-cal-view="' + v + '" aria-pressed="' + (state.view === v) + '">' +
              v.charAt(0).toUpperCase() + v.slice(1) + '</button>';
          }).join('') + '</div></div>' +
        (state.view === 'month' ? monthView() : state.view === 'week' ? weekView() : agendaView()) + '</div>' +
      '<div class="row gap-4 mt-4 wrap text-sm text-muted">' +
        '<span class="row gap-2"><i style="width:10px;height:10px;border-radius:3px;background:var(--accent);display:block"></i>Classroom</span>' +
        '<span class="row gap-2"><i style="width:10px;height:10px;border-radius:3px;background:var(--teal-500);display:block"></i>Virtual</span>' +
        '<span class="row gap-2"><i style="width:10px;height:10px;border-radius:3px;background:var(--violet-500);display:block"></i>Hybrid</span></div>';

    U.$$('[data-nav]', container).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dir = Number(btn.getAttribute('data-nav'));
        if (state.view === 'week') state.cursor.setDate(state.cursor.getDate() + dir * 7);
        else state.cursor.setMonth(state.cursor.getMonth() + dir);
        render(container);
      });
    });
    container.querySelector('[data-today]').addEventListener('click', function () {
      state.cursor = new Date(); render(container);
    });
    U.$$('[data-cal-view]', container).forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.view = btn.getAttribute('data-cal-view');
        U.store.set('calendarView', state.view); render(container);
      });
    });
    U.$$('[data-session]', container).forEach(function (btn) {
      btn.addEventListener('click', function () { openSession(btn.getAttribute('data-session')); });
    });
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var isLearner = user.role === GGL.ROLES.END_USER;

    var body = GGL.shell.mount({
      active: 'calendar', title: 'Training calendar',
      subtitle: isLearner ? 'Sessions you are booked onto.' : 'Every scheduled session across batches and trainers.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Calendar' }],
      actions: isLearner ? '' : '<button type="button" class="btn btn-primary" data-schedule>' +
        GGL.icon('plus','ico') + '<span>Schedule session</span></button>'
    });
    if (!body) return;

    state.view = U.store.get('calendarView', 'month');
    body.innerHTML = '<div id="cal-root"><div class="card card-pad"><div class="skel skel-chart" style="height:420px"></div></div></div>';
    var root = document.getElementById('cal-root');

    UI.async(root, '<div class="card card-pad"><div class="skel skel-chart" style="height:420px"></div></div>', function () {
      return S.sessions.all().then(function (rows) { state.sessions = rows; render(root); });
    });

    var schedule = document.querySelector('[data-schedule]');
    if (schedule) schedule.addEventListener('click', function () {
      UI.toast('Session scheduling is limited in this build', { type: 'info',
        desc: 'Create sessions through the batch creation wizard instead.' });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
