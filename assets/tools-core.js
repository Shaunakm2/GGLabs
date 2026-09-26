/* =============================================================================
   Trainer tools — scoring rules and PDF reports (no page/DOM code in here)

   Two tools, both ported from the Excel files:
     1. Trainer Observation Form (TOF)  -> section scores + overall score
     2. Trainer Effectiveness           -> weighted score, rating, improvement areas

   Every rule below mirrors a formula in the workbooks; the comment above each
   one says which.
   ========================================================================== */
(function (root) {
  "use strict";

  /* ---------------------------------------------------------------- 1. TOF */

  const TOF_SECTIONS = [
    { title: "1. Classroom Readiness", items: [
      "Preparedness and Utilization of Training Equipment's / Technology",
      "Availability and Organization of Training Materials and Supplies",
      "Provision and Display of Learner Name Tents",
      "Maintenance of a Professional and Organized Classroom Environment",
    ] },
    { title: "2. Facilitator Readiness", items: [
      "Facilitator Presence at Least 15 Minutes Prior to Session Start",
      "Establishment of a Positive Learning Environment through Rapport Building",
      "Adherence to Scheduled Session Start and End Times",
    ] },
    { title: "3. Training Introduction", items: [
      "Utilization of an Engaging and Impactful Opening",
      "Clearly Communicated the \u201CWhat\u2019s In It For Me\u201D (WIIFM) to Learners",
      "Clear Communication of Learning Objectives",
      "Encouragement of Learner Participation in Identifying Additional Learning Objectives",
    ] },
    { title: "4. Facilitation Skills", items: [
      "Effective Use of Vocal Dynamics (Voice and Tone)",
      "Adaptation of Speech Rate to Support Learner Needs",
      "Use of Clear and Appropriate Language",
      "Consistent and Engaging Eye Contact",
      "Recognition and Response to Non-Verbal Cues",
      "Posture and Body Language Demonstration",
      "Effective Use of Hand Gestures and Facial Expressions",
      "Accuracy and Clarity in Responding to Learner Questions",
      "Engagement and Sustained Learner Interest",
      "Seamless Use of Transitions Between Topics",
      "Consistent Reinforcement of Key Learning Points",
    ] },
    { title: "5. Content / Subject Matter Expertise", items: [
      "Effective Use of Facilitator Guide and Training Materials",
      "Ensured completeness of training /content delivered",
      "Accuracy and Reliability of Training Information",
      "Effective Facilitation and Management of Learning Activities",
      "Comprehensive Debriefing to Reinforce Learning Transfer",
    ] },
    { title: "6. Classroom Management / Professionalism", items: [
      "Approachability and Confidence",
      "Professional Appearance and Attire",
      "Creative Problem-Solving in Ambiguous Situations",
      "Timely and Appropriate Management of Inappropriate Behavior",
      "Respect and Recognition of Adult Learners",
      "Minimization of Trainer Distractions",
    ] },
    { title: "7. Closing", items: [
      "Summary of Key Points and Identification of Learning Gaps",
      "Completion and Accuracy of Knowledge and Skills Assessment",
      "Facilitation of Learner Feedback through Level 1 Evaluations",
    ] },
  ];

  // Excel column L:  =IF(G="Y",1,IF(G="N/A",2,0))
  // Y counts as a pass, N/A is left out, anything else (N, or not yet rated) counts as a fail.
  function tofValue(rating) {
    return rating === "Y" ? 1 : rating === "N/A" ? 2 : 0;
  }

  // Section score: COUNTIF(L,1) / COUNTIF(L,"<2")  -> "--" (null) when nothing is scored.
  // Overall score: the same formula over every item (the Excel form), unless an admin has set
  // section weights for this participant, in which case the section scores are averaged by weight.
  function calcTof(ratings, cfg, sections) {
    ratings = ratings || {};
    cfg = normCfg(cfg);
    const secDefs = Array.isArray(sections) && sections.length ? sections : TOF_SECTIONS;
    let allY = 0, allScored = 0, unrated = 0, total = 0;
    const built = secDefs.map(function (sec, i) {
      let y = 0, scored = 0, un = 0;
      sec.items.forEach(function (_, j) {
        const r = ratings[i + "-" + j];
        const v = tofValue(r);
        if (v === 1) y++;
        if (v < 2) scored++;
        if (!r) un++;
      });
      allY += y; allScored += scored; unrated += un; total += sec.items.length;
      return { title: sec.title, score: scored ? y / scored : null, yes: y, scored: scored, unrated: un };
    });
    let overall = allScored ? allY / allScored : null;
    // Section weights only apply to a form with the same number of sections they were set for; a custom
    // form a company built later just falls back to the plain pooled score instead of breaking.
    const sw = cfg.tof.sectionWeights && cfg.tof.sectionWeights.length === built.length ? cfg.tof.sectionWeights : null;
    if (sw) {
      let top = 0, bottom = 0;
      built.forEach(function (s, i) { if (s.score !== null) { top += sw[i] * s.score; bottom += sw[i]; } });
      overall = bottom > 0 ? top / bottom : null;
    }
    return { sections: built, overall: overall, unrated: unrated, total: total, weighted: !!sw, sectionDefs: secDefs };
  }

  /* ------------------------------------------------------- 2. Effectiveness */

  const EFF_KEYS = ["l1", "tof", "thr", "util", "att"];
  const EFF_LABELS = { l1: "L1 Score", tof: "TOF", thr: "Throughput", util: "Utilization", att: "Attendance" };

  // The workbook's rules, as the default scoring profile. An admin can change any of these per participant.
  //   weights  H: L1*30% + TOF*30% + Throughput*20% + Utilization*15% + Attendance*5%
  //   min      J: flagged as an improvement area when below (percent points)
  //   gate     I: below the minimum forces "Needs Improvement" (L1, TOF, Throughput in the workbook)
  //   effective / satisfactory: Effective above 90, Satisfactory from 85
  const DEFAULT_CFG = {
    eff: {
      weights: { l1: 30, tof: 30, thr: 20, util: 15, att: 5 },
      min: { l1: 88, tof: 88, thr: 90, util: 90, att: 95 },
      gate: { l1: true, tof: true, thr: true, util: false, att: false },
      effective: 90, satisfactory: 85,
    },
    tof: { sectionWeights: null },
  };
  const RATINGS = ["Effective", "Satisfactory", "Needs Improvement"];

  function num(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : parseFloat(String(v).replace("%", "").trim());
    return isFinite(n) ? n : null;
  }
  function round9(x) { return Math.round(x * 1e9) / 1e9; }

  // Fill gaps and repair bad values so a half-filled or hand-edited profile can never break scoring.
  function normCfg(c) {
    c = c && typeof c === "object" ? c : {};
    const d = DEFAULT_CFG, e = c.eff || {};
    const out = { eff: { weights: {}, min: {}, gate: {}, effective: 0, satisfactory: 0 }, tof: { sectionWeights: null } };
    let sum = 0;
    EFF_KEYS.forEach(function (k) {
      const w = num(e.weights && e.weights[k]);
      out.eff.weights[k] = w !== null && w >= 0 ? w : d.eff.weights[k];
      const m = num(e.min && e.min[k]);
      out.eff.min[k] = m !== null ? m : d.eff.min[k];
      out.eff.gate[k] = e.gate && typeof e.gate[k] === "boolean" ? e.gate[k] : d.eff.gate[k];
      sum += out.eff.weights[k];
    });
    if (!(sum > 0)) EFF_KEYS.forEach(function (k) { out.eff.weights[k] = d.eff.weights[k]; });
    const ef = num(e.effective), sa = num(e.satisfactory);
    out.eff.effective = ef !== null ? ef : d.eff.effective;
    out.eff.satisfactory = sa !== null ? sa : d.eff.satisfactory;
    const sw = c.tof && c.tof.sectionWeights;
    if (Array.isArray(sw) && sw.length === TOF_SECTIONS.length) {
      const nums = sw.map(function (x) { const n = num(x); return n !== null && n >= 0 ? n : 0; });
      if (nums.reduce(function (a, b) { return a + b; }, 0) > 0) out.tof.sectionWeights = nums;
    }
    return out;
  }

  function cfgIsCustom(cfg) { return JSON.stringify(normCfg(cfg)) !== JSON.stringify(normCfg(null)); }

  // Combine a company's scoring profile with a person's own (the person's own fields win, field by field).
  // Either side may be null/undefined/unparsable; that side then contributes nothing.
  function layerCfg(companyRaw, personRaw) {
    const c = (companyRaw && typeof companyRaw === "object") ? companyRaw : {};
    const p = (personRaw && typeof personRaw === "object") ? personRaw : {};
    const ce = c.eff || {}, pe = p.eff || {};
    const out = { eff: { weights: {}, min: {}, gate: {} }, tof: {} };
    EFF_KEYS.forEach(function (k) {
      if (pe.weights && pe.weights[k] !== undefined) out.eff.weights[k] = pe.weights[k]; else if (ce.weights && ce.weights[k] !== undefined) out.eff.weights[k] = ce.weights[k];
      if (pe.min && pe.min[k] !== undefined) out.eff.min[k] = pe.min[k]; else if (ce.min && ce.min[k] !== undefined) out.eff.min[k] = ce.min[k];
      if (pe.gate && pe.gate[k] !== undefined) out.eff.gate[k] = pe.gate[k]; else if (ce.gate && ce.gate[k] !== undefined) out.eff.gate[k] = ce.gate[k];
    });
    out.eff.effective = pe.effective !== undefined ? pe.effective : ce.effective;
    out.eff.satisfactory = pe.satisfactory !== undefined ? pe.satisfactory : ce.satisfactory;
    out.tof.sectionWeights = (p.tof && p.tof.sectionWeights) || (c.tof && c.tof.sectionWeights) || null;
    return out;
  }

  // Values are entered and stored as percent points (92.7 means 92.7%).
  function calcRow(row, cfg) {
    const E = normCfg(cfg).eff;
    const v = {};
    let complete = true;
    EFF_KEYS.forEach(function (k) {
      v[k] = num(row[k]);
      if (v[k] === null) complete = false;
    });
    // =IF(COUNT(C:G)<5, ...) -> not enough data yet
    if (!complete) return { complete: false, eff: null, rating: "Pending Data", improve: "Pending Data", flags: [] };

    const wsum = EFF_KEYS.reduce(function (s, k) { return s + E.weights[k]; }, 0);
    const eff = round9(EFF_KEYS.reduce(function (sum, k) { return sum + v[k] * E.weights[k]; }, 0) / wsum);
    const flags = EFF_KEYS.filter(function (k) { return v[k] < E.min[k]; });

    // I:  a gated measure below its minimum -> Needs Improvement; else Effective / Satisfactory by cut-off
    let rating;
    if (flags.some(function (k) { return E.gate[k]; })) rating = "Needs Improvement";
    else if (eff > E.effective) rating = "Effective";
    else if (eff >= E.satisfactory) rating = "Satisfactory";
    else rating = "Needs Improvement";

    return {
      complete: true, eff: eff, rating: rating, flags: flags,
      improve: flags.length ? flags.map(function (k) { return EFF_LABELS[k]; }).join(", ") : "No Improvement Required",
    };
  }

  // One line describing the rules in force, for screens and PDFs.
  function effMethod(cfg) {
    const E = normCfg(cfg).eff;
    const trim = function (n) { return String(parseFloat(Number(n).toFixed(2))); };
    const gated = EFF_KEYS.filter(function (k) { return E.gate[k]; }).map(function (k) { return EFF_LABELS[k] + " < " + trim(E.min[k]) + "%"; });
    return "Effectiveness = " + EFF_KEYS.map(function (k) { return trim(E.weights[k]) + "% " + EFF_LABELS[k]; }).join(" + ") + ". " +
      (gated.length ? "Needs Improvement if " + gated.join(", ") + "; otherwise " : "Rated on effectiveness alone: ") +
      "Effective above " + trim(E.effective) + "% and Satisfactory from " + trim(E.satisfactory) + "%. " +
      "Improvement areas are flagged below: " + EFF_KEYS.map(function (k) { return EFF_LABELS[k] + " " + trim(E.min[k]) + "%"; }).join(", ") + ".";
  }

  function tofMethod(cfg, sections) {
    const n = (Array.isArray(sections) && sections.length ? sections : TOF_SECTIONS).length;
    const sw = normCfg(cfg).tof.sectionWeights;
    if (!sw || sw.length !== n) return "Score = items rated Y \u00F7 items rated Y or N. Items marked N/A are left out.";
    return "Overall = section scores averaged by weight (" + sw.map(function (w, i) { return (i + 1) + ": " + String(parseFloat(w.toFixed(2))); }).join(", ") +
      "). Each section score = items rated Y \u00F7 items rated Y or N; N/A items are left out.";
  }

  function plural(n, one, many) { return n === 1 ? one : many; }

  // The Dashboard sheet: counts, average, distribution and the summary sentence.
  function calcDashboard(rows, cfg) {
    const named = (rows || []).filter(function (r) { return String(r.name || "").trim() !== ""; });
    const list = named.map(function (r) { return Object.assign({ row: r }, calcRow(r, cfg)); });
    const rated = list.filter(function (c) { return c.eff !== null; });
    const records = list.length;

    const avg = rated.length ? rated.reduce(function (s, c) { return s + c.eff; }, 0) / rated.length : null;
    let top = null;
    rated.forEach(function (c) { if (!top || c.eff > top.eff) top = c; });

    const counts = {};
    RATINGS.forEach(function (r) { counts[r] = list.filter(function (c) { return c.rating === r; }).length; });
    const dist = RATINGS.map(function (r) {
      return { rating: r, count: counts[r], share: records ? counts[r] / records : 0 };
    });

    const months = [];
    named.forEach(function (r) { if (r.month && months.indexOf(r.month) === -1) months.push(r.month); });
    const monthLabel = months.length === 1 ? months[0] : months.length > 1 ? "multiple months" : "the selected period";

    // The workbook's last sentence is fixed text; here it follows the data.
    const tally = {};
    rated.forEach(function (c) { c.flags.forEach(function (k) { tally[k] = (tally[k] || 0) + 1; }); });
    let common = null;
    Object.keys(tally).forEach(function (k) { if (!common || tally[k] > tally[common]) common = k; });

    let summary;
    if (!records) {
      summary = "No trainer records yet. Add a trainer name and the five measures to see the results.";
    } else {
      summary = "The current view includes " + records + " completed trainer " + plural(records, "record", "records") +
        " for " + monthLabel + ", with average effectiveness of " + (avg === null ? "\u2014" : avg.toFixed(1) + "%") + ". ";
      if (top) summary += top.row.name.trim() + " leads at " + top.eff.toFixed(1) + "%, while ";
      else summary += "No trainer has complete data yet, while ";
      summary += counts["Needs Improvement"] + " " + plural(counts["Needs Improvement"], "trainer requires", "trainers require") + " improvement.";
      if (common) {
        summary += " " + EFF_LABELS[common] + " is the most common improvement area (" + tally[common] + " of " +
          rated.length + " rated " + plural(rated.length, "trainer", "trainers") + ").";
      }
    }

    return { list: list, records: records, avg: avg, top: top, counts: counts, dist: dist, monthLabel: monthLabel, summary: summary };
  }

  /* ------------------------------------------------------------ formatting */

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function pct(x, digits) { return x === null || x === undefined ? "--" : (x * 100).toFixed(digits || 0) + "%"; }
  function pts(x, digits) { return x === null || x === undefined ? "\u2014" : x.toFixed(digits === undefined ? 2 : digits) + "%"; }
  function trimPts(v) { const n = num(v); return n === null ? "\u2014" : String(parseFloat(n.toFixed(2))) + "%"; }

  function fmtDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? Number(m[3]) + " " + MONTHS[Number(m[2]) - 1].slice(0, 3) + " " + m[1] : "\u2014";
  }
  function fmtTime(t) {
    const m = /^(\d{2}):(\d{2})/.exec(t || "");
    if (!m) return "\u2014";
    const h = Number(m[1]);
    return ((h + 11) % 12 + 1) + ":" + m[2] + " " + (h >= 12 ? "PM" : "AM");
  }

  /* -------------------------------------------------------------------- PDF */

  const INK = [23, 36, 59], LIME = [201, 236, 98], CREAM = [245, 241, 233], PAPER = [244, 246, 250];
  const CORAL = [241, 160, 139], YELLOW = [247, 208, 106], SKY = [182, 216, 236], GREY = [122, 128, 140];
  const LINE = [214, 218, 226], GOOD = [222, 242, 190], BAD = [251, 214, 205], NEUTRAL = [232, 234, 239];

  // The built-in PDF fonts only cover Western characters; anything else would print as junk.
  function safe(text) {
    return String(text === null || text === undefined ? "" : text)
      .replace(/[^\n\x20-\x7E\xA0-\xFF\u2018\u2019\u201C\u201D\u2013\u2014\u2022\u2026\u20AC]/g, "?");
  }

  function newDoc(orientation) {
    const lib = root.jspdf && root.jspdf.jsPDF;
    if (!lib) throw new Error("The PDF library did not load.");
    const doc = new lib({ unit: "mm", format: "a4", orientation: orientation || "portrait" });
    if (typeof doc.autoTable !== "function") throw new Error("The PDF table plugin did not load.");
    return doc;
  }

  function band(doc, kicker, title, subtitle, brand) {
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(INK[0], INK[1], INK[2]);
    doc.rect(0, 0, W, subtitle ? 32 : 28, "F");
    doc.setFillColor(LIME[0], LIME[1], LIME[2]);
    doc.rect(0, subtitle ? 32 : 28, W, 1.6, "F");
    doc.setTextColor(LIME[0], LIME[1], LIME[2]);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(safe(kicker).toUpperCase(), 14, 11);
    doc.setTextColor(CREAM[0], CREAM[1], CREAM[2]);
    doc.setFontSize(20);
    doc.text(safe(title), 14, 21);
    if (subtitle) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.text(safe(subtitle), 14, 28);
    }
    if (brand && brand.logo && /^data:image\/(png|jpeg);base64,/.test(brand.logo)) {
      try {
        const size = 20, type = brand.logo.indexOf("data:image/png") === 0 ? "PNG" : "JPEG";
        doc.addImage(brand.logo, type, W - 14 - size, 5, size, size);
      } catch (e) { /* a broken logo image is skipped, never blocks the PDF */ }
    }
    doc.setTextColor(INK[0], INK[1], INK[2]);
    return (subtitle ? 32 : 28) + 8;
  }

  function footers(doc) {
    const n = doc.internal.getNumberOfPages();
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    const d = new Date();
    const stamp = d.getDate() + " " + MONTHS[d.getMonth()].slice(0, 3) + " " + d.getFullYear();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text("GG Learning Labs  \u00B7  Generated " + stamp, 14, H - 8);
      doc.text("Page " + i + " of " + n, W - 14, H - 8, { align: "right" });
    }
  }

  function heading(doc, y, text) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(safe(text), 14, y);
    return y + 3;
  }

  function fileSlug(text) {
    return String(text || "").trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  }

  // ---- Trainer Observation Form -> PDF
  function tofPdf(state, cfg, sections, brand) {
    const doc = newDoc("portrait");
    const h = state.header || {};
    const calc = calcTof(state.ratings, cfg, sections);
    const base = { styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.2, textColor: INK, lineColor: LINE, lineWidth: 0.2, overflow: "linebreak" }, margin: { left: 14, right: 14, bottom: 16 } };

    let y = band(doc, (brand && brand.name) || "Learning & Development Team", "Trainer Observation Form", null, brand);

    doc.autoTable(Object.assign({}, base, {
      startY: y, theme: "grid",
      body: [
        ["Trainer name", safe(h.trainer) || "\u2014", "Evaluator", safe(h.evaluator) || "\u2014"],
        ["Observation date", fmtDate(h.date), "Observation time", fmtTime(h.time)],
        ["Class / topic", safe(h.topic) || "\u2014", "Duration (mins)", safe(h.duration) || "\u2014"],
      ],
      columnStyles: {
        0: { fontStyle: "bold", fillColor: PAPER, cellWidth: 32 }, 1: { cellWidth: "auto" },
        2: { fontStyle: "bold", fillColor: PAPER, cellWidth: 32 }, 3: { cellWidth: "auto" },
      },
    }));

    y = doc.lastAutoTable.finalY + 9;
    y = heading(doc, y, "Score summary");
    const summaryBody = calc.sections.map(function (s) { return [safe(s.title), pct(s.score, 0)]; });
    summaryBody.push(["Overall Score", pct(calc.overall, 2)]);
    doc.autoTable(Object.assign({}, base, {
      startY: y, theme: "grid",
      head: [["Section", "Score"]],
      headStyles: { fillColor: INK, textColor: CREAM, fontStyle: "bold" },
      body: summaryBody,
      columnStyles: { 1: { halign: "right", cellWidth: 30, fontStyle: "bold" } },
      didParseCell: function (d) {
        if (d.section === "body" && d.row.index === summaryBody.length - 1) {
          d.cell.styles.fillColor = LIME; d.cell.styles.fontStyle = "bold";
        }
      },
    }));
    y = doc.lastAutoTable.finalY + 3;
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    let note = tofMethod(cfg, calc.sectionDefs) + (cfgIsCustom(cfg) ? " Custom scoring profile applied." : "");
    if (calc.unrated) note += " " + calc.unrated + " of " + calc.total + " items were not rated and are counted as N.";
    doc.text(doc.splitTextToSize(note, 182), 14, y + 3);
    y += 3 + doc.splitTextToSize(note, 182).length * 3.4 + 5;

    const pageH = doc.internal.pageSize.getHeight();
    calc.sectionDefs.forEach(function (sec, i) {
      if (y > pageH - 50) { doc.addPage(); y = 16; }
      const rows = sec.items.map(function (label, j) {
        return [safe(label), (state.ratings || {})[i + "-" + j] || "\u2014", safe((state.comments || {})[i + "-" + j])];
      });
      doc.autoTable(Object.assign({}, base, {
        startY: y, theme: "grid",
        head: [
          [{ content: safe(sec.title) + "   |   " + pct(calc.sections[i].score, 0), colSpan: 3, styles: { fillColor: INK, textColor: CREAM, fontStyle: "bold", fontSize: 9 } }],
          [{ content: "Item", styles: { fillColor: PAPER } }, { content: "Rating", styles: { fillColor: PAPER, halign: "center" } }, { content: "Comments", styles: { fillColor: PAPER } }],
        ],
        headStyles: { textColor: INK, fontStyle: "bold" },
        body: rows,
        rowPageBreak: "avoid",
        columnStyles: { 0: { cellWidth: 88 }, 1: { cellWidth: 17, halign: "center", fontStyle: "bold" }, 2: { cellWidth: "auto" } },
        didParseCell: function (d) {
          if (d.section === "body" && d.column.index === 1) {
            const r = d.cell.raw;
            if (r === "Y") d.cell.styles.fillColor = GOOD;
            else if (r === "N") d.cell.styles.fillColor = BAD;
            else if (r === "N/A") d.cell.styles.fillColor = NEUTRAL;
          }
        },
      }));
      y = doc.lastAutoTable.finalY + 7;
    });

    [["Strengths", state.notes && state.notes.strengths],
     ["Areas for improvement", state.notes && state.notes.improve],
     ["Recommendations", state.notes && state.notes.recommendations]].forEach(function (n) {
      if (y > pageH - 45) { doc.addPage(); y = 16; }
      doc.autoTable(Object.assign({}, base, {
        startY: y, theme: "grid",
        head: [[n[0]]], headStyles: { fillColor: INK, textColor: CREAM, fontStyle: "bold" },
        body: [[safe(n[1]).trim() || "\u2014"]],
        rowPageBreak: "avoid",
        bodyStyles: { minCellHeight: 14 },
      }));
      y = doc.lastAutoTable.finalY + 6;
    });

    footers(doc);
    return { doc: doc, filename: "Trainer-Observation-" + (fileSlug(h.trainer) || "Form") + (h.date ? "-" + h.date : "") + ".pdf" };
  }

  // ---- Trainer Effectiveness -> PDF
  function effPdf(rows, cfg, brand) {
    const doc = newDoc("landscape");
    const W = doc.internal.pageSize.getWidth();
    const d = calcDashboard(rows, cfg);
    const base = { styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.2, textColor: INK, lineColor: LINE, lineWidth: 0.2, overflow: "linebreak" }, margin: { left: 14, right: 14, bottom: 16 } };

    let y = band(doc, (brand && brand.name) || "Trainer performance", "Trainer Performance Dashboard",
      d.monthLabel.charAt(0).toUpperCase() + d.monthLabel.slice(1) + " performance overview  |  Weighted effectiveness and improvement priorities", brand);

    // KPI tiles
    const tiles = [
      ["COMPLETED RECORDS", String(d.records), "Rows with trainer names"],
      ["AVG EFFECTIVENESS", d.avg === null ? "\u2014" : d.avg.toFixed(2) + "%", "Weighted score across completed records"],
      ["EFFECTIVE TRAINERS", String(d.counts["Effective"]), "Meeting effectiveness criteria"],
      ["NEEDS IMPROVEMENT", String(d.counts["Needs Improvement"]), "Below one or more required thresholds"],
    ];
    const gap = 4, tw = (W - 28 - gap * 3) / 4, tiles_fill = [SKY, LIME, YELLOW, CORAL];
    tiles.forEach(function (t, i) {
      const x = 14 + i * (tw + gap);
      doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]); doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
      doc.rect(x, y, tw, 26, "FD");
      doc.setFillColor(tiles_fill[i][0], tiles_fill[i][1], tiles_fill[i][2]);
      doc.rect(x, y, 1.8, 26, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(t[0], x + 6, y + 7);
      doc.setFontSize(18); doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(safe(t[1]), x + 6, y + 17);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(doc.splitTextToSize(t[2], tw - 9), x + 6, y + 22.5);
    });
    y += 26 + 8;

    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(INK[0], INK[1], INK[2]);
    const sumLines = doc.splitTextToSize(safe(d.summary), W - 28);
    doc.text(sumLines, 14, y);
    y += sumLines.length * 4.6 + 5;

    y = heading(doc, y, "Trainer scorecard");
    const body = d.list.map(function (c) {
      const r = c.row;
      return [safe(r.name).trim(), safe(r.month) || "\u2014", trimPts(r.l1), trimPts(r.tof), trimPts(r.thr), trimPts(r.util), trimPts(r.att),
        c.eff === null ? "\u2014" : pts(c.eff, 2), c.rating, safe(c.improve)];
    });
    doc.autoTable(Object.assign({}, base, {
      startY: y, theme: "grid",
      head: [["Trainer", "Month", "L1 Score", "TOF", "Throughput", "Utilization", "Attendance", "Effectiveness", "Rating", "Area of improvement"]],
      headStyles: { fillColor: INK, textColor: CREAM, fontStyle: "bold" },
      body: body.length ? body : [[{ content: "No trainer records yet.", colSpan: 10, styles: { halign: "center", textColor: GREY } }]],
      rowPageBreak: "avoid",
      columnStyles: { 0: { fontStyle: "bold" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right", fontStyle: "bold" }, 8: { fontStyle: "bold" } },
      didParseCell: function (data) {
        if (data.section !== "body" || !d.list.length) return;
        const c = d.list[data.row.index], col = data.column.index;
        if (col >= 2 && col <= 6 && c.complete && c.flags.indexOf(EFF_KEYS[col - 2]) !== -1) {
          data.cell.styles.fillColor = BAD;
        }
        if (col === 8) {
          data.cell.styles.fillColor = c.rating === "Effective" ? GOOD : c.rating === "Satisfactory" ? [252, 238, 190] : c.rating === "Needs Improvement" ? BAD : NEUTRAL;
        }
      },
    }));
    y = doc.lastAutoTable.finalY + 9;

    if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 20; }
    y = heading(doc, y, "Rating distribution");
    doc.autoTable(Object.assign({}, base, {
      startY: y, theme: "grid", tableWidth: 110,
      head: [["Rating", "Count", "Share"]],
      headStyles: { fillColor: INK, textColor: CREAM, fontStyle: "bold" },
      body: d.dist.map(function (r) { return [r.rating, String(r.count), pct(r.share, 0)]; }),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    }));
    y = doc.lastAutoTable.finalY + 6;

    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    const how = effMethod(cfg) + (cfgIsCustom(cfg) ? " Custom scoring profile applied." : "") + " Rows without a trainer name are not counted.";
    const howLines = doc.splitTextToSize(how, W - 28);
    if (y + howLines.length * 3.4 > doc.internal.pageSize.getHeight() - 16) { doc.addPage(); y = 20; }
    doc.text(howLines, 14, y);

    footers(doc);
    return { doc: doc, filename: "Trainer-Effectiveness-" + (fileSlug(d.monthLabel) || "Report") + ".pdf" };
  }

  /* ------------------------------------------------ checking saved reports */

  function parsePayload(rec) {
    try { const p = JSON.parse(rec.payload); return p && typeof p === "object" ? p : null; } catch (e) { return null; }
  }

  // Does a saved report agree with itself? The score is recomputed from the entries, and the scoring used
  // must be the profile the admin set for that person (the database rules pin the second one at save time).
  // rec.scoring is the person's OWN scoring override (rule-enforced: it must equal their users/{uid}.scoring
  // field exactly). rec.companyScoring, when present, is a snapshot of their company's scoring at save time
  // (not rule-enforced — the rules cannot parse JSON — so this is a consistency check, not a guarantee).
  function verifyReport(rec) {
    const p = parsePayload(rec);
    if (!p) return { ok: false, problems: ["The report data could not be read"], recomputed: "" };
    const problems = [];
    if (rec.scoring !== undefined) {   // reports saved before this field existed are not checked for it
      let assigned = null, companyAssigned = null;
      try { assigned = rec.scoring ? JSON.parse(rec.scoring) : null; } catch (e) {}
      try { companyAssigned = rec.companyScoring ? JSON.parse(rec.companyScoring) : null; } catch (e) {}
      const expected = companyAssigned ? layerCfg(companyAssigned, assigned) : assigned;
      if (JSON.stringify(normCfg(expected)) !== JSON.stringify(normCfg(p.cfg))) problems.push("Scoring differs from the profile the admin (and company) set");
    }
    let recomputed = "";
    if (rec.type === "tof") recomputed = pct(calcTof(p.tof && p.tof.ratings, p.cfg).overall, 2);
    else { const d = calcDashboard(p.rows, p.cfg); recomputed = d.avg === null ? "" : d.avg.toFixed(2) + "%"; }
    if (recomputed !== (rec.score || "")) problems.push("Saved score " + (rec.score || "\u2014") + " but the entries score " + (recomputed || "\u2014"));
    return { ok: problems.length === 0, problems: problems, recomputed: recomputed };
  }

  /* ------------------------------------------------------------- analytics */

  // users: [{ id, fields: { name, role, active } }]   reports: saved report records (newest or oldest first)
  function analytics(users, reports, nowISO) {
    const now = nowISO ? new Date(nowISO) : new Date();
    const ym = now.toISOString().slice(0, 7);
    const list = (reports || []).slice().sort(function (a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")); });
    const trainers = {}, monthly = {};

    list.forEach(function (r) {
      const p = parsePayload(r);
      if (!p) return;
      if (r.type === "tof" && p.tof) {
        const name = String((p.tof.header || {}).trainer || "").trim();
        if (!name) return;
        const t = trainers[name.toLowerCase()] = trainers[name.toLowerCase()] || { name: name };
        if (t.tofAt === undefined) { t.tof = calcTof(p.tof.ratings, p.cfg).overall; t.tofAt = r.createdAt; }
      } else if (r.type === "eff" && Array.isArray(p.rows)) {
        p.rows.forEach(function (row) {
          const name = String(row.name || "").trim();
          if (!name) return;
          const c = calcRow(row, p.cfg);
          const t = trainers[name.toLowerCase()] = trainers[name.toLowerCase()] || { name: name };
          if (c.eff === null) return;
          if (t.effAt === undefined) { t.eff = c.eff; t.rating = c.rating; t.effAt = r.createdAt; }
          const y = String(r.createdAt || "").slice(0, 4);
          const label = (row.month || "?") + " " + y;
          const m = monthly[label] = monthly[label] || { label: label, sum: 0, n: 0, order: y + String(MONTHS.indexOf(row.month) + 100) };
          m.sum += c.eff; m.n++;
        });
      }
    });

    const trainerList = Object.keys(trainers).map(function (k) { return trainers[k]; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    const distribution = RATINGS.map(function (rt) {
      return { rating: rt, count: trainerList.filter(function (t) { return t.rating === rt; }).length };
    });
    const monthlyList = Object.keys(monthly).map(function (k) { const m = monthly[k]; return { label: m.label, avg: m.sum / m.n, n: m.n, order: m.order }; })
      .sort(function (a, b) { return a.order.localeCompare(b.order); });

    const active = (users || []).filter(function (u) { return (u.fields || {}).active !== "false"; });
    const thisMonth = list.filter(function (r) { return String(r.createdAt || "").slice(0, 7) === ym; });
    const reporters = {};
    thisMonth.forEach(function (r) { reporters[r.uid] = true; });
    const missing = active.filter(function (u) { return !reporters[u.id]; }).map(function (u) { return (u.fields || {}).name || u.id; });

    return {
      kpis: { reports: list.length, thisMonth: thisMonth.length, activeParticipants: active.length, submittedThisMonth: active.length - missing.length },
      trainers: trainerList, monthly: monthlyList, distribution: distribution, missing: missing,
    };
  }

  /* ---------------------------------------------- non-Latin text and printing */

  // The PDF file's built-in fonts only cover Western characters.
  function needsUnicode(text) {
    return /[^\n\x20-\x7E\xA0-\xFF\u2018\u2019\u201C\u201D\u2013\u2014\u2022\u2026\u20AC]/.test(String(text === null || text === undefined ? "" : text));
  }

  function h(x) {
    return String(x === null || x === undefined ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  const PRINT_CSS =
    "@page{size:A4 %ORIENT%;margin:14mm}*{box-sizing:border-box}body{font:12px/1.45 'Segoe UI',Roboto,'Noto Sans','Noto Sans Gujarati','Noto Sans Devanagari',Arial,sans-serif;color:#17243b;margin:0}" +
    ".band{background:#17243b;color:#f5f1e9;padding:14px 18px;border-bottom:4px solid #c9ec62;margin-bottom:14px}.band small{color:#c9ec62;letter-spacing:.12em;text-transform:uppercase;font-weight:700;font-size:10px}.band h1{margin:4px 0 0;font-size:24px}" +
    "table{border-collapse:collapse;width:100%;margin:0 0 14px}th,td{border:1px solid #d6dae2;padding:6px 8px;text-align:left;vertical-align:top}th{background:#17243b;color:#f5f1e9}td.k{background:#f4f6fa;font-weight:700;width:18%}" +
    "h2{font-size:14px;margin:14px 0 6px}.y{background:#def2be;font-weight:700;text-align:center}.n{background:#fbd6cd;font-weight:700;text-align:center}.na{background:#e8eaef;font-weight:700;text-align:center}" +
    ".note{color:#7a808c;font-size:10px;margin:0 0 12px}.tot td{background:#c9ec62;font-weight:700}.sec{page-break-inside:avoid}.kpis{display:flex;gap:8px;margin-bottom:12px}.kpi{flex:1;border:1px solid #d6dae2;background:#f4f6fa;padding:8px 10px}.kpi b{display:block;font-size:20px}.kpi span{font-size:9px;color:#7a808c;letter-spacing:.08em}" +
    ".low{background:#fbd6cd}.good{background:#def2be}.mid{background:#fceebe}.pre{white-space:pre-wrap}";

  function printDoc(title, orient, body) {
    return "<!doctype html><html><head><meta charset=\"utf-8\"><title>" + h(title) + "</title><style>" + PRINT_CSS.replace("%ORIENT%", orient) + "</style></head><body>" + body + "</body></html>";
  }

  function printBand(brand, kicker, title) {
    const logo = brand && brand.logo && /^data:image\/(png|jpeg);base64,/.test(brand.logo) ? '<img src="' + brand.logo + '" alt="" style="height:34px;float:right" />' : "";
    return '<div class="band">' + logo + "<small>" + h((brand && brand.name) || kicker) + "</small><h1>" + h(title) + "</h1></div>";
  }

  // The same report as tofPdf, as a web page the browser can print or "Save as PDF" in any language.
  function tofPrintHtml(state, cfg, sections, brand) {
    const hd = state.header || {}, c = calcTof(state.ratings, cfg, sections), ratings = state.ratings || {}, comments = state.comments || {};
    let body = printBand(brand, "Learning &amp; Development Team", "Trainer Observation Form") +
      "<table><tr><td class=\"k\">Trainer name</td><td>" + h(hd.trainer) + "</td><td class=\"k\">Evaluator</td><td>" + h(hd.evaluator) + "</td></tr>" +
      "<tr><td class=\"k\">Observation date</td><td>" + h(fmtDate(hd.date)) + "</td><td class=\"k\">Observation time</td><td>" + h(fmtTime(hd.time)) + "</td></tr>" +
      "<tr><td class=\"k\">Class / topic</td><td>" + h(hd.topic) + "</td><td class=\"k\">Duration (mins)</td><td>" + h(hd.duration) + "</td></tr></table>" +
      "<h2>Score summary</h2><table><tr><th>Section</th><th style=\"width:90px\">Score</th></tr>" +
      c.sections.map(function (s) { return "<tr><td>" + h(s.title) + "</td><td>" + pct(s.score, 0) + "</td></tr>"; }).join("") +
      "<tr class=\"tot\"><td>Overall Score</td><td>" + pct(c.overall, 2) + "</td></tr></table>" +
      '<p class="note">' + h(tofMethod(cfg, c.sectionDefs)) + (c.unrated ? " " + c.unrated + " of " + c.total + " items were not rated and are counted as N." : "") + (cfgIsCustom(cfg) ? " Custom scoring profile applied." : "") + "</p>";
    c.sectionDefs.forEach(function (sec, i) {
      body += '<div class="sec"><h2>' + h(sec.title) + " &mdash; " + pct(c.sections[i].score, 0) + "</h2><table><tr><th>Item</th><th style=\"width:60px\">Rating</th><th style=\"width:32%\">Comments</th></tr>" +
        sec.items.map(function (label, j) {
          const r = ratings[i + "-" + j];
          return "<tr><td>" + h(label) + "</td><td class=\"" + (r === "Y" ? "y" : r === "N" ? "n" : r === "N/A" ? "na" : "") + "\">" + (r || "\u2014") + "</td><td>" + h(comments[i + "-" + j]) + "</td></tr>";
        }).join("") + "</table></div>";
    });
    const notes = state.notes || {};
    [["Strengths", notes.strengths], ["Areas for improvement", notes.improve], ["Recommendations", notes.recommendations]].forEach(function (n) {
      body += '<div class="sec"><h2>' + n[0] + '</h2><table><tr><td class="pre">' + (h(n[1]).trim() || "\u2014") + "</td></tr></table></div>";
    });
    return printDoc("Trainer Observation Form", "portrait", body);
  }

  function effPrintHtml(rows, cfg, brand) {
    const d = calcDashboard(rows, cfg);
    const body = printBand(brand, "Trainer performance", "Trainer Performance Dashboard") +
      '<div class="kpis"><div class="kpi"><span>COMPLETED RECORDS</span><b>' + d.records + '</b></div><div class="kpi"><span>AVG EFFECTIVENESS</span><b>' + (d.avg === null ? "\u2014" : d.avg.toFixed(2) + "%") +
      '</b></div><div class="kpi"><span>EFFECTIVE TRAINERS</span><b>' + d.counts["Effective"] + '</b></div><div class="kpi"><span>NEEDS IMPROVEMENT</span><b>' + d.counts["Needs Improvement"] + "</b></div></div>" +
      "<p>" + h(d.summary) + "</p><h2>Trainer scorecard</h2><table><tr><th>Trainer</th><th>Month</th><th>L1 Score</th><th>TOF</th><th>Throughput</th><th>Utilization</th><th>Attendance</th><th>Effectiveness</th><th>Rating</th><th>Area of improvement</th></tr>" +
      (d.list.length ? d.list.map(function (c) {
        const r = c.row;
        return "<tr><td><b>" + h(r.name) + "</b></td><td>" + h(r.month) + "</td>" + EFF_KEYS.map(function (k) {
          return '<td class="' + (c.complete && c.flags.indexOf(k) !== -1 ? "low" : "") + '">' + trimPts(r[k]) + "</td>";
        }).join("") + "<td><b>" + (c.eff === null ? "\u2014" : pts(c.eff, 2)) + '</b></td><td class="' +
          (c.rating === "Effective" ? "good" : c.rating === "Satisfactory" ? "mid" : c.rating === "Needs Improvement" ? "low" : "") + '"><b>' + h(c.rating) + "</b></td><td>" + h(c.improve) + "</td></tr>";
      }).join("") : '<tr><td colspan="10">No trainer records yet.</td></tr>') +
      "</table><h2>Rating distribution</h2><table style=\"width:60%\"><tr><th>Rating</th><th>Count</th><th>Share</th></tr>" +
      d.dist.map(function (r) { return "<tr><td>" + r.rating + "</td><td>" + r.count + "</td><td>" + pct(r.share, 0) + "</td></tr>"; }).join("") + "</table>" +
      '<p class="note">' + h(effMethod(cfg)) + (cfgIsCustom(cfg) ? " Custom scoring profile applied." : "") + " Rows without a trainer name are not counted.</p>";
    return printDoc("Trainer Performance Dashboard", "landscape", body);
  }

  /* ------------------------------------------ load the PDF libraries on demand */

  let pdfPromise = null;
  function pdfReady() {
    return !!(root.jspdf && root.jspdf.jsPDF && root.jspdf.jsPDF.API && typeof root.jspdf.jsPDF.API.autoTable === "function");
  }
  // The two PDF libraries (about 400 KB) are only fetched the first time someone makes a PDF.
  function loadPdfLibs() {
    if (pdfReady()) return Promise.resolve();
    if (pdfPromise) return pdfPromise;
    if (typeof document === "undefined") return Promise.reject(new Error("The PDF library is not available here."));
    const add = function (src) {
      return new Promise(function (resolve, reject) {
        const el = document.createElement("script");
        el.src = src; el.onload = resolve;
        el.onerror = function () { reject(new Error("Could not load " + src)); };
        document.head.appendChild(el);
      });
    };
    pdfPromise = add("assets/vendor/jspdf.umd.min.js")
      .then(function () { return add("assets/vendor/jspdf.plugin.autotable.min.js"); })
      .then(function () { if (!pdfReady()) throw new Error("The PDF library did not load."); })
      .catch(function (e) { pdfPromise = null; throw e; });
    return pdfPromise;
  }

  // Turn a company's picks from the library ({title, ids:[...]}[]) into TOF_SECTIONS-shaped sections.
  // Unknown ids (an item the super admin later removed) are quietly dropped. An empty result means "use the
  // default Excel form", so the caller always falls back safely.
  function buildSections(picks, library) {
    if (!Array.isArray(picks) || !picks.length || !Array.isArray(library)) return null;
    const byId = {};
    library.forEach(function (it) { byId[it.id] = it; });
    const out = picks.map(function (sec) {
      const items = (sec.ids || []).map(function (id) { return byId[id] ? byId[id].label : null; }).filter(Boolean);
      return { title: String(sec.title || "Section").trim() || "Section", items: items };
    }).filter(function (sec) { return sec.items.length > 0; });
    return out.length ? out : null;
  }

  // Group a company's chosen library-item ids into sections by each item's own `section` tag
  // (the grouping the super admin gave it), in the library's own order. Feeds into buildSections.
  function groupByLibrarySection(chosenIds, library) {
    if (!Array.isArray(chosenIds) || !chosenIds.length || !Array.isArray(library)) return [];
    const chosen = {};
    chosenIds.forEach(function (id) { chosen[id] = true; });
    const order = [], bucket = {};
    library.forEach(function (it) {
      if (!chosen[it.id]) return;
      const tag = String(it.section || "General").trim() || "General";
      if (!bucket[tag]) { bucket[tag] = []; order.push(tag); }
      bucket[tag].push(it.id);
    });
    return order.map(function (tag) { return { title: tag, ids: bucket[tag] }; });
  }

  root.GGTools = {
    TOF_SECTIONS: TOF_SECTIONS, EFF_KEYS: EFF_KEYS, EFF_LABELS: EFF_LABELS, RATINGS: RATINGS, MONTHS: MONTHS,
    DEFAULT_CFG: DEFAULT_CFG, normCfg: normCfg, cfgIsCustom: cfgIsCustom, effMethod: effMethod, tofMethod: tofMethod,
    calcTof: calcTof, calcRow: calcRow, calcDashboard: calcDashboard,
    pct: pct, pts: pts, num: num, tofPdf: tofPdf, effPdf: effPdf,
    verifyReport: verifyReport, analytics: analytics, needsUnicode: needsUnicode, tofPrintHtml: tofPrintHtml, effPrintHtml: effPrintHtml,
    loadPdfLibs: loadPdfLibs, parsePayload: parsePayload, layerCfg: layerCfg, buildSections: buildSections, groupByLibrarySection: groupByLibrarySection,
  };
})(typeof window !== "undefined" ? window : globalThis);
