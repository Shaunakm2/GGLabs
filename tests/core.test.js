/* Scoring rules: parity with the Excel workbooks, custom scoring profiles, report checks, analytics, print pages. */
const fs = require("fs"), path = require("path");
require(path.join(__dirname, "..", "assets", "tools-core.js"));
const T = globalThis.GGTools;
const fx = n => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", n)));
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log("FAIL:", m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + "  got " + JSON.stringify(a) + " want " + JSON.stringify(b));

// ---- 1. parity with the workbooks (fixtures were produced by recalculating your .xlsx files in LibreOffice)
const exp = fx("expected.json"), cases = fx("eff_cases.json"), rat = fx("tof_ratings.json");
const rows = cases.map((v, i) => ({ name: "T" + i, month: "July", l1: v[0], tof: v[1], thr: v[2], util: v[3], att: v[4] }));
rows.forEach((r, i) => {
  const c = T.calcRow(r), e = exp.eff[i];
  const effOK = c.eff === null ? (e.H === null || e.H === "") : Math.abs(c.eff / 100 - e.H) < 1e-9;
  ok(effOK && c.rating === e.I && c.improve === e.J, "effectiveness row " + i + " matches Excel");
});
const d = T.calcDashboard(rows);
ok(d.records === exp.dash.A5 && Math.abs(d.avg / 100 - exp.dash.D5) < 1e-9 && d.counts["Effective"] === exp.dash.G5 && d.counts["Needs Improvement"] === exp.dash.J5, "dashboard counts/average match Excel");
const idx = []; T.TOF_SECTIONS.forEach((s, i) => s.items.forEach((_, j) => idx.push(i + "-" + j)));
const ratings = {}; idx.forEach((k, n) => { if (rat[n]) ratings[k] = rat[n]; });
const tc = T.calcTof(ratings);
tc.sections.forEach((s, i) => ok(exp.tof[i] === "--" ? s.score === null : Math.abs(s.score - exp.tof[i]) < 1e-9, "TOF section " + (i + 1) + " matches Excel"));
ok(Math.abs(tc.overall - exp.tof[7]) < 1e-9, "TOF overall matches Excel");
eq(T.calcTof({}).sections.map(s => s.score), [0, 0, 0, 0, 0, 0, 0], "blank form scores 0 like the workbook");

// ---- 2. custom scoring profiles
const row = { name: "A", month: "July", l1: 90, tof: 90, thr: 95, util: 80, att: 96 };
eq(T.calcRow(row).eff, 89.8, "default effectiveness"); eq(T.calcRow(row).rating, "Satisfactory", "default rating");
eq(T.calcRow(row, { eff: { weights: { l1: 20, tof: 20, thr: 20, util: 20, att: 20 } } }).eff, (90 + 90 + 95 + 80 + 96) / 5, "equal weights");
eq(T.calcRow(row, { eff: { weights: { l1: 3, tof: 3, thr: 2, util: 1.5, att: .5 } } }).eff, 89.8, "weights are normalised");
eq(T.calcRow(row, { eff: { gate: { util: true } } }).rating, "Needs Improvement", "a gated measure forces Needs Improvement");
eq(T.calcRow({ ...row, tof: 80, util: 95 }, { eff: { gate: { tof: false } } }).rating, "Satisfactory", "gate off");
eq(T.calcRow({ ...row, tof: 80, util: 95 }, { eff: { gate: { tof: false }, min: { tof: 75 } } }).improve, "No Improvement Required", "custom minimum");
eq(T.calcRow(row, { eff: { effective: 89, satisfactory: 80 } }).rating, "Effective", "custom cut-offs");
eq(T.normCfg("garbage"), T.normCfg(null), "garbage profile falls back to defaults");
eq(T.normCfg({ eff: { weights: { l1: 0, tof: 0, thr: 0, util: 0, att: 0 } } }).eff.weights, T.DEFAULT_CFG.eff.weights, "all-zero weights fall back");
const rt = { "0-0": "Y", "0-1": "Y", "0-2": "N", "0-3": "N", "1-0": "Y", "1-1": "Y", "1-2": "Y" };
eq(T.calcTof(rt, { tof: { sectionWeights: [3, 1, 0, 0, 0, 0, 0] } }).overall, (3 * 0.5 + 1) / 4, "weighted TOF overall");
eq(T.calcTof(rt, { tof: { sectionWeights: [1, 2] } }).weighted, false, "wrong-length section weights ignored");

