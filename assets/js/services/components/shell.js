/* GG Learning Labs — App shell: one shell, role-shaped navigation */
(function (GGL) {
  'use strict';

  var U = GGL.utils;
  var UI = GGL.ui;
  var Shell = {};

  function logoMarkup() {
    return '<a class="logo" href="' + GGL.url('index.html') + '" aria-label="' + GGL.config.appName + ' home">' +
             '<span class="logo-mark" aria-hidden="true">GG</span>' +
             '<span class="logo-text"><span class="name">GG Learning Labs</span>' +
             '<span class="tag">L&amp;D Platform</span></span></a>';
  }
  Shell.logo = logoMarkup;

  function renderSidebar(user, activeKey) {
    var groups = GGL.navFor(user.role);
    var unread = GGL.services.notifications.unreadCount();

    var nav = groups.map(function (g) {
      var items = g.items.map(function (item) {
        var isActive = item.href && (item.href.indexOf(activeKey) !== -1);
        var badge = '';
        if (item.soon) badge = '<span class="nav-badge">Soon</span>';
        else if (item.label === 'Notifications' && unread) badge = '<span class="nav-badge count">' + unread + '</span>';

        if (item.soon) {
          return '<span class="nav-item is-soon" role="link" aria-disabled="true" ' +
                 'title="This module is planned for a later phase">' + GGL.icon(item.icon, 'ico') +
                 '<span class="label">' + U.esc(item.label) + '</span>' + badge + '</span>';
        }
        return '<a class="nav-item' + (isActive ? ' active' : '') + '" href="' + GGL.url(item.href) + '"' +
               (isActive ? ' aria-current="page"' : '') + '>' + GGL.icon(item.icon, 'ico') +
               '<span class="label">' + U.esc(item.label) + '</span>' + badge + '</a>';
      }).join('');

      return '<div class="nav-group">' +
        (g.group ? '<div class="nav-group-label">' + U.esc(g.group) + '</div>' : '') + items + '</div>';
    }).join('');

    return '<aside class="app-sidebar" id="app-sidebar" aria-label="Main navigation">' +
      '<div class="sidebar-head">' + logoMarkup() +
        '<button type="button" class="btn-icon sidebar-toggle" data-sidebar-close aria-label="Close navigation">' +
          GGL.icon('close', 'ico') + '</button></div>' +
      '<nav class="sidebar-nav">' + nav + '</nav>' +
      '<div class="sidebar-foot"><div class="dropdown" data-dropdown style="width:100%">' +
          '<button type="button" class="sidebar-user" data-dropdown-trigger aria-expanded="false" aria-haspopup="true">' +
            '<span class="avatar">' + U.esc(U.initials(user.name)) + '</span>' +
            '<span class="meta"><span class="name truncate">' + U.esc(user.name) + '</span>' +
            '<span class="role truncate">' + U.esc(GGL.roleLabel(user.role)) + '</span></span>' +
            GGL.icon('chevronUp', 'ico') + '</button>' +
          '<div class="menu menu-left" style="bottom:calc(100% + 6px);top:auto;left:0;right:0">' +
            '<a class="menu-item" href="' + GGL.url('app/settings.html') + '">' +
              GGL.icon('user', 'ico') + '<span>Profile &amp; settings</span></a>' +
            '<a class="menu-item" href="' + GGL.url('app/notifications.html') + '">' +
              GGL.icon('bell', 'ico') + '<span>Notifications</span></a>' +
            '<div class="menu-sep"></div><div class="menu-label">Demo persona</div>' +
            roleSwitchItems(user.role) +
            '<div class="menu-sep"></div>' +
            '<button type="button" class="menu-item danger" data-signout>' +
              GGL.icon('logout', 'ico') + '<span>Sign out</span></button>' +
          '</div></div></div></aside>' +
      '<div class="sidebar-scrim" data-sidebar-close hidden></div>';
  }

  function roleSwitchItems(current) {
    return [GGL.ROLES.SUPER_ADMIN, GGL.ROLES.ADMIN, GGL.ROLES.END_USER].map(function (r) {
      var on = r === current;
      return '<button type="button" class="menu-item" data-switch-role="' + r + '"' +
             (on ? ' aria-current="true"' : '') + '>' +
             GGL.icon(r === GGL.ROLES.SUPER_ADMIN ? 'shield' : r === GGL.ROLES.ADMIN ? 'sliders' : 'user', 'ico') +
             '<span>' + GGL.roleLabel(r) + '</span>' + (on ? GGL.icon('check', 'ico') : '') + '</button>';
    }).join('');
  }

  function renderTopbar(user) {
    var unread = GGL.services.notifications.unreadCount();
    return '<header class="app-topbar">' +
      '<button type="button" class="btn-icon sidebar-toggle" data-sidebar-open aria-label="Open navigation" aria-expanded="false">' +
        GGL.icon('menu', 'ico') + '</button>' +
      '<div class="topbar-search"><label class="input-icon">' +
        '<span class="sr-only">Search the platform</span>' + GGL.icon('search', 'ico') +
        '<input type="search" class="input" placeholder="Search courses, batches, people…" data-global-search>' +
      '</label></div>' +
      '<div class="topbar-actions">' +
        '<button type="button" class="btn-icon tooltip" data-theme-toggle data-tip="Theme"></button>' +
        '<a class="btn-icon notif-btn tooltip" href="' + GGL.url('app/notifications.html') + '" ' +
          'data-tip="Notifications" aria-label="Notifications' + (unread ? ', ' + unread + ' unread' : '') + '">' +
          GGL.icon('bell', 'ico') +
          (unread ? '<span class="notif-dot">' + (unread > 9 ? '9+' : unread) + '</span>' : '') + '</a>' +
        '<div class="dropdown" data-dropdown>' +
          '<button type="button" class="btn-icon" data-dropdown-trigger aria-expanded="false" ' +
            'aria-haspopup="true" aria-label="Account menu">' +
            '<span class="avatar avatar-sm">' + U.esc(U.initials(user.name)) + '</span></button>' +
          '<div class="menu"><div class="menu-label">' + U.esc(user.email) + '</div>' +
            '<a class="menu-item" href="' + GGL.url('app/settings.html') + '">' +
              GGL.icon('settings', 'ico') + '<span>Settings</span></a>' +
            '<a class="menu-item" href="' + GGL.url('index.html') + '">' +
              GGL.icon('globe', 'ico') + '<span>Public site</span></a>' +
            '<div class="menu-sep"></div>' +
            '<button type="button" class="menu-item danger" data-signout>' +
              GGL.icon('logout', 'ico') + '<span>Sign out</span></button>' +
          '</div></div></div></header>';
  }

  Shell.pageHead = function (opts) {
    opts = opts || {};
    var crumbs = (opts.breadcrumbs || []).map(function (c, i, arr) {
      var last = i === arr.length - 1;
      return last
        ? '<span class="current" aria-current="page">' + U.esc(c.label) + '</span>'
        : '<a href="' + (c.href ? GGL.url(c.href) : '#') + '">' + U.esc(c.label) + '</a>' +
          '<span class="sep" aria-hidden="true">/</span>';
    }).join('');

    return (crumbs ? '<nav class="breadcrumbs" aria-label="Breadcrumb">' + crumbs + '</nav>' : '') +
      '<div class="page-head"><div><h1>' + U.esc(opts.title || '') + '</h1>' +
      (opts.subtitle ? '<p class="page-sub">' + U.esc(opts.subtitle) + '</p>' : '') + '</div>' +
      (opts.actions ? '<div class="page-head-actions">' + opts.actions + '</div>' : '') + '</div>';
  };

  Shell.mount = function (opts) {
    opts = opts || {};
    var user = GGL.services.auth.requireAuth();
    if (!user) return null;

    var root = document.getElementById('app-root') || document.body;
    root.insertAdjacentHTML('afterbegin',
      '<a class="skip-link" href="#main-content">Skip to main content</a>' +
      renderSidebar(user, opts.active || 'dashboard') +
      '<div class="app-main">' + renderTopbar(user) +
        '<main class="app-content" id="main-content" tabindex="-1">' +
          Shell.pageHead(opts) + '<div id="page-body"></div>' +
        '</main></div>');

    bindShell();
    UI.initDropdowns();
    GGL.theme.init();

    document.title = (opts.title ? opts.title + ' · ' : '') + GGL.config.appName;
    return document.getElementById('page-body');
  };

  function bindShell() {
    var sidebar = document.getElementById('app-sidebar');
    var scrim = document.querySelector('.sidebar-scrim');
    var opener = document.querySelector('[data-sidebar-open]');

    function openSidebar() {
      sidebar.classList.add('open');
      scrim.hidden = false;
      requestAnimationFrame(function () { scrim.classList.add('open'); });
      if (opener) opener.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
      sidebar.classList.remove('open');
      scrim.classList.remove('open');
      if (opener) opener.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      setTimeout(function () { scrim.hidden = true; }, 220);
    }

    if (opener) opener.addEventListener('click', openSidebar);
    U.$$('[data-sidebar-close]').forEach(function (n) { n.addEventListener('click', closeSidebar); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
    });
    window.addEventListener('resize', U.debounce(function () {
      if (window.innerWidth > 1024 && sidebar.classList.contains('open')) closeSidebar();
    }, 150));

    U.$$('[data-signout]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.confirm({
          title: 'Sign out?',
          message: 'You will be returned to the login page. Prototype data you have entered is kept.',
          confirmLabel: 'Sign out', tone: 'info',
          onConfirm: function () {
            return GGL.services.auth.signOut().then(function () {
              window.location.href = GGL.url('login.html');
            });
          }
        });
      });
    });

    U.$$('[data-switch-role]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var role = btn.getAttribute('data-switch-role');
        if (GGL.services.auth.getUser().role === role) return;
        btn.classList.add('is-loading');
        GGL.services.auth.switchRole(role).then(function () {
          window.location.href = GGL.url('app/dashboard.html');
        });
      });
    });

    var search = document.querySelector('[data-global-search]');
    if (search) {
      search.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var q = search.value.trim();
        if (!q) return;
        window.location.href = GGL.url('app/courses.html') + '?q=' + encodeURIComponent(q);
      });
    }

    U.on(document, 'click', '.nav-item.is-soon', function () {
      UI.toast('Not in this build', { type: 'info',
        desc: 'This module is planned for a later phase. The navigation entry is a placeholder.' });
    });
  }

  GGL.shell = Shell;
})(window.GGL = window.GGL || {});
