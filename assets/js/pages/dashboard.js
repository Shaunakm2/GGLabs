/* GG Learning Labs — Dashboard: one page, three role-shaped views */
(function (GGL) {
  'use strict';

  var U = GGL.utils, UI = GGL.ui, C = GGL.charts, S = GGL.services;

  function statCard(label, value, icon, tone, delta, period) {
    return '<div class="card stat"><div class="stat-top">' +
      '<span class="stat-label">' + U.esc(label) + '</span>' +
      '<span class="stat-icon ' + (tone || '') + '">' + GGL.icon(icon, 'ico') + '</span></div>' +
      '<div class="stat-value">' + value + '</div>' +
      (delta !== undefined && delta !== null
        ? '<div class="stat-delta ' + (delta >= 0 ? 'up' : 'down') + '">' +
          GGL.icon(delta >= 0 ? 'arrowUp' : 'arrowDown', 'ico') +
          '<span>' + Math.abs(delta) + '%</span>' +
          '<span class="period">' + U.esc(period || 'vs last month') + '</span></div>' : '') +
      '</div>';
  }

  function card(title, subtitle, body, action) {
    return '<section class="card"><div class="card-head"><div><h3>' + U.esc(title) + '</h3>' +
      (subtitle ? '<p class="sub">' + U.esc(subtitle) + '</p>' : '') + '</div>' +
      (action || '') + '</div><div class="card-body">' + body + '</div></section>';
  }

  function activityList(rows) {
    if (!rows.length) return UI.empty({ icon: 'activity', title: 'No recent activity' });
    return '<ul class="timeline">' + rows.map(function (a) {
      return '<li><span class="dot">' + GGL.icon(a.icon, 'ico') + '</span>' +
        '<span class="body"><strong>' + U.esc(a.actor) + '</strong> ' + U.esc(a.text) + ' ' +
        '<strong>' + U.esc(a.subject) + '</strong>' +
        '<span class="time">' + U.relative(a.at) + '</span></span></li>';
    }).join('') + '</ul>';
  }

  function sessionList(rows, emptyMsg) {
    if (!rows.length) return UI.empty({ icon: 'calendar', title: 'Nothing scheduled', message: emptyMsg });
    return '<ul class="session-list">' + rows.map(function (s) {
      var d = new Date(s.start);
      return '<li><span class="session-date">' +
        '<span class="m">' + d.toLocaleDateString('en-GB', { month: 'short' }) + '</span>' +
        '<span class="d">' + d.getDate() + '</span></span>' +
        '<span class="session-info"><h4 class="truncate">' + U.esc(s.title) + '</h4>' +
        '<span class="meta"><span>' + GGL.icon('clock', 'ico') + U.time(s.start) + '</span>' +
        '<span>' + GGL.icon('user', 'ico') + U.esc(s.trainer) + '</span>' +
        '<span>' + GGL.icon('mapPin', 'ico') + U.esc(s.location) + '</span></span></span>' +
        '<a class="btn btn-sm btn-secondary" href="' + GGL.url('app/calendar.html') + '">' +
        (s.mode === 'Virtual' ? 'Join' : 'View') + '</a></li>';
    }).join('') + '</ul>';
  }

  function renderAdminDashboard(body, user) {
    var isSuper = user.role === GGL.ROLES.SUPER_ADMIN;

    body.innerHTML =
      '<div class="grid grid-4 mb-6" id="d-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="grid grid-4 mb-6" id="d-stats2">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-2-1 mb-6">' +
        '<div id="d-chart-main"><div class="card card-pad"><div class="skel skel-chart"></div></div></div>' +
        '<div id="d-chart-side"><div class="card card-pad"><div class="skel skel-chart"></div></div></div></div>' +
      '<div class="split-1-1 mb-6">' +
        '<div id="d-completion"><div class="card card-pad"><div class="skel skel-chart"></div></div></div>' +
        '<div id="d-dept"><div class="card card-pad"><div class="skel skel-chart"></div></div></div></div>' +
      '<div class="split-1-1 mb-6">' +
        '<div id="d-assessments"><div class="card card-pad"><div class="skel skel-chart"></div></div></div>' +
        '<div id="d-certificates"><div class="card card-pad"><div class="skel skel-chart"></div></div></div></div>' +
      '<div class="split-2-1">' +
        '<div id="d-activity"><div class="card card-pad"><div class="skel skel-row"></div></div></div>' +
        '<div id="d-upcoming"><div class="card card-pad"><div class="skel skel-row"></div></div></div></div>';

    UI.async(document.getElementById('d-stats'), UI.skeletonCards(4), function () {
      return S.reports.platformStats().then(function (st) {
        document.getElementById('d-stats').innerHTML =
          (isSuper ? statCard('Total admins', U.num(st.admins + st.superAdmins), 'shield', '', 8)
                   : statCard('Trainers', U.num(st.trainers), 'briefcase', '', 6)) +
          statCard('Total learners', U.num(st.learners), 'users', 'teal', 12) +
          statCard('Courses', U.num(st.courses), 'book', 'violet', 4) +
          statCard('Active batches', U.num(st.activeBatches), 'layers', 'amber', -3);

        document.getElementById('d-stats2').innerHTML =
          statCard('Training hours', U.num(st.trainingHours), 'clock', '', 9) +
          statCard('Completion rate', st.completionRate + '%', 'checkCircle', 'green', 5) +
          statCard('Effectiveness score', st.effectiveness, 'trending', 'violet', 3) +
          statCard('Learner satisfaction', st.satisfaction + '%', 'star', 'amber', 2);
      });
    });

    UI.async(document.getElementById('d-chart-main'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.reports.series(isSuper ? 'userGrowth' : 'trainingActivity').then(function (series) {
        document.getElementById('d-chart-main').innerHTML = card(
          isSuper ? 'User growth' : 'Training activity',
          isSuper ? 'Platform accounts over the last 12 months' : 'Sessions delivered per month',
          C.line(series, { height: 260, label: isSuper ? 'User growth' : 'Training activity' }),
          '<span class="badge badge-success">Trending up</span>');
      });
    });

    UI.async(document.getElementById('d-chart-side'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.reports.series(isSuper ? 'userDistribution' : 'attendanceSplit').then(function (series) {
        document.getElementById('d-chart-side').innerHTML = card(
          isSuper ? 'User distribution' : 'Attendance split',
          isSuper ? 'Accounts by role' : 'Across completed sessions',
          C.donut(series, { size: 160, stroke: 24,
            centreValue: isSuper ? U.num(U.sum(series, 'value')) : '88%',
            centreLabel: isSuper ? 'accounts' : 'attended',
            label: isSuper ? 'User distribution' : 'Attendance split' }));
      });
    });

    UI.async(document.getElementById('d-completion'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.reports.series('completion').then(function (series) {
        document.getElementById('d-completion').innerHTML = card('Course completion',
          'Rolling completion rate by month',
          C.bar(series, { height: 240, suffix: '%', color: 'var(--viz-2)', label: 'Course completion' }));
      });
    });

    UI.async(document.getElementById('d-dept'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.reports.series('deptCompletion').then(function (series) {
        document.getElementById('d-dept').innerHTML = card('Completion by department',
          'Where the gaps are concentrated',
          C.hbars(series.sort(function (a, b) { return b.value - a.value; }), { suffix: '%' }),
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/reports.html') + '">Reports</a>');
      });
    });

    UI.async(document.getElementById('d-assessments'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.assessments.stats().then(function (st) {
        document.getElementById('d-assessments').innerHTML = card('Assessment activity',
          U.num(st.attempts) + ' attempts across ' + st.published + ' published assessments',
          '<div class="row gap-6 wrap" style="justify-content:center">' +
            C.gauge(st.passRate, { size: 140, caption: 'Pass rate' }) +
            '<div class="grow" style="min-width:200px">' +
              C.hbars([{ label: 'Average score', value: st.avgScore },
                       { label: 'Pass rate', value: st.passRate }], { suffix: '%' }) +
            '</div></div>',
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/assessments.html') + '">Assessments</a>');
      });
    });

    UI.async(document.getElementById('d-certificates'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.certificates.stats().then(function (st) {
        document.getElementById('d-certificates').innerHTML = card('Certification',
          'Issued against passed post-assessments',
          '<div class="grid grid-2 gap-3 mb-4">' +
            [['Valid', st.issued], ['This month', st.thisMonth], ['Holders', st.holders], ['Expired', st.expired]]
              .map(function (x) {
                return '<div class="card card-pad" style="padding:var(--sp-3);text-align:center">' +
                  '<div class="fw-bold" style="font-size:var(--fs-xl)">' + U.num(x[1]) + '</div>' +
                  '<div class="text-xs text-muted">' + x[0] + '</div></div>';
              }).join('') + '</div>' +
          C.donut([
            { label: 'Valid', value: st.issued, color: 'var(--viz-5)' },
            { label: 'Expired', value: st.expired, color: 'var(--viz-3)' },
            { label: 'Revoked', value: st.revoked, color: 'var(--viz-6)' }
          ], { size: 140, stroke: 22, label: 'Certificate status' }),
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/certificates.html') + '">Register</a>');
      });
    });

    UI.async(document.getElementById('d-activity'), '<div class="card card-pad"><div class="skel skel-row"></div></div>', function () {
      return S.reports.activity(7).then(function (rows) {
        document.getElementById('d-activity').innerHTML =
          card('Recent activity', 'Across the platform', activityList(rows));
      });
    });

    UI.async(document.getElementById('d-upcoming'), '<div class="card card-pad"><div class="skel skel-row"></div></div>', function () {
      return S.learning.upcoming(4).then(function (rows) {
        document.getElementById('d-upcoming').innerHTML = card('Upcoming sessions', 'Next four scheduled',
          sessionList(rows, 'No sessions are scheduled in the current window.'),
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/calendar.html') + '">Calendar</a>');
      });
    });
  }

  function renderLearnerDashboard(body, user) {
    body.innerHTML =
      '<div id="d-welcome"></div>' +
      '<div class="grid grid-4 mb-6" id="d-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-2-1 mb-6">' +
        '<div id="d-continue"><div class="card card-pad"><div class="skel skel-row"></div></div></div>' +
        '<div id="d-upcoming"><div class="card card-pad"><div class="skel skel-row"></div></div></div></div>' +
      '<div class="split-1-1 mb-6">' +
        '<div id="d-competency"><div class="card card-pad"><div class="skel skel-chart"></div></div></div>' +
        '<div id="d-gamification"><div class="card card-pad"><div class="skel skel-chart"></div></div></div></div>' +
      '<div id="d-news"></div>';

    UI.async(document.getElementById('d-stats'), UI.skeletonCards(4), function () {
      return S.learning.progress().then(function (p) {
        document.getElementById('d-welcome').innerHTML =
          '<div class="welcome"><h2>' + U.greeting() + ', ' + U.esc(user.name.split(' ')[0]) + '</h2>' +
          '<p>You are ' + p.overall + '% through your assigned learning. ' +
          (p.inProgress ? p.inProgress + ' course' + (p.inProgress > 1 ? 's are' : ' is') + ' in progress.'
                        : 'Nothing is in progress right now.') + '</p>' +
          '<div class="welcome-meta">' +
            '<span class="item"><span class="v">' + p.completed + '/' + p.assigned + '</span><span class="k">Courses completed</span></span>' +
            '<span class="item"><span class="v">' + p.hours + 'h</span><span class="k">Learning hours</span></span>' +
            '<span class="item"><span class="v">' + p.certificates + '</span><span class="k">Certificates</span></span>' +
            '<span class="item"><span class="v">#' + p.rank + '</span><span class="k">Leaderboard rank</span></span>' +
          '</div></div>';

        document.getElementById('d-stats').innerHTML =
          statCard('Overall progress', p.overall + '%', 'activity', '', null) +
          statCard('In progress', p.inProgress, 'bookOpen', 'teal') +
          statCard('Completed', p.completed, 'checkCircle', 'green') +
          statCard('Points earned', U.num(p.points), 'trophy', 'amber');
      });
    });

    function courseCard(c, i) {
      var variant = ['', 'v2', 'v3', 'v4'][i % 4];
      return '<article class="card course-card"><div class="course-thumb ' + variant + '">' +
        '<span class="cat">' + U.esc(c.category) + '</span>' + GGL.icon('bookOpen', 'ico') + '</div>' +
        '<div class="course-body"><h3>' + U.esc(c.title) + '</h3>' +
        '<div class="course-meta">' +
          '<span>' + GGL.icon('user', 'ico') + U.esc(c.instructor.split(' ')[0]) + '</span>' +
          '<span>' + GGL.icon('clock', 'ico') + U.duration(c.durationMins) + '</span>' +
          '<span>' + GGL.icon('layers', 'ico') + c.lessonsDone + '/' + c.lessons + '</span></div>' +
        '<div class="course-foot">' + U.progressCell(c.progress) +
          '<button type="button" class="btn btn-primary btn-sm btn-block mt-3" data-continue="' + c.id + '">' +
          GGL.icon('play', 'ico') + '<span>Continue</span></button></div></div></article>';
    }

    var continueEl = document.getElementById('d-continue');
    var reloadContinue = UI.async(continueEl, '<div class="card card-pad"><div class="skel skel-row"></div></div>', function () {
      return S.learning.continueLearning().then(function (rows) {
        continueEl.innerHTML = card('Continue learning', 'Pick up where you left off',
          rows.length ? '<div class="grid grid-2">' + rows.slice(0, 4).map(courseCard).join('') + '</div>'
            : UI.empty({ icon: 'bookOpen', title: 'Nothing in progress',
                message: 'Start one of your assigned courses to see it here.', action: 'Browse my learning' }),
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/learning.html') + '">View all</a>');

        var browse = continueEl.querySelector('[data-empty-action]');
        if (browse) browse.addEventListener('click', function () {
          window.location.href = GGL.url('app/learning.html');
        });

        U.$$('[data-continue]', continueEl).forEach(function (btn) {
          btn.addEventListener('click', function () {
            btn.classList.add('is-loading');
            S.learning.advance(btn.getAttribute('data-continue'), 12).then(function (res) {
              UI.toast(res.progress === 100 ? 'Course completed' : 'Progress saved', {
                type: 'success',
                desc: res.progress === 100 ? 'Your certificate is now available.' : 'Now at ' + res.progress + '%.'
              });
              reloadContinue();
            });
          });
        });
      });
    });

    UI.async(document.getElementById('d-upcoming'), '<div class="card card-pad"><div class="skel skel-row"></div></div>', function () {
      return S.learning.upcoming(4).then(function (rows) {
        document.getElementById('d-upcoming').innerHTML = card('Upcoming training',
          'Sessions you are booked onto', sessionList(rows, 'You have no upcoming sessions.'),
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/calendar.html') + '">Calendar</a>');
      });
    });

    UI.async(document.getElementById('d-competency'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.competency.profileFor(user.id).then(function (rows) {
        var inner = rows.length
          ? '<ul class="hbars">' + rows.slice(0, 8).map(function (c) {
              var pct = (c.current / c.required) * 100;
              var tone = c.gap === 0 ? 'var(--viz-5)' : c.gap === 1 ? 'var(--viz-3)' : 'var(--viz-6)';
              return '<li><span class="hb-label truncate">' + U.esc(c.competency) + '</span>' +
                '<span class="hb-track"><span class="hb-fill" style="width:' + Math.min(100, pct) +
                '%;background:' + tone + '"></span></span>' +
                '<span class="hb-value">' + c.current + '/' + c.required + '</span></li>';
            }).join('') + '</ul>' +
            '<p class="hint mt-4">Bars show your current level against the level required for your role.</p>'
          : UI.empty({ icon: 'target', title: 'No assessment yet',
              message: 'Your manager will assess your competencies as part of the review cycle.' });
        document.getElementById('d-competency').innerHTML =
          card('Competency profile', 'Current level vs required', inner,
            '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/competencies.html') + '">Detail</a>');
      });
    });

    UI.async(document.getElementById('d-gamification'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return Promise.all([S.gamification.badgesFor(user.id), S.gamification.standing(user.id)])
        .then(function (res) {
          var badges = res[0], p = res[1];
          var inner = '<div class="row gap-4 mb-5 wrap">' +
            '<span class="stat-icon amber" style="width:48px;height:48px">' + GGL.icon('trophy', 'ico') + '</span>' +
            '<div class="grow"><div class="fw-semi">Learning Champion</div>' +
            '<div class="text-sm text-muted">' + U.num(p.points) + ' points · Rank #' + p.rank + ' of ' + p.total + '</div></div>' +
            '<span class="badge badge-accent">' + badges.filter(function (b) { return b.earned; }).length +
              '/' + badges.length + ' badges</span></div>' +
            '<div class="badge-grid">' + badges.map(function (b) {
              return '<div class="badge-tile' + (b.earned ? '' : ' locked') + '">' +
                '<span class="ring">' + GGL.icon(b.earned ? b.icon : 'lock', 'ico') + '</span>' +
                '<div class="nm">' + U.esc(b.name) + '</div>' +
                '<div class="ds">' + U.esc(b.desc) + '</div></div>';
            }).join('') + '</div>';
          document.getElementById('d-gamification').innerHTML =
            card('Achievements', 'Earned through assessments and certificates', inner,
              '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/gamification.html') + '">Leaderboard</a>');
        });
    });

    UI.async(document.getElementById('d-news'), '<div class="card card-pad"><div class="skel skel-row"></div></div>', function () {
      return Promise.all([S.assessments.availableFor(user.id), S.certificates.forUser(user.id)])
        .then(function (res) {
          var open = res[0].filter(function (a) { return !a.taken; });
          var certs = res[1].filter(function (c) { return c.status === 'Issued'; });

          document.getElementById('d-news').innerHTML = '<div class="split-1-1">' +
            card('Assessments waiting for you',
              open.length ? open.length + ' available to take' : 'Nothing outstanding',
              open.length ? '<ul class="session-list">' + open.slice(0, 3).map(function (a) {
                  return '<li><span class="session-date" style="width:44px">' +
                    '<span class="d" style="font-size:var(--fs-base)">' + a.questions.length + '</span></span>' +
                    '<span class="session-info"><h4 class="truncate">' + U.esc(a.title) + '</h4>' +
                    '<span class="meta"><span>' + GGL.icon('target', 'ico') +
                    (a.passMark > 0 ? a.passMark + '% to pass' : 'Not graded') + '</span>' +
                    '<span>' + GGL.icon('clock', 'ico') + a.durationMins + ' min</span></span></span>' +
                    '<a class="btn btn-sm btn-primary" href="' + GGL.url('app/assessments.html') + '">Start</a></li>';
                }).join('') + '</ul>'
                : UI.empty({ icon: 'checkCircle', title: 'All caught up',
                    message: 'You have attempted every assessment available to you.' }),
              '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/assessments.html') + '">View all</a>') +
            card('My certificates', certs.length ? certs.length + ' currently valid' : 'None yet',
              certs.length ? '<ul class="session-list">' + certs.slice(0, 3).map(function (c) {
                  return '<li><span class="session-date" style="width:44px"><span class="m">CERT</span>' +
                    '<span class="d" style="font-size:var(--fs-sm)">' + c.score + '</span></span>' +
                    '<span class="session-info"><h4 class="truncate">' + U.esc(c.course) + '</h4>' +
                    '<span class="meta"><span>' + GGL.icon('file', 'ico') + U.esc(c.serial) + '</span>' +
                    '<span>' + GGL.icon('calendar', 'ico') + U.date(c.issuedAt) + '</span></span></span></li>';
                }).join('') + '</ul>'
                : UI.empty({ icon: 'award', title: 'No certificates yet',
                    message: 'Pass a course post-assessment to earn your first.' }),
              '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/certificates.html') + '">View all</a>') +
          '</div>';
        });
    });
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var isLearner = user.role === GGL.ROLES.END_USER;

    var body = GGL.shell.mount({
      active: 'dashboard',
      title: isLearner ? 'My dashboard' : 'Dashboard',
      subtitle: isLearner ? 'Your learning, training and development at a glance.'
        : user.role === GGL.ROLES.SUPER_ADMIN
          ? 'Platform-wide health across users, learning and effectiveness.'
          : 'Operational view of training delivery and learner progress.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Dashboard' }],
      actions: isLearner
        ? '<a class="btn btn-secondary" href="' + GGL.url('app/calendar.html') + '">' +
            GGL.icon('calendar', 'ico') + '<span>My calendar</span></a>' +
          '<a class="btn btn-primary" href="' + GGL.url('app/learning.html') + '">' +
            GGL.icon('bookOpen', 'ico') + '<span>My learning</span></a>'
        : '<a class="btn btn-secondary" href="' + GGL.url('app/reports.html') + '">' +
            GGL.icon('barChart', 'ico') + '<span>Reports</span></a>' +
          '<a class="btn btn-primary" href="' + GGL.url('app/batches.html') + '">' +
            GGL.icon('plus', 'ico') + '<span>New batch</span></a>'
    });
    if (!body) return;

    if (isLearner) renderLearnerDashboard(body, user);
    else renderAdminDashboard(body, user);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
