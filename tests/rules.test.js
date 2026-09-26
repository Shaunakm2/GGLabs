/* Firestore security rules, run against the Firebase emulator (the real rules engine).
   Run:  npm run test:rules        (needs Java and `npm i -g firebase-tools`)
   The author could not run this in the environment the site was built in, so run it once before going live. */
const fs = require("fs"), path = require("path");
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { doc, setDoc, getDoc, getDocs, collection, query, where, deleteDoc, updateDoc } = require("firebase/firestore");

let bad = 0, n = 0;
const t = async (name, fn) => { n++; try { await fn(); console.log("ok  :", name); } catch (e) { bad++; console.log("FAIL:", name, "-", String(e.message || e).split("\n")[0]); } };

(async () => {
  const env = await initializeTestEnvironment({
    projectId: "demo-gg",
    firestore: { rules: fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8") },
  });
  const CUSTOM = '{"eff":{"effective":92}}';
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/admin"), { name: "Admin", role: "admin" });
    await setDoc(doc(db, "users/ind"), { name: "Ind", role: "individual", tools: "tof,eff", scoring: "" });
    await setDoc(doc(db, "users/tofonly"), { name: "TofOnly", role: "individual", tools: "tof" });
    await setDoc(doc(db, "users/susp"), { name: "Susp", role: "individual", active: "false" });
    await setDoc(doc(db, "users/custom"), { name: "Custom", role: "individual", scoring: CUSTOM });
    await setDoc(doc(db, "reports/r1"), { uid: "ind", type: "tof", payload: "{}" });
    await setDoc(doc(db, "reports/r2"), { uid: "custom", type: "tof", payload: "{}" });
  });
  const as = (uid) => env.authenticatedContext(uid).firestore();
  const anon = () => env.unauthenticatedContext().firestore();
  const rep = (uid, over) => Object.assign({ uid, name: "n", email: "e", type: "tof", title: "t", score: "1%", scoring: "", createdAt: "2026-09-20T00:00:00Z", payload: "{}" }, over);

  await t("participant saves a report as themselves", () => assertSucceeds(setDoc(doc(as("ind"), "reports/new1"), rep("ind"))));
  await t("cannot save as someone else", () => assertFails(setDoc(doc(as("ind"), "reports/x"), rep("admin"))));
  await t("cannot add unknown fields", () => assertFails(setDoc(doc(as("ind"), "reports/x"), rep("ind", { extra: "1" }))));
  await t("cannot save a tool they were not given", () => assertFails(setDoc(doc(as("tofonly"), "reports/x"), rep("tofonly", { type: "eff" }))));
  await t("can save the tool they were given", () => assertSucceeds(setDoc(doc(as("tofonly"), "reports/y"), rep("tofonly"))));
  await t("a suspended login cannot save", () => assertFails(setDoc(doc(as("susp"), "reports/x"), rep("susp"))));
  await t("scoring must equal the admin's profile (match)", () => assertSucceeds(setDoc(doc(as("custom"), "reports/c1"), rep("custom", { scoring: CUSTOM }))));
  await t("scoring that differs is refused", () => assertFails(setDoc(doc(as("custom"), "reports/c2"), rep("custom", { scoring: "" }))));
  await t("scoring cannot be invented when none is set", () => assertFails(setDoc(doc(as("ind"), "reports/c3"), rep("ind", { scoring: CUSTOM }))));
  await t("signed-out users cannot save", () => assertFails(setDoc(doc(anon(), "reports/x"), rep("ind"))));
  await t("read your own report", () => assertSucceeds(getDoc(doc(as("ind"), "reports/r1"))));
  await t("cannot read someone else's", () => assertFails(getDoc(doc(as("ind"), "reports/r2"))));
  await t("list your own with a uid filter", () => assertSucceeds(getDocs(query(collection(as("ind"), "reports"), where("uid", "==", "ind")))));
  await t("cannot list all reports", () => assertFails(getDocs(collection(as("ind"), "reports"))));
  await t("admin lists everything", () => assertSucceeds(getDocs(collection(as("admin"), "reports"))));
  await t("nobody edits a report", () => assertFails(updateDoc(doc(as("ind"), "reports/r1"), { title: "x" })));
  await t("participant cannot delete a report", () => assertFails(deleteDoc(doc(as("ind"), "reports/r1"))));
  await t("admin can delete a report", () => assertSucceeds(deleteDoc(doc(as("admin"), "reports/r1"))));

  await t("read your own profile", () => assertSucceeds(getDoc(doc(as("ind"), "users/ind"))));
  await t("cannot read another profile", () => assertFails(getDoc(doc(as("ind"), "users/admin"))));
  await t("cannot change your own role/scoring", () => assertFails(updateDoc(doc(as("ind"), "users/ind"), { role: "admin" })));
  await t("admin edits profiles", () => assertSucceeds(updateDoc(doc(as("admin"), "users/ind"), { active: "true" })));

  await t("trainers: signed-in read", () => assertSucceeds(getDocs(collection(as("ind"), "trainers"))));
  await t("trainers: participant cannot write", () => assertFails(setDoc(doc(as("ind"), "trainers/a"), { name: "A" })));
  await t("trainers: admin writes", () => assertSucceeds(setDoc(doc(as("admin"), "trainers/a"), { name: "A" })));
  await t("templates are admin only", () => assertFails(getDocs(collection(as("ind"), "scoring_templates"))));
  await t("site_config is public to read, admin to write", async () => { await assertSucceeds(getDocs(collection(anon(), "site_config"))); await assertFails(setDoc(doc(anon(), "site_config/x"), { value: "1" })); await assertSucceeds(setDoc(doc(as("admin"), "site_config/x"), { value: "1" })); });

  const a = (over) => Object.assign({ actor: "ind", actorName: "n", action: "a", target: "t", detail: "d", createdAt: "x" }, over);
  await t("audit: add an entry about yourself", () => assertSucceeds(setDoc(doc(as("ind"), "audit_log/a1"), a())));
  await t("audit: cannot forge another actor", () => assertFails(setDoc(doc(as("ind"), "audit_log/a2"), a({ actor: "admin" }))));
  await t("audit: only admins read", async () => { await assertFails(getDoc(doc(as("ind"), "audit_log/a1"))); await assertSucceeds(getDoc(doc(as("admin"), "audit_log/a1"))); });
  await t("audit: never edited or deleted", async () => { await assertFails(updateDoc(doc(as("admin"), "audit_log/a1"), { detail: "x" })); await assertFails(deleteDoc(doc(as("admin"), "audit_log/a1"))); });

  const sub = (email, over) => Object.assign({ email, source: "popup", createdAt: "2026-09-20T00:00:00Z" }, over);
  await t("subscribe: anyone, lowercase address", () => assertSucceeds(setDoc(doc(anon(), "subscribers/a@b.co"), sub("a@b.co"))));
  await t("subscribe: uppercase rejected", () => assertFails(setDoc(doc(anon(), "subscribers/A@B.co"), sub("A@B.co"))));
  await t("subscribe: id must equal the email", () => assertFails(setDoc(doc(anon(), "subscribers/x@b.co"), sub("y@b.co"))));
  await t("subscribe: extra fields rejected", () => assertFails(setDoc(doc(anon(), "subscribers/c@b.co"), sub("c@b.co", { x: 1 }))));
  await t("subscribe: not an address", () => assertFails(setDoc(doc(anon(), "subscribers/nope"), sub("nope"))));
  await t("subscribers cannot be read publicly", () => assertFails(getDoc(doc(anon(), "subscribers/a@b.co"))));
  await t("admin reads the list", () => assertSucceeds(getDocs(collection(as("admin"), "subscribers"))));
  await t("unsubscribe: anyone who knows the address can remove it", () => assertSucceeds(deleteDoc(doc(anon(), "subscribers/a@b.co"))));

  await env.cleanup();
  console.log(bad ? "\nrules tests: " + bad + " of " + n + " FAILED" : "rules tests: all " + n + " passed");
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(2); });
