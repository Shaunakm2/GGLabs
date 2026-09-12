/* GG Learning Labs — Deterministic seed (fixed-seed PRNG) */
(function (GGL) {
  'use strict';

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var r = rng(20260912);

  var S = {
    rand: r,
    int: function (min, max) { return Math.floor(r() * (max - min + 1)) + min; },
    pick: function (arr) { return arr[Math.floor(r() * arr.length)]; },
    picks: function (arr, n) {
      var pool = arr.slice(), out = [];
      for (var i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
      return out;
    },
    bool: function (c) { return r() < (c === undefined ? 0.5 : c); },
    day: function (days, hour, min) {
      var d = new Date();
      d.setDate(d.getDate() + days);
      if (hour !== undefined) d.setHours(hour, min || 0, 0, 0);
      return d.toISOString();
    },
    round: function (n, dp) { var f = Math.pow(10, dp || 0); return Math.round(n * f) / f; }
  };

  S.FIRST = ['Aarav','Priya','Rohan','Ananya','Vikram','Meera','Arjun','Kavya','Siddharth','Neha',
             'Karthik','Divya','Rahul','Sneha','Aditya','Pooja','Nikhil','Ritu','Sanjay','Ishita',
             'Manish','Tanvi','Varun','Shreya','Ajay','Anjali','Harsh','Nisha','Rajat','Swati',
             'Deepak','Lakshmi','Gaurav','Preeti','Amit','Sonia','Kunal','Payal','Vivek','Ruchi'];
  S.LAST = ['Sharma','Iyer','Mehta','Reddy','Banerjee','Kulkarni','Nair','Gupta','Desai','Rao',
            'Joshi','Chatterjee','Malhotra','Pillai','Verma','Shah','Bose','Menon','Sinha','Kapoor'];
  S.DEPTS = ['Operations','Technology','Human Resources','Finance','Sales','Customer Support',
             'Quality','Marketing','Compliance','Supply Chain'];
  S.LOCATIONS = ['Mumbai','Bengaluru','Pune','Hyderabad','Gurugram','Chennai','Remote','London','Austin'];

  S.name = function () { return S.pick(S.FIRST) + ' ' + S.pick(S.LAST); };
  S.email = function (name, domain) {
    return name.toLowerCase().replace(/[^a-z ]/g, '').split(' ').join('.') + '@' + (domain || 'example.com');
  };

  GGL.seed = S;
})(window.GGL = window.GGL || {});
