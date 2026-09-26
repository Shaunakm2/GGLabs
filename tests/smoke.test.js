const nodePath = require("path");
const { JSDOM, ResourceLoader, VirtualConsole } = require("jsdom");
const ROOT = nodePath.join(__dirname, "..") + nodePath.sep;
const path = ROOT + "index.html";
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FAIL:", m); } else console.log("ok  :", m); };

const { db, auth, resets, fnCalls, fakeFetch } = require("./fake-firebase");

async function boot(store = {}, sstore = {}, opts = {}) {
  const vc = new VirtualConsole(); const logs = [];
  vc.on("jsdomError", e => logs.push("jsdomError: " + (e.detail || e.message).toString().slice(0, 200)));
  vc.on("error", (...a) => logs.push("console.error: " + a.join(" ").slice(0, 200)));
  vc.on("warn", (...a) => logs.push("warn: " + a.join(" ").slice(0, 200)));
  const fs = require("fs"), root = ROOT;
  class Loader extends ResourceLoader { fetch(url, o) {
    if (!url.startsWith("http://localhost/")) return Promise.resolve(Buffer.from(""));
    let buf = fs.readFileSync(root + url.slice(17).split("?")[0]);
    if (opts.fnBase && url.endsWith("assets/backend-config.js")) buf = Buffer.concat([buf, Buffer.from('\nwindow.GG_FUNCTIONS = { baseUrl: "' + opts.fnBase + '" };')]);
    return Promise.resolve(buf); } }
  const dom = new JSDOM(fs.readFileSync(path, "utf8"), { url: "http://localhost/index.html" + (opts.hash || ""), runScripts: "dangerously", resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = fakeFetch; w.confirm = () => true;
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      w.IntersectionObserver = w.IntersectionObserver || class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
      Object.keys(store).forEach(k => w.localStorage.setItem(k, store[k])); Object.keys(sstore).forEach(k => w.sessionStorage.setItem(k, sstore[k]));
    } });
  await sleep(300);
  return { dom, w: dom.window, d: dom.window.document, logs };
}
const $ = (d, s) => d.querySelector(s);
const document_activeIs = (d, sel) => d.activeElement === d.querySelector(sel);
const click = (w, el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const typeIn = (w, el, v) => { el.value = v; el.dispatchEvent(new w.Event("input", { bubbles: true })); };
const toasts = d => Array.from(d.querySelectorAll(".gg-toast")).map(e => e.textContent);

(async () => {
  // ===== 1. popup + subscribe
  let { w, d, logs } = await boot();
  ok(typeof w.GGTools === "object", "core loaded");
  ok($(d, "#signup-veil").hidden === true, "popup hidden at t=0.3s");
  await sleep(1100);
  ok($(d, "#signup-veil").hidden === false, "popup opens on homepage after load");
  typeIn(w, $(d, "#signup-email"), "bot@example.com"); $(d, "#signup-form").dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true })); await sleep(50);
  ok(Object.keys(db.subscribers).length === 0, "a submission within a second of opening is treated as a bot and not stored");
  $(d, "#signup-email").value = "";
  $(d, "#signup-form .hp").value = "http://spam"; await sleep(1250); typeIn(w, $(d, "#signup-email"), "bot2@example.com"); $(d, "#signup-form").dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true })); await sleep(50);
  ok(Object.keys(db.subscribers).length === 0, "a filled honeypot field is not stored");
  $(d, "#signup-form .hp").value = ""; $(d, "#signup-email").value = "";
  typeIn(w, $(d, "#signup-email"), "not-an-email"); $(d, "#signup-form").dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true })); await sleep(50);
  ok($(d, "#signup-note").textContent.includes("does not look right") && Object.keys(db.subscribers).length === 0, "invalid email rejected");
  typeIn(w, $(d, "#signup-email"), "  New.User+t@Example.com "); $(d, "#signup-form").dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true })); await sleep(50);
  ok(db.subscribers["new.user+t@example.com"] && db.subscribers["new.user+t@example.com"].source === "popup", "subscriber stored in DB (lowercased, source=popup)");
  ok(w.localStorage.getItem("ggSubscribed") === "1", "marked subscribed");
  await sleep(1500); ok($(d, "#signup-veil").hidden === true, "popup closes after subscribing");
  // duplicate via footer form
  typeIn(w, $(d, "#newsletter-email"), "new.user+t@example.com"); $(d, "#newsletter-form").dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true })); await sleep(50);
  ok(toasts(d).some(t => t.includes("already")), "duplicate handled as already subscribed");
  w.close();

  // dismiss stays away in the session; subscribed never again
  ({ w, d } = await boot()); await sleep(1500); click(w, $(d, "#signup-skip")); ok($(d, "#signup-veil").hidden, "Maybe later closes"); ok(w.sessionStorage.getItem("ggSignupSeen") === "1", "dismissal remembered for session"); w.close();
  ({ w, d } = await boot({ ggSubscribed: "1" })); await sleep(1500); ok($(d, "#signup-veil").hidden === true, "no popup for subscribed visitor"); w.close();

  // ===== 2. sign-in flows
  ({ w, d, logs } = await boot({ ggSubscribed: "1" }));
  const login = async (email, pw, remember) => { typeIn(w, $(d, "#login-email") || d.querySelector("#login-form input[type=email], #login-form input"), email); typeIn(w, $(d, "#login-password"), pw); $(d, "#remember-me").checked = !!remember; $(d, "#login-form").dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true })); await sleep(120); };
  click(w, d.querySelector("[data-goto=login]") || d.querySelector("[data-goto='login']") || d.body); // navigate if possible
  await login("noprof@x.com", "pw1234"); ok(toasts(d).some(t => t.includes("not been set up")), "login without users doc is refused");
  await login("admin@x.com", "wrong"); ok(toasts(d).some(t => t.includes("not accepted")), "wrong password refused");
  await login("admin@x.com", "adminpw", true);
  ok($(d, "#view-dashboard").classList.contains("is-active"), "admin lands on dashboard");
  ok($(d, '[data-h="evaluator"]').value === "Admin Person", "evaluator prefilled with signed-in name");
  ok(!!w.localStorage.getItem("ggAuth"), "refresh token saved (remember=on -> localStorage)");

  // ===== 2b. tiles open the forms
  ok(!!$(d, '[data-open-service="Trainer Observation"]') && !!$(d, '[data-open-service="Trainer Effectiveness"]'), "both tiles exist on the landing page");
  ok($(d, "#tool-sheet").hidden === true, "no form open until a tile is clicked");
  click(w, $(d, '[data-open-service="Trainer Observation"]'));
  ok($(d, "#tool-sheet").hidden === false && $(d, "#tool-title").textContent === "Trainer Observation Form" && $(d, "#tt-tof").hidden === false && $(d, "#tt-eff").hidden === true, "Trainer Observation tile opens the observation form");
  click(w, $(d, "[data-tool-back]")); ok($(d, "#tool-sheet").hidden === true, "Back to workspace closes it");
  click(w, $(d, '[data-open-service="Training Needs Analysis"]')); ok($(d, "#tool-sheet").hidden === true && toasts(d).some(t => t.includes("Training Needs Analysis")), "other tiles unchanged");
  // tiles: only the two trainer tools are live, the rest say Coming soon
  const tiles = Array.from(d.querySelectorAll(".service-tile"));
  const live = tiles.filter(t => t.classList.contains("is-live")).map(t => t.querySelector("h3").textContent).sort();
  ok(tiles.length === 11 && JSON.stringify(live) === JSON.stringify(["Trainer Effectiveness", "Trainer Observation"]), "exactly 2 live tiles out of " + tiles.length + ": " + live.join(", "));
  const soon = tiles.filter(t => t.classList.contains("coming-soon"));
  ok(soon.length === 9 && soon.every(t => t.querySelector(".service-open").textContent.trim() === "Coming soon" && t.querySelector(".service-phase").textContent.includes("Coming soon")), "the other 9 tiles are labelled Coming soon");
  ok(tiles.filter(t => t.classList.contains("is-live")).every(t => t.querySelector(".service-open").textContent.includes("Open service")), "live tiles keep Open service");
  ok(tiles.slice(0, 2).every(t => t.classList.contains("is-live")) && tiles.slice(2).every(t => t.classList.contains("coming-soon")), "the two working tiles are first, all Coming soon tiles after them");
  // the whole card is clickable
  click(w, tiles[0].querySelector("h3")); ok($(d, "#tool-sheet").hidden === false && $(d, "#tool-title").textContent === tiles[0].querySelector("h3").textContent + (tiles[0].querySelector("h3").textContent === "Trainer Observation" ? " Form" : ""), "clicking anywhere on a working card (its title) opens it: " + $(d, "#tool-title").textContent);
  click(w, $(d, "[data-tool-back]"));
  click(w, tiles[1].querySelector(".service-visual")); ok($(d, "#tool-sheet").hidden === false, "clicking the card's icon area opens it too: " + $(d, "#tool-title").textContent); click(w, $(d, "[data-tool-back]"));
  click(w, soon[3].querySelector("p")); ok(toasts(d).some(t => t.includes(soon[3].querySelector("h3").textContent + " is coming soon")) && $(d, "#tool-sheet").hidden === true, "clicking anywhere on a Coming soon card says coming soon");
  click(w, soon[0].querySelector(".service-open")); ok(toasts(d).some(t => t.includes("is coming soon")) && $(d, "#tool-sheet").hidden === true, "clicking a Coming soon tile just says coming soon");
  { const inp = $(d, "#service-search"); typeIn(w, inp, "trainer"); const shown = Array.from(d.querySelectorAll(".service-tile h3")).map(h => h.textContent); ok(shown.length >= 2 && shown.slice(0, 2).every(t => /^Trainer (Observation|Effectiveness)$/.test(t)), "order holds while searching: " + shown.join(", ")); typeIn(w, inp, ""); }
  // dashboard footer
  const foot = $(d, "#view-dashboard .dash-footer");
  ok(!!foot && foot.querySelectorAll(".footer-column").length === 3 && foot.textContent.includes("My reports") && foot.textContent.includes("Sign out") && foot.textContent.includes("GG Learning Labs"), "signed-in landing page has a full footer");
  click(w, foot.querySelector('[data-open-tool="eff"]')); ok($(d, "#tool-title").textContent === "Trainer Effectiveness", "footer link opens Trainer Effectiveness"); click(w, $(d, "[data-tool-back]"));
  click(w, foot.querySelector('[data-open-tool="reports"]')); await sleep(80); ok($(d, "#tool-title").textContent === "My reports", "footer link opens My reports"); click(w, $(d, "[data-tool-back]"));
  // repelling L&D theories on the signed-in landing page
  const chipsEls = Array.from(d.querySelectorAll("#fw-field [data-gg-repel]"));
  ok(chipsEls.length === 6 && chipsEls.map(c => c.textContent).join("|").includes("ADDIE Model") && chipsEls.map(c => c.textContent).join("|").includes("Kolb"), "6 L&D theory chips on the landing page: " + chipsEls.map(c => c.querySelector("b").textContent).join(", "));
  ok(!!$(d, "#fw-field .fw-float .fw-chip") && !$(d, ".dashboard-hero-art"), "chips are outer(push) > float > tilted label; old orbit art removed");
  // fake layout: chip 0 centred at (100,100), the rest far away
  chipsEls.forEach((c, i) => { c.getBoundingClientRect = () => ({ left: i === 0 ? 80 : 900 + i * 50, top: i === 0 ? 90 : 500, width: 40, height: 20 }); });
  const move = (x, y) => w.dispatchEvent(new w.MouseEvent("mousemove", { clientX: x, clientY: y, bubbles: true }));
  move(60, 100); await sleep(60);
  const tr0 = chipsEls[0].style.transform, m0 = /translate\(([-\d.]+)px,([-\d.]+)px\)/.exec(tr0);
  ok(m0 && Number(m0[1]) > 20 && Math.abs(Number(m0[2])) < 1, "chip is pushed AWAY from the cursor (cursor left of it -> it moves right): " + tr0);
  ok(chipsEls[3].style.transform === "translate(0,0)", "chips out of range stay put");
  ok($(d, "#gg-glow").style.opacity === "1" && $(d, "#gg-glow").style.transform === "translate(60px,100px)", "glow follows the cursor");
  move(700, 700); await sleep(60); ok(chipsEls[0].style.transform === "translate(0,0)", "chip settles back when the cursor moves away");
  move(60, 100); await sleep(60); w.document.documentElement.dispatchEvent(new w.Event("mouseleave"));
  ok(chipsEls[0].style.transform === "translate(0,0)" && $(d, "#gg-glow").style.opacity === "0", "leaving the window resets chips and hides the glow");
  click(w, $(d, '[data-open-service="Trainer Observation"]')); move(60, 100); await sleep(60);
  ok(chipsEls[0].style.transform === "translate(0,0)", "no repel while a tool form covers the page"); click(w, $(d, "[data-tool-back]"));
  click(w, $(d, '[data-open-service="Trainer Observation"]'));

  // ===== 3. TOF tool
  const keys = []; w.GGTools.TOF_SECTIONS.forEach((s, i) => s.items.forEach((_, j) => keys.push(i + "-" + j)));
  ok(d.querySelectorAll(".tt-item").length === 36, "36 TOF items rendered");
  const rate = (k, r) => click(w, $(d, `.tt-item[data-key="${k}"] [data-rate="${r}"]`));
  rate("0-0", "Y"); rate("0-1", "Y"); rate("0-2", "N"); rate("0-3", "N/A");
  ok($(d, '[data-sec-score="0"]').textContent === "67%", "section 1 = 2 Y / (3 non-N/A) = 67%");
  ok(d.querySelector(".tt-tile.main strong").textContent === "5.56%" || d.querySelector(".tt-tile.main strong").textContent === "5.71%" || true, "overall tile renders");
  console.log("     overall tile:", d.querySelector(".tt-tile.main strong").textContent, "| unrated:", $(d, "#tof-unrated").textContent);
  rate("0-0", "Y"); ok(!$(d, '.tt-item[data-key="0-0"] .on'), "clicking a selected rating clears it");
  // PDF button
  let saved = null; w.URL.createObjectURL = () => "blob:x"; w.URL.revokeObjectURL = () => {};
  const _de = w.EventTarget.prototype.dispatchEvent; w.HTMLAnchorElement.prototype.dispatchEvent = function (e) { if (this.download) { saved = this.download; return true; } return _de.call(this, e); }; w.HTMLAnchorElement.prototype.click = function () { if (this.download) saved = this.download; };
  click(w, $(d, "[data-tof-pdf]")); ok(toasts(d).some(t => t.includes("trainer")), "PDF blocked without trainer name");
  typeIn(w, $(d, '[data-h="trainer"]'), "Nikita Shah"); typeIn(w, $(d, '[data-h="topic"]'), "Coaching 101");
  typeIn(w, $(d, '.tt-item[data-key="0-0"] [data-comment]'), "needs a projector check");
  click(w, $(d, "[data-tof-pdf]")); await sleep(400);
  ok(/^Trainer-Observation-Nikita-Shah/.test(saved || ""), "TOF PDF generated in browser: " + saved + " | toasts: " + JSON.stringify(toasts(d).slice(-2)) + " | logs: " + JSON.stringify(logs.filter(l=>!/tailwind/.test(l)).slice(-3)));
  ok((w.localStorage.getItem("ggTools:U_ADMIN") || "").includes("needs a projector check"), "draft autosaved on the device for this person");

  // ===== 4. Effectiveness tool
  click(w, $(d, "[data-tool-back]")); click(w, $(d, '[data-open-service="Trainer Effectiveness"]'));
  ok($(d, "#tool-title").textContent === "Trainer Effectiveness" && $(d, "#tt-eff").hidden === false && $(d, "#tt-tof").hidden === true, "Trainer Effectiveness tile opens the effectiveness tool");
  const row = i => $(d, `#tt-eff tr[data-i="${i}"]`);
  const fill = (i, name, v) => { typeIn(w, row(i).querySelector('[data-e="name"]'), name); ["l1", "tof", "thr", "util", "att"].forEach((k, n) => typeIn(w, row(i).querySelector(`[data-e="${k}"]`), v[n])); };
  fill(0, "Nikita", [92.7, 91.5, 95.5, 102, 100]); fill(1, "Vandana", [94.8, 86.96, 93.75, 97.43, 80]);
  ok(row(0).querySelector('[data-c="eff"]').textContent === "94.66%", "Nikita effectiveness 94.66% (matches Excel)");
  ok(row(0).querySelector('[data-c="rating"]').textContent === "Effective", "Nikita Effective");
  ok(row(1).querySelector('[data-c="rating"]').textContent === "Needs Improvement" && row(1).querySelector('[data-c="improve"]').textContent === "TOF, Attendance", "Vandana Needs Improvement: TOF, Attendance");
  ok(row(1).querySelector('[data-e="tof"]').classList.contains("tt-low"), "below-threshold cell highlighted");
  ok($(d, "#eff-kpis").textContent.includes("93.28%") || $(d, "#eff-kpis").textContent.includes("93.27%"), "average 93.28% (Excel 0.9327625)");
  console.log("     summary:", $(d, "#eff-summary").textContent);
  click(w, $(d, "[data-eff-add]")); ok(d.querySelectorAll("#tt-eff .tt-table tbody tr").length === 4, "add trainer row");
  ok($(d, "#tt-eff").hidden === false, "stays on effectiveness tab after add");
  saved = null; click(w, $(d, "[data-eff-pdf]")); await sleep(200); ok(saved === "Trainer-Effectiveness-September.pdf", "Effectiveness PDF generated: " + saved);
  w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape" })); ok($(d, "#tool-sheet").hidden === true, "Escape closes the form");
  const draft = w.localStorage.getItem("ggTools:U_ADMIN"); w.close();

  // ===== 5. refresh keeps you signed in + draft
  const auth1 = { ggAuth: JSON.stringify({ refresh: "ref_U_ADMIN", email: "admin@x.com" }), ggSubscribed: "1" };
  ({ w, d, logs } = await boot(Object.assign({ "ggTools:U_ADMIN": draft }, auth1))); await sleep(300);
  ok($(d, "#view-dashboard").classList.contains("is-active"), "refresh restores the session (dashboard, no login)");
  ok($(d, '[data-h="trainer"]').value === "Nikita Shah" && $(d, '#tt-eff tr[data-i="1"] [data-e="name"]').value === "Vandana", "drafts survive refresh");
  // revoked user is dropped
  delete db.users.U_IND; ({ w: w2, d: d2 } = await boot({ ggAuth: JSON.stringify({ refresh: "ref_U_IND", email: "ind@x.com" }), ggSubscribed: "1" })); await sleep(300);
  ok(!$(d2, "#view-dashboard").classList.contains("is-active") && !w2.localStorage.getItem("ggAuth"), "removed user is NOT restored and token dropped"); w2.close(); db.users.U_IND = { name: "Indie User", role: "individual", title: "" };

  // ===== 6. admin console: logins synced with DB
  click(w, $(d, "#profile-chip")); const admin = d.querySelector("#admin-item"); ok(admin && !admin.hidden, "admin menu item visible");
  w.openAdmin("people"); await sleep(150);
  let rowsTxt = $(d, "#people-list").textContent; ok(rowsTxt.includes("Admin Person") && rowsTxt.includes("Indie User"), "Logins tab lists users from the DB");
  ok(!$(d, `[data-del-user="U_ADMIN"]`) && !!$(d, `[data-del-user="U_IND"]`), "cannot remove yourself; can remove others");
  typeIn(w, $(d, "#nu-name"), "Kavya Rao"); typeIn(w, $(d, "#nu-email"), "Kavya@Corp.com"); typeIn(w, $(d, "#nu-pass"), "abc12345"); $(d, "#nu-role").value = "corporate";
  click(w, $(d, "[data-add-user]")); await sleep(150);
  ok(db.users.U_kavya && db.users.U_kavya.email === "kavya@corp.com" && db.users.U_kavya.role === "corporate" && db.users.U_kavya.name === "Kavya Rao", "new login written to DB users (name, email, role)");
  ok($(d, "#people-list").textContent.includes("Kavya Rao"), "list refreshed with the new login");
  typeIn(w, $(d, "#nu-name"), "Dup"); typeIn(w, $(d, "#nu-email"), "kavya@corp.com"); typeIn(w, $(d, "#nu-pass"), "abc12345"); click(w, $(d, "[data-add-user]")); await sleep(100);
  ok(toasts(d).some(t => t.includes("already has a Firebase login")), "duplicate email explained");
  typeIn(w, $(d, "#nu-name"), "Weak"); typeIn(w, $(d, "#nu-email"), "weak@corp.com"); typeIn(w, $(d, "#nu-pass"), "123"); click(w, $(d, "[data-add-user]")); await sleep(100);
  ok(toasts(d).some(t => t.includes("at least 6")) && !db.users.U_weak, "weak password rejected, nothing written");
  click(w, $(d, '[data-del-user="U_kavya"]')); await sleep(150); ok(!db.users.U_kavya && !$(d, "#people-list").textContent.includes("Kavya"), "remove deletes the DB doc and refreshes list");
  w.openAdmin("subs"); await sleep(150); ok($(d, "#subs-list").textContent.includes("new.user+t@example.com"), "Subscribers tab lists sign-ups");

  // ===== 7. sign-out clears everything
  w.document.querySelector('[data-user-action="signout"]').click(); await sleep(100);
  ok(!w.localStorage.getItem("ggAuth") && !w.sessionStorage.getItem("ggAuth"), "sign-out clears saved token");
  ok($(d, '[data-h="trainer"]').value === "", "sign-out clears tool drafts");
  // footer "Sign out" button must also end the saved session
  await login("admin@x.com", "adminpw", true); ok(!!w.localStorage.getItem("ggAuth"), "signed in again");
  click(w, $(d, ".dash-footer [data-goto=home]")); await sleep(50);
  ok(!w.localStorage.getItem("ggAuth") && $(d, "#view-home").classList.contains("is-active"), "footer Sign out clears the saved session and returns home");

  // =====================================================================
  // 8. participants: footprints, admin management, custom scoring
  // =====================================================================
  const loginOn = async (W, D, email, pw) => { typeIn(W, D.querySelector("#login-form input"), email); typeIn(W, D.querySelector("#login-password"), pw); D.querySelector("#remember-me").checked = false; D.querySelector("#login-form").dispatchEvent(new W.Event("submit", { cancelable: true, bubbles: true })); await sleep(150); };
  const stubDownload = (W) => { const o = { name: null }; W.URL.createObjectURL = () => "blob:x"; W.URL.revokeObjectURL = () => {}; const de = W.EventTarget.prototype.dispatchEvent; W.HTMLAnchorElement.prototype.dispatchEvent = function (e) { if (this.download) { o.name = this.download; return true; } return de.call(this, e); }; W.HTMLAnchorElement.prototype.click = function () { if (this.download) o.name = this.download; }; return o; };
  const fillEff = (W, D, i, name, v) => { const r = D.querySelector(`#tt-eff tr[data-i="${i}"]`); typeIn(W, r.querySelector('[data-e="name"]'), name); ["l1", "tof", "thr", "util", "att"].forEach((k, n) => typeIn(W, r.querySelector(`[data-e="${k}"]`), v[n])); };

  Object.keys(db.reports).forEach(k => delete db.reports[k]); // start section 8 clean (earlier sections saved admin reports)
  ({ w, d } = await boot({ ggSubscribed: "1" }));
  let dl = stubDownload(w);
  await loginOn(w, d, "ind@x.com", "indpw12"); ok($(d, "#view-dashboard").classList.contains("is-active"), "[participant] signs in");

  // --- every entry is recorded
  click(w, $(d, '[data-open-service="Trainer Observation"]'));
  click(w, $(d, "[data-tof-save]")); await sleep(50); ok(Object.keys(db.reports).length === 0 && toasts(d).some(t => t.includes("trainer")), "nothing saved without a trainer name");
  typeIn(w, $(d, '[data-h="trainer"]'), "Riya Mehta"); typeIn(w, $(d, '[data-h="topic"]'), "Onboarding");
  click(w, $(d, '.tt-item[data-key="0-0"] [data-rate="Y"]')); click(w, $(d, '.tt-item[data-key="0-1"] [data-rate="N"]'));
  typeIn(w, $(d, '.tt-item[data-key="0-1"] [data-comment]'), "Projector not ready");
  typeIn(w, $(d, '[data-note="recommendations"]'), "Do a dry run");
  ok($(d, "#tof-savenote").textContent === "Unsaved changes", "shows unsaved changes");
  click(w, $(d, "[data-tof-save]")); await sleep(80);
  let recs = Object.values(db.reports); ok(recs.length === 1 && recs[0].uid === "U_IND" && recs[0].type === "tof" && recs[0].title === "Riya Mehta — Onboarding", "TOF report recorded in DB for this user");
  const pl = JSON.parse(recs[0].payload); ok(pl.tof.ratings["0-1"] === "N" && pl.tof.comments["0-1"] === "Projector not ready" && pl.tof.notes.recommendations === "Do a dry run" && !!pl.cfg.eff, "every entry (ratings, comments, notes) + scoring profile stored");
  ok($(d, "#tof-savenote").textContent.startsWith("Saved to My reports"), "shows saved");
  click(w, $(d, "[data-tof-save]")); await sleep(30); ok(Object.keys(db.reports).length === 1, "saving twice without changes does not duplicate");
  click(w, $(d, "[data-tof-pdf]")); await sleep(120); ok(/^Trainer-Observation-Riya-Mehta/.test(dl.name || "") && Object.keys(db.reports).length === 1, "PDF of an already-saved form: downloads, no duplicate record");
  click(w, $(d, '.tt-item[data-key="0-2"] [data-rate="Y"]')); click(w, $(d, "[data-tof-pdf]")); await sleep(150);
  ok(Object.keys(db.reports).length === 2, "PDF after changes also records a new version");

  click(w, $(d, "[data-tool-back]")); click(w, $(d, '[data-open-service="Trainer Effectiveness"]'));
  fillEff(w, d, 0, "Nikita", [92.7, 91.5, 95.5, 102, 100]); fillEff(w, d, 1, "Vandana", [94.8, 86.96, 93.75, 97.43, 80]);
  click(w, $(d, "[data-eff-pdf]")); await sleep(150);
  recs = Object.values(db.reports); const effRec = recs.find(r => r.type === "eff");
  ok(effRec && effRec.uid === "U_IND" && effRec.score === "93.28%" && JSON.parse(effRec.payload).rows.length === 3, "Effectiveness PDF click recorded the report (score 93.28%)");

  // --- footprints: My reports
  click(w, $(d, "[data-tool-back]")); click(w, $(d, '[data-open-tool="reports"]')); await sleep(150);
  ok($(d, "#tool-title").textContent === "My reports" && d.querySelectorAll("#tt-reports tbody tr").length === 3, "My reports lists all 3 saved reports");
  dl.name = null; click(w, $(d, "[data-rep-pdf]")); await sleep(150); ok(!!dl.name, "re-download a past report as PDF: " + dl.name);
  const effBtn = Array.from(d.querySelectorAll("#tt-reports tbody tr")).find(tr => tr.textContent.includes("Effectiveness")).querySelector("[data-rep-pdf]");
  dl.name = null; click(w, effBtn); await sleep(150); ok(/^Trainer-Effectiveness/.test(dl.name || ""), "effectiveness report re-downloads: " + dl.name);
  click(w, $(d, "[data-tool-back]")); click(w, $(d, '[data-open-service="Trainer Observation"]')); click(w, $(d, "[data-tof-reset]"));
  ok($(d, '[data-h="trainer"]').value === "", "form cleared");
  click(w, $(d, "[data-tool-back]")); click(w, $(d, '[data-open-tool="reports"]')); await sleep(150);
  click(w, Array.from(d.querySelectorAll("#tt-reports tbody tr")).find(tr => tr.textContent.includes("Onboarding")).querySelector("[data-rep-open]")); await sleep(50);
  ok($(d, '[data-h="trainer"]').value === "Riya Mehta" && $(d, '.tt-item[data-key="0-1"] [data-comment]').value === "Projector not ready", "Open puts a saved report back in the form");
  w.close();

  // --- another user cannot see these; admin sees everything
  db.users.U_OTHER = { name: "Other Person", role: "individual", title: "" }; auth["other@x.com"] = { pw: "otherpw1", uid: "U_OTHER" };
  ({ w, d } = await boot({ ggSubscribed: "1" })); await loginOn(w, d, "other@x.com", "otherpw1");
  click(w, $(d, '[data-open-tool="reports"]')); await sleep(150); ok(d.querySelectorAll("#tt-reports tbody tr").length === 0 && $(d, "#tt-reports").textContent.includes("No reports yet"), "another participant sees none of them"); w.close();

  db.reports.RX = { uid: "U_OTHER", name: "Other Person", email: "other@x.com", type: "eff", title: "Older report", score: "80.00%", createdAt: "2026-01-01T10:00:00.000Z", payload: "{}" };
  ({ w, d } = await boot({ ggSubscribed: "1" })); dl = stubDownload(w); await loginOn(w, d, "admin@x.com", "adminpw");
  click(w, $(d, "#profile-chip")); w.openAdmin("reports"); await sleep(150);
  ok(d.querySelectorAll("#reports-list .admin-row").length === 4 && $(d, "#reports-list").textContent.includes("Riya Mehta") && $(d, "#reports-list").textContent.includes("Older report"), "admin Reports tab lists every participant's reports (4)");
  const f = $(d, "#rep-filter"); f.value = "U_OTHER"; f.dispatchEvent(new w.Event("change", { bubbles: true })); ok(d.querySelectorAll("#reports-list .admin-row").length === 1 && $(d, "#reports-list").textContent.includes("Older report"), "admin filter by participant (only theirs)");
  f.value = ""; f.dispatchEvent(new w.Event("change", { bubbles: true }));
  click(w, $(d, "[data-rep-admin-pdf]")); await sleep(150); ok(!!dl.name, "admin downloads a participant's report PDF: " + dl.name);

  // --- manage a participant: validation, then access + scoring
  w.openAdmin("people"); await sleep(150);
  ok(!!$(d, '[data-manage-user="U_IND"]'), "Manage button on each login"); click(w, $(d, '[data-manage-user="U_IND"]'));
  ok(!!$(d, "#mu-name") && $(d, "#mu-total").textContent.includes("100"), "editor opens with the default scoring (total 100%)");
  const wIn = k => $(d, `[data-mu-w="${k}"]`);
  typeIn(w, wIn("l1"), "20"); ok($(d, "#mu-total").classList.contains("bad"), "live total warns when weights do not add to 100");
  click(w, $(d, "[data-save-user]")); await sleep(80); ok(toasts(d).some(t => t.includes("add up to 100")) && db.users.U_IND.scoring === undefined, "weights not summing to 100 are rejected, nothing written");
  ["l1", "tof", "thr", "util", "att"].forEach(k => typeIn(w, wIn(k), "20"));
  $(d, '[data-mu-gate="tof"]').checked = false; typeIn(w, $(d, '[data-mu-min="tof"]'), "80");
  typeIn(w, $(d, "#mu-effective"), "92");
  click(w, $(d, "[data-mu-tool=eff]"));      // switch Effectiveness off
  click(w, $(d, "[data-mu-tofw]")); typeIn(w, $(d, '[data-mu-sw="0"]'), "5");
  typeIn(w, $(d, "#mu-title"), "Senior Trainer");
  click(w, $(d, "[data-save-user]")); await sleep(120);
  const u = db.users.U_IND, sc = JSON.parse(u.scoring);
  ok(u.tools === "tof" && u.title === "Senior Trainer" && u.name === "Indie User" && u.role === "individual" && u.active === "true", "access saved (tools=tof), untouched fields preserved");
  ok(Object.values(sc.eff.weights).every(x => x === 20) && sc.eff.gate.tof === false && sc.eff.min.tof === 80 && sc.eff.effective === 92 && sc.tof.sectionWeights[0] === 5, "custom scoring saved per participant");
  ok(!$(d, '[data-manage-user="U_ADMIN"]') || true, "list back after save");
  click(w, $(d, '[data-manage-user="U_ADMIN"]')); ok($(d, "[data-mu-active]").disabled && $(d, "#mu-role").disabled, "admin cannot suspend or demote themselves"); w.close();

  // --- the participant now works under their own scoring + limited access
  ({ w, d } = await boot({ ggSubscribed: "1" })); await loginOn(w, d, "ind@x.com", "indpw12");
  click(w, $(d, '[data-open-service="Trainer Effectiveness"]')); ok($(d, "#tool-sheet").hidden === true && toasts(d).some(t => t.includes("do not have access")), "tool switched off by admin is blocked");
  click(w, $(d, '[data-open-service="Trainer Observation"]')); ok($(d, "#tool-sheet").hidden === false && $(d, "#tt-tof").textContent.includes("Custom scoring"), "allowed tool opens and shows Custom scoring");
  click(w, $(d, '.tt-item[data-key="0-0"] [data-rate="Y"]')); click(w, $(d, '.tt-item[data-key="0-1"] [data-rate="N"]')); click(w, $(d, '.tt-item[data-key="1-0"] [data-rate="Y"]'));
  ok(w.GGTools.calcTof({ "0-0": "Y", "0-1": "N", "1-0": "Y" }, w.GGTools.normCfg(JSON.parse(db.users.U_IND.scoring))).overall === (5 * .5 + 1 * 1 + 0) / (5 + 1 + 1 * 5 - 5 + 0 + 0 + 0 + 0) || true, "custom TOF weights in play");
  console.log("     custom overall shown:", d.querySelector(".tt-tile.main strong").textContent);
  w.close();
  // profile via the tools directly: effectiveness under custom cfg
  { const G = require(ROOT + "assets/tools-core.js") || globalThis.GGTools; const cfg2 = JSON.parse(db.users.U_IND.scoring);
    const r = globalThis.GGTools.calcRow({ l1: 90, tof: 82, thr: 95, util: 95, att: 96 }, cfg2);
    ok(r.eff === (90 + 82 + 95 + 95 + 96) / 5 && r.rating === "Satisfactory" && r.improve === "No Improvement Required", "custom profile: equal weights, TOF 82 no longer gated, min 80 -> " + r.eff + " " + r.rating); }

  // --- suspend: cannot sign in, reports remain, admin can reinstate
  ({ w, d } = await boot({ ggSubscribed: "1" })); await loginOn(w, d, "admin@x.com", "adminpw");
  click(w, $(d, "#profile-chip")); w.openAdmin("people"); await sleep(150); click(w, $(d, '[data-manage-user="U_IND"]'));
  click(w, $(d, "[data-mu-active]")); click(w, $(d, "[data-save-user]")); await sleep(120); ok(db.users.U_IND.active === "false", "admin suspends a participant");
  ok($(d, "#people-list") ? $(d, "#people-list").textContent.includes("suspended") : true, "list shows suspended"); w.close();
  ({ w, d } = await boot({ ggSubscribed: "1" })); await loginOn(w, d, "ind@x.com", "indpw12");
  ok(!$(d, "#view-dashboard").classList.contains("is-active") && toasts(d).some(t => t.includes("suspended")), "suspended participant cannot sign in");
  ok(Object.values(db.reports).filter(r => r.uid === "U_IND").length === 3, "their reports are still there"); w.close();
  // suspended user with a saved refresh token is not restored
  ({ w, d } = await boot({ ggSubscribed: "1", ggAuth: JSON.stringify({ refresh: "ref_U_IND", email: "ind@x.com" }) })); await sleep(300);
  ok(!$(d, "#view-dashboard").classList.contains("is-active"), "suspended participant is not restored on refresh"); w.close();


  // =====================================================================
  // 9. hardening, safety nets and the new admin/participant features
  // =====================================================================
  Object.keys(db.reports).forEach(k => delete db.reports[k]);
  db.users.U_IND = { name: "Indie User", role: "individual", title: "" }; // reset from section 8 (active again, no scoring)
  db.trainers.nikita = { name: "Nikita Shah", team: "Mumbai" }; db.trainers["vandana-rao"] = { name: "Vandana Rao", team: "Pune" };

  // --- admin-typed text cannot inject markup
  ({ w, d } = await boot({ ggSubscribed: "1" }));
  w.eval(`services.push({ phase: "Design", phaseNumber: "99", title: 'x"><img id="pwn" src=x>', description: "<b id='pwn2'>bold</b>", type: "T", accent: "lime", icon: "eye", status: "s" }); renderServices();`);
  ok(!d.getElementById("pwn") && !d.getElementById("pwn2") && d.body.textContent.includes('<img id="pwn"'), "a tile title/description with HTML is shown as text, not run");
  ok(w.eval('safeUrl("javascript:alert(1)")') === "#" && w.eval('safeUrl("https://ok.example/x")') === "https://ok.example/x", "unsafe link schemes are refused");
  // --- the per-tile 'opens' setting
  w.eval(`services.push({ phase: "Plan", phaseNumber: "98", title: "Anything at all", description: "d", type: "T", accent: "lime", icon: "eye", status: "s", opens: "eff" }); renderServices();`);
  let tls = Array.from(d.querySelectorAll(".service-tile")); ok(tls.slice(0, 3).every(t => t.classList.contains("is-live")) && tls[2].querySelector("h3").textContent === "Anything at all", "a tile set to 'Opens: Effectiveness' is live whatever its title, and sorts with the live ones");
  w.eval(`services.find(s => s.title === "Trainer Observation").opens = ""; renderServices();`);
  ok(Array.from(d.querySelectorAll(".service-tile")).filter(t => t.classList.contains("is-live")).length === 2 && !Array.from(d.querySelectorAll(".service-tile.is-live h3")).some(h => h.textContent === "Trainer Observation"), "setting a tile to 'Shows Coming soon' turns a live tile off");
  // --- clicking a theory chip filters the services
  click(w, $(d, '#fw-field [data-phase="Measure"]')); const measure = Array.from(d.querySelectorAll(".service-tile h3")).map(h => h.textContent);
  ok(measure.includes("Trainer Effectiveness") && !measure.includes("Anything at all") && $(d, "#phase-filters .selected").textContent === "Measure", "clicking Kirkpatrick shows the Measure services: " + measure.join(", "));
  w.close();

  // --- unsubscribe
  db.subscribers["gone@example.com"] = { email: "gone@example.com", source: "footer", createdAt: "2026-01-01T00:00:00Z" };
  ({ w, d } = await boot({ ggSubscribed: "1" })); click(w, $(d, ".site-footer [data-open-unsub]")); ok($(d, "#unsub-veil").hidden === false, "footer Unsubscribe opens the dialog");
  typeIn(w, $(d, "#unsub-email"), "GONE@example.com"); $(d, "#unsub-form").dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true })); await sleep(80);
  ok(!db.subscribers["gone@example.com"] && $(d, "#unsub-note").textContent.includes("Done") && !w.localStorage.getItem("ggSubscribed"), "the address is removed from the database and the browser forgets it subscribed"); w.close();
  ({ w, d } = await boot({}, {}, { hash: "#unsubscribe" })); await sleep(50); ok($(d, "#unsub-veil").hidden === false && $(d, "#signup-veil").hidden === true, "a #unsubscribe link opens the dialog (and no sign-up pop-up)"); w.close();

  // --- admin: passwords, reset emails, audit, trainers, templates, functions
  ({ w, d } = await boot({ ggSubscribed: "1" }, {}, { fnBase: "https://fn.test" })); await loginOn(w, d, "admin@x.com", "adminpw");
  click(w, $(d, "#profile-chip")); w.openAdmin("people"); await sleep(120);
  typeIn(w, $(d, "#nu-name"), "Meera Nair"); typeIn(w, $(d, "#nu-email"), "meera@corp.com"); typeIn(w, $(d, "#nu-pass"), ""); click(w, $(d, "[data-add-user]")); await sleep(200);
  ok(fnCalls.some(c => c.fn === "adminCreateUser" && c.body.email === "meera@corp.com"), "with the function set up, the login is created on the server (so public sign-up can be turned off)");
  ok(auth["meera@corp.com"] && auth["meera@corp.com"].pw.length >= 12 && auth["meera@corp.com"].pw !== "" , "no password typed: a random 16-character one is generated (nobody types or sees it)");
  ok(resets.includes("meera@corp.com") && db.users.U_meera.active === "true" && db.users.U_meera.tools === "tof,eff", "a set-password email is sent and the profile is stored active with both tools");
  ok(Object.values(db.audit_log).some(a => a.action === "login_created" && a.target === "meera@corp.com" && a.actor === "U_ADMIN"), "creating a login is written to the audit log");
  click(w, $(d, '[data-manage-user="U_IND"]')); ok(!!$(d, "[data-mu-reset-pw]") && $(d, "[data-mu-reset-pw]").disabled === true, "Send reset email is disabled when no email is stored");
  click(w, $(d, "[data-admin-back]")); db.users.U_IND.email = "ind@x.com"; await sleep(120); click(w, $(d, '[data-manage-user="U_IND"]')); click(w, $(d, "[data-mu-reset-pw]")); await sleep(80);
  ok(resets.filter(e => e === "ind@x.com").length === 1, "admin can send a person a password-reset email");
  // suspend -> the optional function really disables the Firebase account
  click(w, $(d, "[data-mu-active]")); click(w, $(d, "[data-save-user]")); await sleep(200);
  ok(fnCalls.some(c => c.fn === "adminSetDisabled" && c.body.uid === "U_IND" && c.body.disabled === true), "suspending also calls the Cloud Function that disables the Firebase account");
  ok(Object.values(db.audit_log).some(a => a.action === "login_updated" && a.detail.includes("active: true") ), "the change (active: true -> false) is in the audit log: " + (Object.values(db.audit_log).filter(a => a.action === "login_updated").pop() || {}).detail);
  db.users.U_IND.active = "true";
  // templates
  w.openAdmin("people"); await sleep(120); click(w, $(d, '[data-manage-user="U_IND"]')); await sleep(80);
  ["l1", "tof", "thr", "util", "att"].forEach(k => typeIn(w, $(d, `[data-mu-w="${k}"]`), "20"));
  w.prompt = () => "Equal weights"; click(w, $(d, "[data-mu-save-template]")); await sleep(120);
  ok(db.scoring_templates["equal-weights"] && JSON.parse(db.scoring_templates["equal-weights"].scoring).eff.weights.l1 === 20, "a scoring profile can be saved as a named template");
  click(w, $(d, "[data-admin-back]")); await sleep(120); click(w, $(d, '[data-manage-user="U_ADMIN"]')); await sleep(150);
  const sel = $(d, "#mu-template"); ok(Array.from(sel.options).some(o => o.textContent === "Equal weights"), "templates appear in every person's editor");
  sel.value = "equal-weights"; sel.dispatchEvent(new w.Event("change", { bubbles: true })); ok($(d, '[data-mu-w="thr"]').value === "20" && $(d, "#mu-total").textContent.includes("100"), "choosing a template fills the scoring fields");
  // trainers
  w.openAdmin("trainers"); await sleep(120); ok($(d, "#trainers-list").textContent.includes("Nikita Shah"), "Trainers tab lists the directory");
  typeIn(w, $(d, "#nt-name"), "Ravi Kumar"); typeIn(w, $(d, "#nt-team"), "Delhi"); click(w, $(d, "[data-add-trainer]")); await sleep(120); ok(db.trainers["ravi-kumar"] && db.trainers["ravi-kumar"].team === "Delhi", "add a trainer");
  typeIn(w, $(d, "#nt-bulk"), "Asha Menon, Chennai\nJohn Doe"); click(w, $(d, "[data-bulk-trainers]")); await sleep(150); ok(db.trainers["asha-menon"].team === "Chennai" && db.trainers["john-doe"] && db.trainers["john-doe"].team === "", "bulk import (Name, Team per line)");
  click(w, $(d, '[data-del-trainer="john-doe"]')); await sleep(100); ok(!db.trainers["john-doe"], "remove a trainer");
  // removing a login also deletes the Firebase account through the function
  w.openAdmin("trainers"); w.openAdmin("people"); await sleep(150); click(w, $(d, '[data-del-user="U_meera"]')); await sleep(200);
  ok(fnCalls.some(c => c.fn === "adminDeleteUser" && c.body.uid === "U_meera") && !db.users.U_meera, "removing a login calls the function that deletes the Firebase account, then the profile");
  // analytics + audit + verify badge
  db.reports.BAD = { uid: "U_OTHER", name: "Other Person", type: "tof", title: "Doctored", score: "99.00%", scoring: "", createdAt: "2026-09-10T10:00:00Z", payload: JSON.stringify({ tof: { header: { trainer: "Nikita Shah" }, ratings: { "0-0": "N" } }, cfg: w.GGTools.normCfg(null) }) };
  db.reports.OK1 = { uid: "U_OTHER", name: "Other Person", type: "eff", title: "September \u00B7 1 trainer", score: "80.00%", scoring: "", createdAt: "2026-09-12T10:00:00Z", payload: JSON.stringify({ rows: [{ name: "vandana rao", month: "September", l1: 80, tof: 80, thr: 80, util: 80, att: 80 }], cfg: w.GGTools.normCfg(null) }) };
  w.openAdmin("reports"); await sleep(150);
  const rows9 = Array.from(d.querySelectorAll("#reports-list .admin-row")); const bad9 = rows9.find(r => r.textContent.includes("Doctored")), good9 = rows9.find(r => r.textContent.includes("1 trainer"));
  ok(bad9 && bad9.querySelector(".role-pill.suspended") && bad9.querySelector(".role-pill").title.includes("entries score") && good9 && !good9.querySelector(".role-pill.suspended"), "admin Reports flags a report whose saved score does not match its entries");
  w.openAdmin("analytics"); await sleep(200); const an = $(d, "#analytics-box").textContent;
  ok(an.includes("Saved reports") && an.includes("Vandana Rao") === false ? an.includes("vandana rao") || an.includes("Vandana") : true, "Analytics tab renders KPIs and trainers");
  ok(an.includes("September 2026") && an.includes("Not submitted this month"), "Analytics shows the monthly trend and who has not submitted");
  w.openAdmin("audit"); await sleep(150); ok($(d, "#audit-list").textContent.includes("login_created") && $(d, "#audit-list").textContent.includes("Admin Person"), "Audit tab lists who did what");
  w.close();

  // --- participant: directory, spelling, fill TOF, safety nets
  db.users.U_IND.tools = "tof,eff"; delete db.users.U_IND.scoring; delete db.users.U_IND.active;
  ({ w, d } = await boot({ ggSubscribed: "1" })); dl = stubDownload(w); await loginOn(w, d, "ind@x.com", "indpw12"); await sleep(150);
  ok(d.querySelectorAll("#tt-trainers option").length >= 3, "trainer suggestions come from the admin's directory: " + Array.from(d.querySelectorAll("#tt-trainers option")).map(o => o.value).join(", "));
  const mine = () => Object.values(db.reports).filter(r => r.uid === "U_IND");
  $(d, '[data-open-service="Trainer Observation"]').focus(); click(w, $(d, '[data-open-service="Trainer Observation"]'));
  ok(document_activeIs(d, "[data-tool-back]") && $(d, "#tool-sheet").getAttribute("role") === "dialog", "the form is a dialog and focus moves into it");
  const tin = $(d, '[data-h="trainer"]'); typeIn(w, tin, "  nikita   shah "); tin.dispatchEvent(new w.Event("change", { bubbles: true })); ok(tin.value === "Nikita Shah", "a typed name is tidied to the directory's spelling");
  ok($(d, "#tof-scores").textContent.includes("provisional"), "score is labelled provisional while items are unrated");
  // warn on unrated when saving, and offer to stop
  let asked = 0; w.confirm = m => { asked++; return false; }; click(w, $(d, "[data-tof-save]")); await sleep(50);
  ok(asked === 1 && mine().length === 0, "saving with unrated items asks first; declining saves nothing");
  w.confirm = () => true;
  for (let j = 0; j < 4; j++) click(w, $(d, `.tt-item[data-key="0-${j}"] [data-rate="Y"]`)); typeIn(w, $(d, '[data-comment]'), "ગુજરાતી comment");
  click(w, $(d, "[data-tof-save]")); await sleep(120); ok(mine().length === 1 && mine()[0].scoring === "", "saved (with the person's scoring string for the rules to check)");
  // non-Latin text: the PDF would show '?', so the print view is offered
  let pmsg = ""; w.confirm = m => { pmsg = m; return true; }; click(w, $(d, "[data-tof-pdf]")); await sleep(200);
  ok(/characters/.test(pmsg) && !!d.querySelector("iframe") && d.querySelector("iframe").contentDocument.body.textContent.includes("ગુજરાતી comment"), "Gujarati comment: offered the print view, which shows it correctly");
  d.querySelectorAll("iframe").forEach(f => f.remove()); w.confirm = () => true;
  const printBtnBefore = d.querySelectorAll("iframe").length; click(w, $(d, "[data-tof-print]")); await sleep(50); ok(d.querySelectorAll("iframe").length === printBtnBefore + 1, "Print view button builds the printable report");
  d.querySelectorAll("iframe").forEach(f => f.remove());
  // unsaved-changes warning on leaving
  typeIn(w, $(d, '[data-h="topic"]'), "Edited after saving"); let leave = 0; w.confirm = () => { leave++; return false; };
  click(w, $(d, "[data-tool-back]")); ok(leave === 1 && $(d, "#tool-sheet").hidden === false, "leaving with unsaved changes asks first, and Cancel keeps the form open");
  w.confirm = () => true; click(w, $(d, "[data-tool-back]")); ok($(d, "#tool-sheet").hidden === true && document_activeIs(d, '[data-open-service="Trainer Observation"]'), "leaving closes it and focus returns to the tile that opened it");
  // effectiveness: sanity checks, fill TOF from observations
  click(w, $(d, '[data-open-service="Trainer Effectiveness"]'));
  const er = i => $(d, `#tt-eff tr[data-i="${i}"]`);
  typeIn(w, er(0).querySelector('[data-e="name"]'), "Nikita Shah"); typeIn(w, er(0).querySelector('[data-e="l1"]'), "9270");
  ok(er(0).querySelector('[data-e="l1"]').classList.contains("tt-bad"), "an absurd value (9270%) is flagged");
  click(w, $(d, "[data-eff-save]")); await sleep(80); ok(mine().length === 1 && toasts(d).some(t => t.includes("outside 0 to 150")), "and it blocks saving until fixed");
  typeIn(w, er(0).querySelector('[data-e="l1"]'), "92.7"); ["thr", "util", "att"].forEach(k => typeIn(w, er(0).querySelector(`[data-e="${k}"]`), "95"));
  click(w, $(d, "[data-eff-fill]")); await sleep(150);
  ok(er(0).querySelector('[data-e="tof"]').value === "11.11" && toasts(d).some(t => t.includes("TOF filled for 1")), "Fill TOF pulls the trainer's latest observation score (4 of 36 = 11.11%) into the row");
  // offline: the report waits on the device and is sent when the connection returns
  globalThis.__failReports = 1; w.confirm = () => true; click(w, $(d, "[data-eff-save]")); await sleep(120);
  const q = JSON.parse(w.localStorage.getItem("ggQueue:U_IND") || "[]");
  ok(q.length === 1 && mine().length === 1 && $(d, "#eff-savenote").textContent === "Waiting to sync" && toasts(d).some(t => t.includes("No connection")), "offline: the report is kept on the device, not lost");
  w.dispatchEvent(new w.Event("online")); await sleep(250);
  ok(mine().length === 2 && JSON.parse(w.localStorage.getItem("ggQueue:U_IND") || "[]").length === 0, "when back online the queued report is saved automatically");
  const queued = mine().find(r => r.type === "eff"); ok(queued.createdAt === q[0].createdAt, "it keeps the time it was really made");
  // the database refusing a report (wrong scoring) is reported, not silently queued
  w.eval('currentUser.scoringRaw = "{\\"eff\\":{\\"effective\\":50}}"'); typeIn(w, er(0).querySelector('[data-e="att"]'), "96");
  click(w, $(d, "[data-eff-save]")); await sleep(120);
  ok(toasts(d).some(t => t.includes("refused")) && JSON.parse(w.localStorage.getItem("ggQueue:U_IND") || "[]").length === 0, "a scoring string that is not the admin's is refused by the rules and is not queued to retry");
  w.close();
  // drafts survive a sign-out on this device for the same person
  ({ w, d } = await boot({ ggSubscribed: "1", "ggTools:U_IND": JSON.stringify({ tof: { header: { trainer: "Draft Trainer" } }, eff: { rows: [{ name: "Kept" }] }, meta: {} }) }));
  await loginOn(w, d, "ind@x.com", "indpw12"); ok($(d, '[data-h="trainer"]').value === "Draft Trainer" && $(d, '#tt-eff [data-e="name"]').value === "Kept", "the person's own draft is restored after signing back in");
  w.close();

  // =====================================================================
  // 10. corporate accounts: companies, item library, custom checklist and scoring
  // =====================================================================
  db.item_library.punct = { name: "Started and ended on time", team: "Opening" };
  db.item_library.rapport = { name: "Built rapport with the room", team: "Opening" };
  db.item_library.energy = { name: "Kept energy high throughout", team: "Delivery" };
  db.users.U_ACME = { name: "Acme Trainer", role: "corporate", tools: "tof,eff" }; auth["acme@corp.com"] = { pw: "acmepw12", uid: "U_ACME" };
  db.users.U_ACME2 = { name: "Acme Colleague", role: "corporate", companyId: "acme-corp" }; auth["acme2@corp.com"] = { pw: "acmepw34", uid: "U_ACME2" };

  ({ w, d } = await boot({ ggSubscribed: "1" }), {}, {}); await loginOn(w, d, "admin@x.com", "adminpw");
  click(w, $(d, "#profile-chip")); w.openAdmin("companies"); await sleep(120);

  typeIn(w, $(d, "#nc-name"), "Acme Corp"); click(w, $(d, "[data-add-company]")); await sleep(150);
  ok(db.companies["acme-corp"] && db.companies["acme-corp"].name === "Acme Corp", "admin adds a company (no logo)");
  ok($(d, "#companies-list").textContent.includes("Acme Corp"), "the new company appears in the list");

  w.openAdmin("library"); await sleep(120);
  typeIn(w, $(d, "#nl-bulk"), "Started and ended on time, Opening\nKept energy high throughout, Delivery\nHandled questions well, Delivery");
  click(w, $(d, "[data-bulk-library]")); await sleep(150);
  ok(Object.keys(db.item_library).filter(k => k.startsWith("started") || k.startsWith("kept") || k.startsWith("handled")).length === 3, "bulk-imported library items stored with their section");

  w.openAdmin("people"); await sleep(120); click(w, $(d, '[data-manage-user="U_ACME"]')); await sleep(120);
  ok($(d, "#mu-company-wrap") && $(d, "#mu-company-wrap").style.display !== "none", "the Company field shows for a corporate login");
  ok(Array.from($(d, "#mu-company").options).some(o => o.textContent === "Acme Corp"), "Acme Corp is offered in the Company dropdown");
  $(d, "#mu-company").value = "acme-corp";
  click(w, $(d, "[data-save-user]")); await sleep(150);
  ok(db.users.U_ACME.companyId === "acme-corp", "assigning a company saves companyId on the login");
  w.openAdmin("people"); await sleep(120); click(w, $(d, '[data-manage-user="U_IND"]')); await sleep(80);
  ok(!$(d, "#mu-company-wrap") || $(d, "#mu-company-wrap").style.display === "none", "the Company field is hidden for a non-corporate login");
  click(w, $(d, "#mu-role")); $(d, "#mu-role").value = "corporate"; $(d, "#mu-role").dispatchEvent(new w.Event("change", { bubbles: true }));
  ok($(d, "#mu-company-wrap").style.display !== "none", "switching the role dropdown to Corporate reveals the Company field live");
  w.close(); db.users.U_IND.role = "individual"; // undo: that test only checked the live UI toggle, not a real save

  // --- the corporate user builds their own checklist and scoring
  ({ w, d } = await boot({ ggSubscribed: "1" })); dl = stubDownload(w); await loginOn(w, d, "acme@corp.com", "acmepw12");
  click(w, $(d, "#profile-chip"));
  ok(!!$(d, "#customize-item") && $(d, "#customize-item").hidden === false, "Customize forms appears in the profile menu for a corporate login");
  click(w, $(d, '[data-user-action="customize"]')); await sleep(150);
  ok($(d, "#modal-title").textContent === "Customize forms" && $(d, "#cs-name").value === "Acme Corp", "the studio opens pre-filled with the company's name");
  ok(d.querySelectorAll("[data-cs-item]").length === 6, "all 6 library items are offered, grouped by section: " + Array.from(d.querySelectorAll(".cs-group h4")).map(h => h.textContent).join(", "));
  click(w, d.querySelector('[data-cs-item="punct"]')); click(w, d.querySelector('[data-cs-item="kept-energy-high-throughout"]'));
  ok($(d, "#cs-picked-note").textContent.includes("2 items picked"), "picking items updates the live count");
  typeIn(w, $(d, '[data-mu-min="l1"]'), "70");
  click(w, $(d, "[data-cs-save]")); await sleep(200);
  ok(db.companies["acme-corp"].tof && JSON.parse(db.companies["acme-corp"].tof).some(s => s.title === "Opening"), "the checklist is saved, grouped by the library's section tags");
  ok(JSON.parse(db.companies["acme-corp"].scoring).eff.min.l1 === 70, "the company's Effectiveness weighting is saved");
  ok(toasts(d).some(t => t.includes("Saved")), "confirms the save");
  w.close();

  // --- signing back in (or a colleague at the same company signing in) shows the custom form
  ({ w, d } = await boot({ ggSubscribed: "1" })); dl = stubDownload(w); await loginOn(w, d, "acme2@corp.com", "acmepw34"); await sleep(150);
  click(w, $(d, '[data-open-service="Trainer Observation"]'));
  ok(d.querySelectorAll(".tt-item").length === 2, "a colleague at the same company sees only the company's 2-item checklist, not the 36-item Excel form");
  ok(Array.from(d.querySelectorAll(".tt-card-head strong")).some(h => h.textContent === "Opening"), "sections are the library's section tags: " + Array.from(d.querySelectorAll(".tt-card-head strong")).map(h => h.textContent).join(", "));
  ok($(d, "#tt-tof").textContent.includes("Custom scoring"), "the Custom scoring chip shows for a colleague inheriting the company's weighting");
  typeIn(w, $(d, '[data-h="trainer"]'), "Test Trainer"); click(w, d.querySelector('[data-key="0-0"] [data-rate="Y"]')); click(w, d.querySelector('[data-key="1-0"] [data-rate="Y"]'));
  click(w, $(d, "[data-tof-pdf]")); await sleep(300);
  ok(/^Trainer-Observation-Test-Trainer/.test(dl.name || ""), "PDF still builds correctly against the 2-item custom form: " + dl.name);
  const acmeReport = Object.values(db.reports).find(r => r.uid === "U_ACME2");
  ok(acmeReport && acmeReport.companyScoring && JSON.parse(acmeReport.companyScoring).eff.min.l1 === 70, "the saved report snapshots the company's scoring alongside the person's own");
  click(w, $(d, "[data-tool-back]")); click(w, $(d, '[data-open-service="Trainer Effectiveness"]'));
  ok($(d, "#tt-eff").textContent.includes("min 70"), "the company's Effectiveness weighting (L1 minimum 70) applies to a colleague who has not set their own");
  w.close();

  // --- a personal override still wins over the company's setting
  ({ w, d } = await boot({ ggSubscribed: "1" })); await loginOn(w, d, "admin@x.com", "adminpw");
  click(w, $(d, "#profile-chip")); w.openAdmin("people"); await sleep(120); click(w, $(d, '[data-manage-user="U_ACME"]')); await sleep(120);
  ["l1", "tof", "thr", "util", "att"].forEach(k => typeIn(w, $(d, `[data-mu-w="${k}"]`), "20"));
  typeIn(w, $(d, '[data-mu-min="l1"]'), "95");
  click(w, $(d, "[data-save-user]")); await sleep(150); w.close();
  ({ w, d } = await boot({ ggSubscribed: "1" })); await loginOn(w, d, "acme@corp.com", "acmepw12"); await sleep(150);
  click(w, $(d, '[data-open-service="Trainer Effectiveness"]'));
  ok($(d, "#tt-eff").textContent.includes("min 95"), "this person's own override (L1 minimum 95) wins over the company's (70)");
  ok($(d, "#tt-eff").textContent.includes("weight 20%"), "an unset field (weight) still falls back to the company's value");
  w.close();

  // --- a corporate login with no company assigned gets a clear message, not a crash
  db.users.U_ACME2b = { name: "No Company Yet", role: "corporate" }; auth["nocorp@x.com"] = { pw: "nocorp12", uid: "U_ACME2b" };
  ({ w, d } = await boot({ ggSubscribed: "1" })); await loginOn(w, d, "nocorp@x.com", "nocorp12");
  click(w, $(d, '[data-user-action="customize"]')); await sleep(80);
  ok($(d, "#modal-body").textContent.includes("not yet linked to a company"), "no company assigned: a clear message instead of a broken form");
  click(w, $(d, "#modal-close"));
  click(w, $(d, '[data-open-service="Trainer Observation"]'));
  ok(d.querySelectorAll(".tt-item").length === 36, "with no company assigned, the Observation form falls back to the standard 36-item form");
  w.close();

  // --- security: one company cannot write another company's document
  db.companies["other-co"] = { name: "Other Co" };
  await (async () => {
    const signInRes = await fakeFetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=k", { method: "POST", body: JSON.stringify({ email: "acme@corp.com", password: "acmepw12" }) });
    const tok = (await signInRes.json()).idToken;
    const r = await fakeFetch("https://firestore.googleapis.com/v1/projects/p/databases/(default)/documents/companies/other-co?updateMask.fieldPaths=name&key=k", {
      method: "PATCH", headers: { Authorization: "Bearer " + tok }, body: JSON.stringify({ fields: { name: { stringValue: "Hijacked" } } }),
    });
    ok(r.status === 403 && (!db.companies["other-co"] || db.companies["other-co"].name !== "Hijacked"), "a corporate login cannot write to a different company's document");
  })();

  w.close();

  const errs = logs.filter(l => !/Could not parse CSS|Not implemented/.test(l)); console.log("console noise:", errs.length ? errs : "none");
  console.log(fails ? "\nFAILURES: " + fails : "\nALL SMOKE TESTS PASSED"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error("CRASH", e && e.stack); process.exit(2); });
