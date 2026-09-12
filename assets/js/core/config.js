/* GG Learning Labs — Config, roles, navigation registry */
(function (GGL) {
  'use strict';

  var BASE = document.documentElement.getAttribute('data-base') || './';
  if (BASE.slice(-1) !== '/') BASE += '/';

  GGL.base = BASE;
  GGL.url = function (path) { return BASE + String(path).replace(/^\//, ''); };

  GGL.config = {
    appName: 'GG Learning Labs',
    tagline: 'Learning & Development Platform',
    promise: 'One Platform. Every L&D Need.',
    supportEmail: 'support@gglearninglabs.example',
    version: '1.0.0-prototype'
  };

  GGL.ROLES = { SUPER_ADMIN: 'super_admin', ADMIN: 'admin', END_USER: 'end_user' };

  GGL.roleLabel = function (role) {
    return ({ super_admin: 'Super Admin', admin: 'Administrator', end_user: 'Learner' })[role] || 'User';
  };

  var R = GGL.ROLES;
  var ALL = [R.SUPER_ADMIN, R.ADMIN, R.END_USER];
  var STAFF = [R.SUPER_ADMIN, R.ADMIN];

  GGL.NAV = [
    { group: null, items: [
      { label: 'Dashboard', icon: 'grid', href: 'app/dashboard.html', roles: ALL }
    ]},
    { group: 'Learn', roles: [R.END_USER], items: [
      { label: 'My Learning',       icon: 'bookOpen',      href: 'app/learning.html',      roles: [R.END_USER] },
      { label: 'Training Calendar', icon: 'calendar',      href: 'app/calendar.html',      roles: [R.END_USER] },
      { label: 'Assessments',       icon: 'checkSquare',   href: 'app/assessments.html',   roles: [R.END_USER] },
      { label: 'Certificates',      icon: 'award',         href: 'app/certificates.html',  roles: [R.END_USER] },
      { label: 'Achievements',      icon: 'trophy',        href: 'app/gamification.html',  roles: [R.END_USER] },
      { label: 'Competency',        icon: 'target',        href: 'app/competencies.html',  roles: [R.END_USER] },
      { label: 'Learning Paths',    icon: 'compass',       href: 'app/paths.html',         roles: [R.END_USER] },
      { label: 'Coaching',          icon: 'messageCircle', href: 'app/coaching.html',      roles: [R.END_USER] },
      { label: 'Mentoring',         icon: 'users',         href: 'app/mentoring.html',     roles: [R.END_USER] }
    ]},
    { group: 'Plan & Analyse', roles: STAFF, items: [
      { label: 'TNA / TNI',         icon: 'compass',  href: 'app/tna.html',           roles: STAFF },
      { label: 'Competencies',      icon: 'target',   href: 'app/competencies.html',  roles: STAFF },
      { label: 'Training Calendar', icon: 'calendar', href: 'app/calendar.html',      roles: STAFF }
    ]},
    { group: 'Deliver', roles: STAFF, items: [
      { label: 'Courses',         icon: 'book',      href: 'app/courses.html',    roles: STAFF },
      { label: 'Batches',         icon: 'layers',    href: 'app/batches.html',    roles: STAFF },
      { label: 'Attendance',      icon: 'userCheck', href: 'app/attendance.html', roles: STAFF },
      { label: 'Trainers',        icon: 'briefcase', href: 'app/trainers.html',   roles: STAFF },
      { label: 'Learning Paths',  icon: 'compass',   href: 'app/paths.html',      roles: STAFF },
      { label: 'Content Library', icon: 'folder',    href: 'app/content.html',    roles: STAFF }
    ]},
    { group: 'Measure', roles: STAFF, items: [
      { label: 'Effectiveness',            icon: 'trending',    href: 'app/effectiveness.html',            roles: STAFF },
      { label: 'Trainer Observation',      icon: 'clipboard',   href: 'app/observation.html',              roles: STAFF },
      { label: 'Effectiveness Calculator', icon: 'activity',    href: 'app/effectiveness-calculator.html', roles: STAFF },
      { label: 'Assessments',              icon: 'checkSquare', href: 'app/assessments.html',              roles: STAFF },
      { label: 'Certificates',             icon: 'award',       href: 'app/certificates.html',             roles: STAFF },
      { label: 'Reports',                  icon: 'barChart',    href: 'app/reports.html',                  roles: STAFF }
    ]},
    { group: 'Develop', roles: STAFF, items: [
      { label: 'Gamification', icon: 'trophy',        href: 'app/gamification.html', roles: STAFF },
      { label: 'Coaching',     icon: 'messageCircle', href: 'app/coaching.html',     roles: STAFF },
      { label: 'Mentoring',    icon: 'users',         href: 'app/mentoring.html',    roles: STAFF },
      { label: 'SOPs',         icon: 'fileText',      href: 'app/sops.html',         roles: STAFF }
    ]},
    { group: 'Administration', roles: STAFF, items: [
      { label: 'Users',             icon: 'users',  href: 'app/users.html',    roles: STAFF },
      { label: 'Audit Log',         icon: 'shield', href: 'app/audit.html',    roles: [R.SUPER_ADMIN] },
      { label: 'Platform Settings', icon: 'server', href: 'app/platform.html', roles: [R.SUPER_ADMIN] }
    ]},
    { group: 'Workspace', roles: ALL, items: [
      { label: 'Requests',      icon: 'inbox',     href: 'app/requests.html',      roles: ALL },
      { label: 'Newsfeed',      icon: 'megaphone', href: 'app/newsfeed.html',      roles: ALL },
      { label: 'Notifications', icon: 'bell',      href: 'app/notifications.html', roles: ALL },
      { label: 'Settings',      icon: 'settings',  href: 'app/settings.html',      roles: ALL }
    ]}
  ];

  GGL.navFor = function (role) {
    return GGL.NAV
      .filter(function (g) { return !g.roles || g.roles.indexOf(role) !== -1; })
      .map(function (g) {
        return { group: g.group, items: g.items.filter(function (i) { return i.roles.indexOf(role) !== -1; }) };
      })
      .filter(function (g) { return g.items.length; });
  };

  GGL.SITE_NAV = [
    { label: 'Platform',  href: 'index.html#platform' },
    { label: 'Solutions', href: 'index.html#lifecycle' },
    { label: 'Services',  href: 'index.html#services' },
    { label: 'Resources', href: 'index.html#modules' },
    { label: 'Pricing',   href: 'index.html#pricing' },
    { label: 'About',     href: 'index.html#about' },
    { label: 'Support',   href: 'index.html#support' }
  ];

})(window.GGL = window.GGL || {});