// ---- 3. checking a saved report
const tofState = { header: { trainer: "Riya" }, ratings: rt, comments: {}, notes: {} };
const cfgC = T.normCfg({ eff: { effective: 92 } });
const good = { type: "tof", score: T.pct(T.calcTof(rt, cfgC).overall, 2), scoring: JSON.stringify(cfgC), payload: JSON.stringify({ tof: tofState, cfg: cfgC }) };
ok(T.verifyReport(good).ok, "an honest report verifies");
ok(!T.verifyReport({ ...good, score: "99.00%" }).ok, "a doctored score is caught");
ok(!T.verifyReport({ ...good, scoring: "" }).ok, "scoring that is not the admin's profile is caught");
{ const legacy = { ...good }; delete legacy.scoring; ok(T.verifyReport(legacy).ok, "legacy report (no scoring field) still verifies on score"); }
ok(!T.verifyReport({ type: "eff", score: "1%", payload: "not json" }).ok, "unreadable payload is flagged");
const effRows = [{ name: "Nikita", month: "July", l1: 92.7, tof: 91.5, thr: 95.5, util: 102, att: 100 }, { name: "Vandana", month: "July", l1: 94.8, tof: 86.96, thr: 93.75, util: 97.43, att: 80 }];
const effRec = { type: "eff", score: "93.28%", scoring: "", payload: JSON.stringify({ rows: effRows, cfg: T.normCfg(null) }) };
ok(T.verifyReport(effRec).ok, "effectiveness report verifies (93.28%)");

// ---- 4. analytics
const reports = [
  { uid: "u1", type: "eff", createdAt: "2026-07-05T10:00:00Z", payload: effRec.payload },
  { uid: "u1", type: "tof", createdAt: "2026-07-06T10:00:00Z", payload: good.payload },
  { uid: "u2", type: "eff", createdAt: "2026-09-02T10:00:00Z", payload: JSON.stringify({ rows: [{ name: "nikita", month: "September", l1: 80, tof: 80, thr: 80, util: 80, att: 80 }], cfg: T.normCfg(null) }) },
];
const users = [{ id: "u1", fields: { name: "One" } }, { id: "u2", fields: { name: "Two" } }, { id: "u3", fields: { name: "Three" } }, { id: "u4", fields: { name: "Off", active: "false" } }];
const a = T.analytics(users, reports, "2026-09-20T00:00:00Z");
eq(a.kpis, { reports: 3, thisMonth: 1, activeParticipants: 3, submittedThisMonth: 1 }, "analytics KPIs");
eq(a.missing, ["One", "Three"], "who has not submitted this month (suspended users excluded)");
const nik = a.trainers.find(t => t.name.toLowerCase() === "nikita");
ok(nik && Math.abs(nik.eff - 80) < 1e-9 && nik.rating === "Needs Improvement", "latest effectiveness per trainer is the newest report, names matched case-insensitively");
eq(a.trainers.find(t => t.name === "Riya").tof, T.calcTof(rt, cfgC).overall, "latest TOF per trainer");
eq(a.monthly.map(m => m.label), ["July 2026", "September 2026"], "monthly trend is in date order");
eq(a.distribution.map(x => x.count), [0, 0, 2], "rating distribution over the latest record per trainer");

// ---- 5. print pages and unicode detection
ok(T.needsUnicode("ગુજરાતી"), "Gujarati needs the print view");
ok(T.needsUnicode("\u20B9500"), "the rupee sign is outside the PDF's built-in fonts too");
ok(!T.needsUnicode("Naïve “quoted” café — ok"), "Western text does not");
const html = T.tofPrintHtml({ header: { trainer: "Riya <b>", date: "2026-09-18" }, ratings: rt, comments: { "0-0": "ગુજરાતી comment" }, notes: { strengths: "x & y" } }, null);
ok(html.includes("Riya &lt;b&gt;") && html.includes("ગુજરાતી comment") && html.includes("x &amp; y") && html.includes("Overall Score"), "TOF print page: escaped, keeps other scripts, has scores");
const html2 = T.effPrintHtml(effRows, null);
ok(html2.includes("Trainer Performance Dashboard") && html2.includes("94.66%") && html2.includes("Needs Improvement"), "Effectiveness print page has the results");

console.log(bad ? "\ncore tests: " + bad + " FAILED" : "core tests: all passed");
process.exit(bad ? 1 : 0);
