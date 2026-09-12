/* GG Learning Labs — Gamification: points, badges, challenges, leaderboard */
(function (GGL) {
  'use strict';
  var U = GGL.utils, UI = GGL.ui, C = GGL.charts, S = GGL.services;

  var LB_COLUMNS = [
    { key: 'rank', label: 'Rank' }, { key: 'name', label: 'Learner' },
    { key: 'employeeId', label: 'Employee ID' }, { key: 'department', label: 'Department' },
    { key: 'points', label: 'Points' }, { key: 'assessments', label: 'Assessments' },
    { key: 'certificates', label: 'Certificates' }, { key: 'badges', label: 'Badges' }
  ];

  function stat(label, value, icon, tone) {
    return '<div class="card stat"><div class="stat-top"><span class="stat-label">' + label + '</span>' +
      '<span class="stat-icon ' + (tone || '') + '">' + GGL.icon(icon,'ico') + '</span></div>' +
      '<div class="stat-value">' + value + '</div></div>';
  }
  function medal(rank) {
    if (rank === 1) return '<span class="rank-medal gold">1</span>';
    if (rank === 2) return '<span class="rank-medal silver">2</span>';
    if (rank === 3) return '<span class="rank-medal bronze">3</span>';
    return '<span class="rank-medal">' + rank + '</span>';
  }
  function badgeGrid(badges) {
    return '<div class="badge-grid">' + badges.map(function (b) {
      return '<div class="badge-tile' + (b.earned ? '' : ' locked') + '" title="' + U.esc(b.desc) + '">' +
        '<span class="ring">' + GGL.icon(b.earned ? b.icon : 'lock','ico') + '</span>' +
        '<div class="nm">' + U.esc(b.name) + '</div>' +
        '<div class="ds">' + U.esc(b.desc) + '</div></div>';
    }).join('') + '</div>';
  }
  function challengeList(challenges) {
    return challenges.map(function (c) {
      return '<div class="card card-pad mb-3"><div class="row gap-3 mb-3">' +
        '<span class="stat-icon ' + (c.complete ? 'green' : 'amber') + '">' + GGL.icon(c.icon,'ico') + '</span>' +
        '<div class="grow"><div class="row-between gap-2"><strong class="text-sm">' + U.esc(c.name) + '</strong>' +
        '<span class="badge ' + (c.complete ? 'badge-success' : 'badge-accent') + '">+' + c.reward + ' pts</span></div>' +
        '<div class="text-xs text-muted">' + U.esc(c.desc) + '</div></div></div>' +
        U.progressCell(c.pct) + '<div class="row-between mt-2">' +
        '<span class="text-xs text-muted">' + c.progress + ' of ' + c.target + '</span>' +
        '<span class="text-xs text-subtle">Ends ' + U.date(c.endsAt) + '</span></div></div>';
    }).join('');
  }

  function openLedger(row) {
    S.gamification.standing(row.userId).then(function (st) {
      UI.modal({
        title: row.name,
        subtitle: 'Rank #' + st.rank + ' of ' + st.total + ' · ' + U.num(st.points) + ' points',
        size: 'lg',
        body: '<div class="grid grid-4 gap-3 mb-5">' +
            [['Points', U.num(st.points)], ['Rank', '#' + st.rank],
             ['Assessments', st.assessments], ['Certificates', st.certificates]].map(function (x) {
              return '<div class="card card-pad" style="padding:var(--sp-3);text-align:center">' +
                '<div class="fw-bold">' + x[1] + '</div>' +
                '<div class="text-xs text-muted">' + x[0] + '</div></div>';
            }).join('') + '</div>' +
          '<h4 class="mb-3">Recent points</h4>' +
          (st.ledger.length ? '<ul class="timeline">' + st.ledger.map(function (p) {
              return '<li><span class="dot">' + GGL.icon('zap','ico') + '</span>' +
                '<span class="body"><strong>+' + p.points + '</strong> ' + U.esc(p.reason) +
                '<span class="time">' + U.relative(p.at) + '</span></span></li>';
            }).join('') + '</ul>'
            : '<p class="text-muted text-sm">No points recorded yet.</p>'),
        footer: '<button type="button" class="btn btn-secondary" data-close>Close</button>',
        onMount: function (h) { h.overlay.querySelector('[data-close]').addEventListener('click', h.close); }
      });
    });
  }

  function leaderboardTable(container, isAdmin, highlightUserId) {
    return GGL.DataTable(container, {
      searchPlaceholder: 'Search the leaderboard…',
      pageSize: 10, defaultSort: 'rank',
      columns: [
        { key: 'rank', label: 'Rank', sortable: true, width: '80px',
          render: function (r) { return medal(r.rank); }},
        { key: 'name', label: 'Learner', sortable: true, primary: true,
          render: function (r) {
            var you = r.userId === highlightUserId ? ' <span class="badge badge-accent">You</span>' : '';
            return '<div class="row gap-3"><span class="avatar avatar-sm">' +
              U.esc(U.initials(r.name)) + '</span><span><span class="fw-medium">' + U.esc(r.name) + '</span>' +
              you + '<div class="text-xs text-muted">' + U.esc(r.department) + '</div></span></div>';
          }},
        { key: 'assessments', label: 'Assessments', sortable: true, align: 'right', hideBelow: 'md',
          render: function (r) { return U.num(r.assessments); }},
        { key: 'certificates', label: 'Certificates', sortable: true, align: 'right', hideBelow: 'md',
          render: function (r) { return U.num(r.certificates); }},
        { key: 'badges', label: 'Badges', sortable: true, align: 'right', hideBelow: 'lg',
          render: function (r) { return r.badges + ' / ' + GGL.data.badgeCatalogue.length; }},
        { key: 'points', label: 'Points', sortable: true, align: 'right',
          render: function (r) { return '<strong>' + U.num(r.points) + '</strong>'; }}
      ],
      filters: [{ key: 'department', label: 'Department',
        options: GGL.seed.DEPTS.map(function (d) { return { value: d, label: d }; })}],
      toolbarExtra: isAdmin ? '<button type="button" class="btn btn-sm btn-secondary" data-export-lb>' +
        GGL.icon('download','ico') + '<span>Export</span></button>' : '',
      fetch: function (q) {
        return S.gamification.leaderboard().then(function (rows) {
          var filtered = rows;
          if (q.filters && q.filters.department && q.filters.department !== 'all') {
            filtered = filtered.filter(function (r) { return r.department === q.filters.department; });
          }
          if (q.search) filtered = U.search(filtered, q.search, ['name','department','employeeId']);
          if (q.sort) filtered = U.sort(filtered, q.sort, q.dir);
          var page = U.paginate(filtered, q.page, q.size);
          page.all = filtered;
          return page;
        });
      },
      onRowClick: openLedger,
      empty: { icon: 'trophy', title: 'No activity yet',
        message: 'Points appear once learners submit assessments.' }
    });
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var isAdmin = user.role !== GGL.ROLES.END_USER;

    var body = GGL.shell.mount({
      active: 'gamification',
      title: isAdmin ? 'Engagement & gamification' : 'My achievements',
      subtitle: isAdmin ? 'Points, badges and the leaderboard — every point traces to a learning event.'
        : 'Your points, badges, challenges and standing against your peers.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Gamification' }],
      actions: '<a class="btn btn-secondary" href="' + GGL.url('app/assessments.html') + '">' +
        GGL.icon('checkSquare','ico') + '<span>Earn points</span></a>'
    });
    if (!body) return;

    body.innerHTML = '<div id="gm-hero"></div>' +
      '<div class="grid grid-4 mb-6" id="gm-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-2-1 mb-6"><div id="gm-leaderboard"></div>' +
        '<div id="gm-side"><div class="card card-pad"><div class="skel skel-chart"></div></div></div></div>' +
      '<div class="split-1-1">' +
        '<div id="gm-badges"><div class="card card-pad"><div class="skel skel-chart"></div></div></div>' +
        '<div id="gm-challenges"><div class="card card-pad"><div class="skel skel-chart"></div></div></div></div>';

    UI.async(document.getElementById('gm-stats'), UI.skeletonCards(4), function () {
      return Promise.all([S.gamification.standing(user.id), S.gamification.leaderboard(),
        S.gamification.badgesFor(user.id)]).then(function (res) {
        var me = res[0], board = res[1], badges = res[2];
        var earned = badges.filter(function (b) { return b.earned; }).length;

        if (isAdmin) {
          document.getElementById('gm-stats').innerHTML =
            stat('Participants', U.num(board.length), 'users', '') +
            stat('Points awarded', U.num(U.sum(board, 'points')), 'zap', 'amber') +
            stat('Certificates earned', U.num(U.sum(board, 'certificates')), 'award', 'green') +
            stat('Assessments taken', U.num(U.sum(board, 'assessments')), 'checkSquare', 'teal');
        } else {
          document.getElementById('gm-hero').innerHTML =
            '<div class="welcome"><h2>You are ranked #' + me.rank + ' of ' + me.total + '</h2>' +
            '<p>' + (me.percentile >= 75
              ? 'That puts you in the top ' + (100 - me.percentile + 1) + '% of learners. Strong work.'
              : 'Submit assessments and earn certificates to climb the board.') + '</p>' +
            '<div class="welcome-meta">' +
              '<span class="item"><span class="v">' + U.num(me.points) + '</span><span class="k">Points</span></span>' +
              '<span class="item"><span class="v">' + earned + '/' + badges.length + '</span><span class="k">Badges</span></span>' +
              '<span class="item"><span class="v">' + me.certificates + '</span><span class="k">Certificates</span></span>' +
              '<span class="item"><span class="v">' + me.assessments + '</span><span class="k">Assessments</span></span>' +
            '</div></div>';
          document.getElementById('gm-stats').innerHTML =
            stat('My points', U.num(me.points), 'zap', 'amber') +
            stat('My rank', '#' + me.rank, 'trophy', '') +
            stat('Badges earned', earned + ' / ' + badges.length, 'star', 'violet') +
            stat('Percentile', me.percentile + 'th', 'trending', 'green');
        }
      });
    });

    leaderboardTable(document.getElementById('gm-leaderboard'), isAdmin, user.id);

    var exportBtn = document.querySelector('[data-export-lb]');
    if (exportBtn) exportBtn.addEventListener('click', function () {
      S.gamification.leaderboard().then(function (rows) {
        U.downloadCsv('leaderboard-' + U.stamp() + '.csv', LB_COLUMNS, rows);
        UI.toast('Export downloaded', { type: 'success', desc: rows.length + ' rows written to CSV.' });
      });
    });

    UI.async(document.getElementById('gm-side'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      if (isAdmin) {
        return S.gamification.breakdown().then(function (rows) {
          document.getElementById('gm-side').innerHTML =
            '<div class="card"><div class="card-head"><div><h3>Points by source</h3>' +
            '<p class="sub">What learners are being rewarded for</p></div></div><div class="card-body">' +
            C.donut(rows, { size: 160, stroke: 24, label: 'Points by source' }) + '</div></div>';
        });
      }
      return S.gamification.standing(user.id).then(function (st) {
        document.getElementById('gm-side').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>Recent points</h3>' +
          '<p class="sub">Your latest activity</p></div></div><div class="card-body">' +
          (st.ledger.length ? '<ul class="timeline">' + st.ledger.slice(0, 8).map(function (p) {
              return '<li><span class="dot">' + GGL.icon('zap','ico') + '</span>' +
                '<span class="body"><strong>+' + p.points + '</strong> ' + U.esc(p.reason) +
                '<span class="time">' + U.relative(p.at) + '</span></span></li>';
            }).join('') + '</ul>'
            : UI.empty({ icon: 'zap', title: 'No points yet', message: 'Submit an assessment to get started.' })) +
          '</div></div>';
      });
    });

    UI.async(document.getElementById('gm-badges'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.gamification.badgesFor(user.id).then(function (badges) {
        var earned = badges.filter(function (b) { return b.earned; }).length;
        document.getElementById('gm-badges').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>' +
          (isAdmin ? 'Badge catalogue' : 'My badges') + '</h3><p class="sub">' +
          (isAdmin ? 'Criteria are evaluated against real activity' : earned + ' of ' + badges.length + ' earned') +
          '</p></div><span class="badge badge-accent">' + earned + '/' + badges.length + '</span></div>' +
          '<div class="card-body">' + badgeGrid(badges) +
          (isAdmin ? '<p class="hint mt-4">Shown against your own account. Open any leaderboard row to see an individual ledger.</p>' : '') +
          '</div></div>';
      });
    });

    UI.async(document.getElementById('gm-challenges'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.gamification.challengesFor(user.id).then(function (rows) {
        document.getElementById('gm-challenges').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>Active challenges</h3>' +
          '<p class="sub">Time-bound goals with bonus points</p></div></div><div class="card-body">' +
          challengeList(rows) +
          '<p class="hint">Challenge progress is derived from your assessment and certificate activity.</p>' +
          '</div></div>';
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
