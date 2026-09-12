/* ==========================================================================
   GG Learning Labs — Mock authentication
   ⚠ PROTOTYPE ONLY. No password verification, no token signing, no server.
     Every check here is cosmetic and trivially bypassable from the console —
     by design, so nothing is mistaken for a real control.
   ========================================================================== */
(function (GGL) {
  'use strict';

  var U = GGL.utils;
  var SESSION_KEY = 'session';
  var MIN_PASSWORD = 6;

  var authService = {
    getSession: function () {
      var s = U.store.get(SESSION_KEY, null);
      if (!s || !s.userId) return null;
      var user = GGL.data.users.filter(function (u) { return u.id === s.userId; })[0];
      return user ? { user: user, signedInAt: s.signedInAt } : null;
    },
    getUser: function () {
      var s = authService.getSession();
      return s ? s.user : null;
    },
    isAuthenticated: function () { return !!authService.getSession(); },

    signIn: function (email, password) {
      return U.delay(650).then(function () {
        var addr = String(email || '').trim().toLowerCase();
        if (!addr) throw new Error('Enter your email address.');
        if (!password || password.length < MIN_PASSWORD) {
          throw new Error('Password must be at least ' + MIN_PASSWORD + ' characters.');
        }
        var user = GGL.data.users.filter(function (u) { return u.email.toLowerCase() === addr; })[0];
        if (!user) throw new Error('No account found for that email. Try one of the demo accounts below.');
        if (user.status !== 'Active') {
          throw new Error('This account is ' + user.status.toLowerCase() + '. Contact your administrator.');
        }
        U.store.set(SESSION_KEY, { userId: user.id, signedInAt: new Date().toISOString() });
        return { user: user };
      });
    },

    signOut: function () {
      return U.delay(200).then(function () { U.store.remove(SESSION_KEY); return true; });
    },

    requestPasswordReset: function (email) {
      return U.delay(700).then(function () {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim())) {
          throw new Error('Enter a valid email address.');
        }
        return { sent: true };
      });
    },

    hasRole: function (roles) {
      var u = authService.getUser();
      if (!u) return false;
      return [].concat(roles).indexOf(u.role) !== -1;
    },
    isAdminLevel: function () {
      return authService.hasRole([GGL.ROLES.SUPER_ADMIN, GGL.ROLES.ADMIN]);
    },

    requireAuth: function () {
      var user = authService.getUser();
      if (!user) {
        var target = window.location.pathname.split('/').pop() || '';
        window.location.replace(GGL.url('login.html') + (target ? '?next=' + encodeURIComponent(target) : ''));
        return null;
      }
      return user;
    },

    switchRole: function (role) {
      return U.delay(280).then(function () {
        var user = GGL.data.demoAccounts.filter(function (u) { return u.role === role; })[0];
        if (!user) throw new Error('No demo account for that role.');
        U.store.set(SESSION_KEY, { userId: user.id, signedInAt: new Date().toISOString() });
        return { user: user };
      });
    }
  };

  GGL.services = GGL.services || {};
  GGL.services.auth = authService;
})(window.GGL = window.GGL || {});
