/* A small in-memory stand-in for Firebase (sign-in + Firestore REST) used by the browser tests. */
// ---- fake Firebase
const db = { users: {}, subscribers: {}, site_config: {}, reports: {}, audit_log: {}, trainers: {}, scoring_templates: {}, companies: {}, item_library: {} }; let rid = 0;
const resets = [], fnCalls = []; globalThis.__failReports = 0;
const auth = { "admin@x.com": { pw: "adminpw", uid: "U_ADMIN" }, "noprof@x.com": { pw: "pw1234", uid: "U_NOPROF" }, "ind@x.com": { pw: "indpw12", uid: "U_IND" } };
db.users.U_ADMIN = { name: "Admin Person", role: "admin", title: "Super admin" };
db.users.U_IND = { name: "Indie User", role: "individual", title: "" };
const tokens = {}; let calls = [];
function fsDoc(coll, id, f) { const fields = {}; Object.keys(f).forEach(k => fields[k] = { stringValue: f[k] }); return { name: "projects/p/databases/(default)/documents/" + coll + "/" + id, fields }; }
function fakeFetch(url, opts = {}) {
  url = String(url); calls.push((opts.method || "GET") + " " + url.replace(/key=[^&]+/, "key=K"));
  const json = (status, body) => { const r = { ok: status < 300, status, json: async () => body, clone: () => r }; return Promise.resolve(r); };
  const body = opts.body && opts.body[0] === "{" ? JSON.parse(opts.body) : null;
  const bearer = (opts.headers && opts.headers.Authorization || "").replace("Bearer ", "");
  const who = tokens[bearer];
  if (url.includes("accounts:signInWithPassword")) {
    const a = auth[body.email]; if (!a || a.pw !== body.password) return json(400, { error: { message: "INVALID_LOGIN_CREDENTIALS" } });
    const t = "tok_" + a.uid + "_" + Object.keys(tokens).length; tokens[t] = a.uid;
    return json(200, { idToken: t, localId: a.uid, email: body.email, refreshToken: "ref_" + a.uid, expiresIn: "3600" });
  }
  if (url.includes("securetoken.googleapis.com")) {
    const uid = decodeURIComponent(opts.body.split("refresh_token=")[1]).replace("ref_", "");
    const t = "tok_" + uid + "_r" + Object.keys(tokens).length; tokens[t] = uid;
    return json(200, { id_token: t, refresh_token: "ref_" + uid, user_id: uid, expires_in: "3600" });
  }
  if (url.includes("accounts:signUp")) {
    if (auth[body.email]) return json(400, { error: { message: "EMAIL_EXISTS" } });
    if (body.password.length < 6) return json(400, { error: { message: "WEAK_PASSWORD : Password should be at least 6 characters" } });
    const uid = "U_" + body.email.split("@")[0]; auth[body.email] = { pw: body.password, uid };
    return json(200, { localId: uid, idToken: "newtok", email: body.email });
  }
  if (url.includes("accounts:sendOobCode")) { resets.push(body.email); return json(200, {}); }
  if (url.startsWith("https://fn.test/")) {
    const fn = url.split("/").pop(); fnCalls.push({ fn, body, who });
    const admin = who && db.users[who] && db.users[who].role === "admin"; if (!admin) return json(403, {});
    if (fn === "adminCreateUser") {
      if (auth[body.email]) return json(409, { error: "auth/email-already-exists" });
      const uid = "U_" + body.email.split("@")[0]; auth[body.email] = { pw: body.password, uid };
      db.users[uid] = { name: body.name, email: body.email, role: body.role, title: body.title || "", active: "true", tools: "tof,eff" };
      return json(200, { ok: true, uid });
    }
    return json(200, { ok: true });
  }
  if (url.includes(":runQuery")) {
    const want = body.structuredQuery.where.fieldFilter.value.stringValue;
    if (!who || who !== want) return json(403, {});   // rules: you may only query your own
    const rows = Object.keys(db.reports).filter(k => db.reports[k].uid === want).map(k => ({ document: fsDoc("reports", k, db.reports[k]) }));
    return json(200, rows.length ? rows : [{ readTime: "x" }]);
  }
  const m = /documents\/([a-z_]+)(?:\/([^?]+))?(\?|$)/.exec(url);
  if (m) {
    const coll = m[1], id = m[2] && decodeURIComponent(m[2]); const method = opts.method || "GET";
    const isAdmin = who && db.users[who] && db.users[who].role === "admin";
    const flat = f => { const o = {}; Object.keys(f || {}).forEach(k => o[k] = f[k].stringValue); return o; };
    if (coll === "users") {
      if (method === "GET" && id) { if (!who || (who !== id && !isAdmin)) return json(403, {}); return db.users[id] ? json(200, fsDoc("users", id, db.users[id])) : json(404, {}); }
      if (method === "GET") { if (!isAdmin) return json(403, {}); return json(200, { documents: Object.keys(db.users).map(k => fsDoc("users", k, db.users[k])) }); }
      if (method === "PATCH") {
        if (!isAdmin) return json(403, {});
        if (url.includes("updateMask")) {
          const masked = Array.from(url.matchAll(/updateMask\.fieldPaths=([^&]+)/g)).map(m => decodeURIComponent(m[1]));
          const cur = db.users[id] || {}, incoming = flat(body.fields);
          masked.forEach(k => { if (k in incoming) cur[k] = incoming[k]; else delete cur[k]; });
          db.users[id] = cur;
        } else db.users[id] = flat(body.fields);
        return json(200, {});
      }
      if (method === "DELETE") { if (!isAdmin) return json(403, {}); delete db.users[id]; return json(200, {}); }
    }
    if (coll === "reports") {
      if (method === "POST") {
        if (globalThis.__failReports > 0) { globalThis.__failReports--; return Promise.reject(new TypeError("Failed to fetch")); }
        const f = flat(body.fields), prof = db.users[who] || {};
        if (!Object.keys(f).every(k => ["uid", "name", "email", "type", "title", "score", "scoring", "companyScoring", "createdAt", "payload"].includes(k))) return json(403, {});
        const allowedTools = (prof.tools === undefined ? "tof,eff" : prof.tools).split(",");
        if (!who || f.uid !== who || !["tof", "eff"].includes(f.type) || prof.active === "false" || !allowedTools.includes(f.type) || f.scoring !== (prof.scoring || "")) return json(403, {});
        const nid = "R" + (++rid); db.reports[nid] = f; return json(200, fsDoc("reports", nid, f));
      }
      if (method === "GET" && !id) { if (!isAdmin) return json(403, {}); return json(200, { documents: Object.keys(db.reports).map(k => fsDoc("reports", k, db.reports[k])) }); }
      if (method === "GET" && id) { if (!who || (!isAdmin && db.reports[id] && db.reports[id].uid !== who)) return json(403, {}); return db.reports[id] ? json(200, fsDoc("reports", id, db.reports[id])) : json(404, {}); }
      if (method === "PATCH") return json(403, {});
      if (method === "DELETE") { if (!isAdmin) return json(403, {}); delete db.reports[id]; return json(200, {}); }
    }
    if (coll === "audit_log") {
      if (method === "POST") { const f = flat(body.fields); if (!who || f.actor !== who) return json(403, {}); db.audit_log["A" + (++rid)] = f; return json(200, fsDoc("audit_log", "A" + rid, f)); }
      if (method === "GET") { if (!isAdmin) return json(403, {}); return json(200, { documents: Object.keys(db.audit_log).map(k => fsDoc("audit_log", k, db.audit_log[k])) }); }
    }
    if (coll === "trainers") {
      if (method === "GET") { if (!who) return json(403, {}); return json(200, { documents: Object.keys(db.trainers).map(k => fsDoc("trainers", k, db.trainers[k])) }); }
      if (method === "PATCH") { if (!isAdmin) return json(403, {}); db.trainers[id] = flat(body.fields); return json(200, {}); }
      if (method === "DELETE") { if (!isAdmin) return json(403, {}); delete db.trainers[id]; return json(200, {}); }
    }
    if (coll === "item_library") {
      if (method === "GET") { if (!who) return json(403, {}); return json(200, { documents: Object.keys(db.item_library).map(k => fsDoc("item_library", k, db.item_library[k])) }); }
      if (method === "PATCH") { if (!isAdmin) return json(403, {}); db.item_library[id] = flat(body.fields); return json(200, {}); }
      if (method === "DELETE") { if (!isAdmin) return json(403, {}); delete db.item_library[id]; return json(200, {}); }
    }
    if (coll === "companies") {
      if (method === "GET" && !id) { if (!who) return json(403, {}); return json(200, { documents: Object.keys(db.companies).map(k => fsDoc("companies", k, db.companies[k])) }); }
      if (method === "GET") { if (!who) return json(403, {}); return db.companies[id] ? json(200, fsDoc("companies", id, db.companies[id])) : json(404, {}); }
      if (method === "PATCH") {
        const prof = db.users[who] || {};
        const isOwnCorporate = who && prof.role === "corporate" && prof.companyId === id;
        if (!isAdmin && !isOwnCorporate) return json(403, {});
        const incoming = flat(body.fields);
        if (!isAdmin && Object.keys(incoming).some(k => !["name", "logo", "tof", "scoring"].includes(k))) return json(403, {});
        if (url.includes("updateMask")) {
          const masked = Array.from(url.matchAll(/updateMask\.fieldPaths=([^&]+)/g)).map(m => decodeURIComponent(m[1]));
          const cur = db.companies[id] || {};
          masked.forEach(k => { if (k in incoming) cur[k] = incoming[k]; else delete cur[k]; });
          db.companies[id] = cur;
        } else db.companies[id] = incoming;
        return json(200, {});
      }
      if (method === "DELETE") { if (!isAdmin) return json(403, {}); delete db.companies[id]; return json(200, {}); }
    }
    if (coll === "scoring_templates") {
      if (!isAdmin) return json(403, {});
      if (method === "GET") return json(200, { documents: Object.keys(db.scoring_templates).map(k => fsDoc("scoring_templates", k, db.scoring_templates[k])) });
      if (method === "PATCH") { db.scoring_templates[id] = flat(body.fields); return json(200, {}); }
    }
    if (coll === "subscribers" && method === "DELETE") { delete db.subscribers[id]; return json(200, {}); }
    if (coll === "subscribers") {
      if (method === "POST") { const docId = decodeURIComponent(/documentId=([^&]+)/.exec(url)[1]); const f = flat(body.fields);
        if (!Object.keys(f).every(k => ["email", "source", "createdAt"].includes(k)) || f.email !== docId || docId !== docId.toLowerCase() || !/.+@.+[.].+/.test(docId)) return json(403, {});
        if (db.subscribers[docId]) return json(409, {}); db.subscribers[docId] = f; return json(200, {}); }
      if (method === "GET") { if (!isAdmin) return json(403, {}); return json(200, { documents: Object.keys(db.subscribers).map(k => fsDoc("subscribers", k, db.subscribers[k])) }); }
    }
    if (coll === "site_config") { if (method === "GET") return json(200, { documents: [] }); if (method === "PATCH") { if (!isAdmin) return json(403, {}); return json(200, {}); } }
  }
  return json(404, {});
}

module.exports = { db, auth, resets, fnCalls, tokens, fakeFetch, fsDoc };
