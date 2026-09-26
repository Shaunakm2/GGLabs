/* =============================================================================
   GG Learning Labs — plain JavaScript version
   -----------------------------------------------------------------------------
   No build step, no framework, no terminal. Open index.html and it runs.

   WHERE TO EDIT WHAT
   1. CONTENT  — the lists just below (phases, news, memberships, services).
                 This is where all the words and prices live.
   2. LOOK     — assets/styles.css
   3. LAYOUT   — index.html
   ========================================================================== */


/* -----------------------------------------------------------------------------
   0. SUPABASE — optional shared storage
   -----------------------------------------------------------------------------
   With credentials in assets/supabase-config.js, admin edits are saved to the
   database and everyone sees them. Without, everything falls back to this
   browser's localStorage and the site behaves exactly as it did before.
   -------------------------------------------------------------------------- */

const SB = (window.GG_SUPABASE && window.GG_SUPABASE.url && window.GG_SUPABASE.anonKey)
  ? window.GG_SUPABASE
  : null;

const FB = (window.GG_FIREBASE && window.GG_FIREBASE.projectId && window.GG_FIREBASE.apiKey)
  ? window.GG_FIREBASE
  : null;

// Firebase wins if both are filled in.
const BACKEND = FB ? "firebase" : SB ? "supabase" : null;

// config key -> the localStorage key it mirrors
const SYNC_KEYS = {
  brand: "ggBrand",
  content: "ggContent",
  hero: "ggHero",
  phases: "ggPhases",
  services: "ggServices",
  plans: "ggPlans",
  posts: "ggNews",
  features: "ggFeatures",
};

let session = null; // { token, user } once an admin has signed in through Supabase

function sbHeaders(extra) {
  const h = Object.assign(
    { apikey: SB.anonKey, Authorization: "Bearer " + (session ? session.token : SB.anonKey) },
    extra || {}
  );
  return h;
}

async function sbLoadConfig() {
  if (!SB) return null;
  try {
    const res = await fetch(SB.url + "/rest/v1/site_config?select=key,value", { headers: sbHeaders() });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const rows = await res.json();
    const out = {};
    rows.forEach(function (r) { out[r.key] = r.value; });
    return out;
  } catch (e) {
    console.warn("Supabase read failed, using local data:", e.message);
    return null;
  }
}

