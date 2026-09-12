/* GG Learning Labs — Profile & settings */
(function (GGL) {
  'use strict';
  var U = GGL.utils, UI = GGL.ui, S = GGL.services;

  function profilePanel(user) {
    return '<div class="card"><div class="card-head"><div><h3>Profile</h3>' +
      '<p class="sub">How you appear across the platform</p></div></div><div class="card-body">' +
      '<div class="row gap-4 mb-6 wrap">' +
        '<span class="avatar avatar-xl">' + U.esc(U.initials(user.name)) + '</span>' +
        '<div><button type="button" class="btn btn-secondary btn-sm" data-upload-photo>' +
        GGL.icon('upload','ico') + '<span>Upload photo</span></button>' +
        '<p class="hint mt-2" style="margin:0">JPG or PNG, up to 2 MB. Upload is not implemented in this phase.</p></div></div>' +
      '<form id="profile-form" novalidate><div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="pf-name">Full name <span class="req">*</span></label>' +
            '<input class="input" id="pf-name" name="name" value="' + U.esc(user.name) + '"></div>' +
          '<div class="field"><label class="label" for="pf-email">Email <span class="req">*</span></label>' +
            '<input class="input" id="pf-email" name="email" type="email" value="' + U.esc(user.email) + '"></div></div>' +
        '<div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="pf-title">Role title</label>' +
            '<input class="input" id="pf-title" name="title" value="' + U.esc(user.title || '') + '"></div>' +
          '<div class="field"><label class="label" for="pf-phone">Phone</label>' +
            '<input class="input" id="pf-phone" name="phone" type="tel" value="' + U.esc(user.phone || '') + '"></div></div>' +
        '<div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="pf-dept">Department</label>' +
            '<input class="input" id="pf-dept" name="department" value="' + U.esc(user.department || '') + '" readonly></div>' +
          '<div class="field"><label class="label" for="pf-loc">Location</label>' +
            '<input class="input" id="pf-loc" name="location" value="' + U.esc(user.location || '') + '"></div></div>' +
        '<div class="row gap-3 mt-4"><button type="submit" class="btn btn-primary">Save changes</button>' +
        '<button type="reset" class="btn btn-ghost">Reset</button></div></form></div></div>';
  }

  function appearancePanel() {
    var pref = GGL.theme.preference;
    return '<div class="card"><div class="card-head"><div><h3>Appearance</h3>' +
      '<p class="sub">Theme applies immediately and is remembered on this device</p></div></div>' +
      '<div class="card-body"><div class="field"><span class="label">Theme</span>' +
        '<div class="segmented" role="group" aria-label="Theme preference">' +
          [['light','Light'],['dark','Dark'],['system','System']].map(function (t) {
            return '<button type="button" data-theme-pref="' + t[0] + '" aria-pressed="' + (pref === t[0]) + '">' +
              t[1] + '</button>';
          }).join('') + '</div>' +
        '<span class="hint">\u201CSystem\u201D follows your operating system setting.</span></div>' +
      '<div class="alert mt-4">' + GGL.icon('info','ico') + '<div class="text-sm">' +
        'Light and dark logo variants swap automatically once brand assets are added — ' +
        'the CSS hooks are already in place.</div></div></div></div>';
  }

  function notificationsPanel() {
    var prefs = U.store.get('notifPrefs', { training: true, assignments: true, assessments: true,
      certificates: true, announcements: false, digest: true });
    var ROWS = [
      ['training','Training reminders','Before sessions you are booked onto'],
      ['assignments','Course assignments','When new learning is assigned to you'],
      ['assessments','Assessment deadlines','When an assessment is due or overdue'],
      ['certificates','Certificates issued','When you complete a course'],
      ['announcements','Announcements','Platform-wide news and updates'],
      ['digest','Weekly digest','A summary email every Monday morning']
    ];
    return '<div class="card"><div class="card-head"><div><h3>Notification preferences</h3>' +
      '<p class="sub">Choose what you are told about</p></div></div><div class="card-body">' +
      ROWS.map(function (r) {
        return '<div class="criteria-row"><div><div class="c-label">' + U.esc(r[1]) + '</div>' +
          '<div class="c-desc">' + U.esc(r[2]) + '</div></div>' +
          '<label class="switch"><input type="checkbox" data-notif-pref="' + r[0] + '"' +
            (prefs[r[0]] ? ' checked' : '') + '><span class="track"></span>' +
          '<span class="sr-only">' + U.esc(r[1]) + '</span></label></div>';
      }).join('') +
      '<p class="hint mt-4">Email delivery is not connected in this phase — preferences are stored locally.</p>' +
      '</div></div>';
  }

  function securityPanel() {
    return '<div class="card"><div class="card-head"><div><h3>Password</h3>' +
      '<p class="sub">Prototype only — no password is stored or verified</p></div></div><div class="card-body">' +
      '<div class="alert alert-warning mb-5">' + GGL.icon('alert','ico') + '<div class="text-sm">' +
        '<strong>This is not a real security control.</strong> Authentication in this build is mocked. ' +
        'Password management will be handled by the identity provider in a later phase.</div></div>' +
      '<form id="password-form" novalidate>' +
        '<div class="field"><label class="label" for="sf-current">Current password <span class="req">*</span></label>' +
          '<input class="input" id="sf-current" name="current" type="password" autocomplete="current-password"></div>' +
        '<div class="field"><label class="label" for="sf-new">New password <span class="req">*</span></label>' +
          '<input class="input" id="sf-new" name="password" type="password" autocomplete="new-password">' +
          '<span class="hint">At least 8 characters.</span></div>' +
        '<div class="field"><label class="label" for="sf-confirm">Confirm new password <span class="req">*</span></label>' +
          '<input class="input" id="sf-confirm" name="confirm" type="password" autocomplete="new-password"></div>' +
        '<button type="submit" class="btn btn-primary">Update password</button></form></div></div>' +
      '<div class="card mt-5"><div class="card-head"><div><h3>Prototype data</h3>' +
      '<p class="sub">Everything you create is stored in this browser only</p></div></div><div class="card-body">' +
        '<p class="text-sm text-muted">Records you add, edit or delete are kept in local storage so the ' +
        'prototype survives a refresh. Resetting restores the original sample data.</p>' +
        '<button type="button" class="btn btn-danger-ghost" data-reset-data>' +
          GGL.icon('refresh','ico') + '<span>Reset prototype data</span></button></div></div>';
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }

    var body = GGL.shell.mount({
      active: 'settings', title: 'Settings',
      subtitle: 'Your profile, appearance, notifications and account.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Settings' }]
    });
    if (!body) return;

    var TABS = ['Profile','Appearance','Notifications','Account'];
    body.innerHTML = '<div class="tabs mb-5" role="tablist" aria-label="Settings sections">' +
        TABS.map(function (t, i) {
          return '<button type="button" class="tab" role="tab" id="st-t' + i + '" ' +
            'aria-controls="st-p' + i + '" aria-selected="' + (i === 0) + '">' + t + '</button>';
        }).join('') + '</div>' +
      '<div id="st-p0" role="tabpanel" aria-labelledby="st-t0">' + profilePanel(user) + '</div>' +
      '<div id="st-p1" role="tabpanel" aria-labelledby="st-t1" hidden>' + appearancePanel() + '</div>' +
      '<div id="st-p2" role="tabpanel" aria-labelledby="st-t2" hidden>' + notificationsPanel() + '</div>' +
      '<div id="st-p3" role="tabpanel" aria-labelledby="st-t3" hidden>' + securityPanel() + '</div>';

    UI.initTabs(body);

    UI.handleSubmit(document.getElementById('profile-form'), {
      name: [U.validators.required, U.validators.min(2)],
      email: [U.validators.required, U.validators.email]
    }, function (values) {
      return S.users.update(user.id, { name: values.name, email: values.email,
        title: values.title, phone: values.phone, location: values.location });
    }, { reset: false, success: 'Profile updated',
      successDesc: 'Reload to see the change reflected in the sidebar.' });

    document.querySelector('[data-upload-photo]').addEventListener('click', function () {
      UI.toast('Upload not available', { type: 'info', desc: 'File storage is planned for a later phase.' });
    });

    U.$$('[data-theme-pref]', body).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pref = btn.getAttribute('data-theme-pref');
        GGL.theme.set(pref);
        U.$$('[data-theme-pref]', body).forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        UI.toast('Theme set to ' + pref, { type: 'success', duration: 1800 });
      });
    });

    U.$$('[data-notif-pref]', body).forEach(function (input) {
      input.addEventListener('change', function () {
        var prefs = U.store.get('notifPrefs', {});
        prefs[input.getAttribute('data-notif-pref')] = input.checked;
        U.store.set('notifPrefs', prefs);
        UI.toast('Preference saved', { type: 'success', duration: 1500 });
      });
    });

    UI.handleSubmit(document.getElementById('password-form'), {
      current: [U.validators.required],
      password: [U.validators.required, U.validators.min(8)],
      confirm: [U.validators.required, U.validators.match('password', 'Passwords')]
    }, function () { return U.delay(700); },
      { success: 'Password updated', successDesc: 'Mock action — no password was changed.' });

    document.querySelector('[data-reset-data]').addEventListener('click', function () {
      UI.confirm({ title: 'Reset prototype data?',
        message: 'All records you have created, edited or deleted will be discarded and the original sample data restored.',
        detail: 'Your theme and notification preferences are kept.',
        confirmLabel: 'Reset data',
        onConfirm: function () {
          return U.delay(500).then(function () {
            GGL.resetPrototypeData();
            UI.toast('Prototype data reset', { type: 'success', desc: 'Reloading…' });
            setTimeout(function () { window.location.reload(); }, 900);
          });
        }});
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
