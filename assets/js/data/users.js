/* GG Learning Labs — Users and trainers (illustrative records, not credentials) */
(function (GGL) {
  'use strict';

  var S = GGL.seed;
  var R = GGL.ROLES;

  var demo = [
    { id: 'usr_sa_001', name: 'Aditi Raghunathan', email: 'superadmin@example.com', role: R.SUPER_ADMIN,
      title: 'Head of Learning & Development', department: 'Human Resources', location: 'Mumbai',
      status: 'Active', employeeId: 'IMS-0001', createdAt: S.day(-720), lastLogin: S.day(0, 8, 42),
      phone: '+91 98200 00001' },
    { id: 'usr_ad_001', name: 'Rohan Mehta', email: 'admin@example.com', role: R.ADMIN,
      title: 'L&D Manager', department: 'Human Resources', location: 'Bengaluru',
      status: 'Active', employeeId: 'IMS-0042', createdAt: S.day(-540), lastLogin: S.day(0, 9, 15),
      phone: '+91 98200 00042' },
    { id: 'usr_eu_001', name: 'Kavya Nair', email: 'user@example.com', role: R.END_USER,
      title: 'Senior Process Associate', department: 'Operations', location: 'Pune',
      status: 'Active', employeeId: 'IMS-1180', createdAt: S.day(-310), lastLogin: S.day(-1, 18, 5),
      phone: '+91 98200 01180', manager: 'Rohan Mehta' }
  ];

  var generated = [];
  var used = {};
  function uniqueName() {
    var n, guard = 0;
    do { n = S.name(); guard++; } while (used[n] && guard < 60);
    used[n] = true;
    return n;
  }

  for (var a = 0; a < 4; a++) {
    var sn = uniqueName();
    generated.push({
      id: 'usr_sa_' + String(a + 2).padStart(3, '0'), name: sn, email: S.email(sn), role: R.SUPER_ADMIN,
      title: S.pick(['Platform Owner', 'L&D Director', 'Head of Capability', 'Learning Technology Lead']),
      department: 'Human Resources', location: S.pick(S.LOCATIONS),
      status: S.bool(0.85) ? 'Active' : 'Inactive',
      employeeId: 'IMS-' + S.int(1, 99).toString().padStart(4, '0'),
      createdAt: S.day(-S.int(200, 700)), lastLogin: S.day(-S.int(0, 20), S.int(8, 19), S.int(0, 59)),
      phone: '+91 9820' + S.int(100000, 999999)
    });
  }

  for (var b = 0; b < 14; b++) {
    var an = uniqueName();
    generated.push({
      id: 'usr_ad_' + String(b + 2).padStart(3, '0'), name: an, email: S.email(an), role: R.ADMIN,
      title: S.pick(['L&D Manager', 'Training Coordinator', 'Instructional Designer',
                     'Capability Partner', 'Assistant Manager — L&D', 'Learning Consultant']),
      department: S.pick(['Human Resources', 'Operations', 'Quality', 'Technology']),
      location: S.pick(S.LOCATIONS),
      status: S.bool(0.88) ? 'Active' : S.bool(0.6) ? 'Inactive' : 'Suspended',
      employeeId: 'IMS-' + S.int(100, 499).toString().padStart(4, '0'),
      createdAt: S.day(-S.int(120, 600)), lastLogin: S.day(-S.int(0, 30), S.int(8, 19), S.int(0, 59)),
      phone: '+91 9820' + S.int(100000, 999999)
    });
  }

  for (var c = 0; c < 96; c++) {
    var ln = uniqueName();
    var prog = S.int(0, 100);
    var state = prog === 0 ? 'Not Started' : prog === 100 ? 'Completed'
              : S.bool(0.12) ? 'Retraining' : 'In Progress';
    generated.push({
      id: 'usr_eu_' + String(c + 2).padStart(3, '0'), name: ln, email: S.email(ln), role: R.END_USER,
      title: S.pick(['Process Associate', 'Senior Associate', 'Team Lead', 'Analyst',
                     'Executive', 'Specialist', 'Consultant', 'Engineer', 'Coordinator']),
      department: S.pick(S.DEPTS), location: S.pick(S.LOCATIONS),
      status: S.bool(0.9) ? 'Active' : 'Inactive',
      employeeId: 'IMS-' + S.int(1000, 4999),
      createdAt: S.day(-S.int(10, 500)), lastLogin: S.day(-S.int(0, 45), S.int(8, 21), S.int(0, 59)),
      phone: '+91 9820' + S.int(100000, 999999),
      assignedCourses: S.int(1, 9), completedCourses: 0, progress: prog, trainingStatus: state,
      learningHours: S.int(2, 86), certificates: S.int(0, 5), points: S.int(120, 2400)
    });
  }

  generated.forEach(function (u) {
    if (u.role !== R.END_USER) return;
    u.completedCourses = Math.round((u.assignedCourses * u.progress) / 100);
  });

  demo[2].assignedCourses = 7; demo[2].completedCourses = 4; demo[2].progress = 62;
  demo[2].trainingStatus = 'In Progress'; demo[2].learningHours = 48;
  demo[2].certificates = 4; demo[2].points = 1240; demo[2].rank = 12;

  var USERS = demo.concat(generated);

  var TRAINERS = [];
  var SPECIALISMS = ['Leadership', 'Communication', 'Process Excellence', 'Compliance',
                     'Technical Skills', 'Customer Experience', 'Quality Systems',
                     'Data & Analytics', 'Safety', 'Onboarding'];

  for (var t = 0; t < 18; t++) {
    var tn = uniqueName();
    var sessions = S.int(12, 140);
    TRAINERS.push({
      id: 'trn_' + String(t + 1).padStart(3, '0'), name: tn, email: S.email(tn),
      type: S.bool(0.7) ? 'Internal' : 'External', specialism: S.pick(SPECIALISMS),
      location: S.pick(S.LOCATIONS), status: S.bool(0.9) ? 'Active' : 'Inactive',
      sessionsDelivered: sessions, trainingHours: sessions * S.int(2, 4),
      learnersTrained: sessions * S.int(8, 22),
      effectiveness: S.round(S.int(62, 96) + S.rand(), 1),
      observationScore: S.round(3 + S.rand() * 2, 1),
      lastObserved: S.day(-S.int(3, 120)), upcomingSessions: S.int(0, 6)
    });
  }

  GGL.data = GGL.data || {};
  GGL.data.users = USERS;
  GGL.data.trainers = TRAINERS;
  GGL.data.demoAccounts = demo;

})(window.GGL = window.GGL || {});
