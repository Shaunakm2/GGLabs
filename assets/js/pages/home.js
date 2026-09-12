/* GG Learning Labs — Public homepage */
(function (GGL) {
  'use strict';

  var U = GGL.utils;
  var UI = GGL.ui;

  var CAPABILITIES = [
    ['compass',     'Plan &amp; Analyse',  'TNA, TNI, skill-gap analysis and competency mapping that start from evidence, not guesswork.'],
    ['puzzle',      'Design &amp; Create', 'Course design, content development, SOPs and a searchable library in one repository.'],
    ['calendar',    'Train &amp; Manage',  'Calendar, scheduler, batches, trainers, trainees, sessions and attendance.'],
    ['bookOpen',    'Learn',               'Courses, modules, lessons, learning paths, progress tracking and certificates.'],
    ['checkSquare', 'Assess',              'Pre and post assessments that are graded live, with certificates issued on a pass.'],
    ['users',       'Develop',             'Coaching, mentoring, retraining, development plans and tasteful gamification.'],
    ['trending',    'Measure',             'Trainer observation and training effectiveness across reaction to results.'],
    ['barChart',    'Improve',             'Dashboards, reports and analytics that feed the next planning cycle.']
  ];

  var LIFECYCLE = [
    ['Identify', 'Surface the real capability gap'],
    ['Plan',     'Prioritise and schedule the intervention'],
    ['Create',   'Design content, assessments and SOPs'],
    ['Deliver',  'Run sessions, batches and self-paced learning'],
    ['Assess',   'Check knowledge before and after'],
    ['Measure',  'Observe trainers, measure effectiveness'],
    ['Develop',  'Coach, mentor and retrain where needed'],
    ['Improve',  'Feed the evidence back into planning']
  ];

  var MODULES = [
    ['Dashboards', true], ['Course Management', true], ['Batch Management', true],
    ['Training Calendar', true], ['Attendance', true], ['User Management', true],
    ['Training Effectiveness', true], ['Trainer Observation', true], ['Reports Centre', true],
    ['Notifications', true], ['Assessments', true], ['Certificates', true],
    ['Gamification', true], ['Data Export', true], ['TNA / TNI', true],
    ['Competency Mapping', true], ['Content Library', true], ['SOP Management', true],
    ['Coaching', true], ['Mentoring', true], ['Request Centre', true], ['Newsfeed', true],
    ['Learning Paths', true], ['Audit Log', true], ['Platform Settings', true],
    ['SCORM Playback', false], ['Question Authoring', false], ['File Uploads', false]
  ];

  var SERVICES = [
    ['graduation',    'Training delivery',   'Facilitators for leadership, behavioural, process and compliance programmes.'],
    ['puzzle',        'Content development', 'Storyboards, e-learning, job aids and assessment banks built to your context.'],
    ['messageCircle', 'Coaching',            'One-to-one and group coaching for managers and high-potential talent.'],
    ['users',         'Mentoring programmes','Design, matching frameworks and running of structured mentoring schemes.'],
    ['clipboard',     'SOP development',     'Process documentation written to survive an audit and be usable on the floor.'],
    ['lightbulb',     'L&amp;D consulting',  'Operating model, capability frameworks and measurement strategy.']
  ];

  var PRICING = [
    { name: 'Starter', monthly: 24000, yearly: 19200,
      desc: 'For a single L&amp;D team getting structure in place.',
      features: ['Up to 250 learners', 'Course &amp; batch management', 'Attendance tracking',
                 'Standard reports', 'Email support'],
      cta: 'Start free trial', featured: false },
    { name: 'Professional', monthly: 58000, yearly: 46400,
      desc: 'For organisations running continuous capability programmes.',
      features: ['Up to 2,000 learners', 'Everything in Starter', 'Training effectiveness',
                 'Trainer observation', 'Competency mapping', 'Priority support'],
      cta: 'Start free trial', featured: true },
    { name: 'Enterprise', monthly: null, yearly: null,
      desc: 'For multi-entity organisations with audit obligations.',
      features: ['Unlimited learners', 'Everything in Professional', 'SSO &amp; provisioning',
                 'Audit log &amp; retention controls', 'L&amp;D services bundle', 'Named success manager'],
      cta: 'Contact sales', featured: false }
  ];

  var ABOUT_POINTS = [
    ['target',   'Evidence-led',    'Every intervention traces back to an identified gap.'],
    ['shield',   'Audit-ready',     'Attendance, assessment and observation trails by default.'],
    ['layers',   'One ecosystem',   'No more reconciling five tools and a spreadsheet.'],
    ['trending', 'Measured impact', 'Effectiveness from reaction through to business results.']
  ];

  var FAQ = [
    ['Is this a Learning Management System?',
     'No — an LMS is one module inside it. GG Learning Labs covers planning and needs analysis, design and content, delivery and scheduling, assessment, effectiveness measurement, people development and analytics. Course delivery is a part of that, not the whole.'],
    ['What is actually working in this build?',
     'This is a frontend prototype, but the interactive parts are genuinely interactive. You can sit a graded assessment, which scores your answers, awards points and issues a certificate you can download. The Trainer Observation Form and Effectiveness Calculator reproduce the client workbooks exactly. Course, batch, user and attendance management all work, as do dashboards, reporting, the leaderboard and CSV exports that produce real files.'],
    ['Is there a backend connected?',
     'Not yet, and the prototype never pretends otherwise. All data comes from an in-memory mock layer behind a service interface. Edits you make persist in your browser only. The service layer is structured so a database and real authentication can replace it without rewriting the interface.'],
    ['How is data secured?',
     'In this phase it is not — and it should not be treated as though it is. The role-based navigation shapes what each persona sees, but that is presentation, not security. Real authorisation must be enforced server-side before any production use.'],
    ['Can we customise the observation and effectiveness forms?',
     'The observation criteria are defined as configurable data with weightings rather than hard-coded markup, so a form builder can be layered on without restructuring the module. The effectiveness weights are likewise a single data structure.'],
    ['Does it work on mobile?',
     'Yes. Every screen is built responsive down to 390px with real mobile layouts — a drawer navigation, stacked cards and scrollable tables — rather than a shrunken desktop view.']
  ];

  function renderCapabilities() {
    var el = document.getElementById('capabilities');
    if (!el) return;
    el.innerHTML = CAPABILITIES.map(function (c) {
      return '<article class="card card-interactive feature-card">' +
        '<div class="feature-icon">' + GGL.icon(c[0], 'ico') + '</div>' +
        '<h3>' + c[1] + '</h3><p>' + c[2] + '</p></article>';
    }).join('');
  }

  function renderLifecycle() {
    var el = document.getElementById('lifecycle-steps');
    if (!el) return;
    el.innerHTML = LIFECYCLE.map(function (s, i) {
      return '<div class="lifecycle-step"><div class="num">' + (i + 1) + '</div>' +
        '<h4>' + U.esc(s[0]) + '</h4><p>' + U.esc(s[1]) + '</p></div>';
    }).join('');
  }

  function renderModules() {
    var el = document.getElementById('module-pills');
    if (!el) return;
    el.innerHTML = MODULES.map(function (m) {
      return '<span class="module-pill' + (m[1] ? '' : ' soon') + '"' +
        (m[1] ? '' : ' title="Planned for a later phase"') + '>' +
        GGL.icon(m[1] ? 'check' : 'clock', 'ico') + '<span>' + U.esc(m[0]) + '</span>' +
        (m[1] ? '' : '<span class="badge badge-plain">Soon</span>') + '</span>';
    }).join('');
  }

  function renderServices() {
    var el = document.getElementById('services-grid');
    if (!el) return;
    el.innerHTML = SERVICES.map(function (s) {
      return '<article class="card card-interactive service-card">' +
        '<div class="feature-icon">' + GGL.icon(s[0], 'ico') + '</div>' +
        '<div><h3>' + s[1] + '</h3><p>' + s[2] + '</p></div></article>';
    }).join('');
  }

  function renderAboutPoints() {
    var el = document.getElementById('about-points');
    if (!el) return;
    el.innerHTML = ABOUT_POINTS.map(function (p) {
      return '<div class="card card-pad"><div class="feature-icon">' + GGL.icon(p[0], 'ico') + '</div>' +
        '<h4 style="font-size:var(--fs-base);margin-bottom:4px">' + U.esc(p[1]) + '</h4>' +
        '<p class="text-sm text-muted" style="margin:0">' + U.esc(p[2]) + '</p></div>';
    }).join('');
  }

  function renderPricing(period) {
    var el = document.getElementById('pricing-grid');
    if (!el) return;
    el.innerHTML = PRICING.map(function (p) {
      var amount = period === 'yearly' ? p.yearly : p.monthly;
      return '<article class="card price-card' + (p.featured ? ' featured' : '') + '">' +
        (p.featured ? '<span class="price-tag">Most popular</span>' : '') +
        '<h3>' + U.esc(p.name) + '</h3><p class="desc">' + p.desc + '</p>' +
        '<div class="price-amount">' +
          (amount === null ? '<span class="amt">Custom</span>'
            : '<span class="amt">' + U.money(amount) + '</span><span class="per">/ month</span>') +
        '</div>' +
        '<button type="button" class="btn ' + (p.featured ? 'btn-primary' : 'btn-secondary') +
          ' btn-block" data-plan="' + U.esc(p.name) + '">' + U.esc(p.cta) + '</button>' +
        '<ul class="price-feats">' + p.features.map(function (f) {
          return '<li>' + GGL.icon('check', 'ico') + '<span>' + f + '</span></li>';
        }).join('') + '</ul></article>';
    }).join('');

    U.$$('[data-plan]', el).forEach(function (btn) {
      btn.addEventListener('click', function () { planDialog(btn.getAttribute('data-plan')); });
    });
  }

  function renderFaq() {
    var el = document.getElementById('faq');
    if (!el) return;
    el.innerHTML = FAQ.map(function (f, i) {
      var id = 'faq-a-' + i;
      return '<div class="faq-item"><button type="button" class="faq-q" aria-expanded="false" ' +
        'aria-controls="' + id + '"><span>' + U.esc(f[0]) + '</span>' +
        GGL.icon('chevronDown', 'ico') + '</button>' +
        '<div class="faq-a" id="' + id + '"><p>' + U.esc(f[1]) + '</p></div></div>';
    }).join('');
  }

  function renderSocial() {
    var el = document.getElementById('social-links');
    if (!el) return;
    el.innerHTML = [['twitter', 'X'], ['linkedin', 'LinkedIn'], ['youtube', 'YouTube'], ['globe', 'Website']]
      .map(function (s) {
        return '<a href="#support" aria-label="' + s[1] + ' (placeholder link)">' + GGL.icon(s[0], 'ico') + '</a>';
      }).join('');
  }

  function renderMockup() {
    var stats = document.getElementById('mockup-stats');
    if (stats) {
      stats.innerHTML = [
        ['Learners', '1,284', 'users', ''], ['Active batches', '18', 'layers', 'teal'],
        ['Completion', '78%', 'checkCircle', 'green'], ['Effectiveness', '84', 'trending', 'violet']
      ].map(function (s) {
        return '<div class="card stat" style="padding:var(--sp-4)"><div class="stat-top">' +
          '<span class="stat-label">' + s[0] + '</span>' +
          '<span class="stat-icon ' + s[3] + '">' + GGL.icon(s[2], 'ico') + '</span></div>' +
          '<div class="stat-value" style="font-size:var(--fs-xl)">' + s[1] + '</div></div>';
      }).join('');
    }

    var chart = document.getElementById('mockup-chart');
    if (chart) {
      chart.innerHTML = '<div class="row-between mb-3"><strong class="text-sm">Training activity</strong>' +
        '<span class="badge badge-success">+12%</span></div>' +
        GGL.charts.line([40, 52, 47, 63, 58, 71, 76, 84].map(function (v, i) {
          return { label: ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov'][i], value: v };
        }), { height: 170 });
    }

    var donut = document.getElementById('mockup-donut');
    if (donut) {
      donut.innerHTML = '<div class="mb-3"><strong class="text-sm">Attendance</strong></div>' +
        GGL.charts.donut([
          { label: 'Present', value: 78 }, { label: 'Late', value: 10 },
          { label: 'Absent', value: 7 }, { label: 'Excused', value: 5 }
        ], { size: 120, stroke: 18, centreValue: '88%', centreLabel: 'attended', legend: false });
    }
  }

  function planDialog(plan) {
    var isEnterprise = plan === 'Enterprise';
    var handle = UI.modal({
      title: isEnterprise ? 'Talk to sales' : 'Start your ' + plan + ' trial',
      subtitle: 'Checkout is not connected in this prototype — this is a mock workflow.',
      size: 'sm',
      body: '<form id="plan-form" novalidate>' +
          '<div class="field"><label class="label" for="pf-name">Full name <span class="req">*</span></label>' +
            '<input class="input" id="pf-name" name="name" type="text" autocomplete="name"></div>' +
          '<div class="field"><label class="label" for="pf-email">Work email <span class="req">*</span></label>' +
            '<input class="input" id="pf-email" name="email" type="email" autocomplete="email"></div>' +
          '<div class="field"><label class="label" for="pf-org">Organisation</label>' +
            '<input class="input" id="pf-org" name="org" type="text" autocomplete="organization"></div>' +
          '<div class="alert">' + GGL.icon('info', 'ico') + '<div class="text-sm">Selected plan: <strong>' +
            U.esc(plan) + '</strong></div></div></form>',
      footer: '<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
              '<button type="submit" form="plan-form" class="btn btn-primary">' +
              (isEnterprise ? 'Request a call' : 'Start trial') + '</button>'
    });

    handle.overlay.querySelector('[data-cancel]').addEventListener('click', handle.close);
    UI.handleSubmit(handle.overlay.querySelector('#plan-form'),
      { name: [U.validators.required], email: [U.validators.required, U.validators.email] },
      function () { return U.delay(800); },
      { success: isEnterprise ? 'Request received' : 'Trial request received',
        successDesc: 'A member of the team would be in touch — mock submission only.',
        onDone: handle.close });
  }

  function demoDialog() {
    var handle = UI.modal({
      title: 'Request a demo',
      subtitle: 'Or skip the queue — sign in with a demo account right now.',
      size: 'sm',
      body: '<form id="demo-form" novalidate>' +
          '<div class="field"><label class="label" for="df-name">Full name <span class="req">*</span></label>' +
            '<input class="input" id="df-name" name="name" type="text" autocomplete="name"></div>' +
          '<div class="field"><label class="label" for="df-email">Work email <span class="req">*</span></label>' +
            '<input class="input" id="df-email" name="email" type="email" autocomplete="email"></div>' +
          '<div class="field"><label class="label" for="df-size">Learner population</label>' +
            '<select class="select" id="df-size" name="size"><option>Under 250</option>' +
            '<option>250 – 1,000</option><option>1,000 – 5,000</option><option>5,000+</option>' +
            '</select></div></form>',
      footer: '<a class="btn btn-ghost" href="' + GGL.url('login.html') + '">Use a demo account</a>' +
              '<button type="submit" form="demo-form" class="btn btn-primary">Request demo</button>'
    });

    UI.handleSubmit(handle.overlay.querySelector('#demo-form'),
      { name: [U.validators.required], email: [U.validators.required, U.validators.email] },
      function () { return U.delay(800); },
      { success: 'Demo requested', successDesc: 'Mock submission — nothing was sent.', onDone: handle.close });
  }

  function videoDialog() {
    UI.modal({
      title: 'Product overview',
      subtitle: 'Video is a placeholder in this prototype.',
      size: 'lg',
      body: '<div class="video-frame" style="cursor:default;box-shadow:none">' +
        '<span class="video-play">' + GGL.icon('play', 'ico') + '</span>' +
        '<span class="video-caption"><strong>No video attached yet</strong>' +
        '<span>Drop an MP4 or embed URL here when the asset is ready.</span></span></div>'
    });
  }

  function init() {
    GGL.theme.init();
    renderCapabilities(); renderLifecycle(); renderModules(); renderServices();
    renderAboutPoints(); renderPricing('monthly'); renderFaq(); renderSocial(); renderMockup();
    UI.initAccordion(document);

    U.$$('[data-icon]').forEach(function (n) {
      n.insertAdjacentHTML('afterbegin', GGL.icon(n.getAttribute('data-icon'), 'ico'));
    });

    var navBtn = document.querySelector('[data-nav-toggle]');
    var mobileNav = document.getElementById('mobile-nav');
    if (navBtn) {
      navBtn.innerHTML = GGL.icon('menu', 'ico');
      navBtn.addEventListener('click', function () {
        var open = mobileNav.classList.toggle('open');
        navBtn.setAttribute('aria-expanded', String(open));
        navBtn.innerHTML = GGL.icon(open ? 'close' : 'menu', 'ico');
        navBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      U.$$('a', mobileNav).forEach(function (a) {
        a.addEventListener('click', function () {
          mobileNav.classList.remove('open');
          navBtn.setAttribute('aria-expanded', 'false');
          navBtn.innerHTML = GGL.icon('menu', 'ico');
        });
      });
    }

    var header = document.getElementById('site-header');
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    U.$$('[data-billing]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        U.$$('[data-billing]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        renderPricing(btn.getAttribute('data-billing'));
      });
    });

    var video = document.querySelector('[data-video]');
    if (video) {
      video.querySelector('.video-play').innerHTML = GGL.icon('play', 'ico');
      video.addEventListener('click', videoDialog);
    }
    U.$$('[data-demo-request]').forEach(function (b) { b.addEventListener('click', demoDialog); });

    var contact = document.getElementById('contact-form');
    if (contact) {
      UI.handleSubmit(contact, {
        name: [U.validators.required],
        email: [U.validators.required, U.validators.email],
        message: [U.validators.required, U.validators.min(10)]
      }, function () { return U.delay(900); },
        { success: 'Message sent', successDesc: 'Mock submission — no data left your browser.' });
    }

    var newsletter = document.getElementById('newsletter-form');
    if (newsletter) {
      UI.handleSubmit(newsletter, { email: [U.validators.required, U.validators.email] },
        function () { return U.delay(750); },
        { success: 'You are subscribed', successDesc: 'Mock subscription for the prototype.' });
    }

    var sections = U.$$('main section[id]');
    var links = U.$$('.site-nav a');
    if ('IntersectionObserver' in window && sections.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id);
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach(function (s) { io.observe(s); });
    }

    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
