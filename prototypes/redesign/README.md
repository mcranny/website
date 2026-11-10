# Redesign comparison

Archived phase-one comparison: three standalone styles, identical content, six
static pages. Design B was selected, with separate-page navigation, filled and
outlined buttons, and connected technical prose for the final implementation.
These samples remain outside the public allowlist. Existing `output/` content is
not used or modified.

From the repository root:

```sh
python3 prototypes/redesign/render.py
python3 -m http.server 5012 --bind 127.0.0.1
```

Open http://127.0.0.1:5012/prototypes/redesign/ in a browser.
The source-root server is intentional: production builds exclude these samples.
Only the homepage and ASIC sample are restyled. Links to other case studies,
the résumé, and interactive viewers open existing pages.

Generate the twelve desktop/mobile screenshots and run focused acceptance:

```sh
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node prototypes/redesign/check.cjs
```

`render.py` owns the shared HTML sample content and reads four existing résumé
bullets. Each CSS file is independent. Edit those sources and regenerate HTML.
Source claims come from the existing case studies and V3 summary; no new test
counts or hardware claims are introduced. The architecture figure reorganizes
the existing V3 architecture content as responsive HTML.

The manual style loosely references `/Users/matthewcranny/Downloads/cmod-a7-reference.pdf`.
It does not reproduce Digilent branding or its fixed paper layout.

## Selection checkpoint

Selection completed: B. The site source now implements that direction, with
retired routes, light-only styling, two shared stylesheets, updated content, and
retained viewer acceptance checks. See the root README for the current preview.
R2 migration and automatic deployment remain open follow-up work.