async function sbSaveConfig(key, value) {
  if (!SB || !session) return false;
  try {
    const res = await fetch(SB.url + "/rest/v1/site_config", {
      method: "POST",
      headers: sbHeaders({ "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify({ key: key, value: value }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return true;
  } catch (e) {
    console.warn("Supabase write failed:", e.message);
    return false;
  }
}

async function sbSignIn(email, password) {
  const res = await fetch(SB.url + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: SB.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, password: password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Sign-in failed");
  session = { token: data.access_token, user: data.user };
  return data.user;
}

async function sbSignUp(email, password, meta) {
  const res = await fetch(SB.url + "/auth/v1/signup", {
    method: "POST",
    headers: { apikey: SB.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, password: password, data: meta }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Could not create the login");
  return data;
}

/* --- Firebase (Firestore + Identity Toolkit, both over plain REST) --------- */

const FS = FB ? "https://firestore.googleapis.com/v1/projects/" + FB.projectId + "/databases/(default)/documents" : "";

async function fbLoadConfig() {
  try {
    const res = await fetch(FS + "/site_config?key=" + FB.apiKey);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const out = {};
    (data.documents || []).forEach(function (doc) {
      const id = doc.name.split("/").pop();
      const raw = doc.fields && doc.fields.value && doc.fields.value.stringValue;
      if (raw) {
        try { out[id] = JSON.parse(raw); } catch (e) {}
      }
    });
    return out;
  } catch (e) {
    console.warn("Firebase read failed, using local data:", e.message);
    return null;
  }
}

async function fbSaveConfig(key, value) {
  try {
    const token = await fbEnsureToken();
    const res = await fetch(FS + "/site_config/" + key + "?key=" + FB.apiKey, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ fields: { value: { stringValue: JSON.stringify(value) } } }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return true;
  } catch (e) {
    console.warn("Firebase write failed:", e.message);
    return false;
  }
}

async function fbSignIn(email, password) {
  const res = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + FB.apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error((data.error && data.error.message) || "Sign-in failed");
  session = {
    token: data.idToken, uid: data.localId, email: data.email, refresh: data.refreshToken,
    exp: Date.now() + Number(data.expiresIn || 3600) * 1000,
  };
  const profile = await fbReadProfile(data.localId, data.idToken);
  if (profile === null) { session = null; throw new Error("NO_PROFILE"); }
  if (profile.active === "false") { session = null; throw new Error("ACCESS_DISABLED"); }
  if (profile.companyId) profile._company = await fbReadCompany(profile.companyId, data.idToken);
  return { email: data.email, meta: profile };
}

// The company a corporate login belongs to: its name, logo and the scoring/form it has set up.
async function fbReadCompany(companyId, token) {
  try {
    const res = await fetch(FS + "/companies/" + companyId + "?key=" + FB.apiKey, { headers: { Authorization: "Bearer " + token } });
    if (!res.ok) return null;
    const doc = await res.json();
    const out = { id: companyId };
    Object.keys(doc.fields || {}).forEach(function (k) { out[k] = doc.fields[k].stringValue; });
    return out;
  } catch (e) { console.warn("Company read failed:", e.message); return null; }
}

// The person's name and role live in a users document keyed by their uid.
async function fbReadProfile(uid, token) {
  const profile = {};
  try {
    const pr = await fetch(FS + "/users/" + uid + "?key=" + FB.apiKey, {
      headers: { Authorization: "Bearer " + token },
    });
    if (pr.status === 404) return null; // no users document: this person has not been added
    if (pr.ok) {
      const doc = await pr.json();
      Object.keys(doc.fields || {}).forEach(function (k) {
        profile[k] = doc.fields[k].stringValue;
      });
    }
  } catch (e) {
    console.warn("Firebase profile read failed:", e.message);
  }
  return profile;
}

/* --- Keep the person signed in across page refreshes -----------------------
   Only Firebase's refresh token is stored. "Keep me signed in" ticked ->
   localStorage (survives closing the browser); unticked -> sessionStorage
   (survives a refresh, ends when the tab closes). -------------------------- */

const AUTH_KEY = "ggAuth";

function saveAuth(remember) {
  clearAuth();
  try {
    (remember ? localStorage : sessionStorage).setItem(
      AUTH_KEY,
      JSON.stringify({ refresh: session.refresh, email: session.email })
    );
  } catch (e) {}
}

function clearAuth() {
  try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
  try { sessionStorage.removeItem(AUTH_KEY); } catch (e) {}
}

async function fbRestore() {
  if (!FB) return null;
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY) || "null");
  } catch (e) {}
  if (!saved || !saved.refresh) return null;

  const res = await fetch("https://securetoken.googleapis.com/v1/token?key=" + FB.apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(saved.refresh),
  });
  const data = await res.json();
  if (!res.ok) {
    // A rejected token (revoked, user deleted) is dropped; a network error is not.
    if (res.status === 400) clearAuth();
    throw new Error((data.error && data.error.message) || "Session restore failed");
  }
  session = {
    token: data.id_token, uid: data.user_id, email: saved.email, refresh: data.refresh_token || saved.refresh,
    exp: Date.now() + Number(data.expires_in || 3600) * 1000,
  };
  const profile = await fbReadProfile(data.user_id, data.id_token);
  if (profile === null || profile.active === "false") { session = null; clearAuth(); return null; }
  if (profile.companyId) profile._company = await fbReadCompany(profile.companyId, data.id_token);
  return { email: saved.email, meta: profile };
}

// A valid token for the signed-in person; renews it when it is about to expire.
async function fbEnsureToken() {
  if (!session) throw new Error("Not signed in. Please sign in again.");
  if (session.exp && Date.now() < session.exp - 60000) return session.token;
  const res = await fetch("https://securetoken.googleapis.com/v1/token?key=" + FB.apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(session.refresh),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Your session expired. Please sign in again.");
  session.token = data.id_token;
  session.refresh = data.refresh_token || session.refresh;
  session.exp = Date.now() + Number(data.expires_in || 3600) * 1000;
  return session.token;
}

// Every document in a collection, as { id, fields } with string fields. Needs the right Firestore rules.
async function fbList(collection) {
  const token = await fbEnsureToken();
  const out = [];
  let pageToken = "";
  do {
    const res = await fetch(
      FS + "/" + collection + "?pageSize=300" + (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "") + "&key=" + FB.apiKey,
      { headers: { Authorization: "Bearer " + token } }
    );
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    (data.documents || []).forEach(function (doc) {
      const fields = {};
      Object.keys(doc.fields || {}).forEach(function (k) { fields[k] = doc.fields[k].stringValue; });
      out.push({ id: doc.name.split("/").pop(), fields: fields });
    });
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return out;
}

async function fbDelete(collection, id) {
  const token = await fbEnsureToken();
  const res = await fetch(FS + "/" + collection + "/" + id + "?key=" + FB.apiKey, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
}

// Change only the named fields of a login (name, title, role, active, tools, scoring).
async function fbUpdateUser(uid, fields) {
  const token = await fbEnsureToken();
  const keys = Object.keys(fields);
  const body = { fields: {} };
  keys.forEach(function (k) { body.fields[k] = { stringValue: String(fields[k]) }; });
  const mask = keys.map(function (k) { return "updateMask.fieldPaths=" + encodeURIComponent(k); }).join("&");
  const res = await fetch(FS + "/users/" + uid + "?" + mask + "&key=" + FB.apiKey, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
}

/* Reports: every saved Trainer Observation Form / Trainer Effectiveness result is a document in Firestore
   `reports`, tagged with the signed-in person's uid. `payload` is the JSON needed to rebuild the PDF. */
function reportFromDoc(doc) {
  const rec = { id: doc.name.split("/").pop() };
  Object.keys(doc.fields || {}).forEach(function (k) { rec[k] = doc.fields[k].stringValue; });
  return rec;
}

function newestFirst(a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")); }

async function fbSaveReport(rec) {
  if (!FB || !session) throw new Error("Not signed in");
  const token = await fbEnsureToken();
  const fields = {
    uid: session.uid,
    name: rec.name || "",
    email: session.email || "",
    type: rec.type,
    title: rec.title || "",
    score: rec.score || "",
    scoring: rec.scoring || "",
    companyScoring: rec.companyScoring || "",
    createdAt: rec.createdAt || new Date().toISOString(),
    payload: rec.payload,
  };
  const body = { fields: {} };
  Object.keys(fields).forEach(function (k) { body.fields[k] = { stringValue: String(fields[k]) }; });
  const res = await fetch(FS + "/reports?key=" + FB.apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return reportFromDoc(await res.json());
}

// The signed-in person's own reports (a filtered query, so the rules can let them read just these).
async function fbMyReports() {
  if (!FB || !session) throw new Error("Not signed in");
  const token = await fbEnsureToken();
  const res = await fetch(FS + ":runQuery?key=" + FB.apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: "reports" }],
      where: { fieldFilter: { field: { fieldPath: "uid" }, op: "EQUAL", value: { stringValue: session.uid } } },
      limit: 500,
    } }),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const rows = await res.json();
  return rows.filter(function (r) { return r.document; }).map(function (r) { return reportFromDoc(r.document); }).sort(newestFirst);
}

async function fbAllReports() {
  const token = await fbEnsureToken();
  const out = [];
  let pageToken = "";
  do {
    const res = await fetch(FS + "/reports?pageSize=300" + (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "") + "&key=" + FB.apiKey,
      { headers: { Authorization: "Bearer " + token } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    (data.documents || []).forEach(function (d) { out.push(reportFromDoc(d)); });
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return out.sort(newestFirst);
}

/* ---- Helpers for the admin console ------------------------------------------ */

// A random password nobody has to know: the person sets their own through the reset email.
function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const a = new Uint32Array(16);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return Array.from(a, function (n) { return chars[n % chars.length]; }).join("");
}

// Firebase emails the person a link to choose a new password.
async function fbSendReset(email) {
  const res = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=" + FB.apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestType: "PASSWORD_RESET", email: email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(function () { return {}; });
    throw new Error((data.error && data.error.message) || "HTTP " + res.status);
  }
}

// An append-only record of who did what (Firestore `audit_log`). Never blocks the action it describes.
function logAudit(action, target, detail) {
  if (!FB || !session) return;
  fbEnsureToken().then(function (token) {
    const f = {
      actor: session.uid,
      actorName: (typeof currentUser !== "undefined" && currentUser && currentUser.name) || session.email || "",
      action: action, target: String(target || ""), detail: String(detail || "").slice(0, 900),
      createdAt: new Date().toISOString(),
    };
    const body = { fields: {} };
    Object.keys(f).forEach(function (k) { body.fields[k] = { stringValue: f[k] }; });
    return fetch(FS + "/audit_log?key=" + FB.apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(body),
    });
  }).catch(function (e) { console.warn("Audit log write failed:", e.message); });
}
window.ggAudit = logAudit;

// Optional Cloud Functions (see functions/README in FIREBASE-SETUP.md) that can really disable or delete a
// Firebase Auth account. Off unless window.GG_FUNCTIONS.baseUrl is set in assets/backend-config.js.
const FN_BASE = String((window.GG_FUNCTIONS && window.GG_FUNCTIONS.baseUrl) || "").replace(/\/$/, "");
async function fbAdminFn(name, body) {
  if (!FN_BASE) return { skipped: true };
  const token = await fbEnsureToken();
  const res = await fetch(FN_BASE + "/" + name, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

// Companies: name, logo (a small data URI) and the form/scoring they have built (Firestore `companies`).
async function fbSaveCompany(id, fields) {
  const token = await fbEnsureToken();
  const keys = Object.keys(fields);
  const body = { fields: {} };
  keys.forEach(function (k) { body.fields[k] = { stringValue: String(fields[k]) }; });
  const mask = keys.map(function (k) { return "updateMask.fieldPaths=" + encodeURIComponent(k); }).join("&");
  const res = await fetch(FS + "/companies/" + id + "?" + mask + "&key=" + FB.apiKey, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
}

let companiesLoaded = false, companiesCache = [];
async function loadCompanyList() {
  try { companiesCache = (await fbList("companies")).sort(function (a, b) { return String(a.fields.name || "").localeCompare(String(b.fields.name || "")); }); }
  catch (e) { console.warn("Companies not loaded:", e.message); }
}

// The item library the super admin curates (Firestore `item_library`): the pool of Observation Form
// items a corporate account can pick from to build its own checklist.
let libraryLoaded = false;
async function loadItemLibrary() {
  try {
    const rows = await fbList("item_library");
    window.ggLibrary = rows.map(function (r) { return { id: r.id, label: r.fields.name || r.id, section: r.fields.team || "" }; })
      .sort(function (a, b) { return a.label.localeCompare(b.label); });
    if (window.ggLibraryReady) window.ggLibraryReady(window.ggLibrary);
  } catch (e) { console.warn("Item library not loaded:", e.message); }
}

/* Trainer directory: Firestore `trainers`. Everyone signed in reads it (name suggestions); admins edit it. */
function slugOf(name) { return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "trainer"; }

async function fbSaveTrainer(name, team) {
  const token = await fbEnsureToken();
  const res = await fetch(FS + "/trainers/" + slugOf(name) + "?key=" + FB.apiKey, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ fields: { name: { stringValue: name.trim() }, team: { stringValue: (team || "").trim() } } }),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
}

// The `item_library` collection reuses the same {name, team} shape as trainers, where `team` doubles
// as the section tag items are grouped under when a company builds its checklist.
async function fbSaveLibraryItem(label, section) {
  const token = await fbEnsureToken();
  const res = await fetch(FS + "/item_library/" + slugOf(label) + "?key=" + FB.apiKey, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ fields: { name: { stringValue: label.trim() }, team: { stringValue: (section || "").trim() } } }),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
}

// Shrinks and re-encodes an uploaded image so a company logo never bloats a saved document or a PDF.
function readLogoFile(file) {
  return new Promise(function (resolve, reject) {
    if (!file) { resolve(""); return; }
    if (!/^image\/(png|jpeg|jpg)$/.test(file.type)) { reject(new Error("Logos must be a PNG or JPEG file.")); return; }
    if (file.size > 4 * 1024 * 1024) { reject(new Error("That image is too large (max 4 MB).")); return; }
    const reader = new FileReader();
    reader.onerror = function () { reject(new Error("Could not read that file.")); };
    reader.onload = function () {
      const img = new Image();
      img.onerror = function () { reject(new Error("That does not look like a valid image.")); };
      img.onload = function () {
        const size = 160, canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.min(size / img.width, size / img.height, 1);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

let trainersLoaded = false;
async function loadTrainerDirectory() {
  try {
    const rows = await fbList("trainers");
    window.ggTrainers = rows.map(function (r) { return r.fields.name || r.id; }).sort(function (a, b) { return a.localeCompare(b); });
    if (window.ggSetTrainers) window.ggSetTrainers(window.ggTrainers);
  } catch (e) { console.warn("Trainer directory not loaded:", e.message); }
}

// Email sign-ups (pop-up and footer form) go to Firestore `subscribers`; the email is the document id, so repeats collapse.
const EMAIL_RE = /^[^\s@\/]+@[^\s@\/]+\.[^\s@\/]+$/;

// Removing an address: anyone who knows the exact address can remove it (same trust as an unsubscribe link).
async function unsubscribeEmail(raw) {
  const email = String(raw || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, reason: "invalid" };
  if (!FB) {
    try {
      const list = JSON.parse(localStorage.getItem("ggSubscribers") || "[]").filter(function (e) { return e !== email; });
      localStorage.setItem("ggSubscribers", JSON.stringify(list));
    } catch (e) {}
    return { ok: true, local: true };
  }
  try {
    const res = await fetch(FS + "/subscribers/" + encodeURIComponent(email) + "?key=" + FB.apiKey, { method: "DELETE" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return { ok: true };
  } catch (e) {
    console.warn("Unsubscribe failed:", e.message);
    return { ok: false, reason: "network" };
  }
}

async function subscribeEmail(raw, source) {
  const email = String(raw || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, reason: "invalid" };
  if (!FB) {
    try {
      const list = JSON.parse(localStorage.getItem("ggSubscribers") || "[]");
      if (list.indexOf(email) === -1) list.push(email);
      localStorage.setItem("ggSubscribers", JSON.stringify(list));
    } catch (e) {}
    return { ok: true, local: true };
  }
  try {
    const res = await fetch(FS + "/subscribers?documentId=" + encodeURIComponent(email) + "&key=" + FB.apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: {
        email: { stringValue: email },
        source: { stringValue: source || "site" },
        createdAt: { stringValue: new Date().toISOString() },
      } }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 409) return { ok: true, existing: true };
    throw new Error("HTTP " + res.status);
  } catch (e) {
    console.warn("Sign-up failed (check the Firestore rules for `subscribers`):", e.message);
    return { ok: false, reason: "network" };
  }
}

async function fbSignUp(email, password, meta) {
  const token = await fbEnsureToken();
  const res = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + FB.apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, password: password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(authErrorText((data.error && data.error.message) || "Could not create the login"));
  // Write their profile with the admin's own token, not the new user's.
  const pr = await fetch(FS + "/users/" + data.localId + "?key=" + FB.apiKey, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({
      fields: {
        name: { stringValue: meta.name },
        email: { stringValue: email },
        role: { stringValue: meta.role },
        title: { stringValue: meta.title || "" },
        active: { stringValue: "true" },
        tools: { stringValue: "tof,eff" },
        createdAt: { stringValue: new Date().toISOString() },
      },
    }),
  });
  if (!pr.ok) throw new Error("The login was created but its profile could not be saved (HTTP " + pr.status + "). Check the Firestore rules.");
  return data;
}

// With the optional Cloud Function set up, logins are created on the server (so public sign-up can be switched
// off in Firebase); otherwise the browser creates them through Firebase's sign-up endpoint.
async function createLogin(email, password, meta) {
  if (!FN_BASE) return backendSignUp(email, password, meta);
  try { return await fbAdminFn("adminCreateUser", { email: email, password: password, name: meta.name, role: meta.role, title: meta.title || "" }); }
  catch (e) { throw new Error(e.message === "HTTP 409" ? authErrorText("EMAIL_EXISTS") : "The server could not create the login (" + e.message + ")."); }
}

function authErrorText(msg) {
  msg = String(msg || "");
  if (msg.indexOf("EMAIL_EXISTS") === 0) return "That email already has a Firebase login. If it is not in the list above, delete it in Firebase Console \u2192 Authentication, then add it again.";
  if (msg.indexOf("WEAK_PASSWORD") === 0) return "Password must be at least 6 characters.";
  if (msg.indexOf("INVALID_EMAIL") === 0) return "That email address is not valid.";
  return msg;
}

/* --- One interface over whichever backend is configured -------------------- */

function backendLoad() {
  return BACKEND === "firebase" ? fbLoadConfig() : sbLoadConfig();
}

function backendSave(key, value) {
  return BACKEND === "firebase" ? fbSaveConfig(key, value) : sbSaveConfig(key, value);
}

async function backendSignIn(email, password) {
  return fbSignIn(email, password);
}

function backendSignUp(email, password, meta) {
  return fbSignUp(email, password, meta);
}

// Saves locally first so the screen never waits, then pushes to the database.
function persist(configKey, value) {
  writeStore(SYNC_KEYS[configKey], value);
  if (BACKEND && session) {
    backendSave(configKey, value).then(function (ok) {
      if (!ok) toast("Saved on this device, but the database rejected it.");
    });
  }
}

/* -----------------------------------------------------------------------------
   1. CONTENT
   -------------------------------------------------------------------------- */

const phases = [
  {
    number: "01",
    title: "Diagnose",
    note: "Start with the truth on the ground.",
    accent: "lime",
    icon: "compass",
    services: [
      "TNI — Training Needs Identification",
      "TNA — Training Needs Analysis",
      "Skills-gap mapping",
      "Learning maturity scan",
    ],
  },
  {
    number: "02",
    title: "Design",
    note: "Turn insight into something people can use.",
    accent: "lilac",
    icon: "feather",
    services: ["SOP builder", "Curriculum architecture", "Learning pathway design", "Content and experience blueprint"],
  },
  {
    number: "03",
    title: "Plan",
    note: "Make the next move visible.",
    accent: "coral",
    icon: "target",
    services: ["Capability roadmap", "Cohort and calendar planning", "Facilitator readiness plan", "Learning operations setup"],
  },
  {
    number: "04",
    title: "Deliver",
    note: "Bring the work to life, in the flow of work.",
    accent: "sky",
    icon: "zap",
    services: ["Personalized coaching", "Facilitator enablement", "Workshop and facilitation kits", "Blended learning delivery"],
  },
  {
    number: "05",
    title: "Assess",
    note: "Check for changed capability, not just attendance.",
    accent: "yellow",
    icon: "gauge",
    services: ["Knowledge and skill assessments", "Role-based simulations", "Readiness checks", "Certification journeys"],
  },
  {
    number: "06",
    title: "Coach",
    note: "Build the confidence to keep going.",
    accent: "peach",
    icon: "users",
    services: ["1:1 coaching", "Manager as coach", "Peer practice circles", "Feedback and reflection design"],
  },
  {
    number: "07",
    title: "Observe",
    note: "See what great looks like in practice.",
    accent: "aqua",
    icon: "eye",
    services: ["Trainer observation", "On-the-job observation", "Quality rubrics", "Calibration and feedback loops"],
  },
  {
    number: "08",
    title: "Measure",
    note: "Make the signal stronger than the spreadsheet.",
    accent: "lavender",
    icon: "flame",
    services: ["Learning analytics", "Impact dashboards", "Business-aligned metrics", "ROI and value narratives"],
  },
  {
    number: "09",
    title: "Improve",
    note: "Close the loop. Then raise the bar.",
    accent: "green",
    icon: "lightbulb",
    services: ["Program retrospectives", "Continuous improvement sprints", "Action planning", "L&D operating rhythm"],
  },
];

const news = [
  {
    source: "CompTIA Research",
    category: "Signal / 2026",
    title: "Building skills is now a top-tier business priority.",
    excerpt:
      "The latest Workforce and Learning Trends report points to productivity, retention, engagement, and credentials as the new L&D scorecard.",
    date: "6 min read",
    color: "lime",
    url: "https://www.comptia.org/en-us/resources/research/workforce-and-learning-trends-2026/",
  },
  {
    source: "ELM Learning",
    category: "Field notes / 2026",
    title: "From content delivery to capability building.",
    excerpt:
      "The strongest L&D teams are joining strategy, adaptive learning, flow-of-work support, coaching, and analytics into one connected system.",
    date: "8 min read",
    color: "lilac",
    url: "https://elmlearning.com/blog/hot-topics-in-training-and-development/",
  },
  {
    source: "McKinsey",
    category: "Perspective",
    title: "The L&D function gets closer to the business.",
    excerpt:
      "A useful reminder: learning works hardest when it is designed around the capabilities that move the organisation forward.",
    date: "7 min read",
    color: "coral",
    url: "https://www.mckinsey.com/capabilities/people-and-organization/our-insights/the-essential-components-of-a-successful-l-and-d-strategy",
  },
];

const memberships = {
  individual: [
    {
      name: "One Membership",
      eyebrow: "For the curious operator",
      price: "₹4,999",
      suffix: "/ month",
      copy: "A considered library of L&D tools, templates, clinics, and office hours.",
      featured: true,
      cta: "Start exploring",
      items: ["All phase playbooks", "Monthly live clinic", "Template vault", "Member-only notes"],
    },
    {
      name: "Build Your Own",
      eyebrow: "For a focused project",
      price: "From ₹1,499",
      suffix: " / service",
      copy: "Pick the exact intervention you need, from TNA to a trainer observation kit.",
      featured: false,
      cta: "Choose a service",
      items: ["Single service purchase", "Defined scope and output", "Practical handover", "Add-on coaching"],
    },
    {
      name: "Corporate",
      eyebrow: "For the whole L&D team",
      price: "Let's talk",
      suffix: "",
      copy: "A tailored operating system for teams who are done managing learning in spreadsheets.",
      featured: false,
      cta: "Contact us",
      items: ["Team enrollment", "Custom service mix", "Shared workspace rhythm", "Impact reporting"],
    },
  ],
  corporate: [
    {
      name: "One Membership",
      eyebrow: "For a complete team",
      price: "₹24,999",
      suffix: "/ month",
      copy: "The full GG Learning Labs system for a team that wants a shared language for L&D.",
      featured: true,
      cta: "Bring in your team",
      items: ["Unlimited team seats", "All phase playbooks", "Monthly team clinic", "Impact review prompts"],
    },
    {
      name: "Build Your Own",
      eyebrow: "For a defined business need",
      price: "From ₹39,999",
      suffix: " / project",
      copy: "Assemble a sharp, useful service mix around one capability or business priority.",
      featured: false,
      cta: "Build a scope",
      items: ["Choose your phases", "Dedicated project plan", "Custom outputs", "Progress review"],
    },
    {
      name: "Corporate",
      eyebrow: "For the bigger shift",
      price: "Let's talk",
      suffix: "",
      copy: "A bespoke partner for organisations building a mature, measurable L&D function.",
      featured: false,
      cta: "Contact us",
      items: ["Discovery workshop", "Team capability architecture", "Ongoing advisory", "Leadership reporting"],
    },
  ],
};

const services = [
  { phase: "Diagnose", phaseNumber: "01", title: "Training Needs Analysis", description: "A structured way to surface the gap between performance today and capability tomorrow.", type: "Toolkit", accent: "lime", icon: "compass", status: "Start here", featured: true },
  { phase: "Diagnose", phaseNumber: "01", title: "Training Needs Identification", description: "Turn the first signal of a need into a clear, scoped learning question.", type: "Playbook", accent: "lime", icon: "compass", status: "Ready" },
  { phase: "Design", phaseNumber: "02", title: "SOP Builder", description: "Build clear, usable standard operating procedures without starting from a blank page.", type: "Builder", accent: "lilac", icon: "feather", status: "Popular", featured: true },
  { phase: "Plan", phaseNumber: "03", title: "Capability Roadmap", description: "Connect priorities, cohorts, milestones, and owners in one visible rhythm.", type: "Planner", accent: "coral", icon: "target", status: "Ready" },
  { phase: "Deliver", phaseNumber: "04", title: "Personalized Coaching", description: "A focused coaching journey with prompts, practice, and reflection built in.", type: "Journey", accent: "sky", icon: "zap", status: "For you" },
  { phase: "Assess", phaseNumber: "05", title: "Readiness Check", description: "See where capability is landing before you call the learning complete.", type: "Assessment", accent: "yellow", icon: "gauge", status: "Ready" },
  { phase: "Coach", phaseNumber: "06", title: "Manager as Coach", description: "Small, repeatable conversations that make coaching part of the week.", type: "Practice", accent: "peach", icon: "users", status: "For teams" },
  { phase: "Observe", phaseNumber: "07", title: "Trainer Observation", description: "Replace subjective feedback with a thoughtful, calibrated observation rhythm.", type: "Rubric", accent: "aqua", icon: "eye", status: "For teams", featured: true, opens: "tof" },
  { phase: "Measure", phaseNumber: "08", title: "Trainer Effectiveness", description: "Blend L1, TOF, throughput, utilization and attendance into one weighted score and a clear rating.", type: "Scorecard", accent: "sky", icon: "gauge", status: "For teams", opens: "eff" },
  { phase: "Measure", phaseNumber: "08", title: "Impact Dashboard", description: "Make the signal stronger than the spreadsheet with business-aligned measures.", type: "Dashboard", accent: "lavender", icon: "flame", status: "For teams" },
  { phase: "Improve", phaseNumber: "09", title: "Program Retrospective", description: "Close the loop with a repeatable moment to notice, learn, and improve.", type: "Workshop", accent: "green", icon: "lightbulb", status: "Ready" },
];

// Which sections of the public site are switched on. The admin console edits this.
const defaultFeatures = {
  fieldNotes: true,
  membership: true,
  newsletter: true,
  genie: true,
  texture: true,
};

/* -----------------------------------------------------------------------------
   2. ICONS (Lucide, inlined so the site needs no internet connection)
   -------------------------------------------------------------------------- */

const ICONS = {
  "arrow-down-right":
    '<path d="m7 7 10 10" /><path d="M17 7v10H7" />',
  "arrow-left":
    '<path d="m12 19-7-7 7-7" /><path d="M19 12H5" />',
  "arrow-right":
    '<path d="M5 12h14" /><path d="m12 5 7 7-7 7" />',
  "arrow-up-right":
    '<path d="M7 7h10v10" /><path d="M7 17 17 7" />',
  "bell":
    '<path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />',
  "bell-off":
    '<path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M17 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 .258-1.742" /><path d="m2 2 20 20" /><path d="M8.668 3.01A6 6 0 0 1 18 8c0 2.687.77 4.653 1.707 6.05" />',
  "check":
    '<path d="M20 6 9 17l-5-5" />',
  "chevron-down":
    '<path d="m6 9 6 6 6-6" />',
  "compass":
    '<circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />',
  "eye":
    '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />',
  "eye-off":
    '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" />',
  "feather":
    '<path d="M14.086 18.412A2 2 0 0112.67 19H5v-7.672a2 2 0 01.586-1.414L11.75 3.75a6 6 0 118.49 8.49z" /><path d="M16 8 2 22" /><path d="M17.488 15H9" />',
  "flame":
    '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" />',
  "gauge":
    '<path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" />',
  "lightbulb":
    '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" />',
  "log-out":
    '<path d="m16 17 5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />',
  "mail":
    '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" />',
  "mail-check":
    '<path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><path d="m16 19 2 2 4-4" />',
  "menu":
    '<path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h16" />',
  "moon":
    '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />',
  "play":
    '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />',
  "search":
    '<path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />',
  "settings":
    '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" />',
  "shield":
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />',
  "sparkles":
    '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" />',
  "sun":
    '<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />',
  "target":
    '<circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />',
  "user":
    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />',
  "users":
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" />',
  "wand-sparkles":
    '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" /><path d="m14 7 3 3" /><path d="M5 6v4" /><path d="M19 14v4" /><path d="M10 2v2" /><path d="M7 8H3" /><path d="M21 16h-4" /><path d="M11 3H9" />',
  "x":
    '<path d="M18 6 6 18" /><path d="m6 6 12 12" />',
  "zap":
    '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z" />',
}

function ic(name, size, opts) {
  const o = opts || {};
  const cls = "lucide lucide-" + name + (o.cls ? " " + o.cls : "");
  return (
    '<svg class="' + cls + '" xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
    '" viewBox="0 0 24 24" fill="' + (o.fill || "none") +
    '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    (ICONS[name] || "") + "</svg>"
  );
}

// Swaps every <i data-i="icon-name" data-s="16"></i> placeholder for a real SVG.
function hydrateIcons(root) {
  const nodes = Array.from((root || document).querySelectorAll("i[data-i]"));
  nodes.forEach(function (node) {
    const html = ic(node.dataset.i, node.dataset.s || 16, { fill: node.dataset.fill, cls: node.dataset.cls });
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    node.replaceWith(tmp.firstChild);
  });
}

/* -----------------------------------------------------------------------------
   3. TOASTS
   -------------------------------------------------------------------------- */

const toasterEl = document.getElementById("gg-toaster");

function toast(message) {
  const li = document.createElement("li");
  li.className = "gg-toast";
  li.textContent = message;
  toasterEl.appendChild(li);
  while (toasterEl.children.length > 3) toasterEl.firstChild.remove();
  setTimeout(function () {
    li.classList.add("leaving");
    setTimeout(function () {
      li.remove();
    }, 220);
  }, 4000);
}

/* -----------------------------------------------------------------------------
   4. THEME (light / dark, remembered in the browser)
   -------------------------------------------------------------------------- */

let theme = (function () {
  try {
    return localStorage.getItem("theme") || "light";
  } catch (e) {
    return "light";
  }
})();

function applyTheme() {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {}
  Array.from(document.querySelectorAll("[data-theme-btn]")).forEach(function (btn) {
    btn.setAttribute("aria-label", "Switch to " + (theme === "light" ? "dark" : "light") + " theme");
    // The button shows the mode you are currently in: Day + sun in light, Night + moon in dark.
    btn.innerHTML = ic(theme === "light" ? "sun" : "moon", 16) + "<span>" + (theme === "light" ? "Day" : "Night") + "</span>";
  });
}

function toggleTheme() {
  theme = theme === "light" ? "dark" : "light";
  applyTheme();
}

/* -----------------------------------------------------------------------------
   5. VIEW SWITCHING (home / login / dashboard)
   -------------------------------------------------------------------------- */

const viewEls = {
  home: document.getElementById("view-home"),
  login: document.getElementById("view-login"),
  dashboard: document.getElementById("view-dashboard"),
};

function showView(name) {
  Object.keys(viewEls).forEach(function (key) {
    viewEls[key].classList.toggle("is-active", key === name);
  });
  if (name !== "home" && window.ggHideSignup) window.ggHideSignup();
  window.scrollTo({ top: 0 });
}

function scrollToId(id) {
  const target = document.getElementById(id);
  if (target) target.scrollIntoView({ behavior: "smooth" });
}

/* -----------------------------------------------------------------------------
   6. HOMEPAGE
   -------------------------------------------------------------------------- */

let audience = "individual";
let selectedPhase = null; // nothing is chosen until the visitor picks a node
let selectedService = "Pick a phase to explore";
let hoverPhase = null; // the row the mouse is over — previewed in the card without committing
let genieOpen = true; // the genie greets people when the page opens
let geniePhase = null; // what the visitor picked inside the popup — nothing by default
let newsletterSubmitted = false;

const timelineEl = document.getElementById("phase-timeline");
const nodesEl = document.getElementById("timeline-nodes");
const popEl = document.getElementById("timeline-pop");
const newsGridEl = document.getElementById("news-grid");
const membershipGridEl = document.getElementById("membership-grid");
const genieDockEl = document.getElementById("genie-dock");
const genieTriggerEl = document.getElementById("genie-trigger");

function renderTimeline() {
  nodesEl.innerHTML = phases
    .map(function (phase) {
      const active = selectedPhase && phase.number === selectedPhase.number ? " active" : "";
      return (
        '<button class="timeline-node' + active + '" data-phase="' + phase.number + '" role="tab" aria-selected="' + (active ? "true" : "false") + '">' +
        '<span class="node-number">' + phase.number + "</span>" +
        '<span class="node-dot ' + esc(phase.accent) + '">' + ic(phase.icon, 16) + "</span>" +
        '<span class="node-title">' + esc(phase.title) + "</span>" +
        "</button>"
      );
    })
    .join("");
}

// The popdown sits under whichever node the mouse is on, falling back to the
// selected one. It is repositioned rather than hidden, so the page never jumps.
function renderPhaseDetail() {
  const shown = hoverPhase || selectedPhase;
  if (!shown) {
    popEl.hidden = true;
    timelineEl.style.paddingBottom = "";
    return;
  }
  popEl.hidden = false;
  popEl.className = "timeline-pop " + String(shown.accent || "").replace(/[^a-z0-9_-]/gi, "");
  popEl.innerHTML =
    '<div class="pop-topline"><span>Phase ' + shown.number + "</span><span>Service map</span></div>" +
    '<div class="pop-head">' +
    '<span class="pop-icon">' + ic(shown.icon, 22) + "</span>" +
    "<div><h3>" + esc(shown.title) + "</h3><p>" + esc(shown.note) + "</p></div>" +
    "</div>" +
    '<div class="service-chips">' +
    shown.services
      .map(function (service) {
        return '<button class="' + (selectedService === service ? "chosen" : "") + '" data-service="' + esc(service) + '">' + esc(service) + "</button>";
      })
      .join("") +
    "</div>" +
    '<button class="detail-link" data-open-genie>Ask the genie about ' + esc(shown.title.toLowerCase()) + " " + ic("wand-sparkles", 16) + "</button>";
  positionPop(shown.number);
}

function positionPop(number) {
  const node = nodesEl.querySelector('[data-phase="' + number + '"]');
  if (!node || timelineEl.clientWidth === 0) return;
  const track = timelineEl.clientWidth;
  const popWidth = Math.min(440, track);
  const centre = node.offsetLeft + node.offsetWidth / 2;
  const left = Math.max(0, Math.min(centre - popWidth / 2, track - popWidth));
  popEl.style.setProperty("--pop-left", left + "px");
  popEl.style.setProperty("--pop-width", popWidth + "px");
  popEl.style.setProperty("--pop-arrow", centre - left + "px");
  timelineEl.style.paddingBottom = popEl.offsetHeight + 30 + "px";
}

function renderNews() {
  newsGridEl.innerHTML = newsPosts
    .map(function (item, index) {
      return (
        '<a class="news-card ' + esc(item.color) + '" href="' + esc(safeUrl(item.url)) + '" target="_blank" rel="noreferrer">' +
        '<div class="news-card-top"><span>' + String(index + 1).padStart(2, "0") + "</span>" + ic("arrow-up-right", 17) + "</div>" +
        '<div class="news-visual"><span class="news-orbit orbit-one"></span><span class="news-orbit orbit-two"></span><span class="news-orbit orbit-three"></span><span class="news-spark">✦</span></div>' +
        '<div class="news-meta">' + esc(item.category) + " <span>•</span> " + esc(item.date) + "</div>" +
        "<h3>" + esc(item.title) + "</h3>" +
        "<p>" + esc(item.excerpt) + "</p>" +
        '<div class="source-link">Read on ' + esc(item.source) + " " + ic("arrow-right", 15) + "</div>" +
        "</a>"
      );
    })
    .join("");
}

function renderMemberships() {
  membershipGridEl.innerHTML = memberships[audience]
    .map(function (plan) {
      return (
        '<article class="membership-card ' + (plan.featured ? "featured" : "") + '">' +
        (plan.featured ? '<div class="featured-ribbon">' + ic("sparkles", 13) + " Most useful place to start</div>" : "") +
        '<div class="card-eyebrow">' + esc(plan.eyebrow) + "</div>" +
        "<h3>" + esc(plan.name) + "</h3>" +
        '<div class="price-line"><strong>' + esc(plan.price) + "</strong><span>" + esc(plan.suffix) + "</span></div>" +
        "<p>" + esc(plan.copy) + "</p>" +
        "<ul>" + plan.items.map(function (item) { return "<li>" + ic("check", 15) + " " + esc(item) + "</li>"; }).join("") + "</ul>" +
        '<button class="membership-cta ' + (plan.featured ? "light" : "dark") + '" data-toast>' + esc(plan.cta) + " " + ic("arrow-up-right", 16) + "</button>" +
        "</article>"
      );
    })
    .join("");
  document.getElementById("audience-note").textContent =
    audience === "individual" ? "For practitioners building the practice." : "For teams building the capability.";
  Array.from(document.querySelectorAll("[data-audience]")).forEach(function (btn) {
    const on = btn.dataset.audience === audience;
    btn.classList.toggle("selected", on);
    btn.setAttribute("aria-selected", String(on));
  });
}

const genieStageEl = document.getElementById("genie-stage");
let genieStageShown = false;

function renderGenie() {
  const existing = genieDockEl.querySelector(".genie-panel");
  if (existing) existing.remove();
  genieDockEl.classList.toggle("open", genieOpen);
  genieTriggerEl.setAttribute("aria-expanded", String(genieOpen));

  // The genie rises out of the lamp on open and sinks back in on close.
  if (genieOpen && !genieStageShown) {
    genieStageShown = true;
    genieStageEl.classList.remove("leaving");
    genieStageEl.hidden = false;
  } else if (!genieOpen && genieStageShown) {
    genieStageShown = false;
    genieStageEl.classList.add("leaving");
    setTimeout(function () {
      if (!genieStageShown) {
        genieStageEl.hidden = true;
        genieStageEl.classList.remove("leaving");
      }
    }, 320);
  }

  if (!genieOpen) return;

  // Nothing is chosen for the visitor. The services and the suggestion only
  // appear once they pick a phase themselves.
  let middle;
  if (geniePhase) {
    const picked = geniePhase.services.indexOf(selectedService) !== -1;
    const answer = picked ? selectedService : geniePhase.services[0];
    middle =
      '<div class="service-chips">' +
      geniePhase.services
        .map(function (service) {
          return '<button class="' + (selectedService === service ? "chosen" : "") + '" data-service="' + esc(service) + '">' + esc(service) + "</button>";
        })
        .join("") +
      "</div>" +
      '<div class="genie-answer"><span>Your first wish</span><strong>' + answer + "</strong><p>" + geniePhase.note +
      (picked ? " Consider it granted \u2014 that is a strong next move." : " Pick a service above and I\u2019ll map the step after it.") + "</p></div>";
  } else {
    middle = '<div class="genie-hint">Name a phase and I\u2019ll conjure everything inside it \u2014 plus the smartest place to begin.</div>';
  }

  const panel = document.createElement("div");
  panel.className = "genie-panel";
  panel.innerHTML =
    '<div class="genie-panel-top"><div><span class="mini-kicker">Your wish, our workflow</span><h4>What are you ready to transform today?</h4></div><button data-close-genie aria-label="Close guide">' + ic("x", 16) + "</button></div>" +
    '<div class="genie-panel-scroll">' +
    '<label for="genie-phase">Where shall we begin?</label>' +
    '<div class="genie-select-wrap"><select id="genie-phase">' +
    '<option value=""' + (geniePhase ? "" : " selected") + ">Choose a phase\u2026</option>" +
    phases
      .map(function (phase) {
        return '<option value="' + esc(phase.number) + '"' + (geniePhase && phase.number === geniePhase.number ? " selected" : "") + ">" + esc(phase.number) + " — " + esc(phase.title) + "</option>";
      })
      .join("") +
    "</select>" + ic("chevron-down", 15) + "</div>" +
    middle +
    '<button class="genie-explore" data-genie-explore>Show me the whole map ' + ic("arrow-right", 15) + "</button>" +
    "</div>";

  genieDockEl.insertBefore(panel, genieStageEl);
}

function setPhase(phase) {
  hoverPhase = null;
  selectedPhase = phase;
  selectedService = "Pick a service";
  renderTimeline();
  renderPhaseDetail();
  if (genieOpen) renderGenie();
}

// --- Homepage events -------------------------------------------------------

nodesEl.addEventListener("mouseover", function (event) {
  const row = event.target.closest("[data-phase]");
  if (!row) return;
  const phase = phases.find(function (p) { return p.number === row.dataset.phase; });
  if (!phase || (hoverPhase && hoverPhase.number === phase.number)) return;
  hoverPhase = phase;
  renderPhaseDetail();
});

timelineEl.addEventListener("mouseleave", function () {
  if (!hoverPhase) return;
  hoverPhase = null;
  renderPhaseDetail();
});

nodesEl.addEventListener("focusin", function (event) {
  const row = event.target.closest("[data-phase]");
  if (!row) return;
  const phase = phases.find(function (p) { return p.number === row.dataset.phase; });
  if (!phase) return;
  hoverPhase = phase;
  renderPhaseDetail();
});

nodesEl.addEventListener("click", function (event) {
  const row = event.target.closest("[data-phase]");
  if (!row) return;
  const phase = phases.find(function (p) { return p.number === row.dataset.phase; });
  if (phase) setPhase(phase);
});

popEl.addEventListener("click", function (event) {
  const chip = event.target.closest("[data-service]");
  if (chip) {
    selectedService = chip.dataset.service;
    renderPhaseDetail();
    if (genieOpen) renderGenie();
    toast("Noted \u2014 " + selectedService + " is on your list.");
    return;
  }
  if (event.target.closest("[data-open-genie]")) {
    genieOpen = true;
    renderGenie();
  }
});

genieTriggerEl.addEventListener("click", function () {
  genieOpen = !genieOpen;
  renderGenie();
});

genieDockEl.addEventListener("click", function (event) {
  const chip = event.target.closest("[data-service]");
  if (chip) {
    selectedService = chip.dataset.service;
    renderPhaseDetail();
    renderGenie();
    toast(selectedService + " added to your exploration list.");
    return;
  }
  if (event.target.closest("[data-close-genie]")) {
    genieOpen = false;
    renderGenie();
  }
  if (event.target.closest("[data-genie-explore]")) {
    document.getElementById("home-nav").classList.remove("is-open");
    scrollToId("system");
    genieOpen = false;
    renderGenie();
  }
});

genieDockEl.addEventListener("change", function (event) {
  if (event.target.id !== "genie-phase") return;
  const next = phases.find(function (p) { return p.number === event.target.value; });
  if (!next) return;
  geniePhase = next;
  setPhase(next);
});

Array.from(document.querySelectorAll("[data-audience]")).forEach(function (btn) {
  btn.addEventListener("click", function () {
    audience = btn.dataset.audience;
    renderMemberships();
  });
});

document.getElementById("home-menu-btn").addEventListener("click", function () {
  const nav = document.getElementById("home-nav");
  const open = nav.classList.toggle("is-open");
  this.innerHTML = ic(open ? "x" : "menu", 20);
});

document.getElementById("newsletter-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const input = document.getElementById("newsletter-email");
  if (event.target.querySelector(".hp") && event.target.querySelector(".hp").value) { toast("You\u2019re on the list. Welcome to the lab notes."); return; } // bots fill the hidden field
  const r = await subscribeEmail(input.value, "footer");
  if (!r.ok) {
    toast(r.reason === "invalid"
      ? "Drop in a valid email so we know where to send the good stuff."
      : "Could not sign you up just now. Please try again.");
    return;
  }
  newsletterSubmitted = true;
  markSubscribed();
  input.value = "";
  document.getElementById("newsletter-note").textContent = "You\u2019re in. Watch your inbox.";
  toast(r.existing ? "You\u2019re already on the list." : "You\u2019re on the list. Welcome to the lab notes.");
});

/* Email sign-up pop-up: opens on the homepage. Gone for good once someone subscribes;
   if closed, it stays away for the rest of that browser tab's session. */
const signupVeil = document.getElementById("signup-veil");
let signupOpenedAt = 0;

function markSubscribed() {
  try { localStorage.setItem("ggSubscribed", "1"); } catch (e) {}
}

function signupSuppressed() {
  try { return localStorage.getItem("ggSubscribed") === "1" || sessionStorage.getItem("ggSignupSeen") === "1"; }
  catch (e) { return false; }
}

function openSignup() {
  if (currentUser || signupSuppressed() || (features && features.newsletter === false)) return;
  signupVeil.hidden = false;
  signupOpenedAt = Date.now();
  hydrateIcons(signupVeil);
  document.getElementById("signup-email").focus();
}

function closeSignup() {
  signupVeil.hidden = true;
  try { sessionStorage.setItem("ggSignupSeen", "1"); } catch (e) {}
}

window.ggHideSignup = function () { signupVeil.hidden = true; };

document.getElementById("signup-close").addEventListener("click", closeSignup);
document.getElementById("signup-skip").addEventListener("click", closeSignup);
signupVeil.addEventListener("click", function (event) { if (event.target === signupVeil) closeSignup(); });
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && !signupVeil.hidden) closeSignup();
});

document.getElementById("signup-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const input = document.getElementById("signup-email");
  const note = document.getElementById("signup-note");
  const btn = event.target.querySelector("button[type=submit]");
  // A person cannot type an address in a second; a filled hidden field is a bot. Both get a silent "thanks".
  if (event.target.querySelector(".hp").value || Date.now() - signupOpenedAt < 1200) { note.textContent = "You\u2019re in. Watch your inbox."; return; }
  btn.disabled = true;
  const r = await subscribeEmail(input.value, "popup");
  btn.disabled = false;
  if (!r.ok) {
    note.textContent = r.reason === "invalid" ? "That email does not look right." : "Could not sign you up just now. Please try again.";
    return;
  }
  markSubscribed();
  note.textContent = r.existing ? "You\u2019re already on the list." : "You\u2019re in. Watch your inbox.";
  toast(r.existing ? "You\u2019re already on the list." : "You\u2019re on the list. Welcome to the lab notes.");
  setTimeout(function () { signupVeil.hidden = true; }, 1400);
});


/* -----------------------------------------------------------------------------
   7. SIGN IN
   -------------------------------------------------------------------------- */

let brand = null;
let content = null;
let heroChoice = null;
let features = null;
let newsPosts = null;
let showPassword = false;
let currentUser = null;
let prefs = readStore("ggPrefs", { digest: true, productUpdates: false, defaultView: "All services" });

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? Object.assign({}, fallback, JSON.parse(raw)) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeStore(key, value, loud) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (loud) throw e;
  }
}

const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");

function renderPasswordToggle() {
  const btn = document.getElementById("toggle-password");
  passwordInput.type = showPassword ? "text" : "password";
  btn.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
  btn.innerHTML = ic(showPassword ? "eye-off" : "eye", 16);
}

document.getElementById("toggle-password").addEventListener("click", function () {
  showPassword = !showPassword;
  renderPasswordToggle();
});

document.getElementById("forgot-password").addEventListener("click", async function () {
  const typed = emailInput.value.trim();
  if (!FB) { toast("Sign-in is not configured."); return; }
  if (typed.indexOf("@") === -1) { toast("Enter your email address first."); return; }
  try {
    const res = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=" + FB.apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "PASSWORD_RESET", email: typed }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data.error && data.error.message) || "Request failed");
    toast("If that email has an account, a reset link is on its way.");
  } catch (e) {
    console.warn("Password reset failed:", e.message);
    toast("Could not send the reset email. Try again in a moment.");
  }
});

function parseJson(text) {
  try { const v = JSON.parse(text); return v && typeof v === "object" ? v : null; } catch (e) { return null; }
}

// Which trainer tools a login may open. A profile with no `tools` field (older logins) gets both.
function parseTools(text) {
  return text === undefined || text === null ? ["tof", "eff"] : String(text).split(",").filter(Boolean);
}

function userFromAccount(account) {
  const meta = account.meta || {};
  const co = meta._company || null;
  const company = co ? { id: co.id, name: co.name || "", logo: co.logo || "", scoringRaw: co.scoring || "", tofPicks: parseJson(co.tof) } : null;
  return {
    uid: session ? session.uid : "",
    name: meta.name || account.email.split("@")[0],
    email: account.email,
    role: meta.role || "individual",
    title: meta.title || "",
    tools: parseTools(meta.tools),
    scoring: window.GGTools.layerCfg(company && parseJson(company.scoringRaw), parseJson(meta.scoring)),
    scoringRaw: meta.scoring || "",
    company: company,
  };
}

document.getElementById("login-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const typed = emailInput.value.trim();
  const pass = passwordInput.value;

  if (!FB) { toast("Sign-in is not configured. Add your Firebase keys in assets/backend-config.js."); return; }
  if (!typed || !pass) { toast("Enter your email and password."); return; }

  let account;
  try {
    account = await fbSignIn(typed, pass);
  } catch (e) {
    console.warn("Sign-in failed:", e.message);
    toast(e.message === "NO_PROFILE"
      ? "This login has not been set up yet. Ask an admin to add you."
      : e.message === "ACCESS_DISABLED"
      ? "This login has been suspended. Contact an admin."
      : e.message.indexOf("TOO_MANY_ATTEMPTS") === 0
        ? "Too many attempts. Try again later."
        : "That email and password were not accepted.");
    return;
  }

  currentUser = userFromAccount(account);
  saveAuth(document.getElementById("remember-me").checked);
  renderDashboard();
  showView("dashboard");
  toast("Welcome back, " + currentUser.name.split(" ")[0] + ".");
});


/* -----------------------------------------------------------------------------
   8. WORKSPACE / DASHBOARD
   -------------------------------------------------------------------------- */

let activePhase = "All services";
let search = "";

const serviceGridEl = document.getElementById("service-grid");
const phaseFiltersEl = document.getElementById("phase-filters");
const dashboardEmptyEl = document.getElementById("dashboard-empty");

function renderDashboard() {
  if (!currentUser) return;
  if (window.ggToolsHello) window.ggToolsHello(currentUser);
  if (!trainersLoaded && FB && session) { trainersLoaded = true; loadTrainerDirectory(); }
  if (!libraryLoaded && FB && session && currentUser && currentUser.role === "corporate") { libraryLoaded = true; loadItemLibrary(); }
  document.getElementById("profile-avatar").textContent = currentUser.name
    .split(" ")
    .map(function (word) { return word[0]; })
    .join("");
  document.getElementById("profile-name").textContent = currentUser.name;
  document.getElementById("profile-avatar").textContent = initials(currentUser.name);
  document.getElementById("dash-kicker").textContent =
    currentUser.role === "admin"
      ? "Super admin console"
      : currentUser.role === "corporate"
      ? "Corporate L&D workspace"
      : "Individual practitioner workspace";
  document.getElementById("dash-firstname").textContent = currentUser.name.split(" ")[0] + ".";
  document.getElementById("dash-lede").textContent =
    currentUser.role === "admin"
      ? "You can change what the public site shows, who can sign in, and what the field notes say."
      : currentUser.role === "corporate"
      ? "Your team’s L&D system, laid out so the next useful move is never buried."
      : "Your L&D practice, laid out so the next useful move is never buried.";
  document.getElementById("service-count").textContent = services.length;
  renderPhaseFilters();
  renderServices();
}

function renderPhaseFilters() {
  const list = ["All services"].concat(
    services.map(function (s) { return s.phase; }).filter(function (v, i, arr) { return arr.indexOf(v) === i; })
  );
  phaseFiltersEl.innerHTML = list
    .map(function (phase) {
      return '<button class="' + (activePhase === phase ? "selected" : "") + '" data-filter="' + esc(phase) + '">' + esc(phase) + "</button>";
    })
    .join("");
}

// What a tile opens: "tof", "eff" or "" (Coming soon). Set per tile in Admin -> Tiles; tiles saved before
// that setting existed are recognised by their title.
function toolOf(service) {
  if (service && (service.opens === "tof" || service.opens === "eff")) return service.opens;
  if (service && service.opens === "") return "";
  const t = String((service && service.title) || "").toLowerCase();
  return t.indexOf("trainer observation") !== -1 ? "tof" : t.indexOf("trainer effectiveness") !== -1 ? "eff" : "";
}
function isLiveService(service) { return !!toolOf(service); }

function renderServices() {
  const term = search.toLowerCase();
  let visible = services.filter(function (service) {
    const matchesPhase = activePhase === "All services" || service.phase === activePhase;
    const haystack = (service.title + " " + service.description + " " + service.type).toLowerCase();
    return matchesPhase && haystack.includes(term);
  });

  // The two working tiles come first, then everything that is coming soon (original order kept within each group).
  visible = visible
    .filter(isLiveService)
    .concat(visible.filter(function (service) { return !isLiveService(service); }));

  serviceGridEl.innerHTML = visible
    .map(function (service) {
      const tool = toolOf(service), live = !!tool;
      return (
        '<article class="service-tile ' + esc(service.accent) + " " + (service.featured ? "featured" : "") + (live ? " is-live" : " coming-soon") + '">' +
        '<div class="service-tile-top"><span class="service-number">' + esc(service.phaseNumber) + '</span><span class="service-type">' + esc(service.type) + "</span></div>" +
        '<div class="service-visual"><span class="service-orbit"></span><span class="service-icon">' + ic(service.icon, 24) + '</span><span class="service-arrow">' + ic("arrow-up-right", 17) + "</span></div>" +
        '<div class="service-copy"><div class="service-phase">' + esc(service.phase) + " <span>•</span> " + (live ? esc(service.status) : "Coming soon") + "</div><h3>" + esc(service.title) + "</h3><p>" + esc(service.description) + "</p></div>" +
        '<button class="service-open" data-open-service="' + esc(service.title) + '" data-tool="' + tool + '"' + (live ? "" : ' aria-disabled="true"') + ">" +
        (live ? "Open service " + ic("arrow-right", 15) : "Coming soon") + "</button>" +
        "</article>"
      );
    })
    .join("");

  dashboardEmptyEl.hidden = visible.length !== 0;
}

// Used by the theory chips on the landing page: show one phase's services and scroll to them.
window.ggFilterPhase = function (phase) {
  const known = services.some(function (s) { return s.phase === phase; });
  activePhase = known ? phase : "All services";
  renderPhaseFilters();
  renderServices();
  const target = document.getElementById("services");
  if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
};

phaseFiltersEl.addEventListener("click", function (event) {
  const btn = event.target.closest("[data-filter]");
  if (!btn) return;
  activePhase = btn.dataset.filter;
  renderPhaseFilters();
  renderServices();
});

// The whole tile is the click target, not just its button.
serviceGridEl.addEventListener("click", function (event) {
  const tile = event.target.closest(".service-tile");
  const btn = tile && tile.querySelector("[data-open-service]");
  if (!btn) return;
  if (btn.dataset.tool && window.ggOpenToolKey) { window.ggOpenToolKey(btn.dataset.tool); return; }
  toast(btn.dataset.openService + " is coming soon.");
});

document.getElementById("service-search").addEventListener("input", function () {
  search = this.value;
  renderServices();
});

document.getElementById("reset-filters").addEventListener("click", function () {
  search = "";
  activePhase = "All services";
  document.getElementById("service-search").value = "";
  renderPhaseFilters();
  renderServices();
});

document.getElementById("explore-diagnose").addEventListener("click", function () {
  activePhase = "Diagnose";
  renderPhaseFilters();
  renderServices();
  scrollToId("services");
});

document.getElementById("dash-bell").addEventListener("click", function () {
  toast("No new notes. You’re all caught up.");
});

Array.from(document.querySelectorAll("[data-dash-top]")).forEach(function (el) {
  el.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
});

document.getElementById("dash-brand").addEventListener("click", function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("dash-menu-btn").addEventListener("click", function () {
  const nav = document.getElementById("dashboard-nav");
  const open = nav.classList.toggle("is-open");
  this.innerHTML = ic(open ? "x" : "menu", 20);
});


/* -----------------------------------------------------------------------------
   8b. PROFILE MENU, PROFILE EDITOR AND PREFERENCES
   -------------------------------------------------------------------------- */

const profileChip = document.getElementById("profile-chip");
const profileMenu = document.getElementById("profile-menu");
const veil = document.getElementById("modal-veil");
const modalBody = document.getElementById("modal-body");

// One place that ends a session: memory, the saved refresh token and any tool drafts.
function signOut() {
  currentUser = null;
  session = null;
  trainersLoaded = false;
  libraryLoaded = false;
  window.ggTrainers = [];
  clearAuth();
  if (window.ggResetTools) window.ggResetTools();
  showView("home");
}

function setMenuOpen(open) {
  profileMenu.hidden = !open;
  document.getElementById("admin-item").hidden = !(currentUser && currentUser.role === "admin");
  const custItem = document.getElementById("customize-item");
  if (custItem) custItem.hidden = !(currentUser && currentUser.role === "corporate");
  profileChip.setAttribute("aria-expanded", String(open));
  if (open && currentUser) {
    document.getElementById("menu-avatar").textContent = initials(currentUser.name);
    document.getElementById("menu-name").textContent = currentUser.name;
    document.getElementById("menu-email").textContent = currentUser.email;
    document.getElementById("menu-theme-label").textContent = theme === "light" ? "Switch to night" : "Switch to day";
  }
}

function initials(name) {
  return name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
}

profileChip.addEventListener("click", function (event) {
  event.stopPropagation();
  setMenuOpen(profileMenu.hidden);
});

document.addEventListener("click", function (event) {
  if (!profileMenu.hidden && !profileMenu.contains(event.target)) setMenuOpen(false);
});

document.addEventListener("keydown", function (event) {
  if (event.key !== "Escape") return;
  setMenuOpen(false);
  closeModal();
});

profileMenu.addEventListener("click", function (event) {
  const item = event.target.closest("[data-user-action]");
  if (!item) return;
  const action = item.dataset.userAction;
  setMenuOpen(false);
  if (action === "theme") { toggleTheme(); return; }
  if (action === "admin") { openAdmin("brand"); return; }
  if (action === "customize") { openCompanyStudio(); return; }
  if (action === "signout") {
    signOut();
    toast("Signed out. See you soon.");
    return;
  }
  openModal(action);
});

function openModal(mode) {
  if (!currentUser) return;
  document.querySelector(".modal").classList.remove("wide");
  document.getElementById("modal-eyebrow").textContent = mode === "profile" ? "Your details" : "How the lab behaves";
  document.getElementById("modal-title").textContent = mode === "profile" ? "Your profile" : "Preferences";
  modalBody.innerHTML = mode === "profile" ? profileForm() : prefsForm();
  modalBody.dataset.mode = mode;
  veil.hidden = false;
  hydrateIcons(modalBody);
  const first = modalBody.querySelector("input, select");
  if (first) first.focus();
}

function closeModal() {
  veil.hidden = true;
}

function profileForm() {
  return (
    '<div class="modal-identity"><span class="profile-avatar large">' + initials(currentUser.name) + "</span>" +
    "<p>Initials are taken from your name. Change the name and the badge follows.</p></div>" +
    '<label for="pf-name">Full name</label><input id="pf-name" value="' + currentUser.name + '" />' +
    '<label for="pf-email">Email address</label><input id="pf-email" type="email" value="' + currentUser.email + '" />' +
    '<label for="pf-title">Role title</label><input id="pf-title" value="' + (currentUser.title || "") + '" />' +
    '<label for="pf-account">Account type</label>' +
    '<div class="select-wrap"><select id="pf-account">' +
    '<option value="individual"' + (currentUser.role === "individual" ? " selected" : "") + ">Individual practitioner</option>" +
    '<option value="corporate"' + (currentUser.role === "corporate" ? " selected" : "") + ">Corporate L&D team</option>" +
    "</select>" + ic("chevron-down", 15) + "</div>" +
    '<div class="modal-actions"><button class="ghost-button" data-modal-cancel>Cancel</button>' +
    '<button class="auth-submit compact" data-modal-save>Save changes ' + ic("check", 15) + "</button></div>"
  );
}

function prefsForm() {
  const views = ["All services"].concat(phases.map(function (p) { return p.title; }));
  return (
    '<div class="pref-row"><div><strong>Appearance</strong><span>Day or night, remembered on this device.</span></div>' +
    '<div class="segmented" id="pref-theme">' +
    '<button data-theme-choice="light" class="' + (theme === "light" ? "selected" : "") + '">Day</button>' +
    '<button data-theme-choice="dark" class="' + (theme === "dark" ? "selected" : "") + '">Night</button></div></div>' +
    '<div class="pref-row"><div><strong>Weekly lab notes</strong><span>One considered email every few weeks.</span></div>' +
    '<button class="switch ' + (prefs.digest ? "on" : "") + '" data-pref="digest" role="switch" aria-checked="' + prefs.digest + '"><span></span></button></div>' +
    '<div class="pref-row"><div><strong>Product updates</strong><span>New services and phase playbooks as they land.</span></div>' +
    '<button class="switch ' + (prefs.productUpdates ? "on" : "") + '" data-pref="productUpdates" role="switch" aria-checked="' + prefs.productUpdates + '"><span></span></button></div>' +
    '<label for="pf-view">Service map opens on</label>' +
    '<div class="select-wrap"><select id="pf-view">' +
    views
      .map(function (v) { return '<option' + (prefs.defaultView === v ? " selected" : "") + ">" + v + "</option>"; })
      .join("") +
    "</select>" + ic("chevron-down", 15) + "</div>" +
    '<div class="modal-actions"><button class="ghost-button" data-modal-cancel>Cancel</button>' +
    '<button class="auth-submit compact" data-modal-save>Save preferences ' + ic("check", 15) + "</button></div>"
  );
}

modalBody.addEventListener("click", function (event) {
  const themeChoice = event.target.closest("[data-theme-choice]");
  if (themeChoice) {
    if (themeChoice.dataset.themeChoice !== theme) toggleTheme();
    Array.from(modalBody.querySelectorAll("[data-theme-choice]")).forEach(function (b) {
      b.classList.toggle("selected", b.dataset.themeChoice === theme);
    });
    return;
  }
  const sw = event.target.closest("[data-pref]");
  if (sw) {
    const key = sw.dataset.pref;
    prefs[key] = !prefs[key];
    sw.classList.toggle("on", prefs[key]);
    sw.setAttribute("aria-checked", String(prefs[key]));
    return;
  }
  if (event.target.closest("[data-modal-cancel]")) { closeModal(); return; }
  if (event.target.closest("[data-modal-save]")) saveModal();
});

function saveModal() {
  if (modalBody.dataset.mode === "profile") {
    const name = document.getElementById("pf-name").value.trim();
    const email = document.getElementById("pf-email").value.trim();
    if (!name || email.indexOf("@") === -1) {
      toast("A name and a valid email, please.");
      return;
    }
    currentUser.name = name;
    currentUser.email = email;
    currentUser.title = document.getElementById("pf-title").value.trim();
    currentUser.role = document.getElementById("pf-account").value;
    writeStore("ggUser", currentUser);
    renderDashboard();
    toast("Profile updated.");
  } else {
    prefs.defaultView = document.getElementById("pf-view").value;
    writeStore("ggPrefs", prefs);
    activePhase = prefs.defaultView;
    renderPhaseFilters();
    renderServices();
    toast("Preferences saved.");
  }
  closeModal();
}

modalBody.addEventListener("input", function (event) {
  const token = event.target.closest("[data-token]");
  if (token) {
    brand[token.dataset.token] = token.value;
    document.documentElement.style.setProperty(token.dataset.token, token.value);
    persist("brand", brand);
    const code = token.parentElement.querySelector("code");
    if (code) code.textContent = token.value;
  }
});

modalBody.addEventListener("input", function (event) {
  if (event.target.matches("[data-mu-w]")) updateMuTotal();
});

modalBody.addEventListener("change", function (event) {
  if (event.target.id === "mu-role") {
    const wrap = document.getElementById("mu-company-wrap");
    if (wrap) wrap.style.display = event.target.value === "corporate" ? "" : "none";
    return;
  }
  if (event.target.id === "mu-template") {
    const t = templatesCache.filter(function (x) { return x.id === event.target.value; })[0];
    if (t) { applyCfgToEditor(parseJson(t.fields.scoring)); toast("Template applied. Save to apply it to this person."); }
    return;
  }
  if (event.target.id === "rep-filter") { renderReportRows(); return; }
  if (event.target.id !== "hero-upload" || !event.target.files[0]) return;
  const reader = new FileReader();
  reader.onload = function () {
    heroChoice = reader.result;
    try {
      writeStore("ggHero", heroChoice, true);
      persist("hero", heroChoice);
      applyHero();
      openAdmin("hero");
      toast("Hero artwork uploaded.");
    } catch (e) {
      toast("That image is too large to store. Try one under about 3MB.");
    }
  };
  reader.readAsDataURL(event.target.files[0]);
});

veil.addEventListener("click", function (event) {
  if (event.target === veil) closeModal();
});

document.getElementById("modal-close").addEventListener("click", closeModal);


/* -----------------------------------------------------------------------------
   8c. SUPER ADMIN CONSOLE — site features, logins, field notes
   -------------------------------------------------------------------------- */

const FEATURE_LABELS = {
  fieldNotes: ["Field notes section", "The three editorial cards on the homepage."],
  membership: ["Membership section", "Plans and the individual / company toggle."],
  newsletter: ["Newsletter strip", "The email sign-up panel above the footer."],
  genie: ["Genie helper", "The lamp and popup in the corner of the homepage."],
  texture: ["Dot grid texture", "The faint dot pattern across open page areas."],
};

function applyFeatures() {
  document.getElementById("signal").hidden = !features.fieldNotes;
  document.getElementById("membership").hidden = !features.membership;
  document.getElementById("contact").hidden = !features.newsletter;
  genieDockEl.hidden = !features.genie;
  document.body.classList.toggle("no-texture", !features.texture);
}

function openAdmin(tab) {
  if (tab !== "people") manageRec = null;
  document.getElementById("modal-eyebrow").textContent = "Super admin";
  document.getElementById("modal-title").textContent = "Console";
  modalBody.dataset.mode = "admin";
  modalBody.dataset.tab = tab;
  modalBody.innerHTML =
    '<div class="admin-tabs">' +
    [["brand", "Brand"], ["copy", "Copy"], ["hero", "Hero"], ["phases", "Phases"],
     ["tiles", "Service tiles"], ["plans", "Plans"], ["posts", "Field notes"],
     ["people", "Logins"], ["companies", "Companies"], ["library", "Item Library"], ["trainers", "Trainers"], ["reports", "Reports"], ["analytics", "Analytics"], ["audit", "Audit"], ["subs", "Subscribers"], ["features", "Features"]]
      .map(function (t) {
        return '<button data-admin-tab="' + t[0] + '" class="' + (tab === t[0] ? "selected" : "") + '">' + t[1] + "</button>";
      })
      .join("") +
    "</div>" +
    ({ brand: adminBrand, copy: adminCopy, hero: adminHero, phases: adminPhases,
       tiles: adminTiles, plans: adminPlans, posts: adminPosts, people: adminPeople,
       companies: adminCompanies, library: adminLibrary, trainers: adminTrainers, reports: adminReports, analytics: adminAnalytics, audit: adminAudit, subs: adminSubs, features: adminFeatures }[tab] || adminFeatures)();
  document.querySelector(".modal").classList.add("wide");
  veil.hidden = false;
  hydrateIcons(modalBody);
  if (tab === "people" && manageRec) { updateMuTotal(); loadTemplates(); }
  if (tab === "people" && !companiesLoaded) { companiesLoaded = true; loadCompanyList(); }
  if (tab === "people" && !manageRec) loadPeople();
  else if (tab === "reports") loadReports();
  else if (tab === "companies") loadCompaniesTab();
  else if (tab === "library") loadLibraryTab();
  else if (tab === "trainers") loadTrainersAdmin();
  else if (tab === "analytics") loadAnalytics();
  else if (tab === "audit") loadAudit();
  else if (tab === "subs") loadSubs();
}

function adminFeatures() {
  return (
    '<p class="admin-note">Switch a section off and it disappears from the public site for everyone on this browser.</p>' +
    Object.keys(FEATURE_LABELS)
      .map(function (key) {
        return (
          '<div class="pref-row"><div><strong>' + FEATURE_LABELS[key][0] + "</strong><span>" + FEATURE_LABELS[key][1] + "</span></div>" +
          '<button class="switch ' + (features[key] ? "on" : "") + '" data-feature="' + key + '" role="switch" aria-checked="' + features[key] + '"><span></span></button></div>'
        );
      })
      .join("")
  );
}

let manageRec = null;   // the login being edited in the Logins tab
let peopleCache = [];
let reportsCache = [];

function adminPeople() {
  if (manageRec) return adminManageHtml(manageRec);
  return (
    '<p class="admin-note">Everyone here is stored in the database (Firestore <code>users</code>) and has a Firebase login. Add one and the person can sign in straight away. <strong>Manage</strong> sets each person&rsquo;s access and scoring. Removing revokes their access; to delete the Firebase account itself, also remove it in Firebase Console &rarr; Authentication.</p>' +
    '<div class="admin-list" id="people-list"><div class="admin-row"><div><strong>Loading&hellip;</strong></div></div></div>' +
    '<div class="admin-new"><strong>Add a login</strong>' +
    '<div class="admin-grid">' +
    '<input id="nu-name" placeholder="Full name" />' +
    '<input id="nu-email" placeholder="email@company.com" />' +
    '<input id="nu-pass" placeholder="Password (optional: blank = they get a set-password email)" />' +
    '<div class="select-wrap"><select id="nu-role">' +
    '<option value="individual">Individual</option><option value="corporate">Corporate L&D</option><option value="admin">Super admin</option>' +
    "</select>" + ic("chevron-down", 15) + "</div></div>" +
    '<button class="auth-submit compact" data-add-user>Create login ' + ic("check", 15) + "</button></div>"
  );
}

async function loadPeople() {
  const box = document.getElementById("people-list");
  if (!box) return;
  if (!FB || !session) { box.innerHTML = '<div class="admin-row"><div><strong>Sign in with Firebase to see logins.</strong></div></div>'; return; }
  try {
    const rows = await fbList("users");
    const el = document.getElementById("people-list");
    if (!el) return; // the admin switched tabs while this loaded
    rows.sort(function (a, b) { return String(a.fields.name || "").localeCompare(String(b.fields.name || "")); });
    peopleCache = rows;
    el.innerHTML = rows.length
      ? rows.map(function (r) {
          const me = session && r.id === session.uid;
          const email = r.fields.email || (me ? session.email : "");
          const role = r.fields.role || "individual";
          return (
            '<div class="admin-row"><div><strong>' + esc(r.fields.name || "(no name)") + "</strong>" +
            "<span>" + esc(email || "uid " + r.id) + (r.fields.title ? " &middot; " + esc(r.fields.title) : "") + "</span></div>" +
            (r.fields.active === "false" ? '<span class="role-pill suspended">suspended</span>' : "") +
            '<span class="role-pill ' + esc(role) + '">' + esc(role) + "</span>" +
            '<button class="ghost-button" data-manage-user="' + esc(r.id) + '">Manage</button>' +
            (me ? "" : '<button class="icon-button" data-del-user="' + esc(r.id) + '" aria-label="Remove ' + esc(r.fields.name || "login") + '">' + ic("x", 14) + "</button>") +
            "</div>"
          );
        }).join("")
      : '<div class="admin-row"><div><strong>No logins yet.</strong></div></div>';
  } catch (e) {
    const el = document.getElementById("people-list");
    if (el) el.innerHTML = '<div class="admin-row"><div><strong>Could not load logins.</strong><span>' + esc(e.message) + " \u2014 check the Firestore rules.</span></div></div>";
  }
}

/* ---- Manage one login: access + scoring --------------------------------- */

const MANAGE_TOOLS = [["tof", "Trainer Observation Form"], ["eff", "Trainer Effectiveness"]];

function muNum(v) { return String(parseFloat(Number(v).toFixed(4))); }

function muSwitch(attr, on, disabled) {
  return '<button type="button" class="switch ' + (on ? "on" : "") + '" ' + attr + ' role="switch" aria-checked="' + on + '"' + (disabled ? " disabled" : "") + "><span></span></button>";
}

// The Effectiveness weighting table + cut-offs: reused by the per-login editor and the company studio.
function effScoringBlockHtml(cfg) {
  const GG = window.GGTools;
  const effRows = GG.EFF_KEYS.map(function (k) {
    return "<tr><td>" + GG.EFF_LABELS[k] + "</td>" +
      '<td><input type="number" step="any" min="0" data-mu-w="' + k + '" value="' + muNum(cfg.eff.weights[k]) + '" /></td>' +
      '<td><input type="number" step="any" data-mu-min="' + k + '" value="' + muNum(cfg.eff.min[k]) + '" /></td>' +
      '<td class="mu-check"><input type="checkbox" data-mu-gate="' + k + '"' + (cfg.eff.gate[k] ? " checked" : "") + " /></td></tr>";
  }).join("");
  return (
    '<table class="mu-table"><thead><tr><th>Measure</th><th>Weight %</th><th>Minimum %</th><th>Forces Needs Improvement</th></tr></thead><tbody>' + effRows + "</tbody></table>" +
    '<div class="mu-total" id="mu-total"></div>' +
    '<div class="admin-grid"><label class="mu-sec"><span>Effective above (%)</span><input type="number" step="any" id="mu-effective" value="' + muNum(cfg.eff.effective) + '" /></label>' +
    '<label class="mu-sec"><span>Satisfactory from (%)</span><input type="number" step="any" id="mu-satisfactory" value="' + muNum(cfg.eff.satisfactory) + '" /></label></div>'
  );
}

function adminManageHtml(rec) {
  const GG = window.GGTools, f = rec.fields;
  const me = !!(session && rec.id === session.uid);
  const cfg = GG.normCfg(parseJson(f.scoring));
  const tools = parseTools(f.tools);
  const sw = cfg.tof.sectionWeights;

  const effRows = GG.EFF_KEYS.map(function (k) {
    return "<tr><td>" + GG.EFF_LABELS[k] + "</td>" +
      '<td><input type="number" step="any" min="0" data-mu-w="' + k + '" value="' + muNum(cfg.eff.weights[k]) + '" /></td>' +
      '<td><input type="number" step="any" data-mu-min="' + k + '" value="' + muNum(cfg.eff.min[k]) + '" /></td>' +
      '<td class="mu-check"><input type="checkbox" data-mu-gate="' + k + '"' + (cfg.eff.gate[k] ? " checked" : "") + " /></td></tr>";
  }).join("");

  const secRows = GG.TOF_SECTIONS.map(function (sec, i) {
    return '<label class="mu-sec"><span>' + esc(sec.title) + '</span><input type="number" step="any" min="0" data-mu-sw="' + i + '" value="' +
      muNum(sw ? sw[i] : sec.items.length) + '"' + (sw ? "" : " disabled") + " /></label>";
  }).join("");

  return (
    '<button type="button" class="back-link" data-admin-back>' + ic("arrow-left", 14) + " All logins</button>" +
    '<p class="admin-note"><strong>' + esc(f.name || "(no name)") + "</strong> &middot; " + esc(f.email || (me ? session.email : "uid " + rec.id)) +
    "<br />Changes apply the next time this person signs in.</p>" +
    '<div class="mu-block"><strong>Profile</strong><div class="admin-grid">' +
    '<input id="mu-name" placeholder="Full name" value="' + esc(f.name || "") + '" />' +
    '<input id="mu-title" placeholder="Title" value="' + esc(f.title || "") + '" />' +
    '<div class="select-wrap"><select id="mu-role"' + (me ? " disabled" : "") + ">" +
    [["individual", "Individual"], ["corporate", "Corporate L&D"], ["admin", "Super admin"]].map(function (o) {
      return '<option value="' + o[0] + '"' + ((f.role || "individual") === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("") + "</select>" + ic("chevron-down", 15) + "</div>" +
    '<div class="select-wrap" id="mu-company-wrap" style="' + ((f.role || "individual") === "corporate" ? "" : "display:none") + '"><select id="mu-company"><option value="">No company</option>' +
    companiesCache.map(function (c) { return '<option value="' + esc(c.id) + '"' + (f.companyId === c.id ? " selected" : "") + ">" + esc(c.fields.name || c.id) + "</option>"; }).join("") +
    "</select>" + ic("chevron-down", 15) + "</div></div>" +

    '<div class="mu-block"><strong>Access</strong>' +
    '<div class="pref-row"><div><strong>Can sign in</strong><span>' + (me ? "You cannot suspend yourself." : "Switch off to suspend this login. Nothing is deleted and their reports stay.") + "</span></div>" +
    muSwitch("data-mu-active", f.active !== "false", me) + "</div>" +
    '<div class="pref-row"><div><strong>Password</strong><span>' + (f.email ? "Emails " + esc(f.email) + " a link to set a new password." : "No email is stored for this login.") + "</span></div>" +
    '<button type="button" class="ghost-button" data-mu-reset-pw="' + esc(f.email || "") + '"' + (f.email ? "" : " disabled") + ">Send reset email</button></div>" +
    MANAGE_TOOLS.map(function (t) {
      return '<div class="pref-row"><div><strong>' + t[1] + "</strong><span>Whether this person can open the tool.</span></div>" + muSwitch('data-mu-tool="' + t[0] + '"', tools.indexOf(t[0]) !== -1) + "</div>";
    }).join("") + "</div>" +

    '<div class="mu-block"><strong>Trainer Effectiveness scoring</strong>' +
    '<p class="admin-note">Each measure\u2019s weight, its minimum, and whether falling below the minimum forces &ldquo;Needs Improvement&rdquo;. The defaults are the rules from the Excel workbook.</p>' +
    '<div class="mu-templates"><div class="select-wrap"><select id="mu-template"><option value="">Start from a saved template\u2026</option></select>' + ic("chevron-down", 15) + "</div>" +
    '<button type="button" class="ghost-button" data-mu-save-template>Save as template</button></div>' +
    '<table class="mu-table"><thead><tr><th>Measure</th><th>Weight %</th><th>Minimum %</th><th>Forces Needs Improvement</th></tr></thead><tbody>' + effRows + "</tbody></table>" +
    '<div class="mu-total" id="mu-total"></div>' +
    '<div class="admin-grid"><label class="mu-sec"><span>Effective above (%)</span><input type="number" step="any" id="mu-effective" value="' + muNum(cfg.eff.effective) + '" /></label>' +
    '<label class="mu-sec"><span>Satisfactory from (%)</span><input type="number" step="any" id="mu-satisfactory" value="' + muNum(cfg.eff.satisfactory) + '" /></label></div></div>' +

    '<div class="mu-block"><strong>Trainer Observation Form scoring</strong>' +
    '<div class="pref-row"><div><strong>Weight the sections differently</strong><span>Off: every item counts equally, as in the Excel form. On: the overall score is an average of the section scores by these weights.</span></div>' +
    muSwitch("data-mu-tofw", !!sw) + "</div>" +
    '<div class="mu-secs" id="mu-secs">' + secRows + "</div></div>" +

    '<div class="modal-actions"><button type="button" class="ghost-button" data-mu-reset>Reset scoring to defaults</button>' +
    '<button type="button" class="auth-submit compact" data-save-user="' + esc(rec.id) + '">Save changes ' + ic("check", 15) + "</button></div>"
  );
}

function updateMuTotal() {
  const box = document.getElementById("mu-total");
  if (!box) return;
  let sum = 0;
  Array.from(modalBody.querySelectorAll("[data-mu-w]")).forEach(function (i) { sum += Number(i.value) || 0; });
  const good = Math.abs(sum - 100) < 0.01;
  box.textContent = "Total weight: " + muNum(sum) + "%" + (good ? "" : " \u2014 must add up to 100%");
  box.classList.toggle("bad", !good);
}

let templatesCache = [];

async function loadTemplates() {
  const sel = document.getElementById("mu-template");
  if (!sel) return;
  try {
    templatesCache = (await fbList("scoring_templates")).sort(function (a, b) { return String(a.fields.name).localeCompare(String(b.fields.name)); });
    const el = document.getElementById("mu-template");
    if (!el) return;
    templatesCache.forEach(function (t) {
      const o = document.createElement("option");
      o.value = t.id; o.textContent = t.fields.name || t.id;
      el.appendChild(o);
    });
  } catch (e) { console.warn("Templates not loaded:", e.message); }
}

// Put a scoring profile into the editor's fields.
function applyCfgToEditor(cfg) {
  const GG = window.GGTools, c = GG.normCfg(cfg), q = function (sel) { return modalBody.querySelector(sel); };
  GG.EFF_KEYS.forEach(function (k) {
    q('[data-mu-w="' + k + '"]').value = muNum(c.eff.weights[k]);
    q('[data-mu-min="' + k + '"]').value = muNum(c.eff.min[k]);
    q('[data-mu-gate="' + k + '"]').checked = !!c.eff.gate[k];
  });
  q("#mu-effective").value = muNum(c.eff.effective);
  q("#mu-satisfactory").value = muNum(c.eff.satisfactory);
  const sw = c.tof.sectionWeights, tw = q("[data-mu-tofw]");
  tw.classList.toggle("on", !!sw); tw.setAttribute("aria-checked", String(!!sw));
  Array.from(modalBody.querySelectorAll("[data-mu-sw]")).forEach(function (i, n) {
    i.disabled = !sw; i.value = muNum(sw ? sw[n] : GG.TOF_SECTIONS[n].items.length);
  });
  updateMuTotal();
}

// Read and check the scoring fields. Throws a readable Error when something is wrong.
function readManageCfg() {
  const GG = window.GGTools;
  const q = function (sel) { return modalBody.querySelector(sel); };
  const on = function (sel) { const el = q(sel); return !!el && el.classList.contains("on"); };
  const read = function (el) { return el.value.trim() === "" ? NaN : Number(el.value); };
  const weights = {}, min = {}, gate = {};
  let sum = 0;
  GG.EFF_KEYS.forEach(function (k) {
    weights[k] = read(q('[data-mu-w="' + k + '"]'));
    min[k] = read(q('[data-mu-min="' + k + '"]'));
    gate[k] = q('[data-mu-gate="' + k + '"]').checked;
    if (!isFinite(weights[k]) || weights[k] < 0) throw new Error("Every weight must be a number, 0 or more.");
    if (!isFinite(min[k])) throw new Error("Every minimum must be a number.");
    sum += weights[k];
  });
  if (Math.abs(sum - 100) > 0.01) throw new Error("Weights must add up to 100% (now " + muNum(sum) + "%).");
  const effective = read(q("#mu-effective")), satisfactory = read(q("#mu-satisfactory"));
  if (!isFinite(effective) || !isFinite(satisfactory)) throw new Error("Enter both rating cut-offs.");
  if (satisfactory > effective) throw new Error("Satisfactory cannot be above the Effective cut-off.");
  let sectionWeights = null;
  if (on("[data-mu-tofw]")) {
    sectionWeights = Array.from(modalBody.querySelectorAll("[data-mu-sw]")).map(read);
    if (sectionWeights.some(function (w) { return !isFinite(w) || w < 0; })) throw new Error("Section weights must be numbers, 0 or more.");
    if (!(sectionWeights.reduce(function (a, b) { return a + b; }, 0) > 0)) throw new Error("At least one section needs a weight above 0.");
  }
  return GG.normCfg({ eff: { weights: weights, min: min, gate: gate, effective: effective, satisfactory: satisfactory }, tof: { sectionWeights: sectionWeights } });
}

// "active: true -> false; tools: tof,eff -> tof; scoring changed" for the audit log.
function diffFields(before, after) {
  return Object.keys(after).filter(function (k) { return String(before[k] === undefined ? "" : before[k]) !== String(after[k]); }).map(function (k) {
    return k === "scoring" ? "scoring changed" : k + ": " + (before[k] === undefined ? "\\u2014" : before[k]) + " \\u2192 " + after[k];
  }).join("; ");
}

// Read the editor, check it, save it. Returns a promise.
function saveManagedLogin(uid) {
  const GG = window.GGTools;
  const q = function (sel) { return modalBody.querySelector(sel); };
  const on = function (sel) { const el = q(sel); return !!el && el.classList.contains("on"); };
  const name = q("#mu-name").value.trim();
  if (!name) return Promise.reject(new Error("Name cannot be empty."));
  let cfg;
  try { cfg = readManageCfg(); } catch (e) { return Promise.reject(e); }

  const fields = {
    name: name,
    title: q("#mu-title").value.trim(),
    tools: MANAGE_TOOLS.map(function (t) { return t[0]; }).filter(function (k) { return on('[data-mu-tool="' + k + '"]'); }).join(","),
    scoring: GG.cfgIsCustom(cfg) ? JSON.stringify(cfg) : "",
  };
  if (!(session && uid === session.uid)) {
    fields.role = q("#mu-role").value;
    fields.active = on("[data-mu-active]") ? "true" : "false";
    fields.companyId = fields.role === "corporate" ? (q("#mu-company") ? q("#mu-company").value : "") : "";
  }
  const before = (peopleCache.filter(function (r) { return r.id === uid; })[0] || { fields: {} }).fields;
  const changes = diffFields(before, fields);
  return fbUpdateUser(uid, fields).then(function () {
    logAudit("login_updated", uid, (before.name || fields.name) + ": " + (changes || "no changes"));
    const wasActive = before.active !== "false";
    if (fields.active !== undefined && (fields.active === "true") !== wasActive) {
      return fbAdminFn("adminSetDisabled", { uid: uid, disabled: fields.active === "false" })
        .catch(function (e) { toast("Saved, but the Firebase account itself could not be " + (fields.active === "false" ? "disabled" : "enabled") + " (" + e.message + ")."); });
    }
  });
}

/* ---- Reports tab (admin sees everyone's saved reports) ------------------- */

function adminReports() {
  return (
    '<p class="admin-note">Every report saved by every participant (Firestore <code>reports</code>). Download any of them as a PDF, exactly as it was scored when it was saved.</p>' +
    '<div class="admin-grid"><div class="select-wrap"><select id="rep-filter"><option value="">All participants</option></select>' + ic("chevron-down", 15) + "</div></div>" +
    '<div class="admin-list" id="reports-list"><div class="admin-row"><div><strong>Loading&hellip;</strong></div></div></div>'
  );
}

function reportKind(type) { return type === "tof" ? "Observation" : "Effectiveness"; }

function renderReportRows() {
  const box = document.getElementById("reports-list");
  if (!box) return;
  const who = (document.getElementById("rep-filter") || {}).value || "";
  const rows = reportsCache.filter(function (r) { return !who || r.uid === who; });
  box.innerHTML = rows.length
    ? rows.map(function (r) {
        return '<div class="admin-row"><div><strong>' + esc(r.title || "(untitled)") + "</strong><span>" + esc(r.name || r.email || r.uid) + " &middot; " +
          reportKind(r.type) + " &middot; " + esc(String(r.createdAt || "").slice(0, 16).replace("T", " ")) + (r.score ? " &middot; " + esc(r.score) : "") + "</span></div>" +
          (function () { const v = window.GGTools.verifyReport(r); return v.ok ? "" : '<span class="role-pill suspended" title="' + esc(v.problems.join(". ")) + '">check</span>'; })() +
          '<button class="ghost-button" data-rep-admin-pdf="' + esc(r.id) + '">PDF</button>' +
          '<button class="icon-button" data-rep-del="' + esc(r.id) + '" aria-label="Delete report">' + ic("x", 14) + "</button></div>";
      }).join("")
    : '<div class="admin-row"><div><strong>No reports saved yet.</strong></div></div>';
}

async function loadReports() {
  const box = document.getElementById("reports-list");
  if (!box) return;
  if (!FB || !session) { box.innerHTML = '<div class="admin-row"><div><strong>Sign in with Firebase to see reports.</strong></div></div>'; return; }
  try {
    reportsCache = await fbAllReports();
    if (!document.getElementById("reports-list")) return;
    const seen = {};
    const sel = document.getElementById("rep-filter");
    reportsCache.forEach(function (r) {
      if (seen[r.uid]) return;
      seen[r.uid] = true;
      const o = document.createElement("option");
      o.value = r.uid; o.textContent = r.name || r.email || r.uid;
      sel.appendChild(o);
    });
    renderReportRows();
  } catch (e) {
    const el = document.getElementById("reports-list");
    if (el) el.innerHTML = '<div class="admin-row"><div><strong>Could not load reports.</strong><span>' + esc(e.message) + " \u2014 check the Firestore rules.</span></div></div>";
  }
}

/* ---- Companies tab ------------------------------------------------------- */

function logoImg(logo, size) {
  return logo ? '<img class="admin-logo" width="' + size + '" height="' + size + '" src="' + logo + '" alt="" />' : '<span class="admin-logo admin-logo-empty" style="width:' + size + 'px;height:' + size + 'px"></span>';
}

function adminCompanies() {
  return (
    '<p class="admin-note">Companies (Firestore <code>companies</code>). Give each corporate account a company, so their logo and name appear on their downloaded PDFs, and they can build their own Observation checklist under &ldquo;Customize forms&rdquo; once you assign someone to it (Logins &rarr; Manage &rarr; Company).</p>' +
    '<div class="admin-list" id="companies-list"><div class="admin-row"><div><strong>Loading&hellip;</strong></div></div></div>' +
    '<div class="admin-new"><strong>Add a company</strong><div class="admin-grid">' +
    '<input id="nc-name" placeholder="Company name" />' +
    '<label class="cm-file">Logo (PNG/JPEG, optional)<input id="nc-logo" type="file" accept="image/png,image/jpeg" /></label></div>' +
    '<button class="auth-submit compact" data-add-company>Add company ' + ic("check", 15) + "</button></div>"
  );
}

async function loadCompaniesTab() {
  const box = document.getElementById("companies-list");
  if (!box) return;
  if (!FB || !session) { box.innerHTML = '<div class="admin-row"><div><strong>Sign in with Firebase to manage companies.</strong></div></div>'; return; }
  try {
    await loadCompanyList();
    const el = document.getElementById("companies-list");
    if (!el) return;
    el.innerHTML = companiesCache.length
      ? companiesCache.map(function (c) {
          return '<div class="admin-row"><div>' + logoImg(c.fields.logo, 32) + '<strong style="margin-left:10px">' + esc(c.fields.name || c.id) + "</strong><span>" +
            (c.fields.tof ? "Custom Observation checklist" : "Default Observation form") + (c.fields.scoring ? " &middot; custom scoring" : "") + "</span></div>" +
            '<button class="icon-button" data-del-company="' + esc(c.id) + '" aria-label="Remove company">' + ic("x", 14) + "</button></div>";
        }).join("")
      : '<div class="admin-row"><div><strong>No companies yet.</strong><span>Add one, then assign a corporate login to it.</span></div></div>';
  } catch (e) {
    const el = document.getElementById("companies-list");
    if (el) el.innerHTML = '<div class="admin-row"><div><strong>Could not load companies.</strong><span>' + esc(e.message) + " \u2014 check the Firestore rules.</span></div></div>";
  }
}

/* ---- Item Library tab ---------------------------------------------------- */

const LIBRARY_CAP = 30;
let libraryCache = [];

function adminLibrary() {
  return (
    '<p class="admin-note">The pool of Observation Form items (Firestore <code>item_library</code>) that corporate accounts pick from to build their own checklist. Give each one a section (for example &ldquo;Opening&rdquo;, &ldquo;Delivery&rdquo;) &mdash; that is how a company\u2019s picks are grouped. Aim for around ' + LIBRARY_CAP + '.</p>' +
    '<div class="admin-list" id="library-list"><div class="admin-row"><div><strong>Loading&hellip;</strong></div></div></div>' +
    '<div class="admin-new"><strong>Add an item</strong><div class="admin-grid"><input id="nl-name" placeholder="Item text" /><input id="nl-team" placeholder="Section (e.g. Opening)" /></div>' +
    '<button class="auth-submit compact" data-add-library>Add item ' + ic("check", 15) + "</button>" +
    '<label>Or paste many, one per line (&ldquo;Item text, Section&rdquo;)</label><textarea id="nl-bulk" rows="4" placeholder="Started on time, Opening&#10;Handled questions well, Delivery"></textarea>' +
    '<button class="ghost-button" data-bulk-library>Import list</button></div>'
  );
}

async function loadLibraryTab() {
  const box = document.getElementById("library-list");
  if (!box) return;
  if (!FB || !session) { box.innerHTML = '<div class="admin-row"><div><strong>Sign in with Firebase to manage the item library.</strong></div></div>'; return; }
  try {
    libraryCache = (await fbList("item_library")).sort(function (a, b) { return String(a.fields.team || "").localeCompare(String(b.fields.team || "")) || String(a.fields.name).localeCompare(String(b.fields.name)); });
    const el = document.getElementById("library-list");
    if (!el) return;
    el.innerHTML =
      (libraryCache.length >= LIBRARY_CAP ? '<div class="admin-row"><div><strong>' + libraryCache.length + " items \u2014 that\u2019s plenty.</strong></div></div>" : "") +
      (libraryCache.length
        ? libraryCache.map(function (r) {
            return '<div class="admin-row"><div><strong>' + esc(r.fields.name || r.id) + "</strong><span>" + esc(r.fields.team || "General") + "</span></div>" +
              '<button class="icon-button" data-del-library="' + esc(r.id) + '" aria-label="Remove item">' + ic("x", 14) + "</button></div>";
          }).join("")
        : '<div class="admin-row"><div><strong>No items yet.</strong><span>Add a few below, around 25 to 30 is plenty.</span></div></div>');
  } catch (e) {
    const el = document.getElementById("library-list");
    if (el) el.innerHTML = '<div class="admin-row"><div><strong>Could not load the library.</strong><span>' + esc(e.message) + " \u2014 check the Firestore rules.</span></div></div>";
  }
}

/* ---- Trainers tab ------------------------------------------------------- */

let trainersCache = [];

function adminTrainers() {
  return (
    '<p class="admin-note">The trainer directory (Firestore <code>trainers</code>). Everyone signed in gets these names as suggestions when typing a trainer, and the spelling is corrected to match, so one trainer is never split into two.</p>' +
    '<div class="admin-list" id="trainers-list"><div class="admin-row"><div><strong>Loading&hellip;</strong></div></div></div>' +
    '<div class="admin-new"><strong>Add a trainer</strong><div class="admin-grid"><input id="nt-name" placeholder="Trainer name" /><input id="nt-team" placeholder="Team (optional)" /></div>' +
    '<button class="auth-submit compact" data-add-trainer>Add trainer ' + ic("check", 15) + "</button>" +
    '<label>Or paste many, one per line (&ldquo;Name, Team&rdquo;)</label><textarea id="nt-bulk" rows="4" placeholder="Nikita Shah, Mumbai&#10;Vandana Rao, Pune"></textarea>' +
    '<button class="ghost-button" data-bulk-trainers>Import list</button></div>'
  );
}

async function loadTrainersAdmin() {
  const box = document.getElementById("trainers-list");
  if (!box) return;
  if (!FB || !session) { box.innerHTML = '<div class="admin-row"><div><strong>Sign in with Firebase to manage trainers.</strong></div></div>'; return; }
  try {
    trainersCache = (await fbList("trainers")).sort(function (a, b) { return String(a.fields.name).localeCompare(String(b.fields.name)); });
    const el = document.getElementById("trainers-list");
    if (!el) return;
    el.innerHTML = trainersCache.length
      ? trainersCache.map(function (t) {
          return '<div class="admin-row"><div><strong>' + esc(t.fields.name || t.id) + "</strong><span>" + esc(t.fields.team || "No team") + "</span></div>" +
            '<button class="icon-button" data-del-trainer="' + esc(t.id) + '" aria-label="Remove trainer">' + ic("x", 14) + "</button></div>";
        }).join("")
      : '<div class="admin-row"><div><strong>No trainers yet.</strong><span>Add a few below.</span></div></div>';
    window.ggTrainers = trainersCache.map(function (t) { return t.fields.name || t.id; });
    if (window.ggSetTrainers) window.ggSetTrainers(window.ggTrainers);
  } catch (e) {
    const el = document.getElementById("trainers-list");
    if (el) el.innerHTML = '<div class="admin-row"><div><strong>Could not load trainers.</strong><span>' + esc(e.message) + " \u2014 check the Firestore rules.</span></div></div>";
  }
}

/* ---- Analytics tab ------------------------------------------------------ */

function adminAnalytics() {
  return '<p class="admin-note">Built from every saved report. Each trainer\u2019s latest observation and effectiveness, the monthly trend, and who has not submitted this month.</p><div id="analytics-box"><div class="admin-row"><div><strong>Loading&hellip;</strong></div></div></div>';
}

async function loadAnalytics() {
  const box = document.getElementById("analytics-box");
  if (!box) return;
  if (!FB || !session) { box.innerHTML = "<p>Sign in with Firebase to see analytics.</p>"; return; }
  try {
    const both = await Promise.all([fbList("users"), fbAllReports()]);
    const el = document.getElementById("analytics-box");
    if (!el) return;
    const a = window.GGTools.analytics(both[0], both[1]);
    const tile = function (label, value) { return '<div class="tt-tile"><span>' + label + "</span><strong>" + esc(value) + "</strong></div>"; };
    const pctTxt = function (x) { return x === undefined || x === null ? "\u2014" : (x * 100).toFixed(1) + "%"; };
    const bar = function (v) { return '<i class="an-bar" style="width:' + Math.max(0, Math.min(100, v)) + '%"></i>'; };
    el.innerHTML =
      '<div class="tt-kpis">' + tile("Saved reports", a.kpis.reports) + tile("This month", a.kpis.thisMonth) + tile("Active participants", a.kpis.activeParticipants) + tile("Submitted this month", a.kpis.submittedThisMonth + " / " + a.kpis.activeParticipants) + "</div>" +
      "<h4 class=\"an-h\">Average effectiveness by month</h4>" +
      (a.monthly.length ? '<table class="tt-dist an-table"><tbody>' + a.monthly.map(function (m) {
        return "<tr><td>" + esc(m.label) + "</td><td class=\"an-barcell\">" + bar(m.avg) + "</td><td>" + m.avg.toFixed(1) + "% <small>(" + m.n + " trainer" + (m.n === 1 ? "" : "s") + ")</small></td></tr>";
      }).join("") + "</tbody></table>" : "<p class=\"admin-note\">No effectiveness reports yet.</p>") +
      "<h4 class=\"an-h\">Trainers</h4>" +
      (a.trainers.length ? '<div class="tt-scroll"><table class="tt-table an-trainers"><thead><tr><th>Trainer</th><th>Latest observation</th><th>Latest effectiveness</th><th>Rating</th></tr></thead><tbody>' + a.trainers.map(function (t) {
        return "<tr><td><b>" + esc(t.name) + "</b></td><td>" + pctTxt(t.tof) + "</td><td>" + (t.eff === undefined ? "\u2014" : t.eff.toFixed(2) + "%") + "</td><td>" +
          (t.rating ? '<span class="tt-pill ' + (t.rating === "Effective" ? "effective" : t.rating === "Satisfactory" ? "satisfactory" : "needs") + '">' + esc(t.rating) + "</span>" : "\u2014") + "</td></tr>";
      }).join("") + "</tbody></table></div>" : "<p class=\"admin-note\">No trainers in the reports yet.</p>") +
      "<h4 class=\"an-h\">Rating mix (latest per trainer)</h4><p class=\"admin-note\">" + a.distribution.map(function (d) { return esc(d.rating) + ": " + d.count; }).join(" \u00B7 ") + "</p>" +
      "<h4 class=\"an-h\">Not submitted this month</h4><p class=\"admin-note\">" + (a.missing.length ? a.missing.map(esc).join(", ") : "Everyone has submitted.") + "</p>";
  } catch (e) {
    const el = document.getElementById("analytics-box");
    if (el) el.innerHTML = "<p>Could not build analytics (" + esc(e.message) + "). Check the Firestore rules.</p>";
  }
}

/* ---- Audit tab ---------------------------------------------------------- */

function adminAudit() {
  return '<p class="admin-note">Who changed what (Firestore <code>audit_log</code>). Entries cannot be edited or deleted.</p><div class="admin-list" id="audit-list"><div class="admin-row"><div><strong>Loading&hellip;</strong></div></div></div>';
}

async function loadAudit() {
  const box = document.getElementById("audit-list");
  if (!box) return;
  if (!FB || !session) { box.innerHTML = '<div class="admin-row"><div><strong>Sign in with Firebase to see the audit log.</strong></div></div>'; return; }
  try {
    const rows = (await fbList("audit_log")).sort(function (a, b) { return String(b.fields.createdAt || "").localeCompare(String(a.fields.createdAt || "")); }).slice(0, 200);
    const el = document.getElementById("audit-list");
    if (!el) return;
    el.innerHTML = rows.length
      ? rows.map(function (r) {
          const f = r.fields;
          return '<div class="admin-row"><div><strong>' + esc(f.action) + " &middot; " + esc(f.target) + "</strong><span>" + esc(f.actorName || f.actor) + " &middot; " +
            esc(String(f.createdAt || "").slice(0, 16).replace("T", " ")) + (f.detail ? " &middot; " + esc(f.detail) : "") + "</span></div></div>";
        }).join("")
      : '<div class="admin-row"><div><strong>Nothing logged yet.</strong></div></div>';
  } catch (e) {
    const el = document.getElementById("audit-list");
    if (el) el.innerHTML = '<div class="admin-row"><div><strong>Could not load the audit log.</strong><span>' + esc(e.message) + " \u2014 check the Firestore rules.</span></div></div>";
  }
}

/* ---- Company studio: a corporate account builds its own Observation checklist and
   Effectiveness weighting, and sets its logo/name for its downloaded PDFs. ------------- */

let csChecked = {};   // this render's checked library item ids, kept across re-renders of the checklist

function csHtml() {
  const co = currentUser.company;
  if (!co) return '<p class="admin-note">Your login is not yet linked to a company. Ask an admin to set this under Logins &rarr; Manage &rarr; Company.</p>';
  const cfg = window.GGTools.normCfg(parseJson(co.scoringRaw));
  csChecked = {};
  (co.tofPicks || []).forEach(function (sec) { (sec.ids || []).forEach(function (id) { csChecked[id] = true; }); });
  const library = window.ggLibrary || [];
  const grouped = {};
  const order = [];
  library.forEach(function (it) {
    const tag = it.section || "General";
    if (!grouped[tag]) { grouped[tag] = []; order.push(tag); }
    grouped[tag].push(it);
  });
  return (
    '<div class="mu-block"><strong>Your brand</strong><p class="admin-note">Shown on every PDF your team downloads.</p><div class="admin-grid">' +
    '<input id="cs-name" placeholder="Company name" value="' + esc(co.name || "") + '" />' +
    '<label class="cm-file">Logo (PNG/JPEG)<input id="cs-logo" type="file" accept="image/png,image/jpeg" /></label></div>' +
    '<div class="cs-logo-preview">' + logoImg(co.logo, 48) + '<span id="cs-logo-note">' + (co.logo ? "Current logo" : "No logo yet") + "</span></div></div>" +

    '<div class="mu-block"><strong>Observation Form checklist</strong>' +
    '<p class="admin-note">Pick which items your team is observed on' + (library.length ? "" : " (ask an admin to add items to the library first)") +
    '. Leave nothing picked to keep the standard 36-item form.</p>' +
    order.map(function (tag) {
      return '<div class="cs-group"><h4>' + esc(tag) + "</h4>" + grouped[tag].map(function (it) {
        return '<label class="cs-item"><input type="checkbox" data-cs-item="' + esc(it.id) + '"' + (csChecked[it.id] ? " checked" : "") + " /> " + esc(it.label) + "</label>";
      }).join("") + "</div>";
    }).join("") +
    '<p class="admin-note" id="cs-picked-note"></p></div>' +

    '<div class="mu-block"><strong>Trainer Effectiveness weighting</strong>' +
    '<p class="admin-note">Applies to everyone at your company, unless an admin sets a different weighting for one person. The defaults are the Excel rules.</p>' +
    effScoringBlockHtml(cfg) + "</div>" +

    '<div class="modal-actions"><button type="button" class="ghost-button" data-cs-reset>Reset weighting to defaults</button>' +
    '<button type="button" class="auth-submit compact" data-cs-save>Save ' + ic("check", 15) + "</button></div>"
  );
}

function csPickedNote() {
  const n = document.querySelectorAll("[data-cs-item]:checked").length;
  const el = document.getElementById("cs-picked-note");
  if (el) el.textContent = n ? n + " item" + (n === 1 ? "" : "s") + " picked \u2014 your team will see a custom checklist." : "Nothing picked \u2014 your team sees the standard 36-item form.";
}

function openCompanyStudio() {
  if (!currentUser || currentUser.role !== "corporate") return;
  document.querySelector(".modal").classList.add("wide");
  document.getElementById("modal-eyebrow").textContent = "Corporate";
  document.getElementById("modal-title").textContent = "Customize forms";
  modalBody.dataset.mode = "studio";
  modalBody.innerHTML = currentUser.company ? '<p class="admin-note">Loading&hellip;</p>' : csHtml();
  veil.hidden = false;
  hydrateIcons(modalBody);
  if (!currentUser.company) return;
  const ready = function () { modalBody.innerHTML = csHtml(); hydrateIcons(modalBody); updateMuTotal(); csPickedNote(); };
  if (libraryLoaded) ready(); else { libraryLoaded = true; loadItemLibrary().then(ready); }
}

modalBody.addEventListener("click", function (event) {
  if (modalBody.dataset.mode !== "studio") return;
  if (event.target.closest("[data-cs-reset]")) {
    const D = window.GGTools.DEFAULT_CFG;
    window.GGTools.EFF_KEYS.forEach(function (k) {
      document.querySelector('[data-mu-w="' + k + '"]').value = muNum(D.eff.weights[k]);
      document.querySelector('[data-mu-min="' + k + '"]').value = muNum(D.eff.min[k]);
      document.querySelector('[data-mu-gate="' + k + '"]').checked = D.eff.gate[k];
    });
    document.getElementById("mu-effective").value = muNum(D.eff.effective);
    document.getElementById("mu-satisfactory").value = muNum(D.eff.satisfactory);
    updateMuTotal();
    return;
  }
  if (event.target.closest("[data-cs-save]")) {
    const co = currentUser.company;
    const name = document.getElementById("cs-name").value.trim();
    if (!name) { toast("Give your company a name."); return; }
    let cfg;
    try { cfg = readManageCfg(); } catch (e) { toast(e.message); return; }
    const picked = Array.from(document.querySelectorAll("[data-cs-item]:checked")).map(function (el) { return el.dataset.csItem; });
    const grouped = window.GGTools.groupByLibrarySection(picked, window.ggLibrary || []);
    const file = document.getElementById("cs-logo").files[0];
    readLogoFile(file).then(function (logo) {
      const fields = { name: name, scoring: window.GGTools.cfgIsCustom(cfg) ? JSON.stringify(cfg) : "", tof: picked.length ? JSON.stringify(grouped) : "" };
      if (logo) fields.logo = logo;
      return fbSaveCompany(co.id, fields).then(function () { return { logo: logo }; });
    }).then(function (r) {
      logAudit("company_customized", co.id, name);
      co.name = name; co.scoringRaw = window.GGTools.cfgIsCustom(cfg) ? JSON.stringify(cfg) : ""; co.tofPicks = picked.length ? grouped : null;
      if (r.logo) co.logo = r.logo;
      currentUser.scoring = window.GGTools.layerCfg(parseJson(co.scoringRaw), parseJson(currentUser.scoringRaw));
      if (window.ggToolsHello) window.ggToolsHello(currentUser);
      toast("Saved. Your team will see this the next time they sign in, or right away if they refresh.");
      closeModal();
    }).catch(function (e) { toast("Could not save: " + e.message); });
  }
});

modalBody.addEventListener("change", function (event) {
  if (event.target.matches("[data-cs-item]")) csPickedNote();
});

let subsCache = [];

function adminSubs() {
  return (
    '<p class="admin-note">Everyone who signed up through the homepage pop-up or the footer form (Firestore <code>subscribers</code>).</p>' +
    '<div class="admin-list" id="subs-list"><div class="admin-row"><div><strong>Loading&hellip;</strong></div></div></div>' +
    '<div class="modal-actions"><button class="ghost-button" data-subs-csv>Download CSV</button></div>'
  );
}

async function loadSubs() {
  const box = document.getElementById("subs-list");
  if (!box) return;
  if (!FB || !session) { box.innerHTML = '<div class="admin-row"><div><strong>Sign in with Firebase to see subscribers.</strong></div></div>'; return; }
  try {
    const rows = await fbList("subscribers");
    const el = document.getElementById("subs-list");
    if (!el) return;
    subsCache = rows.map(function (r) {
      return { email: r.fields.email || decodeURIComponent(r.id), source: r.fields.source || "", createdAt: r.fields.createdAt || "" };
    }).sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
    el.innerHTML = subsCache.length
      ? '<div class="admin-row"><div><strong>' + subsCache.length + " subscriber" + (subsCache.length === 1 ? "" : "s") + "</strong></div></div>" +
        subsCache.map(function (r) {
          return '<div class="admin-row"><div><strong>' + esc(r.email) + "</strong><span>" + esc(r.source) +
            (r.createdAt ? " &middot; " + esc(r.createdAt.slice(0, 10)) : "") + "</span></div></div>";
        }).join("")
      : '<div class="admin-row"><div><strong>No subscribers yet.</strong></div></div>';
  } catch (e) {
    const el = document.getElementById("subs-list");
    if (el) el.innerHTML = '<div class="admin-row"><div><strong>Could not load subscribers.</strong><span>' + esc(e.message) + " \u2014 check the Firestore rules.</span></div></div>";
  }
}

function downloadSubsCsv() {
  if (!subsCache.length) { toast("No subscribers to export yet."); return; }
  const q = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
  const csv = ["email,source,signed_up"].concat(subsCache.map(function (r) { return [q(r.email), q(r.source), q(r.createdAt)].join(","); })).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "subscribers.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}

function adminPosts() {
  return (
    '<p class="admin-note">These are the three cards in the field notes section. Edit and save, and the homepage updates.</p>' +
    newsPosts
      .map(function (post, i) {
        return (
          '<div class="admin-post"><div class="admin-post-top"><span class="swatch ' + post.color + '"></span>' +
          "<strong>Card " + (i + 1) + '</strong><button class="icon-button" data-del-post="' + i + '" aria-label="Delete card">' + ic("x", 14) + "</button></div>" +
          '<label>Headline</label><input data-post="' + i + '" data-field="title" value="' + esc(post.title) + '" />' +
          '<label>Excerpt</label><input data-post="' + i + '" data-field="excerpt" value="' + esc(post.excerpt) + '" />' +
          '<div class="admin-grid three">' +
          '<input data-post="' + i + '" data-field="source" value="' + esc(post.source) + '" placeholder="Source" />' +
          '<input data-post="' + i + '" data-field="category" value="' + esc(post.category) + '" placeholder="Category" />' +
          '<input data-post="' + i + '" data-field="date" value="' + esc(post.date) + '" placeholder="Read time" />' +
          "</div>" +
          '<label>Link</label><input data-post="' + i + '" data-field="url" value="' + esc(post.url) + '" />' +
          "</div>"
        );
      })
      .join("") +
    '<div class="modal-actions"><button class="ghost-button" data-add-post>Add a card</button>' +
    '<button class="auth-submit compact" data-save-posts>Save field notes ' + ic("check", 15) + "</button></div>"
  );
}

function esc(v) {
  return String(v === null || v === undefined ? "" : v)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;");
}

// Links typed into the admin console may only go to web or mail addresses.
function safeUrl(u) {
  const t = String(u === null || u === undefined ? "" : u).trim();
  return /^(https?:|mailto:|#|\/)/i.test(t) ? t : "#";
}

modalBody.addEventListener("click", function (event) {
  const tab = event.target.closest("[data-admin-tab]");
  if (tab) { openAdmin(tab.dataset.adminTab); return; }

  const feature = event.target.closest("[data-feature]");
  if (feature) {
    const key = feature.dataset.feature;
    features[key] = !features[key];
    feature.classList.toggle("on", features[key]);
    feature.setAttribute("aria-checked", String(features[key]));
    persist("features", features);
    applyFeatures();
    toast(FEATURE_LABELS[key][0] + (features[key] ? " switched on." : " switched off."));
    return;
  }

  const manage = event.target.closest("[data-manage-user]");
  if (manage) {
    const rec = peopleCache.filter(function (r) { return r.id === manage.dataset.manageUser; })[0];
    if (rec) {
      manageRec = rec;
      if (companiesLoaded) { openAdmin("people"); updateMuTotal(); }
      else { companiesLoaded = true; loadCompanyList().then(function () { openAdmin("people"); updateMuTotal(); }); }
    }
    return;
  }
  if (event.target.closest("[data-admin-back]")) { manageRec = null; openAdmin("people"); return; }

  const muSw = event.target.closest(".switch[data-mu-active], .switch[data-mu-tool], .switch[data-mu-tofw]");
  if (muSw) {
    if (muSw.disabled) return;
    const next = !muSw.classList.contains("on");
    muSw.classList.toggle("on", next);
    muSw.setAttribute("aria-checked", String(next));
    if (muSw.hasAttribute("data-mu-tofw")) {
      Array.from(modalBody.querySelectorAll("[data-mu-sw]")).forEach(function (i) { i.disabled = !next; });
    }
    return;
  }

  const resetPw = event.target.closest("[data-mu-reset-pw]");
  if (resetPw) {
    const email = resetPw.dataset.muResetPw;
    fbSendReset(email)
      .then(function () { logAudit("password_reset_sent", email, ""); toast("Reset email sent to " + email + "."); })
      .catch(function (e) { toast("Could not send it: " + e.message); });
    return;
  }

  if (event.target.closest("[data-mu-save-template]")) {
    let cfg;
    try { cfg = readManageCfg(); } catch (e) { toast(e.message); return; }
    const name = (window.prompt("Name this scoring template:") || "").trim();
    if (!name) return;
    fbEnsureToken().then(function (token) {
      return fetch(FS + "/scoring_templates/" + slugOf(name) + "?key=" + FB.apiKey, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ fields: { name: { stringValue: name }, scoring: { stringValue: JSON.stringify(cfg) } } }),
      });
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      logAudit("template_saved", name, "");
      toast("Template \u201C" + name + "\u201D saved.");
      const sel = document.getElementById("mu-template");
      if (sel && !templatesCache.some(function (t) { return t.id === slugOf(name); })) {
        templatesCache.push({ id: slugOf(name), fields: { name: name, scoring: JSON.stringify(cfg) } });
        const o = document.createElement("option"); o.value = slugOf(name); o.textContent = name; sel.appendChild(o);
      }
    }).catch(function (e) { toast("Could not save the template: " + e.message); });
    return;
  }

  if (event.target.closest("[data-mu-reset]")) {
    applyCfgToEditor(window.GGTools.DEFAULT_CFG);
    toast("Scoring reset to the defaults. Save to apply.");
    return;
  }

  const saveUser = event.target.closest("[data-save-user]");
  if (saveUser) {
    saveManagedLogin(saveUser.dataset.saveUser)
      .then(function () { toast("Saved. It applies the next time they sign in."); manageRec = null; openAdmin("people"); })
      .catch(function (err) { toast(err.message); });
    return;
  }

  const repPdf = event.target.closest("[data-rep-admin-pdf]");
  if (repPdf) {
    const rec = reportsCache.filter(function (r) { return r.id === repPdf.dataset.repAdminPdf; })[0];
    if (rec && window.ggDownloadReport) window.ggDownloadReport(rec);
    return;
  }
  const repDel = event.target.closest("[data-rep-del]");
  if (repDel) {
    if (!window.confirm("Delete this report permanently? The participant will lose it from their history.")) return;
    const gone = reportsCache.filter(function (r) { return r.id === repDel.dataset.repDel; })[0];
    fbDelete("reports", repDel.dataset.repDel)
      .then(function () { logAudit("report_deleted", repDel.dataset.repDel, gone ? gone.title + " (" + (gone.name || gone.uid) + ")" : ""); reportsCache = reportsCache.filter(function (r) { return r.id !== repDel.dataset.repDel; }); renderReportRows(); toast("Report deleted."); })
      .catch(function (err) { toast("Could not delete: " + err.message); });
    return;
  }

  const delUser = event.target.closest("[data-del-user]");
  if (delUser) {
    if (!window.confirm("Remove this login from the database? They will no longer be able to sign in.")) return;
    const gone = peopleCache.filter(function (r) { return r.id === delUser.dataset.delUser; })[0];
    fbAdminFn("adminDeleteUser", { uid: delUser.dataset.delUser })
      .catch(function (e) { toast("The Firebase account could not be deleted (" + e.message + "). Delete it in Firebase Console."); })
      .then(function () { return fbDelete("users", delUser.dataset.delUser); })
      .then(function () { logAudit("login_removed", delUser.dataset.delUser, (gone && gone.fields.name) || ""); toast("Login removed."); loadPeople(); })
      .catch(function (err) { toast("Could not remove: " + err.message); });
    return;
  }

  if (event.target.closest("[data-subs-csv]")) { downloadSubsCsv(); return; }

  if (event.target.closest("[data-add-company]")) {
    const name = document.getElementById("nc-name").value.trim();
    const file = document.getElementById("nc-logo").files[0];
    if (!name) { toast("Type the company\u2019s name."); return; }
    readLogoFile(file).then(function (logo) {
      return fbSaveCompany(slugOf(name), { name: name, logo: logo });
    }).then(function () { logAudit("company_added", name, ""); toast(name + " added."); loadCompaniesTab(); document.getElementById("nc-name").value = ""; })
      .catch(function (e) { toast("Could not add: " + e.message); });
    return;
  }
  const delCompany = event.target.closest("[data-del-company]");
  if (delCompany) {
    if (!window.confirm("Remove this company? Any corporate logins assigned to it keep working, but lose the custom branding and form until reassigned.")) return;
    fbDelete("companies", delCompany.dataset.delCompany)
      .then(function () { logAudit("company_removed", delCompany.dataset.delCompany, ""); toast("Company removed."); loadCompaniesTab(); })
      .catch(function (e) { toast("Could not remove: " + e.message); });
    return;
  }

  if (event.target.closest("[data-add-library]")) {
    const name = document.getElementById("nl-name").value.trim();
    if (!name) { toast("Type the item\u2019s text."); return; }
    fbSaveLibraryItem(name, document.getElementById("nl-team").value)
      .then(function () { logAudit("library_item_added", name, ""); toast("Added."); loadLibraryTab(); document.getElementById("nl-name").value = ""; })
      .catch(function (e) { toast("Could not add: " + e.message); });
    return;
  }
  if (event.target.closest("[data-bulk-library]")) {
    const lines = document.getElementById("nl-bulk").value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) { toast("Paste at least one line."); return; }
    Promise.all(lines.map(function (l) {
      const i = l.indexOf(",");
      return fbSaveLibraryItem(i === -1 ? l : l.slice(0, i), i === -1 ? "" : l.slice(i + 1));
    })).then(function () { logAudit("library_imported", lines.length + " items", ""); toast(lines.length + " item" + (lines.length === 1 ? "" : "s") + " imported."); document.getElementById("nl-bulk").value = ""; loadLibraryTab(); })
      .catch(function (e) { toast("Import stopped: " + e.message); });
    return;
  }
  const delLibrary = event.target.closest("[data-del-library]");
  if (delLibrary) {
    fbDelete("item_library", delLibrary.dataset.delLibrary)
      .then(function () { logAudit("library_item_removed", delLibrary.dataset.delLibrary, ""); toast("Removed."); loadLibraryTab(); })
      .catch(function (e) { toast("Could not remove: " + e.message); });
    return;
  }

  if (event.target.closest("[data-add-trainer]")) {
    const name = document.getElementById("nt-name").value.trim();
    if (!name) { toast("Type the trainer\u2019s name."); return; }
    fbSaveTrainer(name, document.getElementById("nt-team").value)
      .then(function () { logAudit("trainer_added", name, ""); toast(name + " added."); loadTrainersAdmin(); document.getElementById("nt-name").value = ""; })
      .catch(function (e) { toast("Could not add: " + e.message); });
    return;
  }
  if (event.target.closest("[data-bulk-trainers]")) {
    const lines = document.getElementById("nt-bulk").value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) { toast("Paste at least one name."); return; }
    Promise.all(lines.map(function (l) {
      const i = l.indexOf(",");
      return fbSaveTrainer(i === -1 ? l : l.slice(0, i), i === -1 ? "" : l.slice(i + 1));
    })).then(function () { logAudit("trainers_imported", lines.length + " names", ""); toast(lines.length + " trainer" + (lines.length === 1 ? "" : "s") + " imported."); document.getElementById("nt-bulk").value = ""; loadTrainersAdmin(); })
      .catch(function (e) { toast("Import stopped: " + e.message); });
    return;
  }
  const delTrainer = event.target.closest("[data-del-trainer]");
  if (delTrainer) {
    fbDelete("trainers", delTrainer.dataset.delTrainer)
      .then(function () { logAudit("trainer_removed", delTrainer.dataset.delTrainer, ""); toast("Trainer removed."); loadTrainersAdmin(); })
      .catch(function (e) { toast("Could not remove: " + e.message); });
    return;
  }

  if (event.target.closest("[data-add-user]")) {
    const name = document.getElementById("nu-name").value.trim();
    const email = document.getElementById("nu-email").value.trim().toLowerCase();
    const typed = document.getElementById("nu-pass").value.trim();
    if (!name || !EMAIL_RE.test(email)) { toast("Name and a valid email, please."); return; }
    if (typed && typed.length < 6) { toast("A typed password must be at least 6 characters."); return; }
    if (!FB || !session) { toast("Sign in with Firebase to add logins."); return; }
    const newRole = document.getElementById("nu-role").value;
    const generated = !typed, password = typed || genPassword();
    createLogin(email, password, { name: name, role: newRole, title: "" })
      .then(async function () {
        logAudit("login_created", email, name + " (" + newRole + ")");
        try {
          await fbSendReset(email);
          toast(name + " was added. A set-password email is on its way to " + email + ".");
        } catch (e) {
          toast(name + " was added, but the email could not be sent (" + e.message + ").");
          if (generated) window.prompt("Copy this temporary password and give it to " + name + " (it is not shown again):", password);
        }
        openAdmin("people");
      })
      .catch(function (err) { toast(err.message); });
    return;
  }

  const delPost = event.target.closest("[data-del-post]");
  if (delPost) {
    if (newsPosts.length < 2) { toast("Keep at least one card."); return; }
    newsPosts.splice(Number(delPost.dataset.delPost), 1);
    persist("posts", newsPosts);
    renderNews();
    openAdmin("posts");
    toast("Card deleted.");
    return;
  }

  if (event.target.closest("[data-add-post]")) {
    const palette = ["lime", "lilac", "coral"];
    newsPosts.push({
      source: "New source", category: "Field notes", title: "A new headline",
      excerpt: "What this piece is about, in a sentence or two.",
      date: "5 min read", color: palette[newsPosts.length % 3], url: "#contact",
    });
    persist("posts", newsPosts);
    renderNews();
    openAdmin("posts");
    return;
  }

  if (event.target.closest("[data-reset-brand]")) {
    brand = {};
    persist("brand", brand);
    BRAND_TOKENS.forEach(function (t) { document.documentElement.style.removeProperty(t[0]); });
    openAdmin("brand");
    toast("Colours reset.");
    return;
  }

  const heroPick = event.target.closest("[data-hero]");
  if (heroPick) {
    heroChoice = heroPick.dataset.hero;
    persist("hero", heroChoice);
    applyHero();
    openAdmin("hero");
    toast("Hero artwork updated.");
    return;
  }

  if (event.target.closest("[data-reset-copy]")) {
    content = {};
    persist("content", content);
    toast("Copy reset. Reload to see the originals.");
    return;
  }

  if (event.target.closest("[data-save-copy]")) {
    Array.from(modalBody.querySelectorAll("[data-copy]")).forEach(function (f) {
      content[f.dataset.copy] = f.value;
    });
    persist("content", content);
    applyContent();
    toast("Copy updated.");
    closeModal();
    return;
  }

  if (event.target.closest("[data-save-phases]")) {
    Array.from(modalBody.querySelectorAll("[data-phase-edit]")).forEach(function (f) {
      const ph = phases[Number(f.dataset.phaseEdit)];
      if (f.dataset.field === "services") ph.services = f.value.split("\n").filter(Boolean);
      else ph[f.dataset.field] = f.value;
    });
    persist("phases", phases);
    renderTimeline();
    renderPhaseDetail();
    toast("Phases updated.");
    closeModal();
    return;
  }

  const delTile = event.target.closest("[data-del-tile]");
  if (delTile) {
    services.splice(Number(delTile.dataset.delTile), 1);
    persist("services", services);
    renderPhaseFilters(); renderServices();
    openAdmin("tiles");
    return;
  }

  if (event.target.closest("[data-add-tile]")) {
    services.push({ phase: "Diagnose", phaseNumber: "01", title: "New service",
      description: "What this service does, in a sentence.", type: "Toolkit",
      accent: "lime", icon: "compass", status: "Ready" });
    persist("services", services);
    renderPhaseFilters(); renderServices();
    openAdmin("tiles");
    return;
  }

  if (event.target.closest("[data-save-tiles]")) {
    Array.from(modalBody.querySelectorAll("[data-tile]")).forEach(function (f) {
      services[Number(f.dataset.tile)][f.dataset.field] = f.value;
    });
    persist("services", services);
    renderPhaseFilters(); renderServices();
    toast("Service tiles updated.");
    closeModal();
    return;
  }

  if (event.target.closest("[data-save-plans]")) {
    Array.from(modalBody.querySelectorAll("[data-plan]")).forEach(function (f) {
      const parts = f.dataset.plan.split(":");
      const plan = memberships[parts[0]][Number(parts[1])];
      if (f.dataset.field === "items") plan.items = f.value.split("\n").filter(Boolean);
      else plan[f.dataset.field] = f.value;
    });
    persist("plans", memberships);
    renderMemberships();
    toast("Plans updated.");
    closeModal();
    return;
  }

  if (event.target.closest("[data-save-posts]")) {
    Array.from(modalBody.querySelectorAll("[data-post]")).forEach(function (input) {
      newsPosts[Number(input.dataset.post)][input.dataset.field] = input.value;
    });
    persist("posts", newsPosts);
    renderNews();
    toast("Field notes updated.");
    closeModal();
  }
});


/* -----------------------------------------------------------------------------
   8d. BRAND, COPY AND HERO — the rest of the admin console
   -------------------------------------------------------------------------- */

const BRAND_TOKENS = [
  ["--ink", "Ink", "Headlines, dark bands, body text"],
  ["--background", "Page", "The base colour behind everything"],
  ["--paper-light", "Panels", "Cards, dialogs, the genie popup"],
  ["--lime", "Lime", "Primary accent and buttons"],
  ["--lilac", "Lilac", "Membership band and second accent"],
  ["--coral", "Coral", "Third accent and avatars"],
  ["--aqua", "Aqua", "Newsletter panel"],
  ["--yellow", "Yellow", "Phase accent"],
  ["--sky", "Sky", "Phase accent"],
];

function applyBrand() {
  BRAND_TOKENS.forEach(function (t) {
    if (brand[t[0]]) document.documentElement.style.setProperty(t[0], brand[t[0]]);
  });
}

function applyContent() {
  Object.keys(content).forEach(function (key) {
    const el = document.querySelector('[data-cms="' + key + '"]');
    if (el) el.textContent = content[key];
  });
}

function applyHero() {
  if (!heroChoice) return;
  const art = document.querySelector(".hero-art");
  if (heroChoice.indexOf("data:") === 0) {
    art.style.setProperty("--hero-image", 'url("' + heroChoice + '")');
  } else {
    document.documentElement.className = document.documentElement.className
      .replace(/\bhero-\d+\b/g, "").trim() + " hero-" + heroChoice;
  }
}

function readToken(name) {
  return brand[name] || getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#000000";
}

function adminBrand() {
  return (
    '<p class="admin-note">Colours apply to every page at once. They are stored in this browser.</p>' +
    BRAND_TOKENS.map(function (t) {
      return (
        '<div class="pref-row"><div><strong>' + t[1] + "</strong><span>" + t[2] + "</span></div>" +
        '<span class="colour-field"><input type="color" data-token="' + t[0] + '" value="' + readToken(t[0]) + '" />' +
        '<code>' + readToken(t[0]) + "</code></span></div>"
      );
    }).join("") +
    '<div class="modal-actions"><button class="ghost-button" data-reset-brand>Reset to defaults</button></div>'
  );
}

function adminHero() {
  let out = '<p class="admin-note">Pick one of the built-in artworks, or upload your own. Uploads are stored in this browser.</p><div class="hero-picker">';
  for (let i = 1; i <= 7; i++) {
    out += '<button data-hero="' + i + '" class="' + (heroChoice === String(i) ? "selected" : "") +
      '" style="background-image:url(assets/hero-' + i + '.jpg)"><span>' + i + "</span></button>";
  }
  out += "</div>";
  if (heroChoice && heroChoice.indexOf("data:") === 0) {
    out += '<div class="hero-custom"><img src="' + heroChoice + '" alt="" /><div><strong>Your upload is in use</strong>' +
      '<button class="ghost-button small" data-hero="1">Use a built-in instead</button></div></div>';
  }
  out += '<label for="hero-upload">Upload artwork (JPG or PNG, 2560×1440 works best)</label>' +
    '<input type="file" id="hero-upload" accept="image/*" />';
  return out;
}

function adminCopy() {
  const groups = {};
  Array.from(document.querySelectorAll("[data-cms]")).forEach(function (el) {
    const key = el.dataset.cms;
    const group = key.split(".")[0];
    (groups[group] = groups[group] || []).push([key, content[key] !== undefined ? content[key] : el.textContent.trim()]);
  });
  const titles = {
    hero: "Hero", premise: "Premise", system: "The system", plans: "Membership",
    notes: "Field notes", news: "Newsletter", footer: "Footer", auth: "Sign in",
  };
  return (
    '<p class="admin-note">Every heading and paragraph on the site. Edit and save — nothing else changes.</p>' +
    Object.keys(groups).map(function (g) {
      return (
        '<div class="copy-group"><strong>' + (titles[g] || g) + "</strong>" +
        groups[g].map(function (pair) {
          const long = pair[1].length > 70;
          return '<label>' + pair[0].split(".")[1] + "</label>" +
            (long
              ? '<textarea data-copy="' + pair[0] + '" rows="3">' + esc(pair[1]) + "</textarea>"
              : '<input data-copy="' + pair[0] + '" value="' + esc(pair[1]) + '" />');
        }).join("") +
        "</div>"
      );
    }).join("") +
    '<div class="modal-actions"><button class="ghost-button" data-reset-copy>Reset all copy</button>' +
    '<button class="auth-submit compact" data-save-copy>Save copy ' + ic("check", 15) + "</button></div>"
  );
}

function adminPhases() {
  return (
    '<p class="admin-note">The nine nodes on the timeline. Services become the chips inside each popdown.</p>' +
    phases.map(function (ph, i) {
      return (
        '<div class="admin-post"><div class="admin-post-top"><span class="swatch ' + ph.accent + '"></span>' +
        "<strong>" + ph.number + "</strong>" + "</div>" +
        '<div class="admin-grid"><input data-phase-edit="' + i + '" data-field="title" value="' + esc(ph.title) + '" placeholder="Title" />' +
        '<div class="select-wrap"><select data-phase-edit="' + i + '" data-field="accent">' +
        ["lime","lilac","coral","sky","yellow","peach","aqua","lavender","green"].map(function (c) {
          return '<option' + (ph.accent === c ? " selected" : "") + ">" + c + "</option>";
        }).join("") + "</select>" + ic("chevron-down", 15) + "</div></div>" +
        '<input data-phase-edit="' + i + '" data-field="note" value="' + esc(ph.note) + '" placeholder="One-line note" />' +
        '<label>Services, one per line</label>' +
        '<textarea data-phase-edit="' + i + '" data-field="services" rows="4">' + esc(ph.services.join("\n")) + "</textarea></div>"
      );
    }).join("") +
    '<div class="modal-actions"><button class="auth-submit compact" data-save-phases>Save phases ' + ic("check", 15) + "</button></div>"
  );
}

function adminTiles() {
  return (
    '<p class="admin-note">The service tiles in the workspace.</p>' +
    services.map(function (sv, i) {
      return (
        '<div class="admin-post"><div class="admin-post-top"><span class="swatch ' + sv.accent + '"></span><strong>' + sv.phase +
        '</strong><button class="icon-button" data-del-tile="' + i + '" aria-label="Delete tile">' + ic("x", 14) + "</button></div>" +
        '<input data-tile="' + i + '" data-field="title" value="' + esc(sv.title) + '" placeholder="Title" />' +
        '<label>Description</label><textarea data-tile="' + i + '" data-field="description" rows="2">' + esc(sv.description) + "</textarea>" +
        '<div class="admin-grid three"><input data-tile="' + i + '" data-field="type" value="' + esc(sv.type) + '" placeholder="Type" />' +
        '<input data-tile="' + i + '" data-field="status" value="' + esc(sv.status) + '" placeholder="Status" />' +
        '<input data-tile="' + i + '" data-field="phase" value="' + esc(sv.phase) + '" placeholder="Phase" /></div></div>'
      );
    }).join("") +
    '<div class="modal-actions"><button class="ghost-button" data-add-tile>Add a tile</button>' +
    '<button class="auth-submit compact" data-save-tiles>Save tiles ' + ic("check", 15) + "</button></div>"
  );
}

function adminPlans() {
  return (
    '<p class="admin-note">Membership cards. The individual and company sets are edited separately.</p>' +
    ["individual", "corporate"].map(function (aud) {
      return (
        '<div class="copy-group"><strong>' + (aud === "individual" ? "For individuals" : "For companies") + "</strong>" +
        memberships[aud].map(function (pl, i) {
          return (
            '<div class="admin-post"><div class="admin-post-top"><strong>' + pl.name + "</strong></div>" +
            '<div class="admin-grid"><input data-plan="' + aud + ":" + i + '" data-field="name" value="' + esc(pl.name) + '" placeholder="Name" />' +
            '<input data-plan="' + aud + ":" + i + '" data-field="price" value="' + esc(pl.price) + '" placeholder="Price" /></div>' +
            '<div class="admin-grid"><input data-plan="' + aud + ":" + i + '" data-field="eyebrow" value="' + esc(pl.eyebrow) + '" placeholder="Eyebrow" />' +
            '<input data-plan="' + aud + ":" + i + '" data-field="cta" value="' + esc(pl.cta) + '" placeholder="Button" /></div>' +
            '<label>Description</label><textarea data-plan="' + aud + ":" + i + '" data-field="copy" rows="2">' + esc(pl.copy) + "</textarea>" +
            '<label>Features, one per line</label><textarea data-plan="' + aud + ":" + i + '" data-field="items" rows="4">' + esc(pl.items.join("\n")) + "</textarea></div>"
          );
        }).join("") + "</div>"
      );
    }).join("") +
    '<div class="modal-actions"><button class="auth-submit compact" data-save-plans>Save plans ' + ic("check", 15) + "</button></div>"
  );
}

/* -----------------------------------------------------------------------------
   9. SHARED EVENTS
   -------------------------------------------------------------------------- */

document.addEventListener("click", function (event) {
  const themeBtn = event.target.closest("[data-theme-btn]");
  if (themeBtn) {
    toggleTheme();
    return;
  }

  const scroller = event.target.closest("[data-scroll]");
  if (scroller) {
    document.getElementById("home-nav").classList.remove("is-open");
    document.getElementById("home-menu-btn").innerHTML = ic("menu", 20);
    scrollToId(scroller.dataset.scroll);
    return;
  }

  const goto = event.target.closest("[data-goto]");
  if (goto) {
    const target = goto.dataset.goto;
    if (target === "home") {
      if (currentUser || session) { signOut(); return; }
      currentUser = null;
    }
    showView(target);
    return;
  }

  const toastBtn = event.target.closest("[data-toast]");
  if (toastBtn) toast("This doorway is opening soon.");
});

/* -----------------------------------------------------------------------------
   10. START
   -------------------------------------------------------------------------- */

// Clear any local logins left behind by the old demo sign-in.
try { localStorage.removeItem("ggAccounts"); } catch (e) {}
brand = readStore("ggBrand", {});
content = readStore("ggContent", {});
heroChoice = (function () { try { return localStorage.getItem("ggHero"); } catch (e) { return null; } })();
const storedPhases = readStore("ggPhases", null);
if (storedPhases) phases.length = 0, storedPhases.forEach(function (p) { phases.push(p); });
const storedServices = readStore("ggServices", null);
if (storedServices) services.length = 0, storedServices.forEach(function (x) { services.push(x); });
const storedPlans = readStore("ggPlans", null);
if (storedPlans) { memberships.individual = storedPlans.individual; memberships.corporate = storedPlans.corporate; }
applyBrand();
applyContent();
applyHero();

// If Supabase is connected, load the shared version over the top once it arrives.
if (BACKEND) {
  backendLoad().then(function (remote) {
    if (!remote) return;
    if (remote.brand) { brand = remote.brand; writeStore("ggBrand", brand); applyBrand(); }
    if (remote.content) { content = remote.content; writeStore("ggContent", content); applyContent(); }
    if (remote.hero) { heroChoice = remote.hero; writeStore("ggHero", heroChoice); applyHero(); }
    if (remote.features) { features = remote.features; writeStore("ggFeatures", features); applyFeatures(); }
    if (remote.phases) { phases.length = 0; remote.phases.forEach(function (x) { phases.push(x); }); renderTimeline(); renderPhaseDetail(); }
    if (remote.services) { services.length = 0; remote.services.forEach(function (x) { services.push(x); }); renderPhaseFilters(); renderServices(); }
    if (remote.plans) { memberships.individual = remote.plans.individual; memberships.corporate = remote.plans.corporate; renderMemberships(); }
    if (remote.posts) { newsPosts = remote.posts; writeStore("ggNews", newsPosts); renderNews(); }
  });
}
features = readStore("ggFeatures", defaultFeatures);
newsPosts = readStore("ggNews", null) || news.slice();
applyTheme();
applyFeatures();
renderTimeline();
renderPhaseDetail();
renderGenie();
renderNews();
renderMemberships();
renderPhaseFilters();
document.getElementById("home-menu-btn").innerHTML = ic("menu", 20);
document.getElementById("dash-menu-btn").innerHTML = ic("menu", 20);
renderPasswordToggle();
hydrateIcons(document);

// How soon the pop-up appears is set in assets/backend-config.js (window.GG_SETTINGS.signupPopupDelayMs).
setTimeout(openSignup, window.GG_SETTINGS && typeof window.GG_SETTINGS.signupPopupDelayMs === "number" ? window.GG_SETTINGS.signupPopupDelayMs : 1200);

/* Unsubscribe dialog: the footer link, the pop-up's fine print, or a link like  site/#unsubscribe  or  site/?unsubscribe=you@x.com */
const unsubVeil = document.getElementById("unsub-veil");
function openUnsub(email) {
  signupVeil.hidden = true;
  try { sessionStorage.setItem("ggSignupSeen", "1"); } catch (e) {}
  unsubVeil.hidden = false;
  hydrateIcons(unsubVeil);
  const input = document.getElementById("unsub-email");
  input.value = email || "";
  document.getElementById("unsub-note").textContent = "";
  input.focus();
}
function closeUnsub() { unsubVeil.hidden = true; }
document.addEventListener("click", function (event) {
  if (!event.target.closest("[data-open-unsub]")) return;
  event.preventDefault();
  openUnsub();
});
document.getElementById("unsub-close").addEventListener("click", closeUnsub);
unsubVeil.addEventListener("click", function (event) { if (event.target === unsubVeil) closeUnsub(); });
document.addEventListener("keydown", function (event) { if (event.key === "Escape" && !unsubVeil.hidden) closeUnsub(); });
document.getElementById("unsub-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const note = document.getElementById("unsub-note");
  const r = await unsubscribeEmail(document.getElementById("unsub-email").value);
  if (!r.ok) { note.textContent = r.reason === "invalid" ? "That email does not look right." : "Could not do that just now. Please try again."; return; }
  try { localStorage.removeItem("ggSubscribed"); } catch (e) {}
  note.textContent = "Done. That address will not get any more emails from us.";
  toast("You\u2019ve been unsubscribed.");
});
(function () {
  const q = new URLSearchParams(window.location.search).get("unsubscribe");
  if (q !== null || window.location.hash === "#unsubscribe") openUnsub(q || "");
})();

fbRestore()
  .then(function (account) {
    if (!account) return;
    currentUser = userFromAccount(account);
    renderDashboard();
    showView("dashboard");
  })
  .catch(function (e) { console.warn("Session restore failed:", e.message); });

window.addEventListener("resize", function () {
  const shown = hoverPhase || selectedPhase;
  if (shown) positionPop(shown.number);
});
