/* ==========================================================================
   GG Learning Labs — Assessments, attempts, certificates, points

   The connective tissue of the prototype:

     course ──> assessment ──> attempt ──> certificate
                                  │            │
                                  └──> points ─┴──> badges ──> leaderboard
   ========================================================================== */
(function (GGL) {
  'use strict';

  var S = GGL.seed;
  var D = GGL.data;

  var learners = D.users.filter(function (u) { return u.role === GGL.ROLES.END_USER; });
  var published = D.courses.filter(function (c) { return c.status === 'Published'; });

  var QUESTION_POOL = {
    'Compliance': [
      ['Who can raise a complaint under the organisation\u2019s POSH policy?',
        ['Only permanent female employees', 'Any employee, contractor or visitor at the workplace',
         'Only employees who have completed probation', 'Only the reporting manager on behalf of a team member'], 1],
      ['What is the first action on discovering a suspected data breach?',
        ['Attempt to fix it quietly', 'Report it immediately through the incident channel',
         'Wait for confirmation before escalating', 'Email the affected customers directly'], 1],
      ['Which of these counts as personal data under privacy regulation?',
        ['An aggregated headcount report', 'A work email address linked to a named individual',
         'A published office address', 'A generic role description'], 1],
      ['How long must mandatory compliance training records be retained?',
        ['Until the end of the current quarter', 'For the period defined in the retention schedule',
         'They need not be retained', 'Until the employee leaves'], 1],
      ['A colleague shares their system password with you to cover leave. You should:',
        ['Use it only for urgent work', 'Decline and request delegated access through the correct process',
         'Use it and change it afterwards', 'Share it with the wider team for continuity'], 1]
    ],
    'Leadership': [
      ['A team member misses a deadline for the first time. The most effective first step is to:',
        ['Escalate to their skip-level manager', 'Hold a private conversation to understand the cause',
         'Reassign their work immediately', 'Raise it in the next team meeting'], 1],
      ['In a coaching conversation, the manager should mostly be:',
        ['Advising', 'Listening and questioning', 'Instructing', 'Evaluating'], 1],
      ['Which best describes situational leadership?',
        ['Applying one consistent style for fairness', 'Adapting style to the individual\u2019s competence and commitment',
         'Delegating everything to senior members', 'Leading primarily through authority'], 1],
      ['The clearest sign of psychological safety in a team is that members:',
        ['Always agree in meetings', 'Raise problems and admit mistakes without fear',
         'Rarely need manager input', 'Complete work ahead of schedule'], 1],
      ['Effective delegation requires you to transfer:',
        ['Accountability only', 'The task, the authority to do it, and clear success criteria',
         'The task without context', 'Responsibility for the outcome entirely'], 1]
    ],
    'Communication': [
      ['The main purpose of active listening is to:',
        ['Prepare your response', 'Understand the speaker\u2019s meaning and intent',
         'Identify errors in their argument', 'Fill silences in conversation'], 1],
      ['When writing a business update, the key message should appear:',
        ['In the closing paragraph', 'At the start, before supporting detail',
         'Spread evenly throughout', 'Only in the subject line'], 1],
      ['Which is the strongest opening for a difficult message?',
        ['A lengthy apology', 'A clear statement of the situation and its impact',
         'An unrelated pleasantry', 'A list of who is responsible'], 1],
      ['Presenting to a mixed technical and non-technical audience, you should:',
        ['Use full technical depth throughout', 'Lead with outcomes and keep detail available on request',
         'Avoid all specifics', 'Split into two separate sessions always'], 1],
      ['Non-verbal signals matter most when:',
        ['The content is purely factual', 'There is a mismatch between words and delivery',
         'The audience is small', 'The session is recorded'], 1]
    ],
    'Process Excellence': [
      ['The purpose of a root cause analysis is to:',
        ['Assign responsibility for the failure', 'Identify the underlying cause so the issue does not recur',
         'Document the incident for audit', 'Estimate the cost of the failure'], 1],
      ['In the "5 Whys" technique, you stop asking why when:',
        ['You have asked exactly five times', 'You reach a cause you can actually control and fix',
         'The team agrees on a culprit', 'The answer becomes uncomfortable'], 1],
      ['Which is a measure of process capability rather than process output?',
        ['Units produced this week', 'Variation of the process against specification limits',
         'Revenue for the period', 'Number of staff assigned'], 1],
      ['Waste in a lean context is best defined as:',
        ['Any cost incurred', 'Any activity the customer would not pay for',
         'Any manual step', 'Any rework by junior staff'], 1],
      ['A control chart is primarily used to distinguish:',
        ['Good staff from poor staff', 'Common-cause variation from special-cause variation',
         'Fixed cost from variable cost', 'Planned work from unplanned work'], 1]
    ],
    'Technical': [
      ['In a spreadsheet, which function returns a value from a table by matching a key?',
        ['CONCAT', 'VLOOKUP or XLOOKUP', 'TRIM', 'NOW'], 1],
      ['The clearest chart for showing a trend over twelve months is a:',
        ['Pie chart', 'Line chart', 'Doughnut chart', 'Treemap'], 1],
      ['A dashboard should open by answering:',
        ['Every possible question', 'The single most important question for its audience',
         'Questions about data sources', 'Questions about methodology'], 1],
      ['Before automating a process you should first:',
        ['Buy the tooling', 'Stabilise and document the process',
         'Train all users', 'Remove all manual steps'], 1],
      ['Accessible colour use in a report means:',
        ['Using as many colours as possible', 'Never relying on colour alone to convey meaning',
         'Using only greyscale', 'Matching the brand palette exactly'], 1]
    ],
    'General': [
      ['The most effective way to prioritise competing tasks is to assess:',
        ['Which is quickest', 'Impact against urgency', 'Who asked most recently', 'Which is most enjoyable'], 1],
      ['Feedback is most useful when it is:',
        ['General and positive', 'Specific, timely and behaviour-focused',
         'Delivered in writing only', 'Saved for the annual review'], 1],
      ['A SMART objective must always be:',
        ['Ambitious and vague', 'Specific, measurable, achievable, relevant and time-bound',
         'Set by the manager alone', 'Reviewed only at year end'], 1],
      ['The main benefit of documenting a process is that it:',
        ['Satisfies auditors', 'Makes performance repeatable and transferable',
         'Reduces headcount', 'Replaces training'], 1],
      ['Continuous improvement depends most on:',
        ['Large annual projects', 'Regular small changes informed by evidence',
         'External consultants', 'New technology'], 1]
    ]
  };

  function questionsFor(category, count) {
    var pool = QUESTION_POOL[category] || QUESTION_POOL.General;
    var picked = S.picks(pool, Math.min(count, pool.length));
    while (picked.length < count) {
      var extra = S.pick(QUESTION_POOL.General);
      if (picked.indexOf(extra) === -1) picked.push(extra); else break;
    }
    return picked.map(function (q, i) {
      return { id: 'q' + (i + 1), text: q[0], options: q[1], correct: q[2], marks: 1 };
    });
  }

  var ASSESSMENTS = [];
  published.forEach(function (c, idx) {
    [['Pre', 'Pre-assessment'], ['Post', 'Post-assessment']].forEach(function (kind) {
      ASSESSMENTS.push({
        id: 'asm_' + String(ASSESSMENTS.length + 1).padStart(3, '0'),
        courseId: c.id, course: c.title, category: c.category,
        title: c.title + ' — ' + kind[1],
        type: kind[0] === 'Pre' ? 'Pre-assessment' : 'Post-assessment',
        stage: kind[0], questions: questionsFor(c.category, 5),
        passMark: kind[0] === 'Pre' ? 0 : 70, durationMins: 15,
        status: idx < 14 ? 'Published' : 'Draft', mandatory: c.mandatory,
        createdAt: c.createdAt, attempts: 0, avgScore: 0, passRate: 0
      });
    });
  });

  ['Compliance', 'Leadership', 'Communication'].forEach(function (cat, i) {
    ASSESSMENTS.push({
      id: 'asm_kc_' + (i + 1), courseId: null, course: '—', category: cat,
      title: cat + ' Knowledge Check', type: 'Knowledge check', stage: 'Check',
      questions: questionsFor(cat, 5), passMark: 60, durationMins: 10,
      status: 'Published', mandatory: false, createdAt: S.day(-S.int(40, 200)),
      attempts: 0, avgScore: 0, passRate: 0
    });
  });

  var ATTEMPTS = [];
  ASSESSMENTS.filter(function (a) { return a.status === 'Published'; }).forEach(function (a) {
    S.picks(learners, S.int(6, 22)).forEach(function (learner) {
      var score = a.stage === 'Pre' ? S.int(32, 64) : S.int(58, 100);
      ATTEMPTS.push({
        id: 'att_' + a.id + '_' + learner.id, assessmentId: a.id, assessment: a.title,
        stage: a.stage, courseId: a.courseId, course: a.course, category: a.category,
        userId: learner.id, name: learner.name, employeeId: learner.employeeId,
        department: learner.department, score: score,
        correct: Math.round((score / 100) * a.questions.length),
        total: a.questions.length, passed: score >= a.passMark,
        durationMins: S.int(4, a.durationMins),
        submittedAt: S.day(-S.int(1, 180), S.int(9, 19), S.int(0, 59))
      });
    });
  });
  ATTEMPTS.sort(function (x, y) { return new Date(y.submittedAt) - new Date(x.submittedAt); });

  ASSESSMENTS.forEach(function (a) {
    var mine = ATTEMPTS.filter(function (t) { return t.assessmentId === a.id; });
    a.attempts = mine.length;
    a.avgScore = mine.length ? Math.round(mine.reduce(function (s, t) { return s + t.score; }, 0) / mine.length) : 0;
    a.passRate = mine.length
      ? Math.round((mine.filter(function (t) { return t.passed; }).length / mine.length) * 100) : 0;
  });

  var CERTIFICATES = [];
  var serial = 1000;
  ATTEMPTS.filter(function (t) { return t.stage === 'Post' && t.passed && t.courseId; })
    .forEach(function (t) {
      if (CERTIFICATES.some(function (c) { return c.userId === t.userId && c.courseId === t.courseId; })) return;
      var expires = new Date(t.submittedAt);
      expires.setFullYear(expires.getFullYear() + 2);
      CERTIFICATES.push({
        id: 'crt_' + String(CERTIFICATES.length + 1).padStart(4, '0'),
        serial: 'GGL-' + (++serial), userId: t.userId, name: t.name,
        employeeId: t.employeeId, department: t.department,
        courseId: t.courseId, course: t.course, category: t.category,
        assessmentId: t.assessmentId, score: t.score,
        issuedAt: t.submittedAt, expiresAt: expires.toISOString(),
        status: new Date(expires) < new Date() ? 'Expired' : (S.bool(0.02) ? 'Revoked' : 'Issued')
      });
    });
  CERTIFICATES.sort(function (x, y) { return new Date(y.issuedAt) - new Date(x.issuedAt); });

  var POINT_RULES = {
    attempt_passed:     { points: 50,  label: 'Assessment passed' },
    attempt_submitted:  { points: 10,  label: 'Assessment submitted' },
    certificate_issued: { points: 150, label: 'Certificate earned' },
    course_completed:   { points: 100, label: 'Course completed' },
    perfect_score:      { points: 75,  label: 'Perfect score' },
    attendance_streak:  { points: 40,  label: 'Attendance streak' }
  };

  var POINTS = [];
  ATTEMPTS.forEach(function (t) {
    POINTS.push({ id: 'pt_' + POINTS.length, userId: t.userId, name: t.name,
      type: 'attempt_submitted', points: 10, reason: 'Submitted ' + t.assessment, at: t.submittedAt });
    if (t.passed) POINTS.push({ id: 'pt_' + POINTS.length, userId: t.userId, name: t.name,
      type: 'attempt_passed', points: 50, reason: 'Passed ' + t.assessment, at: t.submittedAt });
    if (t.score === 100) POINTS.push({ id: 'pt_' + POINTS.length, userId: t.userId, name: t.name,
      type: 'perfect_score', points: 75, reason: 'Full marks on ' + t.assessment, at: t.submittedAt });
  });
  CERTIFICATES.filter(function (c) { return c.status === 'Issued'; }).forEach(function (c) {
    POINTS.push({ id: 'pt_' + POINTS.length, userId: c.userId, name: c.name,
      type: 'certificate_issued', points: 150, reason: 'Certificate for ' + c.course, at: c.issuedAt });
  });
  POINTS.sort(function (x, y) { return new Date(y.at) - new Date(x.at); });

  var BADGE_CATALOGUE = [
    { id: 'fast_starter', name: 'Fast Starter', icon: 'zap', desc: 'Submit your first assessment',
      test: function (ctx) { return ctx.attempts.length >= 1; } },
    { id: 'compliance_clear', name: 'Compliance Clear', icon: 'shield',
      desc: 'Pass every mandatory assessment attempted',
      test: function (ctx) {
        var mand = ctx.attempts.filter(function (a) { return a.mandatory; });
        return mand.length > 0 && mand.every(function (a) { return a.passed; });
      } },
    { id: 'knowledge_seeker', name: 'Knowledge Seeker', icon: 'bookOpen',
      desc: 'Submit five or more assessments',
      test: function (ctx) { return ctx.attempts.length >= 5; } },
    { id: 'certified', name: 'Certified', icon: 'award', desc: 'Earn your first certificate',
      test: function (ctx) { return ctx.certificates.length >= 1; } },
    { id: 'assessment_ace', name: 'Assessment Ace', icon: 'star', desc: 'Score 90% or higher three times',
      test: function (ctx) { return ctx.attempts.filter(function (a) { return a.score >= 90; }).length >= 3; } },
    { id: 'collector', name: 'Collector', icon: 'trophy', desc: 'Hold three or more valid certificates',
      test: function (ctx) { return ctx.certificates.length >= 3; } },
    { id: 'perfectionist', name: 'Perfectionist', icon: 'target', desc: 'Achieve a perfect score',
      test: function (ctx) { return ctx.attempts.some(function (a) { return a.score === 100; }); } },
    { id: 'high_roller', name: 'High Roller', icon: 'trending', desc: 'Accumulate 1,000 points',
      test: function (ctx) { return ctx.points >= 1000; } }
  ];

  var CHALLENGES = [
    { id: 'ch1', name: 'Compliance sprint', desc: 'Complete all mandatory assessments this quarter',
      reward: 300, icon: 'shield', target: 4, endsAt: S.day(28) },
    { id: 'ch2', name: 'Five in five', desc: 'Submit five assessments within five weeks',
      reward: 250, icon: 'zap', target: 5, endsAt: S.day(35) },
    { id: 'ch3', name: 'Certified professional', desc: 'Earn two certificates this quarter',
      reward: 400, icon: 'award', target: 2, endsAt: S.day(45) },
    { id: 'ch4', name: 'Perfect attendance', desc: 'Attend every scheduled session in your batch',
      reward: 200, icon: 'userCheck', target: 6, endsAt: S.day(21) }
  ];

  D.assessments = ASSESSMENTS;
  D.attempts = ATTEMPTS;
  D.certificates = CERTIFICATES;
  D.points = POINTS;
  D.pointRules = POINT_RULES;
  D.badgeCatalogue = BADGE_CATALOGUE;
  D.challenges = CHALLENGES;

  /* Re-derive effectiveness from real attempts so the two modules agree */
  D.effectiveness.forEach(function (e) {
    var pre = ATTEMPTS.filter(function (t) { return t.courseId === e.courseId && t.stage === 'Pre'; });
    var post = ATTEMPTS.filter(function (t) { return t.courseId === e.courseId && t.stage === 'Post'; });
    if (!pre.length || !post.length) return;
    var avg = function (rows) { return Math.round(rows.reduce(function (s, r) { return s + r.score; }, 0) / rows.length); };
    e.preScore = avg(pre); e.postScore = avg(post);
    e.gain = e.postScore - e.preScore; e.learning = e.postScore;
    e.responses = pre.length + post.length; e.attempts = post.length;
    e.passRate = Math.round((post.filter(function (t) { return t.passed; }).length / post.length) * 100);
  });

  D.courses.forEach(function (c) {
    c.assessments = ASSESSMENTS.filter(function (a) { return a.courseId === c.id; }).length;
    c.certificatesIssued = CERTIFICATES.filter(function (x) {
      return x.courseId === c.id && x.status === 'Issued';
    }).length;
  });

})(window.GGL = window.GGL || {});
