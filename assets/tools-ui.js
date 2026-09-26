/* =============================================================================
   Trainer tools — the screens opened from the service tiles and "My reports".
   Scoring, printing and PDF code lives in tools-core.js; saving lives in app.js.
   * Drafts are autosaved on this device, per signed-in person, so nothing is lost
     to a refresh, a closed tab or a dropped connection.
   * Save report (or Download PDF) records the whole form in Firestore `reports`
     together with the scoring profile used. If the connection is down the report
     is queued on the device and sent automatically later.
   ========================================================================== */
(function () {
  "use strict";
  const T = window.GGTools;
  const host = document.getElementById("tool-sheet");
  if (!T || !host) return;

  const KEY = "ggTools";
  const NOTES = [["strengths", "Strengths"], ["improve", "Areas for improvement"], ["recommendations", "Recommendations"]];
  const TOOLS = {
    tof: { kicker: "Observe \u00B7 07", title: "Trainer Observation Form" },
    eff: { kicker: "Measure \u00B7 08", title: "Trainer Effectiveness" },
    reports: { kicker: "Your footprint", title: "My reports" },
  };
  const PCT_MAX = 150;                       // a percentage above this is a typo
  const WARN_OVER_100 = ["l1", "tof", "att"]; // these cannot sensibly exceed 100

  let cfg = T.normCfg(null);                 // the signed-in person's (and their company's) scoring profile
  let tofSections = null;                     // a company's own Observation checklist, or null for the default Excel form
  let brand = null;                           // { name, logo } for the company's PDFs, or null for the site's own header
  let uid = "";                              // who the drafts belong to
  let current = null;                        // which panel is open
  let opener = null;                         // what to give focus back to
  let trainerNames = [];                     // the trainer directory
  const dirty = { tof: false, eff: false };       // changed since the last save?
  const lastSaved = { tof: null, eff: null };     // id of the last saved report ("queued" if waiting to sync)
  let repCache = [];

  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function trim(n) { return String(parseFloat(Number(n).toFixed(2))); }
  function norm(name) { return String(name || "").replace(/\s+/g, " ").trim().toLowerCase(); }
  function todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function blankTof() {
    return { header: { trainer: "", evaluator: "", date: todayISO(), time: "", topic: "", duration: "" }, ratings: {}, comments: {}, notes: { strengths: "", improve: "", recommendations: "" } };
  }
  function blankRow() {
    return { name: "", month: T.MONTHS[new Date().getMonth()], l1: "", tof: "", thr: "", util: "", att: "" };
  }
  function blankEff() { return { rows: [blankRow(), blankRow(), blankRow()] }; }

  // Fill any gaps so a saved or restored draft always has every field.
  function mergeTof(t) {
    const b = blankTof();
    t = t || {};
    return { header: Object.assign(b.header, t.header), ratings: t.ratings || {}, comments: t.comments || {}, notes: Object.assign(b.notes, t.notes) };
  }
  function mergeRows(rows) {
    return Array.isArray(rows) && rows.length ? rows.map(function (r) { return Object.assign(blankRow(), r); }) : blankEff().rows;
  }

  /* ------------------------------------------------- drafts (per person) */

  function draftKey() { return uid ? KEY + ":" + uid : ""; }

  function readDraft(store, key) {
    try {
      const o = JSON.parse(store.getItem(key) || "null");
      if (o && o.tof && o.eff) return { tof: mergeTof(o.tof), eff: { rows: mergeRows(o.eff.rows) }, meta: o.meta || {} };
    } catch (e) {}
    return null;
  }

  function save() {
    const blob = JSON.stringify({ tof: state.tof, eff: state.eff, meta: { dirty: dirty, lastSaved: lastSaved } });
    try { (uid ? localStorage : sessionStorage).setItem(uid ? draftKey() : KEY, blob); } catch (e) {}
  }

  let state = readDraft(sessionStorage, KEY) || { tof: blankTof(), eff: blankEff() };

  /* ------------------------------------------------------------ TOF panel */

  function tofHtml() {
    const h = state.tof.header;
    const field = function (k, label, type, extra) {
      return '<label class="tt-field"><span>' + label + '</span><input data-h="' + k + '" type="' + type + '" value="' + esc(h[k]) + '" ' + (extra || "") + " /></label>";
    };
    let html =
      '<div class="tt-card"><div class="tt-grid">' +
      field("trainer", "Trainer name", "text", 'list="tt-trainers" autocomplete="off"') + field("evaluator", "Name of the evaluator", "text") +
      field("date", "Observation date", "date") + field("time", "Observation time", "time") +
      field("topic", "Class name / topic", "text") + field("duration", "Course duration (mins)", "number", 'min="0" inputmode="numeric"') +
      "</div></div>" +
      '<div class="tt-card"><div class="tt-card-head"><strong>Scores</strong>' +
      (T.cfgIsCustom(cfg) ? '<span class="tt-chip">Custom scoring</span>' : "") +
      '<span class="tt-hint" id="tof-unrated"></span></div><div class="tt-scores" id="tof-scores"></div></div>';

    (tofSections || T.TOF_SECTIONS).forEach(function (sec, i) {
      html += '<div class="tt-card"><div class="tt-card-head"><strong>' + esc(sec.title) + '</strong><span class="tt-chip" data-sec-score="' + i + '">--</span></div>';
      sec.items.forEach(function (label, j) {
        const key = i + "-" + j, cur = state.tof.ratings[key];
        html +=
          '<div class="tt-item" data-key="' + key + '"><div class="tt-item-label">' + esc(label) + "</div>" +
          '<div class="tt-seg" role="group" aria-label="Rating for ' + esc(label) + '">' +
          ["Y", "N", "N/A"].map(function (r) {
            return '<button type="button" data-rate="' + r + '" class="' + (cur === r ? "on" : "") + '" aria-pressed="' + (cur === r) + '">' + r + "</button>";
          }).join("") +
          '</div><input class="tt-comment" data-comment type="text" placeholder="Comments" aria-label="Comment for ' + esc(label) + '" value="' + esc(state.tof.comments[key]) + '" /></div>';
      });
      html += "</div>";
    });

    html += '<div class="tt-card tt-notes">';
    NOTES.forEach(function (n) {
      html += '<label class="tt-field"><span>' + n[1] + '</span><textarea data-note="' + n[0] + '" rows="3">' + esc(state.tof.notes[n[0]]) + "</textarea></label>";
    });
    html += "</div>" +
      '<p class="tt-hint">' + esc(T.tofMethod(cfg, tofSections)) + " Items not yet rated count as N, exactly as in the Excel form.</p>" +
      '<div class="tt-actions"><span class="tt-hint tt-savenote" id="tof-savenote" aria-live="polite"></span>' +
      '<button type="button" class="ghost-button" data-tof-reset>Clear form</button>' +
      '<button type="button" class="ghost-button" data-tof-print>Print view</button>' +
      '<button type="button" class="ghost-button" data-tof-save>Save report</button>' +
      '<button type="button" class="auth-submit compact" data-tof-pdf>Download PDF</button></div>';
    return html;
  }

  function tile(label, score, digits, main) {
    const w = score === null ? 0 : Math.round(score * 100);
    return '<div class="tt-tile' + (main ? " main" : "") + '"><span>' + esc(label) + "</span><strong>" + T.pct(score, digits) + '</strong><i style="--w:' + w + '%"></i></div>';
  }

  function updateTof() {
    const c = T.calcTof(state.tof.ratings, cfg, tofSections);
    document.getElementById("tof-scores").innerHTML =
      c.sections.map(function (s) { return tile(s.title, s.score, 0, false); }).join("") +
      tile(c.unrated ? "Overall Score (provisional)" : "Overall Score", c.overall, 2, true);
    c.sections.forEach(function (s, i) {
      const chip = host.querySelector('[data-sec-score="' + i + '"]');
      if (chip) chip.textContent = T.pct(s.score, 0);
    });
    document.getElementById("tof-unrated").textContent = c.unrated ? c.unrated + " of " + c.total + " items not rated yet, so the score is provisional" : "All items rated";
  }

  /* ------------------------------------------------------- Effectiveness */

  function effRowHtml(r, i) {
    return (
      '<tr data-i="' + i + '">' +
      '<td><input class="tt-name" data-e="name" list="tt-trainers" autocomplete="off" placeholder="Trainer name" aria-label="Trainer name" value="' + esc(r.name) + '" /></td>' +
      '<td><select data-e="month" aria-label="Month">' + T.MONTHS.map(function (m) { return "<option" + (m === r.month ? " selected" : "") + ">" + m + "</option>"; }).join("") + "</select></td>" +
      T.EFF_KEYS.map(function (k) {
        return '<td><input class="tt-n" data-e="' + k + '" type="number" step="any" min="0" max="' + PCT_MAX + '" inputmode="decimal" aria-label="' + T.EFF_LABELS[k] + ' percent" value="' + esc(r[k]) + '" /></td>';
      }).join("") +
      '<td class="tt-num" data-c="eff">\u2014</td><td data-c="rating"></td><td data-c="improve"></td>' +
      '<td><button type="button" class="icon-button" data-eff-del aria-label="Remove row">' + ic("x", 14) + "</button></td></tr>"
    );
  }

  function effHtml() {
    return (
      '<p class="tt-hint">Enter percentages (for example 92.7). A row counts once it has a trainer name; the rating appears when all five measures are filled in. Cells below the minimum are highlighted.' +
      (T.cfgIsCustom(cfg) ? " <strong>Custom scoring is applied to your account.</strong>" : "") + "</p>" +
      '<div class="tt-scroll"><table class="tt-table"><thead><tr><th>Trainer</th><th>Month</th>' +
      T.EFF_KEYS.map(function (k) {
        return "<th>" + T.EFF_LABELS[k] + " (%)<small>min " + trim(cfg.eff.min[k]) + " \u00B7 weight " + trim(cfg.eff.weights[k]) + "%</small></th>";
      }).join("") +
      "<th>Effectiveness<small>weighted</small></th><th>Rating</th><th>Area of improvement</th><th></th></tr></thead>" +
      "<tbody>" + state.eff.rows.map(effRowHtml).join("") + "</tbody></table></div>" +
      '<div class="tt-actions tt-actions-left"><button type="button" class="ghost-button" data-eff-add>Add trainer</button>' +
      '<button type="button" class="ghost-button" data-eff-fill>Fill TOF from my observations</button></div>' +
      '<div class="tt-card tt-dash"><div class="tt-card-head"><strong>Dashboard</strong></div>' +
      '<div class="tt-kpis" id="eff-kpis"></div><p class="tt-summary" id="eff-summary"></p><div id="eff-dist"></div></div>' +
      '<p class="tt-hint">' + esc(T.effMethod(cfg)) + "</p>" +
      '<div class="tt-actions"><span class="tt-hint tt-savenote" id="eff-savenote" aria-live="polite"></span>' +
      '<button type="button" class="ghost-button" data-eff-reset>Clear all</button>' +
      '<button type="button" class="ghost-button" data-eff-print>Print view</button>' +
      '<button type="button" class="ghost-button" data-eff-save>Save report</button>' +
      '<button type="button" class="auth-submit compact" data-eff-pdf>Download PDF</button></div>'
    );
  }

  function pillClass(rating) {
    return rating === "Effective" ? "effective" : rating === "Satisfactory" ? "satisfactory" : rating === "Needs Improvement" ? "needs" : "";
  }

  function updateEff() {
    state.eff.rows.forEach(function (r, i) {
      const tr = host.querySelector('#tt-eff tr[data-i="' + i + '"]');
      if (!tr) return;
      const c = T.calcRow(r, cfg);
      tr.querySelector('[data-c="eff"]').textContent = c.eff === null ? "\u2014" : c.eff.toFixed(2) + "%";
      tr.querySelector('[data-c="rating"]').innerHTML = '<span class="tt-pill ' + pillClass(c.rating) + '">' + esc(c.rating) + "</span>";
      tr.querySelector('[data-c="improve"]').textContent = c.improve;
      T.EFF_KEYS.forEach(function (k) {
        const v = T.num(r[k]), el = tr.querySelector('[data-e="' + k + '"]');
        el.classList.toggle("tt-low", v !== null && v < cfg.eff.min[k]);
        el.classList.toggle("tt-bad", v !== null && (v < 0 || v > PCT_MAX));
        el.classList.toggle("tt-warn", v !== null && v <= PCT_MAX && WARN_OVER_100.indexOf(k) !== -1 && v > 100);
        if (v !== null && (v < 0 || v > PCT_MAX)) el.title = "Expected 0 to " + PCT_MAX + "%"; else el.removeAttribute("title");
      });
      const nameEl = tr.querySelector('[data-e="name"]');
      nameEl.classList.toggle("tt-warn", !!(trainerNames.length && r.name.trim() && trainerNames.map(norm).indexOf(norm(r.name)) === -1));
    });

    const d = T.calcDashboard(state.eff.rows, cfg);
    const kpi = function (label, value, note) {
      return '<div class="tt-tile"><span>' + label + "</span><strong>" + esc(value) + "</strong><small>" + note + "</small></div>";
    };
    document.getElementById("eff-kpis").innerHTML =
      kpi("Completed records", String(d.records), "Rows with trainer names") +
      kpi("Avg effectiveness", d.avg === null ? "\u2014" : d.avg.toFixed(2) + "%", "Weighted score across completed records") +
      kpi("Effective trainers", String(d.counts["Effective"]), "Meeting effectiveness criteria") +
      kpi("Needs improvement", String(d.counts["Needs Improvement"]), "Below one or more required thresholds");
    document.getElementById("eff-summary").textContent = d.summary;
    document.getElementById("eff-dist").innerHTML =
      '<table class="tt-dist"><thead><tr><th>Rating</th><th>Count</th><th>Share</th></tr></thead><tbody>' +
      d.dist.map(function (r) {
        return '<tr><td><span class="tt-pill ' + pillClass(r.rating) + '">' + r.rating + "</span></td><td>" + r.count + "</td><td>" + T.pct(r.share, 0) + "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  // Bring a value from the last saved observation of that trainer into the TOF column.
  async function fillFromObservations() {
    try { if (!repCache.length) repCache = await fbMyReports(); }
    catch (e) { toast("Could not read your saved observations (" + e.message + ")."); return; }
    const latest = {};                                   // repCache is newest first
    repCache.filter(function (r) { return r.type === "tof"; }).forEach(function (r) {
      const p = T.parsePayload(r);
      const name = norm(p && p.tof && p.tof.header && p.tof.header.trainer);
      if (!name || latest[name] !== undefined) return;
      latest[name] = T.calcTof(p.tof.ratings, p.cfg, p.sections).overall;
    });
    let filled = 0;
    const missing = [];
    state.eff.rows.forEach(function (row) {
      const n = norm(row.name);
      if (!n || String(row.tof).trim() !== "") return;
      if (latest[n] === undefined || latest[n] === null) { missing.push(row.name.trim()); return; }
      row.tof = String(parseFloat((latest[n] * 100).toFixed(2)));
      filled++;
    });
    if (filled) { markDirty("eff"); render(); }
    toast(filled ? "TOF filled for " + filled + " trainer" + (filled === 1 ? "" : "s") + "." + (missing.length ? " No saved observation for " + missing.join(", ") + "." : "")
      : missing.length ? "No saved observation found for " + missing.join(", ") + "." : "Nothing to fill. Add trainer names with an empty TOF first.");
  }

  /* ---------------------------------------------------- saving reports */

  function setSaveNote(kind, text) {
    const el = document.getElementById(kind + "-savenote");
    if (el) el.textContent = text;
  }
  function markDirty(kind) {
    dirty[kind] = true;
    setSaveNote(kind, "Unsaved changes");
    save();
  }

  function effHasBadValue() {
    return state.eff.rows.some(function (r) {
      return T.EFF_KEYS.some(function (k) { const v = T.num(r[k]); return v !== null && (v < 0 || v > PCT_MAX); });
    });
  }

  // The record that goes to the database; null (with a message) when there is nothing worth saving.
  function buildRecord(kind) {
    const who = (typeof currentUser !== "undefined" && currentUser) || {};
    const scoring = who.scoringRaw || "";
    if (kind === "tof") {
      const h = state.tof.header;
      if (!h.trainer.trim()) { toast("Add the trainer\u2019s name first."); return null; }
      const c = T.calcTof(state.tof.ratings, cfg, tofSections);
      return {
        type: "tof", name: who.name || "", scoring: scoring, companyScoring: (who.company && who.company.scoringRaw) || "",
        title: h.trainer.trim() + (h.topic.trim() ? " \u2014 " + h.topic.trim() : ""),
        score: T.pct(c.overall, 2),
        payload: JSON.stringify({ tof: state.tof, cfg: cfg, sections: tofSections }),
      };
    }
    const d = T.calcDashboard(state.eff.rows, cfg);
    if (!d.records) { toast("Add at least one trainer name first."); return null; }
    if (effHasBadValue()) { toast("Some values are outside 0 to " + PCT_MAX + "%. Check the highlighted cells."); return null; }
    const month = d.monthLabel.charAt(0).toUpperCase() + d.monthLabel.slice(1);
    return {
      type: "eff", name: who.name || "", scoring: scoring, companyScoring: (who.company && who.company.scoringRaw) || "",
      title: month + " \u00B7 " + d.records + " trainer" + (d.records === 1 ? "" : "s"),
      score: d.avg === null ? "" : d.avg.toFixed(2) + "%",
      payload: JSON.stringify({ rows: state.eff.rows, cfg: cfg }),
    };
  }

  function confirmUnrated(kind) {
    if (kind !== "tof") return true;
    const c = T.calcTof(state.tof.ratings, cfg, tofSections);
    return !c.unrated || window.confirm(c.unrated + " of " + c.total + " items are not rated yet and count as N, so the score is provisional. Continue anyway?");
  }

  /* --- a report that could not be sent waits on the device and is retried --- */

  function queueKey() { return "ggQueue:" + uid; }
  function readQueue() { try { return JSON.parse(localStorage.getItem(queueKey()) || "[]"); } catch (e) { return []; } }
  function writeQueue(list) { try { localStorage.setItem(queueKey(), JSON.stringify(list)); } catch (e) {} }
  function isPermanent(e) { const m = /^HTTP (\d{3})/.exec(String(e && e.message)); return !!m && m[1][0] === "4" && m[1] !== "408" && m[1] !== "429"; }

  async function flushQueue() {
    if (!uid) return;
    const q = readQueue();
    if (!q.length) return;
    const rest = [];
    let sent = 0;
    for (const rec of q) {
      try { await fbSaveReport(rec); sent++; }
      catch (e) { if (!isPermanent(e)) rest.push(rec); }
    }
    writeQueue(rest);
    if (sent) { repCache = []; toast(sent + " report" + (sent === 1 ? "" : "s") + " saved to My reports that were waiting on this device."); }
  }
  window.addEventListener("online", flushQueue);

  async function saveReport(kind, skipConfirm) {
    if (!skipConfirm && !confirmUnrated(kind)) return false;
    const rec = buildRecord(kind);
    if (!rec) return false;
    try {
      const saved = await fbSaveReport(rec);
      dirty[kind] = false;
      lastSaved[kind] = saved.id;
      repCache = [];
      save();
      setSaveNote(kind, "Saved to My reports at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      toast("Saved to My reports.");
      if (window.ggAudit) window.ggAudit("report_saved", kind, rec.title);
      flushQueue();
      return true;
    } catch (e) {
      console.warn("Saving the report failed:", e.message);
      if (isPermanent(e)) {
        toast("The database refused this report (" + e.message + "). Check the Firestore rules, or ask an admin.");
        return false;
      }
      // Offline or the server is having a moment: keep it on the device and retry later.
      rec.createdAt = new Date().toISOString();
      writeQueue(readQueue().concat([rec]));
      dirty[kind] = false;
      lastSaved[kind] = "queued";
      save();
      setSaveNote(kind, "Waiting to sync");
      toast("No connection. The report is kept on this device and will be saved automatically when you are back online.");
      return false;
    }
  }

  function download(build) {
    return T.loadPdfLibs().then(function () {
      const r = build();
      r.doc.save(r.filename);
    }).catch(function (e) {
      console.error(e);
      toast("Could not create the PDF. " + e.message);
    });
  }

  // The built-in PDF fonts cannot show every script; the print view can.
  function printHtml(html) {
    const f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(f);
    const d = f.contentWindow.document;
    d.open(); d.write(html); d.close();
    setTimeout(function () {
      try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast("Could not open the print view."); }
      setTimeout(function () { f.remove(); }, 60000);
    }, 350);
  }

  function printView(kind) {
    if (!buildRecord(kind)) return;
    printHtml(kind === "tof" ? T.tofPrintHtml(state.tof, cfg, tofSections, brand) : T.effPrintHtml(state.eff.rows, cfg, brand));
    if (window.ggAudit) window.ggAudit("report_printed", kind, "");
  }

  // Download first (so the browser treats it as a direct click), then keep a copy in the person's history.
  function pdfAndSave(kind) {
    if (!confirmUnrated(kind)) return;
    const rec = buildRecord(kind);
    if (!rec) return;
    const inText = JSON.stringify(kind === "tof" ? state.tof : state.eff.rows);
    if (T.needsUnicode(inText) && window.confirm("This report has characters (for example Gujarati or Hindi) that a downloaded PDF cannot show. Open the print view instead? In it, choose \u201CSave as PDF\u201D. Cancel makes the PDF anyway, with those characters shown as ?.")) {
      printHtml(kind === "tof" ? T.tofPrintHtml(state.tof, cfg, tofSections, brand) : T.effPrintHtml(state.eff.rows, cfg, brand));
    } else {
      download(function () { return kind === "tof" ? T.tofPdf(state.tof, cfg, tofSections, brand) : T.effPdf(state.eff.rows, cfg, brand); });
    }
    if (window.ggAudit) window.ggAudit("pdf_downloaded", kind, rec.title);
    if (dirty[kind] || !lastSaved[kind]) saveReport(kind, true);
  }

  /* ---------------------------------------------------------- My reports */

  function whenText(iso) {
    const d = new Date(iso);
    return isNaN(d) ? "\u2014" : d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function reportsHtml() {
    const waiting = uid ? readQueue().length : 0;
    let html =
      '<p class="tt-hint">Every report you save is kept here. Download any of them as a PDF whenever you need it. It is rebuilt exactly as it was scored when you saved it.' +
      (waiting ? " <strong>" + waiting + " more " + (waiting === 1 ? "is" : "are") + " waiting on this device to sync.</strong>" : "") + "</p>";
    if (!repCache.length) {
      return html + '<div class="tt-card"><strong>No reports yet.</strong><p class="tt-hint" style="margin:6px 0 0">Open Trainer Observation or Trainer Effectiveness, fill it in and choose Save report or Download PDF.</p></div>';
    }
    html += '<div class="tt-scroll"><table class="tt-table tt-reports"><thead><tr><th>Saved</th><th>Tool</th><th>Report</th><th>Score</th><th></th></tr></thead><tbody>';
    repCache.forEach(function (r) {
      html += "<tr><td>" + esc(whenText(r.createdAt)) + "</td><td>" + (r.type === "tof" ? "Observation" : "Effectiveness") + "</td><td>" + esc(r.title) + "</td><td>" + esc(r.score) + "</td>" +
        '<td class="tt-rowact"><button type="button" class="ghost-button" data-rep-pdf="' + esc(r.id) + '">Download PDF</button>' +
        '<button type="button" class="ghost-button" data-rep-print="' + esc(r.id) + '">Print</button>' +
        '<button type="button" class="ghost-button" data-rep-open="' + esc(r.id) + '">Open</button></td></tr>';
    });
    return html + "</tbody></table></div>" + '<p class="tt-hint">' + repCache.length + " saved report" + (repCache.length === 1 ? "" : "s") + ".</p>";
  }

  async function loadReports() {
    const box = document.getElementById("tt-reports");
    box.innerHTML = '<p class="tt-hint">Loading your reports\u2026</p>';
    try {
      flushQueue();
      repCache = await fbMyReports();
      box.innerHTML = reportsHtml();
    } catch (e) {
      box.innerHTML = '<p class="tt-hint">Could not load your reports (' + esc(e.message) + "). Check your connection and the Firestore rules.</p>";
    }
  }

  function parsePayload(rec) {
    const p = T.parsePayload(rec);
    if (!p) toast("This report\u2019s data could not be read.");
    return p;
  }

  // Rebuild the PDF from a saved report, using the scoring profile that was in force when it was saved.
  function downloadReport(rec) {
    const p = parsePayload(rec);
    if (!p) return;
    if (T.needsUnicode(rec.payload) && window.confirm("This report has characters a downloaded PDF cannot show. Open the print view instead? (Choose \u201CSave as PDF\u201D there.)")) { printReport(rec); return; }
    download(function () { return rec.type === "tof" ? T.tofPdf(mergeTof(p.tof), p.cfg, p.sections, brand) : T.effPdf(mergeRows(p.rows), p.cfg, brand); });
    if (window.ggAudit) window.ggAudit("pdf_downloaded", rec.type, rec.title + " (from history)");
  }
  window.ggDownloadReport = downloadReport;

  function printReport(rec) {
    const p = parsePayload(rec);
    if (!p) return;
    printHtml(rec.type === "tof" ? T.tofPrintHtml(mergeTof(p.tof), p.cfg, p.sections, brand) : T.effPrintHtml(mergeRows(p.rows), p.cfg, brand));
  }

  function reopenReport(rec) {
    const p = parsePayload(rec);
    if (!p) return;
    if (rec.type === "tof") state.tof = mergeTof(p.tof);
    else state.eff = { rows: mergeRows(p.rows) };
    dirty[rec.type] = false;
    lastSaved[rec.type] = rec.id;
    save(); render();
    openTool(rec.type);
    toast("Report loaded. It is scored with your current scoring; saving keeps a new copy.");
  }

  /* ----------------------------------------------------- open / close */

  // Which tool a service tile opens when it only has a title to go on.
  function toolFor(title) {
    const t = String(title || "").toLowerCase();
    return t.indexOf("trainer observation") !== -1 ? "tof" : t.indexOf("trainer effectiveness") !== -1 ? "eff" : null;
  }

  function focusables() {
    return Array.prototype.filter.call(
      host.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && !el.closest("[hidden]"); }
    );
  }

  function openTool(which) {
    if (host.hidden) opener = document.activeElement;
    current = which;
    ["tof", "eff", "reports"].forEach(function (k) { document.getElementById("tt-" + k).hidden = k !== which; });
    document.getElementById("tool-kicker").textContent = TOOLS[which].kicker;
    document.getElementById("tool-title").textContent = TOOLS[which].title;
    host.hidden = false;
    host.scrollTop = 0;
    document.body.style.overflow = "hidden";
    if (which === "reports") loadReports();
    const back = host.querySelector("[data-tool-back]");
    if (back) back.focus();
  }

  function closeTool() {
    const wasOpen = !host.hidden;
    host.hidden = true;
    current = null;
    document.body.style.overflow = "";
    if (wasOpen && opener && document.body.contains(opener) && typeof opener.focus === "function") opener.focus();
    opener = null;
  }

  // Leaving with the Back button or Esc: warn if the form has changes that were never saved.
  function requestClose() {
    if ((current === "tof" || current === "eff") && dirty[current] &&
        !window.confirm("You have changes that are not saved to My reports yet. Your draft stays on this device. Leave anyway?")) return;
    closeTool();
  }

  window.ggOpenToolKey = function (which) {
    if (!TOOLS[which] || which === "reports") return false;
    const tools = (typeof currentUser !== "undefined" && currentUser && currentUser.tools) || ["tof", "eff"];
    if (tools.indexOf(which) === -1) { toast("You do not have access to " + TOOLS[which].title + " yet. Ask an admin."); return true; }
    openTool(which);
    return true;
  };
  window.ggOpenTool = function (title) {
    const which = toolFor(title);
    return which ? window.ggOpenToolKey(which) : false;
  };

  // [data-open-tool="reports" | "tof" | "eff"] anywhere on the page (nav link, footer links).
  document.addEventListener("click", function (event) {
    const trigger = event.target.closest("[data-open-tool]");
    if (!trigger) return;
    event.preventDefault();
    if (typeof currentUser === "undefined" || !currentUser) return;
    const which = trigger.dataset.openTool;
    if (which === "reports") openTool("reports");
    else window.ggOpenToolKey(which);
  });

  document.addEventListener("keydown", function (event) {
    if (host.hidden) return;
    const modal = document.getElementById("modal-veil");
    if (event.key === "Escape" && (!modal || modal.hidden)) { requestClose(); return; }
    if (event.key === "Tab") {           // keep keyboard focus inside the open form
      const els = focusables();
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (event.shiftKey && (document.activeElement === first || !host.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  /* --------------------------------------------------------------- wiring */

  function updateTrainerList() {
    const dl = document.getElementById("tt-trainers");
    if (dl) dl.innerHTML = trainerNames.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join("");
  }
  window.ggSetTrainers = function (names) {
    trainerNames = Array.isArray(names) ? names : [];
    updateTrainerList();
    updateEff();
  };

  function render() {
    document.getElementById("tt-tof").innerHTML = tofHtml();
    document.getElementById("tt-eff").innerHTML = effHtml();
    updateTrainerList();
    updateTof();
    updateEff();
    if (dirty.tof) setSaveNote("tof", "Unsaved changes"); else if (lastSaved.tof === "queued") setSaveNote("tof", "Waiting to sync");
    if (dirty.eff) setSaveNote("eff", "Unsaved changes"); else if (lastSaved.eff === "queued") setSaveNote("eff", "Waiting to sync");
  }

  host.addEventListener("click", function (event) {
    const t = event.target;

    if (t.closest("[data-tool-back]")) { requestClose(); return; }

    const rate = t.closest("[data-rate]");
    if (rate) {
      const item = rate.closest(".tt-item"), key = item.dataset.key, v = rate.dataset.rate;
      if (state.tof.ratings[key] === v) delete state.tof.ratings[key];
      else state.tof.ratings[key] = v;
      item.querySelectorAll("[data-rate]").forEach(function (b) {
        const on = state.tof.ratings[key] === b.dataset.rate;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      markDirty("tof"); updateTof();
      return;
    }

    if (t.closest("[data-tof-reset]")) {
      if (!window.confirm("Clear the whole observation form?")) return;
      state.tof = blankTof(); dirty.tof = false; lastSaved.tof = null; save(); render();
      return;
    }
    if (t.closest("[data-tof-save]")) {
      if (!dirty.tof && lastSaved.tof) { toast("Already saved. Nothing has changed since."); return; }
      saveReport("tof");
      return;
    }
    if (t.closest("[data-tof-pdf]")) { pdfAndSave("tof"); return; }
    if (t.closest("[data-tof-print]")) { printView("tof"); return; }

    if (t.closest("[data-eff-add]")) { state.eff.rows.push(blankRow()); markDirty("eff"); render(); return; }
    if (t.closest("[data-eff-fill]")) { fillFromObservations(); return; }
    const del = t.closest("[data-eff-del]");
    if (del) {
      if (state.eff.rows.length < 2) { toast("Keep at least one row."); return; }
      state.eff.rows.splice(Number(del.closest("tr").dataset.i), 1); markDirty("eff"); render();
      return;
    }
    if (t.closest("[data-eff-reset]")) {
      if (!window.confirm("Clear every trainer row?")) return;
      state.eff = blankEff(); dirty.eff = false; lastSaved.eff = null; save(); render();
      return;
    }
    if (t.closest("[data-eff-save]")) {
      if (!dirty.eff && lastSaved.eff) { toast("Already saved. Nothing has changed since."); return; }
      saveReport("eff");
      return;
    }
    if (t.closest("[data-eff-pdf]")) { pdfAndSave("eff"); return; }
    if (t.closest("[data-eff-print]")) { printView("eff"); return; }

    const rp = t.closest("[data-rep-pdf]");
    if (rp) { const rec = repCache.filter(function (r) { return r.id === rp.dataset.repPdf; })[0]; if (rec) downloadReport(rec); return; }
    const rpr = t.closest("[data-rep-print]");
    if (rpr) { const rec = repCache.filter(function (r) { return r.id === rpr.dataset.repPrint; })[0]; if (rec) printReport(rec); return; }
    const ro = t.closest("[data-rep-open]");
    if (ro) { const rec = repCache.filter(function (r) { return r.id === ro.dataset.repOpen; })[0]; if (rec) reopenReport(rec); }
  });

  host.addEventListener("input", function (event) {
    const t = event.target;
    if (t.dataset.h) { state.tof.header[t.dataset.h] = t.value; markDirty("tof"); }
    else if (t.dataset.comment !== undefined) { state.tof.comments[t.closest(".tt-item").dataset.key] = t.value; markDirty("tof"); }
    else if (t.dataset.note) { state.tof.notes[t.dataset.note] = t.value; markDirty("tof"); }
    else if (t.dataset.e) {
      state.eff.rows[Number(t.closest("tr").dataset.i)][t.dataset.e] = t.value;
      markDirty("eff"); updateEff();
    }
  });

  // Tidy a typed trainer name and match it to the directory's spelling.
  host.addEventListener("change", function (event) {
    const t = event.target;
    if (!(t.matches && t.matches('[data-h="trainer"], [data-e="name"]'))) return;
    const typed = t.value.replace(/\s+/g, " ").trim();
    const hit = trainerNames.filter(function (n) { return norm(n) === norm(typed); })[0];
    const final = hit || typed;
    if (final !== t.value) { t.value = final; t.dispatchEvent(new Event("input", { bubbles: true })); }
  });

  // Called by the app after sign-in: load this person's drafts, apply their scoring profile, retry unsent reports.
  window.ggToolsHello = function (user) {
    user = user || {};
    let changed = false;
    if (user.uid && user.uid !== uid) {
      uid = user.uid;
      const d = readDraft(localStorage, draftKey()) || readDraft(sessionStorage, KEY);
      state = d ? { tof: d.tof, eff: d.eff } : { tof: blankTof(), eff: blankEff() };
      const m = (d && d.meta) || {};
      dirty.tof = !!(m.dirty && m.dirty.tof); dirty.eff = !!(m.dirty && m.dirty.eff);
      lastSaved.tof = (m.lastSaved && m.lastSaved.tof) || null; lastSaved.eff = (m.lastSaved && m.lastSaved.eff) || null;
      try { sessionStorage.removeItem(KEY); } catch (e) {}
      changed = true;
      flushQueue();
    }
    if (!state.tof.header.evaluator && user.name) { state.tof.header.evaluator = user.name; changed = true; }
    const next = T.normCfg(user.scoring);
    if (JSON.stringify(next) !== JSON.stringify(cfg)) { cfg = next; changed = true; }
    const nextSections = user.company && user.company.tofPicks ? T.buildSections(user.company.tofPicks, window.ggLibrary || []) : null;
    if (JSON.stringify(nextSections) !== JSON.stringify(tofSections)) { tofSections = nextSections; changed = true; }
    const nextBrand = user.company ? { name: user.company.name || "", logo: user.company.logo || "" } : null;
    if (JSON.stringify(nextBrand) !== JSON.stringify(brand)) { brand = nextBrand; changed = true; }
    if (changed) { save(); render(); }
  };
  // Called on sign-out: the form empties, but the person's own draft stays on the device for next time.
  window.ggResetTools = function () {
    closeTool();
    cfg = T.normCfg(null);
    tofSections = null;
    brand = null;
    repCache = [];
    trainerNames = [];
    uid = "";
    dirty.tof = dirty.eff = false; lastSaved.tof = lastSaved.eff = null;
    state = { tof: blankTof(), eff: blankEff() };
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    render();
    document.getElementById("tt-reports").innerHTML = "";
  };

  // Called once the item library has loaded (corporate accounts only): re-applies the company's picks.
  window.ggLibraryReady = function () {
    if (typeof currentUser !== "undefined" && currentUser) window.ggToolsHello(currentUser);
  };

  render();
})();
