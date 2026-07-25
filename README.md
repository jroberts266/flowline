# Flowline

A set of guided, low-barrier-to-entry Lean & Six Sigma tools. Enter your process
data once and get a properly formatted diagram, chart, scorecard, or report back
— built to the conventions teams already know, without needing a drawing tool.

This is a fully static site: plain HTML, CSS, and JavaScript, no build step, no
server, no dependencies beyond a Google Fonts link. It can be deployed anywhere
that serves static files.

## What's included

| File | Tool |
|---|---|
| `index.html` | Homepage — links to every tool below |
| `flowline-vsm.html` | Value Stream Mapper (current-state) |
| `flowline-future-vsm.html` | Future-State VSM & gap summary |
| `flowline-yamazumi.html` | Yamazumi (line-balancing) chart |
| `flowline-takt.html` | Takt time / demand calculator |
| `flowline-fishbone.html` | Ishikawa / fishbone root-cause builder |
| `flowline-pareto.html` | Pareto chart generator |
| `flowline-capability.html` | Process capability (Cp/Cpk) calculator |
| `flowline-oee.html` | OEE calculator |
| `flowline-a3.html` | A3 problem solving (10-step) |
| `flowline-dmaic.html` | DMAIC project charter |
| `flowline-kaizen-charter.html` | Kaizen event charter |
| `flowline-5s.html` | 5S audit scorecard |
| `flowline-kanban.html` | Kanban visual board |
| `flowline-glossary.html` | Lean & Six Sigma glossary |
| `flowline.css` | Shared design system (used by every page) |
| `flowline.js` | Shared nav dropdown behavior (used by every page) |

**Keep all 17 files together in one folder.** Every page links to the others
with relative paths (e.g. `flowline-vsm.html`, `flowline.css`), so as long as
they're siblings in the same directory, everything works — locally or deployed.

## How the tools work

Everything runs client-side in the browser. There is no backend, no database,
and no account system. Data entered into a tool lives only in that tab's memory
— refreshing the page or closing the tab clears it. A few tools support
exporting/importing JSON files by hand (e.g. export a VSM, import it into the
A3 or Future-State VSM tool to pre-fill fields), but nothing is saved
automatically or sent anywhere.

## Deploying for a free public test run

### Option A: GitHub Pages (recommended for a quick test)

1. Create a free GitHub account if you don't already have one.
2. Create a new repository (e.g. `flowline`).
3. Upload all 17 files to the root of the repository — drag-and-drop in the
   GitHub web UI works fine, no command line required.
4. In the repo, go to **Settings → Pages**.
5. Under "Source," select your branch (usually `main`) and folder (`/ (root)`),
   then save.
6. GitHub will publish the site at a URL like
   `https://yourusername.github.io/flowline/` within a minute or two.
   `index.html` loads automatically as the homepage.

Free, no time limit, automatic HTTPS, no credit card required.

### Option B: Netlify or Cloudflare Pages

Both offer free tiers with drag-and-drop deploys (Netlify) or git-connected
deploys (either), automatic HTTPS, and — if you later add a backend — native
support for serverless functions, which GitHub Pages doesn't have. Worth
switching to either if the test run goes well and you want to add accounts,
billing, or saved data later.

## Notes for a public test run

- The site works entirely offline once loaded, except for the Google Fonts
  stylesheet link in each page's `<head>` — visitors need internet access to
  fetch those fonts (a graceful system-font fallback is in place if that
  request fails).
- No analytics or tracking are included. If you want to know whether people
  are actually using it, you'll need to add something (e.g. Plausible,
  GoAuto Analytics, or GitHub Pages' basic traffic view under the repo's
  **Insights** tab).
- Because there's no backend, there's currently no way to gate access (e.g.
  behind a login or paywall) or to persist a visitor's data across sessions
  or devices. Both are solvable but need additional infrastructure beyond
  what's in this repo today.
