/* ==========================================================================
   GG Learning Labs — L&D instruments and operational data

   Two structures here come from the client workbooks, not invention:

   1. TRAINER OBSERVATION FORM — seven sections, 36 criteria, transcribed from
      "TOF Form-Blank.xlsx". Section score = mean of its answered criteria;
      overall = mean of the section scores.

   2. TRAINER EFFECTIVENESS CALCULATOR — weights reverse-engineered from
      "Trainer Effectiveness.xlsx" and verified against both worked rows:

        Effectiveness = L1×0.30 + TOF×0.30 + Throughput×0.20
                      + Utilization×0.15 + Attendance×0.05

        Nikita  92.7/91.5/95.5/102/100     → 94.66      (workbook 0.9466)
        Vandana 94.8/86.96/93.75/97.43/80  → 91.8925    (workbook 0.918925)

      A component below 90% is flagged and forces "Needs Improvement".
   ========================================================================== */
(function (GGL) {
  'use strict';

  var S = GGL.seed;
  var D = GGL.data;

  /* ============================== 1. TOF ============================== */
  var TOF_SECTIONS = [
    { id: 's1', no: 1, title: 'Classroom Readiness', criteria: [
      'Preparedness and Utilization of Training Equipment\u2019s / Technology',
      'Availability and Organization of Training Materials and Supplies',
      'Provision and Display of Learner Name Tents',
      'Maintenance of a Professional and Organized Classroom Environment'
    ]},
    { id: 's2', no: 2, title: 'Facilitator Readiness', criteria: [
      'Facilitator Presence at Least 15 Minutes Prior to Session Start',
      'Establishment of a Positive Learning Environment through Rapport Building',
      'Adherence to Scheduled Session Start and End Times'
    ]},
    { id: 's3', no: 3, title: 'Training Introduction', criteria: [
      'Utilization of an Engaging and Impactful Opening',
      'Clearly Communicated the \u201CWhat\u2019s In It For Me\u201D (WIIFM) to Learners',
      'Clear Communication of Learning Objectives',
      'Encouragement of Learner Participation in Identifying Additional Learning Objectives'
    ]},
    { id: 's4', no: 4, title: 'Facilitation Skills', criteria: [
      'Effective Use of Vocal Dynamics (Voice and Tone)',
      'Adaptation of Speech Rate to Support Learner Needs',
      'Use of Clear and Appropriate Language',
      'Consistent and Engaging Eye Contact',
      'Recognition and Response to Non-Verbal Cues',
      'Posture and Body Language Demonstration',
      'Effective Use of Hand Gestures and Facial Expressions',
      'Accuracy and Clarity in Responding to Learner Questions',
      'Engagement and Sustained Learner Interest',
      'Seamless Use of Transitions Between Topics',
      'Consistent Reinforcement of Key Learning Points'
    ]},
    { id: 's5', no: 5, title: 'Content / Subject Matter Expertise', criteria: [
      'Effective Use of Facilitator Guide and Training Materials',
      'Ensured completeness of training / content delivered',
      'Accuracy and Reliability of Training Information',
      'Effective Facilitation and Management of Learning Activities',
      'Comprehensive Debriefing to Reinforce Learning Transfer'
    ]},
    { id: 's6', no: 6, title: 'Classroom Management / Professionalism', criteria: [
      'Approachability and Confidence',
      'Professional Appearance and Attire',
      'Creative Problem-Solving in Ambiguous Situations',
      'Timely and Appropriate Management of Inappropriate Behavior',
      'Respect and Recognition of Adult Learners',
      'Minimization of Trainer Distractions'
    ]},
    { id: 's7', no: 7, title: 'Closing', criteria: [
      'Summary of Key Points and Identification of Learning Gaps',
      'Completion and Accuracy of Knowledge and Skills Assessment',
      'Facilitation of Learner Feedback through Level 1 Evaluations'
    ]}
  ];

  TOF_SECTIONS.forEach(function (sec) {
    sec.criteria = sec.criteria.map(function (text, i) {
      return { id: sec.id + '_c' + (i + 1), text: text };
    });
  });

  var TOF_SCALE = [
    { value: 0, label: 'Not met',       desc: 'Standard not demonstrated' },
    { value: 1, label: 'Partially met', desc: 'Inconsistent or incomplete' },
    { value: 2, label: 'Met',           desc: 'Meets the expected standard' },
    { value: 3, label: 'Exceeds',       desc: 'Consistently above standard' }
  ];
  var TOF_MAX = 3;

  function scoreTof(ratings) {
    var sections = TOF_SECTIONS.map(function (sec) {
      var vals = sec.criteria.map(function (c) { return ratings[c.id]; })
        .filter(function (v) { return typeof v === 'number'; });
      var pct = vals.length
        ? (vals.reduce(function (a, b) { return a + b; }, 0) / (vals.length * TOF_MAX)) * 100 : 0;
      return { id: sec.id, no: sec.no, title: sec.title, answered: vals.length,
        total: sec.criteria.length, score: Math.round(pct * 10) / 10 };
    });
    var scored = sections.filter(function (s) { return s.answered > 0; });
    var overall = scored.length
      ? scored.reduce(function (a, s) { return a + s.score; }, 0) / scored.length : 0;
    return {
      sections: sections, overall: Math.round(overall * 10) / 10,
      answered: sections.reduce(function (a, s) { return a + s.answered; }, 0),
      total: sections.reduce(function (a, s) { return a + s.total; }, 0)
    };
  }

  /* ====================== 2. Effectiveness calculator ====================== */
  var EFF_WEIGHTS = [
    { key: 'l1',          label: 'L1 Score',    weight: 0.30, hint: 'Level 1 learner feedback' },
    { key: 'tof',         label: 'TOF',         weight: 0.30, hint: 'Trainer Observation Form score' },
    { key: 'throughput',  label: 'Throughput',  weight: 0.20, hint: 'Learners graduated vs enrolled' },
    { key: 'utilization', label: 'Utilization', weight: 0.15, hint: 'Delivered hours vs available hours' },
    { key: 'attendance',  label: 'Attendance',  weight: 0.05, hint: 'Trainer attendance against schedule' }
  ];
  var EFF_THRESHOLD = 90, EFF_EFFECTIVE = 93, EFF_SATISFACTORY = 85;

  function calcEffectiveness(m) {
    var total = 0;
    var contributions = EFF_WEIGHTS.map(function (w) {
      var v = Number(m[w.key]);
      if (isNaN(v)) v = 0;
      var contrib = v * w.weight;
      total += contrib;
      return { key: w.key, label: w.label, weight: w.weight,
        value: Math.round(v * 100) / 100,
        contribution: Math.round(contrib * 10000) / 10000,
        below: v < EFF_THRESHOLD };
    });
    var gaps = contributions.filter(function (c) { return c.below; }).map(function (c) { return c.label; });
    var effectiveness = Math.round(total * 10000) / 10000;
    var rating = gaps.length ? 'Needs Improvement'
      : effectiveness >= EFF_EFFECTIVE ? 'Effective'
      : effectiveness >= EFF_SATISFACTORY ? 'Satisfactory' : 'Needs Improvement';
    return { effectiveness: effectiveness, rating: rating, gaps: gaps,
      improvement: gaps.length ? gaps.join(', ') : 'No Improvement Required',
      contributions: contributions };
  }

  var EFF_RECORDS = [
    { id: 'eff_ref_1', trainer: 'Nikita', trainerId: null, month: 'July',
      l1: 92.7, tof: 91.5, throughput: 95.5, utilization: 102, attendance: 100, source: 'Workbook' },
    { id: 'eff_ref_2', trainer: 'Vandana', trainerId: null, month: 'July',
      l1: 94.8, tof: 86.96, throughput: 93.75, utilization: 97.43, attendance: 80, source: 'Workbook' }
  ];

  var MONTHS = ['April', 'May', 'June', 'July', 'August', 'September'];
  D.trainers.forEach(function (t, i) {
    var obs = D.observations.filter(function (o) { return o.trainerId === t.id; });
    var tof = obs.length
      ? Math.round((obs.reduce(function (a, o) { return a + o.score; }, 0) / obs.length) * 100) / 100
      : S.round(82 + S.rand() * 16, 2);
    EFF_RECORDS.push({
      id: 'eff_' + String(i + 1).padStart(3, '0'), trainer: t.name, trainerId: t.id,
      month: MONTHS[i % MONTHS.length],
      l1: S.round(84 + S.rand() * 14, 2), tof: tof,
      throughput: S.round(86 + S.rand() * 13, 2), utilization: S.round(88 + S.rand() * 16, 2),
      attendance: S.pick([80, 85, 90, 95, 100, 100, 100]), source: 'Platform'
    });
  });

  EFF_RECORDS.forEach(function (r) {
    var out = calcEffectiveness(r);
    r.effectiveness = out.effectiveness; r.rating = out.rating;
    r.improvement = out.improvement; r.gaps = out.gaps;
  });

  var TOF_RECORDS = [];
  D.trainers.slice(0, 12).forEach(function (t, i) {
    var ratings = {};
    var bias = 0.55 + (i % 5) * 0.09;
    TOF_SECTIONS.forEach(function (sec) {
      sec.criteria.forEach(function (c) {
        var r = S.rand();
        ratings[c.id] = r < bias * 0.55 ? 3 : r < bias + 0.28 ? 2 : r < 0.96 ? 1 : 0;
      });
    });
    var scored = scoreTof(ratings);
    TOF_RECORDS.push({
      id: 'tof_' + String(i + 1).padStart(3, '0'), trainerId: t.id, trainer: t.name,
      evaluator: S.pick(['Aditi Raghunathan', 'Rohan Mehta', 'Quality Team']),
      observationDate: S.day(-S.int(3, 120)),
      observationTime: S.pick(['09:30', '10:00', '11:00', '14:00', '15:30']),
      topic: S.pick(D.courses).title, durationMins: S.pick([60, 90, 120, 180, 240]),
      ratings: ratings, sections: scored.sections, score: scored.overall,
      rating: scored.overall >= 85 ? 'Exceeds' : scored.overall >= 70 ? 'Meets' : 'Needs development',
      recommendations: S.pick([
        'Maintain the current standard; consider mentoring newer facilitators.',
        'Tighten timing on the activity debrief and reinforce key points before closing.',
        'Increase learner participation during the introduction — draw out objectives from the room.',
        'Strengthen classroom readiness: materials and name tents should be set before learners arrive.'
      ]),
      status: 'Completed'
    });
  });
  TOF_RECORDS.sort(function (a, b) { return new Date(b.observationDate) - new Date(a.observationDate); });

  /* ============================ 3. TNA / competency ============================ */
  var COMPETENCY_LIBRARY = [
    { id: 'cmp_01', name: 'Business Communication', category: 'Behavioural', desc: 'Written and verbal clarity with internal and external stakeholders.' },
    { id: 'cmp_02', name: 'Stakeholder Management', category: 'Behavioural', desc: 'Building and sustaining productive working relationships.' },
    { id: 'cmp_03', name: 'Problem Solving', category: 'Behavioural', desc: 'Structured analysis and resolution of operational issues.' },
    { id: 'cmp_04', name: 'People Leadership', category: 'Leadership', desc: 'Directing, coaching and developing a team.' },
    { id: 'cmp_05', name: 'Coaching & Feedback', category: 'Leadership', desc: 'Developing others through structured conversation.' },
    { id: 'cmp_06', name: 'Change Management', category: 'Leadership', desc: 'Leading teams through operational and system change.' },
    { id: 'cmp_07', name: 'Process Knowledge', category: 'Functional', desc: 'Depth of understanding of the end-to-end process.' },
    { id: 'cmp_08', name: 'Quality Orientation', category: 'Functional', desc: 'Accuracy, attention to detail and adherence to standards.' },
    { id: 'cmp_09', name: 'Data Literacy', category: 'Technical', desc: 'Interpreting and acting on operational data.' },
    { id: 'cmp_10', name: 'Systems Proficiency', category: 'Technical', desc: 'Effective use of core platforms and tooling.' },
    { id: 'cmp_11', name: 'Regulatory Awareness', category: 'Compliance', desc: 'Understanding of obligations relevant to the role.' },
    { id: 'cmp_12', name: 'Information Security', category: 'Compliance', desc: 'Safe handling of data and systems.' }
  ];

  var PROFICIENCY = [
    { level: 1, label: 'Awareness', desc: 'Understands the basics; needs supervision.' },
    { level: 2, label: 'Working', desc: 'Performs routine tasks independently.' },
    { level: 3, label: 'Practitioner', desc: 'Handles complexity without support.' },
    { level: 4, label: 'Advanced', desc: 'Coaches others and improves the practice.' },
    { level: 5, label: 'Expert', desc: 'Recognised authority; sets the standard.' }
  ];

  var ROLE_PROFILES = [
    { role: 'Process Associate', requirements: { cmp_01:2, cmp_03:2, cmp_07:3, cmp_08:3, cmp_10:2, cmp_11:2, cmp_12:2 } },
    { role: 'Senior Associate', requirements: { cmp_01:3, cmp_02:2, cmp_03:3, cmp_07:4, cmp_08:4, cmp_09:2, cmp_10:3, cmp_11:3, cmp_12:2 } },
    { role: 'Team Lead', requirements: { cmp_01:4, cmp_02:3, cmp_03:3, cmp_04:3, cmp_05:3, cmp_07:4, cmp_08:4, cmp_09:3, cmp_11:3, cmp_12:3 } },
    { role: 'Analyst', requirements: { cmp_01:3, cmp_03:4, cmp_07:3, cmp_09:4, cmp_10:4, cmp_12:3 } },
    { role: 'Specialist', requirements: { cmp_01:3, cmp_02:3, cmp_07:4, cmp_08:4, cmp_09:3, cmp_10:3, cmp_11:3 } },
    { role: 'Consultant', requirements: { cmp_01:4, cmp_02:4, cmp_03:4, cmp_06:3, cmp_07:4, cmp_09:3 } },
    { role: 'Engineer', requirements: { cmp_03:4, cmp_07:3, cmp_09:3, cmp_10:4, cmp_12:4 } },
    { role: 'Executive', requirements: { cmp_01:3, cmp_02:2, cmp_07:3, cmp_08:3, cmp_11:2 } },
    { role: 'Coordinator', requirements: { cmp_01:3, cmp_02:3, cmp_07:3, cmp_08:3, cmp_10:2 } }
  ];

  function profileFor(title) {
    return ROLE_PROFILES.filter(function (p) { return p.role === title; })[0] || ROLE_PROFILES[0];
  }

  var COMPETENCY_RECORDS = [];
  var learners = D.users.filter(function (u) { return u.role === GGL.ROLES.END_USER; });

  learners.forEach(function (u) {
    var profile = profileFor(u.title);
    Object.keys(profile.requirements).forEach(function (cid) {
      var required = profile.requirements[cid];
      var roll = S.rand();
      var current = roll < 0.42 ? required : roll < 0.72 ? Math.max(1, required - 1)
                  : roll < 0.86 ? Math.max(1, required - 2) : Math.min(5, required + 1);
      var comp = COMPETENCY_LIBRARY.filter(function (c) { return c.id === cid; })[0];
      COMPETENCY_RECORDS.push({
        id: 'cr_' + u.id + '_' + cid, userId: u.id, name: u.name, employeeId: u.employeeId,
        department: u.department, role: u.title, competencyId: cid,
        competency: comp.name, category: comp.category,
        current: current, required: required, gap: Math.max(0, required - current),
        assessedAt: S.day(-S.int(10, 200)),
        assessedBy: S.pick(['Line manager', 'L&D assessment', 'Self + manager'])
      });
    });
  });

  var TNA_RECORDS = [];
  var byDeptComp = {};
  COMPETENCY_RECORDS.filter(function (r) { return r.gap > 0; }).forEach(function (r) {
    var k = r.department + '|' + r.competencyId;
    if (!byDeptComp[k]) {
      byDeptComp[k] = { department: r.department, competencyId: r.competencyId,
        competency: r.competency, category: r.category, people: 0, totalGap: 0, maxGap: 0 };
    }
    var b = byDeptComp[k];
    b.people++; b.totalGap += r.gap; b.maxGap = Math.max(b.maxGap, r.gap);
  });

  var INTERVENTIONS = ['Instructor-led workshop', 'E-learning module', 'Coaching programme',
                       'On-the-job practice', 'Mentoring assignment', 'Blended programme'];

  Object.keys(byDeptComp).forEach(function (k, i) {
    var b = byDeptComp[k];
    var avgGap = b.totalGap / b.people;
    var weight = b.people * avgGap;
    var course = D.courses.filter(function (c) {
      return c.category === b.category || c.category === 'Compliance';
    })[0] || D.courses[0];
    TNA_RECORDS.push({
      id: 'tna_' + String(i + 1).padStart(3, '0'),
      department: b.department, competencyId: b.competencyId,
      competency: b.competency, category: b.category,
      affected: b.people, avgGap: Math.round(avgGap * 10) / 10, maxGap: b.maxGap,
      priority: weight >= 12 ? 'Critical' : weight >= 6 ? 'High' : weight >= 3 ? 'Medium' : 'Low',
      intervention: S.pick(INTERVENTIONS),
      recommendedCourseId: course.id, recommendedCourse: course.title,
      targetDate: S.day(S.int(20, 150)),
      status: S.pick(['Identified', 'Identified', 'Planned', 'In Progress', 'Addressed']),
      raisedBy: S.pick(['Capability review', 'Manager nomination', 'Quality audit', 'Annual TNA cycle']),
      createdAt: S.day(-S.int(5, 90))
    });
  });
  TNA_RECORDS.sort(function (a, b) { return b.affected * b.avgGap - a.affected * a.avgGap; });

  /* ============================ 4. Content library ============================ */
  var CONTENT_TYPES = ['Video', 'PDF', 'Presentation', 'Document', 'SCORM', 'Job aid', 'Link'];
  var CONTENT_TITLES = ['Facilitator Guide', 'Participant Workbook', 'Slide Deck',
    'Quick Reference Card', 'Process Walkthrough', 'Scenario Pack', 'Assessment Key', 'Session Plan'];
  var CONTENT = [];

  D.courses.forEach(function (c, ci) {
    var n = S.int(2, 4);
    for (var i = 0; i < n; i++) {
      var type = S.pick(CONTENT_TYPES);
      CONTENT.push({
        id: 'cnt_' + String(CONTENT.length + 1).padStart(3, '0'),
        title: c.title.split(' ').slice(0, 3).join(' ') + ' — ' + S.pick(CONTENT_TITLES),
        courseId: c.id, course: c.title, category: c.category, type: type,
        format: type === 'Video' ? 'MP4' : type === 'PDF' ? 'PDF'
              : type === 'Presentation' ? 'PPTX' : type === 'SCORM' ? 'SCORM 1.2'
              : type === 'Document' ? 'DOCX' : type === 'Link' ? 'URL' : 'PDF',
        sizeMb: type === 'Video' ? S.round(40 + S.rand() * 400, 1)
              : type === 'SCORM' ? S.round(8 + S.rand() * 60, 1) : S.round(0.4 + S.rand() * 12, 1),
        version: 'v' + S.int(1, 4) + '.' + S.int(0, 9),
        author: S.pick(D.users.filter(function (u) { return u.role !== GGL.ROLES.END_USER; })).name,
        status: ci < 18 ? S.pick(['Published', 'Published', 'Published', 'In Review']) : 'Draft',
        views: S.int(12, 1800), downloads: S.int(3, 460),
        updatedAt: S.day(-S.int(1, 240)),
        language: S.pick(['English', 'English', 'English', 'Hindi'])
      });
    }
  });

  /* ================================ 5. SOPs ================================ */
  var SOP_STAGES = ['Draft', 'Review', 'Approval', 'Published', 'Archived'];
  var SOPS = [
    ['L&D Attendance and Re-batching', 'Operations', 'Defines how attendance is captured, escalated and how learners are re-batched.'],
    ['Trainer Observation and Calibration', 'Quality', 'Governs how observations are conducted, scored and calibrated across evaluators.'],
    ['Mandatory Compliance Training Drive', 'Compliance', 'End-to-end process for launching, tracking and closing a compliance drive.'],
    ['Assessment Design and Approval', 'Quality', 'Standards for authoring, reviewing and signing off assessments.'],
    ['Certificate Issue and Revocation', 'Compliance', 'Controls around issuing, verifying and revoking certificates.'],
    ['New Joiner Onboarding Curriculum', 'Operations', 'The learning path and checkpoints for a new joiner\u2019s first 90 days.'],
    ['Content Development Request', 'Operations', 'How content requests are raised, prioritised and delivered.'],
    ['Training Needs Analysis Cycle', 'Strategy', 'The annual and quarterly TNA cadence, inputs and outputs.'],
    ['LMS Access and Role Provisioning', 'Compliance', 'Granting, reviewing and revoking platform access by role.'],
    ['Training Effectiveness Measurement', 'Quality', 'How L1 to L4 effectiveness is measured and reported.'],
    ['Trainer Certification Pathway', 'Quality', 'Requirements and stages for certifying an internal trainer.'],
    ['Learning Records Retention', 'Compliance', 'Retention periods and disposal rules for learning records.']
  ].map(function (r, i) {
    var stage = i < 7 ? 'Published' : S.pick(['Draft', 'Review', 'Approval', 'Archived']);
    var reviewed = S.day(-S.int(20, 300));
    var next = new Date(reviewed);
    next.setFullYear(next.getFullYear() + 1);
    return {
      id: 'sop_' + String(i + 1).padStart(3, '0'),
      code: 'SOP-LD-' + String(i + 1).padStart(3, '0'),
      title: r[0], category: r[1], purpose: r[2],
      version: stage === 'Published' ? 'v' + S.int(1, 3) + '.0' : 'v0.' + S.int(1, 9),
      owner: S.pick(D.users.filter(function (u) { return u.role !== GGL.ROLES.END_USER; })).name,
      approver: 'Aditi Raghunathan', status: stage,
      effectiveFrom: stage === 'Published' ? reviewed : null,
      lastReviewed: reviewed, nextReview: next.toISOString(),
      linkedCourseId: S.pick(D.courses).id,
      changeNote: S.pick(['Annual review — no material change.',
        'Updated escalation matrix and owner.', 'Aligned to revised retention schedule.',
        'Added RACI and clarified approval stage.']),
      createdAt: S.day(-S.int(120, 700))
    };
  });

  /* ======================== 6. Coaching / mentoring ======================== */
  var COACH_FOCUS = ['Leadership presence', 'Difficult conversations', 'Time and priority management',
    'Stakeholder influence', 'Performance conversations', 'Decision making',
    'Presentation confidence', 'Delegation'];
  var coaches = D.users.filter(function (u) { return u.role !== GGL.ROLES.END_USER; });
  var COACHING = [];

  for (var ci2 = 0; ci2 < 22; ci2++) {
    var coachee = S.pick(learners);
    var coach = S.pick(coaches);
    var sessionsPlanned = S.int(4, 8);
    var sessionsDone = S.int(0, sessionsPlanned);
    COACHING.push({
      id: 'coach_' + String(ci2 + 1).padStart(3, '0'), type: 'Coaching',
      coachee: coachee.name, coacheeId: coachee.id, department: coachee.department,
      coach: coach.name, coachId: coach.id, focus: S.pick(COACH_FOCUS),
      goal: S.pick(['Lead a cross-team initiative with confidence by the end of the quarter.',
        'Hold structured performance conversations without escalation.',
        'Present to the leadership forum unaided.',
        'Delegate effectively and reduce personal task load by a third.']),
      sessionsPlanned: sessionsPlanned, sessionsCompleted: sessionsDone,
      nextSession: sessionsDone >= sessionsPlanned ? null : S.day(S.int(2, 30), S.int(9, 17), 0),
      startedAt: S.day(-S.int(10, 180)),
      status: sessionsDone === 0 ? 'Requested' : sessionsDone >= sessionsPlanned ? 'Completed' : 'In Progress',
      progress: Math.round((sessionsDone / sessionsPlanned) * 100)
    });
  }

  var MENTOR_AREAS = ['Career progression', 'Domain expertise', 'Cross-functional exposure',
    'Leadership readiness', 'Professional network', 'Technical depth'];
  var MENTORING = [];

  for (var mi = 0; mi < 18; mi++) {
    var mentee = S.pick(learners);
    var mentor = S.pick(coaches.concat(D.trainers));
    var months = S.int(3, 12);
    var elapsed = S.int(0, months);
    MENTORING.push({
      id: 'mentor_' + String(mi + 1).padStart(3, '0'), type: 'Mentoring',
      mentee: mentee.name, menteeId: mentee.id, department: mentee.department,
      mentor: mentor.name, mentorId: mentor.id, area: S.pick(MENTOR_AREAS),
      goal: S.pick(['Build readiness for a team lead role within twelve months.',
        'Develop depth in the domain and become a go-to reference.',
        'Gain exposure to adjacent functions ahead of a lateral move.',
        'Grow an internal network beyond the immediate team.']),
      durationMonths: months, monthsElapsed: elapsed, matchedOn: S.day(-elapsed * 30),
      nextCheckIn: elapsed >= months ? null : S.day(S.int(3, 28), S.int(9, 17), 0),
      status: elapsed === 0 ? 'Matching' : elapsed >= months ? 'Completed' : 'Active',
      progress: Math.round((elapsed / months) * 100)
    });
  }

  /* ============================ 7. Requests ============================ */
  var REQUEST_TYPES = ['Training request', 'Course request', 'Coaching request',
    'Mentoring request', 'Content development', 'SOP development', 'L&D help', 'Other service'];
  var REQUEST_STATES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Completed', 'Rejected'];
  var REQUESTS = [];

  for (var ri = 0; ri < 38; ri++) {
    var requester = S.pick(D.users);
    var state = S.pick(REQUEST_STATES);
    REQUESTS.push({
      id: 'req_' + String(ri + 1).padStart(3, '0'), reference: 'REQ-' + (4000 + ri),
      type: S.pick(REQUEST_TYPES),
      title: S.pick(['Advanced Excel refresher for the reporting team',
        'Coaching support ahead of a team lead transition',
        'New joiner induction deck needs a refresh',
        'Compliance drive for the new regulatory change',
        'Mentoring match for a high-potential analyst',
        'SOP needed for the revised escalation path',
        'Presentation skills workshop for client-facing staff',
        'Refresher on the updated quality framework']),
      requester: requester.name, requesterId: requester.id, department: requester.department,
      audience: S.pick(['My team', 'Whole department', 'Selected individuals', 'All staff']),
      headcount: S.int(1, 60), priority: S.pick(['Low', 'Medium', 'Medium', 'High', 'Critical']),
      status: state, assignee: state === 'Submitted' ? null : S.pick(coaches).name,
      neededBy: S.day(S.int(7, 120)), createdAt: S.day(-S.int(1, 120)),
      updatedAt: S.day(-S.int(0, 20)),
      description: 'Raised through the request centre. Full requirement captured in the request detail.'
    });
  }
  REQUESTS.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

  /* ============================ 8. Newsfeed ============================ */
  var POSTS = [
    { category: 'Announcement', pinned: true, title: 'Q3 compliance drive opens Monday',
      body: 'All mandatory modules for the quarter go live on Monday morning. Completion is required within 21 days. Leaders will receive a weekly completion report for their teams; please chase gaps before the final week rather than after it.' },
    { category: 'New course', pinned: false, title: 'Coaching Conversations for Team Leads is now open',
      body: 'A four-session blended programme for anyone holding regular one-to-ones. Nominations are open to team leads and above. Places are capped at 18 per cohort.' },
    { category: 'Recognition', pinned: false, title: 'Trainer of the month — July',
      body: 'Congratulations to our top-rated facilitator this month, who scored 94.7% weighted effectiveness with a perfect attendance record and the highest L1 feedback in the team.' },
    { category: 'Update', pinned: false, title: 'Trainer Observation Form moves into the platform',
      body: 'The TOF is now completed directly in GG Learning Labs rather than in the spreadsheet. Section scores and the overall score calculate automatically, and results feed straight into the effectiveness calculator.' },
    { category: 'Event', pinned: false, title: 'Learning at Work Week — sessions announced',
      body: 'Eight lunch-and-learn sessions across the week, covering data literacy, wellbeing, and working across time zones. No booking required, but rooms fill quickly.' },
    { category: 'Notice', pinned: false, title: 'Certificate verification is live',
      body: 'Every certificate now carries a serial that can be verified from the register. If you hold a certificate issued before this change, it has been backfilled with a serial automatically.' },
    { category: 'Announcement', pinned: false, title: 'Annual TNA cycle begins next month',
      body: 'Managers will be asked to review competency profiles for their teams. The output feeds the training calendar for the following two quarters, so accuracy here genuinely matters.' }
  ].map(function (p, i) {
    var author = i % 3 === 0 ? D.users[0] : D.users[1];
    return {
      id: 'post_' + String(i + 1).padStart(3, '0'),
      title: p.title, body: p.body, category: p.category, pinned: p.pinned,
      authorId: author.id, author: author.name, authorRole: GGL.roleLabel(author.role),
      createdAt: S.day(-i * 2 - S.int(0, 2), S.int(9, 17), S.int(0, 59)),
      image: null, likes: S.int(3, 48), likedBy: [], commentCount: 0
    };
  });

  var COMMENT_TEXTS = ['Useful, thank you — shared with the team.',
    'Will the recording be available afterwards for people on shift?',
    'Completed mine this morning. The new format is much quicker.',
    'Is this open to contractors as well, or permanent staff only?',
    'Great to see this finally move off the spreadsheet.',
    'Can we get a version of this for the night shift?',
    'Nominated two of my team — looking forward to it.',
    'Really helpful, especially the section on feedback.'];

  var COMMENTS = [];
  POSTS.forEach(function (post) {
    var n = S.int(0, 4);
    for (var i = 0; i < n; i++) {
      var u = S.pick(D.users);
      COMMENTS.push({
        id: 'cmt_' + String(COMMENTS.length + 1).padStart(4, '0'), postId: post.id,
        authorId: u.id, author: u.name, authorRole: GGL.roleLabel(u.role),
        body: S.pick(COMMENT_TEXTS), createdAt: S.day(-S.int(0, 5), S.int(9, 19), S.int(0, 59))
      });
    }
    post.commentCount = n;
  });

  /* ============================ 9. Audit log ============================ */
  var AUDIT_ACTIONS = [
    ['user.create', 'Created account', 'userPlus', 'User management'],
    ['user.update', 'Updated account', 'edit', 'User management'],
    ['user.delete', 'Deleted account', 'trash', 'User management'],
    ['user.deactivate', 'Deactivated account', 'lock', 'User management'],
    ['auth.login', 'Signed in', 'logout', 'Authentication'],
    ['course.publish', 'Published course', 'book', 'Courses'],
    ['course.update', 'Updated course', 'edit', 'Courses'],
    ['batch.create', 'Created batch', 'layers', 'Batches'],
    ['attendance.bulk', 'Bulk attendance update', 'userCheck', 'Attendance'],
    ['assessment.create', 'Created assessment', 'checkSquare', 'Assessments'],
    ['certificate.issue', 'Issued certificate', 'award', 'Certificates'],
    ['certificate.revoke', 'Revoked certificate', 'xCircle', 'Certificates'],
    ['tof.submit', 'Submitted observation', 'eye', 'Trainer observation'],
    ['sop.publish', 'Published SOP', 'clipboard', 'SOP management'],
    ['report.export', 'Exported report', 'download', 'Reports'],
    ['settings.update', 'Changed platform setting', 'settings', 'Platform settings']
  ];

  var AUDIT = [];
  for (var ai = 0; ai < 90; ai++) {
    var act = S.pick(AUDIT_ACTIONS);
    var actor = S.pick(coaches);
    AUDIT.push({
      id: 'aud_' + String(ai + 1).padStart(4, '0'),
      action: act[0], label: act[1], icon: act[2], module: act[3],
      actorId: actor.id, actor: actor.name, actorRole: GGL.roleLabel(actor.role),
      target: S.pick([S.pick(D.users).name, S.pick(D.courses).title, S.pick(D.batches).name]),
      at: S.day(-S.int(0, 45), S.int(7, 21), S.int(0, 59)),
      ip: '10.' + S.int(0, 40) + '.' + S.int(1, 255) + '.' + S.int(1, 255),
      severity: act[0].indexOf('delete') !== -1 || act[0].indexOf('revoke') !== -1 ? 'High'
              : act[0].indexOf('create') !== -1 || act[0].indexOf('publish') !== -1 ? 'Medium' : 'Low',
      result: S.bool(0.97) ? 'Success' : 'Failed'
    });
  }
  AUDIT.sort(function (x, y) { return new Date(y.at) - new Date(x.at); });

  /* ========================== 10. Learning paths ========================== */
  var PATHS = [
    ['New Manager Foundations', 'Leadership', ['Leadership Essentials for New Managers', 'Coaching Conversations for Team Leads', 'Conflict Resolution at Work', 'Stakeholder Management']],
    ['Compliance Essentials', 'Compliance', ['POSH Awareness & Compliance', 'Information Security Fundamentals', 'GDPR & Data Privacy Practices', 'Workplace Safety Induction']],
    ['Analyst Toolkit', 'Technical', ['Advanced Excel for Analysts', 'Data Storytelling with Dashboards', 'Root Cause Analysis & Problem Solving']],
    ['Trainer Certification', 'Capability Building', ['Train the Trainer Certification', 'Presentation Skills Masterclass', 'Effective Business Communication']],
    ['Customer Excellence', 'Customer Experience', ['Customer Experience Excellence', 'Effective Business Communication', 'Conflict Resolution at Work']]
  ].map(function (p, i) {
    var steps = p[2].map(function (title, si) {
      var course = D.courses.filter(function (c) { return c.title === title; })[0];
      return { order: si + 1, courseId: course ? course.id : null, title: title,
        durationMins: course ? course.durationMins : 120, required: true };
    });
    return {
      id: 'path_' + String(i + 1).padStart(3, '0'), name: p[0], category: p[1],
      description: 'A sequenced programme building capability in ' + p[1].toLowerCase() + '.',
      steps: steps, totalMins: steps.reduce(function (a, s) { return a + s.durationMins; }, 0),
      enrolled: S.int(12, 180), completed: S.int(4, 90),
      status: i < 4 ? 'Published' : 'Draft', owner: S.pick(coaches).name,
      createdAt: S.day(-S.int(40, 400))
    };
  });

  /* ========================= 11. Platform settings ========================= */
  var PLATFORM_SETTINGS = {
    organisation: { name: 'IMS Group', shortName: 'IMS', primaryContact: 'Aditi Raghunathan',
      supportEmail: 'support@gglearninglabs.example', timezone: 'Asia/Kolkata (GMT+5:30)',
      fiscalYearStart: 'April' },
    learning: { defaultPassMark: 70, maxAttempts: 3, certificateValidityYears: 2,
      mandatoryCompletionDays: 21, attendanceThreshold: 80, tofThreshold: 90,
      effectivenessThreshold: 90 },
    access: { ssoEnabled: false, selfRegistration: false, sessionTimeoutMins: 60,
      passwordMinLength: 8, mfaRequired: false },
    notifications: { sessionReminderHours: 24, assessmentReminderDays: 3,
      weeklyDigest: true, escalateOverdueDays: 7 },
    retention: { learningRecordsYears: 7, auditLogYears: 3, attendanceYears: 5,
      anonymiseOnExit: true }
  };

  D.tofSections = TOF_SECTIONS; D.tofScale = TOF_SCALE; D.tofMax = TOF_MAX;
  D.scoreTof = scoreTof; D.tofRecords = TOF_RECORDS;
  D.effWeights = EFF_WEIGHTS; D.effThreshold = EFF_THRESHOLD;
  D.calcEffectiveness = calcEffectiveness; D.effRecords = EFF_RECORDS;
  D.competencyLibrary = COMPETENCY_LIBRARY; D.proficiency = PROFICIENCY;
  D.roleProfiles = ROLE_PROFILES; D.competencyRecords = COMPETENCY_RECORDS;
  D.tnaRecords = TNA_RECORDS; D.content = CONTENT; D.sops = SOPS; D.sopStages = SOP_STAGES;
  D.coaching = COACHING; D.mentoring = MENTORING; D.requests = REQUESTS;
  D.requestTypes = REQUEST_TYPES; D.requestStates = REQUEST_STATES;
  D.posts = POSTS; D.comments = COMMENTS; D.audit = AUDIT; D.paths = PATHS;
  D.platformSettings = PLATFORM_SETTINGS;

})(window.GGL = window.GGL || {});
