/* The PDF builders run for real (jsPDF) and produce well-formed files. Layout is checked by eye, see QA.md. */
const path = require("path");
const { jsPDF } = require("jspdf");
const at = require("jspdf-autotable");
(at.applyPlugin || at.default.applyPlugin)(jsPDF);
globalThis.jspdf = { jsPDF };
require(path.join(__dirname, "..", "assets", "tools-core.js"));
const T = globalThis.GGTools;
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log("FAIL:", m); } };

const ratings = {}, comments = {};
T.TOF_SECTIONS.forEach((s, i) => s.items.forEach((_, j) => { const k = i + "-" + j; ratings[k] = ["Y", "Y", "N", "N/A"][(i * 7 + j) % 4]; if (j % 3 === 0) comments[k] = "Good use of examples. Naïve “quoted” café — ok"; }));
const tof = { header: { trainer: "Nikita Shah", evaluator: "Gopi", date: "2026-09-18", time: "14:30", topic: "Coaching", duration: "90" }, ratings, comments, notes: { strengths: "Warm.", improve: "Pacing.", recommendations: "" } };
const rows = [{ name: "Nikita", month: "July", l1: 92.7, tof: 91.5, thr: 95.5, util: 102, att: 100 }, { name: "Vandana", month: "July", l1: 94.8, tof: 86.96, thr: 93.75, util: 97.43, att: 80 }, { name: "Ravi", month: "July", l1: 90, tof: "", thr: 90, util: 90, att: 90 }];

for (const [label, r] of [["TOF", T.tofPdf(tof, null)], ["TOF custom", T.tofPdf(tof, { tof: { sectionWeights: [3, 1, 1, 1, 1, 1, 1] } })], ["Effectiveness", T.effPdf(rows, null)], ["Effectiveness custom", T.effPdf(rows, { eff: { weights: { l1: 20, tof: 20, thr: 20, util: 20, att: 20 }, gate: { util: true } } })], ["Effectiveness empty", T.effPdf([], null)]]) {
  const buf = Buffer.from(r.doc.output("arraybuffer"));
  ok(buf.slice(0, 5).toString() === "%PDF-" && buf.length > 2000, label + " PDF is well-formed (" + buf.length + " bytes, " + r.doc.getNumberOfPages() + " pages)");
  ok(/\.pdf$/.test(r.filename), label + " has a .pdf file name: " + r.filename);
}
console.log(bad ? "\npdf tests: " + bad + " FAILED" : "pdf tests: all passed");
process.exit(bad ? 1 : 0);
