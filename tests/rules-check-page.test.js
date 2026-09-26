/* Runs rules-check.html (the no-install rules checker) against the fake Firebase, to prove the page's own logic:
   it signs in, runs every check, cleans up what it created and restores the test participant. */
const fs = require("fs"), nodePath = require("path");
const { JSDOM, ResourceLoader, VirtualConsole } = require("jsdom");
const { db, auth, fakeFetch } = require("./fake-firebase");
const ROOT = nodePath.join(__dirname, "..") + nodePath.sep;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log("FAIL:", m); } else console.log("ok  :", m); };

db.users.U_ADMIN = { name: "Admin", role: "admin" }; auth["admin@x.com"] = { pw: "a", uid: "U_ADMIN" };
db.users.U_TEST = { name: "Tester", role: "individual", tools: "tof", scoring: '{"eff":{"effective":80}}' }; auth["test@x.com"] = { pw: "t", uid: "U_TEST" };
const before = JSON.stringify(db.users.U_TEST);

class Loader extends ResourceLoader { fetch(url) { return Promise.resolve(url.startsWith("http://localhost/") ? fs.readFileSync(ROOT + url.slice(17).split("?")[0]) : Buffer.from("")); } }
(async () => {
  const dom = new JSDOM(fs.readFileSync(ROOT + "rules-check.html", "utf8"), { url: "http://localhost/rules-check.html", runScripts: "dangerously", resources: new Loader(), virtualConsole: new VirtualConsole(), beforeParse(w) { w.fetch = fakeFetch; } });
  await sleep(200);
  const d = dom.window.document;
  d.getElementById("ae").value = "admin@x.com"; d.getElementById("ap").value = "a"; d.getElementById("pe").value = "test@x.com"; d.getElementById("pp").value = "t";
  d.getElementById("f").dispatchEvent(new dom.window.Event("submit", { cancelable: true, bubbles: true }));
  for (let i = 0; i < 100 && !/All \d+ checks passed|FAILED|Stopped/.test(d.getElementById("summary").textContent); i++) await sleep(100);
  const sum = d.getElementById("summary").textContent;
  const rows = Array.from(d.querySelectorAll("#out tr.pass, #out tr.fail"));
  console.log("   " + sum);
  rows.filter(r => r.classList.contains("fail")).forEach(r => console.log("   RED:", r.textContent));
  ok(/^All \d+ checks passed/.test(sum) && rows.length === 39, "every check behaves as the rules should (" + rows.length + " checks) against the fake");
  ok(JSON.stringify(db.users.U_TEST) === before, "the test participant's settings are restored exactly");
  ok(Object.keys(db.reports).length === 0 && !db.trainers[Object.keys(db.trainers)[0]], "reports and trainer created by the run are cleaned up");
  ok(Object.keys(db.subscribers).length === 0, "the test sign-up is removed");
  // a wrong admin password stops cleanly
  const dom2 = new JSDOM(fs.readFileSync(ROOT + "rules-check.html", "utf8"), { url: "http://localhost/rules-check.html", runScripts: "dangerously", resources: new Loader(), virtualConsole: new VirtualConsole(), beforeParse(w) { w.fetch = fakeFetch; } });
  await sleep(200); const d2 = dom2.window.document;
  d2.getElementById("ae").value = "admin@x.com"; d2.getElementById("ap").value = "WRONG"; d2.getElementById("pe").value = "test@x.com"; d2.getElementById("pp").value = "t";
  d2.getElementById("f").dispatchEvent(new dom2.window.Event("submit", { cancelable: true, bubbles: true })); await sleep(300);
  ok(/Stopped: The admin login could not sign in: the email or password was not accepted/.test(d2.getElementById("summary").textContent), "a wrong admin password names the admin login");
  const dom3 = new JSDOM(fs.readFileSync(ROOT + "rules-check.html", "utf8"), { url: "http://localhost/rules-check.html", runScripts: "dangerously", resources: new Loader(), virtualConsole: new VirtualConsole(), beforeParse(w) { w.fetch = fakeFetch; } });
  await sleep(200); const d3 = dom3.window.document;
  d3.getElementById("ae").value = "admin@x.com"; d3.getElementById("ap").value = "a"; d3.getElementById("pe").value = "test@x.com"; d3.getElementById("pp").value = "WRONG";
  d3.getElementById("f").dispatchEvent(new dom3.window.Event("submit", { cancelable: true, bubbles: true })); await sleep(300);
  ok(/Stopped: The test participant could not sign in: the email or password was not accepted/.test(d3.getElementById("summary").textContent), "a wrong participant password names the participant");
  ok(Object.keys(db.reports).length === 0 && JSON.stringify(db.users.U_TEST) === before, "a failed sign-in changes nothing");
  console.log(bad ? "\nrules-check page tests: " + bad + " FAILED" : "rules-check page tests: all passed"); process.exit(bad ? 1 : 0);
})().catch(e => { console.error("CRASH", e); process.exit(2); });
