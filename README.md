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

## What changed from the React version

Nothing you can see, with two small exceptions:

- **Toasts** (the little "added to your exploration list" messages) are now hand-written instead of the `sonner` library. Same position, same wording, near-identical styling.
- **Theme** is applied before the page paints, so switching to dark mode no longer flashes light first.

Everything else — markup, class names, stylesheet, icons, copy, interactions — is carried over as-is. The icons are inlined SVGs from the same Lucide set, so the site needs no internet connection except for the Google Fonts (Poppins and Raleway).
