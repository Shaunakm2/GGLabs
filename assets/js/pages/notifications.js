/* GG Learning Labs — Notification centre */
(function (GGL) {
  'use strict';
  var U = GGL.utils, UI = GGL.ui, S = GGL.services;
  var filter = 'all';
  var TYPE_LABELS = {
    training_reminder: 'Training reminder', course_assigned: 'Course assignment',
    assessment_due: 'Assessment due', certificate: 'Certificate',
    request_update: 'Request update', announcement: 'Announcement', system: 'System'
  };

  function item(n) {
    return '<article class="notif-item' + (n.read ? '' : ' unread') + '" data-notif="' + U.esc(n.id) + '">' +
      '<span class="ring">' + GGL.icon(n.icon,'ico') + '</span>' +
      '<div class="grow"><div class="nt">' + U.esc(n.title) + '</div>' +
        '<div class="nb">' + U.esc(n.body) + '</div>' +
        '<div class="row gap-2 mt-2"><span class="badge badge-plain">' +
        U.esc(TYPE_LABELS[n.type] || n.type) + '</span>' +
        (n.read ? '' : '<span class="badge badge-accent">Unread</span>') + '</div></div>' +
      '<div class="stack gap-2" style="align-items:flex-end">' +
        '<span class="nw">' + U.relative(n.at) + '</span>' +
        '<button type="button" class="btn-icon btn-sm tooltip" data-toggle-read="' + U.esc(n.id) + '" ' +
          'data-tip="' + (n.read ? 'Mark unread' : 'Mark read') + '" ' +
          'aria-label="' + (n.read ? 'Mark as unread' : 'Mark as read') + '">' +
          GGL.icon(n.read ? 'inbox' : 'check','ico') + '</button></div></article>';
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }

    var body = GGL.shell.mount({
      active: 'notifications', title: 'Notifications',
      subtitle: 'Reminders, assignments and platform updates.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Notifications' }],
      actions: '<button type="button" class="btn btn-secondary" data-mark-all>' +
        GGL.icon('checkSquare','ico') + '<span>Mark all read</span></button>'
    });
    if (!body) return;

    body.innerHTML = '<div class="card mb-5"><div class="toolbar">' +
        '<div class="segmented" role="group" aria-label="Filter notifications">' +
          ['all','unread','read'].map(function (f) {
            return '<button type="button" data-nfilter="' + f + '" aria-pressed="' + (filter === f) + '">' +
              f.charAt(0).toUpperCase() + f.slice(1) + '</button>';
          }).join('') + '</div><div class="grow"></div>' +
        '<span class="text-sm text-muted" id="n-count"></span></div></div>' +
      '<div id="n-list"><div class="card card-pad"><div class="skel skel-row"></div>' +
      '<div class="skel skel-row"></div><div class="skel skel-row"></div></div></div>';

    var list = document.getElementById('n-list');
    var rows = [];

    function draw() {
      var filtered = filter === 'all' ? rows
        : rows.filter(function (n) { return filter === 'unread' ? !n.read : n.read; });
      var unread = rows.filter(function (n) { return !n.read; }).length;
      document.getElementById('n-count').textContent = unread + ' unread of ' + rows.length;

      if (!filtered.length) {
        list.innerHTML = '<div class="card">' + UI.empty({ icon: 'bell',
          title: filter === 'unread' ? 'You are all caught up' : 'Nothing here',
          message: filter === 'unread' ? 'No unread notifications.'
            : 'Notifications will appear here as training is assigned and scheduled.' }) + '</div>';
        return;
      }
      list.innerHTML = '<div class="card">' + filtered.map(item).join('') + '</div>';

      U.$$('[data-toggle-read]', list).forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var id = btn.getAttribute('data-toggle-read');
          var row = rows.filter(function (n) { return n.id === id; })[0];
          S.notifications.update(id, { read: !row.read }).then(function () {
            row.read = !row.read; draw();
          });
        });
      });

      U.$$('[data-notif]', list).forEach(function (el) {
        el.addEventListener('click', function () {
          var row = rows.filter(function (n) { return n.id === el.getAttribute('data-notif'); })[0];
          UI.modal({
            title: row.title,
            subtitle: (TYPE_LABELS[row.type] || row.type) + ' · ' + U.date(row.at, 'long') + ', ' + U.time(row.at),
            size: 'sm',
            body: '<p>' + U.esc(row.body) + '</p>' +
              '<p class="hint">Deep links from notifications are not wired up in this phase.</p>',
            footer: '<button type="button" class="btn btn-secondary" data-close>Close</button>',
            onMount: function (h) {
              h.overlay.querySelector('[data-close]').addEventListener('click', h.close);
              if (!row.read) {
                S.notifications.update(row.id, { read: true }).then(function () { row.read = true; draw(); });
              }
            }
          });
        });
      });
    }

    function load() {
      return S.notifications.all().then(function (res) { rows = res; draw(); });
    }

    U.$$('[data-nfilter]', body).forEach(function (btn) {
      btn.addEventListener('click', function () {
        filter = btn.getAttribute('data-nfilter');
        U.$$('[data-nfilter]', body).forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        draw();
      });
    });

    document.querySelector('[data-mark-all]').addEventListener('click', function () {
      var btn = this;
      btn.classList.add('is-loading');
      S.notifications.markAllRead().then(function () {
        btn.classList.remove('is-loading');
        UI.toast('All notifications marked read', { type: 'success' });
        load();
      });
    });

    UI.async(list, '<div class="card card-pad"><div class="skel skel-row"></div>' +
      '<div class="skel skel-row"></div><div class="skel skel-row"></div></div>', load);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
