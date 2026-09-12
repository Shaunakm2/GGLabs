/* GG Learning Labs — Effectiveness, observations, activity, notifications, reports */
(function (GGL) {
  'use strict';

  var S = GGL.seed;

  var OBSERVATION_CRITERIA = [
    { id: 'knowledge',     label: 'Subject knowledge',     weight: 15, desc: 'Command of content, accuracy, depth of examples.' },
    { id: 'communication', label: 'Communication',         weight: 15, desc: 'Clarity, pace, language, audibility.' },
    { id: 'engagement',    label: 'Learner engagement',    weight: 15, desc: 'Participation drawn from the room, energy sustained.' },
    { id: 'delivery',      label: 'Content delivery',      weight: 15, desc: 'Structure, sequencing, use of materials and aids.' },
    { id: 'time',          label: 'Time management',       weight: 10, desc: 'Adherence to plan, pacing across sections.' },
    { id: 'interaction',   label: 'Learner interaction',   weight: 10, desc: 'Questioning technique, handling responses.' },
    { id: 'examples',      label: 'Practical examples',    weight: 10, desc: 'Relevance of examples to the learner\u2019s role.' },
    { id: 'overall',       label: 'Overall effectiveness', weight: 10, desc: 'Holistic judgement of the session.' }
  ];

  var OBSERVATIONS = [];
  GGL.data.trainers.forEach(function (trainer) {
    var count = S.int(1, 3);
    for (var i = 0; i < count; i++) {
      var scores = {}, weighted = 0;
      OBSERVATION_CRITERIA.forEach(function (c) {
        var v = S.int(3, 5);
        scores[c.id] = v;
        weighted += (v / 5) * c.weight;
      });
      OBSERVATIONS.push({
        id: 'obs_' + String(OBSERVATIONS.length + 1).padStart(3, '0'),
        trainerId: trainer.id, trainer: trainer.name,
        observer: S.pick(['Aditi Raghunathan', 'Rohan Mehta', 'Quality Team']),
        date: S.day(-S.int(2, 150)),
        sessionTitle: S.pick(GGL.data.courses).title,
        batchName: S.pick(GGL.data.batches).name,
        scores: scores, score: S.round(weighted, 1),
        rating: weighted >= 85 ? 'Exceeds' : weighted >= 70 ? 'Meets' : 'Needs development',
        strengths: S.pick([
          'Strong structure and clear sectional transitions.',
          'Excellent use of role-relevant examples throughout.',
          'Sustained participation from the full room.',
          'Confident handling of challenging questions.'
        ]),
        development: S.pick([
          'Allow longer wait time after open questions.',
          'Tighten the closing summary — it ran over by eight minutes.',
          'Increase practice time relative to input.',
          'Check understanding more frequently in the first hour.'
        ]),
        status: S.bool(0.85) ? 'Completed' : 'Draft'
      });
    }
  });

  var EFFECTIVENESS = GGL.data.courses
    .filter(function (c) { return c.status === 'Published'; })
    .map(function (c) {
      var pre = S.int(38, 62), post = Math.min(pre + S.int(14, 38), 99);
      return {
        courseId: c.id, course: c.title, category: c.category, trainer: c.instructor,
        responses: S.int(18, 240), reaction: S.round(3.5 + S.rand() * 1.5, 1),
        learning: post, preScore: pre, postScore: post, gain: post - pre,
        behaviour: S.int(48, 92), results: S.int(40, 88),
        satisfaction: S.int(68, 98), recommendRate: S.int(62, 99), overall: c.effectiveness
      };
    });

  var ACTIVITY_TYPES = [
    { type: 'user_created',     icon: 'userPlus',    text: 'created a new learner account for' },
    { type: 'course_published', icon: 'book',        text: 'published the course' },
    { type: 'batch_created',    icon: 'layers',      text: 'created batch' },
    { type: 'training_done',    icon: 'checkCircle', text: 'marked training complete for' },
    { type: 'assessment',       icon: 'checkSquare', text: 'submitted an assessment for' },
    { type: 'observation',      icon: 'eye',         text: 'recorded a trainer observation for' },
    { type: 'request',          icon: 'inbox',       text: 'raised a content request for' }
  ];

  var ACTIVITY = [];
  for (var a = 0; a < 22; a++) {
    var t = S.pick(ACTIVITY_TYPES);
    var actor = S.pick(GGL.data.users.filter(function (u) { return u.role !== GGL.ROLES.END_USER; }));
    ACTIVITY.push({
      id: 'act_' + a, type: t.type, icon: t.icon, actor: actor.name, text: t.text,
      subject: t.type === 'batch_created' ? S.pick(GGL.data.batches).name
             : t.type === 'course_published' ? S.pick(GGL.data.courses).title
             : t.type === 'observation' ? S.pick(GGL.data.trainers).name
             : S.pick(GGL.data.users).name,
      at: S.day(-S.int(0, 6), S.int(8, 19), S.int(0, 59))
    });
  }
  ACTIVITY.sort(function (x, y) { return new Date(y.at) - new Date(x.at); });

  var NOTIF_DEFS = [
    ['training_reminder', 'bell',        'Session tomorrow: {course}', 'Starts at 10:00 in Training Room A. Please arrive five minutes early.'],
    ['course_assigned',   'book',        'New course assigned: {course}', 'Assigned by your L&D team. Target completion in 14 days.'],
    ['assessment_due',    'checkSquare', 'Assessment due: {course}', 'Your post-assessment closes in 48 hours.'],
    ['certificate',       'award',       'Certificate issued', 'Your certificate for {course} is ready to download.'],
    ['request_update',    'inbox',       'Request moved to In Progress', 'Your content development request has been assigned to a designer.'],
    ['announcement',      'megaphone',   'New learning path published', 'The Leadership Essentials path is now open for nominations.'],
    ['system',            'server',      'Scheduled maintenance', 'The platform will be briefly unavailable on Sunday 02:00–04:00 IST.']
  ];

  var NOTIFICATIONS = [];
  for (var n = 0; n < 16; n++) {
    var d = NOTIF_DEFS[n % NOTIF_DEFS.length];
    var course = S.pick(GGL.data.courses).title;
    NOTIFICATIONS.push({
      id: 'ntf_' + String(n + 1).padStart(3, '0'), type: d[0], icon: d[1],
      title: d[2].replace('{course}', course), body: d[3].replace('{course}', course),
      at: S.day(-S.int(0, 9), S.int(7, 20), S.int(0, 59)),
      read: n > 4 ? S.bool(0.7) : false
    });
  }
  NOTIFICATIONS.sort(function (x, y) { return new Date(y.at) - new Date(x.at); });

  var REPORTS = [
    ['Course Completion', 'Completion rates by course, category and department.', 'barChart'],
    ['Attendance Summary', 'Present, absent, late and excused across sessions.', 'userCheck'],
    ['Batch Performance', 'Progress, attendance and assessment outcomes per batch.', 'layers'],
    ['Assessment Results', 'Pre/post scores, pass rates and question analysis.', 'checkSquare'],
    ['Training Effectiveness', 'Reaction, learning, behaviour and results measures.', 'trending'],
    ['Trainer Performance', 'Observation scores, hours delivered and learner feedback.', 'briefcase'],
    ['Competency Gaps', 'Current vs required levels by role and department.', 'target'],
    ['Learning Hours', 'Hours consumed by department, month and delivery mode.', 'clock'],
    ['Graduation & Retraining', 'Outcome distribution across completed batches.', 'graduation'],
    ['Learner Progress', 'Individual progress against assigned learning.', 'activity']
  ].map(function (r, i) {
    return {
      id: 'rpt_' + String(i + 1).padStart(3, '0'), name: r[0], description: r[1], icon: r[2],
      category: i < 4 ? 'Operations' : i < 7 ? 'Quality' : 'People',
      lastRun: S.day(-S.int(0, 21), S.int(8, 18), 0),
      records: S.int(120, 8400), format: ['PDF', 'Excel', 'CSV']
    };
  });

  var MY_LEARNING = S.picks(GGL.data.courses.filter(function (c) { return c.status === 'Published'; }), 7)
    .map(function (c, i) {
      var progress = i === 0 ? 68 : i === 1 ? 35 : i === 2 ? 100 : i === 3 ? 100 : i < 5 ? S.int(5, 90) : 0;
      return {
        id: 'enr_' + c.id, courseId: c.id, title: c.title, category: c.category,
        instructor: c.instructor, delivery: c.delivery, durationMins: c.durationMins,
        modules: c.modules, lessonsDone: Math.round(c.lessons * progress / 100), lessons: c.lessons,
        progress: progress,
        status: progress === 100 ? 'Completed' : progress === 0 ? 'Not Started' : 'In Progress',
        dueDate: S.day(S.int(-6, 40)),
        lastAccessed: progress ? S.day(-S.int(0, 12), S.int(9, 21), 0) : null,
        mandatory: c.mandatory, certificate: progress === 100
      };
    });

  var COMPETENCIES = [
    ['Communication', 4, 2], ['Problem Solving', 4, 3], ['Process Knowledge', 5, 4],
    ['Stakeholder Management', 3, 2], ['Data Literacy', 4, 2], ['Quality Orientation', 4, 4],
    ['Leadership', 3, 1], ['Domain Expertise', 5, 4]
  ].map(function (c) {
    return { name: c[0], required: c[1], current: c[2], gap: Math.max(0, c[1] - c[2]),
      priority: (c[1] - c[2]) >= 2 ? 'High' : (c[1] - c[2]) === 1 ? 'Medium' : 'Met' };
  });

  var BADGES = [
    { name: 'Fast Starter', icon: 'zap', earned: true, desc: 'Completed first course within 7 days' },
    { name: 'Compliance Clear', icon: 'shield', earned: true, desc: 'All mandatory training current' },
    { name: 'Knowledge Seeker', icon: 'bookOpen', earned: true, desc: '25+ learning hours logged' },
    { name: 'Perfect Attendance', icon: 'userCheck', earned: true, desc: 'No absences across a full batch' },
    { name: 'Assessment Ace', icon: 'star', earned: false, desc: 'Score 90%+ on five assessments' },
    { name: 'Mentor', icon: 'users', earned: false, desc: 'Support three colleagues to completion' }
  ];

  GGL.data.observationCriteria = OBSERVATION_CRITERIA;
  GGL.data.observations = OBSERVATIONS;
  GGL.data.effectivenessDimensions = [
    { key: 'reaction', label: 'Reaction', desc: 'Learner satisfaction with the session' },
    { key: 'learning', label: 'Learning', desc: 'Knowledge gain, pre vs post assessment' },
    { key: 'behaviour', label: 'Behaviour', desc: 'On-the-job application at 30/60 days' },
    { key: 'results', label: 'Results', desc: 'Business outcome contribution' }
  ];
  GGL.data.effectiveness = EFFECTIVENESS;
  GGL.data.activity = ACTIVITY;
  GGL.data.notifications = NOTIFICATIONS;
  GGL.data.reports = REPORTS;
  GGL.data.myLearning = MY_LEARNING;
  GGL.data.competencies = COMPETENCIES;
  GGL.data.badges = BADGES;

  var MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  GGL.data.series = {
    userGrowth: MONTHS.map(function (m, i) { return { label: m, value: 640 + i * S.int(28, 72) + S.int(-18, 18) }; }),
    trainingActivity: MONTHS.map(function (m) { return { label: m, value: S.int(18, 64) }; }),
    completion: MONTHS.map(function (m, i) { return { label: m, value: Math.min(96, 58 + i * 2 + S.int(-7, 9)) }; }),
    effectivenessTrend: MONTHS.map(function (m, i) { return { label: m, value: Math.min(94, Math.round(64 + i * 1.8 + S.int(-5, 6))) }; }),
    hoursByMode: [
      { label: 'E-Learning', value: 4820 }, { label: 'Instructor-Led', value: 3140 },
      { label: 'Blended', value: 2260 }, { label: 'Coaching', value: 880 }
    ],
    userDistribution: [
      { label: 'Learners', value: 97 }, { label: 'Admins', value: 15 }, { label: 'Super Admins', value: 5 }
    ],
    attendanceSplit: [
      { label: 'Present', value: 78 }, { label: 'Late', value: 10 },
      { label: 'Absent', value: 7 }, { label: 'Excused', value: 5 }
    ],
    deptCompletion: S.DEPTS.slice(0, 6).map(function (d) { return { label: d, value: S.int(48, 96) }; })
  };

})(window.GGL = window.GGL || {});
