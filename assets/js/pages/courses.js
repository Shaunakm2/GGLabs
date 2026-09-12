/* GG Learning Labs — Course management */
(function (GGL) {
  'use strict';
  var U = GGL.utils, UI = GGL.ui, S = GGL.services;
  var view = U.store.get('coursesView', 'grid');
  var table = null, container = null;
  var gridState = { search: '', category: 'all', status: 'all', page: 1, size: 8 };

  var CATEGORIES = ['Leadership','Communication','Compliance','Technical','Customer Experience',
    'Process Excellence','Data & Analytics','Onboarding','Quality','Personal Effectiveness',
    'Capability Building','Safety','Sales'];
  var DELIVERY = ['E-Learning','Instructor-Led','Blended'];
  var LEVELS = ['Beginner','Intermediate','Advanced'];
  var STATUSES = ['Published','Draft','Archived'];

  function courseCard(c, i) {
    var variant = ['','v2','v3','v4'][i % 4];
    return '<article class="card card-interactive course-card" data-course="' + U.esc(c.id) + '">' +
      '<div class="course-thumb ' + variant + '"><span class="cat">' + U.esc(c.category) + '</span>' +
      GGL.icon(c.delivery === 'E-Learning' ? 'video' : c.delivery === 'Blended' ? 'layers' : 'users', 'ico') +
      '</div><div class="course-body">' +
        '<div class="row-between gap-2 mb-2">' + U.statusBadge(c.status) +
        (c.mandatory ? '<span class="badge badge-warning">Mandatory</span>' : '') + '</div>' +
        '<h3>' + U.esc(c.title) + '</h3>' +
        '<div class="course-meta">' +
          '<span>' + GGL.icon('user','ico') + U.esc(c.instructor) + '</span>' +
          '<span>' + GGL.icon('clock','ico') + U.duration(c.durationMins) + '</span>' +
          '<span>' + GGL.icon('layers','ico') + c.modules + ' modules</span>' +
          '<span>' + GGL.icon('users','ico') + U.num(c.enrolled) + '</span></div>' +
        '<div class="course-foot"><div class="text-xs text-muted mb-2">Completion</div>' +
          U.progressCell(c.completionRate) +
          '<div class="row gap-2 mt-3">' +
            '<button type="button" class="btn btn-sm btn-secondary grow" data-view="' + U.esc(c.id) + '">Details</button>' +
            '<button type="button" class="btn btn-sm btn-ghost btn-icon" data-edit="' + U.esc(c.id) + '" ' +
              'aria-label="Edit ' + U.esc(c.title) + '">' + GGL.icon('edit','ico') + '</button></div>' +
        '</div></div></article>';
  }

  function renderGrid(el) {
    el.innerHTML = '<div class="card mb-5"><div class="toolbar">' +
        '<div class="search"><label class="input-icon"><span class="sr-only">Search courses</span>' +
        GGL.icon('search','ico') + '<input type="search" class="input" id="grid-search" ' +
        'placeholder="Search courses…" value="' + U.esc(gridState.search) + '"></label></div>' +
        '<select class="select" id="grid-category"><option value="all">Category: All</option>' +
          CATEGORIES.map(function (c) {
            return '<option' + (gridState.category === c ? ' selected' : '') + '>' + U.esc(c) + '</option>';
          }).join('') + '</select>' +
        '<select class="select" id="grid-status"><option value="all">Status: All</option>' +
          STATUSES.map(function (s) {
            return '<option' + (gridState.status === s ? ' selected' : '') + '>' + U.esc(s) + '</option>';
          }).join('') + '</select>' +
      '</div></div><div id="grid-results"></div>';

    var results = document.getElementById('grid-results');

    function load() {
      results.innerHTML = '<div class="grid grid-4">' + UI.skeletonCards(8) + '</div>';
      S.courses.list({ search: gridState.search,
        filters: { category: gridState.category, status: gridState.status },
        sort: 'title', page: gridState.page, size: gridState.size
      }).then(function (meta) {
        if (!meta.rows.length) {
          results.innerHTML = '<div class="card">' + UI.empty({ icon: 'search',
            title: 'No courses found', message: 'Nothing matches the current search and filters.',
            action: 'Clear filters' }) + '</div>';
          var clear = results.querySelector('[data-empty-action]');
          if (clear) clear.addEventListener('click', function () {
            gridState.search = ''; gridState.category = 'all'; gridState.status = 'all';
            gridState.page = 1; renderGrid(el);
          });
          return;
        }
        var pages = '';
        for (var p = 1; p <= meta.pages; p++) {
          pages += '<button type="button" class="page-btn"' + (p === meta.page ? ' aria-current="page"' : '') +
            ' data-gpage="' + p + '">' + p + '</button>';
        }
        results.innerHTML = '<div class="grid grid-4 mb-5">' + meta.rows.map(courseCard).join('') + '</div>' +
          '<div class="card"><div class="pagination" style="border-top:0">' +
            '<span>Showing <strong>' + meta.from + '–' + meta.to + '</strong> of <strong>' + meta.total + '</strong></span>' +
            '<div class="pages"><button type="button" class="page-btn" data-gpage="' + (meta.page - 1) + '"' +
              (meta.page <= 1 ? ' disabled' : '') + ' aria-label="Previous page">' +
              GGL.icon('chevronLeft','ico') + '</button>' + pages +
              '<button type="button" class="page-btn" data-gpage="' + (meta.page + 1) + '"' +
              (meta.page >= meta.pages ? ' disabled' : '') + ' aria-label="Next page">' +
              GGL.icon('chevronRight','ico') + '</button></div></div></div>';

        U.$$('[data-gpage]', results).forEach(function (b) {
          b.addEventListener('click', function () {
            gridState.page = Number(b.getAttribute('data-gpage'));
            load(); window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        });
        U.$$('[data-view]', results).forEach(function (b) {
          b.addEventListener('click', function (e) {
            e.stopPropagation(); S.courses.get(b.getAttribute('data-view')).then(openDetail);
          });
        });
        U.$$('[data-edit]', results).forEach(function (b) {
          b.addEventListener('click', function (e) {
            e.stopPropagation(); S.courses.get(b.getAttribute('data-edit')).then(openEdit);
          });
        });
      }).catch(function (err) {
        results.innerHTML = '<div class="card">' + UI.error({ message: err.message }) + '</div>';
        results.querySelector('[data-retry]').addEventListener('click', load);
      });
    }

    var search = document.getElementById('grid-search');
    search.addEventListener('input', U.debounce(function () {
      gridState.search = search.value; gridState.page = 1; load();
    }, 280));
    document.getElementById('grid-category').addEventListener('change', function () {
      gridState.category = this.value; gridState.page = 1; load();
    });
    document.getElementById('grid-status').addEventListener('change', function () {
      gridState.status = this.value; gridState.page = 1; load();
    });
    load();
  }

  function renderTable(el) {
    table = GGL.DataTable(el, {
      searchPlaceholder: 'Search courses, categories or instructors…',
      pageSize: 10, defaultSort: 'title',
      columns: [
        { key: 'title', label: 'Course', sortable: true, primary: true,
          render: function (r) {
            return '<div class="fw-medium">' + U.esc(r.title) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.category) + ' · ' + U.esc(r.level) + '</div>';
          }},
        { key: 'delivery', label: 'Delivery', sortable: true, hideBelow: 'md' },
        { key: 'instructor', label: 'Instructor', sortable: true, hideBelow: 'lg' },
        { key: 'durationMins', label: 'Duration', sortable: true, hideBelow: 'lg',
          render: function (r) { return U.duration(r.durationMins); }},
        { key: 'enrolled', label: 'Enrolled', sortable: true, align: 'right', hideBelow: 'md',
          render: function (r) { return U.num(r.enrolled); }},
        { key: 'completionRate', label: 'Completion', sortable: true, width: '150px',
          render: function (r) { return U.progressCell(r.completionRate); }},
        { key: 'status', label: 'Status', sortable: true,
          render: function (r) { return U.statusBadge(r.status); }}
      ],
      filters: [
        { key: 'category', label: 'Category', options: CATEGORIES.map(function (c) { return { value: c, label: c }; })},
        { key: 'status', label: 'Status', options: STATUSES.map(function (s) { return { value: s, label: s }; })},
        { key: 'delivery', label: 'Delivery', options: DELIVERY.map(function (d) { return { value: d, label: d }; })}
      ],
      fetch: function (q) { return S.courses.list(q); },
      onRowClick: openDetail,
      rowActions: function () {
        return [
          { label: 'View details', icon: 'eye', onClick: openDetail },
          { label: 'Edit course', icon: 'edit', onClick: openEdit },
          { label: 'Duplicate', icon: 'layers', onClick: function (row) {
              var copy = Object.assign({}, row);
              delete copy.id;
              copy.title = row.title + ' (copy)'; copy.status = 'Draft';
              copy.enrolled = 0; copy.completed = 0; copy.completionRate = 0;
              S.courses.create(copy).then(function () {
                UI.toast('Course duplicated', { type: 'success', desc: 'Saved as a draft.' });
                table.reload();
              });
            }},
          { label: 'Delete course', icon: 'trash', tone: 'danger', onClick: function (row) {
              UI.confirm({ title: 'Delete this course?',
                message: '\u201C' + row.title + '\u201D will be removed along with its structure.',
                detail: row.enrolled ? U.num(row.enrolled) + ' learners are currently enrolled on this course.' : null,
                confirmLabel: 'Delete course',
                onConfirm: function () {
                  return S.courses.remove(row.id).then(function () {
                    UI.toast('Course deleted', { type: 'success' }); table.reload();
                  });
                }});
            }}
        ];
      },
      empty: { icon: 'book', title: 'No courses yet',
        message: 'Build your first course to start assigning learning.',
        action: 'Create course', onAction: openCreate }
    });
  }

  function mini(label, value) {
    return '<div class="card card-pad" style="padding:var(--sp-3);text-align:center">' +
      '<div class="fw-bold">' + U.esc(value) + '</div>' +
      '<div class="text-xs text-muted">' + U.esc(label) + '</div></div>';
  }

  function openDetail(c) {
    var linked = GGL.data.assessments.filter(function (a) { return a.courseId === c.id; });
    UI.modal({
      title: c.title, subtitle: c.category + ' · ' + c.delivery + ' · ' + c.level, size: 'lg',
      body: '<div class="row gap-2 mb-5 wrap">' + U.statusBadge(c.status) +
          (c.mandatory ? '<span class="badge badge-warning">Mandatory</span>' : '') +
          (c.hasScorm ? '<span class="badge badge-info">SCORM</span>' : '') +
          '<span class="badge badge-plain">' + GGL.icon('star','ico') + ' ' + c.rating + '</span></div>' +
        '<p class="text-muted">' + U.esc(c.description) + '</p>' +
        '<div class="grid grid-4 gap-3 my-5">' + mini('Modules', c.modules) + mini('Lessons', c.lessons) +
          mini('Assessments', c.assessments) + mini('Duration', U.duration(c.durationMins)) + '</div>' +
        '<div class="card card-pad mb-5"><div class="row-between mb-3">' +
          '<strong class="text-sm">Enrolment &amp; completion</strong>' +
          '<span class="text-sm text-muted">' + U.num(c.completed) + ' of ' + U.num(c.enrolled) + '</span></div>' +
          U.progressCell(c.completionRate) + '</div>' +
        '<div class="split-1-1 gap-3 mb-5">' +
          '<div class="card card-pad"><div class="row-between mb-2"><strong class="text-sm">Assessments</strong>' +
          '<a class="text-sm" href="' + GGL.url('app/assessments.html') + '">Manage</a></div>' +
          (linked.length ? '<ul style="list-style:none;padding:0;margin:0">' + linked.map(function (a) {
              return '<li class="row-between text-sm" style="padding:4px 0">' +
                '<span class="truncate">' + U.esc(a.type) + '</span>' +
                '<span class="badge badge-plain">' + a.attempts + ' attempts</span></li>';
            }).join('') + '</ul>'
            : '<p class="text-sm text-muted" style="margin:0">No assessments linked yet.</p>') + '</div>' +
          '<div class="card card-pad"><div class="row-between mb-2">' +
          '<strong class="text-sm">Certificates issued</strong>' +
          '<a class="text-sm" href="' + GGL.url('app/certificates.html') + '">Register</a></div>' +
          '<div class="fw-bold" style="font-size:var(--fs-2xl);line-height:1.1">' +
            U.num(c.certificatesIssued || 0) + '</div>' +
          '<div class="text-xs text-muted">Awarded on a passed post-assessment</div></div></div>' +
        '<div class="alert">' + GGL.icon('info','ico') + '<div class="text-sm">' +
          'Lesson content, uploads and SCORM packages are not implemented in this phase.</div></div>',
      footer: '<button type="button" class="btn btn-secondary" data-close>Close</button>' +
              '<button type="button" class="btn btn-primary" data-edit-course>Edit course</button>',
      onMount: function (h) {
        h.overlay.querySelector('[data-close]').addEventListener('click', h.close);
        h.overlay.querySelector('[data-edit-course]').addEventListener('click', function () {
          h.close(); setTimeout(function () { openEdit(c); }, 240);
        });
      }
    });
  }

  function courseForm(c) {
    c = c || {};
    function opts(list, sel) {
      return list.map(function (o) { return '<option' + (o === sel ? ' selected' : '') + '>' + U.esc(o) + '</option>'; }).join('');
    }
    return '<form id="course-form" novalidate>' +
      '<div class="field"><label class="label" for="cf-title">Course title <span class="req">*</span></label>' +
        '<input class="input" id="cf-title" name="title" type="text" value="' + U.esc(c.title || '') + '"></div>' +
      '<div class="field"><label class="label" for="cf-desc">Description <span class="req">*</span></label>' +
        '<textarea class="textarea" id="cf-desc" name="description">' + U.esc(c.description || '') + '</textarea></div>' +
      '<div class="grid grid-2 gap-4">' +
        '<div class="field"><label class="label" for="cf-cat">Category</label>' +
          '<select class="select" id="cf-cat" name="category">' + opts(CATEGORIES, c.category) + '</select></div>' +
        '<div class="field"><label class="label" for="cf-del">Delivery mode</label>' +
          '<select class="select" id="cf-del" name="delivery">' + opts(DELIVERY, c.delivery) + '</select></div></div>' +
      '<div class="grid grid-2 gap-4">' +
        '<div class="field"><label class="label" for="cf-lvl">Level</label>' +
          '<select class="select" id="cf-lvl" name="level">' + opts(LEVELS, c.level) + '</select></div>' +
        '<div class="field"><label class="label" for="cf-dur">Duration (minutes) <span class="req">*</span></label>' +
          '<input class="input" id="cf-dur" name="durationMins" type="number" min="15" max="4800" value="' +
          (c.durationMins || 120) + '"></div></div>' +
      '<div class="grid grid-2 gap-4">' +
        '<div class="field"><label class="label" for="cf-mod">Modules</label>' +
          '<input class="input" id="cf-mod" name="modules" type="number" min="1" max="40" value="' + (c.modules || 4) + '"></div>' +
        '<div class="field"><label class="label" for="cf-status">Status</label>' +
          '<select class="select" id="cf-status" name="status">' + opts(STATUSES, c.status) + '</select></div></div>' +
      '<div class="field"><label class="label" for="cf-inst">Instructor</label>' +
        '<select class="select" id="cf-inst" name="instructor">' +
          GGL.data.trainers.map(function (t) {
            return '<option' + (t.name === c.instructor ? ' selected' : '') + '>' + U.esc(t.name) + '</option>';
          }).join('') + '</select></div>' +
      '<label class="check"><input type="checkbox" name="mandatory"' + (c.mandatory ? ' checked' : '') + '>' +
        '<span>Mandatory course — assigned automatically to all learners</span></label>' +
      '<label class="check"><input type="checkbox" name="hasScorm"' + (c.hasScorm ? ' checked' : '') + '>' +
        '<span>Contains a SCORM package <span class="text-subtle">(upload not implemented)</span></span></label>' +
    '</form>';
  }

  var RULES = {
    title: [U.validators.required, U.validators.min(4)],
    description: [U.validators.required, U.validators.min(20)],
    durationMins: [U.validators.required, U.validators.numeric]
  };

  function normalise(v) {
    return Object.assign({}, v, { durationMins: Number(v.durationMins),
      modules: Number(v.modules), lessons: Number(v.modules) * 4, assessments: 1 });
  }

  function openCreate() {
    var handle = UI.modal({ title: 'Create course',
      subtitle: 'Define the course shell — structure and content come next.',
      size: 'lg', body: courseForm(null),
      footer: '<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
              '<button type="submit" form="course-form" class="btn btn-primary">' +
              GGL.icon('plus','ico') + '<span>Create course</span></button>' });
    handle.overlay.querySelector('[data-cancel]').addEventListener('click', handle.close);
    UI.handleSubmit(handle.overlay.querySelector('#course-form'), RULES, function (v) {
      return S.courses.create(Object.assign(normalise(v), { enrolled: 0, completed: 0,
        completionRate: 0, rating: 0, effectiveness: 0, trainerId: null,
        updatedAt: new Date().toISOString() }));
    }, { success: 'Course created', onDone: function () { handle.close(); refresh(); } });
  }

  function openEdit(c) {
    var handle = UI.modal({ title: 'Edit course', subtitle: c.title, size: 'lg', body: courseForm(c),
      footer: '<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
              '<button type="submit" form="course-form" class="btn btn-primary">Save changes</button>' });
    handle.overlay.querySelector('[data-cancel]').addEventListener('click', handle.close);
    UI.handleSubmit(handle.overlay.querySelector('#course-form'), RULES, function (v) {
      return S.courses.update(c.id, normalise(v));
    }, { reset: false, success: 'Course updated', onDone: function () { handle.close(); refresh(); } });
  }

  function refresh() { if (view === 'grid') renderGrid(container); else renderTable(container); }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }

    var q = new URLSearchParams(window.location.search).get('q');
    if (q) { gridState.search = q; view = 'grid'; }

    var body = GGL.shell.mount({
      active: 'courses', title: 'Courses',
      subtitle: 'Design, publish and manage the learning catalogue.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Courses' }],
      actions: '<div class="segmented" role="group" aria-label="View mode">' +
          '<button type="button" data-view-mode="grid" aria-pressed="' + (view === 'grid') + '">Grid</button>' +
          '<button type="button" data-view-mode="table" aria-pressed="' + (view === 'table') + '">Table</button></div>' +
        '<button type="button" class="btn btn-primary" data-create-course>' +
          GGL.icon('plus','ico') + '<span>Create course</span></button>'
    });
    if (!body) return;

    body.innerHTML = '<div id="courses-container"></div>';
    container = document.getElementById('courses-container');

    U.$$('[data-view-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        view = btn.getAttribute('data-view-mode');
        U.store.set('coursesView', view);
        U.$$('[data-view-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        refresh();
      });
    });
    document.querySelector('[data-create-course]').addEventListener('click', openCreate);
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
