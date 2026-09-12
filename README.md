# GG Learning Labs

**One Platform. Every L&D Need.**

A complete Learning & Development management platform — planning, design, delivery,
assessment, effectiveness measurement, people development and analytics in one
ecosystem. An LMS is one module inside it, not the whole product.

This repository contains the **frontend prototype**: plain HTML, CSS and JavaScript,
no build step, no framework, no dependencies.

---

## Running it

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

Opening `index.html` directly from disk works too, but a server matches production.

## Demo accounts

Authentication is **mocked**. Any password of six or more characters works.

| Role | Email |
|---|---|
| Super Admin | `superadmin@example.com` |
| Admin | `admin@example.com` |
| Learner | `user@example.com` |

The login page fills these in for you. Once signed in, switch persona from the
sidebar user menu without logging out.

---

## The two client instruments

Two modules are transcribed from the supplied workbooks, not invented.

### Trainer Observation Form

Seven sections and 36 criteria, verbatim from `TOF Form-Blank.xlsx`.
Section sizes: 4 / 3 / 4 / 11 / 5 / 6 / 3.

A section score is the mean of its **answered** criteria; the overall score is the
mean of the section scores. Criteria left blank are excluded from the average
rather than scored as zero, so a partially observed session is not unfairly
penalised.

### Trainer Effectiveness Calculator

The weighting was reverse-engineered from the two worked rows in
`Trainer Effectiveness.xlsx` and verified to eight decimal places:

```
Effectiveness = L1×0.30 + TOF×0.30 + Throughput×0.20
              + Utilization×0.15 + Attendance×0.05
```

| Row | Inputs | Calculated | Workbook |
|---|---|---|---|
| Nikita | 92.7 / 91.5 / 95.5 / 102 / 100 | **94.66%** | 0.9466 |
| Vandana | 94.8 / 86.96 / 93.75 / 97.43 / 80 | **91.8925%** | 0.918925 |
| Average | — | **93.27625%** | 0.9327625 |

Any component below **90%** is flagged as an area of improvement and forces a
"Needs Improvement" rating regardless of the weighted total — which is why
Vandana rates as Needs Improvement at 91.89% and is flagged "TOF, Attendance",
exactly as the workbook does.

The two are connected: submitting a TOF writes its overall score into the
trainer's effectiveness record, where it carries the 30% TOF weight.

---

## How the modules interrelate

These are not independent demos — they share one chain of evidence:

```
course ──> assessment ──> attempt ──> certificate
                             │            │
                             └──> points ─┴──> badges ──> leaderboard
                             │
                             └──> effectiveness (pre/post knowledge gain)
```

Submitting an assessment is the one write that fans out. `submitAttempt()` grades
the answers against the stored key, records the attempt, awards points from a rule
table, and — on a passed post-assessment — issues a certificate with its own serial.
Badges are **evaluated** against that evidence rather than stored as flags, so they
cannot drift out of sync.

---

## Routes

**Public** — `/index.html`, `/login.html`, `/forgot-password.html`

**Application** (28 pages under `/app/`)

Dashboard · My Learning · Training Calendar · Assessments · Certificates ·
Achievements · Competencies · Learning Paths · Coaching · Mentoring · TNA/TNI ·
Courses · Batches · Attendance · Trainers · Content Library · Effectiveness ·
Trainer Observation · Effectiveness Calculator · Reports · SOPs · Users ·
Audit Log · Platform Settings · Requests · Newsfeed · Notifications · Settings

Pages guard themselves: unauthenticated visitors are redirected to login, and a
learner who navigates directly to an admin page gets an access message rather than
a broken screen.

**No navigation item is a "Coming soon" placeholder.** Every entry is a live module.

---

## Architecture

Classic scripts with a single `window.GGL` namespace — no bundler, no ES module
CORS problems, works from `file://`. Load order is fixed in each page:

```
icons → utils → config → theme → ui → charts → data → services → shell → datatable → page
```

### The service seam

Components never touch the mock data arrays. They call services, which return
promises:

```js
GGL.services.users.listByRole('admin', { search, filters, sort, page, size })
  .then(renderTable);
```

Query work happens **inside** the service, so it can be pushed into SQL later
without the calling code changing. Writes persist to `localStorage` under
`ggl.overrides`; **Settings → Account → Reset prototype data** restores the seed.

### Real exports

Exports produce actual files. CSV/Excel are built in-browser and downloaded via a
Blob (UTF-8 with BOM so Excel opens them correctly). PDF opens a styled,
print-ready document. Certificates download as a self-contained HTML document
with a print button.

---

## Design system

Tokens live in `assets/css/tokens.css`. Components reference only semantic
variables, never raw ramps. Dark mode overrides the semantic layer, so a component
written once works in both themes.

Charts are hand-rolled inline SVG — line/area, bar, donut, gauge, horizontal bars,
sparkline. They read CSS variables, so they re-theme automatically, and carry
`role="img"` with accessible labels.

The logo is a CSS placeholder (`.logo-mark`). Drop in real assets:

```html
<img class="logo-light" src="assets/img/logo-light.svg" alt="GG Learning Labs">
<img class="logo-dark"  src="assets/img/logo-dark.svg"  alt="GG Learning Labs">
```

The theme swap rules already exist in `components.css`.

---

## Testing

```bash
node tools/smoke-test.js     # data integrity, utils, services, auth, grading,
                             # certificates, points, badges, workbook arithmetic
node tools/check-links.js    # every href, src, GGL.url(), CSS var and icon name
python3 tools/qa.py          # real browser, 28 routes, 3 viewports
```

---

## What is and isn't built

### Built and interactive

Public site · authentication · role-based shell · three dashboards · user CRUD ·
courses · batches · calendar · attendance · assessments (graded) · certificates
(downloadable) · gamification · Trainer Observation Form · Effectiveness
Calculator · TNA/TNI · competencies · trainers · content library · SOPs with
approval workflow · coaching · mentoring · requests · learning paths · newsfeed ·
audit log · platform settings · reports with real exports.

### Deliberately not built

SCORM playback · assessment question authoring · real file uploads · video
streaming · email delivery.

### Known limitations

- No backend. Data is in-memory plus `localStorage`.
- Excel export is CSV with an `.xls` extension, not a true workbook.
- Newsfeed images are data URLs in browser storage, not uploaded.
- Assessments display a time limit but do not enforce a countdown.
- The TOF has no evaluator calibration workflow yet.

---

## Security

**The role checks in this prototype are presentation, not security.**

Navigation shaping and page guards improve the experience and prevent accidents.
They are trivially bypassable from the browser console, and they are meant to be.

What this codebase does do: no secrets in source; mock authentication isolated in
`services/authService.js` behind a clear warning; all string data escaped with
`GGL.utils.esc()` before reaching `innerHTML`; password reset does not reveal
whether an account exists.

**Grading currently happens client-side, so answer keys ship to the browser.**
Fine for a demo, unacceptable in production — it is the first migration item.

---

## Backend integration plan

| Today | Becomes |
|---|---|
| `authService.signIn()` | Provider sign-in |
| `collection().list(q)` | `select(...).ilike(...).order(...).range(...)` |
| `collection().create/update/remove` | `insert` / `update` / `delete` |
| `localStorage` overrides | Real persistence |
| Frontend role checks | Row-level security policies |
| `assessmentService.submitAttempt()` | Server-side grading — the key must never reach the client |

Because every component already calls services, this is a substitution rather
than a rewrite.

---

Frontend prototype. Sample data only. No production data is present.
