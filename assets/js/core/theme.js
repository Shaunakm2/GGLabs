/* GG Learning Labs — Theme manager (light / dark / system) */
(function (GGL) {
  'use strict';

  var KEY = 'ggl.theme';
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function systemTheme() { return mq && mq.matches ? 'dark' : 'light'; }
  function resolved() {
    var pref = stored() || 'system';
    return pref === 'system' ? systemTheme() : pref;
  }

  function syncToggles(theme) {
    var isDark = theme === 'dark';
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-toggle]'), function (btn) {
      btn.innerHTML = GGL.icon(isDark ? 'sun' : 'moon', 'ico');
      btn.setAttribute('aria-label', 'Switch to ' + (isDark ? 'light' : 'dark') + ' mode');
      btn.setAttribute('data-tip', isDark ? 'Light mode' : 'Dark mode');
      btn.setAttribute('aria-pressed', String(isDark));
    });
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0f16' : '#ffffff');
    syncToggles(theme);
    document.dispatchEvent(new CustomEvent('ggl:themechange', { detail: { theme: theme } }));
  }

  var Theme = {
    get preference() { return stored() || 'system'; },
    get current() { return resolved(); },
    set: function (pref) {
      try {
        if (pref === 'system') localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, pref);
      } catch (e) {}
      apply(resolved());
    },
    toggle: function () { Theme.set(resolved() === 'dark' ? 'light' : 'dark'); },
    init: function () {
      apply(resolved());
      document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-theme-toggle]');
        if (btn) { e.preventDefault(); Theme.toggle(); }
      });
      if (mq) {
        var onChange = function () { if (!stored()) apply(systemTheme()); };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else if (mq.addListener) mq.addListener(onChange);
      }
      window.addEventListener('storage', function (e) { if (e.key === KEY) apply(resolved()); });
    }
  };

  GGL.theme = Theme;
})(window.GGL = window.GGL || {});
