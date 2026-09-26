# GG Learning Labs — plain HTML / CSS / JS

The same site, converted from React + Vite to three ordinary files. No terminal, no `npm install`, no build step. Double-click `index.html` and it opens.

```
index.html          all three screens (homepage, sign in, workspace)
assets/styles.css   the entire design
assets/app.js       content lists + interactions
assets/hero.png     the hero background image — see "One thing to add" below
```

## The hero image — works now, but make it local

The hero artwork is the original one, loaded live from your Manus deployment:

`https://gglearnlabs-aqfdrjrn.manus.space/manus-storage/gg-learning-labs-hero_edcceeb4.png`

So the site looks right the moment you open it. But that image lives on Manus, not in your folder — if that deployment is ever taken down, the hero falls back to a warm gradient in the same palette.

**Make it permanent (two minutes, worth doing):**

1. Open that URL in your browser.
2. Right-click the image → Save image as → name it `hero.png`.
3. Put it in the `assets` folder, next to `styles.css`.

Nothing else to change. The stylesheet already looks for `assets/hero.png` first and uses it the moment it exists — the Manus copy and the gradient sit behind it as fallbacks. Any image works; just name it `hero.png`.

## Putting it online (GitHub Pages, no terminal)

1. Create a new repository on github.com → **Add file → Upload files**.
2. Drag in `index.html`, the `assets` folder, and `README.md`. Commit.
3. **Settings → Pages →** Source: *Deploy from a branch*, Branch: `main`, folder: `/ (root)`. Save.
4. Your site is live at `https://<your-username>.github.io/<repo-name>/` in a minute or two.

The same three files work on Netlify Drop, Cloudflare Pages, SharePoint, or any internal web server — just upload the folder.

## Editing it

| What you want to change | File | Where |
|---|---|---|
| Phase names, notes, service lists | `assets/app.js` | `const phases` |
| Field-note cards and their links | `assets/app.js` | `const news` |
| Pricing and plan features | `assets/app.js` | `const memberships` |
| Workspace service tiles | `assets/app.js` | `const services` |
| Headlines, body copy, footer | `index.html` | in place |
| Colours, spacing, type | `assets/styles.css` | `:root` (light) and `.dark` (dark) near the top |

Edit in Notepad, TextEdit, or directly in GitHub's web editor. Save, refresh the browser.

## Sign-in

Sign-in uses Firebase Authentication only (email + password). Add your keys in `assets/backend-config.js` and create users in Firebase Console → Authentication — see `FIREBASE-SETUP.md`. There are no built-in accounts.

## Trainer tools, PDFs and the sign-up pop-up

| What | Where |
|---|---|
| Scoring rules (ported from the two Excel files) and PDF layouts | `assets/tools-core.js` |
| The two forms, opened from the **Trainer Observation** and **Trainer Effectiveness** service tiles (matched by title) | `assets/tools-ui.js`, `assets/tools.css` |
| PDF libraries (bundled, no CDN) | `assets/vendor/` |
| Email sign-up pop-up | `id="signup-veil"` in `index.html`; logic in `assets/app.js` |

Email sign-ups and saved reports need the `subscribers` and `reports` rules from `FIREBASE-SETUP.md` step 4.

**Participants (Admin console → Logins → Manage):** suspend or reinstate a login, switch each trainer tool on or off for them, and set their scoring: the weight, minimum and "forces Needs Improvement" flag for each Effectiveness measure, the Effective / Satisfactory cut-offs, and optional section weights for the Observation Form. Each saved report stores the scoring that was used. Admin → Reports lists everyone's saved reports.

**Corporate accounts:** an admin creates a **Companies** entry (name + logo) and assigns a corporate login to it in Manage. That company's own account can then go to their profile menu → **Customize forms** to set their logo/name (used on every PDF their team downloads), pick which items from **Admin → Item Library** make up their own Observation Form checklist, and set their own Effectiveness weighting — applied to everyone at the company unless a person has their own personal override. See `FIREBASE-SETUP.md` → "Corporate accounts" for the walkthrough.

## What changed from the React version

Nothing you can see, with two small exceptions:

- **Toasts** (the little "added to your exploration list" messages) are now hand-written instead of the `sonner` library. Same position, same wording, near-identical styling.
- **Theme** is applied before the page paints, so switching to dark mode no longer flashes light first.

Everything else — markup, class names, stylesheet, icons, copy, interactions — is carried over as-is. The icons are inlined SVGs from the same Lucide set, so the site needs no internet connection except for the Google Fonts (Poppins and Raleway).


## Tests

`npm install` once, then `npm test` runs three suites: the scoring rules against fixtures produced from your Excel files (`tests/core.test.js`), the PDF builders (`tests/pdf.test.js`), and a simulated-browser run of the whole site against a fake Firebase (`tests/smoke.test.js`). `npm run test:rules` runs the Firestore rules on Google's emulator. Without installing anything, open `rules-check.html` in a browser to check your real rules (see `FIREBASE-SETUP.md`, hardening step 1). `QA.md` lists what still has to be checked by eye in a real browser.
