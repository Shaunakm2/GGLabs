/* =============================================================================
   Optional Cloud Functions for GG Learning Labs
   -----------------------------------------------------------------------------
   The website cannot disable or delete a Firebase sign-in account by itself: that
   needs admin credentials, which must never be in a web page. These two small
   functions do it on the server, and only for a signed-in admin.

     adminCreateUser   { email, password, name, role, title }   create a login and its users/{uid} profile
     adminSetDisabled  { uid, disabled }   turn a Firebase login off or back on
     adminDeleteUser   { uid }             delete the Firebase login and its users/{uid} profile

   Deploy:  firebase deploy --only functions       (needs the Blaze plan)
   Then put the base URL in assets/backend-config.js (window.GG_FUNCTIONS.baseUrl).
   Not run against a real project by the author: try it on a test login first.
   ========================================================================== */
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

// Tighten this to your site's address, e.g. cors: ["https://gglearninglabs.com"].
const OPTIONS = { cors: true, region: "us-central1" };

// Returns the caller's uid if they are a signed-in admin; otherwise answers the request and returns null.
async function requireAdmin(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return null; }
  const m = /^Bearer (.+)$/.exec(req.get("Authorization") || "");
  if (!m) { res.status(401).json({ error: "Sign in first" }); return null; }
  let decoded;
  try { decoded = await admin.auth().verifyIdToken(m[1]); }
  catch (e) { res.status(401).json({ error: "Invalid token" }); return null; }
  const snap = await admin.firestore().doc("users/" + decoded.uid).get();
  if (!snap.exists || snap.get("role") !== "admin" || snap.get("active") === "false") {
    res.status(403).json({ error: "Admins only" });
    return null;
  }
  return decoded.uid;
}

exports.adminCreateUser = onRequest(OPTIONS, async (req, res) => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  const { email, password, name, role, title } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string" || password.length < 6 || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "email, name and a password of 6+ characters are required" });
    return;
  }
  const safeRole = ["individual", "corporate", "admin"].indexOf(role) !== -1 ? role : "individual";
  try {
    const user = await admin.auth().createUser({ email, password, displayName: name });
    await admin.firestore().doc("users/" + user.uid).set({
      name: name.trim(), email: email.toLowerCase(), role: safeRole, title: typeof title === "string" ? title : "",
      active: "true", tools: "tof,eff", createdAt: new Date().toISOString(),
    });
    res.json({ ok: true, uid: user.uid });
  } catch (e) {
    res.status(e.code === "auth/email-already-exists" ? 409 : 500).json({ error: String(e.code || e.message || e) });
  }
});

exports.adminSetDisabled = onRequest(OPTIONS, async (req, res) => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  const { uid, disabled } = req.body || {};
  if (typeof uid !== "string" || typeof disabled !== "boolean") { res.status(400).json({ error: "uid and disabled are required" }); return; }
  if (uid === caller) { res.status(400).json({ error: "You cannot disable yourself" }); return; }
  try {
    await admin.auth().updateUser(uid, { disabled });
    if (disabled) await admin.auth().revokeRefreshTokens(uid);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

exports.adminDeleteUser = onRequest(OPTIONS, async (req, res) => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  const { uid } = req.body || {};
  if (typeof uid !== "string") { res.status(400).json({ error: "uid is required" }); return; }
  if (uid === caller) { res.status(400).json({ error: "You cannot delete yourself" }); return; }
  try {
    try { await admin.auth().deleteUser(uid); }
    catch (e) { if (e.code !== "auth/user-not-found") throw e; }
    await admin.firestore().doc("users/" + uid).delete();   // their saved reports are kept
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});
