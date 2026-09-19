/* =============================================================================
   Trainer tools — the screens opened from the service tiles and "My reports".
   Scoring and PDF code lives in tools-core.js; saving lives in app.js.
   * Drafts are kept in sessionStorage so a refresh does not lose them.
   * Save report (or Download PDF) records the whole form in Firestore `reports`,
     together with the scoring profile that was used, so it can be rebuilt as a
     PDF at any time from "My reports".
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

  let cfg = T.normCfg(null);            // the signed-in person's scoring profile
  const dirty = { tof: false, eff: false };       // changed since the last save?
  const lastSaved = { tof: null, eff: null };     // id of the last saved report
  let repCache = [];

  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function trim(n) { return String(parseFloat(Number(n).toFixed(2))); }
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

  function load() {
    try {
      const o = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (o && o.tof && o.eff) return { tof: mergeTof(o.tof), eff: { rows: mergeRows(o.eff.rows) } };
    } catch (e) {}
    return { tof: blankTof(), eff: blankEff() };
  }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  let state = load();

  /* ------------------------------------------------------------ TOF panel */

  function tofHtml() {
    const h = state.tof.header;
    const field = function (k, label, type, extra) {
      return '<label class="tt-field"><span>' + label + '</span><input data-h="' + k + '" type="' + type + '" value="' + esc(h[k]) + '" ' + (extra || "") + " /></label>";
    };
    let html =
      '<div class="tt-card"><div class="tt-grid">' +
      field("trainer", "Trainer name", "text") + field("evaluator", "Name of the evaluator", "text") +
      field("date", "Observation date", "date") + field("time", "Observation time", "time") +
      field("topic", "Class name / topic", "text") + field("duration", "Course duration (mins)", "number", 'min="0" inputmode="numeric"') +
      "</div></div>" +
      '<div class="tt-card"><div class="tt-card-head"><strong>Scores</strong>' +
      (T.cfgIsCustom(cfg) ? '<span class="tt-chip">Custom scoring</span>' : "") +
      '<span class="tt-hint" id="tof-unrated"></span></div><div class="tt-scores" id="tof-scores"></div></div>';

    T.TOF_SECTIONS.forEach(function (sec, i) {
      html += '<div class="tt-card"><div class="tt-card-head"><strong>' + esc(sec.title) + '</strong><span class="tt-chip" data-sec-score="' + i + '">--</span></div>';
      sec.items.forEach(function (label, j) {
        const key = i + "-" + j, cur = state.tof.ratings[key];
        html +=
          '<div class="tt-item" data-key="' + key + '"><div class="tt-item-label">' + esc(label) + "</div>" +
          '<div class="tt-seg" role="group" aria-label="Rating for ' + esc(label) + '">' +
          ["Y", "N", "N/A"].map(function (r) {
            return '<button type="button" data-rate="' + r + '" class="' + (cur === r ? "on" : "") + '" aria-pressed="' + (cur === r) + '">' + r + "</button>";
          }).join("") +
          '</div><input class="tt-comment" data-comment type="text" placeholder="Comments" value="' + esc(state.tof.comments[key]) + '" /></div>';
      });
      html += "</div>";
    });

    html += '<div class="tt-card tt-notes">';
    NOTES.forEach(function (n) {
      html += '<label class="tt-field"><span>' + n[1] + '</span><textarea data-note="' + n[0] + '" rows="3">' + esc(state.tof.notes[n[0]]) + "</textarea></label>";
    });
    html += "</div>" +
      '<p class="tt-hint">' + esc(T.tofMethod(cfg)) + " Items not yet rated count as N, exactly as in the Excel form.</p>" +
      '<div class="tt-actions"><span class="tt-hint tt-savenote" id="tof-savenote"></span>' +
      '<button type="button" class="ghost-button" data-tof-reset>Clear form</button>' +
      '<button type="button" class="ghost-button" data-tof-save>Save report</button>' +
      '<button type="button" class="auth-submit compact" data-tof-pdf>Download PDF</button></div>';
    return html;
  }

  function tile(label, score, digits, main) {
    const w = score === null ? 0 : Math.round(score * 100);
    return '<div class="tt-tile' + (main ? " main" : "") + '"><span>' + esc(label) + "</span><strong>" + T.pct(score, digits) + '</strong><i style="--w:' + w + '%"></i></div>';
  }

  function updateTof() {
    const c = T.calcTof(state.tof.ratings, cfg);
    document.getElementById("tof-scores").innerHTML =
      c.sections.map(function (s) { return tile(s.title, s.score, 0, false); }).join("") + tile("Overall Score", c.overall, 2, true);
    c.sections.forEach(function (s, i) {
      const chip = host.querySelector('[data-sec-score="' + i + '"]');
      if (chip) chip.textContent = T.pct(s.score, 0);
    });
    document.getElementById("tof-unrated").textContent = c.unrated ? c.unrated + " of " + c.total + " items not rated yet" : "All items rated";
  }

  /* ------------------------------------------------------- Effectiveness */

  function effRowHtml(r, i) {
    return (
      '<tr data-i="' + i + '">' +
      '<td><input class="tt-name" data-e="name" placeholder="Trainer name" value="' + esc(r.name) + '" /></td>' +
      '<td><select data-e="month">' + T.MONTHS.map(function (m) { return "<option" + (m === r.month ? " selected" : "") + ">" + m + "</option>"; }).join("") + "</select></td>" +
      T.EFF_KEYS.map(function (k) {
        return '<td><input class="tt-n" data-e="' + k + '" type="number" step="any" min="0" inputmode="decimal" value="' + esc(r[k]) + '" /></td>';
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
      '<div class="tt-actions tt-actions-left"><button type="button" class="ghost-button" data-eff-add>Add trainer</button></div>' +
      '<div class="tt-card tt-dash"><div class="tt-card-head"><strong>Dashboard</strong></div>' +
      '<div class="tt-kpis" id="eff-kpis"></div><p class="tt-summary" id="eff-summary"></p><div id="eff-dist"></div></div>' +
      '<p class="tt-hint">' + esc(T.effMethod(cfg)) + "</p>" +
      '<div class="tt-actions"><span class="tt-hint tt-savenote" id="eff-savenote"></span>' +
      '<button type="button" class="ghost-button" data-eff-reset>Clear all</button>' +
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
        const v = T.num(r[k]);
        tr.querySelector('[data-e="' + k + '"]').classList.toggle("tt-low", v !== null && v < cfg.eff.min[k]);
      });
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

  /* ---------------------------------------------------- saving reports */

  function setSaveNote(kind, text) {
    const el = document.getElementById(kind + "-savenote");
    if (el) el.textContent = text;
  }
  function markDirty(kind) {
    dirty[kind] = true;
    setSaveNote(kind, "Unsaved changes");
  }

  // The record that goes to the database; null (with a toast) when there is nothing worth saving.
  function buildRecord(kind) {
    const who = (typeof currentUser !== "undefined" && currentUser && currentUser.name) || "";
    if (kind === "tof") {
      const h = state.tof.header;
      if (!h.trainer.trim()) { toast("Add the trainer\u2019s name first."); return null; }
      const c = T.calcTof(state.tof.ratings, cfg);
      return {
        type: "tof", name: who,
        title: h.trainer.trim() + (h.topic.trim() ? " \u2014 " + h.topic.trim() : ""),
        score: T.pct(c.overall, 2),
        payload: JSON.stringify({ tof: state.tof, cfg: cfg }),
      };
    }
    const d = T.calcDashboard(state.eff.rows, cfg);
    if (!d.records) { toast("Add at least one trainer name first."); return null; }
    const month = d.monthLabel.charAt(0).toUpperCase() + d.monthLabel.slice(1);
    return {
      type: "eff", name: who,
      title: month + " \u00B7 " + d.records + " trainer" + (d.records === 1 ? "" : "s"),
      score: d.avg === null ? "" : d.avg.toFixed(2) + "%",
      payload: JSON.stringify({ rows: state.eff.rows, cfg: cfg }),
    };
  }

  async function saveReport(kind) {
    const rec = buildRecord(kind);
    if (!rec) return false;
    try {
      const saved = await fbSaveReport(rec);
      dirty[kind] = false;
      lastSaved[kind] = saved.id;
      setSaveNote(kind, "Saved to My reports at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      toast("Saved to My reports.");
      return true;
    } catch (e) {
      console.warn("Saving the report failed:", e.message);
      toast("Could not save to My reports (" + e.message + "). Check your connection and the Firestore rules.");
      return false;
    }
  }

  // Download first (so the browser treats it as a direct click), then keep a copy in the person's history.
  function pdfAndSave(kind) {
    if (!buildRecord(kind)) return;
    download(function () { return kind === "tof" ? T.tofPdf(state.tof, cfg) : T.effPdf(state.eff.rows, cfg); });
    if (dirty[kind] || !lastSaved[kind]) saveReport(kind);
  }

  /* ---------------------------------------------------------- My reports */

  function whenText(iso) {
    const d = new Date(iso);
    return isNaN(d) ? "\u2014" : d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function reportsHtml() {
    let html =
      '<p class="tt-hint">Every report you save is kept here. Download any of them as a PDF whenever you need it. It is rebuilt exactly as it was scored when you saved it.</p>';
    if (!repCache.length) {
      return html + '<div class="tt-card"><strong>No reports yet.</strong><p class="tt-hint" style="margin:6px 0 0">Open Trainer Observation or Trainer Effectiveness, fill it in and choose Save report or Download PDF.</p></div>';
    }
    html += '<div class="tt-scroll"><table class="tt-table tt-reports"><thead><tr><th>Saved</th><th>Tool</th><th>Report</th><th>Score</th><th></th></tr></thead><tbody>';
    repCache.forEach(function (r) {
      html += "<tr><td>" + esc(whenText(r.createdAt)) + "</td><td>" + (r.type === "tof" ? "Observation" : "Effectiveness") + "</td><td>" + esc(r.title) + "</td><td>" + esc(r.score) + "</td>" +
        '<td class="tt-rowact"><button type="button" class="ghost-button" data-rep-pdf="' + esc(r.id) + '">Download PDF</button>' +
        '<button type="button" class="ghost-button" data-rep-open="' + esc(r.id) + '">Open</button></td></tr>';
    });
    return html + "</tbody></table></div>" + '<p class="tt-hint">' + repCache.length + " saved report" + (repCache.length === 1 ? "" : "s") + ".</p>";
  }

  async function loadReports() {
    const box = document.getElementById("tt-reports");
    box.innerHTML = '<p class="tt-hint">Loading your reports\u2026</p>';
    try {
      repCache = await fbMyReports();
      box.innerHTML = reportsHtml();
    } catch (e) {
      box.innerHTML = '<p class="tt-hint">Could not load your reports (' + esc(e.message) + "). Check your connection and the Firestore rules.</p>";
    }
  }

  function parsePayload(rec) {
    try { return JSON.parse(rec.payload); } catch (e) { toast("This report\u2019s data could not be read."); return null; }
  }

  // Rebuild the PDF from a saved report, using the scoring profile that was in force when it was saved.
  function downloadReport(rec) {
    const p = parsePayload(rec);
    if (!p) return;
    download(function () { return rec.type === "tof" ? T.tofPdf(mergeTof(p.tof), p.cfg) : T.effPdf(mergeRows(p.rows), p.cfg); });
  }
  window.ggDownloadReport = downloadReport;

  function reopenReport(rec) {
    const p = parsePayload(rec);
    if (!p) return;
    if (rec.type === "tof") state.tof = mergeTof(p.tof);
    else state.eff = { rows: mergeRows(p.rows) };
    save(); render();
    dirty[rec.type] = false;
    lastSaved[rec.type] = rec.id;
    openTool(rec.type);
    toast("Report loaded. It is scored with your current scoring; saving keeps a new copy.");
  }

  /* ----------------------------------------------------- open / close */

  // Which tool a service tile opens, judged by the tile's title (so a renamed tile still works if it keeps these words).
  function toolFor(title) {
    const t = String(title || "").toLowerCase();
    return t.indexOf("trainer observation") !== -1 ? "tof" : t.indexOf("trainer effectiveness") !== -1 ? "eff" : null;
  }

  function openTool(which) {
    ["tof", "eff", "reports"].forEach(function (k) { document.getElementById("tt-" + k).hidden = k !== which; });
    document.getElementById("tool-kicker").textContent = TOOLS[which].kicker;
    document.getElementById("tool-title").textContent = TOOLS[which].title;
    host.hidden = false;
    host.scrollTop = 0;
    document.body.style.overflow = "hidden";
    if (which === "reports") loadReports();
  }

  function closeTool() {
    host.hidden = true;
    document.body.style.overflow = "";
  }

  window.ggOpenTool = function (title) {
    const which = toolFor(title);
    if (!which) return false;
    const tools = (typeof currentUser !== "undefined" && currentUser && currentUser.tools) || ["tof", "eff"];
    if (tools.indexOf(which) === -1) { toast("You do not have access to " + TOOLS[which].title + " yet. Ask an admin."); return true; }
    openTool(which);
    return true;
  };

  document.addEventListener("click", function (event) {
    if (!event.target.closest("[data-open-tool]")) return;
    event.preventDefault();
    if (typeof currentUser !== "undefined" && currentUser) openTool("reports");
  });

  document.addEventListener("keydown", function (event) {
    const modal = document.getElementById("modal-veil");
    if (event.key === "Escape" && !host.hidden && (!modal || modal.hidden)) closeTool();
  });

  /* --------------------------------------------------------------- wiring */

  function render() {
    document.getElementById("tt-tof").innerHTML = tofHtml();
    document.getElementById("tt-eff").innerHTML = effHtml();
    updateTof();
    updateEff();
  }

  function download(build) {
    try {
      const r = build();
      r.doc.save(r.filename);
    } catch (e) {
      console.error(e);
      toast("Could not create the PDF. " + e.message);
    }
  }

  host.addEventListener("click", function (event) {
    const t = event.target;

    if (t.closest("[data-tool-back]")) { closeTool(); return; }

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
      save(); markDirty("tof"); updateTof();
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

    if (t.closest("[data-eff-add]")) { state.eff.rows.push(blankRow()); save(); markDirty("eff"); render(); return; }
    const del = t.closest("[data-eff-del]");
    if (del) {
      if (state.eff.rows.length < 2) { toast("Keep at least one row."); return; }
      state.eff.rows.splice(Number(del.closest("tr").dataset.i), 1); save(); render(); markDirty("eff");
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

    const rp = t.closest("[data-rep-pdf]");
    if (rp) { const rec = repCache.filter(function (r) { return r.id === rp.dataset.repPdf; })[0]; if (rec) downloadReport(rec); return; }
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
      markDirty("eff"); save(); updateEff();
      return;
    } else return;
    save();
  });

  // Called by the app after sign-in: the evaluator defaults to the signed-in person, and their scoring profile is applied.
  window.ggToolsHello = function (user) {
    user = user || {};
    if (!state.tof.header.evaluator && user.name) {
      state.tof.header.evaluator = user.name;
      const input = host.querySelector('[data-h="evaluator"]');
      if (input) input.value = user.name;
      save();
    }
    const next = T.normCfg(user.scoring);
    if (JSON.stringify(next) !== JSON.stringify(cfg)) { cfg = next; render(); }
  };
  // Called on sign-out: nothing from this session is left behind.
  window.ggResetTools = function () {
    closeTool();
    cfg = T.normCfg(null);
    repCache = [];
    dirty.tof = dirty.eff = false; lastSaved.tof = lastSaved.eff = null;
    state = { tof: blankTof(), eff: blankEff() };
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    render();
    document.getElementById("tt-reports").innerHTML = "";
  };

  render();
})();
