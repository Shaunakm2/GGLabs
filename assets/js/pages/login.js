/* GG Learning Labs — Login */
(function (GGL) {
  'use strict';
  var U = GGL.utils, UI = GGL.ui, auth = GGL.services.auth;

  var POINTS = [
    'Plan from evidence — TNA, TNI and competency gaps',
    'Deliver training, batches, attendance and calendars',
    'Measure trainer observation and training effectiveness',
    'Report with an audit trail that holds up'
  ];

  function renderAside() {
    var el = document.getElementById('auth-points');
    if (!el) return;
    el.innerHTML = POINTS.map(function (p) {
      return '<li>' + GGL.icon('checkCircle', 'ico') + '<span>' + U.esc(p) + '</span></li>';
    }).join('');
  }

  function renderDemoAccounts() {
    var el = document.getElementById('demo-list');
    if (!el) return;
    el.innerHTML = GGL.data.demoAccounts.map(function (u) {
      return '<div class="cred-row"><span class="text-sm fw-medium">' + U.esc(GGL.roleLabel(u.role)) + '</span>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-use="' + U.esc(u.email) + '">' +
        '<code>' + U.esc(u.email) + '</code></button></div>';
    }).join('');

    U.$$('[data-use]', el).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var form = document.getElementById('login-form');
        form.elements.email.value = btn.getAttribute('data-use');
        form.elements.password.value = 'demo1234';
        U.$$('.field', form).forEach(function (f) { f.classList.remove('has-error'); });
        form.elements.password.focus();
        UI.toast('Demo account filled in', { type: 'info', desc: 'Press Sign in to continue.', duration: 2600 });
      });
    });
  }

  function showAlert(message) {
    var box = document.getElementById('login-alert');
    box.hidden = false;
    box.innerHTML = '<div class="alert alert-danger">' + GGL.icon('alert', 'ico') +
      '<div>' + U.esc(message) + '</div></div>';
  }

  function createAccountDialog() {
    var handle = UI.modal({
      title: 'Create an account',
      subtitle: 'Self-registration is not enabled in this prototype.',
      size: 'sm',
      body: '<div class="alert alert-warning mb-4">' + GGL.icon('info', 'ico') + '<div class="text-sm">' +
        'Accounts are provisioned by a Super Admin. Use a demo account to explore the platform.</div></div>' +
        '<form id="signup-form" novalidate>' +
          '<div class="field"><label class="label" for="su-name">Full name <span class="req">*</span></label>' +
            '<input class="input" id="su-name" name="name" type="text" autocomplete="name"></div>' +
          '<div class="field"><label class="label" for="su-email">Work email <span class="req">*</span></label>' +
            '<input class="input" id="su-email" name="email" type="email" autocomplete="email"></div>' +
          '<div class="field"><label class="label" for="su-org">Organisation</label>' +
            '<input class="input" id="su-org" name="org" type="text" autocomplete="organization"></div>' +
        '</form>',
      footer: '<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
              '<button type="submit" form="signup-form" class="btn btn-primary">Request access</button>'
    });
    handle.overlay.querySelector('[data-cancel]').addEventListener('click', handle.close);
    UI.handleSubmit(handle.overlay.querySelector('#signup-form'),
      { name: [U.validators.required], email: [U.validators.required, U.validators.email] },
      function () { return U.delay(800); },
      { success: 'Access requested', successDesc: 'Mock submission — an administrator would review this.',
        onDone: handle.close });
  }

  function init() {
    GGL.theme.init();
    renderAside();
    renderDemoAccounts();

    if (auth.isAuthenticated()) { window.location.replace(GGL.url('app/dashboard.html')); return; }

    var form = document.getElementById('login-form');
    UI.handleSubmit(form, {
      email: [U.validators.required, U.validators.email],
      password: [U.validators.required, U.validators.min(6)]
    }, function (values) {
      var box = document.getElementById('login-alert');
      box.hidden = true; box.innerHTML = '';
      return auth.signIn(values.email, values.password);
    }, {
      reset: false, success: 'Signed in', successDesc: 'Taking you to your dashboard…',
      onDone: function () {
        var next = new URLSearchParams(window.location.search).get('next');
        var safe = next && /^[a-z0-9-]+\.html$/i.test(next) ? 'app/' + next : 'app/dashboard.html';
        setTimeout(function () { window.location.href = GGL.url(safe); }, 420);
      },
      onError: function (err) { showAlert(err.message); }
    });

    document.querySelector('[data-create-account]').addEventListener('click', function (e) {
      e.preventDefault(); createAccountDialog();
    });
    form.elements.email.focus();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
