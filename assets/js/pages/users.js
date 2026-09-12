/* GG Learning Labs — User management */
(function (GGL) {
  'use strict';

  var U = GGL.utils, UI = GGL.ui, S = GGL.services;
  var table = null;
  var currentRole = GGL.ROLES.END_USER;

  var DEPARTMENTS = ['Operations', 'Technology', 'Human Resources', 'Finance', 'Sales',
                     'Customer Support', 'Quality', 'Marketing', 'Compliance', 'Supply Chain'];
  var LOCATIONS = ['Mumbai', 'Bengaluru', 'Pune', 'Hyderabad', 'Gurugram', 'Chennai', 'Remote', 'London', 'Austin'];

  var USER_COLUMNS = [
    { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' },
    { key: 'employeeId', label: 'Employee ID' }, { key: 'title', label: 'Role title' },
    { key: 'department', label: 'Department' }, { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    { label: 'Training status', value: function (r) { return r.trainingStatus || '—'; } },
    { label: 'Progress %', value: function (r) { return r.progress === undefined ? '' : r.progress; } },
    { label: 'Created', value: function (r) { return U.date(r.createdAt); } },
    { label: 'Last login', value: function (r) { return r.lastLogin ? U.date(r.lastLogin) : 'Never'; } }
  ];

  function columnsFor(role) {
    var base = [{ key: 'name', label: 'Name', sortable: true, primary: true,
      render: function (r) { return U.userCell(r.name, r.email); } }];

    if (role === GGL.ROLES.END_USER) {
      return base.concat([
        { key: 'employeeId', label: 'Employee ID', sortable: true, hideBelow: 'md' },
        { key: 'department', label: 'Department', sortable: true, hideBelow: 'lg' },
        { key: 'trainingStatus', label: 'Training', sortable: true, hideBelow: 'md',
          render: function (r) { return U.statusBadge(r.trainingStatus); } },
        { key: 'assignedCourses', label: 'Courses', sortable: true, align: 'right', hideBelow: 'lg',
          render: function (r) { return r.completedCourses + ' / ' + r.assignedCourses; } },
        { key: 'progress', label: 'Progress', sortable: true, width: '150px',
          render: function (r) { return U.progressCell(r.progress); } },
        { key: 'status', label: 'Status', sortable: true,
          render: function (r) { return U.statusBadge(r.status); } }
      ]);
    }
    return base.concat([
      { key: 'title', label: 'Role title', sortable: true, hideBelow: 'md' },
      { key: 'department', label: 'Department', sortable: true, hideBelow: 'lg' },
      { key: 'location', label: 'Location', sortable: true, hideBelow: 'lg' },
      { key: 'createdAt', label: 'Created', sortable: true, hideBelow: 'md',
        render: function (r) { return U.date(r.createdAt); } },
      { key: 'lastLogin', label: 'Last login', sortable: true,
        render: function (r) { return '<span class="text-muted">' + U.relative(r.lastLogin) + '</span>'; } },
      { key: 'status', label: 'Status', sortable: true,
        render: function (r) { return U.statusBadge(r.status); } }
    ]);
  }

  /** Which account types the signed-in user may create. */
  function creatableRoles() {
    var me = S.auth.getUser();
    if (me && me.role === GGL.ROLES.SUPER_ADMIN) {
      return [GGL.ROLES.END_USER, GGL.ROLES.ADMIN, GGL.ROLES.SUPER_ADMIN];
    }
    return [GGL.ROLES.END_USER];
  }

  function userFormHtml(user, role, allowRoleChange) {
    user = user || {};
    var isLearner = role === GGL.ROLES.END_USER;
    var choices = creatableRoles();

    function options(list, selected) {
      return list.map(function (o) {
        return '<option' + (o === selected ? ' selected' : '') + '>' + U.esc(o) + '</option>';
      }).join('');
    }

    var rolePicker = allowRoleChange && choices.length > 1
      ? '<div class="field"><label class="label" for="uf-role">Account type <span class="req">*</span></label>' +
        '<select class="select" id="uf-role" name="role">' +
          choices.map(function (r) {
            return '<option value="' + r + '"' + (r === role ? ' selected' : '') + '>' +
              U.esc(GGL.roleLabel(r)) + '</option>';
          }).join('') + '</select>' +
        '<span class="hint">Super Admins have platform-level access including user and platform settings.</span></div>'
      : '';

    return '<form id="user-form" novalidate>' + rolePicker +
      '<div class="grid grid-2 gap-4">' +
        '<div class="field"><label class="label" for="uf-name">Full name <span class="req">*</span></label>' +
          '<input class="input" id="uf-name" name="name" type="text" value="' + U.esc(user.name || '') + '" autocomplete="name"></div>' +
        '<div class="field"><label class="label" for="uf-email">Email <span class="req">*</span></label>' +
          '<input class="input" id="uf-email" name="email" type="email" value="' + U.esc(user.email || '') + '" autocomplete="email"></div>' +
      '</div>' +
      '<div class="grid grid-2 gap-4">' +
        '<div class="field"><label class="label" for="uf-empid">Employee ID <span class="req">*</span></label>' +
          '<input class="input" id="uf-empid" name="employeeId" type="text" value="' + U.esc(user.employeeId || '') + '" placeholder="IMS-0000"></div>' +
        '<div class="field"><label class="label" for="uf-title">Role title</label>' +
          '<input class="input" id="uf-title" name="title" type="text" value="' + U.esc(user.title || '') + '"></div>' +
      '</div>' +
      '<div class="grid grid-2 gap-4">' +
        '<div class="field"><label class="label" for="uf-dept">Department</label>' +
          '<select class="select" id="uf-dept" name="department">' + options(DEPARTMENTS, user.department) + '</select></div>' +
        '<div class="field"><label class="label" for="uf-loc">Location</label>' +
          '<select class="select" id="uf-loc" name="location">' + options(LOCATIONS, user.location) + '</select></div>' +
      '</div>' +
      '<div class="grid grid-2 gap-4">' +
        '<div class="field"><label class="label" for="uf-status">Status</label>' +
          '<select class="select" id="uf-status" name="status">' + options(['Active', 'Inactive', 'Suspended'], user.status) + '</select></div>' +
        '<div class="field" data-learner-only' + (isLearner ? '' : ' hidden') + '>' +
          '<label class="label" for="uf-courses">Assigned courses</label>' +
          '<input class="input" id="uf-courses" name="assignedCourses" type="number" min="0" max="50" value="' +
          (user.assignedCourses || 0) + '"></div>' +
        '<div class="field" data-staff-only' + (isLearner ? ' hidden' : '') + '>' +
          '<label class="label" for="uf-phone">Phone</label>' +
          '<input class="input" id="uf-phone" name="phone" type="tel" value="' + U.esc(user.phone || '') + '"></div>' +
      '</div>' +
      '<div class="alert mt-2">' + GGL.icon('info', 'ico') + '<div class="text-sm">' +
        'This writes to the prototype\u2019s mock store. No account is created and no email is sent.' +
      '</div></div></form>';
  }

  var FORM_RULES = {
    name: [U.validators.required, U.validators.min(2)],
    email: [U.validators.required, U.validators.email],
    employeeId: [U.validators.required]
  };

  function openCreate(role) {
    var allowed = creatableRoles();
    if (allowed.indexOf(role) === -1) role = allowed[0];

    var handle = UI.modal({
      title: 'Create account',
      subtitle: 'Choose the account type and fill in the details.',
      size: 'lg',
      body: userFormHtml(null, role, true),
      footer: '<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
              '<button type="submit" form="user-form" class="btn btn-primary">' +
              GGL.icon('plus', 'ico') + '<span>Create account</span></button>'
    });

    handle.overlay.querySelector('[data-cancel]').addEventListener('click', handle.close);

    var form = handle.overlay.querySelector('#user-form');
    var rolePicker = form.querySelector('[name="role"]');

    function syncFields() {
      var chosen = rolePicker ? rolePicker.value : role;
      var learner = chosen === GGL.ROLES.END_USER;
      U.$$('[data-learner-only]', form).forEach(function (n) { n.hidden = !learner; });
      U.$$('[data-staff-only]', form).forEach(function (n) { n.hidden = learner; });
      var heading = handle.overlay.querySelector('.modal-head h2');
      if (heading) heading.textContent = 'Create ' + GGL.roleLabel(chosen).toLowerCase();
    }
    if (rolePicker) rolePicker.addEventListener('change', syncFields);
    syncFields();

    UI.handleSubmit(form, FORM_RULES, function (values) {
      var chosen = values.role || role;
      var learner = chosen === GGL.ROLES.END_USER;
      if (creatableRoles().indexOf(chosen) === -1) {
        throw new Error('You do not have permission to create that account type.');
      }
      return S.users.create(Object.assign({}, values, {
        role: chosen, lastLogin: null,
        progress: learner ? 0 : undefined,
        completedCourses: learner ? 0 : undefined,
        trainingStatus: learner ? 'Not Started' : undefined,
        assignedCourses: learner ? (Number(values.assignedCourses) || 0) : undefined
      }));
    }, {
      success: 'Account created',
      successDesc: 'The account is now listed under its role tab.',
      onDone: function (created) {
        handle.close();
        var tab = document.querySelector('[data-role="' + created.role + '"]');
        if (tab && tab.getAttribute('aria-selected') !== 'true') tab.click();
        else table.reload();
      }
    });
  }

  function openEdit(row) {
    var handle = UI.modal({
      title: 'Edit ' + row.name, subtitle: row.email, size: 'lg',
      body: userFormHtml(row, row.role, false),
      footer: '<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
              '<button type="submit" form="user-form" class="btn btn-primary">Save changes</button>'
    });
    handle.overlay.querySelector('[data-cancel]').addEventListener('click', handle.close);
    UI.handleSubmit(handle.overlay.querySelector('#user-form'), FORM_RULES, function (values) {
      if (values.assignedCourses !== undefined) values.assignedCourses = Number(values.assignedCourses);
      return S.users.update(row.id, values);
    }, { reset: false, success: 'Changes saved',
      onDone: function () { handle.close(); table.reload(); } });
  }

  function miniStat(label, value) {
    return '<div class="card card-pad" style="padding:var(--sp-3);text-align:center">' +
      '<div class="fw-bold" style="font-size:var(--fs-lg)">' + U.esc(value === undefined ? '—' : value) + '</div>' +
      '<div class="text-xs text-muted">' + U.esc(label) + '</div></div>';
  }

  function openView(row) {
    var isLearner = row.role === GGL.ROLES.END_USER;
    UI.modal({
      title: row.name,
      subtitle: GGL.roleLabel(row.role) + ' · ' + row.email,
      size: 'lg',
      body: '<div class="row gap-4 mb-6">' +
          '<span class="avatar avatar-xl">' + U.esc(U.initials(row.name)) + '</span>' +
          '<div class="grow"><h3 style="margin-bottom:4px">' + U.esc(row.title || '—') + '</h3>' +
          '<p class="text-muted text-sm" style="margin:0">' + U.esc(row.department || '—') + ' · ' +
          U.esc(row.location || '—') + '</p>' +
          '<div class="row gap-2 mt-3">' + U.statusBadge(row.status) +
          (isLearner ? U.statusBadge(row.trainingStatus) : '') + '</div></div></div>' +
        (isLearner ? '<div class="grid grid-4 gap-3 mb-6">' +
            miniStat('Assigned', row.assignedCourses) + miniStat('Completed', row.completedCourses) +
            miniStat('Hours', row.learningHours) + miniStat('Certificates', row.certificates) + '</div>' +
            '<div class="mb-6"><div class="row-between mb-2"><span class="text-sm fw-medium">Overall progress</span>' +
            '<span class="text-sm text-muted">' + row.progress + '%</span></div>' +
            U.progressCell(row.progress) + '</div>' : '') +
        '<dl class="kv">' +
          '<dt>Employee ID</dt><dd>' + U.esc(row.employeeId || '—') + '</dd>' +
          '<dt>Email</dt><dd>' + U.esc(row.email) + '</dd>' +
          '<dt>Phone</dt><dd>' + U.esc(row.phone || '—') + '</dd>' +
          '<dt>Created</dt><dd>' + U.date(row.createdAt, 'long') + '</dd>' +
          '<dt>Last login</dt><dd>' + (row.lastLogin ? U.date(row.lastLogin, 'long') + ', ' + U.time(row.lastLogin) : 'Never') + '</dd>' +
        '</dl>',
      footer: '<button type="button" class="btn btn-secondary" data-close-view>Close</button>' +
              '<button type="button" class="btn btn-primary" data-edit-from-view>Edit account</button>',
      onMount: function (h) {
        h.overlay.querySelector('[data-close-view]').addEventListener('click', h.close);
        h.overlay.querySelector('[data-edit-from-view]').addEventListener('click', function () {
          h.close(); setTimeout(function () { openEdit(row); }, 240);
        });
      }
    });
  }

  function confirmDelete(row) {
    var self = S.auth.getUser();
    if (self && self.id === row.id) {
      UI.toast('You cannot delete your own account', { type: 'warning' });
      return;
    }
    UI.confirm({
      title: 'Delete this account?',
      message: 'This will permanently remove ' + row.name + ' (' + row.email + ') from the platform.',
      detail: row.role !== GGL.ROLES.END_USER
        ? 'This is an administrative account. Any batches or courses they own will need reassigning.' : null,
      confirmLabel: 'Delete account',
      onConfirm: function () {
        return S.users.remove(row.id).then(function () {
          UI.toast('Account deleted', { type: 'success', desc: row.name + ' has been removed.' });
          table.reload();
        });
      }
    });
  }

  function buildTable(container, role) {
    var user = S.auth.getUser();
    /* Only a Super Admin may manage administrative accounts. */
    var canManage = role === GGL.ROLES.END_USER || user.role === GGL.ROLES.SUPER_ADMIN;

    table = GGL.DataTable(container, {
      columns: columnsFor(role),
      searchPlaceholder: 'Search by name, email, ID or department…',
      pageSize: 10, defaultSort: 'name', selectable: true,
      filters: [
        { key: 'status', label: 'Status', options: [
          { value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' },
          { value: 'Suspended', label: 'Suspended' }]},
        { key: 'department', label: 'Department', options: DEPARTMENTS.map(function (d) {
          return { value: d, label: d }; })}
      ],
      bulkActions: [
        { label: 'Deactivate', icon: 'lock',
          onClick: function (ids, api) {
            UI.confirm({
              title: 'Deactivate ' + ids.length + ' account' + (ids.length > 1 ? 's' : '') + '?',
              message: 'Deactivated users cannot sign in until reactivated.',
              confirmLabel: 'Deactivate', tone: 'warning',
              onConfirm: function () {
                return Promise.all(ids.map(function (id) {
                  return S.users.update(id, { status: 'Inactive' });
                })).then(function () {
                  UI.toast(ids.length + ' account(s) deactivated', { type: 'success' });
                  api.clearSelection(); api.reload();
                });
              }
            });
          }},
        { label: 'Export selected', icon: 'download',
          onClick: function (ids, api) {
            var rows = api.selection;
            U.downloadCsv('users-' + U.stamp() + '.csv', USER_COLUMNS, rows);
            UI.toast('Export downloaded', { type: 'success', desc: rows.length + ' users written to CSV.' });
          }}
      ],
      fetch: function (q) { return S.users.listByRole(role, q); },
      onRowClick: openView,
      rowActions: function (row) {
        var actions = [{ label: 'View profile', icon: 'eye', onClick: openView }];
        if (canManage) {
          actions.push({ label: 'Edit account', icon: 'edit', onClick: openEdit });
          actions.push({
            label: row.status === 'Active' ? 'Deactivate' : 'Activate',
            icon: row.status === 'Active' ? 'lock' : 'checkCircle',
            onClick: function (r) {
              var next = r.status === 'Active' ? 'Inactive' : 'Active';
              S.users.update(r.id, { status: next }).then(function () {
                UI.toast('Account ' + next.toLowerCase(), { type: 'success' });
                table.reload();
              });
            }});
          actions.push({ label: 'Delete account', icon: 'trash', tone: 'danger', onClick: confirmDelete });
        }
        return actions;
      },
      empty: {
        icon: 'users', title: 'No accounts yet',
        message: 'Create the first ' + GGL.roleLabel(role).toLowerCase() + ' account to get started.',
        action: 'Create account', onAction: function () { openCreate(role); }
      }
    });
  }

  function statCard(label, value, icon, tone) {
    return '<div class="card stat"><div class="stat-top"><span class="stat-label">' + label + '</span>' +
      '<span class="stat-icon ' + tone + '">' + GGL.icon(icon, 'ico') + '</span></div>' +
      '<div class="stat-value">' + value + '</div></div>';
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }

    if (user.role === GGL.ROLES.END_USER) {
      var body0 = GGL.shell.mount({ active: 'users', title: 'User management',
        breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Users' }] });
      if (body0) {
        body0.innerHTML = '<div class="card"><div class="state">' +
          '<div class="state-icon danger">' + GGL.icon('lock', 'ico') + '</div>' +
          '<h3>You don\u2019t have access to this area</h3>' +
          '<p>User management is available to administrators. If you need an account change, raise a request with your L&amp;D team.</p>' +
          '<a class="btn btn-primary" href="' + GGL.url('app/dashboard.html') + '">Back to dashboard</a></div></div>';
      }
      return;
    }

    var isSuper = user.role === GGL.ROLES.SUPER_ADMIN;

    var body = GGL.shell.mount({
      active: 'users', title: 'User management',
      subtitle: 'Create, edit and manage the accounts on your platform.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Users' }],
      actions: '<button type="button" class="btn btn-secondary" data-export-all>' +
                 GGL.icon('download', 'ico') + '<span>Export</span></button>' +
               '<button type="button" class="btn btn-primary" data-create>' +
                 GGL.icon('userPlus', 'ico') + '<span>Create user</span></button>'
    });
    if (!body) return;

    var tabs = [
      { role: GGL.ROLES.END_USER, label: 'Learners' },
      { role: GGL.ROLES.ADMIN, label: 'Admins' }
    ];
    if (isSuper) tabs.push({ role: GGL.ROLES.SUPER_ADMIN, label: 'Super Admins' });

    body.innerHTML =
      '<div class="grid grid-4 mb-6" id="u-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="tabs mb-5" role="tablist" aria-label="User types">' +
        tabs.map(function (t, i) {
          return '<button type="button" class="tab" role="tab" id="tab-' + t.role + '" ' +
            'aria-controls="panel-users" aria-selected="' + (i === 0) + '" data-role="' + t.role + '">' +
            U.esc(t.label) + '</button>';
        }).join('') + '</div>' +
      '<div id="panel-users" role="tabpanel" aria-labelledby="tab-' + tabs[0].role + '"></div>';

    UI.async(document.getElementById('u-stats'), UI.skeletonCards(4), function () {
      return S.users.stats().then(function (st) {
        document.getElementById('u-stats').innerHTML =
          statCard('Total accounts', U.num(st.total), 'users', '') +
          statCard('Learners', U.num(st.learners), 'graduation', 'teal') +
          statCard('Admins', U.num(st.admins), 'sliders', 'violet') +
          statCard('Active', U.num(st.active), 'checkCircle', 'green');
      });
    });

    var panel = document.getElementById('panel-users');
    var tabButtons = U.$$('[data-role]', body);

    function selectTab(btn) {
      tabButtons.forEach(function (b) {
        b.setAttribute('aria-selected', String(b === btn));
        b.tabIndex = b === btn ? 0 : -1;
      });
      currentRole = btn.getAttribute('data-role');
      buildTable(panel, currentRole);
    }

    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () { selectTab(btn); });
    });

    body.querySelector('[role="tablist"]').addEventListener('keydown', function (e) {
      var i = tabButtons.indexOf(document.activeElement);
      if (i === -1) return;
      var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
      if (next === null) return;
      e.preventDefault();
      var target = tabButtons[(next + tabButtons.length) % tabButtons.length];
      target.focus(); selectTab(target);
    });

    selectTab(tabButtons[0]);

    document.querySelector('[data-create]').addEventListener('click', function () { openCreate(currentRole); });
    document.querySelector('[data-export-all]').addEventListener('click', function () {
      S.users.listByRole(currentRole, { size: 9999 }).then(function (res) {
        U.downloadCsv(GGL.roleLabel(currentRole).toLowerCase().replace(/\s+/g, '-') +
          's-' + U.stamp() + '.csv', USER_COLUMNS, res.all);
        UI.toast('Export downloaded', { type: 'success', desc: res.all.length + ' records written to CSV.' });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
