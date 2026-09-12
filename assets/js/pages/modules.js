/* ==========================================================================
   GG Learning Labs — Remaining L&D modules

   One file, one shared shape. Each module declares its stats, charts, table and
   detail view; a small runner assembles the page. Keeps eleven screens
   consistent without eleven near-identical files. Each page sets
   window.GGL_MODULE to select its definition.

   TNA/TNI · Competencies · Trainers · Content Library · SOPs · Coaching ·
   Mentoring · Requests · Audit Log · Learning Paths · Platform Settings
   ========================================================================== */
(function (GGL) {
  'use strict';

  var U = GGL.utils, UI = GGL.ui, C = GGL.charts, S = GGL.services;

  function stat(label, value, icon, tone) {
    return '<div class="card stat"><div class="stat-top"><span class="stat-label">' + label + '</span>' +
      '<span class="stat-icon ' + (tone || '') + '">' + GGL.icon(icon, 'ico') + '</span></div>' +
      '<div class="stat-value">' + value + '</div></div>';
  }
  function card(title, sub, bodyHtml, action) {
    return '<div class="card"><div class="card-head"><div><h3>' + U.esc(title) + '</h3>' +
      (sub ? '<p class="sub">' + U.esc(sub) + '</p>' : '') + '</div>' + (action || '') + '</div>' +
      '<div class="card-body">' + bodyHtml + '</div></div>';
  }
  function kv(pairs) {
    return '<dl class="kv">' + pairs.map(function (p) {
      return '<dt>' + U.esc(p[0]) + '</dt><dd>' + (p[2] ? p[1] : U.esc(p[1])) + '</dd>';
    }).join('') + '</dl>';
  }
  function priorityBadge(p) {
    var tone = p === 'Critical' ? 'danger' : p === 'High' ? 'warning' : p === 'Medium' ? 'info' : 'plain';
    return '<span class="badge badge-' + tone + '">' + U.esc(p) + '</span>';
  }
  function gapBar(current, required) {
    var pct = Math.min(100, (current / required) * 100);
    var gap = Math.max(0, required - current);
    var tone = gap === 0 ? 'green' : gap === 1 ? 'amber' : 'red';
    return '<div class="progress-row"><div class="progress">' +
      '<div class="progress-bar ' + tone + '" style="width:' + pct + '%"></div></div>' +
      '<span class="pct">' + current + '/' + required + '</span></div>';
  }

  var MODULES = {};

  /* ------------------------------------------------------------ TNA / TNI */
  MODULES.tna = {
    active: 'tna', title: 'Training needs analysis',
    subtitle: 'Identified capability gaps, prioritised and mapped to interventions.',
    crumb: 'TNA / TNI', adminOnly: true, exportName: 'training-needs-analysis',
    columns: [
      { key: 'competency', label: 'Competency' }, { key: 'department', label: 'Department' },
      { key: 'category', label: 'Category' }, { key: 'affected', label: 'People affected' },
      { key: 'avgGap', label: 'Average gap' }, { key: 'priority', label: 'Priority' },
      { key: 'intervention', label: 'Recommended intervention' },
      { key: 'recommendedCourse', label: 'Recommended course' },
      { label: 'Target date', value: function (r) { return U.date(r.targetDate); } },
      { key: 'status', label: 'Status' }
    ],
    stats: function () {
      return S.tna.summary().then(function (st) {
        return stat('Identified needs', U.num(st.total), 'compass', '') +
          stat('Critical priority', U.num(st.critical), 'alert', 'red') +
          stat('People affected', U.num(st.peopleAffected), 'users', 'teal') +
          stat('Addressed', U.num(st.addressed), 'checkCircle', 'green');
      });
    },
    charts: function () {
      return S.tna.summary().then(function (st) {
        return [
          card('Needs by department', 'Headcount with an identified gap',
            C.hbars(st.byDepartment.slice(0, 7), { suffix: ' people' })),
          card('Needs by competency area', 'Where capability is thinnest',
            C.donut(st.byCategory, { size: 160, stroke: 24, label: 'Needs by category' }))
        ];
      });
    },
    table: {
      searchPlaceholder: 'Search competency, department or intervention…',
      defaultSort: 'affected', defaultDir: 'desc',
      filters: [
        { key: 'priority', label: 'Priority', options: ['Critical','High','Medium','Low'].map(function (p) {
          return { value: p, label: p }; })},
        { key: 'status', label: 'Status', options: ['Identified','Planned','In Progress','Addressed'].map(function (s) {
          return { value: s, label: s }; })}
      ],
      columns: [
        { key: 'competency', label: 'Competency', sortable: true, primary: true,
          render: function (r) {
            return '<div class="fw-medium">' + U.esc(r.competency) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.category) + '</div>';
          }},
        { key: 'department', label: 'Department', sortable: true, hideBelow: 'md' },
        { key: 'affected', label: 'Affected', sortable: true, align: 'right',
          render: function (r) { return U.num(r.affected); }},
        { key: 'avgGap', label: 'Avg gap', sortable: true, align: 'right', hideBelow: 'lg',
          render: function (r) { return r.avgGap + ' levels'; }},
        { key: 'intervention', label: 'Intervention', sortable: true, hideBelow: 'lg' },
        { key: 'targetDate', label: 'Target', sortable: true, hideBelow: 'md',
          render: function (r) { return U.date(r.targetDate); }},
        { key: 'priority', label: 'Priority', sortable: true,
          render: function (r) { return priorityBadge(r.priority); }},
        { key: 'status', label: 'Status', sortable: true, hideBelow: 'md',
          render: function (r) { return U.statusBadge(r.status); }}
      ],
      service: function () { return S.tna; }
    },
    detail: function (r) {
      return {
        title: r.competency + ' — ' + r.department,
        subtitle: r.affected + ' people affected · ' + r.priority + ' priority',
        body: '<div class="row gap-2 mb-5 wrap">' + priorityBadge(r.priority) + U.statusBadge(r.status) +
            '<span class="badge badge-plain">' + U.esc(r.category) + '</span></div>' +
          '<div class="grid grid-4 gap-3 mb-5">' +
            [['Affected', r.affected], ['Avg gap', r.avgGap], ['Max gap', r.maxGap],
             ['Target', U.date(r.targetDate)]].map(function (x) {
              return '<div class="card card-pad" style="padding:var(--sp-3);text-align:center">' +
                '<div class="fw-bold">' + x[1] + '</div>' +
                '<div class="text-xs text-muted">' + x[0] + '</div></div>';
            }).join('') + '</div>' +
          kv([['Recommended intervention', r.intervention], ['Recommended course', r.recommendedCourse],
              ['Raised by', r.raisedBy], ['Identified', U.date(r.createdAt, 'long')]]) +
          '<div class="alert mt-4">' + GGL.icon('info', 'ico') + '<div class="text-sm">' +
          'This need was aggregated from individual competency assessments. Open ' +
          '<a href="' + GGL.url('app/competencies.html') + '">Competencies</a> to see the ' +
          'underlying per-person gaps.</div></div>',
        actions: '<a class="btn btn-primary" href="' + GGL.url('app/courses.html') + '">Plan training</a>'
      };
    }
  };

  /* -------------------------------------------------------- Competencies */
  MODULES.competencies = {
    active: 'competencies', title: 'Competency management',
    subtitle: 'Role-based frameworks, individual profiles and the organisational gap picture.',
    crumb: 'Competencies', adminOnly: false, exportName: 'competency-assessment',
    columns: [
      { key: 'name', label: 'Learner' }, { key: 'employeeId', label: 'Employee ID' },
      { key: 'department', label: 'Department' }, { key: 'role', label: 'Role' },
      { key: 'competency', label: 'Competency' }, { key: 'category', label: 'Category' },
      { key: 'current', label: 'Current level' }, { key: 'required', label: 'Required level' },
      { key: 'gap', label: 'Gap' },
      { label: 'Assessed', value: function (r) { return U.date(r.assessedAt); } }
    ],
    learnerView: function (body, user) {
      body.innerHTML = '<div class="grid grid-4 mb-6" id="m-stats">' + UI.skeletonCards(4) + '</div>' +
        '<div id="m-profile"><div class="card card-pad"><div class="skel skel-chart"></div></div></div>';
      UI.async(document.getElementById('m-profile'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
        return S.competency.profileFor(user.id).then(function (rows) {
          var met = rows.filter(function (r) { return r.gap === 0; }).length;
          document.getElementById('m-stats').innerHTML =
            stat('Competencies', rows.length, 'target', '') +
            stat('At required level', met, 'checkCircle', 'green') +
            stat('Development areas', rows.length - met, 'trending', 'amber') +
            stat('Framework', rows.length ? rows[0].role : '—', 'briefcase', 'teal');

          document.getElementById('m-profile').innerHTML = card('My competency profile',
            rows.length ? 'Assessed against the ' + rows[0].role + ' framework' : '',
            rows.length ? '<div class="table-wrap"><table class="table"><thead><tr>' +
                '<th>Competency</th><th class="hide-sm">Category</th><th>Level</th><th>Status</th>' +
                '</tr></thead><tbody>' +
                rows.sort(function (a, b) { return b.gap - a.gap; }).map(function (r) {
                  return '<tr><td class="cell-primary">' + U.esc(r.competency) + '</td>' +
                    '<td class="hide-sm">' + U.esc(r.category) + '</td>' +
                    '<td style="width:170px">' + gapBar(r.current, r.required) + '</td>' +
                    '<td>' + (r.gap === 0 ? '<span class="badge badge-success">Met</span>'
                      : '<span class="badge badge-warning">' + r.gap + ' level' +
                        (r.gap > 1 ? 's' : '') + ' to close</span>') + '</td></tr>';
                }).join('') + '</tbody></table></div>' +
                '<p class="hint mt-4">Levels run 1 (Awareness) to 5 (Expert). Your required levels come ' +
                'from the competency framework for your role.</p>'
              : UI.empty({ icon: 'target', title: 'No assessment yet',
                  message: 'Your manager will assess your competencies as part of the review cycle.' }));
        });
      });
    },
    stats: function () {
      return S.competency.all().then(function (rows) {
        var met = rows.filter(function (r) { return r.gap === 0; }).length;
        return stat('Assessments', U.num(rows.length), 'target', '') +
          stat('At required level', Math.round((met / rows.length) * 100) + '%', 'checkCircle', 'green') +
          stat('Competencies', GGL.data.competencyLibrary.length, 'layers', 'teal') +
          stat('Role frameworks', GGL.data.roleProfiles.length, 'briefcase', 'violet');
      });
    },
    charts: function () {
      return Promise.all([S.competency.all(), S.competency.heatmap()]).then(function (res) {
        var rows = res[0], heat = res[1];
        var byComp = U.groupBy(rows, 'competency');
        var gapData = Object.keys(byComp).map(function (k) {
          return { label: k, value: Math.round(U.avg(byComp[k], 'gap') * 10) / 10 };
        }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8);

        var depts = heat[0] ? heat[0].cells.map(function (c) { return c.department; }) : [];
        var heatHtml = '<div class="heatmap-wrap"><table class="table heatmap"><thead><tr><th>Competency</th>' +
          depts.map(function (d) {
            return '<th class="text-right">' + U.esc(d.slice(0, 10)) + '</th>';
          }).join('') + '</tr></thead><tbody>' +
          heat.map(function (row) {
            return '<tr><td class="cell-primary">' + U.esc(row.competency) + '</td>' +
              row.cells.map(function (c) {
                if (c.gap === null) return '<td class="text-right text-subtle">—</td>';
                var lvl = c.gap >= 1.5 ? 'hot' : c.gap >= 0.8 ? 'warm' : c.gap > 0.3 ? 'mild' : 'cool';
                return '<td class="text-right"><span class="heat ' + lvl + '" title="' + c.people +
                  ' assessed">' + c.gap.toFixed(1) + '</span></td>';
              }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>' +
          '<p class="hint mt-3">Average gap in levels. Darker cells need attention first.</p>';

        return [
          card('Competency gap heatmap', 'Average gap by competency and department', heatHtml),
          card('Largest gaps', 'Across the whole population', C.hbars(gapData, { suffix: ' levels' }))
        ];
      });
    },
    table: {
      searchPlaceholder: 'Search learner, competency or department…',
      defaultSort: 'gap', defaultDir: 'desc',
      filters: [
        { key: 'category', label: 'Category',
          options: ['Behavioural','Leadership','Functional','Technical','Compliance'].map(function (c) {
            return { value: c, label: c }; })},
        { key: 'department', label: 'Department', options: GGL.seed.DEPTS.map(function (d) {
          return { value: d, label: d }; })}
      ],
      columns: [
        { key: 'name', label: 'Learner', sortable: true, primary: true,
          render: function (r) { return U.userCell(r.name, r.role); }},
        { key: 'department', label: 'Department', sortable: true, hideBelow: 'md' },
        { key: 'competency', label: 'Competency', sortable: true,
          render: function (r) {
            return '<div>' + U.esc(r.competency) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.category) + '</div>';
          }},
        { key: 'current', label: 'Level', sortable: true, width: '170px',
          render: function (r) { return gapBar(r.current, r.required); }},
        { key: 'gap', label: 'Gap', sortable: true, align: 'right',
          render: function (r) {
            return r.gap === 0 ? '<span class="badge badge-success">Met</span>'
              : '<span class="badge badge-warning">' + r.gap + '</span>';
          }},
        { key: 'assessedAt', label: 'Assessed', sortable: true, hideBelow: 'lg',
          render: function (r) { return U.date(r.assessedAt); }}
      ],
      service: function () { return S.competency; }
    },
    detail: function (r) {
      var prof = GGL.data.proficiency;
      return {
        title: r.name + ' — ' + r.competency, subtitle: r.role + ' · ' + r.department,
        body: '<div class="row gap-4 mb-5 wrap" style="align-items:center">' +
            C.gauge(Math.round((r.current / r.required) * 100), { size: 130,
              caption: r.gap === 0 ? 'At required level' : r.gap + ' level(s) to close' }) +
            '<div class="grow" style="min-width:220px"><ul style="list-style:none;padding:0;margin:0">' +
              prof.map(function (p) {
                var isCur = p.level === r.current, isReq = p.level === r.required;
                return '<li class="row gap-3 text-sm" style="padding:6px 0">' +
                  '<span class="rank-medal' + (isCur ? ' gold' : '') + '">' + p.level + '</span>' +
                  '<span class="grow"><strong>' + U.esc(p.label) + '</strong>' +
                  '<div class="text-xs text-muted">' + U.esc(p.desc) + '</div></span>' +
                  (isCur ? '<span class="badge badge-accent">Current</span>' : '') +
                  (isReq ? '<span class="badge badge-info">Required</span>' : '') + '</li>';
              }).join('') + '</ul></div></div>' +
          kv([['Assessed by', r.assessedBy], ['Assessed on', U.date(r.assessedAt, 'long')]])
      };
    }
  };

  /* ------------------------------------------------------------ Trainers */
  MODULES.trainers = {
    active: 'trainers', title: 'Trainer management',
    subtitle: 'The trainer directory, with delivery load and observation history.',
    crumb: 'Trainers', adminOnly: true, exportName: 'trainer-directory',
    columns: [
      { key: 'name', label: 'Trainer' }, { key: 'email', label: 'Email' },
      { key: 'type', label: 'Type' }, { key: 'specialism', label: 'Specialism' },
      { key: 'location', label: 'Location' }, { key: 'sessionsDelivered', label: 'Sessions' },
      { key: 'trainingHours', label: 'Hours' }, { key: 'learnersTrained', label: 'Learners' },
      { key: 'effectiveness', label: 'Effectiveness %' }, { key: 'status', label: 'Status' }
    ],
    stats: function () {
      return S.trainers.stats().then(function (st) {
        return stat('Trainers', U.num(st.total), 'briefcase', '') +
          stat('Active', U.num(st.active), 'checkCircle', 'green') +
          stat('Hours delivered', U.num(st.hours), 'clock', 'teal') +
          stat('Avg effectiveness', st.avgEffectiveness + '%', 'trending', 'violet');
      });
    },
    charts: function () {
      return Promise.all([S.trainers.all(), S.effectivenessCalc.all()]).then(function (res) {
        var trainers = res[0], eff = res[1];
        var top = eff.slice().sort(function (a, b) { return b.effectiveness - a.effectiveness; })
          .slice(0, 8).map(function (e) { return { label: e.trainer, value: Math.round(e.effectiveness) }; });
        var bySpec = U.groupBy(trainers, 'specialism');
        var spec = Object.keys(bySpec).map(function (k) { return { label: k, value: bySpec[k].length }; })
          .sort(function (a, b) { return b.value - a.value; }).slice(0, 7);
        return [
          card('Top effectiveness', 'Weighted score from the calculator', C.hbars(top, { suffix: '%' }),
            '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/effectiveness-calculator.html') + '">Calculator</a>'),
          card('Coverage by specialism', 'Where delivery capability sits', C.hbars(spec, { suffix: ' trainers' }))
        ];
      });
    },
    table: {
      searchPlaceholder: 'Search name, specialism or location…', defaultSort: 'name',
      filters: [
        { key: 'type', label: 'Type', options: [{ value: 'Internal', label: 'Internal' },
          { value: 'External', label: 'External' }]},
        { key: 'status', label: 'Status', options: [{ value: 'Active', label: 'Active' },
          { value: 'Inactive', label: 'Inactive' }]}
      ],
      columns: [
        { key: 'name', label: 'Trainer', sortable: true, primary: true,
          render: function (r) { return U.userCell(r.name, r.specialism); }},
        { key: 'type', label: 'Type', sortable: true, hideBelow: 'md' },
        { key: 'location', label: 'Location', sortable: true, hideBelow: 'lg' },
        { key: 'sessionsDelivered', label: 'Sessions', sortable: true, align: 'right', hideBelow: 'md',
          render: function (r) { return U.num(r.sessionsDelivered); }},
        { key: 'trainingHours', label: 'Hours', sortable: true, align: 'right', hideBelow: 'lg',
          render: function (r) { return U.num(r.trainingHours); }},
        { key: 'observationScore', label: 'TOF', sortable: true, align: 'right', hideBelow: 'lg',
          render: function (r) { return r.observationScore + '/5'; }},
        { key: 'effectiveness', label: 'Effectiveness', sortable: true, width: '150px',
          render: function (r) { return U.progressCell(Math.round(r.effectiveness)); }},
        { key: 'status', label: 'Status', sortable: true,
          render: function (r) { return U.statusBadge(r.status); }}
      ],
      service: function () { return S.trainers; },
      extraActions: function () {
        return [
          { label: 'Observe trainer', icon: 'clipboard',
            onClick: function () { window.location.href = GGL.url('app/observation.html'); }},
          { label: 'Effectiveness', icon: 'trending',
            onClick: function () { window.location.href = GGL.url('app/effectiveness-calculator.html'); }}
        ];
      }
    },
    detail: function (r) {
      var obs = GGL.data.tofRecords.filter(function (o) { return o.trainerId === r.id; });
      var eff = GGL.data.effRecords.filter(function (e) { return e.trainerId === r.id; })[0];
      return {
        title: r.name, subtitle: r.specialism + ' · ' + r.type + ' · ' + r.location,
        body: '<div class="row gap-2 mb-5 wrap">' + U.statusBadge(r.status) +
            '<span class="badge badge-plain">' + U.esc(r.type) + '</span></div>' +
          '<div class="grid grid-4 gap-3 mb-5">' +
            [['Sessions', U.num(r.sessionsDelivered)], ['Hours', U.num(r.trainingHours)],
             ['Learners', U.num(r.learnersTrained)], ['Upcoming', r.upcomingSessions]].map(function (x) {
              return '<div class="card card-pad" style="padding:var(--sp-3);text-align:center">' +
                '<div class="fw-bold">' + x[1] + '</div>' +
                '<div class="text-xs text-muted">' + x[0] + '</div></div>';
            }).join('') + '</div>' +
          (eff ? '<h4 class="mb-3">Effectiveness</h4>' +
            '<div class="row gap-5 mb-5 wrap" style="align-items:center">' +
              C.gauge(eff.effectiveness, { size: 130, caption: eff.rating }) +
              '<div class="grow" style="min-width:220px">' +
              C.hbars(GGL.data.effWeights.map(function (w) {
                return { label: w.label, value: Math.round(eff[w.key]) };
              }), { suffix: '%' }) + '</div></div>' : '') +
          '<h4 class="mb-3">Observation history</h4>' +
          (obs.length ? '<ul class="session-list">' + obs.slice(0, 5).map(function (o) {
              return '<li><span class="session-date" style="width:52px"><span class="m">TOF</span>' +
                '<span class="d" style="font-size:var(--fs-sm)">' + Math.round(o.score) + '</span></span>' +
                '<span class="session-info"><h4 class="truncate">' + U.esc(o.topic) + '</h4>' +
                '<span class="meta"><span>' + GGL.icon('calendar', 'ico') + U.date(o.observationDate) + '</span>' +
                '<span>' + GGL.icon('user', 'ico') + U.esc(o.evaluator) + '</span></span></span>' +
                '<span class="badge badge-plain">' + U.esc(o.rating) + '</span></li>';
            }).join('') + '</ul>' : '<p class="text-sm text-muted">No observations recorded yet.</p>'),
        actions: '<a class="btn btn-primary" href="' + GGL.url('app/observation.html') + '">New observation</a>'
      };
    }
  };

  /* ------------------------------------------------------ Content library */
  MODULES.content = {
    active: 'content', title: 'Content library',
    subtitle: 'Every asset backing the catalogue — searchable, versioned and owned.',
    crumb: 'Content Library', adminOnly: true, exportName: 'content-library',
    columns: [
      { key: 'title', label: 'Title' }, { key: 'course', label: 'Course' },
      { key: 'category', label: 'Category' }, { key: 'type', label: 'Type' },
      { key: 'format', label: 'Format' }, { key: 'sizeMb', label: 'Size (MB)' },
      { key: 'version', label: 'Version' }, { key: 'author', label: 'Author' },
      { key: 'views', label: 'Views' }, { key: 'downloads', label: 'Downloads' },
      { key: 'status', label: 'Status' }
    ],
    stats: function () {
      return S.content.all().then(function (rows) {
        return stat('Assets', U.num(rows.length), 'folder', '') +
          stat('Published', U.num(rows.filter(function (r) { return r.status === 'Published'; }).length), 'checkCircle', 'green') +
          stat('SCORM packages', U.num(rows.filter(function (r) { return r.type === 'SCORM'; }).length), 'package', 'violet') +
          stat('Total size', Math.round(U.sum(rows, 'sizeMb')) + ' MB', 'database', 'teal');
      });
    },
    charts: function () {
      return S.content.all().then(function (rows) {
        var byType = U.groupBy(rows, 'type');
        var typeData = Object.keys(byType).map(function (k) { return { label: k, value: byType[k].length }; })
          .sort(function (a, b) { return b.value - a.value; });
        var top = rows.slice().sort(function (a, b) { return b.views - a.views; }).slice(0, 7)
          .map(function (r) { return { label: r.title, value: r.views }; });
        return [
          card('Most viewed', 'Assets learners actually open', C.hbars(top, { suffix: ' views' })),
          card('Library composition', 'By asset type',
            C.donut(typeData, { size: 160, stroke: 24, label: 'Content by type' }))
        ];
      });
    },
    table: {
      searchPlaceholder: 'Search title, course, type or author…',
      defaultSort: 'updatedAt', defaultDir: 'desc',
      filters: [
        { key: 'type', label: 'Type',
          options: ['Video','PDF','Presentation','Document','SCORM','Job aid','Link'].map(function (t) {
            return { value: t, label: t }; })},
        { key: 'status', label: 'Status', options: ['Published','In Review','Draft'].map(function (s) {
          return { value: s, label: s }; })}
      ],
      columns: [
        { key: 'title', label: 'Asset', sortable: true, primary: true,
          render: function (r) {
            var icon = r.type === 'Video' ? 'video' : r.type === 'SCORM' ? 'package'
                     : r.type === 'Presentation' ? 'image' : r.type === 'Link' ? 'link' : 'fileText';
            return '<div class="row gap-3"><span class="stat-icon" style="width:32px;height:32px">' +
              GGL.icon(icon, 'ico') + '</span><span>' +
              '<span class="fw-medium truncate" style="max-width:260px;display:block">' + U.esc(r.title) + '</span>' +
              '<span class="text-xs text-muted">' + U.esc(r.format) + ' · ' + r.sizeMb + ' MB · ' +
              U.esc(r.version) + '</span></span></div>';
          }},
        { key: 'course', label: 'Course', sortable: true, hideBelow: 'md',
          render: function (r) {
            return '<div class="truncate" style="max-width:200px">' + U.esc(r.course) + '</div>';
          }},
        { key: 'type', label: 'Type', sortable: true, hideBelow: 'lg' },
        { key: 'author', label: 'Author', sortable: true, hideBelow: 'lg' },
        { key: 'views', label: 'Views', sortable: true, align: 'right', hideBelow: 'md',
          render: function (r) { return U.num(r.views); }},
        { key: 'updatedAt', label: 'Updated', sortable: true, hideBelow: 'md',
          render: function (r) { return U.date(r.updatedAt); }},
        { key: 'status', label: 'Status', sortable: true,
          render: function (r) { return U.statusBadge(r.status); }}
      ],
      service: function () { return S.content; }
    },
    detail: function (r) {
      return {
        title: r.title, subtitle: r.type + ' · ' + r.format + ' · ' + r.version,
        body: '<div class="row gap-2 mb-5 wrap">' + U.statusBadge(r.status) +
            '<span class="badge badge-plain">' + U.esc(r.category) + '</span>' +
            '<span class="badge badge-plain">' + U.esc(r.language) + '</span></div>' +
          '<div class="content-preview mb-5">' +
            GGL.icon(r.type === 'Video' ? 'video' : r.type === 'SCORM' ? 'package' : 'fileText', 'ico') +
            '<div class="fw-medium mt-3">' + U.esc(r.format) + ' · ' + r.sizeMb + ' MB</div>' +
            '<div class="text-xs text-muted">Preview and playback are not implemented in this phase</div></div>' +
          kv([['Course', r.course], ['Author', r.author], ['Version', r.version],
              ['Views', U.num(r.views)], ['Downloads', U.num(r.downloads)],
              ['Last updated', U.date(r.updatedAt, 'long')]]),
        actions: '<button type="button" class="btn btn-primary" data-noop>' +
          GGL.icon('download', 'ico') + '<span>Download</span></button>'
      };
    }
  };

  /* ---------------------------------------------------------------- SOPs */
  MODULES.sops = {
    active: 'sops', title: 'SOP management',
    subtitle: 'Controlled documents with versioning, approval workflow and review dates.',
    crumb: 'SOPs', adminOnly: true, exportName: 'sop-register',
    columns: [
      { key: 'code', label: 'Code' }, { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category' }, { key: 'version', label: 'Version' },
      { key: 'owner', label: 'Owner' }, { key: 'approver', label: 'Approver' },
      { key: 'status', label: 'Status' },
      { label: 'Last reviewed', value: function (r) { return U.date(r.lastReviewed); } },
      { label: 'Next review', value: function (r) { return U.date(r.nextReview); } }
    ],
    stats: function () {
      return S.sops.all().then(function (rows) {
        var overdue = rows.filter(function (r) { return new Date(r.nextReview) < new Date(); });
        return stat('SOPs', U.num(rows.length), 'clipboard', '') +
          stat('Published', U.num(rows.filter(function (r) { return r.status === 'Published'; }).length), 'checkCircle', 'green') +
          stat('In workflow', U.num(rows.filter(function (r) {
            return ['Draft','Review','Approval'].indexOf(r.status) !== -1; }).length), 'edit', 'amber') +
          stat('Review overdue', U.num(overdue.length), 'alert', 'red');
      });
    },
    charts: function () {
      return S.sops.all().then(function (rows) {
        var stages = GGL.data.sopStages.map(function (st) {
          return { label: st, value: rows.filter(function (r) { return r.status === st; }).length };
        });
        var byCat = U.groupBy(rows, 'category');
        return [
          card('Approval workflow', 'Draft → Review → Approval → Published → Archived',
            C.bar(stages, { height: 230, label: 'SOP workflow' })),
          card('By category', 'Coverage across the L&D function',
            C.donut(Object.keys(byCat).map(function (k) { return { label: k, value: byCat[k].length }; }),
              { size: 160, stroke: 24, label: 'SOPs by category' }))
        ];
      });
    },
    table: {
      searchPlaceholder: 'Search code, title or owner…', defaultSort: 'code',
      filters: [{ key: 'status', label: 'Status', options: GGL.data.sopStages.map(function (s) {
        return { value: s, label: s }; })}],
      columns: [
        { key: 'code', label: 'SOP', sortable: true, primary: true,
          render: function (r) {
            return '<div class="fw-medium">' + U.esc(r.title) + '</div>' +
              '<div class="text-xs text-muted"><code>' + U.esc(r.code) + '</code> · ' + U.esc(r.version) + '</div>';
          }},
        { key: 'category', label: 'Category', sortable: true, hideBelow: 'md' },
        { key: 'owner', label: 'Owner', sortable: true, hideBelow: 'lg' },
        { key: 'lastReviewed', label: 'Reviewed', sortable: true, hideBelow: 'md',
          render: function (r) { return U.date(r.lastReviewed); }},
        { key: 'nextReview', label: 'Next review', sortable: true,
          render: function (r) {
            var overdue = new Date(r.nextReview) < new Date();
            return '<span class="' + (overdue ? 'text-warning fw-medium' : '') + '">' +
              U.date(r.nextReview) + (overdue ? ' ⚠' : '') + '</span>';
          }},
        { key: 'status', label: 'Status', sortable: true,
          render: function (r) { return U.statusBadge(r.status); }}
      ],
      service: function () { return S.sops; },
      extraActions: function (r, api) {
        var next = { Draft: 'Review', Review: 'Approval', Approval: 'Published' }[r.status];
        if (!next) return [];
        return [{ label: 'Advance to ' + next, icon: 'arrowRight', onClick: function (row) {
          UI.confirm({ title: 'Advance to ' + next + '?',
            message: row.code + ' — ' + row.title + ' will move to the ' + next.toLowerCase() + ' stage.',
            tone: 'info', confirmLabel: 'Advance',
            onConfirm: function () {
              return S.sops.advance(row.id, next).then(function () {
                UI.toast('Moved to ' + next, { type: 'success' }); api.reload();
              });
            }});
        }}];
      }
    },
    detail: function (r) {
      var stages = GGL.data.sopStages;
      var idx = stages.indexOf(r.status);
      return {
        title: r.title, subtitle: r.code + ' · ' + r.version + ' · owned by ' + r.owner,
        body: '<div class="wizard-steps mb-5">' + stages.map(function (st, i) {
            var cls = i === idx ? ' active' : i < idx ? ' done' : '';
            return '<span class="wizard-step' + cls + '"><span class="n">' +
              (i < idx ? '✓' : i + 1) + '</span><span>' + st + '</span></span>';
          }).join('') + '</div>' +
          '<h4 class="mb-2">Purpose</h4><p class="text-muted">' + U.esc(r.purpose) + '</p>' +
          kv([['Category', r.category], ['Owner', r.owner], ['Approver', r.approver],
              ['Effective from', r.effectiveFrom ? U.date(r.effectiveFrom, 'long') : 'Not yet published'],
              ['Last reviewed', U.date(r.lastReviewed, 'long')],
              ['Next review', U.date(r.nextReview, 'long')]]) +
          '<h4 class="mt-5 mb-2">Latest change</h4>' +
          '<p class="text-muted text-sm">' + U.esc(r.changeNote) + '</p>'
      };
    }
  };

  /* ------------------------------------------------- Coaching / mentoring */
  function engagementModule(kind) {
    var isCoaching = kind === 'coaching';
    var who = isCoaching ? 'coachee' : 'mentee';
    var pro = isCoaching ? 'coach' : 'mentor';

    return {
      active: kind, title: isCoaching ? 'Coaching' : 'Mentoring',
      subtitle: isCoaching ? 'One-to-one coaching engagements, goals and session progress.'
        : 'Mentor matching, long-term development relationships and check-ins.',
      crumb: isCoaching ? 'Coaching' : 'Mentoring', adminOnly: false,
      exportName: kind + '-engagements',
      columns: [
        { key: who, label: isCoaching ? 'Coachee' : 'Mentee' },
        { key: 'department', label: 'Department' },
        { key: pro, label: isCoaching ? 'Coach' : 'Mentor' },
        { key: isCoaching ? 'focus' : 'area', label: isCoaching ? 'Focus' : 'Area' },
        { key: 'goal', label: 'Goal' }, { key: 'status', label: 'Status' },
        { key: 'progress', label: 'Progress %' }
      ],
      stats: function () {
        return (isCoaching ? S.coaching : S.mentoring).all().then(function (rows) {
          var active = rows.filter(function (r) {
            return ['In Progress', 'Active'].indexOf(r.status) !== -1; }).length;
          return stat('Engagements', U.num(rows.length), isCoaching ? 'messageCircle' : 'users', '') +
            stat('Active', U.num(active), 'activity', 'green') +
            stat('Completed', U.num(rows.filter(function (r) { return r.status === 'Completed'; }).length), 'checkCircle', 'teal') +
            stat('Avg progress', Math.round(U.avg(rows, 'progress')) + '%', 'trending', 'violet');
        });
      },
      charts: function () {
        return (isCoaching ? S.coaching : S.mentoring).all().then(function (rows) {
          var key = isCoaching ? 'focus' : 'area';
          var byFocus = U.groupBy(rows, key);
          var focusData = Object.keys(byFocus).map(function (k) { return { label: k, value: byFocus[k].length }; })
            .sort(function (a, b) { return b.value - a.value; }).slice(0, 7);
          var byDept = U.groupBy(rows, 'department');
          var deptData = Object.keys(byDept).map(function (k) { return { label: k, value: byDept[k].length }; })
            .sort(function (a, b) { return b.value - a.value; }).slice(0, 6);
          return [
            card(isCoaching ? 'Coaching focus areas' : 'Mentoring areas', 'What people are working on',
              C.hbars(focusData, { suffix: '' })),
            card('Uptake by department', 'Where the demand sits',
              C.donut(deptData, { size: 160, stroke: 24, label: 'By department' }))
          ];
        });
      },
      table: {
        searchPlaceholder: 'Search participant, ' + pro + ' or focus…',
        defaultSort: 'progress', defaultDir: 'desc',
        filters: [{ key: 'status', label: 'Status',
          options: (isCoaching ? ['Requested','In Progress','Completed'] : ['Matching','Active','Completed'])
            .map(function (s) { return { value: s, label: s }; })}],
        columns: [
          { key: who, label: isCoaching ? 'Coachee' : 'Mentee', sortable: true, primary: true,
            render: function (r) { return U.userCell(r[who], r.department); }},
          { key: pro, label: isCoaching ? 'Coach' : 'Mentor', sortable: true, hideBelow: 'md' },
          { key: isCoaching ? 'focus' : 'area', label: 'Focus', sortable: true, hideBelow: 'lg' },
          { key: 'progress', label: 'Progress', sortable: true, width: '150px',
            render: function (r) { return U.progressCell(r.progress); }},
          { key: isCoaching ? 'nextSession' : 'nextCheckIn', label: 'Next', sortable: true, hideBelow: 'md',
            render: function (r) {
              var d = isCoaching ? r.nextSession : r.nextCheckIn;
              return d ? U.date(d) : '<span class="text-subtle">—</span>';
            }},
          { key: 'status', label: 'Status', sortable: true,
            render: function (r) { return U.statusBadge(r.status); }}
        ],
        service: function () { return isCoaching ? S.coaching : S.mentoring; },
        extraActions: isCoaching ? function (r, api) {
          if (r.status === 'Completed') return [];
          return [{ label: 'Log a session', icon: 'checkCircle', onClick: function (row) {
            S.coaching.logSession(row.id).then(function (res) {
              UI.toast('Session logged', { type: 'success',
                desc: res.sessionsCompleted + ' of ' + row.sessionsPlanned + ' complete.' });
              api.reload();
            });
          }}];
        } : null
      },
      detail: function (r) {
        return {
          title: r[who] + ' with ' + r[pro],
          subtitle: (isCoaching ? r.focus : r.area) + ' · ' + r.department,
          body: '<div class="row gap-2 mb-5 wrap">' + U.statusBadge(r.status) + '</div>' +
            '<div class="mb-5">' + U.progressCell(r.progress) + '</div>' +
            '<h4 class="mb-2">Goal</h4><p class="text-muted">' + U.esc(r.goal) + '</p>' +
            kv(isCoaching
              ? [['Coach', r.coach], ['Focus', r.focus],
                 ['Sessions', r.sessionsCompleted + ' of ' + r.sessionsPlanned],
                 ['Next session', r.nextSession ? U.date(r.nextSession, 'long') : '—'],
                 ['Started', U.date(r.startedAt, 'long')]]
              : [['Mentor', r.mentor], ['Area', r.area], ['Duration', r.durationMonths + ' months'],
                 ['Elapsed', r.monthsElapsed + ' months'],
                 ['Next check-in', r.nextCheckIn ? U.date(r.nextCheckIn, 'long') : '—'],
                 ['Matched on', U.date(r.matchedOn, 'long')]])
        };
      }
    };
  }

  MODULES.coaching = engagementModule('coaching');
  MODULES.mentoring = engagementModule('mentoring');

  /* ------------------------------------------------------------ Requests */
  MODULES.requests = {
    active: 'requests', title: 'Request centre',
    subtitle: 'A single intake for training, content, coaching and L&D support.',
    crumb: 'Requests', adminOnly: false, exportName: 'lnd-requests',
    columns: [
      { key: 'reference', label: 'Reference' }, { key: 'title', label: 'Title' },
      { key: 'type', label: 'Type' }, { key: 'requester', label: 'Requester' },
      { key: 'department', label: 'Department' }, { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' }, { key: 'assignee', label: 'Assignee' },
      { label: 'Needed by', value: function (r) { return U.date(r.neededBy); } },
      { label: 'Raised', value: function (r) { return U.date(r.createdAt); } }
    ],
    stats: function () {
      return S.requests.summary().then(function (st) {
        return stat('All requests', U.num(st.total), 'inbox', '') +
          stat('Open', U.num(st.open), 'activity', 'amber') +
          stat('Completed', U.num(st.completed), 'checkCircle', 'green') +
          stat('Rejected', U.num(st.rejected), 'xCircle', 'red');
      });
    },
    charts: function () {
      return S.requests.summary().then(function (st) {
        return [
          card('Pipeline', 'Where requests sit in the workflow',
            C.bar(st.byStatus, { height: 230, label: 'Request pipeline' })),
          card('By request type', 'What the business asks for', C.hbars(st.byType.slice(0, 7), { suffix: '' }))
        ];
      });
    },
    newAction: {
      label: 'Raise a request',
      run: function (reload) {
        var handle = UI.modal({
          title: 'Raise a request', subtitle: 'Tell the L&D team what you need.', size: 'lg',
          body: '<form id="req-form" novalidate><div class="grid grid-2 gap-4">' +
              '<div class="field"><label class="label" for="rq-type">Request type</label>' +
                '<select class="select" id="rq-type" name="type">' +
                  GGL.data.requestTypes.map(function (t) { return '<option>' + U.esc(t) + '</option>'; }).join('') +
                '</select></div>' +
              '<div class="field"><label class="label" for="rq-pri">Priority</label>' +
                '<select class="select" id="rq-pri" name="priority">' +
                  ['Low','Medium','High','Critical'].map(function (p) {
                    return '<option' + (p === 'Medium' ? ' selected' : '') + '>' + p + '</option>';
                  }).join('') + '</select></div></div>' +
            '<div class="field"><label class="label" for="rq-title">Title <span class="req">*</span></label>' +
              '<input class="input" id="rq-title" name="title" placeholder="Summarise the need in one line"></div>' +
            '<div class="field"><label class="label" for="rq-desc">Description <span class="req">*</span></label>' +
              '<textarea class="textarea" id="rq-desc" name="description" ' +
              'placeholder="What is needed, for whom, and why now?"></textarea></div>' +
            '<div class="grid grid-2 gap-4">' +
              '<div class="field"><label class="label" for="rq-aud">Audience</label>' +
                '<select class="select" id="rq-aud" name="audience">' +
                  ['My team','Whole department','Selected individuals','All staff'].map(function (a) {
                    return '<option>' + a + '</option>'; }).join('') + '</select></div>' +
              '<div class="field"><label class="label" for="rq-head">Approximate headcount</label>' +
                '<input class="input" id="rq-head" name="headcount" type="number" min="1" max="500" value="10"></div></div>' +
            '<div class="field"><label class="label" for="rq-by">Needed by</label>' +
              '<input class="input" id="rq-by" name="neededBy" type="date"></div></form>',
          footer: '<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
            '<button type="submit" form="req-form" class="btn btn-primary">' +
            GGL.icon('send', 'ico') + '<span>Submit request</span></button>'
        });

        handle.overlay.querySelector('[data-cancel]').addEventListener('click', handle.close);
        UI.handleSubmit(handle.overlay.querySelector('#req-form'), {
          title: [U.validators.required, U.validators.min(8)],
          description: [U.validators.required, U.validators.min(20)]
        }, function (v) {
          var me = S.auth.getUser();
          return S.requests.create({
            reference: 'REQ-' + Math.floor(5000 + Math.random() * 4000),
            type: v.type, title: v.title, description: v.description,
            requester: me.name, requesterId: me.id, department: me.department,
            audience: v.audience, headcount: Number(v.headcount) || 1,
            priority: v.priority, status: 'Submitted', assignee: null,
            neededBy: v.neededBy ? new Date(v.neededBy).toISOString() : null,
            updatedAt: new Date().toISOString()
          });
        }, { success: 'Request submitted',
          successDesc: 'The L&D team will review and come back to you.',
          onDone: function () { handle.close(); reload(); } });
      }
    },
    table: {
      searchPlaceholder: 'Search reference, title or requester…',
      defaultSort: 'createdAt', defaultDir: 'desc',
      filters: [
        { key: 'status', label: 'Status', options: GGL.data.requestStates.map(function (s) {
          return { value: s, label: s }; })},
        { key: 'priority', label: 'Priority', options: ['Critical','High','Medium','Low'].map(function (p) {
          return { value: p, label: p }; })}
      ],
      columns: [
        { key: 'title', label: 'Request', sortable: true, primary: true,
          render: function (r) {
            return '<div class="fw-medium truncate" style="max-width:280px">' + U.esc(r.title) + '</div>' +
              '<div class="text-xs text-muted"><code>' + U.esc(r.reference) + '</code> · ' + U.esc(r.type) + '</div>';
          }},
        { key: 'requester', label: 'Requester', sortable: true, hideBelow: 'md',
          render: function (r) { return U.userCell(r.requester, r.department); }},
        { key: 'neededBy', label: 'Needed by', sortable: true, hideBelow: 'lg',
          render: function (r) { return r.neededBy ? U.date(r.neededBy) : '—'; }},
        { key: 'assignee', label: 'Assignee', sortable: true, hideBelow: 'lg',
          render: function (r) { return r.assignee || '<span class="text-subtle">Unassigned</span>'; }},
        { key: 'priority', label: 'Priority', sortable: true,
          render: function (r) { return priorityBadge(r.priority); }},
        { key: 'status', label: 'Status', sortable: true,
          render: function (r) { return U.statusBadge(r.status); }}
      ],
      service: function () { return S.requests; },
      extraActions: function (r, api) {
        var me = S.auth.getUser();
        if (me.role === GGL.ROLES.END_USER) return [];
        var flow = { Submitted: 'Under Review', 'Under Review': 'Assigned',
          Assigned: 'In Progress', 'In Progress': 'Completed' };
        var next = flow[r.status];
        var out = [];
        if (next) {
          out.push({ label: 'Move to ' + next, icon: 'arrowRight', onClick: function (row) {
            S.requests.setStatus(row.id, next, next === 'Assigned' ? me.name : null).then(function () {
              UI.toast('Moved to ' + next, { type: 'success' }); api.reload();
            });
          }});
        }
        if (['Completed','Rejected'].indexOf(r.status) === -1) {
          out.push({ label: 'Reject request', icon: 'xCircle', tone: 'danger', onClick: function (row) {
            UI.confirm({ title: 'Reject this request?',
              message: row.reference + ' — ' + row.title,
              detail: 'The requester would be notified with a reason in production.',
              confirmLabel: 'Reject',
              onConfirm: function () {
                return S.requests.setStatus(row.id, 'Rejected').then(function () {
                  UI.toast('Request rejected', { type: 'success' }); api.reload();
                });
              }});
          }});
        }
        return out;
      }
    },
    detail: function (r) {
      var states = GGL.data.requestStates.filter(function (s) { return s !== 'Rejected'; });
      var idx = states.indexOf(r.status);
      return {
        title: r.title, subtitle: r.reference + ' · ' + r.type,
        body: (r.status === 'Rejected'
            ? '<div class="alert alert-danger mb-5">' + GGL.icon('xCircle', 'ico') +
              '<div class="text-sm">This request was rejected.</div></div>'
            : '<div class="wizard-steps mb-5">' + states.map(function (st, i) {
                var cls = i === idx ? ' active' : i < idx ? ' done' : '';
                return '<span class="wizard-step' + cls + '"><span class="n">' +
                  (i < idx ? '✓' : i + 1) + '</span><span>' + st + '</span></span>';
              }).join('') + '</div>') +
          '<div class="row gap-2 mb-5 wrap">' + priorityBadge(r.priority) + U.statusBadge(r.status) + '</div>' +
          '<h4 class="mb-2">Description</h4><p class="text-muted">' + U.esc(r.description) + '</p>' +
          kv([['Requester', r.requester], ['Department', r.department], ['Audience', r.audience],
              ['Headcount', String(r.headcount)], ['Assignee', r.assignee || 'Unassigned'],
              ['Needed by', r.neededBy ? U.date(r.neededBy, 'long') : '—'],
              ['Raised', U.date(r.createdAt, 'long')]])
      };
    }
  };

  /* ----------------------------------------------------------- Audit log */
  MODULES.audit = {
    active: 'audit', title: 'Audit log',
    subtitle: 'An immutable record of who changed what, and when.',
    crumb: 'Audit Log', superAdminOnly: true, exportName: 'audit-log',
    columns: [
      { label: 'Timestamp', value: function (r) { return U.date(r.at) + ' ' + U.time(r.at); } },
      { key: 'actor', label: 'Actor' }, { key: 'actorRole', label: 'Role' },
      { key: 'action', label: 'Action' }, { key: 'label', label: 'Description' },
      { key: 'module', label: 'Module' }, { key: 'target', label: 'Target' },
      { key: 'severity', label: 'Severity' }, { key: 'result', label: 'Result' },
      { key: 'ip', label: 'Source IP' }
    ],
    stats: function () {
      return S.audit.summary().then(function (st) {
        return stat('Events', U.num(st.total), 'shield', '') +
          stat('High severity', U.num(st.high), 'alert', 'red') +
          stat('Failed actions', U.num(st.failed), 'xCircle', 'amber') +
          stat('Distinct actors', U.num(st.actors), 'users', 'teal');
      });
    },
    charts: function () {
      return S.audit.summary().then(function (st) {
        return [
          card('Activity by module', 'Where changes are concentrated',
            C.hbars(st.byModule.slice(0, 8), { suffix: ' events' })),
          card('Retention', 'Configured in platform settings',
            '<div class="text-center" style="padding:var(--sp-6) 0">' +
            '<div style="font-size:var(--fs-3xl);font-weight:var(--fw-bold)">' +
            GGL.data.platformSettings.retention.auditLogYears + ' years</div>' +
            '<div class="text-sm text-muted">Audit log retention period</div>' +
            '<p class="hint mt-4">Events older than the retention period would be archived ' +
            'automatically in production.</p></div>')
        ];
      });
    },
    table: {
      searchPlaceholder: 'Search actor, action, module or target…',
      defaultSort: 'at', defaultDir: 'desc',
      filters: [
        { key: 'severity', label: 'Severity', options: ['High','Medium','Low'].map(function (s) {
          return { value: s, label: s }; })},
        { key: 'result', label: 'Result', options: [{ value: 'Success', label: 'Success' },
          { value: 'Failed', label: 'Failed' }]}
      ],
      columns: [
        { key: 'at', label: 'When', sortable: true, primary: true,
          render: function (r) {
            return '<div class="fw-medium">' + U.date(r.at) + '</div>' +
              '<div class="text-xs text-muted">' + U.time(r.at) + '</div>';
          }},
        { key: 'actor', label: 'Actor', sortable: true, hideBelow: 'md',
          render: function (r) { return U.userCell(r.actor, r.actorRole); }},
        { key: 'label', label: 'Action', sortable: true,
          render: function (r) {
            return '<div class="row gap-2"><span class="stat-icon" style="width:26px;height:26px">' +
              GGL.icon(r.icon, 'ico') + '</span><span>' +
              '<span class="fw-medium">' + U.esc(r.label) + '</span>' +
              '<div class="text-xs text-muted"><code>' + U.esc(r.action) + '</code></div></span></div>';
          }},
        { key: 'target', label: 'Target', sortable: true, hideBelow: 'lg',
          render: function (r) {
            return '<div class="truncate" style="max-width:200px">' + U.esc(r.target) + '</div>';
          }},
        { key: 'module', label: 'Module', sortable: true, hideBelow: 'lg' },
        { key: 'severity', label: 'Severity', sortable: true,
          render: function (r) {
            var tone = r.severity === 'High' ? 'danger' : r.severity === 'Medium' ? 'warning' : 'plain';
            return '<span class="badge badge-' + tone + '">' + U.esc(r.severity) + '</span>';
          }},
        { key: 'result', label: 'Result', sortable: true, hideBelow: 'md',
          render: function (r) {
            return r.result === 'Success' ? '<span class="badge badge-success">Success</span>'
              : '<span class="badge badge-danger">Failed</span>';
          }}
      ],
      service: function () { return S.audit; },
      noRowActions: true
    },
    detail: function (r) {
      return {
        title: r.label, subtitle: U.date(r.at, 'long') + ' at ' + U.time(r.at),
        body: '<div class="row gap-2 mb-5 wrap">' +
            '<span class="badge badge-' + (r.severity === 'High' ? 'danger'
              : r.severity === 'Medium' ? 'warning' : 'plain') + '">' + U.esc(r.severity) + '</span>' +
            '<span class="badge badge-' + (r.result === 'Success' ? 'success' : 'danger') + '">' +
            U.esc(r.result) + '</span></div>' +
          kv([['Action code', '<code>' + U.esc(r.action) + '</code>', true], ['Module', r.module],
              ['Actor', r.actor + ' (' + r.actorRole + ')'], ['Target', r.target],
              ['Source IP', r.ip], ['Timestamp', U.date(r.at, 'long') + ', ' + U.time(r.at)]]) +
          '<div class="alert mt-5">' + GGL.icon('lock', 'ico') + '<div class="text-sm">' +
          'Audit entries are append-only. In production they would be written to tamper-evident ' +
          'storage and could not be edited or deleted from the interface.</div></div>'
      };
    }
  };

  /* ------------------------------------------------------ Learning paths */
  MODULES.paths = {
    active: 'paths', title: 'Learning paths',
    subtitle: 'Sequenced programmes that build capability over time.',
    crumb: 'Learning Paths', adminOnly: false, exportName: 'learning-paths',
    columns: [
      { key: 'name', label: 'Path' }, { key: 'category', label: 'Category' },
      { label: 'Courses', value: function (r) { return r.steps.length; } },
      { label: 'Duration (mins)', value: function (r) { return r.totalMins; } },
      { key: 'enrolled', label: 'Enrolled' }, { key: 'completed', label: 'Completed' },
      { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status' }
    ],
    stats: function () {
      return S.paths.all().then(function (rows) {
        return stat('Learning paths', U.num(rows.length), 'compass', '') +
          stat('Published', U.num(rows.filter(function (r) { return r.status === 'Published'; }).length), 'checkCircle', 'green') +
          stat('Total enrolled', U.num(U.sum(rows, 'enrolled')), 'users', 'teal') +
          stat('Completions', U.num(U.sum(rows, 'completed')), 'award', 'violet');
      });
    },
    charts: function () {
      return S.paths.all().then(function (rows) {
        var comp = rows.map(function (r) {
          return { label: r.name, value: r.enrolled ? Math.round((r.completed / r.enrolled) * 100) : 0 };
        }).sort(function (a, b) { return b.value - a.value; });
        var load = rows.map(function (r) {
          return { label: r.name, value: Math.round(r.totalMins / 60) };
        }).sort(function (a, b) { return b.value - a.value; });
        return [
          card('Completion rate', 'Completions against enrolments', C.hbars(comp, { suffix: '%' })),
          card('Programme length', 'Total learning hours per path', C.hbars(load, { suffix: ' hrs' }))
        ];
      });
    },
    table: {
      searchPlaceholder: 'Search path, category or owner…',
      defaultSort: 'enrolled', defaultDir: 'desc',
      filters: [{ key: 'status', label: 'Status', options: [{ value: 'Published', label: 'Published' },
        { value: 'Draft', label: 'Draft' }]}],
      columns: [
        { key: 'name', label: 'Path', sortable: true, primary: true,
          render: function (r) {
            return '<div class="fw-medium">' + U.esc(r.name) + '</div>' +
              '<div class="text-xs text-muted">' + r.steps.length + ' courses · ' +
              Math.round(r.totalMins / 60) + ' hours</div>';
          }},
        { key: 'category', label: 'Category', sortable: true, hideBelow: 'md' },
        { key: 'owner', label: 'Owner', sortable: true, hideBelow: 'lg' },
        { key: 'enrolled', label: 'Enrolled', sortable: true, align: 'right', hideBelow: 'md',
          render: function (r) { return U.num(r.enrolled); }},
        { key: 'completed', label: 'Completion', sortable: true, width: '150px',
          render: function (r) {
            return U.progressCell(r.enrolled ? Math.round((r.completed / r.enrolled) * 100) : 0);
          }},
        { key: 'status', label: 'Status', sortable: true,
          render: function (r) { return U.statusBadge(r.status); }}
      ],
      service: function () { return S.paths; }
    },
    detail: function (r) {
      return {
        title: r.name,
        subtitle: r.category + ' · ' + r.steps.length + ' courses · ' + Math.round(r.totalMins / 60) + ' hours',
        body: '<div class="row gap-2 mb-5 wrap">' + U.statusBadge(r.status) +
            '<span class="badge badge-plain">' + U.esc(r.category) + '</span></div>' +
          '<p class="text-muted">' + U.esc(r.description) + '</p>' +
          '<h4 class="mt-5 mb-3">Path sequence</h4><ul class="session-list">' +
          r.steps.map(function (s) {
            return '<li><span class="session-date" style="width:40px">' +
              '<span class="d" style="font-size:var(--fs-base)">' + s.order + '</span></span>' +
              '<span class="session-info"><h4 class="truncate">' + U.esc(s.title) + '</h4>' +
              '<span class="meta"><span>' + GGL.icon('clock', 'ico') + U.duration(s.durationMins) + '</span>' +
              (s.required ? '<span>' + GGL.icon('check', 'ico') + 'Required</span>' : '') +
              '</span></span></li>';
          }).join('') + '</ul>' +
          kv([['Owner', r.owner], ['Enrolled', U.num(r.enrolled)], ['Completed', U.num(r.completed)],
              ['Created', U.date(r.createdAt, 'long')]]),
        actions: '<a class="btn btn-primary" href="' + GGL.url('app/courses.html') + '">View courses</a>'
      };
    }
  };

  /* -------------------------------------------------- Platform settings */
  function renderSettings(body) {
    var GROUPS = [
      { key: 'organisation', title: 'Organisation', icon: 'globe', fields: [
        ['name','Organisation name','text'], ['shortName','Short name','text'],
        ['primaryContact','Primary contact','text'], ['supportEmail','Support email','email'],
        ['timezone','Timezone','text'], ['fiscalYearStart','Fiscal year starts','text']]},
      { key: 'learning', title: 'Learning rules', icon: 'bookOpen', fields: [
        ['defaultPassMark','Default pass mark (%)','number'],
        ['maxAttempts','Maximum assessment attempts','number'],
        ['certificateValidityYears','Certificate validity (years)','number'],
        ['mandatoryCompletionDays','Mandatory completion window (days)','number'],
        ['attendanceThreshold','Minimum attendance (%)','number'],
        ['tofThreshold','TOF threshold (%)','number'],
        ['effectivenessThreshold','Effectiveness threshold (%)','number']]},
      { key: 'access', title: 'Access & security', icon: 'shield', fields: [
        ['ssoEnabled','Single sign-on','bool'], ['selfRegistration','Allow self-registration','bool'],
        ['mfaRequired','Require multi-factor authentication','bool'],
        ['sessionTimeoutMins','Session timeout (minutes)','number'],
        ['passwordMinLength','Minimum password length','number']]},
      { key: 'notifications', title: 'Notifications', icon: 'bell', fields: [
        ['sessionReminderHours','Session reminder (hours before)','number'],
        ['assessmentReminderDays','Assessment reminder (days before)','number'],
        ['escalateOverdueDays','Escalate overdue after (days)','number'],
        ['weeklyDigest','Send weekly digest','bool']]},
      { key: 'retention', title: 'Data retention', icon: 'database', fields: [
        ['learningRecordsYears','Learning records (years)','number'],
        ['auditLogYears','Audit log (years)','number'],
        ['attendanceYears','Attendance records (years)','number'],
        ['anonymiseOnExit','Anonymise records when a user leaves','bool']]}
    ];

    body.innerHTML = '<div class="tabs mb-5" role="tablist" aria-label="Settings groups">' +
        GROUPS.map(function (g, i) {
          return '<button type="button" class="tab" role="tab" id="ps-t' + i + '" ' +
            'aria-controls="ps-p' + i + '" aria-selected="' + (i === 0) + '">' + U.esc(g.title) + '</button>';
        }).join('') + '</div>' +
      GROUPS.map(function (g, i) {
        return '<div id="ps-p' + i + '" role="tabpanel" aria-labelledby="ps-t' + i + '"' +
          (i === 0 ? '' : ' hidden') + '><div class="card card-pad"><div class="skel skel-row"></div></div></div>';
      }).join('') +
      '<div class="card card-pad mt-5"><div class="row-between wrap gap-3">' +
        '<div><strong class="text-sm">Reset platform settings</strong>' +
        '<div class="text-xs text-muted">Restores every group to its shipped default.</div></div>' +
        '<button type="button" class="btn btn-danger-ghost btn-sm" data-reset-settings>' +
          GGL.icon('refresh', 'ico') + '<span>Reset to defaults</span></button></div></div>';

    UI.initTabs(body);

    S.platformSettings.get().then(function (settings) {
      GROUPS.forEach(function (g, i) {
        var panel = document.getElementById('ps-p' + i);
        var values = settings[g.key] || {};
        panel.innerHTML = '<div class="card"><div class="card-head"><div class="row gap-3">' +
            '<span class="stat-icon">' + GGL.icon(g.icon, 'ico') + '</span>' +
            '<div><h3>' + U.esc(g.title) + '</h3>' +
            '<p class="sub">Applies across the whole platform</p></div></div></div>' +
          '<div class="card-body"><form data-settings-form="' + g.key + '" novalidate>' +
            g.fields.map(function (f) {
              var val = values[f[0]];
              if (f[2] === 'bool') {
                return '<div class="criteria-row"><div><div class="c-label">' + U.esc(f[1]) + '</div></div>' +
                  '<label class="switch"><input type="checkbox" name="' + f[0] + '"' +
                    (val ? ' checked' : '') + '><span class="track"></span>' +
                  '<span class="sr-only">' + U.esc(f[1]) + '</span></label></div>';
              }
              return '<div class="field"><label class="label" for="ps-' + g.key + '-' + f[0] + '">' +
                U.esc(f[1]) + '</label><input class="input" id="ps-' + g.key + '-' + f[0] +
                '" name="' + f[0] + '" type="' + f[2] + '" value="' +
                U.esc(val === undefined ? '' : val) + '"></div>';
            }).join('') +
            '<button type="submit" class="btn btn-primary mt-4">Save ' +
              U.esc(g.title.toLowerCase()) + '</button></form></div></div>';

        UI.handleSubmit(panel.querySelector('form'), {}, function (v) {
          var payload = {};
          g.fields.forEach(function (f) {
            payload[f[0]] = f[2] === 'bool' ? !!v[f[0]] : f[2] === 'number' ? Number(v[f[0]]) : v[f[0]];
          });
          return S.platformSettings.save(g.key, payload);
        }, { reset: false, success: g.title + ' saved' });
      });
    });

    document.querySelector('[data-reset-settings]').addEventListener('click', function () {
      UI.confirm({ title: 'Reset platform settings?',
        message: 'Every settings group returns to its shipped default.',
        confirmLabel: 'Reset settings',
        onConfirm: function () {
          return S.platformSettings.reset().then(function () {
            UI.toast('Settings reset', { type: 'success', desc: 'Reloading…' });
            setTimeout(function () { window.location.reload(); }, 800);
          });
        }});
    });
  }

  /* ------------------------------------------------------------- Runner */
  function deniedHtml(message) {
    return '<div class="card"><div class="state">' +
      '<div class="state-icon danger">' + GGL.icon('lock', 'ico') + '</div>' +
      '<h3>You don\u2019t have access to this area</h3>' +
      '<p>' + U.esc(message) + '</p>' +
      '<a class="btn btn-primary" href="' + GGL.url('app/dashboard.html') + '">Back to dashboard</a>' +
      '</div></div>';
  }

  function openDetail(mod, row) {
    var d = mod.detail(row);
    UI.modal({
      title: d.title, subtitle: d.subtitle, size: 'lg', body: d.body,
      footer: '<button type="button" class="btn btn-secondary" data-close>Close</button>' + (d.actions || ''),
      onMount: function (h) {
        h.overlay.querySelector('[data-close]').addEventListener('click', h.close);
        var noop = h.overlay.querySelector('[data-noop]');
        if (noop) noop.addEventListener('click', function () {
          UI.toast('Not available in this build', { type: 'info',
            desc: 'File storage is planned for a later phase.' });
        });
      }
    });
  }

  function run(key) {
    var mod = MODULES[key];
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }

    var isLearner = user.role === GGL.ROLES.END_USER;

    if (key === 'platform') {
      var psBody = GGL.shell.mount({ active: 'platform', title: 'Platform settings',
        subtitle: 'Organisation, learning rules, access, notifications and retention.',
        breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Platform settings' }] });
      if (!psBody) return;
      if (user.role !== GGL.ROLES.SUPER_ADMIN) {
        psBody.innerHTML = deniedHtml('Platform settings are restricted to Super Admins.');
        return;
      }
      renderSettings(psBody);
      return;
    }

    if (!mod) return;
    var blocked = (mod.adminOnly && isLearner) ||
                  (mod.superAdminOnly && user.role !== GGL.ROLES.SUPER_ADMIN);

    var body = GGL.shell.mount({
      active: mod.active, title: mod.title, subtitle: mod.subtitle,
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: mod.crumb }],
      actions: blocked ? '' :
        '<button type="button" class="btn btn-secondary" data-export>' +
          GGL.icon('download', 'ico') + '<span>Export</span></button>' +
        (mod.newAction ? '<button type="button" class="btn btn-primary" data-new>' +
          GGL.icon('plus', 'ico') + '<span>' + U.esc(mod.newAction.label) + '</span></button>' : '')
    });
    if (!body) return;

    if (blocked) {
      body.innerHTML = deniedHtml(mod.superAdminOnly
        ? 'This area is restricted to Super Admins.'
        : 'This area is available to administrators.');
      return;
    }

    if (isLearner && mod.learnerView) { mod.learnerView(body, user); return; }

    body.innerHTML = '<div class="grid grid-4 mb-6" id="m-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-1-1 mb-6" id="m-charts">' +
        '<div class="card card-pad"><div class="skel skel-chart"></div></div>' +
        '<div class="card card-pad"><div class="skel skel-chart"></div></div></div>' +
      '<div id="m-table"></div>';

    UI.async(document.getElementById('m-stats'), UI.skeletonCards(4), function () {
      return mod.stats().then(function (html) { document.getElementById('m-stats').innerHTML = html; });
    });

    UI.async(document.getElementById('m-charts'),
      '<div class="card card-pad"><div class="skel skel-chart"></div></div>' +
      '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return mod.charts().then(function (parts) {
        document.getElementById('m-charts').innerHTML =
          parts.map(function (p) { return '<div>' + p + '</div>'; }).join('');
      });
    });

    var t = mod.table;
    var svc = t.service();

    var api = GGL.DataTable(document.getElementById('m-table'), {
      searchPlaceholder: t.searchPlaceholder, pageSize: 10,
      defaultSort: t.defaultSort, defaultDir: t.defaultDir,
      columns: t.columns, filters: t.filters,
      fetch: function (q) {
        /* Learners only ever see their own rows in the request centre */
        if (isLearner && key === 'requests') {
          return svc.list(q).then(function (page) {
            var mine = page.all.filter(function (r) { return r.requesterId === user.id; });
            var paged = U.paginate(mine, q.page, q.size);
            paged.all = mine;
            return paged;
          });
        }
        return svc.list(q);
      },
      onRowClick: function (row) { openDetail(mod, row); },
      rowActions: t.noRowActions ? null : function (row, tableApi) {
        var base = [{ label: 'View details', icon: 'eye', onClick: function (r) { openDetail(mod, r); } }];
        var extra = t.extraActions ? (t.extraActions(row, tableApi) || []) : [];
        if (!isLearner && !t.noDelete) {
          extra.push({ label: 'Delete', icon: 'trash', tone: 'danger', onClick: function (r) {
            UI.confirm({ title: 'Delete this record?',
              message: 'It will be removed from the prototype store.',
              onConfirm: function () {
                return svc.remove(r.id).then(function () {
                  UI.toast('Record deleted', { type: 'success' }); tableApi.reload();
                });
              }});
          }});
        }
        return base.concat(extra);
      },
      empty: { icon: 'inbox', title: 'Nothing here yet',
        message: 'Records will appear here as they are created.' }
    });

    document.querySelector('[data-export]').addEventListener('click', function () {
      svc.all().then(function (rows) {
        U.downloadCsv(mod.exportName + '-' + U.stamp() + '.csv', mod.columns, rows);
        UI.toast('Export downloaded', { type: 'success', desc: rows.length + ' records written to CSV.' });
      });
    });

    var newBtn = document.querySelector('[data-new]');
    if (newBtn && mod.newAction) {
      newBtn.addEventListener('click', function () { mod.newAction.run(function () { api.reload(); }); });
    }
  }

  function boot() {
    var key = window.GGL_MODULE;
    if (!key) return;
    run(key);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window.GGL = window.GGL || {});
