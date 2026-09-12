/* GG Learning Labs — Courses, batches, sessions, attendance */
(function (GGL) {
  'use strict';

  var S = GGL.seed;

  var COURSE_DEFS = [
    ['Leadership Essentials for New Managers', 'Leadership', 'Blended', 480],
    ['Effective Business Communication', 'Communication', 'Instructor-Led', 360],
    ['POSH Awareness & Compliance', 'Compliance', 'E-Learning', 90],
    ['Information Security Fundamentals', 'Compliance', 'E-Learning', 120],
    ['Advanced Excel for Analysts', 'Technical', 'Blended', 420],
    ['Customer Experience Excellence', 'Customer Experience', 'Instructor-Led', 300],
    ['Root Cause Analysis & Problem Solving', 'Process Excellence', 'Blended', 360],
    ['Data Storytelling with Dashboards', 'Data & Analytics', 'E-Learning', 240],
    ['Onboarding: Welcome to the Organisation', 'Onboarding', 'Blended', 180],
    ['Coaching Conversations for Team Leads', 'Leadership', 'Instructor-Led', 300],
    ['Quality Management Systems Overview', 'Quality', 'E-Learning', 150],
    ['Time & Priority Management', 'Personal Effectiveness', 'E-Learning', 120],
    ['Train the Trainer Certification', 'Capability Building', 'Blended', 960],
    ['GDPR & Data Privacy Practices', 'Compliance', 'E-Learning', 100],
    ['Presentation Skills Masterclass', 'Communication', 'Instructor-Led', 240],
    ['Lean Six Sigma — Yellow Belt', 'Process Excellence', 'Blended', 720],
    ['Conflict Resolution at Work', 'Personal Effectiveness', 'Instructor-Led', 180],
    ['Workplace Safety Induction', 'Safety', 'E-Learning', 60],
    ['Stakeholder Management', 'Leadership', 'Blended', 300],
    ['Introduction to Process Automation', 'Technical', 'E-Learning', 300],
    ['Accessibility & Inclusive Design', 'Technical', 'E-Learning', 180],
    ['Negotiation Fundamentals', 'Sales', 'Instructor-Led', 360]
  ];

  var LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

  var COURSES = COURSE_DEFS.map(function (d, i) {
    var enrolled = S.int(18, 420);
    var completion = S.int(24, 97);
    return {
      id: 'crs_' + String(i + 1).padStart(3, '0'),
      title: d[0], category: d[1], delivery: d[2], durationMins: d[3],
      level: S.pick(LEVELS),
      status: i < 17 ? 'Published' : S.bool(0.5) ? 'Draft' : 'Archived',
      mandatory: d[1] === 'Compliance' || d[1] === 'Safety',
      instructor: GGL.data.trainers[i % GGL.data.trainers.length].name,
      trainerId: GGL.data.trainers[i % GGL.data.trainers.length].id,
      modules: S.int(3, 12), lessons: S.int(8, 42), assessments: S.int(1, 4),
      enrolled: enrolled, completed: Math.round(enrolled * completion / 100),
      completionRate: completion, rating: S.round(3.4 + S.rand() * 1.6, 1),
      effectiveness: S.int(58, 96),
      createdAt: S.day(-S.int(30, 600)), updatedAt: S.day(-S.int(0, 40)),
      hasScorm: S.bool(0.35),
      description: 'A structured programme covering the core principles, practical application and ' +
                   'on-the-job reinforcement required to build capability in this area.'
    };
  });

  var BATCH_STATES = ['Active', 'Scheduled', 'Completed', 'On Hold'];
  var BATCHES = [];

  for (var b = 0; b < 24; b++) {
    var course = S.pick(COURSES.filter(function (c) { return c.status === 'Published'; }));
    var trainer = GGL.data.trainers[S.int(0, GGL.data.trainers.length - 1)];
    var startOffset = S.int(-120, 45);
    var lengthDays = S.int(5, 45);
    var state = startOffset > 5 ? 'Scheduled'
              : startOffset + lengthDays < 0 ? 'Completed'
              : S.bool(0.1) ? 'On Hold' : 'Active';
    BATCHES.push({
      id: 'bat_' + String(b + 1).padStart(3, '0'),
      name: course.category.split(' ')[0].toUpperCase() + '-' + new Date().getFullYear() +
            '-B' + String(b + 1).padStart(2, '0'),
      programme: course.title, courseId: course.id,
      trainer: trainer.name, trainerId: trainer.id,
      location: S.pick(S.LOCATIONS), mode: S.pick(['Classroom', 'Virtual', 'Hybrid']),
      startDate: S.day(startOffset), endDate: S.day(startOffset + lengthDays),
      trainees: S.int(8, 34), status: state,
      completion: state === 'Completed' ? S.int(82, 100) : state === 'Scheduled' ? 0 : S.int(15, 88),
      attendanceRate: state === 'Scheduled' ? null : S.int(68, 99),
      sessions: S.int(3, 14), department: S.pick(S.DEPTS)
    });
  }

  var SESSIONS = [];
  var ROOMS = ['Training Room A', 'Training Room B', 'Auditorium', 'Lab 2', 'MS Teams', 'Zoom Room 1'];

  BATCHES.forEach(function (batch) {
    var count = Math.min(batch.sessions, 6);
    for (var s = 0; s < count; s++) {
      var offset = Math.round((new Date(batch.startDate) - new Date()) / 86400000) + s * S.int(2, 6);
      var hour = S.pick([9, 10, 11, 14, 15, 16]);
      SESSIONS.push({
        id: 'ses_' + batch.id + '_' + (s + 1),
        title: batch.programme + ' — Session ' + (s + 1),
        batchId: batch.id, batchName: batch.name, courseId: batch.courseId,
        trainer: batch.trainer, trainerId: batch.trainerId,
        start: S.day(offset, hour, 0), durationMins: S.pick([60, 90, 120, 180]),
        mode: batch.mode,
        location: batch.mode === 'Virtual' ? S.pick(['MS Teams', 'Zoom Room 1']) : S.pick(ROOMS),
        trainees: batch.trainees,
        status: offset < 0 ? 'Completed' : offset === 0 ? 'Today' : 'Scheduled',
        attendance: offset < 0 ? S.int(62, 100) : null
      });
    }
  });

  SESSIONS.sort(function (x, y) { return new Date(x.start) - new Date(y.start); });

  var ATTENDANCE = [];
  var learners = GGL.data.users.filter(function (u) { return u.role === GGL.ROLES.END_USER; });

  SESSIONS.filter(function (s) { return s.status === 'Completed'; }).slice(0, 14).forEach(function (session) {
    S.picks(learners, Math.min(session.trainees, 18)).forEach(function (learner) {
      var roll = S.rand();
      ATTENDANCE.push({
        id: 'att_' + session.id + '_' + learner.id,
        sessionId: session.id, sessionTitle: session.title,
        batchId: session.batchId, batchName: session.batchName,
        date: session.start, userId: learner.id, name: learner.name,
        employeeId: learner.employeeId, department: learner.department,
        status: roll < 0.78 ? 'Present' : roll < 0.88 ? 'Late' : roll < 0.95 ? 'Absent' : 'Excused',
        minutesAttended: S.int(30, session.durationMins)
      });
    });
  });

  GGL.data.courses = COURSES;
  GGL.data.batches = BATCHES;
  GGL.data.sessions = SESSIONS;
  GGL.data.attendance = ATTENDANCE;
  GGL.data.attendanceStates = ['Present', 'Absent', 'Late', 'Excused'];
  GGL.data.batchStates = BATCH_STATES;

})(window.GGL = window.GGL || {});
